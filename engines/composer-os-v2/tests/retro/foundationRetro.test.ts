/**
 * Composer OS V2 — Foundation retro tests
 * Verifies contracts, score model, preset, manifest, readiness remain valid.
 */

import type { CompositionContext } from '../../core/compositionContext';
import type { ScoreModel, PartModel, MeasureModel } from '../../core/score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createRunManifest } from '../../core/run-ledger/createRunManifest';
import { runReleaseReadinessGate } from '../../core/readiness/releaseReadinessGate';
import { computeReleaseReadiness } from '../../core/readiness/readinessScorer';
import { computeMxReadiness } from '../../core/readiness/mxReadinessScorer';

const REQUIRED_CONTEXT_FIELDS = [
  'systemVersion', 'presetId', 'seed',
  'form', 'feel', 'harmony', 'motif', 'phrase', 'register', 'density',
  'instrumentProfiles', 'chordSymbolPlan', 'rehearsalMarkPlan',
  'generationMetadata', 'validation', 'readiness',
];

function testCompositionContextContracts(): boolean {
  const ctx: CompositionContext = {
    systemVersion: '2.0.0',
    presetId: 'x',
    seed: 1,
    form: { sections: [], totalBars: 0 },
    feel: { mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' },
    harmony: { segments: [], totalBars: 0 },
    motif: { activeMotifs: [], variants: {} },
    phrase: { segments: [], totalBars: 0 },
    register: {},
    density: { segments: [], totalBars: 0 },
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars: 0 },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: { generatedAt: '' },
    validation: { gates: [], passed: true },
    readiness: { release: {} as any, mx: {} as any },
  };
  for (const f of REQUIRED_CONTEXT_FIELDS) {
    if (!(f in ctx)) return false;
  }
  return true;
}

function testScoreModelStructure(): boolean {
  const m: MeasureModel = { index: 1, events: [] };
  const p: PartModel = {
    id: 'x', name: 'X', instrumentIdentity: 'guitar', midiProgram: 0,
    clef: 'treble', measures: [m],
  };
  const s: ScoreModel = { title: 'T', parts: [p] };
  return s.parts.length === 1 && s.parts[0].measures.length === 1 && s.parts[0].measures[0].index === 1;
}

function testPresetLoading(): boolean {
  const p = guitarBassDuoPreset;
  return p.id === 'guitar_bass_duo' && p.instrumentProfiles.length >= 2;
}

function testRunManifestGeneration(): boolean {
  const m = createRunManifest({
    version: '2.0.0',
    seed: 42,
    presetId: 'guitar_bass_duo',
    activeModules: ['barry_harris'],
    feelMode: 'swing',
    instrumentProfiles: ['clean_electric_guitar', 'acoustic_upright_bass'],
    readinessScores: { release: 0.9, mx: 0.9 },
    validationPassed: true,
    timestamp: new Date().toISOString(),
  });
  return m.seed === 42 && m.presetId === 'guitar_bass_duo' && m.activeModules.length >= 1;
}

function testReadinessScorersProduceTypedOutput(): boolean {
  const r = computeReleaseReadiness({ validationPassed: true, exportValid: true, mxValid: true });
  const mx = computeMxReadiness({
    rhythmicCorrect: true,
    registerCorrect: true,
    musicXmlValid: true,
    sibeliusSafe: true,
    chordRehearsalComplete: true,
  });
  return typeof r.overall === 'number' && typeof mx.overall === 'number' && Array.isArray(r.categories) && Array.isArray(mx.categories);
}

function testReleaseReadinessGateOutput(): boolean {
  const g = runReleaseReadinessGate({
    validationPassed: true,
    exportValid: true,
    mxValid: true,
  });
  return 'shareable' in g && 'release' in g && 'mx' in g;
}

export function runFoundationRetroTests(): { name: string; ok: boolean }[] {
  return [
    ['CompositionContext required fields present', testCompositionContextContracts],
    ['Score model structure valid', testScoreModelStructure],
    ['Preset loading works', testPresetLoading],
    ['Run manifest generation works', testRunManifestGeneration],
    ['Readiness scorers produce typed output', testReadinessScorersProduceTypedOutput],
    ['Release readiness gate output valid', testReleaseReadinessGateOutput],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
