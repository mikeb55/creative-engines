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
import { planGuitarBehaviour } from '../instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../rhythm-engine/rhythmEngine';
import { runScoreIntegrityGate } from '../score-integrity/scoreIntegrityGate';
import { runBehaviourGates } from '../score-integrity/behaviourGates';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { checkSibeliusSafe } from '../export/sibeliusSafeProfile';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import { createRunManifest } from '../run-ledger/createRunManifest';
import { validateScoreModel } from '../score-model/scoreModelValidation';

export interface GoldenPathResult {
  success: boolean;
  score: ScoreModel;
  context: CompositionContext;
  plans: GoldenPathPlans;
  xml?: string;
  integrityPassed: boolean;
  behaviourGatesPassed: boolean;
  mxValidationPassed: boolean;
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

export function runGoldenPath(seed: number = 12345): GoldenPathResult {
  const errors: string[] = [];

  const context = buildGoldenPathContext(seed);
  const sections = planSectionRoles(context.form.sections, { A: 'statement', B: 'contrast' });
  const densityPlan = planDensityCurve(sections, 8);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints(context.feel);

  const plans: GoldenPathPlans = {
    sections,
    guitarMap,
    bassMap,
    densityPlan,
    guitarBehaviour,
    bassBehaviour,
    rhythmConstraints,
  };

  const score = generateGoldenPathDuoScore(context, plans);

  const modelValidation = validateScoreModel(score);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);

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
    densityPlan
  );
  if (!behaviourResult.allValid) errors.push(...behaviourResult.errors);

  const exportResult = exportScoreModelToMusicXml(score);
  let xml: string | undefined;
  let mxValidationPassed = false;
  let sibeliusSafe = false;
  if (exportResult.success && exportResult.xml) {
    xml = exportResult.xml;
    mxValidationPassed = validateMusicXmlSchema(xml).valid;
    sibeliusSafe = checkSibeliusSafe(xml).safe;
  } else {
    errors.push(...exportResult.errors);
  }

  const readinessResult = runReleaseReadinessGate({
    validationPassed: integrityResult.passed && modelValidation.valid && behaviourResult.allValid,
    exportValid: exportResult.success,
    mxValid: mxValidationPassed,
    rhythmicCorrect: behaviourResult.rhythmValid,
    registerCorrect: integrityResult.passed,
    sibeliusSafe,
    chordRehearsalComplete: chordSymbols.length >= 8 && rehearsalMarks.length >= 2,
  });

  const runManifest = createRunManifest({
    version: '2.0.0',
    seed,
    presetId: 'guitar_bass_duo',
    activeModules: [],
    feelMode: context.feel.mode,
    instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
    readinessScores: { release: readinessResult.release.overall, mx: readinessResult.mx.overall },
    validationPassed: integrityResult.passed && behaviourResult.allValid,
    validationErrors: errors.length > 0 ? errors : undefined,
    exportTarget: xml ? 'musicxml' : undefined,
    timestamp: new Date().toISOString(),
  });

  const success =
    modelValidation.valid &&
    integrityResult.passed &&
    behaviourResult.allValid &&
    exportResult.success &&
    mxValidationPassed &&
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
