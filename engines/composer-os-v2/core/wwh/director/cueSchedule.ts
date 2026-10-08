/**
 * V7.3B cue timing.
 * Section-relative quarter positions. Preview traces fix open windows for export.
 * A trace is a scheduling choice, not evidence that anyone listened.
 */

import type { WwhAtom } from '../wwhPerformanceTypes';
import { barQuarters, fillQuarters, quartersToDivisions, wwhAdd, wwhCmp, wwhReduce, wwhSub, type WwhRational } from '../wwhTiming';
import type { Cue, CueTrace, Leadership, PerformancePlan, PlanSection, Player, PlayerWindow, Point, Rat } from './performancePlanTypes';
import { expandSpan, type SourceIndex } from './sourceIndexAdapter';

const ZERO: Point = { bar: 0, offsetQ: { n: 0, d: 1 } };

export interface ResolvedCue {
  cue: Cue;
  at: Point;
  atQ: WwhRational;
}

export interface WindowSchedule {
  plannedBarCount: number;
  barCount: number;
  barQ: WwhRational;
  durationQ: WwhRational;
  cues: ResolvedCue[];
  guitar: PlayerWindow & { entryQ: WwhRational; exitQ: WwhRational };
  bass: PlayerWindow & { entryQ: WwhRational; exitQ: WwhRational };
  leadership: Leadership | null;
}

export function previewCueTrace(plan: PerformancePlan): CueTrace {
  const decisions: CueTrace['decisions'] = [];
  for (const section of plan.sections) {
    if (section.length.kind === 'cue_window') {
      decisions.push({ kind: 'cycles', sectionId: section.id, cycles: section.length.previewCycles });
    }
    for (const cue of section.cues) {
      if (cue.trigger.kind === 'performer_signal') {
        decisions.push({ kind: 'signal', sectionId: section.id, cueId: cue.id, at: cue.trigger.earliest });
      }
    }
  }
  return { planId: plan.id, decisions };
}

export function pulseFor(beats: number, beatType: number): WwhRational {
  if (beatType === 8 && beats % 3 === 0) return { n: 3, d: 2 };
  if (beatType === 8) return { n: 1, d: 2 };
  if (beatType === 2) return { n: 2, d: 1 };
  if (beatType === 1) return { n: 4, d: 1 };
  return { n: 1, d: 1 };
}

export function qFromPoint(point: Point, barQ: WwhRational): WwhRational {
  return wwhAdd(wwhReduce(point.bar * barQ.n, barQ.d), point.offsetQ);
}

export function pointFromQ(total: WwhRational, barQ: WwhRational): Point {
  const split = floorDiv(total, barQ);
  return { bar: split.bar, offsetQ: split.offset };
}

export function addPulse(point: Point, pulse: WwhRational, barQ: WwhRational): Point {
  return pointFromQ(wwhAdd(qFromPoint(point, barQ), pulse), barQ);
}

export function plannedBarCount(section: PlanSection, index: SourceIndex): number {
  if (section.length.kind === 'fixed') return section.length.bars;
  if (section.length.kind === 'source') return expandSpan(index, section.length.span).length;
  return section.length.cycleBars * section.length.previewCycles;
}

export function sectionBarQ(section: PlanSection, index: SourceIndex): WwhRational | null {
  if (section.meter.kind === 'explicit') return barQuarters(section.meter.beats, section.meter.beatType);
  if (section.meter.kind === 'source' || section.meter.kind === 'repeat_template') {
    const measures = expandSpan(index, section.meter.span);
    const first = measures[0];
    if (!first) return null;
    return barQuarters(first.guitar.beats, first.guitar.beatType);
  }
  return null;
}

function floorDiv(total: WwhRational, barQ: WwhRational): { bar: number; offset: WwhRational } {
  if (wwhCmp(total, { n: 0, d: 1 }) <= 0) return { bar: 0, offset: { n: 0, d: 1 } };
  const num = total.n * barQ.d;
  const den = total.d * barQ.n;
  const bar = Math.floor(num / den);
  const consumed = wwhReduce(bar * barQ.n, barQ.d);
  return { bar, offset: wwhSub(total, consumed) };
}

function barsToCover(endQ: WwhRational, barQ: WwhRational): number {
  if (wwhCmp(endQ, { n: 0, d: 1 }) <= 0) return 0;
  const split = floorDiv(endQ, barQ);
  if (wwhCmp(split.offset, { n: 0, d: 1 }) === 0) return split.bar;
  return split.bar + 1;
}

function delayOf(cue: Cue): WwhRational {
  return cue.responseDelay?.previewQ ?? { n: 0, d: 1 };
}

function cueGraphCycle(cues: Cue[]): string | null {
  const byId = new Map(cues.map((cue) => [cue.id, cue]));
  const color = new Map<string, number>();
  const visit = (id: string): boolean => {
    const state = color.get(id) ?? 0;
    if (state === 1) return true;
    if (state === 2) return false;
    const cue = byId.get(id);
    if (!cue) return false;
    color.set(id, 1);
    for (const next of cue.prerequisites ?? []) {
      if (visit(next)) return true;
    }
    if (cue.trigger.kind === 'performer_signal' && cue.trigger.afterCueId && visit(cue.trigger.afterCueId)) return true;
    color.set(id, 2);
    return false;
  };
  for (const cue of cues) {
    if (visit(cue.id)) return cue.id;
  }
  return null;
}

export function resolveWindow(section: PlanSection, trace: CueTrace, index: SourceIndex): { ok: true; schedule: WindowSchedule } | { ok: false; message: string } {
  if (section.length.kind !== 'cue_window') return { ok: false, message: `${section.id} is not a cue window` };
  const barQ = sectionBarQ(section, index);
  if (!barQ) return { ok: false, message: `${section.id} has no metre` };
  const cycleDecision = trace.decisions.find((item) => item.kind === 'cycles' && item.sectionId === section.id);
  const cycles = cycleDecision && cycleDecision.kind === 'cycles' ? cycleDecision.cycles : section.length.previewCycles;
  if (!Number.isInteger(cycles) || cycles < section.length.minCycles || cycles > section.length.maxCycles) {
    return { ok: false, message: `${section.id} preview cycles ${cycles} are outside ${section.length.minCycles}..${section.length.maxCycles}` };
  }
  const plannedBarCount = section.length.cycleBars * cycles;
  const plannedQ = wwhReduce(plannedBarCount * barQ.n, barQ.d);
  const cycle = cueGraphCycle(section.cues);
  if (cycle) return { ok: false, message: `cue ${cycle} is in a cycle` };
  const byId = new Map(section.cues.map((cue) => [cue.id, cue]));
  if (!byId.has(section.length.releaseCueId)) return { ok: false, message: `${section.id} release cue is missing` };
  const resolved: ResolvedCue[] = [];
  for (const cue of section.cues) {
    for (const pre of cue.prerequisites ?? []) {
      if (!byId.has(pre)) return { ok: false, message: `cue ${cue.id} prerequisite ${pre} is missing` };
    }
    const delay = cue.responseDelay;
    if (delay && (wwhCmp(delay.minQ, delay.previewQ) > 0 || wwhCmp(delay.previewQ, delay.maxQ) > 0 || wwhCmp(delay.minQ, { n: 0, d: 1 }) < 0)) {
      return { ok: false, message: `cue ${cue.id} response delay is outside its bounds` };
    }
    let at: Point;
    if (cue.trigger.kind === 'at') at = cue.trigger.point;
    else {
      const signal = trace.decisions.find((item) => item.kind === 'signal' && item.sectionId === section.id && item.cueId === cue.id);
      at = signal && signal.kind === 'signal' ? signal.at : cue.trigger.earliest;
      const early = qFromPoint(cue.trigger.earliest, barQ);
      const late = qFromPoint(cue.trigger.latest, barQ);
      const atQ = qFromPoint(at, barQ);
      if (wwhCmp(atQ, early) < 0 || wwhCmp(atQ, late) > 0) {
        return { ok: false, message: `cue ${cue.id} preview falls outside its listening window` };
      }
      if (wwhCmp(late, early) < 0) return { ok: false, message: `cue ${cue.id} latest precedes earliest` };
    }
    const atQ = qFromPoint(at, barQ);
    if (wwhCmp(atQ, { n: 0, d: 1 }) < 0 || wwhCmp(atQ, plannedQ) > 0) {
      return { ok: false, message: `cue ${cue.id} is outside ${section.id}` };
    }
    if (cue.interruption?.behaviour === 'overlap' && (!cue.interruption.overlapQ || wwhCmp(cue.interruption.overlapQ, { n: 0, d: 1 }) <= 0)) {
      return { ok: false, message: `cue ${cue.id} overlap needs a positive length` };
    }
    resolved.push({ cue, at, atQ });
  }
  const cueById = new Map(resolved.map((item) => [item.cue.id, item]));
  const boundary = (
    ref: PlanSection['voices']['guitar']['entry'] | PlanSection['voices']['guitar']['exit'],
    fallback: WwhRational
  ): { q: WwhRational; cause: string | null } | { error: string } => {
    if (ref.kind === 'section_end') return { q: fallback, cause: null };
    if (ref.kind === 'at') return { q: qFromPoint(ref.point, barQ), cause: null };
    const cue = cueById.get(ref.cueId);
    if (!cue) return { error: `missing cue ${ref.cueId}` };
    return { q: wwhAdd(cue.atQ, delayOf(cue.cue)), cause: cue.cue.id };
  };
  let stopQ: WwhRational | null = null;
  for (const item of resolved) {
    if (item.cue.interruption?.behaviour === 'stop') {
      const end = wwhAdd(item.atQ, delayOf(item.cue));
      if (!stopQ || wwhCmp(end, stopQ) < 0) stopQ = end;
    }
  }
  const durationQ = stopQ && wwhCmp(stopQ, plannedQ) < 0 ? stopQ : plannedQ;
  if (wwhCmp(durationQ, { n: 0, d: 1 }) <= 0) return { ok: false, message: `${section.id} duration is empty` };
  const barCount = barsToCover(durationQ, barQ);
  if (barCount <= 0) return { ok: false, message: `${section.id} covers no bars` };
  const players: Record<Player, WindowSchedule['guitar']> = {
    guitar: { entry: ZERO, exit: ZERO, causeCueId: null, exitCueId: null, entryQ: { n: 0, d: 1 }, exitQ: { n: 0, d: 1 } },
    bass: { entry: ZERO, exit: ZERO, causeCueId: null, exitCueId: null, entryQ: { n: 0, d: 1 }, exitQ: { n: 0, d: 1 } },
  };
  for (const player of ['guitar', 'bass'] as const) {
    const voice = section.voices[player];
    const entry = boundary(voice.entry, { n: 0, d: 1 });
    const exit = boundary(voice.exit, durationQ);
    if ('error' in entry) return { ok: false, message: entry.error };
    if ('error' in exit) return { ok: false, message: exit.error };
    if (wwhCmp(entry.q, { n: 0, d: 1 }) < 0 || wwhCmp(entry.q, durationQ) > 0) {
      return { ok: false, message: `${player} entry leaves ${section.id}` };
    }
    let exitQ = wwhCmp(exit.q, durationQ) > 0 ? durationQ : exit.q;
    if (wwhCmp(exitQ, entry.q) < 0) return { ok: false, message: `${player} exit precedes entry in ${section.id}` };
    players[player] = {
      entry: pointFromQ(entry.q, barQ),
      exit: pointFromQ(exitQ, barQ),
      causeCueId: entry.cause,
      exitCueId: exit.cause,
      entryQ: entry.q,
      exitQ,
    };
  }
  if (section.primarySourceSpan) return { ok: false, message: `${section.id} keeps source notes and also moves a cue` };
  return {
    ok: true,
    schedule: {
      plannedBarCount,
      barCount,
      barQ,
      durationQ,
      cues: resolved,
      guitar: players.guitar,
      bass: players.bass,
      leadership: section.leadership ?? null,
    },
  };
}

export function regionAtoms(
  barStart: WwhRational,
  barEnd: WwhRational,
  entryQ: WwhRational,
  exitQ: WwhRational,
  divisions: number,
  sounding: boolean
): { atoms: WwhAtom[]; notation: 'rest' | 'open' | 'rest_then_open' } | null {
  const slices: Array<{ q: WwhRational; lyric: 'tacet' | 'open' }> = [];
  const push = (from: WwhRational, to: WwhRational, lyric: 'tacet' | 'open') => {
    if (wwhCmp(to, from) <= 0) return;
    slices.push({ q: wwhSub(to, from), lyric });
  };
  const playFrom = wwhCmp(entryQ, barStart) > 0 ? entryQ : barStart;
  const playTo = wwhCmp(exitQ, barEnd) < 0 ? exitQ : barEnd;
  if (!sounding || wwhCmp(playTo, playFrom) <= 0) {
    push(barStart, barEnd, 'tacet');
  } else {
    push(barStart, playFrom, 'tacet');
    push(playFrom, playTo, 'open');
    push(playTo, barEnd, 'tacet');
  }
  const atoms: WwhAtom[] = [];
  for (const slice of slices) {
    const filled = fillQuarters(slice.q, divisions, true);
    if (!filled) return null;
    if (filled[0]) filled[0].lyric = slice.lyric;
    atoms.push(...filled);
  }
  const kinds = new Set(slices.map((slice) => slice.lyric));
  const notation = kinds.has('open') && kinds.has('tacet') ? 'rest_then_open' : kinds.has('open') ? 'open' : 'rest';
  const ticks = atoms.reduce((sum, atom) => sum + atom.divisions, 0);
  const expected = quartersToDivisions(wwhSub(barEnd, barStart), divisions);
  if (expected === null || ticks !== expected) return null;
  return { atoms, notation };
}
