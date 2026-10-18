/**
 * Place Piano V1.1 Stage A leaves on one timeline, then split at barlines.
 * Tuplet events are exact. They do not pass through quantiseToMeter or the 15-tick grid.
 */

import type { ExactQuarter, NoteEvent, PianoExactTiming, RestEvent, ScoreEvent } from '../score-model/scoreModelTypes';
import {
  PIANO_V11_EXPORT_PPQ,
  dyadicQuarter,
  exportResolution,
  floatsAgree,
  integralTicks,
  q,
  qAdd,
  qCmp,
  qEq,
  qMul,
  qSub,
  qToNumber,
  rejectNestedTuplet,
  spellStraight,
  spellTupletFragment,
  tupletRatio,
} from './pianoExactTiming';
import { findTimelineBar, type PianoTimelineBar } from './pianoMeterPlan';

export interface StraightSlot {
  start: number;
  duration: number;
  pitch: number;
  pitches?: number[];
  tie?: 'start' | 'stop' | 'continue';
  motifRef?: string;
  startQ?: ExactQuarter;
  durationQ?: ExactQuarter;
}

export interface PianoRhythmicWindow {
  id: string;
  start: ExactQuarter;
  hand: 'RH' | 'LH';
  ratio: '3:2' | '5:4';
  rests?: boolean[];
  pitches?: number[];
  against?: 'straight-eighths' | 'straight-sixteenths' | '3:2' | '5:4';
  againstPitches?: number[];
  againstRests?: boolean[];
  nested?: boolean;
  inner?: unknown;
}

export interface PianoFragmentRecord {
  bar: number;
  hand: 'RH' | 'LH';
  motifRef?: string;
  omitted: ExactQuarter;
  reason: 'bar-capacity' | 'replaced-by-tuplet';
}

interface Leaf {
  absStart: ExactQuarter;
  duration: ExactQuarter;
  midi: number | null;
  pitches?: number[];
  voice: number;
  hand: 'RH' | 'LH';
  motifRef?: string;
  logicalEventId: string;
  writtenType: string;
  dots: 0 | 1 | 2;
  tuplet?: PianoExactTiming['tuplet'];
  tie?: 'start' | 'stop' | 'continue';
  rest: boolean;
  beams?: PianoExactTiming['beams'];
}

function voiceFor(hand: 'RH' | 'LH'): number {
  return hand === 'RH' ? 1 : 3;
}

function leafEnd(leaf: Leaf): ExactQuarter {
  return qAdd(leaf.absStart, leaf.duration);
}

export function fragmentEventsToSpan(
  events: readonly { duration: number; midi: number | null; motifRef?: string }[],
  span: ExactQuarter,
): { placed: { start: ExactQuarter; duration: ExactQuarter; midi: number | null }[]; omitted: ExactQuarter } {
  let cursor = q(0, 1);
  let omitted = q(0, 1);
  const placed: { start: ExactQuarter; duration: ExactQuarter; midi: number | null }[] = [];
  for (const event of events) {
    const duration = dyadicQuarter(event.duration);
    if (qCmp(cursor, span) >= 0) {
      omitted = qAdd(omitted, duration);
      continue;
    }
    const room = qSub(span, cursor);
    const take = qCmp(duration, room) > 0 ? room : duration;
    if (qCmp(duration, take) > 0) omitted = qAdd(omitted, qSub(duration, take));
    if (qCmp(take, q(0, 1)) > 0) {
      placed.push({ start: cursor, duration: take, midi: event.midi });
      cursor = qAdd(cursor, take);
    }
  }
  return { placed, omitted };
}

export function fragmentSlotsToSpan(
  slots: readonly StraightSlot[],
  span: ExactQuarter,
): { kept: (StraightSlot & { startQ: ExactQuarter; durationQ: ExactQuarter })[]; omitted: ExactQuarter } {
  let omitted = q(0, 1);
  const kept: (StraightSlot & { startQ: ExactQuarter; durationQ: ExactQuarter })[] = [];
  for (const slot of [...slots].sort((a, b) => a.start - b.start)) {
    const start = dyadicQuarter(slot.start);
    const duration = dyadicQuarter(slot.duration);
    const end = qAdd(start, duration);
    if (qCmp(start, span) >= 0) {
      omitted = qAdd(omitted, duration);
      continue;
    }
    if (qCmp(end, span) <= 0) {
      kept.push({ ...slot, startQ: start, durationQ: duration });
      continue;
    }
    const take = qSub(span, start);
    omitted = qAdd(omitted, qSub(duration, take));
    kept.push({ ...slot, duration: qToNumber(take), startQ: start, durationQ: take });
  }
  return { kept, omitted };
}

/**
 * A tie is a join, not a licence to add sound.
 * If the written duration stops before the next tied onset, both tie marks come off.
 * The notes keep their durations. The gap stays silent.
 */
export function releaseUnjoinedTies(
  timeline: readonly PianoTimelineBar[],
  byBar: ReadonlyMap<number, readonly StraightSlot[]>,
): void {
  interface Item {
    slot: StraightSlot;
    absStart: ExactQuarter;
    absEnd: ExactQuarter;
    key: string;
  }
  const items: Item[] = [];
  for (const bar of timeline) {
    for (const slot of byBar.get(bar.bar) ?? []) {
      const start = slot.startQ ?? dyadicQuarter(slot.start);
      const duration = slot.durationQ ?? dyadicQuarter(slot.duration);
      const pitches = [...new Set([slot.pitch, ...(slot.pitches ?? [])])].sort((a, b) => a - b);
      items.push({
        slot,
        absStart: qAdd(bar.start, start),
        absEnd: qAdd(qAdd(bar.start, start), duration),
        key: pitches.join(','),
      });
    }
  }
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const list = groups.get(item.key) ?? [];
    list.push(item);
    groups.set(item.key, list);
  }
  const clear = new Set<StraightSlot>();
  for (const list of groups.values()) {
    list.sort((a, b) => qCmp(a.absStart, b.absStart));
    for (let index = 0; index < list.length; index += 1) {
      const item = list[index]!;
      const tie = item.slot.tie;
      if (tie === 'start' || tie === 'continue') {
        const next = list[index + 1];
        const joined = Boolean(
          next
          && qEq(item.absEnd, next.absStart)
          && (next.slot.tie === 'stop' || next.slot.tie === 'continue'),
        );
        if (!joined) clear.add(item.slot);
      }
      if (tie === 'stop' || tie === 'continue') {
        const prev = list[index - 1];
        const joined = Boolean(
          prev
          && qEq(prev.absEnd, item.absStart)
          && (prev.slot.tie === 'start' || prev.slot.tie === 'continue'),
        );
        if (!joined) clear.add(item.slot);
      }
    }
  }
  for (const slot of clear) delete slot.tie;
}

function expandStraight(leaf: Leaf): Leaf[] {
  const parts = spellStraight(leaf.duration);
  let cursor = leaf.absStart;
  return parts.map((part, index) => {
    const next: Leaf = {
      ...leaf,
      absStart: cursor,
      duration: part.length,
      writtenType: part.type,
      dots: part.dots,
      logicalEventId: leaf.logicalEventId,
      tie: parts.length === 1
        ? leaf.tie
        : index === 0
          ? (leaf.tie === 'stop' || leaf.tie === 'continue' ? 'continue' : 'start')
          : index === parts.length - 1
            ? (leaf.tie === 'start' || leaf.tie === 'continue' ? 'continue' : 'stop')
            : 'continue',
    };
    cursor = qAdd(cursor, part.length);
    return next;
  });
}

function retie(parts: Leaf[], logicalEventId: string): Leaf[] {
  if (parts.length === 1) return parts;
  return parts.map((part, index) => ({
    ...part,
    logicalEventId,
    tie: index === 0 ? 'start' : index === parts.length - 1 ? 'stop' : 'continue',
  }));
}

function splitAtBars(leaf: Leaf, timeline: readonly PianoTimelineBar[]): Leaf[] {
  const pieces: Leaf[] = [];
  let cursor = leaf.absStart;
  let remain = leaf.duration;
  while (qCmp(remain, q(0, 1)) > 0) {
    const bar = findTimelineBar(timeline, cursor);
    if (!bar) throw new Error(`leaf at ${cursor.n}/${cursor.d} falls outside the timeline`);
    const room = qSub(qAdd(bar.start, bar.span), cursor);
    const take = qCmp(remain, room) > 0 ? room : remain;
    const piece: Leaf = { ...leaf, absStart: cursor, duration: take, tie: undefined, beams: undefined };
    if (piece.tuplet) {
      const spelled = spellTupletFragment(take, piece.tuplet.actualNotes, piece.tuplet.normalNotes);
      pieces.push({ ...piece, writtenType: spelled.type, dots: spelled.dots });
    } else {
      pieces.push(...expandStraight(piece));
    }
    cursor = qAdd(cursor, take);
    remain = qSub(remain, take);
  }
  return retie(pieces, leaf.logicalEventId);
}

function subtractInterval(
  leaves: Leaf[],
  start: ExactQuarter,
  end: ExactQuarter,
  hand: 'RH' | 'LH',
  timeline: readonly PianoTimelineBar[],
  fragments: PianoFragmentRecord[],
): Leaf[] {
  const out: Leaf[] = [];
  for (const leaf of leaves) {
    if (leaf.hand !== hand) {
      out.push(leaf);
      continue;
    }
    const a = leaf.absStart;
    const b = leafEnd(leaf);
    if (qCmp(b, start) <= 0 || qCmp(a, end) >= 0) {
      out.push(leaf);
      continue;
    }
    const cutStart = qCmp(a, start) > 0 ? a : start;
    const cutEnd = qCmp(b, end) < 0 ? b : end;
    const bar = findTimelineBar(timeline, cutStart);
    fragments.push({
      bar: bar?.bar ?? 0,
      hand,
      motifRef: leaf.motifRef,
      omitted: qSub(cutEnd, cutStart),
      reason: 'replaced-by-tuplet',
    });
    if (qCmp(a, start) < 0) {
      const kept: Leaf = { ...leaf, duration: qSub(start, a), tie: undefined, beams: undefined };
      out.push(...(kept.tuplet ? [kept] : expandStraight(kept)));
    }
    if (qCmp(b, end) > 0) {
      const kept: Leaf = {
        ...leaf,
        absStart: end,
        duration: qSub(b, end),
        logicalEventId: `${leaf.logicalEventId}-tail`,
        tie: undefined,
        beams: undefined,
      };
      out.push(...(kept.tuplet ? [kept] : expandStraight(kept)));
    }
  }
  return out;
}

function windowLeaves(window: PianoRhythmicWindow, hand: 'RH' | 'LH', ratio: '3:2' | '5:4' | 'straight-eighths' | 'straight-sixteenths', pitches: number[] | undefined, rests: boolean[] | undefined): Leaf[] {
  if (ratio === 'straight-eighths' || ratio === 'straight-sixteenths') {
    const count = ratio === 'straight-eighths' ? 2 : 4;
    const duration = ratio === 'straight-eighths' ? q(1, 2) : q(1, 4);
    const written = ratio === 'straight-eighths' ? 'eighth' : '16th';
    const leaves: Leaf[] = [];
    for (let index = 0; index < count; index += 1) {
      const rest = rests?.[index] === true;
      leaves.push({
        absStart: qAdd(window.start, qMul(duration, q(index, 1))),
        duration,
        midi: rest ? null : (pitches?.[index] ?? pitches?.[0] ?? null),
        voice: voiceFor(hand),
        hand,
        motifRef: `${window.id}.straight`,
        logicalEventId: `${window.id}:${hand}:straight:${index}`,
        writtenType: written,
        dots: 0,
        rest,
      });
    }
    return leaves;
  }
  const spec = tupletRatio(ratio);
  const leaves: Leaf[] = [];
  for (let index = 0; index < spec.count; index += 1) {
    const rest = rests?.[index] === true;
    leaves.push({
      absStart: qAdd(window.start, qMul(spec.sounding, q(index, 1))),
      duration: spec.sounding,
      midi: rest ? null : (pitches?.[index] ?? pitches?.[0] ?? null),
      voice: voiceFor(hand),
      hand,
      motifRef: `${window.id}.${ratio}`,
      logicalEventId: `${window.id}:${hand}:${ratio}:${index}`,
      writtenType: spec.writtenType,
      dots: 0,
      rest,
      tuplet: {
        actualNotes: spec.actualNotes,
        normalNotes: spec.normalNotes,
        normalType: spec.normalType,
        groupId: `${window.id}:${hand}:${ratio}`,
        bracket: 'continue',
      },
    });
  }
  return leaves;
}

function assignBrackets(leaves: Leaf[]): void {
  const groups = new Map<string, Leaf[]>();
  for (const leaf of leaves) {
    if (!leaf.tuplet) continue;
    const list = groups.get(leaf.tuplet.groupId) ?? [];
    list.push(leaf);
    groups.set(leaf.tuplet.groupId, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => qCmp(a.absStart, b.absStart));
    list.forEach((leaf, index) => {
      if (!leaf.tuplet) return;
      const bracket = list.length === 1 ? 'start' : index === 0 ? 'start' : index === list.length - 1 ? 'stop' : 'continue';
      leaf.tuplet = { ...leaf.tuplet, bracket };
    });
  }
}

function assignBeams(leaves: Leaf[], timeline: readonly PianoTimelineBar[]): void {
  const groups = new Map<string, Leaf[]>();
  for (const leaf of leaves) {
    if (!leaf.tuplet) continue;
    const bar = findTimelineBar(timeline, leaf.absStart);
    if (!bar) continue;
    const key = `${leaf.tuplet.groupId}|${bar.bar}`;
    const list = groups.get(key) ?? [];
    list.push(leaf);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => qCmp(a.absStart, b.absStart));
    list.forEach((leaf, index) => {
      const value = index === 0 ? 'begin' : index === list.length - 1 ? 'end' : 'continue';
      leaf.beams = [{ number: 1, value }];
    });
  }
}

function fillRests(leaves: Leaf[], timeline: readonly PianoTimelineBar[]): Leaf[] {
  const out: Leaf[] = [];
  for (const bar of timeline) {
    for (const hand of ['RH', 'LH'] as const) {
      const mine = leaves
        .filter((leaf) => leaf.hand === hand && findTimelineBar(timeline, leaf.absStart)?.bar === bar.bar)
        .sort((a, b) => qCmp(a.absStart, b.absStart));
      let cursor = bar.start;
      const barEnd = qAdd(bar.start, bar.span);
      const pushRest = (start: ExactQuarter, duration: ExactQuarter, index: number) => {
        const restLeaf: Leaf = {
          absStart: start,
          duration,
          midi: null,
          voice: voiceFor(hand),
          hand,
          logicalEventId: `rest-${bar.bar}-${hand}-${index}`,
          writtenType: 'quarter',
          dots: 0,
          rest: true,
        };
        out.push(...expandStraight(restLeaf).map((piece, pieceIndex) => ({
          ...piece,
          logicalEventId: `rest-${bar.bar}-${hand}-${index}-${pieceIndex}`,
          tie: undefined,
        })));
      };
      let restIndex = 0;
      for (const leaf of mine) {
        if (qCmp(leaf.absStart, cursor) < 0) {
          throw new Error(`${hand} overlap in bar ${bar.bar}`);
        }
        if (qCmp(leaf.absStart, cursor) > 0) {
          pushRest(cursor, qSub(leaf.absStart, cursor), restIndex);
          restIndex += 1;
        }
        out.push(leaf);
        cursor = leafEnd(leaf);
      }
      if (qCmp(cursor, barEnd) < 0) pushRest(cursor, qSub(barEnd, cursor), restIndex);
      if (!qEq(cursor, barEnd) && qCmp(cursor, barEnd) > 0) {
        throw new Error(`${hand} exceeds bar ${bar.bar}`);
      }
    }
  }
  return out;
}

function slotsToLeaves(slots: readonly (StraightSlot & { startQ?: ExactQuarter; durationQ?: ExactQuarter })[], bar: PianoTimelineBar, hand: 'RH' | 'LH'): Leaf[] {
  const leaves: Leaf[] = [];
  slots.forEach((slot, index) => {
    const start = slot.startQ ?? dyadicQuarter(slot.start);
    const duration = slot.durationQ ?? dyadicQuarter(slot.duration);
    const leaf: Leaf = {
      absStart: qAdd(bar.start, start),
      duration,
      midi: slot.pitch,
      pitches: slot.pitches,
      voice: voiceFor(hand),
      hand,
      motifRef: slot.motifRef,
      logicalEventId: `bar${bar.bar}-${hand}-${index}`,
      writtenType: 'quarter',
      dots: 0,
      rest: false,
      tie: slot.tie,
    };
    leaves.push(...expandStraight(leaf));
  });
  return leaves;
}

export function realiseStageA(input: {
  timeline: readonly PianoTimelineBar[];
  rh: ReadonlyMap<number, readonly StraightSlot[]>;
  lh: ReadonlyMap<number, readonly StraightSlot[]>;
  windows?: readonly PianoRhythmicWindow[];
}): { events: Map<number, ScoreEvent[]>; fragments: PianoFragmentRecord[]; errors: string[] } {
  const errors: string[] = [];
  const fragments: PianoFragmentRecord[] = [];
  const windows = input.windows ?? [];
  for (const window of windows) {
    const nested = rejectNestedTuplet(window);
    if (nested) errors.push(nested);
    if (window.ratio !== '3:2' && window.ratio !== '5:4') errors.push(`unsupported tuplet ${String(window.ratio)}`);
    const spec = window.ratio === '3:2' || window.ratio === '5:4' ? tupletRatio(window.ratio) : null;
    if (window.rests && spec && window.rests.length !== spec.count) {
      errors.push(`window ${window.id} rest mask must contain ${spec?.count ?? 0} flags`);
    }
    const end = qAdd(window.start, q(1, 1));
    const last = input.timeline[input.timeline.length - 1];
    if (!last || qCmp(window.start, q(0, 1)) < 0 || qCmp(end, qAdd(last.start, last.span)) > 0) {
      errors.push(`window ${window.id} does not fit the timeline`);
    }
    if (!findTimelineBar(input.timeline, window.start)) errors.push(`window ${window.id} does not start inside a bar`);
  }
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i]!;
      const b = windows[j]!;
      if (a.hand !== b.hand && a.against === undefined && b.against === undefined) continue;
      const aHands = new Set<string>([a.hand, a.against ? (a.hand === 'RH' ? 'LH' : 'RH') : '']);
      const bHands = new Set<string>([b.hand, b.against ? (b.hand === 'RH' ? 'LH' : 'RH') : '']);
      const share = [...aHands].some((hand) => hand && bHands.has(hand));
      if (!share) continue;
      const overlap = qCmp(qAdd(a.start, q(1, 1)), b.start) > 0 && qCmp(qAdd(b.start, q(1, 1)), a.start) > 0;
      if (overlap) errors.push(`windows ${a.id} and ${b.id} overlap on one hand`);
    }
  }
  if (errors.length > 0) return { events: new Map(), fragments, errors };

  let leaves: Leaf[] = [];
  for (const bar of input.timeline) {
    leaves.push(...slotsToLeaves(input.rh.get(bar.bar) ?? [], bar, 'RH'));
    leaves.push(...slotsToLeaves(input.lh.get(bar.bar) ?? [], bar, 'LH'));
  }
  for (const window of windows) {
    const other = window.hand === 'RH' ? 'LH' : 'RH';
    leaves = subtractInterval(leaves, window.start, qAdd(window.start, q(1, 1)), window.hand, input.timeline, fragments);
    if (window.against) {
      leaves = subtractInterval(leaves, window.start, qAdd(window.start, q(1, 1)), other, input.timeline, fragments);
    }
    leaves.push(...windowLeaves(window, window.hand, window.ratio, window.pitches, window.rests));
    if (window.against) {
      leaves.push(...windowLeaves(window, other, window.against, window.againstPitches, window.againstRests));
    }
  }
  leaves = leaves.flatMap((leaf) => {
    const bar = findTimelineBar(input.timeline, leaf.absStart);
    const endBar = findTimelineBar(input.timeline, qSub(leafEnd(leaf), q(1, 1000000)));
    if (bar && endBar && bar.bar === endBar.bar && qCmp(leafEnd(leaf), qAdd(bar.start, bar.span)) <= 0) {
      return leaf.tuplet ? [leaf] : [leaf];
    }
    return splitAtBars(leaf, input.timeline);
  });
  assignBrackets(leaves);
  assignBeams(leaves, input.timeline);
  for (const leaf of leaves) {
    if (!leaf.rest && leaf.midi === null) errors.push(`window leaf ${leaf.logicalEventId} has no pitch`);
  }
  if (errors.length > 0) return { events: new Map(), fragments, errors };
  leaves = fillRests(leaves, input.timeline);

  const rationals: ExactQuarter[] = [];
  for (const bar of input.timeline) rationals.push(bar.span, bar.start);
  for (const leaf of leaves) rationals.push(leaf.absStart, leaf.duration);
  const resolution = exportResolution(rationals);
  if ('error' in resolution) return { events: new Map(), fragments, errors: [resolution.error] };

  const events = new Map<number, ScoreEvent[]>();
  for (const bar of input.timeline) {
    const barEvents: ScoreEvent[] = [];
    for (const leaf of leaves) {
      const host = findTimelineBar(input.timeline, leaf.absStart);
      if (host?.bar !== bar.bar) continue;
      const onsetQ = qSub(leaf.absStart, bar.start);
      const exact: PianoExactTiming = {
        onsetQ,
        durationQ: leaf.duration,
        writtenType: leaf.writtenType,
        dots: leaf.dots,
        logicalEventId: leaf.logicalEventId,
        ...(leaf.tuplet ? { tuplet: leaf.tuplet } : {}),
        ...(leaf.beams ? { beams: leaf.beams } : {}),
      };
      const startBeat = qToNumber(onsetQ);
      const duration = qToNumber(leaf.duration);
      if (!floatsAgree(startBeat, onsetQ) || !floatsAgree(duration, leaf.duration)) {
        throw new Error(`float timing drifted from ${onsetQ.n}/${onsetQ.d}`);
      }
      if (integralTicks(onsetQ, PIANO_V11_EXPORT_PPQ) === null || integralTicks(leaf.duration, PIANO_V11_EXPORT_PPQ) === null) {
        throw new Error(`leaf ${leaf.logicalEventId} is not integral at PPQ 480`);
      }
      if (leaf.rest || leaf.midi === null) {
        const rest: RestEvent = { kind: 'rest', startBeat, duration, voice: leaf.voice, pianoExact: exact };
        barEvents.push(rest);
      } else {
        const note: NoteEvent = {
          kind: 'note',
          pitch: leaf.midi,
          startBeat,
          duration,
          voice: leaf.voice,
          pianoExact: exact,
          ...(leaf.pitches ? { pitches: leaf.pitches } : {}),
          ...(leaf.motifRef ? { motifRef: leaf.motifRef } : {}),
          ...(leaf.tie ? { notation: { tie: leaf.tie } } : {}),
        };
        barEvents.push(note);
      }
    }
    events.set(bar.bar, barEvents);
  }
  return { events, fragments, errors };
}

export function crossBarTripletFixture(timeline: readonly PianoTimelineBar[]): PianoRhythmicWindow {
  const bar = timeline.find((item) => item.numerator === 7 && item.denominator === 8);
  if (!bar) throw new Error('7/8 bar missing');
  return {
    id: 'cross-3-2',
    start: qAdd(bar.start, q(3, 1)),
    hand: 'RH',
    ratio: '3:2',
    pitches: [72, 74, 76],
  };
}

export function crossBarQuintupletFixture(timeline: readonly PianoTimelineBar[]): PianoRhythmicWindow {
  const bar = timeline.find((item) => item.numerator === 7 && item.denominator === 8);
  if (!bar) throw new Error('7/8 bar missing');
  return {
    id: 'cross-5-4',
    start: qAdd(bar.start, q(13, 4)),
    hand: 'LH',
    ratio: '5:4',
    pitches: [48, 50, 52, 53, 55],
  };
}
