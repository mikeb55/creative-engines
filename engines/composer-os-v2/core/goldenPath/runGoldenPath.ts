/**
 * Composer OS V2 — Golden path runner
 * preset → feel → section roles → density → register map → behaviours → score → integrity → export → validation → manifest
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RunManifest } from '../run-ledger/runLedgerTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { generateGoldenPathDuoScore, type GoldenPathPlans } from './generateGoldenPathDuoScore';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../register-map/registerMapPlanner';
import { planInteraction } from '../interaction/interactionPlanner';
import { planGuitarBehaviour } from '../instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../rhythm-engine/rhythmEngine';
import { generateMotif, type MotifStyleHints } from '../motif/motifGenerator';
import { styleStackToModuleIds, type StyleStack } from '../style-modules/styleModuleTypes';
import { applyStyleStack } from '../style-modules/styleModuleRegistry';
import { placeMotifsAcrossBars } from '../motif/motifTracker';
import { runScoreIntegrityGate } from '../score-integrity/scoreIntegrityGate';
import { runBehaviourGates } from '../score-integrity/behaviourGates';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { checkSibeliusSafe } from '../export/sibeliusSafeProfile';
import { validateExportIntegrity } from '../export/exportHardening';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import { createRunManifest } from '../run-ledger/createRunManifest';
import { validateScoreModel } from '../score-model/scoreModelValidation';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { validateExportedMusicXmlBarMath } from '../export/validateMusicXmlBarMath';
import { validateGuitarBassDuoBassIdentityInMusicXml } from '../export/validateBassIdentityInMusicXml';
import { resolveScoreTitleForPreset } from '../../app-api/scoreTitleDefaults';
import { scoreJazzDuoBehaviourSoft } from '../score-integrity/jazzDuoBehaviourValidation';
import { scoreFormIdentitySoft } from './duoFormIdentity';
import { scoreNarrativeMomentsSoft } from './duoNarrativeMoments';

export interface GoldenPathResult {
  success: boolean;
  score: ScoreModel;
  context: CompositionContext;
  plans: GoldenPathPlans;
  xml?: string;
  integrityPassed: boolean;
  behaviourGatesPassed: boolean;
  mxValidationPassed: boolean;
  /** MusicXML schema + structural checks */
  strictBarMathPassed: boolean;
  /** Post-export measure duration sums match score model expectations */
  exportRoundTripPassed: boolean;
  /** Structural / content checks on exported XML (hardening) */
  exportIntegrityPassed: boolean;
  /** Bass part lists as upright/acoustic in MusicXML metadata */
  instrumentMetadataPassed: boolean;
  sibeliusSafe: boolean;
  readiness: { shareable: boolean; release: number; mx: number };
  runManifest: RunManifest;
  errors: string[];
}

function buildGoldenPathContext(seed: number): CompositionContext {
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const sections = [
    { label: 'A', startBar: 1, length: 4 },
    { label: 'B', startBar: 5, length: 4 },
  ];
  const form = { sections, totalBars: 8 };
  const harmony = {
    segments: [
      { chord: 'Dmin9', bars: 2 },
      { chord: 'G13', bars: 2 },
      { chord: 'Cmaj9', bars: 2 },
      { chord: 'A7alt', bars: 2 },
    ],
    totalBars: 8,
  };
  const phrase = { segments: sections.map((s) => ({ ...s, density: undefined })), totalBars: 8 };
  const chordSymbolPlan = {
    segments: [
      { chord: 'Dmin9', startBar: 1, bars: 2 },
      { chord: 'G13', startBar: 3, bars: 2 },
      { chord: 'Cmaj9', startBar: 5, bars: 2 },
      { chord: 'A7alt', startBar: 7, bars: 2 },
    ],
    totalBars: 8,
  };
  const rehearsalMarkPlan = { marks: [{ label: 'A', bar: 1 }, { label: 'B', bar: 5 }] };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

  const sectionRoles = planSectionRoles(sections, { A: 'statement', B: 'contrast' });
  const densityPlan = planDensityCurve(sectionRoles, 8);
  const densityCurve = { segments: densityPlan.segments, totalBars: 8 };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [36, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
    },
  };

  return {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register,
    density: densityCurve,
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    generationMetadata: { generatedAt: new Date().toISOString() },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
}

function extractPitchByInstrument(score: ScoreModel): Array<{ instrument: string; pitches: number[] }> {
  return score.parts.map((p) => {
    const pitches: number[] = [];
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') pitches.push(e.pitch);
      }
    }
    return { instrument: p.instrumentIdentity, pitches };
  });
}

const DEFAULT_STYLE_STACK: StyleStack = {
  primary: 'barry_harris',
  secondary: 'metheny',
  colour: 'triad_pairs',
  weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};

export interface RunGoldenPathOptions {
  styleStack?: StyleStack;
  presetId?: string;
  /** User-provided work title; default comes from resolveScoreTitleForPreset */
  scoreTitle?: string;
}

/** Offsets tried by the duo lock (requested seed + each offset). */
export const GOLDEN_PATH_VARIANT_SEED_OFFSETS = [0, 10007, 20011, 30011, 40009] as const;

export function candidateSeedsForGoldenPath(requestedSeed: number): number[] {
  return GOLDEN_PATH_VARIANT_SEED_OFFSETS.map((o) => requestedSeed + o);
}

export function runGoldenPath(seed: number = 12345, options?: RunGoldenPathOptions): GoldenPathResult {
  const seeds = candidateSeedsForGoldenPath(seed);
  let best: GoldenPathResult | null = null;
  let bestSoft = -Infinity;
  let last: GoldenPathResult | null = null;
  for (const s of seeds) {
    const r = runGoldenPathOnce(s, options);
    last = r;
    if (r.success) {
      const soft =
        scoreJazzDuoBehaviourSoft(r.score) +
        scoreFormIdentitySoft(r.score, { motifState: r.plans.motifState, styleStack: r.plans.styleStack }) +
        scoreNarrativeMomentsSoft(r.score);
      if (soft > bestSoft) {
        bestSoft = soft;
        best = r;
      }
    }
  }
  return best ?? last!;
}

function runGoldenPathOnce(seed: number, options?: RunGoldenPathOptions): GoldenPathResult {
  const errors: string[] = [];

  const context = buildGoldenPathContext(seed);
  const sections = planSectionRoles(context.form.sections, { A: 'statement', B: 'contrast' });
  const densityPlan = planDensityCurve(sections, 8);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints(context.feel);

  const [guitarReg] = guitarMap.sections[0]?.preferredZone ?? [55, 79];
  const styleStack: StyleStack = options?.styleStack ?? DEFAULT_STYLE_STACK;
  const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
  const scoreTitle = resolveScoreTitleForPreset(manifestPresetId, options?.scoreTitle);
  const stackIds = styleStackToModuleIds(styleStack);
  const motifHints: MotifStyleHints = {
    triadPairs: stackIds.includes('triad_pairs'),
    metheny: stackIds.includes('metheny'),
    bacharach: stackIds.includes('bacharach'),
  };
  const baseMotifs = generateMotif(seed, guitarReg, guitarReg + 20, motifHints);
  const placements = placeMotifsAcrossBars(baseMotifs, seed);
  const motifState = { baseMotifs, placements };

  const interactionPlan = planInteraction(sections, 8);

  const plans: GoldenPathPlans = {
    sections,
    guitarMap,
    bassMap,
    densityPlan,
    guitarBehaviour,
    bassBehaviour,
    rhythmConstraints,
    motifState,
    styleStack,
    interactionPlan,
    scoreTitle,
  };

  const appliedContext = styleStack ? applyStyleStack(context, styleStack) : context;
  const score = generateGoldenPathDuoScore(appliedContext, plans);

  const modelValidation = validateScoreModel(score);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);

  const strictBarMath = validateStrictBarMath(score);
  if (!strictBarMath.valid) errors.push(...strictBarMath.errors);

  const bars = score.parts[0]?.measures.map((m) => ({ index: m.index - 1, duration: 4 })) ?? [];
  const chordByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord) chordByBar.set(m.index, m.chord);
    }
  }
  const chordSymbols = Array.from(chordByBar.entries()).map(([bar, chord]) => ({ bar, chord }));
  const rehearsalByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) rehearsalByBar.set(m.index, m.rehearsalMark);
    }
  }
  const rehearsalMarks = Array.from(rehearsalByBar.entries()).map(([bar, label]) => ({ bar, label }));

  const integrityResult = runScoreIntegrityGate({
    bars,
    instruments: context.instrumentProfiles,
    chordSymbols,
    rehearsalMarks,
    chordSymbolsRequired: true,
    rehearsalMarksRequired: true,
    pitchByInstrument: extractPitchByInstrument(score),
  });
  if (!integrityResult.passed) errors.push(...integrityResult.errors);

  const behaviourResult = runBehaviourGates(
    score,
    rhythmConstraints,
    guitarBehaviour,
    bassBehaviour,
    sections,
    densityPlan,
    { motifState, styleStack, interactionPlan }
  );
  if (!behaviourResult.allValid) errors.push(...behaviourResult.errors);

  const exportResult = exportScoreModelToMusicXml(score);
  let xml: string | undefined;
  let mxValidationPassed = false;
  let sibeliusSafe = false;
  let exportIntegrityPassed = true;
  let exportRoundTripPassed = false;
  let instrumentMetadataPassed = false;
  if (exportResult.success && exportResult.xml) {
    xml = exportResult.xml;
    mxValidationPassed = validateMusicXmlSchema(xml).valid;
    sibeliusSafe = checkSibeliusSafe(xml).safe;
    const exportIntegrity = validateExportIntegrity(xml);
    exportIntegrityPassed = exportIntegrity.valid;
    if (!exportIntegrity.valid) errors.push(...exportIntegrity.errors);

    const mxBar = validateExportedMusicXmlBarMath(xml);
    exportRoundTripPassed = mxBar.valid;
    if (!mxBar.valid) errors.push(...mxBar.errors);

    const bassMeta = validateGuitarBassDuoBassIdentityInMusicXml(xml);
    instrumentMetadataPassed = bassMeta.valid;
    if (!bassMeta.valid) errors.push(...bassMeta.errors);
  } else {
    errors.push(...exportResult.errors);
  }

  const readinessResult = runReleaseReadinessGate({
    validationPassed:
      integrityResult.passed &&
      modelValidation.valid &&
      behaviourResult.allValid &&
      strictBarMath.valid &&
      instrumentMetadataPassed,
    exportValid: exportResult.success,
    mxValid: mxValidationPassed && exportRoundTripPassed,
    rhythmicCorrect: behaviourResult.rhythmValid,
    registerCorrect: integrityResult.passed,
    sibeliusSafe,
    chordRehearsalComplete: chordSymbols.length >= 8 && rehearsalMarks.length >= 2,
    exportIntegrity: exportIntegrityPassed,
    exportRoundTrip: exportRoundTripPassed,
  });

  const runManifest = createRunManifest({
    version: '2.0.0',
    seed,
    presetId: manifestPresetId,
    scoreTitle,
    activeModules: (() => {
      if (!styleStack) return [];
      const a: string[] = [styleStack.primary];
      if (styleStack.secondary) a.push(styleStack.secondary);
      if (styleStack.colour) a.push(styleStack.colour);
      return a;
    })(),
    feelMode: context.feel.mode,
    instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
    readinessScores: { release: readinessResult.release.overall, mx: readinessResult.mx.overall },
    validationPassed:
      integrityResult.passed &&
      behaviourResult.allValid &&
      strictBarMath.valid &&
      exportRoundTripPassed &&
      instrumentMetadataPassed,
    validationErrors: errors.length > 0 ? errors : undefined,
    exportTarget: xml ? 'musicxml' : undefined,
    timestamp: new Date().toISOString(),
  });

  const success =
    modelValidation.valid &&
    strictBarMath.valid &&
    integrityResult.passed &&
    behaviourResult.allValid &&
    exportResult.success &&
    mxValidationPassed &&
    exportIntegrityPassed &&
    exportRoundTripPassed &&
    instrumentMetadataPassed &&
    errors.length === 0;

  return {
    success,
    score,
    context,
    plans,
    xml,
    integrityPassed: integrityResult.passed,
    behaviourGatesPassed: behaviourResult.allValid,
    mxValidationPassed,
    strictBarMathPassed: strictBarMath.valid,
    exportRoundTripPassed,
    exportIntegrityPassed,
    instrumentMetadataPassed,
    sibeliusSafe,
    readiness: {
      shareable: readinessResult.shareable,
      release: readinessResult.release.overall,
      mx: readinessResult.mx.overall,
    },
    runManifest,
    errors,
  };
}
