/**
 * Turns declared BHL intentions into guitar notes.
 * The evidence reader is not asked to trust these labels.
 * A limitation is returned when the bass, metre, or harmonic field blocks the intention.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import type { BhlContinuationStrategy, BhlGuitarEvent, BhlPhrasePlan, BhlPhraseRegion } from './bhlPhrase';
import type { BhlBassBar } from './bhlRhythm';

export interface BhlIntentionLimit {
  regionId: string;
  intention: string;
  reason: string;
}

export interface BhlFieldAt {
  (region: BhlPhraseRegion, bar: BhlBassBar): readonly number[];
}

export interface BhlFieldNote {
  bar: number;
  onsetQuarters: number;
  pitchClass: number;
  status: 'in-field' | 'outside-permitted';
}

const STEP = 0.5;

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function hash(seed: number, bar: number, index: number): number {
  let x = (seed + bar * 17 + index * 13) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

function midiNear(pitchClass: number, low: number, high: number, previous: number | null): number {
  const want = mod12(pitchClass);
  const candidates: number[] = [];
  for (let midi = low; midi <= high; midi++) if (mod12(midi) === want) candidates.push(midi);
  if (!candidates.length) {
    for (let midi = 52; midi <= 84; midi++) if (mod12(midi) === want) candidates.push(midi);
  }
  const anchor = previous ?? 67;
  return candidates.sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor) || a - b)[0] ?? 64;
}

function leadOf(events: readonly BhlGuitarEvent[], regionId: string): BhlGuitarEvent[] {
  return events
    .filter((event) => event.regionId === regionId && event.voice !== '2')
    .slice()
    .sort((a, b) => a.bar - b.bar || a.onsetQuarters - b.onsetQuarters);
}

function paint(event: BhlGuitarEvent, melody: number, region: BhlPhraseRegion, field: readonly number[]): void {
  let midis = [melody];
  if (region.density !== 'single' && region.density !== 'counterline') {
    const lower = field
      .map((pitchClass) => ({ pitchClass, interval: mod12(melody - pitchClass) }))
      .filter((item) => item.interval >= 1 && item.interval <= 4)
      .sort((a, b) => a.interval - b.interval)[0];
    if (lower && melody - lower.interval >= region.registerLow) {
      const dyad = [melody - lower.interval, melody];
      if (assessGuitarFeasibility(dyad).feasible) midis = dyad;
    }
    if (region.density === 'triad' && midis.length === 2) {
      const upperGap = field
        .map((pitchClass) => mod12(pitchClass - mod12(melody)))
        .filter((gap) => gap >= 3 && gap <= 4)
        .sort((a, b) => a - b)[0];
      if (upperGap !== undefined) {
        const triad = [...midis, melody + upperGap].sort((a, b) => a - b);
        if (melody + upperGap <= region.registerHigh && assessGuitarFeasibility(triad).feasible) midis = triad;
      }
    }
  }
  const check = assessGuitarFeasibility(midis);
  event.midis = check.feasible ? midis : [melody];
  event.pitchClasses = [...new Set(event.midis.map(mod12))].sort((a, b) => a - b);
}

function chains(
  windows: readonly BhlGuitarEvent[],
  intervals: readonly number[],
  fieldAt: (event: BhlGuitarEvent) => readonly number[],
): number[][] {
  const firstField = fieldAt(windows[0]!);
  const found: number[][] = [];
  for (const start of firstField) {
    const chain = [mod12(start)];
    let ok = true;
    for (let index = 0; index < intervals.length; index++) {
      const next = mod12(chain[index]! + intervals[index]!);
      if (!fieldAt(windows[index + 1]!).includes(next)) {
        ok = false;
        break;
      }
      chain.push(next);
    }
    if (ok) found.push(chain);
  }
  return found;
}

function developRegion(
  plan: BhlPhrasePlan,
  region: BhlPhraseRegion,
  events: BhlGuitarEvent[],
  bars: readonly BhlBassBar[],
  fieldOf: BhlFieldAt,
  limits: BhlIntentionLimit[],
): void {
  const motifSteps = plan.motif.intervals;
  const lead = leadOf(events, region.id);
  if (region.rhythmTransform === 'silence-window' && lead.length < 3) {
    limits.push({
      regionId: region.id,
      intention: 'Keep a recognisable interval relationship with the earlier motif.',
      reason: 'This silence window has fewer than three guitar attacks, so a two-interval fragment was not forced into the rest.',
    });
    return;
  }
  if (lead.length < 3) {
    limits.push({
      regionId: region.id,
      intention: 'Keep a recognisable interval relationship with the earlier motif.',
      reason: 'The region does not have three guitar attacks. Extra notes were not invented to fill a silence or a one-note metre.',
    });
    return;
  }
  const intervals = motifSteps.length >= 2 ? motifSteps.slice(0, 2) : [];
  if (intervals.length < 2) {
    limits.push({
      regionId: region.id,
      intention: 'Keep a recognisable interval relationship with the earlier motif.',
      reason: 'The declared motif has fewer than two intervals. Pitch-class overlap was not treated as development.',
    });
    return;
  }
  const barOf = (bar: number) => bars.find((item) => item.bar === bar);
  const fieldAt = (event: BhlGuitarEvent) => {
    const bar = barOf(event.bar);
    return bar ? fieldOf(region, bar) : [];
  };
  const windows: BhlGuitarEvent[][] = [];
  for (let index = 0; index <= lead.length - 3; index++) windows.push(lead.slice(index, index + 3));
  const choices = windows.flatMap((window, index) =>
    chains(window, intervals, fieldAt).map((chain) => ({ window, chain, index })),
  );
  if (!choices.length) {
    limits.push({
      regionId: region.id,
      intention: 'Keep a recognisable interval relationship with the earlier motif.',
      reason: `No transposition of intervals ${intervals.join(', ')} stays inside the harmonic field of these bars.`,
    });
    return;
  }
  const motion = contraryWindow(bars, region);
  const clear = choices.filter((choice) => {
    if (!motion) return true;
    const opening = absoluteQuarter(bars, choice.window[0]!.bar, choice.window[0]!.onsetQuarters);
    const closing = absoluteQuarter(bars, choice.window[2]!.bar, choice.window[2]!.onsetQuarters);
    const motionStart = absoluteQuarter(bars, motion.left.bar, motion.left.onset);
    const motionEnd = absoluteQuarter(bars, motion.right.bar, motion.right.onset);
    return !(motionStart > opening + 1e-6 && motionEnd < closing - 1e-6);
  });
  const preferred = mod12((plan.motif.pitchClasses[0] ?? 0) + region.transposeSemitones);
  const favored = (clear.length ? clear : choices).filter((choice) => choice.chain[0] === preferred);
  const pool = favored.length ? favored : clear.length ? clear : choices;
  const pick = pool[hash(plan.seed, region.from, region.transposeSemitones) % pool.length]!;
  let previous: number | null = null;
  pick.window.forEach((event, index) => {
    const bar = barOf(event.bar);
    const midi = midiNear(pick.chain[index]!, region.registerLow, region.registerHigh, previous);
    paint(event, midi, region, bar ? fieldOf(region, bar) : []);
    previous = Math.max(...event.midis);
  });
  const invert = region.pitchTransform === 'invert-into-field';
  const tail = lead.filter((event) => !pick.window.includes(event));
  tail.forEach((event, index) => {
    const bar = barOf(event.bar);
    const field = bar ? fieldOf(region, bar) : [];
    const step = intervals[index % intervals.length] ?? 1;
    const wanted = mod12((previous ?? midiNear(pick.chain[0]!, region.registerLow, region.registerHigh, null)) + (invert ? -step : step));
    const pitchClass = field.includes(wanted) ? wanted : field[hash(plan.seed, event.bar, index) % Math.max(field.length, 1)] ?? wanted;
    if (!field.includes(wanted) && !limits.some((item) => item.regionId === region.id && item.intention.startsWith('Extend'))) {
      limits.push({
        regionId: region.id,
        intention: 'Extend the motif by inversion or continuation inside the field.',
        reason: `Interval ${invert ? -step : step} from the fragment leaves the field at bar ${event.bar}. A field tone was used for the extension only.`,
      });
    }
    const midi = midiNear(pitchClass, region.registerLow, region.registerHigh, previous);
    paint(event, midi, region, field);
    previous = Math.max(...event.midis);
  });
}

function shortenForRest(events: BhlGuitarEvent[], region: BhlPhraseRegion, bars: readonly BhlBassBar[]): void {
  for (const bar of bars.filter((item) => region.bars.includes(item.bar))) {
    const mine = events
      .filter((event) => event.bar === bar.bar && event.regionId === region.id && event.voice !== '2')
      .sort((a, b) => a.onsetQuarters - b.onsetQuarters);
    if (!mine.length) continue;
    const last = mine[mine.length - 1]!;
    const end = last.onsetQuarters + last.quarters;
    const keep = bar.quarters - STEP;
    if (end <= keep + 1e-6) continue;
    const shortened = Math.floor((keep - last.onsetQuarters + 1e-6) * 2) / 2;
    if (shortened >= STEP) last.quarters = shortened;
  }
}

function moveOntoRest(
  events: BhlGuitarEvent[],
  region: BhlPhraseRegion,
  bars: readonly BhlBassBar[],
  limits: BhlIntentionLimit[],
): void {
  const regionBars = bars.filter((bar) => region.bars.includes(bar.bar));
  const sounding = (onset: number, notes: readonly { onset: number; quarters: number }[]) =>
    notes.some((note) => onset >= note.onset - 1e-6 && onset < note.onset + note.quarters - 1e-6);
  const already = regionBars.some((bar) => {
    const mine = leadOf(events, region.id).filter((event) => event.bar === bar.bar);
    const guitarDuringBassRest = mine.some((event) => !sounding(event.onsetQuarters, bar.notes));
    const bassDuringGuitarRest = bar.attacks.some((attack) => !sounding(attack, mine));
    return guitarDuringBassRest || bassDuringGuitarRest;
  });
  if (already) return;
  const rest = regionBars.flatMap((bar) => bar.rests.filter((item) => item.quarters >= STEP - 1e-6).map((item) => ({ bar, ...item })))[0];
  if (!rest) {
    limits.push({
      regionId: region.id,
      intention: 'The entry and rest relationship hands activity from one instrument to the other.',
      reason: 'The bass has no rest of at least an eighth in this region, so a handoff was not invented.',
    });
    return;
  }
  const mine = leadOf(events, region.id).filter((event) => event.bar === rest.bar.bar);
  const target = mine[0];
  if (!target) {
    limits.push({
      regionId: region.id,
      intention: 'The entry and rest relationship hands activity from one instrument to the other.',
      reason: `Bar ${rest.bar.bar} has a bass rest and no guitar attack to move into it.`,
    });
    return;
  }
  const duration = Math.min(target.quarters, rest.quarters, STEP);
  const next = mine.find((event) => event !== target && event.onsetQuarters > rest.onset + 1e-6);
  const room = next ? next.onsetQuarters - rest.onset : rest.quarters;
  if (room < STEP - 1e-6) return;
  target.onsetQuarters = rest.onset;
  target.quarters = Math.min(duration, room);
}

function ensureAnswer(
  events: BhlGuitarEvent[],
  region: BhlPhraseRegion,
  bars: readonly BhlBassBar[],
  limits: BhlIntentionLimit[],
): void {
  for (const bar of bars.filter((item) => region.bars.includes(item.bar))) {
    const bass = bar.attacks;
    const mine = leadOf(events, region.id).filter((event) => event.bar === bar.bar);
    if (!bass.length || !mine.length) continue;
    if (mine.some((event) => bass.some((attack) => event.onsetQuarters > attack + 1e-6))) continue;
    const earliest = Math.min(...bass);
    const slot = Math.round((earliest + STEP) * 2) / 2;
    const event = mine[0]!;
    if (slot >= bar.quarters - STEP + 1e-6) {
      limits.push({
        regionId: region.id,
        intention: 'The guitar answers after the bass has attacked.',
        reason: `Bar ${bar.bar} has no eighth after the bass attack still inside the bar.`,
      });
      continue;
    }
    const clash = mine.some((other) => other !== event && near(other.onsetQuarters, slot));
    if (clash) continue;
    event.onsetQuarters = slot;
  }
}

interface BassPoint {
  bar: number;
  onset: number;
  midi: number;
  quarters: number;
}

function absoluteQuarter(bars: readonly BhlBassBar[], bar: number, onset: number): number {
  let cursor = 0;
  for (const item of bars) {
    if (item.bar === bar) return cursor + onset;
    if (item.bar < bar) cursor += item.quarters;
  }
  return cursor + onset;
}

function contraryWindow(bars: readonly BhlBassBar[], region: BhlPhraseRegion): { left: BassPoint; right: BassPoint } | null {
  const points: BassPoint[] = [];
  for (const bar of bars.filter((item) => region.bars.includes(item.bar))) {
    for (const note of bar.notes) points.push({ bar: bar.bar, onset: note.onset, midi: note.midi, quarters: note.quarters });
  }
  for (let index = 0; index < points.length - 1; index++) {
    const left = points[index]!;
    const right = points[index + 1]!;
    if (left.bar !== right.bar) continue;
    if (left.midi === right.midi) continue;
    const gap = right.onset - left.onset;
    if (gap < STEP - 1e-6) continue;
    if (left.quarters + 1e-6 < gap) continue;
    return { left, right };
  }
  return null;
}

function placeContrary(
  plan: BhlPhrasePlan,
  region: BhlPhraseRegion,
  events: BhlGuitarEvent[],
  bars: readonly BhlBassBar[],
  fieldOf: BhlFieldAt,
  limits: BhlIntentionLimit[],
): void {
  if (region.rhythmTransform === 'silence-window' && leadOf(events, region.id).length < 3) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: 'A one-note silence window cannot carry a contrary line without inventing attacks in the rest.',
    });
    return;
  }
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]!;
    if (event.regionId === region.id && event.voice === '2') events.splice(index, 1);
  }
  const window = contraryWindow(bars, region);
  if (!window) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: 'No bass note sustains into a different bass pitch inside one bar. An unrelated line was not substituted.',
    });
    return;
  }
  const bar = bars.find((item) => item.bar === window.left.bar);
  if (!bar) return;
  const field = fieldOf(region, bar);
  const rising = window.right.midi > window.left.midi;
  const direction = rising ? -1 : 1;
  const independent = window.left.onset + STEP < window.right.onset - 1e-6 ? window.left.onset + STEP : window.left.onset;
  const sustain = window.right.onset - independent;
  if (sustain < STEP - 1e-6) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: `Bar ${bar.bar} bass moves, but the guitar has no eighth of sustain between those bass attacks.`,
    });
    return;
  }
  const low = region.registerLow;
  const high = region.registerHigh;
  const options: Array<{ first: number; second: number }> = [];
  for (let midi = low; midi <= high; midi++) {
    if (!field.includes(mod12(midi))) continue;
    for (const step of [1, 2, 3, 4]) {
      const next = midi + direction * step;
      if (next < low || next > high) continue;
      if (!field.includes(mod12(next))) continue;
      if (Math.sign(next - midi) !== direction) continue;
      if (!assessGuitarFeasibility([midi]).feasible || !assessGuitarFeasibility([next]).feasible) continue;
      options.push({ first: midi, second: next });
    }
  }
  if (!options.length) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: `Bass moves ${rising ? 'up' : 'down'} in bar ${bar.bar}, and no opposite guitar step of a second, third, or fourth stays in the field and register.`,
    });
    return;
  }
  const choice = options[hash(plan.seed, bar.bar, direction + 2) % options.length]!;
  const first: BhlGuitarEvent = {
    bar: bar.bar,
    regionId: region.id,
    onsetQuarters: independent,
    quarters: sustain,
    midis: [choice.first],
    pitchClasses: [mod12(choice.first)],
    voice: '2',
  };
  const answerRoom = Math.min(STEP, bar.quarters - window.right.onset);
  if (answerRoom < STEP - 1e-6) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: `Bar ${bar.bar} has no room for the answering guitar attack.`,
    });
    return;
  }
  const second: BhlGuitarEvent = {
    bar: bar.bar,
    regionId: region.id,
    onsetQuarters: window.right.onset,
    quarters: answerRoom,
    midis: [choice.second],
    pitchClasses: [mod12(choice.second)],
    voice: '2',
  };
  const clash = events.some(
    (event) =>
      event.bar === bar.bar &&
      event.voice === '2' &&
      event.onsetQuarters < second.onsetQuarters + second.quarters &&
      second.onsetQuarters < event.onsetQuarters + event.quarters,
  );
  if (clash || first.onsetQuarters + first.quarters - second.onsetQuarters > 1e-6) {
    limits.push({
      regionId: region.id,
      intention: 'Two independently sounding lines move in opposite directions.',
      reason: `Bar ${bar.bar} guitar counterline would overlap itself.`,
    });
    return;
  }
  events.push(first, second);
}

export function guitarFeasibility(events: readonly BhlGuitarEvent[]): Array<{
  bar: number;
  onsetQuarters: number;
  midis: number[];
  feasible: boolean;
  fretSpan: number;
}> {
  return events.map((event) => {
    const check = assessGuitarFeasibility(event.midis);
    return {
      bar: event.bar,
      onsetQuarters: event.onsetQuarters,
      midis: [...event.midis],
      feasible: check.feasible,
      fretSpan: check.fretSpan,
    };
  });
}

function isFifth(interval: number): boolean {
  const step = mod12(interval);
  return step === 5 || step === 7;
}

function nearestPc(pitchClass: number, field: readonly number[]): number {
  const target = mod12(pitchClass);
  let best = field[0] ?? target;
  let bestDistance = 99;
  for (const candidate of field) {
    const raw = Math.abs(target - candidate);
    const distance = Math.min(raw, 12 - raw);
    if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return mod12(best);
}

function continuationBlock(region: BhlPhraseRegion): string | null {
  if (region.rhythmTransform === 'silence-window') {
    return 'This region is a silence window. Continuation was not written into the rest.';
  }
  if (region.dialogue === 'leave-space') {
    return 'This region leaves space. Continuation was not used to fill the rest.';
  }
  if (region.dialogue === 'handoff-before-bass') {
    return 'This region is a bass handoff. Continuation was not written across the handoff.';
  }
  return null;
}

function statementLead(plan: BhlPhrasePlan, events: readonly BhlGuitarEvent[]): BhlGuitarEvent[] {
  const statement = plan.regions.find((region) => region.role === 'statement');
  return statement ? leadOf(events, statement.id) : [];
}

function chainStart(preferred: number, intervals: readonly number[], count: number, field: readonly number[]): number {
  const needed = Math.min(intervals.length, Math.max(count - 1, 1));
  const candidates = [mod12(preferred), ...field.filter((pitchClass) => pitchClass !== mod12(preferred))];
  for (const start of candidates) {
    if (!field.includes(start)) continue;
    let cursor = start;
    let ok = true;
    for (let index = 0; index < needed; index++) {
      const next = mod12(cursor + (intervals[index % intervals.length] ?? 0));
      if (!field.includes(next)) {
        ok = false;
        break;
      }
      cursor = next;
    }
    if (ok) return start;
  }
  return field.includes(mod12(preferred)) ? mod12(preferred) : nearestPc(preferred, field);
}

function walkIntervals(
  start: number,
  intervals: readonly number[],
  count: number,
  field: readonly number[],
  allowOutside: boolean,
): { pitches: number[]; leftField: boolean; usedOutside: boolean } {
  const pitches: number[] = [];
  let cursor = field.includes(mod12(start)) ? mod12(start) : nearestPc(start, field);
  let leftField = false;
  let usedOutside = false;
  for (let index = 0; index < count; index++) {
    if (index > 0) {
      const step = intervals[(index - 1) % intervals.length] ?? 2;
      const wanted = mod12(cursor + step);
      if (field.includes(wanted)) cursor = wanted;
      else if (allowOutside && !usedOutside) {
        cursor = wanted;
        usedOutside = true;
      } else {
        cursor = nearestPc(wanted, field);
        leftField = true;
      }
    }
    pitches.push(cursor);
  }
  return { pitches, leftField, usedOutside };
}

function thirdLine(start: number, count: number, field: readonly number[]): number[] {
  const pitches: number[] = [];
  let cursor = field.includes(mod12(start)) ? mod12(start) : nearestPc(start, field);
  const leaps = [3, 4, -3, -4];
  for (let index = 0; index < count; index++) {
    pitches.push(cursor);
    const leap = leaps[index % leaps.length]!;
    const wanted = mod12(cursor + leap);
    cursor = field.includes(wanted) ? wanted : nearestPc(wanted, field.length ? field.filter((pc) => pc !== cursor) : field);
  }
  return pitches;
}

function paintLead(event: BhlGuitarEvent, pitchClass: number, region: BhlPhraseRegion, field: readonly number[]): void {
  const midi = midiNear(pitchClass, region.registerLow, region.registerHigh, Math.max(...event.midis));
  paint(event, midi, region, field);
}

function continueRegion(
  plan: BhlPhrasePlan,
  region: BhlPhraseRegion,
  events: BhlGuitarEvent[],
  bars: readonly BhlBassBar[],
  fieldOf: BhlFieldAt,
  limits: BhlIntentionLimit[],
): void {
  const strategy: BhlContinuationStrategy | undefined = region.continuation;
  if (!strategy) return;
  const blocked = continuationBlock(region);
  if (blocked) {
    limits.push({
      regionId: region.id,
      intention: 'Continue a recognisable idea without filling a rest, handoff, or close.',
      reason: blocked,
    });
    return;
  }
  const motif = plan.motif.intervals;
  const earlier = statementLead(plan, events);
  if (motif.length < 1 || earlier.length < 2) {
    limits.push({
      regionId: region.id,
      intention: 'Continue a recognisable idea from the source motif.',
      reason: 'The source does not provide two motif notes. A motif was not invented.',
    });
    return;
  }
  if (strategy === 'fragment' && motif.length < 2) {
    limits.push({
      regionId: region.id,
      intention: 'Develop a smaller fragment of the motif.',
      reason: 'The motif has one interval. A smaller fragment was not invented.',
    });
    return;
  }
  const lead = leadOf(events, region.id);
  if (lead.length < 2) {
    limits.push({
      regionId: region.id,
      intention: 'Continue a recognisable idea from the source motif.',
      reason: 'This region has fewer than two guitar attacks. Notes were not added to fill a rest.',
    });
    return;
  }
  const fieldFor = (event: BhlGuitarEvent) => {
    const bar = bars.find((item) => item.bar === event.bar);
    return bar ? fieldOf(region, bar) : region.pitchClasses;
  };
  const openingField = fieldFor(lead[0]!);
  if (!openingField.length) {
    limits.push({
      regionId: region.id,
      intention: 'Keep the continuation inside the selected harmonic field.',
      reason: 'The selected field is empty, so continuation pitches were left unchanged.',
    });
    return;
  }
  const anchor = mod12(Math.max(...earlier[earlier.length - 1]!.midis));
  const allowOutside = region.outsideColour === true;
  let pitches: number[] = [];
  let leftField = false;
  if (strategy === 'extend' || strategy === 'fragment') {
    const steps = strategy === 'fragment' ? [motif[0]!] : motif;
    const start = chainStart(anchor, steps, lead.length, openingField);
    const walked = walkIntervals(start, steps, lead.length, openingField, allowOutside);
    pitches = walked.pitches;
    leftField = walked.leftField || start !== mod12(anchor);
  } else if (strategy === 'sequence') {
    const statementStart = mod12(Math.max(...earlier[0]!.midis));
    const fitted = openingField.find((candidate) => {
      if (candidate === statementStart) return false;
      if (isFifth(mod12(candidate - statementStart))) return false;
      let cursor = candidate;
      return motif.every((step) => {
        const next = mod12(cursor + step);
        if (!openingField.includes(next)) return false;
        cursor = next;
        return true;
      });
    });
    if (fitted === undefined) {
      limits.push({
        regionId: region.id,
        intention: 'Transfer the melodic shape into another part of the field.',
        reason: 'No transposition of the motif stays inside the field without a fifth step. A fifth-cycle sequence was not substituted.',
      });
      return;
    }
    const walked = walkIntervals(fitted, motif, lead.length, openingField, allowOutside);
    pitches = walked.pitches;
    leftField = walked.leftField;
  } else if (strategy === 'rhythm') {
    const statementDurs = earlier.map((event) => event.quarters);
    lead.forEach((event, index) => {
      const bar = bars.find((item) => item.bar === event.bar);
      const next = lead[index + 1];
      const room = next && next.bar === event.bar
        ? next.onsetQuarters - event.onsetQuarters
        : (bar?.quarters ?? event.quarters) - event.onsetQuarters;
      const wanted = statementDurs[index % statementDurs.length] ?? event.quarters;
      const fitted = Math.floor((Math.min(wanted, room) + 1e-6) * 2) / 2;
      if (fitted >= STEP) event.quarters = fitted;
    });
    pitches = thirdLine(mod12(anchor + 3), lead.length, openingField);
  } else {
    const bassMoves = bars.some((bar) => region.bars.includes(bar.bar) && bar.attacks.length > 0);
    if (!bassMoves) {
      limits.push({
        regionId: region.id,
        intention: 'Answer a real bass attack, rest, or handoff.',
        reason: 'The bass has no attack in this region. A conversational line was not invented.',
      });
      return;
    }
    const shared = openingField.includes(anchor) ? anchor : nearestPc(anchor, openingField);
    pitches = thirdLine(shared, lead.length, openingField);
  }
  let keptOutside = false;
  lead.forEach((event, index) => {
    const field = fieldFor(event);
    let pitchClass = mod12(pitches[index] ?? pitches[pitches.length - 1] ?? nearestPc(anchor, field));
    if (field.length && !field.includes(pitchClass)) {
      if (allowOutside && !keptOutside) keptOutside = true;
      else pitchClass = nearestPc(pitchClass, field);
    }
    paintLead(event, pitchClass, region, field);
  });
  if (leftField && !allowOutside) {
    limits.push({
      regionId: region.id,
      intention: 'Keep the continuation inside the selected harmonic field.',
      reason: 'A motif interval left the field. That note was replaced with a field tone. No chromatic note was left in by accident.',
    });
  }
}

export function collectFieldNotes(
  plan: BhlPhrasePlan,
  bars: readonly BhlBassBar[],
  events: readonly BhlGuitarEvent[],
  fieldOf: BhlFieldAt,
): BhlFieldNote[] {
  const notes: BhlFieldNote[] = [];
  for (const region of plan.regions) {
    if (region.role === 'statement' || region.role === 'return') continue;
    for (const event of events.filter((item) => item.regionId === region.id)) {
      const bar = bars.find((item) => item.bar === event.bar);
      const field = bar ? fieldOf(region, bar) : region.pitchClasses;
      for (const pitchClass of event.pitchClasses) {
        const inside = field.includes(mod12(pitchClass));
        if (inside) {
          notes.push({ bar: event.bar, onsetQuarters: event.onsetQuarters, pitchClass: mod12(pitchClass), status: 'in-field' });
        } else if (region.outsideColour) {
          notes.push({
            bar: event.bar,
            onsetQuarters: event.onsetQuarters,
            pitchClass: mod12(pitchClass),
            status: 'outside-permitted',
          });
        }
      }
    }
  }
  return notes;
}

export function realiseBhlIntentions(
  plan: BhlPhrasePlan,
  bars: readonly BhlBassBar[],
  events: BhlGuitarEvent[],
  fieldOf: BhlFieldAt,
): BhlIntentionLimit[] {
  const limits: BhlIntentionLimit[] = [];
  for (const region of plan.regions) {
    if (region.role === 'development') developRegion(plan, region, events, bars, fieldOf, limits);
    if (region.role === 'continuation') continueRegion(plan, region, events, bars, fieldOf, limits);
    if (region.dialogue === 'leave-space') shortenForRest(events, region, bars);
    if (region.dialogue === 'handoff-before-bass') moveOntoRest(events, region, bars, limits);
    if (region.dialogue === 'answer-after-bass') ensureAnswer(events, region, bars, limits);
    if (region.dialogue === 'counter-motion') placeContrary(plan, region, events, bars, fieldOf, limits);
  }
  return limits;
}
