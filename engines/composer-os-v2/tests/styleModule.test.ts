/**
 * Composer OS V2 — Style module tests
 */

import {
  getStyleModule,
  applyStyleModules,
  applyStyleStack,
  listRegisteredStyleModuleInfos,
} from '../core/style-modules/styleModuleRegistry';
import { validateBarryHarrisConformance } from '../core/style-modules/barry-harris/moduleValidation';
import { validateMethenyConformance } from '../core/style-modules/metheny/moduleValidation';
import { validateTriadPairConformance } from '../core/style-modules/triad-pairs/moduleValidation';
import { validateBacharachConformance } from '../core/style-modules/bacharach/moduleValidation';
import { normalizeStyleWeights } from '../core/style-modules/styleModuleTypes';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testBarryHarrisModuleRegistered(): boolean {
  const mod = getStyleModule('barry_harris');
  return mod !== undefined && mod.id === 'barry_harris';
}

function testRegistryListsBarryMethenyTriadBacharach(): boolean {
  const list = listRegisteredStyleModuleInfos();
  const ids = list.map((m) => m.id);
  return (
    list.length >= 4 &&
    ids.includes('barry_harris') &&
    ids.includes('metheny') &&
    ids.includes('triad_pairs') &&
    ids.includes('bacharach')
  );
}

function testBacharachModuleRegistered(): boolean {
  const mod = getStyleModule('bacharach');
  return mod !== undefined && mod.id === 'bacharach';
}

function testRunManifestReflectsRequestedPrimary(): boolean {
  const r = runGoldenPath(123, {
    styleStack: {
      primary: 'metheny',
      weights: { primary: 1, secondary: 0, colour: 0 },
    },
  });
  const mods = r.runManifest?.activeModules ?? [];
  return mods.length === 1 && mods[0] === 'metheny';
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

function testGoldenPathStyleStackAffectsOutput(): boolean {
  const r = runGoldenPath(88);
  const stack = r.plans?.styleStack;
  return !!stack && stack.primary === 'barry_harris';
}

function testRunManifestHasActiveModules(): boolean {
  const r = runGoldenPath(99);
  const modules = r.runManifest?.activeModules ?? [];
  return modules.includes('barry_harris') && modules.includes('metheny') && modules.includes('triad_pairs');
}

function testStyleStackNormalization(): boolean {
  const w = normalizeStyleWeights({
    primary: 'barry_harris',
    secondary: 'metheny',
    colour: 'triad_pairs',
    weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
  });
  const sum = w.primary + w.secondary + w.colour;
  return Math.abs(sum - 1) < 0.001 && w.primary > w.secondary && w.secondary > w.colour;
}

function testApplyStyleStack(): boolean {
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
  const result = applyStyleStack(context, {
    primary: 'barry_harris',
    secondary: 'metheny',
    colour: 'triad_pairs',
    weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
  });
  return (result as any).styleOverrides?.barryHarris !== undefined;
}

function testMethenyValidation(): boolean {
  const m = createMeasure(1, 'Dm7');
  addEvent(m, createNote(62, 0.5, 2));
  addEvent(m, createNote(67, 2.5, 2));
  const score = createScore('M', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = validateMethenyConformance(score);
  return r.valid;
}

function testBacharachValidation(): boolean {
  const m1 = createMeasure(1, 'Dm7');
  addEvent(m1, createNote(62, 0.5, 1));
  addEvent(m1, createNote(65, 1.5, 1));
  addEvent(m1, createNote(67, 2.5, 1.5));
  const score = createScore('B', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m1],
  }]);
  const r = validateBacharachConformance(score);
  return r.valid;
}

function testTriadPairValidation(): boolean {
  const m = createMeasure(1, 'Dm7');
  addEvent(m, createNote(62, 0.5, 1));
  addEvent(m, createNote(66, 1.5, 1));
  addEvent(m, createNote(69, 2.5, 1));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = validateTriadPairConformance(score);
  return r.valid;
}

export function runStyleModuleTests(): { name: string; ok: boolean }[] {
  return [
    ['Barry Harris registered', testBarryHarrisModuleRegistered],
    ['Registry lists Barry, Metheny, Triad Pairs, Bacharach', testRegistryListsBarryMethenyTriadBacharach],
    ['Bacharach registered', testBacharachModuleRegistered],
    ['Run manifest reflects requested primary', testRunManifestReflectsRequestedPrimary],
    ['Apply style module', testApplyStyleModule],
    ['Barry Harris validation passes', testBarryHarrisValidationPasses],
    ['Style stack normalization', testStyleStackNormalization],
    ['Apply style stack', testApplyStyleStack],
    ['Metheny validation', testMethenyValidation],
    ['Bacharach validation', testBacharachValidation],
    ['Triad pair validation', testTriadPairValidation],
    ['Golden path uses style stack', testGoldenPathStyleStackAffectsOutput],
    ['Run manifest has active modules', testRunManifestHasActiveModules],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
