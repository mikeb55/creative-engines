/**
 * Pitch-field spine builder + per-bar / per-voice resolution.
 */

import type { CompositionContext } from '../compositionContext';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { getSqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileTypes';
import { scheduleFieldRegions } from './pitchFieldScheduler';
import type {
  IntervalWeight,
  PitchClass,
  PitchFieldRegion,
  PitchFieldSpine,
  ResolvedPitchField,
  VoicePitchOverlay,
} from './pitchFieldSpineTypes';

const ORNETTE_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 0.9 },
  { semitones: 2, weight: 1.0 },
  { semitones: 3, weight: 0.85 },
  { semitones: 4, weight: 0.75 },
  { semitones: 5, weight: 0.8 },
  { semitones: 6, weight: 0.65 },
  { semitones: 7, weight: 0.6 },
  { semitones: 8, weight: 0.4 },
  { semitones: 9, weight: 0.4 },
  { semitones: 10, weight: 0.35 },
  { semitones: 11, weight: 0.35 },
];

const ORNETTE_PARENT_WEIGHTS: Array<{ pc: PitchClass; weight: number }> = [
  { pc: 0, weight: 1.0 },
  { pc: 3, weight: 0.95 },
  { pc: 5, weight: 0.9 },
  { pc: 7, weight: 0.92 },
  { pc: 10, weight: 0.88 },
  { pc: 2, weight: 0.55 },
  { pc: 9, weight: 0.5 },
];

const ORNETTE_VOICE_OVERLAYS: VoicePitchOverlay[] = [
  { voiceId: 'melody', overlapWithParent: 0.75, registerCenterMidi: 72, registerSpread: 14 },
  { voiceId: 'bass', overlapWithParent: 0.55, registerCenterMidi: 48, registerSpread: 10 },
  { voiceId: 'inner', overlapWithParent: 0.65, registerCenterMidi: 60, registerSpread: 12 },
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function buildDefaultArcs(totalBars: number, seed: number): { tension: number[]; density: number[] } {
  const tension: number[] = [];
  const density: number[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const phase = (b / Math.max(1, totalBars)) * Math.PI * 2;
    const jitter = ((seed + b * 17) % 100) / 500;
    tension.push(clamp01(0.45 + 0.35 * Math.sin(phase) + jitter));
    density.push(clamp01(0.5 + 0.25 * Math.cos(phase * 0.7) + jitter * 0.5));
  }
  return { tension, density };
}

function mergePcWeights(
  base: Array<{ pc: PitchClass; weight: number }>,
  overlay?: VoicePitchOverlay,
): Array<{ pc: PitchClass; weight: number }> {
  const map = new Map<PitchClass, number>();
  for (const { pc, weight } of base) {
    map.set(pc, weight * (overlay?.overlapWithParent ?? 1));
  }
  if (overlay?.allowedPcBias) {
    for (const { pc, weight } of overlay.allowedPcBias) {
      map.set(pc, Math.max(map.get(pc) ?? 0, weight));
    }
  }
  if (overlay?.suppressedPcs) {
    for (const pc of overlay.suppressedPcs) {
      map.delete(pc);
    }
  }
  return [...map.entries()].map(([pc, weight]) => ({ pc, weight }));
}

function regionForBar(spine: PitchFieldSpine, bar: number): PitchFieldRegion | undefined {
  return spine.regions.find((r) => bar >= r.startBar && bar <= r.endBar);
}

function buildOrnetteRegion(
  regionIndex: number,
  _startBar: number,
  _endBar: number,
): Omit<PitchFieldRegion, 'startBar' | 'endBar'> {
  return {
    id: `ornette_field_${regionIndex + 1}`,
    parentPcSet: ORNETTE_PARENT_WEIGHTS.map((w) => w.pc),
    parentWeights: [...ORNETTE_PARENT_WEIGHTS],
    intervalPool: [...ORNETTE_INTERVAL_POOL],
    anchorPcs: [0, 3, 7, 10],
    gravityCenterPc: 0,
    densityTarget: 0.55,
    tensionTarget: 0.5,
    voiceOverlays: [...ORNETTE_VOICE_OVERLAYS],
    phraseLeaderVoiceId: 'melody',
    interactionVolatility: 0.65,
    headReferenceStrength: 0.45,
  };
}

function buildSpineForProfile(
  profile: SqVrbProfile,
  totalBars: number,
  context: CompositionContext,
): PitchFieldSpine {
  const seed = context.seed ?? 0;
  const { tension, density } = buildDefaultArcs(totalBars, seed);
  const regions = scheduleFieldRegions({
    totalBars,
    vrbId: profile.vrbId,
    tensionArc: tension,
    densityArc: density,
    seed,
    buildRegion: (idx, start, end) => {
      if (profile.vrbId === 'ornette_coleman') {
        return buildOrnetteRegion(idx, start, end);
      }
      return buildOrnetteRegion(idx, start, end);
    },
  });
  const opts = profile.pitchFieldOptions;
  return {
    id: `${profile.vrbId}_pitch_field_${totalBars}b`,
    composerVrbId: profile.vrbId,
    regions,
    defaultOverlapPolicy: opts?.defaultOverlapPolicy ?? 'semi-independent',
    fieldRhythmUnit: opts?.fieldRhythmUnit ?? 'phrase',
  };
}

export function buildPitchFieldSpine(
  vrbId: string,
  totalBars: number,
  context: CompositionContext,
): PitchFieldSpine {
  const profile = getSqVrbProfile(vrbId);
  if (!profile) {
    throw new Error(`buildPitchFieldSpine: unknown vrbId ${vrbId}`);
  }
  return buildSpineForProfile(profile, totalBars, context);
}

export function resolveFieldForBar(
  spine: PitchFieldSpine,
  bar: number,
  voiceId: string,
): ResolvedPitchField {
  const region = regionForBar(spine, bar);
  if (!region) {
    throw new Error(`resolveFieldForBar: no region for bar ${bar}`);
  }
  const overlay =
    region.voiceOverlays.find((v) => v.voiceId === voiceId) ??
    region.voiceOverlays[0];
  const base =
    region.parentWeights ??
    region.parentPcSet.map((pc) => ({ pc, weight: 1 }));
  return {
    allowedPcs: mergePcWeights(base, overlay),
    preferredIntervals: overlay?.preferredIntervals ?? region.intervalPool,
    registerCenterMidi: overlay?.registerCenterMidi,
    registerSpread: overlay?.registerSpread,
    regionId: region.id,
  };
}

export function getAvailablePcs(
  field: ResolvedPitchField,
  _voiceId: string,
): Array<{ pc: PitchClass; weight: number }> {
  return field.allowedPcs.map((e) => ({ ...e }));
}

export function isUsingPitchFieldSubstrate(bundle: VoiceRuleBundle): boolean {
  if (bundle.pitchFieldGoverned === true) return true;
  const profileId = bundle.sqVrbProfileId ?? bundle.voiceId;
  const profile = getSqVrbProfile(profileId);
  return profile?.harmonicSubstrate === 'pitch-field-spine';
}

export function resolvePitchFieldBundleForContext(context: CompositionContext): VoiceRuleBundle | undefined {
  const id =
    context.generationMetadata?.sqLineVrbId ??
    context.voiceBundle?.sqVrbProfileId ??
    context.voiceBundle?.voiceId;
  if (!id) return context.voiceBundle;
  return getVoiceRuleBundle(String(id)) ?? context.voiceBundle;
}

export function getOrBuildPitchFieldSpineCache(
  context: CompositionContext,
  vrbId: string,
): PitchFieldSpine {
  const meta = context.generationMetadata as
    | { sqToBbPitchFieldSpineCache?: { key: string; spine: PitchFieldSpine } }
    | undefined;
  const totalBars = context.form.totalBars;
  const key = `${vrbId}|${totalBars}|${context.seed ?? 0}`;
  if (meta?.sqToBbPitchFieldSpineCache?.key === key) {
    return meta.sqToBbPitchFieldSpineCache.spine;
  }
  const spine = buildPitchFieldSpine(vrbId, totalBars, context);
  if (meta) {
    meta.sqToBbPitchFieldSpineCache = { key, spine };
  }
  return spine;
}
