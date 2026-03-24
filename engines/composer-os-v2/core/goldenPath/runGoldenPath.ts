/**
 * Composer OS V2 — Golden path runner
 * Full pipeline: preset → feel → harmony → phrase → score → integrity → export → validation → manifest
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RunManifest } from '../run-ledger/runLedgerTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { generateGoldenPathDuoScore } from './generateGoldenPathDuoScore';
import { runScoreIntegrityGate } from '../score-integrity/scoreIntegrityGate';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema, reParseMusicXml } from '../export/musicxmlValidation';
import { checkSibeliusSafe } from '../export/sibeliusSafeProfile';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import { createRunManifest } from '../run-ledger/createRunManifest';
import { validateScoreModel } from '../score-model/scoreModelValidation';

export interface GoldenPathResult {
  success: boolean;
  score: ScoreModel;
  context: CompositionContext;
  xml?: string;
  integrityPassed: boolean;
  mxValidationPassed: boolean;
  sibeliusSafe: boolean;
  readiness: { shareable: boolean; release: number; mx: number };
  runManifest: RunManifest;
  errors: string[];
}

function buildGoldenPathContext(seed: number): CompositionContext {
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const form = {
    sections: [
      { label: 'A', startBar: 1, length: 4 },
      { label: 'B', startBar: 5, length: 4 },
    ],
    totalBars: 8,
  };
  const harmony = {
    segments: [
      { chord: 'Dmin9', bars: 2 },
      { chord: 'G13', bars: 2 },
      { chord: 'Cmaj9', bars: 2 },
      { chord: 'A7alt', bars: 2 },
    ],
    totalBars: 8,
  };
  const phrase = {
    segments: [
      { label: 'A', startBar: 1, length: 4 },
      { label: 'B', startBar: 5, length: 4 },
    ],
    totalBars: 8,
  };
  const chordSymbolPlan = {
    segments: [
      { chord: 'Dmin9', startBar: 1, bars: 2 },
      { chord: 'G13', startBar: 3, bars: 2 },
      { chord: 'Cmaj9', startBar: 5, bars: 2 },
      { chord: 'A7alt', startBar: 7, bars: 2 },
    ],
    totalBars: 8,
  };
  const rehearsalMarkPlan = {
    marks: [
      { label: 'A', bar: 1 },
      { label: 'B', bar: 5 },
    ],
  };
  const release = runReleaseReadinessGate({
    validationPassed: true,
    exportValid: true,
    mxValid: true,
  });

  return {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register: {},
    density: { segments: [], totalBars: 8 },
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    generationMetadata: { generatedAt: new Date().toISOString() },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
}

/** Extract pitches by instrument from score for register validation. */
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

/** Run full golden path pipeline. */
export function runGoldenPath(seed: number = 12345): GoldenPathResult {
  const errors: string[] = [];

  const context = buildGoldenPathContext(seed);
  const score = generateGoldenPathDuoScore(context);

  const modelValidation = validateScoreModel(score);
  if (!modelValidation.valid) {
    errors.push(...modelValidation.errors);
  }

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

  if (!integrityResult.passed) {
    errors.push(...integrityResult.errors);
  }

  const exportResult = exportScoreModelToMusicXml(score);
  let xml: string | undefined;
  let mxValidationPassed = false;
  let sibeliusSafe = false;

  if (exportResult.success && exportResult.xml) {
    xml = exportResult.xml;
    const schemaResult = validateMusicXmlSchema(xml);
    mxValidationPassed = schemaResult.valid;
    if (!schemaResult.valid) errors.push(...schemaResult.errors);

    const sibeliusResult = checkSibeliusSafe(xml);
    sibeliusSafe = sibeliusResult.safe;
    if (!sibeliusResult.safe) errors.push(...sibeliusResult.issues);
  } else {
    errors.push(...exportResult.errors);
  }

  const readinessResult = runReleaseReadinessGate({
    validationPassed: integrityResult.passed && modelValidation.valid,
    exportValid: exportResult.success,
    mxValid: mxValidationPassed,
    rhythmicCorrect: true,
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
    validationPassed: integrityResult.passed,
    validationErrors: integrityResult.errors.length > 0 ? integrityResult.errors : undefined,
    exportTarget: xml ? 'musicxml' : undefined,
    timestamp: new Date().toISOString(),
  });

  const success =
    modelValidation.valid &&
    integrityResult.passed &&
    exportResult.success &&
    mxValidationPassed &&
    errors.length === 0;

  return {
    success,
    score,
    context,
    xml,
    integrityPassed: integrityResult.passed,
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
