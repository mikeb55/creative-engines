/**
 * BHL iteration 2 — phrase-level rhythm from the sounding bass.
 * Onset plans are chosen before pitches. A repeated attack grid is allowed
 * only when the phrase region marks the ostinato as intentional.
 */

import type { BhlMetreLock, BhlSourceEvent } from './bhlTypes';

export type BhlRhythmTransform =
  | 'state-onsets'
  | 'displace'
  | 'augment'
  | 'diminish'
  | 'silence-window'
  | 'ostinato'
  | 'metre-compress';

/** Rhythm fields the onset planner reads. The phrase region satisfies this. */
export interface BhlRhythmContract {
  rhythmTransform: BhlRhythmTransform;
  displacementQuarters: number;
  ostinatoOnsets: readonly number[] | null;
  ostinatoJustified: boolean;
  density: 'dyad' | 'single' | 'alternate';
  dialogue: 'answer-after-bass' | 'counter-motion' | 'leave-space' | 'handoff-before-bass';
}

export interface BhlBassBar {
  bar: number;
  quarters: number;
  attacks: number[];
  rests: Array<{ onset: number; quarters: number }>;
  notes: Array<{ onset: number; quarters: number; midi: number; pitchClass: number }>;
  pitchClasses: number[];
  /** Longest sounding bass pitch class; earliest note breaks a tie. */
  rootPc: number;
}

export interface BhlOnsetPlan {
  bar: number;
  onsets: number[];
  durations: number[];
  signature: string;
  transform: BhlRhythmTransform;
  ostinatoJustified: boolean;
}

const STEP = 0.5;

function pc(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

function includes(values: readonly number[], target: number): boolean {
  return values.some((value) => near(value, target));
}

export function readBassBars(
  bass: readonly BhlSourceEvent[],
  metres: readonly BhlMetreLock[],
  bassPartId: string,
): BhlBassBar[] {
  const metreByBar = new Map<number, number>();
  for (const metre of metres) {
    if (metre.partId !== bassPartId) continue;
    metreByBar.set(metre.bar, (metre.beats * 4) / metre.beatType);
  }
  const byBar = new Map<number, BhlSourceEvent[]>();
  for (const event of bass) {
    const list = byBar.get(event.bar) ?? [];
    list.push(event);
    byBar.set(event.bar, list);
  }
  const bars = [...metreByBar.keys()].sort((a, b) => a - b);
  return bars.map((bar) => {
    const quarters = metreByBar.get(bar)!;
    const events = (byBar.get(bar) ?? []).slice().sort((a, b) => a.onsetQuarters - b.onsetQuarters);
    const notes = events
      .filter((event) => !event.rest && event.midis.length > 0)
      .map((event) => ({
        onset: event.onsetQuarters,
        quarters: event.quarters,
        midi: event.midis[0]!,
        pitchClass: pc(event.midis[0]!),
      }));
    const rests = events
      .filter((event) => event.rest)
      .map((event) => ({ onset: event.onsetQuarters, quarters: event.quarters }));
    let root = notes[0];
    for (const note of notes) {
      if (!root || note.quarters > root.quarters + 1e-6) root = note;
    }
    const pitchClasses = [...new Set(notes.map((note) => note.pitchClass))].sort((a, b) => a - b);
    return {
      bar,
      quarters,
      attacks: notes.map((note) => note.onset),
      rests,
      notes,
      pitchClasses,
      rootPc: root?.pitchClass ?? 0,
    };
  });
}

/** Eighth-grid slots that answer a bass attack or open a bass rest, and do not land on a bass attack. */
export function legalAnswerSlots(bar: BhlBassBar): number[] {
  const slots: number[] = [];
  for (let onset = 0; onset < bar.quarters - 1e-6; onset += STEP) {
    if (includes(bar.attacks, onset)) continue;
    const answersAttack = bar.attacks.some((attack) => near(attack + STEP, onset));
    const opensRest = bar.rests.some((rest) => near(rest.onset, onset));
    if (answersAttack || opensRest) slots.push(Number(onset.toFixed(3)));
  }
  return slots;
}

function spaced(slots: readonly number[], count: number, fromEnd: boolean, gap: number): number[] {
  const ordered = fromEnd ? [...slots].reverse() : [...slots];
  const picked: number[] = [];
  for (const slot of ordered) {
    if (picked.every((kept) => Math.abs(kept - slot) >= gap - 1e-6)) picked.push(slot);
    if (picked.length >= count) break;
  }
  return picked.sort((a, b) => a - b);
}

function withoutBeatTwoAndFour(onsets: readonly number[], allow: boolean): number[] {
  if (allow || !(includes(onsets, 1) && includes(onsets, 3))) return [...onsets];
  const dropped = onsets.filter((onset) => !near(onset, 1));
  return dropped.length ? dropped : onsets.filter((onset) => !near(onset, 3));
}

function signatureOf(onsets: readonly number[]): string {
  return onsets.map((onset) => onset.toFixed(1)).join(',');
}

function nextBassAttack(bar: BhlBassBar, onset: number): number | null {
  const later = bar.attacks.filter((attack) => attack > onset + 1e-6);
  return later.length ? Math.min(...later) : null;
}

function durationsFor(
  bar: BhlBassBar,
  onsets: readonly number[],
  transform: BhlRhythmTransform,
  leaveFinalBeat: boolean,
): number[] {
  const preferred = transform === 'augment' || transform === 'metre-compress' ? 1 : STEP;
  return onsets.map((onset, index) => {
    const nextOnset = onsets[index + 1] ?? bar.quarters;
    const attack = nextBassAttack(bar, onset);
    let limit = Math.min(nextOnset, bar.quarters);
    if (attack !== null) limit = Math.min(limit, attack);
    if (leaveFinalBeat && bar.quarters >= 4) limit = Math.min(limit, bar.quarters - 1);
    let duration = Math.min(preferred, limit - onset);
    duration = Math.floor((duration + 1e-6) * 2) / 2;
    if (duration < STEP) duration = Math.min(STEP, bar.quarters - onset);
    return duration;
  });
}

export function planBarOnsets(
  bar: BhlBassBar,
  region: BhlRhythmContract,
  statementOnsets: readonly number[],
  indexInRegion: number,
): BhlOnsetPlan {
  const legal = legalAnswerSlots(bar).filter((onset) => onset < bar.quarters - 1e-6);
  const transform = region.rhythmTransform;
  let onsets: number[] = [];
  if (transform === 'ostinato') {
    onsets = (region.ostinatoOnsets ?? statementOnsets).filter((onset) => onset < bar.quarters - 1e-6);
  } else if (transform === 'silence-window') {
    const longest = [...bar.rests].sort((a, b) => b.quarters - a.quarters)[0];
    const awayFromRest = legal.filter((onset) => !longest || Math.abs(onset - longest.onset) > 1e-6);
    const pool = awayFromRest.length ? awayFromRest : legal;
    onsets = pool.length ? [pool[indexInRegion % pool.length]!] : [];
  } else if (transform === 'metre-compress') {
    onsets = legal.filter((onset) => onset < bar.quarters - 1e-6).slice(0, 1);
  } else if (transform === 'displace') {
    const shift = region.displacementQuarters;
    onsets = statementOnsets
      .map((onset) => Number((onset + shift).toFixed(3)))
      .filter((onset) => onset >= -1e-6 && onset < bar.quarters - 1e-6 && includes(legal, onset));
    if (onsets.length < 2) onsets = spaced(legal, 2, false, 1);
  } else if (transform === 'augment') {
    onsets = spaced(legal, 2, false, 1);
    if (signatureOf(onsets) === signatureOf(statementOnsets) && onsets.length > 1) onsets = [onsets[0]!, onsets[onsets.length - 1]!];
  } else if (transform === 'diminish') {
    const phase = indexInRegion % 2;
    const pool = legal.filter((_, index) => index % 2 === phase);
    onsets = (pool.length ? pool : legal).slice(0, 4);
    const fresh = onsets.filter((onset) => !includes(statementOnsets, onset));
    if (fresh.length >= 2) onsets = fresh;
    if (signatureOf(onsets) === signatureOf(statementOnsets) && onsets.length > 1) onsets = [onsets[0]!, onsets[onsets.length - 1]!];
  } else {
    onsets = spaced(legal, region.density === 'single' ? 2 : 3, true, 1);
    if (!onsets.length) onsets = legal.slice(0, 3);
  }
  onsets = withoutBeatTwoAndFour(onsets, region.ostinatoJustified && transform === 'ostinato');
  onsets = [...new Set(onsets.map((onset) => Number(onset.toFixed(3))))].sort((a, b) => a - b);
  const leaveFinalBeat = region.dialogue === 'leave-space';
  const durations = durationsFor(bar, onsets, transform, leaveFinalBeat);
  return {
    bar: bar.bar,
    onsets,
    durations,
    signature: signatureOf(onsets),
    transform,
    ostinatoJustified: region.ostinatoJustified,
  };
}

export function planPhraseOnsets(
  bars: readonly BhlBassBar[],
  regions: readonly (BhlRhythmContract & { id: string; bars: readonly number[]; role: string })[],
): BhlOnsetPlan[] {
  const statement = regions.find((region) => region.role === 'statement');
  const plans: BhlOnsetPlan[] = [];
  let statementOnsets: number[] = [];
  for (const region of regions) {
    const regionBars = bars.filter((bar) => region.bars.includes(bar.bar));
    regionBars.forEach((bar, index) => {
      const plan = planBarOnsets(bar, region, statement && region.role !== 'statement' ? statementOnsets : [], index);
      plans.push(plan);
      if (region.id === statement?.id && index === 0) statementOnsets = plan.onsets;
    });
  }
  return plans;
}

export interface BhlMechanicalHit {
  signature: string;
  bars: number[];
  beatTwoAndFour: boolean;
}

/** Same attack grid on three or more bars, or beats 2 and 4 together, unless the plan justifies an ostinato. */
export function detectMechanicalOnsets(plans: readonly BhlOnsetPlan[]): BhlMechanicalHit[] {
  const groups = new Map<string, BhlOnsetPlan[]>();
  for (const plan of plans) {
    if (!plan.signature) continue;
    const list = groups.get(plan.signature) ?? [];
    list.push(plan);
    groups.set(plan.signature, list);
  }
  const hits: BhlMechanicalHit[] = [];
  for (const [signature, group] of groups) {
    const justified = group.every((plan) => plan.ostinatoJustified && plan.transform === 'ostinato');
    const onsets = signature.split(',').filter(Boolean).map(Number);
    const beatTwoAndFour = includes(onsets, 1) && includes(onsets, 3);
    if (justified) continue;
    if (group.length >= 3 || (beatTwoAndFour && group.length >= 2)) {
      hits.push({ signature, bars: group.map((plan) => plan.bar), beatTwoAndFour });
    }
  }
  const beatBars = plans
    .filter((plan) => {
      const onsets = plan.signature.split(',').filter(Boolean).map(Number);
      return includes(onsets, 1) && includes(onsets, 3) && !(plan.ostinatoJustified && plan.transform === 'ostinato');
    })
    .map((plan) => plan.bar);
  if (beatBars.length >= 2 && !hits.some((hit) => hit.beatTwoAndFour && hit.bars.join() === beatBars.join())) {
    hits.push({ signature: '1.0+3.0', bars: beatBars, beatTwoAndFour: true });
  }
  return hits;
}
