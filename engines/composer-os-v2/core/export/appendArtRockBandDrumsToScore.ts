import type { CompositionContext } from '../compositionContext';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createPart, createNote, createRest } from '../score-model/scoreEventBuilder';
import {
  artRockKickStartsForSpec,
  artRockVoice1SegmentsForSpec,
  resolveArtRockDrumBarSpec,
  shouldUseArtRockMosaicDrumGuide,
  type ArtRockVoice1Segment,
} from './artRockBandDrumGuide';

export const ART_ROCK_BAND_DRUMS_PART_ID = 'art_rock_band_drums' as const;
export const ART_ROCK_BAND_DRUMS_INSTRUMENT_ID = 'art_rock_band_drums' as const;
export const ART_ROCK_GM_KICK = 36;
export const ART_ROCK_GM_SNARE = 38;
export const ART_ROCK_GM_CLOSED_HAT = 42;

const EPS = 1e-6;

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
  useMosaicArc: boolean
): Array<NoteEvent | RestEvent> {
  if (Math.abs(beatSpan - 4) > EPS) {
    throw new Error(`Band mode drums: only 4/4 bars supported (span=${beatSpan})`);
  }
  const spec = resolveArtRockDrumBarSpec(barIndex, useMosaicArc);
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
  useMosaicArc: boolean
): void {
  const span = m.measureBeatSpanQuarters ?? 4;
  m.events = buildArtRockBandMeasureEventsForBar(m.index, span, useMosaicArc);
}

export function buildArtRockBandDrumsPart(
  totalBars: number,
  context?: CompositionContext
): PartModel {
  const plan = context?.generationMetadata?.mosaicSectionPlan;
  const useMosaicArc = shouldUseArtRockMosaicDrumGuide(true, plan);
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
    fillMeasureWithPattern(m, useMosaicArc);
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

  const plan = context.generationMetadata?.mosaicSectionPlan;
  const useMosaicArc = shouldUseArtRockMosaicDrumGuide(true, plan);

  for (const m of drumPart.measures) {
    const span = m.measureBeatSpanQuarters ?? 4;
    if (Math.abs(span - 4) > EPS) {
      throw new Error(`Band mode drums: bar ${m.index} span ${span} - only 4/4 supported in Stage 3`);
    }
    fillMeasureWithPattern(m, useMosaicArc);
  }
  return { ...score, parts: [...score.parts, drumPart] };
}
