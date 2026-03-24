/**
 * Composer OS V2 — Style System retro tests
 */

import { runGoldenPath } from '../../core/goldenPath/runGoldenPath';
import { normalizeStyleWeights } from '../../core/style-modules/styleModuleTypes';

function testStyleStackLoads(): boolean {
  const r = runGoldenPath(30);
  return !!r.plans?.styleStack && r.plans.styleStack.primary === 'barry_harris';
}

function testWeightsNormalize(): boolean {
  const w = normalizeStyleWeights({
    primary: 'barry_harris',
    secondary: 'metheny',
    colour: 'triad_pairs',
    weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
  });
  const sum = w.primary + w.secondary + w.colour;
  return Math.abs(sum - 1) < 0.001 && w.primary > 0;
}

function testPrimarySecondaryColourApply(): boolean {
  const r = runGoldenPath(31);
  const stack = r.plans?.styleStack;
  return !!stack?.secondary && !!stack?.colour && (r.runManifest?.activeModules?.length ?? 0) >= 3;
}

function testMethenyAffectsOutput(): boolean {
  const r = runGoldenPath(32);
  const modules = r.runManifest?.activeModules ?? [];
  return modules.includes('metheny');
}

function testTriadPairsAffectsOutput(): boolean {
  const r = runGoldenPath(33);
  const modules = r.runManifest?.activeModules ?? [];
  return modules.includes('triad_pairs');
}

function testStyleBlendIntegrityPasses(): boolean {
  const r = runGoldenPath(34);
  return r.behaviourGatesPassed;
}

function testStyleStackNotInert(): boolean {
  const r = runGoldenPath(35);
  const stack = r.plans?.styleStack;
  return !!stack && stack.weights.primary > 0 && (r.runManifest?.activeModules?.length ?? 0) >= 1;
}

export function runStyleSystemRetroTests(): { name: string; ok: boolean }[] {
  return [
    ['Style stack loads', testStyleStackLoads],
    ['Weights normalize correctly', testWeightsNormalize],
    ['Primary/secondary/colour all apply', testPrimarySecondaryColourApply],
    ['Metheny affects output', testMethenyAffectsOutput],
    ['Triad pairs affects output', testTriadPairsAffectsOutput],
    ['Style blend integrity passes', testStyleBlendIntegrityPasses],
    ['Style stack not inert', testStyleStackNotInert],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
