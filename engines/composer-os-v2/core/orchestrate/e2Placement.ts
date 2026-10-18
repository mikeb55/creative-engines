/**
 * E2 placement ledger and ScoreModel projection.
 * Written pitch is for notation. MIDI uses the sounding projection when e2SoundingMidi is set.
 */

import { soundingSpellingToWritten, writtenToSounding, type SpelledPitch } from '../instruments/writtenPitch';
import type { Transposition } from '../instruments/instrumentTypes';
import { CONCERT_TRANSPOSITION } from '../instruments/instrumentTypes';
import { q, qAdd, qCmp, qEq, qSub, qToNumber, integralTicks, type ExactQuarter } from '../piano/pianoExactTiming';
import { PIANO_V11_EXPORT_PPQ } from '../piano/pianoExactTiming';
import type { NoteEvent, PartModel, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { E2RealisedPlacement, E2RestWindow } from './harmonicRealisation';
import type { SpelledRegister } from './harmonicColourTypes';

export interface E2PartSpec {
  partId: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
  transposition: Transposition;
  hardRange: readonly [number, number] | null;
  maxSimultaneous: number;
  drums?: boolean;
  catalogueInstrumentSound?: string;
}

export interface E2Assignment {
  placementId: string;
  partId: string;
  voice: number;
}

export interface BuiltE2Score {
  score: ScoreModel;
  writtenByPlacement: ReadonlyMap<string, SpelledPitch>;
  soundingByPlacement: ReadonlyMap<string, SpelledRegister>;
}

export function quarterLength(numerator: number, denominator: number): ExactQuarter {
  return q(numerator * 4, denominator);
}

export function defaultMetres(bars: number): BarMeterMap {
  const map: BarMeterMap = {};
  for (let bar = 1; bar <= bars; bar += 1) map[bar] = { numerator: 4, denominator: 4 };
  return map;
}

export function barSpans(metres: BarMeterMap, bars: number): Array<{ bar: number; start: ExactQuarter; length: ExactQuarter }> {
  const spans: Array<{ bar: number; start: ExactQuarter; length: ExactQuarter }> = [];
  let cursor = q(0);
  for (let bar = 1; bar <= bars; bar += 1) {
    const meter = metres[bar] ?? { numerator: 4, denominator: 4 };
    const length = quarterLength(meter.numerator, meter.denominator);
    spans.push({ bar, start: cursor, length });
    cursor = qAdd(cursor, length);
  }
  return spans;
}

export function totalQuarters(metres: BarMeterMap, bars: number): ExactQuarter {
  return barSpans(metres, bars).reduce((sum, span) => qAdd(sum, span.length), q(0));
}

function writtenFor(pitch: SpelledRegister, transposition: Transposition): SpelledPitch {
  return soundingSpellingToWritten(pitch, transposition);
}

function exactFor(onsetInBar: ExactQuarter, duration: ExactQuarter, id: string, tuplet?: NoteEvent['pianoExact'] extends infer T ? T extends { tuplet?: infer U } ? U : never : never): NoteEvent['pianoExact'] {
  const ticks = integralTicks(duration, PIANO_V11_EXPORT_PPQ);
  if (ticks === null) throw new Error(`unsupported exact duration ${duration.n}/${duration.d}`);
  const written = writtenType(duration);
  return {
    onsetQ: onsetInBar,
    durationQ: duration,
    writtenType: written.type,
    dots: written.dots,
    ...(written.tuplet ? { tuplet: { ...written.tuplet, groupId: written.tuplet.groupId || id } } : {}),
    logicalEventId: id,
  };
}

function writtenType(duration: ExactQuarter): { type: string; dots: 0 | 1 | 2; tuplet?: NonNullable<NoteEvent['pianoExact']>['tuplet'] } {
  const known: Array<{ n: number; d: number; type: string; dots: 0 | 1 | 2; tuplet?: NonNullable<NoteEvent['pianoExact']>['tuplet'] }> = [
    { n: 4, d: 1, type: 'whole', dots: 0 },
    { n: 3, d: 1, type: 'half', dots: 1 },
    { n: 2, d: 1, type: 'half', dots: 0 },
    { n: 3, d: 2, type: 'quarter', dots: 1 },
    { n: 1, d: 1, type: 'quarter', dots: 0 },
    { n: 1, d: 2, type: 'eighth', dots: 0 },
    { n: 1, d: 4, type: '16th', dots: 0 },
    { n: 1, d: 8, type: '32nd', dots: 0 },
    { n: 1, d: 16, type: '64th', dots: 0 },
    { n: 1, d: 3, type: 'eighth', dots: 0, tuplet: { actualNotes: 3, normalNotes: 2, normalType: 'eighth', groupId: '', bracket: 'start' } },
    { n: 1, d: 5, type: '16th', dots: 0, tuplet: { actualNotes: 5, normalNotes: 4, normalType: '16th', groupId: '', bracket: 'start' } },
  ];
  const hit = known.find((item) => item.n * duration.d === item.d * duration.n);
  if (!hit) throw new Error(`no written type for ${duration.n}/${duration.d}`);
  return { type: hit.type, dots: hit.dots, ...(hit.tuplet ? { tuplet: hit.tuplet } : {}) };
}

export function buildE2Score(input: {
  title: string;
  tempo: number;
  bars: number;
  metres: BarMeterMap;
  parts: readonly E2PartSpec[];
  placements: readonly E2RealisedPlacement[];
  rests: readonly E2RestWindow[];
  assignments: readonly E2Assignment[];
  words?: Record<string, Record<number, string>>;
}): BuiltE2Score {
  const spans = barSpans(input.metres, input.bars);
  const assignment = new Map(input.assignments.map((item) => [item.placementId, item]));
  const writtenByPlacement = new Map<string, SpelledPitch>();
  const soundingByPlacement = new Map<string, SpelledRegister>();
  const byPart = new Map<string, Array<{ onset: ExactQuarter; duration: ExactQuarter; event: NoteEvent; voice: number }>>();

  for (const part of input.parts) byPart.set(part.partId, []);

  for (const placement of input.placements) {
    const target = assignment.get(placement.id);
    if (!target) throw new Error(`placement ${placement.id} has no part`);
    const part = input.parts.find((item) => item.partId === target.partId);
    if (!part) throw new Error(`unknown part ${target.partId}`);
    if (part.drums) throw new Error(`pitched placement cannot go to drums`);
    const sounding = placement.attack.pitch;
    if (part.hardRange && (sounding.midi < part.hardRange[0] || sounding.midi > part.hardRange[1])) {
      throw new Error(`${part.name} refuses sounding MIDI ${sounding.midi}`);
    }
    const written = writtenFor(sounding, part.transposition);
    const back = writtenToSounding(written, part.transposition);
    if (back.midi !== sounding.midi) throw new Error(`${part.name} transposition did not round-trip MIDI ${sounding.midi}`);
    writtenByPlacement.set(placement.id, written);
    soundingByPlacement.set(placement.id, sounding);
    const span = spans.find((item) => qCmp(placement.attack.onset, item.start) >= 0 && qCmp(placement.attack.onset, qAdd(item.start, item.length)) < 0);
    if (!span) throw new Error(`onset ${placement.attack.onset.n}/${placement.attack.onset.d} is outside the score`);
    const onsetInBar = qSub(placement.attack.onset, span.start);
    const end = qAdd(placement.attack.onset, placement.attack.duration);
    if (qCmp(end, qAdd(span.start, span.length)) > 0) throw new Error(`event ${placement.id} crosses a bar; split it before export`);
    const exact = exactFor(onsetInBar, placement.attack.duration, placement.id);
    byPart.get(part.partId)!.push({
      onset: placement.attack.onset,
      duration: placement.attack.duration,
      voice: target.voice,
      event: {
        kind: 'note',
        pitch: written.midi,
        startBeat: qToNumber(onsetInBar),
        duration: qToNumber(placement.attack.duration),
        voice: target.voice,
        spelling: { step: written.step, alter: written.alter },
        pianoExact: exact,
        velocity: 84,
      },
    });
  }

  const voicesByPart = new Map<string, Set<number>>();
  for (const item of input.assignments) {
    const set = voicesByPart.get(item.partId) ?? new Set<number>();
    set.add(item.voice);
    voicesByPart.set(item.partId, set);
  }

  const parts: PartModel[] = input.parts.map((part) => {
    const requiredVoices = [...(voicesByPart.get(part.partId) ?? new Set<number>([1]))];
    const measures = spans.map((span) => {
      const events = part.drums
        ? drumEvents(span.length)
        : fillVoice(
          (byPart.get(part.partId) ?? []).filter((row) => qCmp(row.onset, span.start) >= 0 && qCmp(row.onset, qAdd(span.start, span.length)) < 0),
          span.length,
          part,
          requiredVoices,
        );
      return {
        index: span.bar,
        events,
        measureBeatSpanQuarters: qToNumber(span.length),
      };
    });
    return {
      id: part.partId,
      name: part.name,
      instrumentIdentity: part.instrumentIdentity,
      midiProgram: part.midiProgram,
      clef: part.clef,
      measures,
      scoreInstrumentName: part.name,
      ...(part.catalogueInstrumentSound ? { catalogueInstrumentSound: part.catalogueInstrumentSound } : {}),
    };
  });

  const transpose: ScoreModel['exportPartTranspose'] = {};
  for (const part of input.parts) {
    if (part.drums) continue;
    if (part.transposition.chromatic !== 0 || part.transposition.diatonic !== 0 || part.transposition.octaveChange !== 0) {
      transpose[part.partId] = part.transposition;
    }
  }

  return {
    score: {
      title: input.title,
      tempo: input.tempo,
      timeSignature: { beats: input.metres[1]?.numerator ?? 4, beatType: input.metres[1]?.denominator ?? 4 },
      barMeterMap: input.metres,
      e2SoundingMidi: true,
      ...(Object.keys(transpose).length ? { exportPartTranspose: transpose } : {}),
      ...(input.words ? { partMeasureWordsMarkings: input.words } : {}),
      parts,
    },
    writtenByPlacement,
    soundingByPlacement,
  };
}

function fillVoice(
  rows: Array<{ onset: ExactQuarter; duration: ExactQuarter; event: NoteEvent; voice: number }>,
  barLength: ExactQuarter,
  part: E2PartSpec,
  requiredVoices: readonly number[],
): ScoreEvent[] {
  const voices = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = voices.get(row.voice) ?? [];
    list.push(row);
    voices.set(row.voice, list);
  }
  if (voices.size === 0) voices.set(1, []);
  for (const voice of requiredVoices) {
    if (!voices.has(voice)) voices.set(voice, []);
  }
  const events: ScoreEvent[] = [];
  for (const [voice, list] of [...voices.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...list].sort((a, b) => qCmp(a.onset, b.onset) || a.event.pitch - b.event.pitch);
    const stacked: typeof sorted = [];
    for (const row of sorted) {
      const previous = stacked[stacked.length - 1];
      if (
        previous
        && qEq(previous.onset, row.onset)
        && qEq(previous.duration, row.duration)
        && previous.voice === row.voice
      ) {
        if ((previous.event.pitches?.length ?? 1) + 1 > part.maxSimultaneous) {
          throw new Error(`${part.name} cannot hold another simultaneous note`);
        }
        const pitches = [...(previous.event.pitches ?? [previous.event.pitch]), row.event.pitch];
        const spellings = [
          ...(previous.event.stackSpellings ?? (previous.event.spelling ? [previous.event.spelling] : [])),
          ...(row.event.spelling ? [row.event.spelling] : []),
        ];
        previous.event = { ...previous.event, pitches, stackSpellings: spellings };
        continue;
      }
      if (previous && qCmp(row.onset, qAdd(previous.onset, previous.duration)) < 0) {
        throw new Error(`${part.name} overlaps itself`);
      }
      stacked.push({ ...row, event: { ...row.event } });
    }
    let cursor = q(0);
    for (const row of stacked) {
      const start = row.event.pianoExact!.onsetQ;
      if (qCmp(start, cursor) > 0) {
        const gap = qSub(start, cursor);
        let pieces: ExactQuarter[];
        try {
          pieces = splitDuration(gap);
        } catch (error) {
          throw new Error(`${part.name} voice ${voice} gap ${gap.n}/${gap.d} before ${row.event.pianoExact?.logicalEventId}: ${error instanceof Error ? error.message : error}`);
        }
        for (const piece of pieces) events.push(rest(cursor, piece, voice)), cursor = qAdd(cursor, piece);
      }
      if (qCmp(start, cursor) < 0) throw new Error(`${part.name} voice ${voice} went backwards`);
      events.push(row.event);
      cursor = qAdd(start, row.duration);
    }
    if (qCmp(cursor, barLength) < 0) {
      const gap = qSub(barLength, cursor);
      let pieces: ExactQuarter[];
      try {
        pieces = splitDuration(gap);
      } catch (error) {
        throw new Error(`${part.name} voice ${voice} tail ${gap.n}/${gap.d} after ${cursor.n}/${cursor.d} in bar ${barLength.n}/${barLength.d}: ${error instanceof Error ? error.message : error}`);
      }
      for (const piece of pieces) events.push(rest(cursor, piece, voice)), cursor = qAdd(cursor, piece);
    }
  }
  return events;
}

function splitDuration(duration: ExactQuarter): ExactQuarter[] {
  if (qEq(duration, q(0))) return [];
  const chunks = [q(4), q(3), q(2), q(3, 2), q(1), q(1, 2), q(1, 4), q(1, 8), q(1, 16), q(1, 3), q(1, 5)];
  for (const chunk of chunks) {
    if (qCmp(chunk, duration) > 0) continue;
    const rest = qSub(duration, chunk);
    if (qEq(rest, q(0))) return [chunk];
    try {
      return [chunk, ...splitDuration(rest)];
    } catch {
      continue;
    }
  }
  throw new Error(`cannot split ${duration.n}/${duration.d} into written durations`);
}

function drumEvents(barLength: ExactQuarter): ScoreEvent[] {
  if (!qEq(barLength, q(4))) return splitDuration(barLength).reduce<ScoreEvent[]>((events, piece) => {
    const cursor = events.reduce((sum, event) => qAdd(sum, event.kind === 'rest' && event.pianoExact ? event.pianoExact.durationQ : q(0)), q(0));
    events.push(rest(cursor, piece, 1));
    return events;
  }, []);
  const ride = (start: number): NoteEvent => ({
    kind: 'note',
    pitch: 51,
    startBeat: start,
    duration: 1,
    voice: 1,
    velocity: 70,
  });
  const gap = (start: number): RestEvent => ({ kind: 'rest', startBeat: start, duration: 1, voice: 1 });
  return [ride(0), gap(1), ride(2), gap(3)];
}

function rest(onset: ExactQuarter, duration: ExactQuarter, voice: number): RestEvent {
  if (qCmp(duration, q(0)) <= 0) throw new Error('empty rest');
  const ticks = integralTicks(duration, PIANO_V11_EXPORT_PPQ);
  if (ticks === null) throw new Error(`unsupported rest ${duration.n}/${duration.d}`);
  const written = writtenType(duration);
  return {
    kind: 'rest',
    startBeat: qToNumber(onset),
    duration: qToNumber(duration),
    voice,
    pianoExact: {
      onsetQ: onset,
      durationQ: duration,
      writtenType: written.type,
      dots: written.dots,
      logicalEventId: `rest-${voice}-${onset.n}-${onset.d}`,
    },
  };
}

export const CONCERT = CONCERT_TRANSPOSITION;

const UPRIGHT_E1 = 28;

export function partsFromRoster(
  slots: readonly { partId: string; instrumentId: string; name: string; drums?: boolean }[],
  resolve: (id: string) => { spec: { displayName: string; midiProgram: number; transposition: Transposition; soundingHardRange: readonly [number, number] | null; clefs: readonly string[]; instrumentSound?: string; maxSimultaneous: number } | null },
): E2PartSpec[] {
  return slots.map((slot) => {
    if (slot.drums) {
      return {
        partId: slot.partId,
        name: slot.name,
        instrumentIdentity: 'big_band_jazz_drums',
        midiProgram: 0,
        clef: 'bass' as const,
        transposition: CONCERT,
        hardRange: null,
        maxSimultaneous: 1,
        drums: true,
      };
    }
    if (slot.instrumentId === 'clean_electric_guitar') {
      return {
        partId: slot.partId,
        name: slot.name,
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 24,
        clef: 'treble' as const,
        transposition: CONCERT,
        hardRange: null,
        maxSimultaneous: 4,
        catalogueInstrumentSound: 'pluck.guitar.nylon-string',
      };
    }
    const resolved = resolve(slot.instrumentId);
    if (!resolved.spec?.soundingHardRange) throw new Error(`${slot.instrumentId} has no catalogue range`);
    const low = slot.instrumentId === 'double_bass' ? Math.max(UPRIGHT_E1, resolved.spec.soundingHardRange[0]) : resolved.spec.soundingHardRange[0];
    const clef = resolved.spec.clefs[0] === 'bass' || slot.instrumentId === 'cello' || slot.instrumentId === 'double_bass' ? 'bass' as const : 'treble' as const;
    return {
      partId: slot.partId,
      name: slot.name,
      instrumentIdentity: slot.instrumentId,
      midiProgram: resolved.spec.midiProgram,
      clef,
      transposition: resolved.spec.transposition,
      hardRange: [low, resolved.spec.soundingHardRange[1]],
      maxSimultaneous: slot.instrumentId === 'violin' || slot.instrumentId === 'viola' || slot.instrumentId === 'cello' ? 2 : 1,
      ...(resolved.spec.instrumentSound ? { catalogueInstrumentSound: resolved.spec.instrumentSound } : {}),
    };
  });
}
