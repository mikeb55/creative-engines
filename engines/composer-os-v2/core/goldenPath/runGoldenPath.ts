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
import type { SectionRole } from '../section-roles/sectionRoleTypes';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../register-map/registerMapPlanner';
import { planInteraction } from '../interaction/interactionPlanner';
import { planGuitarBehaviour } from '../instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../rhythm-engine/rhythmEngine';
import { generateMotif, type MotifStyleHints } from '../motif/motifGenerator';
import { styleStackToModuleIds, type StyleStack } from '../style-modules/styleModuleTypes';
import { applyStyleStack } from '../style-modules/styleModuleRegistry';
import { placeMotifsAcrossBars, placeMotifsForEcmForm } from '../motif/motifTracker';
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
import {
  parseChordProgressionInput,
  buildHarmonyPlanFromBars,
  buildChordSymbolPlanFromBars,
} from '../harmony/chordProgressionParser';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { buildEcmChamberContext, type BuildEcmChamberContextOpts } from '../ecm/buildEcmChamberContext';
import type { EcmChamberMode } from '../ecm/ecmChamberTypes';
import {
  scoreEcmMethenyFeel,
  scoreEcmSchneiderFeel,
  ecmCrossModeSimilarityPenalty,
} from '../ecm/ecmChamberScoring';

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

const BUILTIN_HARMONY: import('../primitives/harmonyTypes').HarmonyPlan = {
  segments: [
    { chord: 'Dmin9', bars: 2 },
    { chord: 'G13', bars: 2 },
    { chord: 'Cmaj9', bars: 2 },
    { chord: 'A7alt', bars: 2 },
  ],
  totalBars: 8,
};

const BUILTIN_CHORD_SYMBOL_PLAN: CompositionContext['chordSymbolPlan'] = {
  segments: [
    { chord: 'Dmin9', startBar: 1, bars: 2 },
    { chord: 'G13', startBar: 3, bars: 2 },
    { chord: 'Cmaj9', startBar: 5, bars: 2 },
    { chord: 'A7alt', startBar: 7, bars: 2 },
  ],
  totalBars: 8,
};

interface BuildGoldenPathContextExtras {
  /** Raw user input when custom mode was used */
  chordProgressionInputRaw?: string;
  /** User intent (always set when known) */
  progressionMode?: 'builtin' | 'custom';
  /** When parse failed — no score produced with that harmony */
  chordProgressionParseFailed?: boolean;
}

function buildGoldenPathContext(
  seed: number,
  parsedChordBars?: string[],
  extras?: BuildGoldenPathContextExtras
): CompositionContext {
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const sections = [
    { label: 'A', startBar: 1, length: 4 },
    { label: 'B', startBar: 5, length: 4 },
  ];
  const form = { sections, totalBars: 8 };
  const parseFailed = !!extras?.chordProgressionParseFailed;
  const useCustom = !parseFailed && parsedChordBars && parsedChordBars.length === 8;
  const harmony = useCustom ? buildHarmonyPlanFromBars(parsedChordBars) : BUILTIN_HARMONY;
  const phrase = { segments: sections.map((s) => ({ ...s, density: undefined })), totalBars: 8 };
  const chordSymbolPlan = useCustom ? buildChordSymbolPlanFromBars(parsedChordBars) : BUILTIN_CHORD_SYMBOL_PLAN;
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

  const progressionMode: 'builtin' | 'custom' = parseFailed
    ? 'custom'
    : extras?.progressionMode ?? (useCustom ? 'custom' : 'builtin');

  const raw = extras?.chordProgressionInputRaw?.trim();

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
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: parseFailed ? undefined : useCustom ? 'custom' : 'builtin',
      customChordProgressionSummary: useCustom ? parsedChordBars.join(' | ') : undefined,
      progressionMode,
      chordProgressionInputRaw: parseFailed ? raw : useCustom ? raw : undefined,
      parsedCustomProgressionBars: useCustom ? [...parsedChordBars] : undefined,
      chordProgressionParseFailed: parseFailed || undefined,
      builtInHarmonyFallbackOccurred: false,
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
}

function buildContextForGoldenPath(seed: number, options?: RunGoldenPathOptions): CompositionContext {
  const presetId = options?.presetId ?? 'guitar_bass_duo';
  if (presetId === 'ecm_chamber') {
    const mode: EcmChamberMode = options?.ecmMode ?? 'ECM_METHENY_QUARTET';
    const ecmOpts: BuildEcmChamberContextOpts | undefined =
      options?.ecmTotalBars !== undefined ? { totalBars: options.ecmTotalBars } : undefined;
    return buildEcmChamberContext(seed, mode, ecmOpts);
  }
  return buildGoldenPathContext(seed, options?.parsedChordBars, {
    chordProgressionInputRaw: options?.chordProgressionText?.trim(),
    progressionMode: options?.parsedChordBars?.length === 8 ? 'custom' : 'builtin',
  });
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

/** Slash chords must appear at least once in the bass (pitch class). */
function validateSlashBassHonoured(score: ScoreModel): string[] {
  const out: string[] = [];
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return out;
  for (const m of bass.measures) {
    const chord = m.chord;
    if (!chord) continue;
    const { slashBassPc } = parseChordSymbol(chord);
    if (slashBassPc === undefined) continue;
    let hit = false;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e as { pitch: number }).pitch % 12 === slashBassPc % 12) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      out.push(`Bar ${m.index}: bass must spell the slash bass pitch for "${chord}".`);
    }
  }
  return out;
}

function buildGoldenPathPlans(
  seed: number,
  context: CompositionContext,
  options?: RunGoldenPathOptions
): GoldenPathPlans {
  const ecmRoles: Record<string, SectionRole> = { A1: 'statement', B: 'contrast', A2: 'return' };
  const duoRoles: Record<string, SectionRole> = { A: 'statement', B: 'contrast' };
  const sections = planSectionRoles(context.form.sections, context.presetId === 'ecm_chamber' ? ecmRoles : duoRoles);
  const densityPlan =
    context.presetId === 'ecm_chamber'
      ? { segments: context.density.segments, totalBars: context.density.totalBars }
      : planDensityCurve(sections, 8);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints(context.feel);

  const [guitarReg] = guitarMap.sections[0]?.preferredZone ?? [55, 79];
  const styleStack: StyleStack =
    context.presetId === 'ecm_chamber'
      ? (options?.styleStack ?? ECM_CHAMBER_STYLE_STACK)
      : options?.styleStack ?? DEFAULT_STYLE_STACK;
  const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
  const scoreTitle = resolveScoreTitleForPreset(manifestPresetId, options?.scoreTitle, options?.ecmMode);
  const stackIds = styleStackToModuleIds(styleStack);
  const motifHints: MotifStyleHints = {
    triadPairs: stackIds.includes('triad_pairs'),
    metheny: stackIds.includes('metheny'),
    bacharach: stackIds.includes('bacharach'),
  };
  const baseMotifs = generateMotif(seed, guitarReg, guitarReg + 20, motifHints);
  const placements =
    context.presetId === 'ecm_chamber'
      ? placeMotifsForEcmForm(baseMotifs, seed, context.form.totalBars)
      : placeMotifsAcrossBars(baseMotifs, seed);
  const motifState = { baseMotifs, placements };

  const interactionPlan = planInteraction(sections, context.form.totalBars);

  return {
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
}

function harmonyParseFailureGoldenPathResult(
  seed: number,
  options: RunGoldenPathOptions | undefined,
  message: string
): GoldenPathResult {
  const context = buildGoldenPathContext(seed, undefined, {
    chordProgressionParseFailed: true,
    chordProgressionInputRaw: options?.chordProgressionText?.trim(),
    progressionMode: 'custom',
  });
  const plans = buildGoldenPathPlans(seed, context, options);
  const emptyScore: ScoreModel = {
    title: plans.scoreTitle,
    parts: [],
    timeSignature: { beats: 4, beatType: 4 },
  };
  return {
    success: false,
    score: emptyScore,
    context,
    plans,
    xml: undefined,
    integrityPassed: false,
    behaviourGatesPassed: false,
    mxValidationPassed: false,
    strictBarMathPassed: false,
    exportRoundTripPassed: false,
    exportIntegrityPassed: false,
    instrumentMetadataPassed: false,
    sibeliusSafe: false,
    readiness: { shareable: false, release: 0, mx: 0 },
    runManifest: createRunManifest({
      version: '2.0.0',
      seed,
      presetId: options?.presetId ?? 'guitar_bass_duo',
      scoreTitle: plans.scoreTitle,
      activeModules: [],
      feelMode: context.feel.mode,
      instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
      readinessScores: { release: 0, mx: 0 },
      validationPassed: false,
      validationErrors: [message],
      exportTarget: undefined,
      timestamp: new Date().toISOString(),
    }),
    errors: [message],
  };
}

const DEFAULT_STYLE_STACK: StyleStack = {
  primary: 'barry_harris',
  secondary: 'metheny',
  colour: 'triad_pairs',
  weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};

/** ECM chamber: avoid Barry Harris / triad-pair conformance that assumes the duo ii–V cycle. */
const ECM_CHAMBER_STYLE_STACK: StyleStack = {
  primary: 'metheny',
  weights: { primary: 1 },
};

export interface RunGoldenPathOptions {
  styleStack?: StyleStack;
  presetId?: string;
  /** User-provided work title; default comes from resolveScoreTitleForPreset */
  scoreTitle?: string;
  /** Guitar–Bass Duo: explicit mode (custom requires non-empty `chordProgressionText`) */
  harmonyMode?: 'builtin' | 'custom';
  /** Guitar–Bass Duo: `|`-separated chords, 8 bars; parsed before generation */
  chordProgressionText?: string;
  /** Filled by runGoldenPath after a successful parse (internal) */
  parsedChordBars?: string[];
  /** ECM Chamber: distinct Metheny vs Schneider modes */
  ecmMode?: EcmChamberMode;
  /** ECM Chamber: override default bar count (e.g. 32 for extended regression tests). */
  ecmTotalBars?: number;
}

/** Offsets tried by the duo lock (requested seed + each offset). */
export const GOLDEN_PATH_VARIANT_SEED_OFFSETS = [0, 10007, 20011, 30011, 40009] as const;

export function candidateSeedsForGoldenPath(requestedSeed: number): number[] {
  return GOLDEN_PATH_VARIANT_SEED_OFFSETS.map((o) => requestedSeed + o);
}

export function runGoldenPath(seed: number = 12345, options?: RunGoldenPathOptions): GoldenPathResult {
  let opts = options ? { ...options } : undefined;
  const presetIdEarly = opts?.presetId ?? 'guitar_bass_duo';
  if (presetIdEarly !== 'guitar_bass_duo') {
    opts = {
      ...(opts ?? {}),
      harmonyMode: 'builtin',
      chordProgressionText: undefined,
      parsedChordBars: undefined,
    };
  }

  const inferredCustom = !!(opts?.chordProgressionText?.trim());
  const harmonyMode: 'builtin' | 'custom' =
    opts?.harmonyMode ?? (inferredCustom ? 'custom' : 'builtin');

  if (harmonyMode === 'builtin') {
    opts = opts ? { ...opts, chordProgressionText: undefined, parsedChordBars: undefined } : undefined;
  }

  if (presetIdEarly === 'guitar_bass_duo' && harmonyMode === 'custom' && !(opts?.chordProgressionText?.trim())) {
    return harmonyParseFailureGoldenPathResult(
      seed,
      opts,
      'Custom chord progression is empty. Enter exactly 8 bars separated by |.'
    );
  }

  let resolved: RunGoldenPathOptions | undefined = opts;
  if (opts?.chordProgressionText?.trim()) {
    const parsed = parseChordProgressionInput(opts.chordProgressionText);
    if (!parsed.ok) {
      return harmonyParseFailureGoldenPathResult(seed, opts, parsed.error);
    }
    resolved = { ...opts, parsedChordBars: parsed.bars };
  }
  const seeds = candidateSeedsForGoldenPath(seed);
  let best: GoldenPathResult | null = null;
  let bestSoft = -Infinity;
  let last: GoldenPathResult | null = null;
  for (const s of seeds) {
    const r = runGoldenPathOnce(s, resolved);
    last = r;
    if (r.success) {
      const pid = resolved?.presetId ?? 'guitar_bass_duo';
      const soft =
        pid === 'ecm_chamber'
          ? (() => {
              const mode = resolved?.ecmMode ?? 'ECM_METHENY_QUARTET';
              const base =
                mode === 'ECM_SCHNEIDER_CHAMBER'
                  ? scoreEcmSchneiderFeel(r.score, r.context, r.plans)
                  : scoreEcmMethenyFeel(r.score, r.context, r.plans);
              return base - ecmCrossModeSimilarityPenalty(r.score, r.context, mode);
            })()
          : scoreJazzDuoBehaviourSoft(r.score) +
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

  const context = buildContextForGoldenPath(seed, options);

  const plans = buildGoldenPathPlans(seed, context, options);
  const { sections, densityPlan, guitarBehaviour, bassBehaviour, rhythmConstraints, motifState, styleStack, interactionPlan } =
    plans;

  const appliedContext = styleStack ? applyStyleStack(context, styleStack) : context;
  const score = generateGoldenPathDuoScore(appliedContext, plans);

  errors.push(...validateSlashBassHonoured(score));

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
    { motifState, styleStack, interactionPlan, presetId: context.presetId }
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
    chordRehearsalComplete:
      chordSymbols.length >= (context.presetId === 'ecm_chamber' ? context.form.totalBars : 8) &&
      rehearsalMarks.length >= 2,
    exportIntegrity: exportIntegrityPassed,
    exportRoundTrip: exportRoundTripPassed,
  });

  const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
  const scoreTitle = plans.scoreTitle;
  const ecmMode = options?.ecmMode;

  const runManifest = createRunManifest({
    version: '2.0.0',
    seed,
    presetId: manifestPresetId,
    ecmMode: manifestPresetId === 'ecm_chamber' && ecmMode ? ecmMode : undefined,
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
