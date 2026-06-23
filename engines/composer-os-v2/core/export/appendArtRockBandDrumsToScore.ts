import type { CompositionContext } from '../compositionContext';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createPart, createNote, createRest } from '../score-model/scoreEventBuilder';
import {
  artRockKickStartsForSpec,
  artRockVoice1SegmentsForSpec,
  resolveArtRockDrumBarSpec,
  resolveArtRockDrumBarSpecFromPlan,
  type ArtRockVoice1Segment,
} from './artRockBandDrumGuide';

export const ART_ROCK_BAND_DRUMS_PART_ID = 'art_rock_band_drums' as const;
export const ART_ROCK_BAND_DRUMS_INSTRUMENT_ID = 'art_rock_band_drums' as const;
export const ART_ROCK_GM_KICK = 36;
export const ART_ROCK_GM_SNARE = 38;
export const ART_ROCK_GM_CLOSED_HAT = 42;

const EPS = 1e-6;

const CUSTOM_LOCKED_DRUM_SECTION_LABELS = ['intro', 'A', 'B', 'outro'] as const;

/** Minimal 2–4 section plan so mosaic drum arc engages on custom_locked Band mode (drums only). */
export function buildCustomLockedBandDrumSectionPlan(
  totalBars: number,
  songwriterStyleId: string
): MosaicModeSectionPlanEntry[] {
  if (totalBars < 2) {
    throw new Error(`Band mode drums: custom_locked synthesis requires totalBars >= 2 (got ${totalBars})`);
  }
  const sectionCount = totalBars >= 16 ? 4 : totalBars >= 8 ? 3 : 2;
  const baseLen = Math.floor(totalBars / sectionCount);
  let remainder = totalBars % sectionCount;
  const plan: MosaicModeSectionPlanEntry[] = [];
  let startBar = 1;
  for (let i = 0; i < sectionCount; i++) {
    const len = baseLen + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const endBar = startBar + len - 1;
    plan.push({
      sectionLabel: CUSTOM_LOCKED_DRUM_SECTION_LABELS[i] ?? `S${i + 1}`,
      startBar,
      endBar,
      songwriterStyleId,
    });
    startBar = endBar + 1;
  }
  return plan;
}

export interface BandModeDrumArcResolution {
  useMosaicArc: boolean;
  /** Present only for synthesized custom_locked arcs; real mosaic plans keep hardcoded TV-suite breakpoints. */
  proportionalPlan?: MosaicModeSectionPlanEntry[];
}

/** Opt-in drum arc: real mosaic plan unchanged; synthesize only custom_locked + band mode + no plan. */
export function resolveBandModeDrumArcPlan(
  context: CompositionContext | undefined,
  totalBars: number
): BandModeDrumArcResolution {
  const existing = context?.generationMetadata?.mosaicSectionPlan;
  if (Array.isArray(existing) && existing.length >= 2) {
    return { useMosaicArc: true };
  }
  if (context?.generationMetadata?.customHarmonyLocked !== true) {
    return { useMosaicArc: false };
  }
  const styleId =
    context.generationMetadata?.songwriterStyleId ??
    context.styleStack?.primary ??
    'verlaine';
  const proportionalPlan = buildCustomLockedBandDrumSectionPlan(totalBars, styleId);
  return { useMosaicArc: true, proportionalPlan };
}

type VoiceSegment =
  | { kind: 'rest'; startBeat: number; duration: number }
  | { kind: 'hat'; startBeat: number; duration: number }
  | { kind: 'snare'; startBeat: number; duration: number }
  | { kind: 'snare_hat'; startBeat: number; duration: number };

function toVoiceSegments(segments: ArtRockVoice1Segment[]): VoiceSegment[] {
  return segments.map((seg) => ({
    kind: seg.kind,
    startBeat: seg.startBeat,
    duration: seg.duration,
  }));
}

function segmentsToVoiceEvents(
  segments: VoiceSegment[],
  voice: number,
  velocity: number
): Array<NoteEvent | RestEvent> {
  const out: Array<NoteEvent | RestEvent> = [];
  for (const seg of segments) {
    if (seg.kind === 'rest') {
      out.push(createRest(seg.startBeat, seg.duration, voice));
      continue;
    }
    if (seg.kind === 'hat') {
      out.push(createNote(ART_ROCK_GM_CLOSED_HAT, seg.startBeat, seg.duration, voice, undefined, undefined, velocity));
      continue;
    }
    if (seg.kind === 'snare') {
      out.push(createNote(ART_ROCK_GM_SNARE, seg.startBeat, seg.duration, voice, undefined, undefined, velocity));
      continue;
    }
    out.push(
      createNote(
        ART_ROCK_GM_SNARE,
        seg.startBeat,
        seg.duration,
        voice,
        undefined,
        [ART_ROCK_GM_SNARE, ART_ROCK_GM_CLOSED_HAT],
        velocity
      )
    );
  }
  return out;
}

function voiceTwoFromKickStarts(
  kickStarts: readonly number[],
  beatSpan: number,
  velocity: number
): Array<NoteEvent | RestEvent> {
  const out: Array<NoteEvent | RestEvent> = [];
  let cursor = 0;
  for (const kickStart of kickStarts) {
    if (kickStart > cursor + EPS) {
      out.push(createRest(cursor, kickStart - cursor, 2));
    }
    out.push(createNote(ART_ROCK_GM_KICK, kickStart, 0.5, 2, undefined, undefined, velocity));
    cursor = kickStart + 0.5;
  }
  if (cursor + EPS < beatSpan) {
    out.push(createRest(cursor, beatSpan - cursor, 2));
  }
  return out;
}

export function buildArtRockBandMeasureEventsForBar(
  barIndex: number,
  beatSpan: number,
  useMosaicArc: boolean,
  proportionalPlan?: MosaicModeSectionPlanEntry[]
): Array<NoteEvent | RestEvent> {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: only 4/4 bars supported (span=${beatSpan})`);
  }
  const spec =
    useMosaicArc && proportionalPlan
      ? resolveArtRockDrumBarSpecFromPlan(barIndex, proportionalPlan)
      : resolveArtRockDrumBarSpec(barIndex, useMosaicArc);
  const voiceOne = segmentsToVoiceEvents(
    toVoiceSegments(artRockVoice1SegmentsForSpec(spec, beatSpan, barIndex)),
    1,
    spec.velocity
  );
  const voiceTwo = voiceTwoFromKickStarts(
    artRockKickStartsForSpec(spec, beatSpan, barIndex),
    beatSpan,
    spec.velocity
  );
  return [...voiceOne, ...voiceTwo];
}

/** Stage 2 flat medium-tier pattern (non-mosaic Band mode). */
export function buildArtRockBandBasicRockMeasureEvents(beatSpan = 4): Array<NoteEvent | RestEvent> {
  return buildArtRockBandMeasureEventsForBar(1, beatSpan, false);
}

function stampDrumMeasureSpans(part: PartModel, context: CompositionContext): void {
  const map = context.generationMetadata?.barMeterMap ?? context.barMeterMap;
  for (const m of part.measures) {
    m.measureBeatSpanQuarters = resolveMeasureBeatSpanQuarters(m.index, map);
  }
}

function fillMeasureWithPattern(
  m: MeasureModel,
  useMosaicArc: boolean,
  proportionalPlan?: MosaicModeSectionPlanEntry[]
): void {
  const span = m.measureBeatSpanQuarters ?? 4;
  m.events = buildArtRockBandMeasureEventsForBar(m.index, span, useMosaicArc, proportionalPlan);
}

export function buildArtRockBandDrumsPart(
  totalBars: number,
  context?: CompositionContext
): PartModel {
  const arc = resolveBandModeDrumArcPlan(context, totalBars);
  const part = createPart(
    ART_ROCK_BAND_DRUMS_PART_ID,
    'Drums',
    ART_ROCK_BAND_DRUMS_INSTRUMENT_ID,
    0,
    'treble',
    totalBars,
    () => undefined,
    () => undefined
  );
  for (const m of part.measures) {
    fillMeasureWithPattern(m, arc.useMosaicArc, arc.proportionalPlan);
  }
  return part;
}

export function appendArtRockBandDrumsToScore(
  score: ScoreModel,
  context: CompositionContext,
  bandModeEnabled: boolean | undefined
): ScoreModel {
  if (bandModeEnabled !== true) return score;
  if (score.parts.some((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID)) return score;

  let totalBars = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > totalBars) totalBars = m.index;
    }
  }
  if (totalBars < 1) return score;

  const drumPart = buildArtRockBandDrumsPart(totalBars, context);
  stampDrumMeasureSpans(drumPart, context);

  const arc = resolveBandModeDrumArcPlan(context, totalBars);

  for (const m of drumPart.measures) {
    const span = m.measureBeatSpanQuarters ?? 4;
    if (Math.abs(span - 4) > EPS) {
      throw new Error(`Band mode drums: bar ${m.index} span ${span} - only 4/4 supported in Stage 3`);
    }
    fillMeasureWithPattern(m, arc.useMosaicArc, arc.proportionalPlan);
  }
  return { ...score, parts: [...score.parts, drumPart] };
}
