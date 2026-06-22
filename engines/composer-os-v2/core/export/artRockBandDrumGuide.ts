/**
 * Band mode — Art Rock kick/snare/hat grid (mosaic + band mode only).
 * Stage 3: section-aware tiers aligned with scored Drums staff.
 */

import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { PPQ, type DrumGuideBar } from './midiDrumGuideWriter';

/** Beat 1 + syncopated "& of 2" (720 ticks at PPQ 480) — medium-tier kick. */
export const ART_ROCK_KICK_TICKS_44 = [0, 720] as const;

/** Backbeat snare on beats 2 and 4 — medium-tier snare. */
export const ART_ROCK_SNARE_TICKS_44 = [480, 1440] as const;

/** Closed hat eighth notes (8 per 4/4 bar) — medium-tier hat. */
export const ART_ROCK_CLOSED_HAT_TICKS_44 = [0, 240, 480, 720, 960, 1200, 1440, 1680] as const;

/** Intro sparse tier — bar 1 reference ticks. */
export const ART_ROCK_SPARSE_KICK_TICKS_44 = [0] as const;
export const ART_ROCK_SPARSE_SNARE_TICKS_44 = [960] as const;
export const ART_ROCK_SPARSE_CLOSED_HAT_TICKS_44 = [0] as const;

export type ArtRockDrumGuideSource = 'gb_onset_proxy' | 'art_rock_mosaic_grid';

export type ArtRockDrumTier = 'sparse' | 'medium' | 'busy' | 'thin';

export type ArtRockVoice1SegmentKind = 'rest' | 'hat' | 'snare' | 'snare_hat';

export interface ArtRockVoice1Segment {
  kind: ArtRockVoice1SegmentKind;
  startBeat: number;
  duration: number;
}

/** Last bar before section starts at 9 / 21 / 29. */
export const ART_ROCK_BOUNDARY_FILL_BARS = [8, 20, 28] as const;

export const ART_ROCK_SECTION_START_BARS = [9, 21, 29] as const;

export const ART_ROCK_VELOCITY_BY_TIER: Readonly<Record<ArtRockDrumTier, number>> = {
  sparse: 72,
  medium: 88,
  busy: 108,
  thin: 76,
};

export const ART_ROCK_FILL_VELOCITY = 96;

const EPS = 1e-6;
const EIGHTH = 0.5;
const SIXTEENTH = 0.25;
const SNARE_BACKBEATS = new Set([1, 3]);

export function shouldUseArtRockMosaicDrumGuide(
  bandModeEnabled: boolean | undefined,
  plan: MosaicModeSectionPlanEntry[] | undefined
): boolean {
  return bandModeEnabled === true && Array.isArray(plan) && plan.length >= 2;
}

export function artRockSectionTierForBar(barIndex: number): ArtRockDrumTier {
  if (barIndex >= 29) return 'thin';
  if (barIndex >= 21) return 'busy';
  if (barIndex >= 9) return 'medium';
  return 'sparse';
}

export function isArtRockBoundaryFillBar(barIndex: number): boolean {
  return (ART_ROCK_BOUNDARY_FILL_BARS as readonly number[]).includes(barIndex);
}

export interface ArtRockDrumBarSpec {
  tier: ArtRockDrumTier;
  isFill: boolean;
  velocity: number;
}

export function resolveArtRockDrumBarSpec(
  barIndex: number,
  useMosaicArc: boolean
): ArtRockDrumBarSpec {
  if (!useMosaicArc) {
    return { tier: 'medium', isFill: false, velocity: ART_ROCK_VELOCITY_BY_TIER.medium };
  }
  const isFill = isArtRockBoundaryFillBar(barIndex);
  const tier = artRockSectionTierForBar(barIndex);
  const velocity = isFill ? ART_ROCK_FILL_VELOCITY : ART_ROCK_VELOCITY_BY_TIER[tier];
  return { tier, isFill, velocity };
}

/** Voice 1 segments — medium baseline (Stage 2 flat pattern). */
export function artRockMediumVoice1Segments(beatSpan: number): ArtRockVoice1Segment[] {
  const out: ArtRockVoice1Segment[] = [];
  for (let sb = 0; sb + EPS < beatSpan; sb += EIGHTH) {
    const rounded = Math.round(sb * 2) / 2;
    if (SNARE_BACKBEATS.has(rounded)) {
      out.push({ kind: 'snare_hat', startBeat: rounded, duration: EIGHTH });
    } else {
      out.push({ kind: 'hat', startBeat: rounded, duration: EIGHTH });
    }
  }
  return out;
}

/** Intro sparse — hat on 1, snare on 3, rests elsewhere (voice 1). */
export function artRockSparseVoice1Segments(beatSpan: number): ArtRockVoice1Segment[] {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: sparse tier only supports 4/4 (span=${beatSpan})`);
  }
  return [
    { kind: 'hat', startBeat: 0, duration: 1 },
    { kind: 'rest', startBeat: 1, duration: 1 },
    { kind: 'snare', startBeat: 2, duration: 1 },
    { kind: 'rest', startBeat: 3, duration: 1 },
  ];
}

/** Tail thin — backbeats + offbeat hats, rests on other eighths. */
export function artRockThinVoice1Segments(beatSpan: number): ArtRockVoice1Segment[] {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: thin tier only supports 4/4 (span=${beatSpan})`);
  }
  const out: ArtRockVoice1Segment[] = [];
  for (let sb = 0; sb + EPS < beatSpan; sb += EIGHTH) {
    const rounded = Math.round(sb * 2) / 2;
    if (SNARE_BACKBEATS.has(rounded)) {
      out.push({ kind: 'snare_hat', startBeat: rounded, duration: EIGHTH });
    } else if (rounded === 0 || rounded === 2) {
      out.push({ kind: 'hat', startBeat: rounded, duration: EIGHTH });
    } else {
      out.push({ kind: 'rest', startBeat: rounded, duration: EIGHTH });
    }
  }
  return out;
}

/** Peak busy — sixteenth hats with snare layers on backbeats. */
export function artRockBusyVoice1Segments(beatSpan: number): ArtRockVoice1Segment[] {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: busy tier only supports 4/4 (span=${beatSpan})`);
  }
  const out: ArtRockVoice1Segment[] = [];
  for (let sb = 0; sb + EPS < beatSpan; sb += SIXTEENTH) {
    const rounded = Math.round(sb * 4) / 4;
    const beat = Math.floor(rounded + EPS);
    if (beat === 1 || beat === 3) {
      out.push({ kind: 'snare_hat', startBeat: rounded, duration: SIXTEENTH });
    } else {
      out.push({ kind: 'hat', startBeat: rounded, duration: SIXTEENTH });
    }
  }
  return out;
}

/** Boundary fill — first half section tier, last two beats snare roll. */
export function artRockFillVoice1Segments(beatSpan: number, sectionTier: ArtRockDrumTier): ArtRockVoice1Segment[] {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: fill tier only supports 4/4 (span=${beatSpan})`);
  }
  const out: ArtRockVoice1Segment[] = [];
  if (sectionTier === 'sparse') {
    out.push({ kind: 'hat', startBeat: 0, duration: 1 }, { kind: 'snare', startBeat: 1, duration: 1 });
  } else if (sectionTier === 'medium') {
    out.push(...artRockMediumVoice1Segments(2));
  } else if (sectionTier === 'busy') {
    for (let sb = 0; sb + EPS < 2; sb += SIXTEENTH) {
      const rounded = Math.round(sb * 4) / 4;
      const beat = Math.floor(rounded + EPS);
      if (beat === 1) {
        out.push({ kind: 'snare_hat', startBeat: rounded, duration: SIXTEENTH });
      } else {
        out.push({ kind: 'hat', startBeat: rounded, duration: SIXTEENTH });
      }
    }
  } else {
    out.push(
      { kind: 'hat', startBeat: 0, duration: EIGHTH },
      { kind: 'rest', startBeat: EIGHTH, duration: EIGHTH },
      { kind: 'snare_hat', startBeat: 1, duration: EIGHTH },
      { kind: 'rest', startBeat: 1.5, duration: EIGHTH }
    );
  }
  for (let sb = 2; sb + EPS < beatSpan; sb += EIGHTH) {
    const rounded = Math.round(sb * 2) / 2;
    out.push({ kind: 'snare_hat', startBeat: rounded, duration: EIGHTH });
  }
  return out;
}

export function artRockVoice1SegmentsForSpec(
  spec: ArtRockDrumBarSpec,
  beatSpan: number,
  barIndex: number
): ArtRockVoice1Segment[] {
  if (spec.isFill) {
    const sectionTier = artRockSectionTierForBar(barIndex);
    return artRockFillVoice1Segments(beatSpan, sectionTier);
  }
  switch (spec.tier) {
    case 'sparse':
      return artRockSparseVoice1Segments(beatSpan);
    case 'thin':
      return artRockThinVoice1Segments(beatSpan);
    case 'busy':
      return artRockBusyVoice1Segments(beatSpan);
    case 'medium':
    default:
      return artRockMediumVoice1Segments(beatSpan);
  }
}

/** Medium-tier kick: beat 1 + "& of 2". */
export const ART_ROCK_MEDIUM_KICK_STARTS = [0, 1.5] as const;

export function artRockKickStartsForSpec(
  spec: ArtRockDrumBarSpec,
  beatSpan: number,
  barIndex: number
): readonly number[] {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: only 4/4 kick grids supported (span=${beatSpan})`);
  }
  if (spec.isFill) {
    const sectionTier = artRockSectionTierForBar(barIndex);
    if (sectionTier === 'sparse') {
      return [0, 2, 2.5, 3];
    }
    if (sectionTier === 'medium') {
      return [0, 1.5, 2, 2.5, 3];
    }
    if (sectionTier === 'busy') {
      return [0, 1, 1.5, 2, 2.5, 3, 3.5];
    }
    return [0, 2, 2.5, 3];
  }
  switch (spec.tier) {
    case 'sparse':
      return [0];
    case 'thin':
      return [0, 2];
    case 'busy':
      return [0, 1, 2, 3];
    case 'medium':
    default:
      return ART_ROCK_MEDIUM_KICK_STARTS;
  }
}

function beatToTick(startBeat: number): number {
  return Math.round(startBeat * PPQ);
}

function ticksFromVoice1Segments(segments: ArtRockVoice1Segment[]): {
  closedHatTicks: number[];
  snareTicks: number[];
} {
  const closedHatTicks: number[] = [];
  const snareTicks: number[] = [];
  for (const seg of segments) {
    if (seg.kind === 'rest') continue;
    const tick = beatToTick(seg.startBeat);
    if (seg.kind === 'hat') {
      closedHatTicks.push(tick);
    } else if (seg.kind === 'snare') {
      snareTicks.push(tick);
    } else {
      closedHatTicks.push(tick);
      snareTicks.push(tick);
    }
  }
  return { closedHatTicks, snareTicks };
}

export function artRockDrumGuideTicksForBar(
  barIndex: number,
  useMosaicArc: boolean
): { kickTicks: number[]; snareTicks: number[]; closedHatTicks: number[] } {
  const spec = resolveArtRockDrumBarSpec(barIndex, useMosaicArc);
  const beatSpan = 4;
  const voice1 = artRockVoice1SegmentsForSpec(spec, beatSpan, barIndex);
  const kicks = artRockKickStartsForSpec(spec, beatSpan, barIndex);
  const { closedHatTicks, snareTicks } = ticksFromVoice1Segments(voice1);
  return {
    kickTicks: kicks.map(beatToTick),
    snareTicks,
    closedHatTicks,
  };
}

/** Section-aware guide bars when mosaic plan present; flat medium otherwise. */
export function buildArtRockBandDrumGuideBars(
  totalBars: number,
  mosaicSectionPlan?: MosaicModeSectionPlanEntry[]
): DrumGuideBar[] {
  const useMosaicArc = Array.isArray(mosaicSectionPlan) && mosaicSectionPlan.length >= 2;
  const out: DrumGuideBar[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const ticks = artRockDrumGuideTicksForBar(bar, useMosaicArc);
    out.push({
      barIndex: bar,
      meterNumerator: 4,
      meterDenominator: 4,
      beatGrouping: [1, 1, 1, 1],
      kickTicks: ticks.kickTicks,
      snareTicks: ticks.snareTicks,
      closedHatTicks: ticks.closedHatTicks,
    });
  }
  return out;
}

export { PPQ };
