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

  MessiaenModeId,

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



const COLTRANE_INTERVAL_POOL: IntervalWeight[] = [

  { semitones: 1, weight: 0.95 },

  { semitones: 2, weight: 1.0 },

  { semitones: 3, weight: 0.9 },

  { semitones: 4, weight: 0.7 },

  { semitones: 5, weight: 0.75 },

  { semitones: 6, weight: 0.8 },

  { semitones: 7, weight: 0.5 },

  { semitones: 8, weight: 0.4 },

  { semitones: 9, weight: 0.35 },

  { semitones: 10, weight: 0.3 },

  { semitones: 11, weight: 0.3 },

];



const COLTRANE_VOICE_OVERLAYS: VoicePitchOverlay[] = [

  {

    voiceId: 'melody',

    overlapWithParent: 0.85,

    registerCenterMidi: 74,

    registerSpread: 16,

    preferredIntervals: COLTRANE_INTERVAL_POOL,

  },

  {

    voiceId: 'bass',

    overlapWithParent: 0.7,

    registerCenterMidi: 46,

    registerSpread: 10,

    preferredIntervals: COLTRANE_INTERVAL_POOL,

  },

  {

    voiceId: 'inner',

    overlapWithParent: 0.8,

    registerCenterMidi: 62,

    registerSpread: 12,

    preferredIntervals: COLTRANE_INTERVAL_POOL,

  },

];



const MESSIAEN_INTERVAL_POOL: IntervalWeight[] = [

  { semitones: 1, weight: 0.85 },

  { semitones: 2, weight: 0.95 },

  { semitones: 3, weight: 0.8 },

  { semitones: 4, weight: 0.7 },

  { semitones: 5, weight: 0.55 },

  { semitones: 6, weight: 0.9 },

  { semitones: 7, weight: 0.4 },

  { semitones: 8, weight: 0.35 },

  { semitones: 9, weight: 0.3 },

  { semitones: 10, weight: 0.25 },

  { semitones: 11, weight: 0.2 },

];



const MESSIAEN_VOICE_OVERLAYS: VoicePitchOverlay[] = [

  {

    voiceId: 'melody',

    overlapWithParent: 0.85,

    registerCenterMidi: 72,

    registerSpread: 12,

    preferredIntervals: MESSIAEN_INTERVAL_POOL,

  },

  {

    voiceId: 'bass',

    overlapWithParent: 0.6,

    registerCenterMidi: 43,

    registerSpread: 8,

    preferredIntervals: MESSIAEN_INTERVAL_POOL,

  },

  {

    voiceId: 'inner',

    overlapWithParent: 0.8,

    registerCenterMidi: 58,

    registerSpread: 10,

    preferredIntervals: MESSIAEN_INTERVAL_POOL,

  },

];



/** Messiaen modes of limited transposition — pitch-class sets (0=C). */

export const MESSIAEN_MODES: Record<MessiaenModeId, readonly PitchClass[]> = {

  1: [0, 2, 4, 6, 8, 10],

  2: [0, 1, 3, 4, 6, 7, 9, 10],

  3: [0, 2, 3, 4, 6, 7, 8, 10, 11],

  4: [0, 1, 2, 5, 6, 7, 8, 11],

  5: [0, 1, 5, 6, 7, 11],

  6: [0, 2, 4, 5, 6, 8, 10, 11],

  7: [0, 1, 2, 3, 5, 6, 7, 8, 9, 11],

};



const COLTRANE_CELLS: readonly (readonly PitchClass[])[] = [

  [0, 4, 7],

  [0, 3, 7, 10],

  [0, 2, 5, 8, 11],

  [0, 1, 4, 6, 9],

];

const LIGETI_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 1.0 },
  { semitones: 2, weight: 0.95 },
  { semitones: 3, weight: 0.55 },
  { semitones: 4, weight: 0.35 },
  { semitones: 5, weight: 0.3 },
  { semitones: 6, weight: 0.45 },
  { semitones: 7, weight: 0.25 },
  { semitones: 8, weight: 0.2 },
  { semitones: 9, weight: 0.2 },
  { semitones: 10, weight: 0.15 },
  { semitones: 11, weight: 0.15 },
];

const LIGETI_VOICE_OVERLAYS: VoicePitchOverlay[] = [
  {
    voiceId: 'melody',
    overlapWithParent: 0.9,
    registerCenterMidi: 76,
    registerSpread: 18,
    preferredIntervals: LIGETI_INTERVAL_POOL,
  },
  {
    voiceId: 'inner',
    overlapWithParent: 0.9,
    registerCenterMidi: 64,
    registerSpread: 14,
    preferredIntervals: LIGETI_INTERVAL_POOL,
  },
  {
    voiceId: 'bass',
    overlapWithParent: 0.8,
    registerCenterMidi: 48,
    registerSpread: 10,
    preferredIntervals: LIGETI_INTERVAL_POOL,
  },
];

const LIGETI_CHROMATIC_PCS: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function ligetiParentWeights(seed: number, regionIndex: number): Array<{ pc: PitchClass; weight: number }> {
  return LIGETI_CHROMATIC_PCS.map((pc) => {
    const central = pc >= 3 && pc <= 9;
    const base = central ? 0.88 : 0.58;
    const jitter = rng01(seed, regionIndex * 17 + pc * 3) * 0.12;
    return { pc, weight: base + jitter };
  });
}



function clamp01(n: number): number {

  return Math.max(0, Math.min(1, n));

}



function rng01(seed: number, salt: number): number {

  let x = Math.imul(seed + salt * 7919, 1103515245);

  x = (x ^ (x >>> 13)) >>> 0;

  return (x % 100000) / 100000;

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



function parentWeightsFromPcs(pcs: readonly PitchClass[], seed: number, regionIndex: number): Array<{ pc: PitchClass; weight: number }> {

  return pcs.map((pc, i) => ({

    pc,

    weight: 0.75 + rng01(seed, regionIndex * 31 + i * 7) * 0.25,

  }));

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



function buildColtraneRegion(

  regionIndex: number,

  seed: number,

): Omit<PitchFieldRegion, 'startBar' | 'endBar'> {

  const cell = COLTRANE_CELLS[regionIndex % COLTRANE_CELLS.length]!;

  const transpose = (regionIndex * 5) % 12;

  const parentPcSet = cell.map((pc) => ((pc + transpose) % 12) as PitchClass);

  const cellGenerator: 'trichord' | 'hexachord' = parentPcSet.length <= 3 ? 'trichord' : 'hexachord';

  const densityDrive = 0.4 + rng01(seed, regionIndex * 23 + 5) * 0.6;

  return {

    id: `coltrane_field_${regionIndex + 1}`,

    parentPcSet: [...parentPcSet],

    parentWeights: parentWeightsFromPcs(parentPcSet, seed, regionIndex),

    intervalPool: [...COLTRANE_INTERVAL_POOL],

    anchorPcs: parentPcSet.slice(0, 3),

    gravityCenterPc: parentPcSet[0],

    densityTarget: densityDrive,

    tensionTarget: 0.55 + rng01(seed, regionIndex * 11) * 0.25,

    voiceOverlays: [...COLTRANE_VOICE_OVERLAYS],

    phraseLeaderVoiceId: 'melody',

    interactionVolatility: 0.4,

    headReferenceStrength: 0.35,

    cellGenerator,

    transpositionCycle: 5,

    densityDrive,

  };

}



function buildMessiaenRegion(

  regionIndex: number,

  modeId: MessiaenModeId,

  seed: number,

): Omit<PitchFieldRegion, 'startBar' | 'endBar'> {

  const parentPcSet = [...MESSIAEN_MODES[modeId]] as PitchClass[];

  return {

    id: `messiaen_m${modeId}_field_${regionIndex + 1}`,

    parentPcSet,

    parentWeights: parentWeightsFromPcs(parentPcSet, seed, regionIndex),

    intervalPool: [...MESSIAEN_INTERVAL_POOL],

    anchorPcs: parentPcSet.slice(0, Math.min(4, parentPcSet.length)),

    gravityCenterPc: parentPcSet[0],

    densityTarget: 0.45,

    tensionTarget: 0.4,

    voiceOverlays: [...MESSIAEN_VOICE_OVERLAYS],

    phraseLeaderVoiceId: 'melody',

    interactionVolatility: 0.25,

    headReferenceStrength: 0.3,

    modeId,

    pedalPolicy: 'bass-drone',

    rhythmicCellEnabled: regionIndex % 2 === 0,

  };

}

function buildLigetiRegion(
  regionIndex: number,
  seed: number,
): Omit<PitchFieldRegion, 'startBar' | 'endBar'> {
  const gravityCenterPc = (3 + (regionIndex * 2) % 7) as PitchClass;
  return {
    id: `ligeti_field_${regionIndex + 1}`,
    parentPcSet: [...LIGETI_CHROMATIC_PCS],
    parentWeights: ligetiParentWeights(seed, regionIndex),
    intervalPool: [...LIGETI_INTERVAL_POOL],
    anchorPcs: LIGETI_CHROMATIC_PCS.slice(0, 6),
    gravityCenterPc,
    densityTarget: 0.85,
    tensionTarget: 0.42,
    voiceOverlays: [...LIGETI_VOICE_OVERLAYS],
    phraseLeaderVoiceId: 'melody',
    interactionVolatility: 0.35,
    headReferenceStrength: 0.25,
    textureDensity: 0.85,
    canonOffsetRange: [0.125, 0.5],
    clusterWidth: 8,
    motionBlur: 0.7,
    entryStagger: 0.65,
  };
}

function resolveMessiaenModeId(context: CompositionContext): MessiaenModeId {

  const raw = context.messiaenModeId ?? context.generationMetadata?.messiaenModeId;

  if (typeof raw === 'number' && raw >= 1 && raw <= 7) {

    return raw as MessiaenModeId;

  }

  return 2;

}



function buildSpineForProfile(

  profile: SqVrbProfile,

  totalBars: number,

  context: CompositionContext,

): PitchFieldSpine {

  const seed = context.seed ?? 0;

  const { tension, density } = buildDefaultArcs(totalBars, seed);

  const messiaenModeId = profile.vrbId === 'messiaen' ? resolveMessiaenModeId(context) : undefined;

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

      if (profile.vrbId === 'coltrane') {

        return buildColtraneRegion(idx, seed);

      }

      if (profile.vrbId === 'messiaen' && messiaenModeId) {

        return buildMessiaenRegion(idx, messiaenModeId, seed);

      }

      if (profile.vrbId === 'ligeti') {

        return buildLigetiRegion(idx, seed);

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



/**

 * Song mode suppresses pitch-field substrate for pitch-field-governed VRBs (chord-spine fallback).

 */

export function shouldUsePitchFieldSubstrate(

  bundle: VoiceRuleBundle,

  sectionLabelMode?: string,

): boolean {

  const vrbId = bundle.sqVrbProfileId ?? bundle.voiceId ?? 'unknown';

  if (sectionLabelMode === 'song' && bundle.pitchFieldGoverned === true) {

    if (process.env.NODE_ENV !== 'production') {

      console.warn(

        `pitch-field-spine suppressed in song mode for ${vrbId} — falling back to chord-spine`,

      );

    }

    return false;

  }

  return isUsingPitchFieldSubstrate(bundle);

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

  const modeId = vrbId === 'messiaen' ? resolveMessiaenModeId(context) : 0;

  const key = `${vrbId}|${totalBars}|${context.seed ?? 0}|m${modeId}`;

  if (meta?.sqToBbPitchFieldSpineCache?.key === key) {

    return meta.sqToBbPitchFieldSpineCache.spine;

  }

  const spine = buildPitchFieldSpine(vrbId, totalBars, context);

  if (meta) {

    meta.sqToBbPitchFieldSpineCache = { key, spine };

  }

  return spine;

}


