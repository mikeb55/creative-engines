/**
 * Tempo-adaptive swing curve — computeSwingIntensityForTempo + buildSwingPolicy BPM wiring.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import {
  SQ_SWING_RHYTHM_BY_VRB_ID,
  computeSwingIntensityForTempo,
} from '../core/counterpoint/vrbProfiles/sqSwingRhythm';
import { buildSwingPolicy } from '../core/rhythm/sqSwingRhythmEngine';

const G = () => SQ_SWING_RHYTHM_BY_VRB_ID.gershwin;
const P = () => SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter;
const T = () => SQ_SWING_RHYTHM_BY_VRB_ID.turtle_island;

function testGershwin120EqualsBase(): boolean {
  return computeSwingIntensityForTempo(G(), 120) === 0.65;
}

function testGershwin60Heavier(): boolean {
  return computeSwingIntensityForTempo(G(), 60) > 0.65;
}

function testGershwin200Lighter(): boolean {
  return computeSwingIntensityForTempo(G(), 200) < 0.65;
}

function testPorter120EqualsBase(): boolean {
  return computeSwingIntensityForTempo(P(), 120) === 0.52;
}

function testPorter60Heavier(): boolean {
  return computeSwingIntensityForTempo(P(), 60) > 0.52;
}

function testPorter200Lighter(): boolean {
  return computeSwingIntensityForTempo(P(), 200) < 0.52;
}

function testTurtle120EqualsBase(): boolean {
  return computeSwingIntensityForTempo(T(), 120) === 0.8;
}

function testTurtle60Heavier(): boolean {
  return computeSwingIntensityForTempo(T(), 60) > 0.8;
}

function testTurtle200Lighter(): boolean {
  return computeSwingIntensityForTempo(T(), 200) < 0.8;
}

function testGershwinClampedFloor(): boolean {
  return computeSwingIntensityForTempo(G(), 30) >= G().intensityFloor;
}

function testGershwinClampedCeiling(): boolean {
  return computeSwingIntensityForTempo(G(), 300) <= G().intensityCeiling;
}

function testPorterKLessThanGershwin(): boolean {
  return P().curveK < G().curveK;
}

function testTurtleKGreaterThanGershwin(): boolean {
  return T().curveK > G().curveK;
}

function gapAt(bpm: number): number {
  return computeSwingIntensityForTempo(G(), bpm) - computeSwingIntensityForTempo(P(), bpm);
}

function testGap80(): boolean {
  return gapAt(80) >= 0.1;
}

function testGap120(): boolean {
  return gapAt(120) >= 0.1;
}

function testGap160(): boolean {
  return gapAt(160) >= 0.1;
}

function testGap200(): boolean {
  return gapAt(200) >= 0.1;
}

function testBpmUndefinedFlatFallback(): boolean {
  const porter = getVoiceRuleBundle('cole_porter');
  const policy = buildSwingPolicy(porter);
  return policy.swingIntensity === 0.52;
}

function testBuildPolicy120MatchesFlat(): boolean {
  const ids = ['cole_porter', 'gershwin', 'turtle_island'] as const;
  for (const id of ids) {
    const bundle = getVoiceRuleBundle(id);
    const flat = bundle.swingIntensity ?? SQ_SWING_RHYTHM_BY_VRB_ID[id].swingIntensity;
    const curved = buildSwingPolicy(bundle, 120).swingIntensity;
    if (Math.abs(curved - flat) > 1e-9) return false;
  }
  return true;
}

function testComputePure(): boolean {
  const a = computeSwingIntensityForTempo(G(), 140);
  const b = computeSwingIntensityForTempo(G(), 140);
  return a === b && Number.isFinite(a);
}

export function runTempoAdaptiveSwingTests(): { name: string; ok: boolean }[] {
  return [
    ['tempo swing: gershwin 120 BPM → 0.65', testGershwin120EqualsBase],
    ['tempo swing: gershwin 60 BPM heavier than base', testGershwin60Heavier],
    ['tempo swing: gershwin 200 BPM lighter than base', testGershwin200Lighter],
    ['tempo swing: cole_porter 120 BPM → 0.52', testPorter120EqualsBase],
    ['tempo swing: cole_porter 60 BPM heavier', testPorter60Heavier],
    ['tempo swing: cole_porter 200 BPM lighter', testPorter200Lighter],
    ['tempo swing: turtle_island 120 BPM → 0.80', testTurtle120EqualsBase],
    ['tempo swing: turtle_island 60 BPM heavier', testTurtle60Heavier],
    ['tempo swing: turtle_island 200 BPM lighter', testTurtle200Lighter],
    ['tempo swing: gershwin clamped ≥ floor at 30 BPM', testGershwinClampedFloor],
    ['tempo swing: gershwin clamped ≤ ceiling at 300 BPM', testGershwinClampedCeiling],
    ['tempo swing: porter curveK < gershwin', testPorterKLessThanGershwin],
    ['tempo swing: turtle curveK > gershwin', testTurtleKGreaterThanGershwin],
    ['tempo swing: gap ≥ 0.10 at 80 BPM', testGap80],
    ['tempo swing: gap ≥ 0.10 at 120 BPM', testGap120],
    ['tempo swing: gap ≥ 0.10 at 160 BPM', testGap160],
    ['tempo swing: gap ≥ 0.10 at 200 BPM', testGap200],
    ['tempo swing: BPM undefined → flat fallback', testBpmUndefinedFlatFallback],
    ['tempo swing: buildSwingPolicy bpm=120 matches flat scalar', testBuildPolicy120MatchesFlat],
    ['tempo swing: computeSwingIntensityForTempo pure', testComputePure],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
