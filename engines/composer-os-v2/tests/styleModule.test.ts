/**
 * Composer OS V2 — Style module tests
 */

import { getStyleModule, applyStyleModules } from '../core/style-modules/styleModuleRegistry';
import { barryHarrisModule } from '../core/style-modules/barry-harris/moduleApply';
import { validateBarryHarrisConformance } from '../core/style-modules/barry-harris/moduleValidation';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testBarryHarrisModuleRegistered(): boolean {
  const mod = getStyleModule('barry_harris');
  return mod !== undefined && mod.id === 'barry_harris';
}

function testApplyStyleModule(): boolean {
  const context = {
    systemVersion: '2.0.0',
    presetId: 'x',
    seed: 1,
    form: { sections: [], totalBars: 0 },
    feel: { mode: 'swing' as const, intensity: 0.5, syncopationDensity: 'medium' as const },
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
  const result = applyStyleModules(context, ['barry_harris']);
  return (result as any).styleOverrides?.barryHarris?.passingMotion === true;
}

function testBarryHarrisValidationPasses(): boolean {
  const m1 = createMeasure(1, 'Dm7');
  addEvent(m1, createNote(62, 0, 1));
  addEvent(m1, createNote(65, 1, 1));
  addEvent(m1, createNote(60, 2, 2));
  const m2 = createMeasure(2, 'G7');
  addEvent(m2, createNote(67, 0, 1));
  addEvent(m2, createNote(65, 1, 1));
  addEvent(m2, createNote(60, 2, 2));
  const m3 = createMeasure(3, 'Cmaj7');
  addEvent(m3, createNote(60, 0, 2));
  addEvent(m3, createNote(64, 2, 2));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m1, m2, m3],
  }]);
  const r = validateBarryHarrisConformance(score);
  return r.valid;
}

function testGoldenPathStyleModuleAffectsOutput(): boolean {
  const r = runGoldenPath(88);
  return r.plans?.styleModules?.includes('barry_harris') ?? false;
}

function testRunManifestHasActiveModules(): boolean {
  const r = runGoldenPath(99);
  return r.runManifest?.activeModules?.includes('barry_harris') ?? false;
}

export function runStyleModuleTests(): { name: string; ok: boolean }[] {
  return [
    ['Barry Harris registered', testBarryHarrisModuleRegistered],
    ['Apply style module', testApplyStyleModule],
    ['Barry Harris validation passes', testBarryHarrisValidationPasses],
    ['Golden path uses style module', testGoldenPathStyleModuleAffectsOutput],
    ['Run manifest has active modules', testRunManifestHasActiveModules],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
