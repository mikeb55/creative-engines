/**
 * Long-Line Practice Lab — MusicXML export (Phase 2D).
 * Reuses exportScoreModelToMusicXml. No TAB. No invented chords. No source overwrite.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { longLineMeterSpanQuarters } from './meter';
import {
  LONG_LINE_PRACTICE_VERSION,
  type LongLineEvent,
  type LongLineExportBarMeta,
  type LongLineExportedScore,
  type LongLineExportRequest,
  type LongLineHarmonyCandidate,
  type LongLineMeter,
  type LongLineMusicXmlContext,
  type LongLineMusicXmlGenerateResult,
  type LongLineProfile,
  type LongLineTimedBassEvent,
} from './types';

const EPS = 1e-6;

function profileLabel(profile: LongLineProfile): string {
  switch (profile) {
    case 'lyrical':
      return 'Lyrical';
    case 'intervallic':
      return 'Intervallic';
    case 'experimental':
      return 'Experimental';
  }
}

/** Fill gaps and pad to full bar so voice duration sum equals the metre span. */
export function fillBarEvents(events: readonly ScoreEvent[], beatSpan: number): ScoreEvent[] {
  if (beatSpan <= EPS) return [];
  const notes = events
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .slice()
    .sort((a, b) => a.startBeat - b.startBeat);
  const filled: ScoreEvent[] = [];
  let cursor = 0;
  for (const event of notes) {
    const start = Math.max(0, event.startBeat);
    if (start > cursor + EPS) {
      filled.push(createRest(cursor, start - cursor, 1));
    }
    const dur = Math.min(event.duration, beatSpan - start);
    if (dur > EPS) {
      if (event.kind === 'rest') filled.push(createRest(start, dur, 1));
      else filled.push(createNote((event as { pitch: number }).pitch, start, dur, 1));
      cursor = Math.max(cursor, start + dur);
    }
  }
  if (cursor < beatSpan - EPS) filled.push(createRest(cursor, beatSpan - cursor, 1));
  if (filled.length === 0) filled.push(createRest(0, beatSpan, 1));
  return filled;
}

function guitarEventsForBar(
  lineEvents: readonly LongLineEvent[],
  barIndex: number,
  beatSpan: number,
): ScoreEvent[] {
  const raw = lineEvents
    .filter((e) => e.bar === barIndex)
    .map((e) => createNote(e.midi, e.startBeat, e.duration, 1));
  return fillBarEvents(raw, beatSpan);
}

/**
 * Write bass from verified timed source attacks only.
 * When timing is unavailable, rest the bar — never invent equal-duration rhythm from midis.
 */
export function bassEventsForBar(
  timed: readonly LongLineTimedBassEvent[] | undefined,
  beatSpan: number,
): ScoreEvent[] {
  if (!timed?.length) return fillBarEvents([], beatSpan);
  const raw = timed.map((event) => createNote(event.midi, event.startBeat, event.duration, 1));
  return fillBarEvents(raw, beatSpan);
}

function resolveBarMeter(
  barIndex: number,
  barMeta: readonly LongLineExportBarMeta[],
  metersByBar: readonly (LongLineMeter | null)[] | undefined,
  fallback: LongLineMeter,
): LongLineMeter {
  const fromMeta = barMeta[barIndex]?.meter;
  if (fromMeta && fromMeta.beats > 0 && fromMeta.beatType > 0) return fromMeta;
  const fromHarmony = metersByBar?.[barIndex];
  if (fromHarmony && fromHarmony.beats > 0 && fromHarmony.beatType > 0) return fromHarmony;
  return fallback;
}

function buildCandidateScore(args: {
  candidate: LongLineHarmonyCandidate;
  metersByBar: readonly (LongLineMeter | null)[] | undefined;
  barMeta: readonly LongLineExportBarMeta[];
  tempoBpm: number;
  titlePrefix: string;
  beats: number;
  beatType: number;
}): ScoreModel {
  const { candidate, metersByBar, barMeta, tempoBpm, titlePrefix, beats, beatType } = args;
  const barCount = candidate.line.bars;
  const fallbackMeter: LongLineMeter = { beats, beatType };

  const chordAt = (measureNumber: number): string | undefined => {
    const meta = barMeta[measureNumber - 1];
    const sym = meta?.chordSymbol?.trim();
    return sym ? sym : undefined;
  };

  const guitar = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    barCount,
    chordAt,
    () => undefined,
  );
  const bass = createPart(
    'bass',
    'Upright Bass',
    ACOUSTIC_UPRIGHT_BASS.instrumentIdentity,
    ACOUSTIC_UPRIGHT_BASS.midiProgram,
    'bass',
    barCount,
    () => undefined,
    () => undefined,
  );

  const words: Record<number, string> = {};
  const barMeterMap: Record<number, { numerator: number; denominator: number }> = {};
  for (let i = 0; i < barCount; i += 1) {
    const measureNumber = i + 1;
    const meta = barMeta[i];
    const meter = resolveBarMeter(i, barMeta, metersByBar, fallbackMeter);
    const beatSpan = longLineMeterSpanQuarters(meter);
    barMeterMap[measureNumber] = { numerator: meter.beats, denominator: meter.beatType };

    const sourceLabel = meta
      ? `source bar ${meta.printedBar ?? meta.sourceBar}`
      : `bar ${measureNumber}`;
    words[measureNumber] = `${profileLabel(candidate.profile)} · ${sourceLabel}`;

    const gMeasure = guitar.measures[i]!;
    gMeasure.measureBeatSpanQuarters = beatSpan;
    gMeasure.events = guitarEventsForBar(candidate.line.events, i, beatSpan);

    const bMeasure = bass.measures[i]!;
    bMeasure.measureBeatSpanQuarters = beatSpan;
    bMeasure.events = bassEventsForBar(candidate.bassEventsByBar[i], beatSpan);
  }

  const title = `${titlePrefix} — ${profileLabel(candidate.profile)}`;
  const score = createScore(title, [guitar, bass], { tempo: tempoBpm });
  const firstMeter = resolveBarMeter(0, barMeta, metersByBar, fallbackMeter);
  score.timeSignature = { beats: firstMeter.beats, beatType: firstMeter.beatType };
  score.barMeterMap = barMeterMap;
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  score.measureWordsMarkings = words;
  return score;
}

function xmlOf(score: ScoreModel): string {
  const math = validateStrictBarMath(score);
  if (!math.valid) {
    throw new Error(`long-line-practice export bar math: ${math.errors.join('; ')}`);
  }
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    throw new Error(exported.errors.join(' ') || 'long-line-practice MusicXML export failed');
  }
  const xml = exported.xml;
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(xml)) {
    throw new Error('long-line-practice export wrote a TAB staff');
  }
  const schema = validateMusicXmlSchema(xml);
  if (!schema.valid) {
    throw new Error(`long-line-practice schema: ${schema.errors.join('; ')}`);
  }
  return xml;
}

/**
 * Export each profile as its own MusicXML score (guitar + bass).
 * Chord symbols only when supplied. Tempo must be verified by the caller.
 */
export function exportLongLinePracticeScores(request: LongLineExportRequest): LongLineExportedScore[] {
  if (!(request.tempoBpm > 0) || !Number.isFinite(request.tempoBpm)) {
    throw new Error('long-line-practice export requires a verified positive tempoBpm');
  }
  const beats = request.beats ?? 4;
  const beatType = request.beatType ?? 4;
  if (!(beats > 0) || !(beatType > 0)) {
    throw new Error('long-line-practice export: invalid metre');
  }

  const barCount = request.harmony.candidates[0]?.line.bars ?? 0;
  if (barCount < 1) throw new Error('long-line-practice export: empty harmony result');

  const barMeta: LongLineExportBarMeta[] = [];
  for (let i = 0; i < barCount; i += 1) {
    const given = request.barMeta?.[i];
    barMeta.push(
      given ?? {
        sourceBar: i + 1,
        printedBar: String(i + 1),
        chordSymbol: null,
      },
    );
  }

  const titlePrefix = request.titlePrefix?.trim() || 'Long-Line Practice';
  return request.harmony.candidates.map((candidate) => {
    const score = buildCandidateScore({
      candidate,
      metersByBar: request.harmony.metersByBar,
      barMeta,
      tempoBpm: Math.round(request.tempoBpm),
      titlePrefix,
      beats,
      beatType,
    });
    return {
      profile: candidate.profile,
      title: score.title,
      xml: xmlOf(score),
    };
  });
}

/**
 * Export from a MusicXML generate result using source chords, source-bar labels,
 * and verified tempo from the context (or an explicit override).
 */
export function exportLongLineScoresFromMusicXmlResult(
  result: LongLineMusicXmlGenerateResult,
  options?: { tempoBpm?: number; titlePrefix?: string; beats?: number; beatType?: number },
): LongLineExportedScore[] {
  if (!result.harmony) {
    throw new Error('long-line-practice export: generation produced no harmony candidates');
  }
  const tempoBpm = options?.tempoBpm ?? result.context.tempoBpm;
  if (tempoBpm === null || tempoBpm === undefined) {
    throw new Error('long-line-practice export: no verified tempo in source; pass tempoBpm explicitly');
  }
  const barMeta: LongLineExportBarMeta[] = result.context.bars.map((bar) => ({
    sourceBar: bar.sourceBar,
    printedBar: bar.printedBar,
    chordSymbol: bar.chordSymbol,
    meter: bar.meter,
  }));
  // Source metres win when present; options.beats/beatType are fallbacks only.
  return exportLongLinePracticeScores({
    harmony: result.harmony,
    barMeta,
    tempoBpm,
    titlePrefix: options?.titlePrefix,
    beats: options?.beats,
    beatType: options?.beatType,
  });
}

export function assertNoTabStaff(xml: string): void {
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(xml)) {
    throw new Error('TAB staff present');
  }
}

export function longLineExportVersion(): string {
  return LONG_LINE_PRACTICE_VERSION;
}

/** Test helper: build score model without serialising (metre checks). */
export function buildLongLineExportScoreForTests(
  request: LongLineExportRequest,
  profile: LongLineProfile,
): ScoreModel {
  const candidate = request.harmony.candidates.find((c) => c.profile === profile);
  if (!candidate) throw new Error(`missing profile ${profile}`);
  const barCount = candidate.line.bars;
  const barMeta: LongLineExportBarMeta[] = [];
  for (let i = 0; i < barCount; i += 1) {
    barMeta.push(request.barMeta?.[i] ?? { sourceBar: i + 1, chordSymbol: null });
  }
  return buildCandidateScore({
    candidate,
    metersByBar: request.harmony.metersByBar,
    barMeta,
    tempoBpm: request.tempoBpm,
    titlePrefix: request.titlePrefix ?? 'Long-Line Practice',
    beats: request.beats ?? 4,
    beatType: request.beatType ?? 4,
  });
}

export type { LongLineMusicXmlContext };
