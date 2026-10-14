/**
 * BHL Batch A — phrase intelligence applied to guitar notes.
 * The binder is not a caption. Statement, return, dialogue, sustain, and
 * counter-voices change the notes that are written.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { bindBhlPhrase, readBhlPhrase, type BhlBinderEvent, type BhlReading } from './bhlPhraseBinder';
import {
  motifIntervals,
  signedInterval,
  type BhlDensity,
  type BhlDialogue,
  type BhlFieldSnap,
  type BhlGuitarEvent,
  type BhlPhrasePlan,
  type BhlPhraseRegion,
  type BhlPitchTransform,
} from './bhlPhrase';
import { collectFieldNotes, guitarFeasibility, realiseBhlIntentions, type BhlFieldNote, type BhlIntentionLimit } from './bhlRealise';
import { planPhraseOnsets, type BhlBassBar, type BhlOnsetPlan, type BhlRhythmTransform } from './bhlRhythm';
import type { BhlLiquidTrace } from './bhlGenerate';
import {
  buildBhlWorldField,
  bhlWorldInfo,
  formatWorldPcs,
  isFifthStep,
  type BhlWorldField,
  type BhlWorldId,
} from './bhlWorlds';

export type BhlPhraseArc = 'derived' | 'invert' | 'recall';
export type BhlRhythmMode = 'derived' | 'displace' | 'syncopate' | 'sparse';

export interface BhlWorldGenerateRequest {
  world: BhlWorldId;
  seed: number;
  phraseArc: BhlPhraseArc;
  rhythm: BhlRhythmMode;
}

export interface BhlPhraseBinderReport {
  relationshipCount: number;
  types: string[];
  readings: BhlReading[];
  motifIntervalReturns: boolean;
  contraryToBass: boolean;
  guitarSilenceBars: number[];
  dyadOrTriadAttacks: number;
  independentVoiceAttacks: number;
  sustainedAttacks: number;
  reattackCount: number;
}

export interface BhlWorldGuitar {
  plan: BhlPhrasePlan;
  events: BhlGuitarEvent[];
  snaps: BhlFieldSnap[];
  onsetPlans: BhlOnsetPlan[];
  liquid: BhlLiquidTrace[];
  feasibility: Array<{ bar: number; onsetQuarters: number; midis: number[]; feasible: boolean; fretSpan: number }>;
  worldId: BhlWorldId;
  worldName: string;
  resource: string;
  pitchClasses: number[];
  commonToneRetentions: number;
  contrastingMoves: number;
  fifthSteps: number;
  binder: BhlPhraseBinderReport;
  limitations: BhlIntentionLimit[];
  fieldNotes: BhlFieldNote[];
}

const mod12 = (value: number) => ((value % 12) + 12) % 12;

function hash(seed: number, bar: number, index: number): number {
  let x = (seed + bar * 17 + index * 13) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
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

function applyArc(plan: BhlPhrasePlan, arc: BhlPhraseArc, rhythm: BhlRhythmMode): BhlPhrasePlan {
  const next = structuredClone(plan);
  for (const region of next.regions) {
    if (arc === 'invert' && (region.role === 'transformation' || region.role === 'development')) {
      region.pitchTransform = 'invert-into-field';
      region.transposeSemitones = 2;
    }
    if (arc === 'recall' && region.role === 'return') region.pitchTransform = 'recall-cell';
    if (rhythm === 'displace' && region.role !== 'statement') {
      region.rhythmTransform = 'displace';
      region.displacementQuarters = 0.5;
    }
    if (rhythm === 'syncopate' && region.role !== 'statement' && region.rhythmTransform !== 'metre-compress') {
      region.rhythmTransform = 'diminish';
    }
    if (rhythm === 'sparse') {
      if (region.role === 'development') region.rhythmTransform = 'silence-window';
      if (region.role === 'continuation') {
        region.density = 'single';
        region.dialogue = 'leave-space';
      }
    }
  }
  return next;
}

function groupFor(field: BhlWorldField, barIndex: number, seed: number): number[] {
  const groups = field.groups.filter((group) => group.length);
  if (!groups.length) return field.pitchClasses;
  return groups[(barIndex + (seed % groups.length)) % groups.length]!;
}

function nearest(pitchClass: number, field: readonly number[]): number {
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
  return best;
}

function melodyLine(
  region: BhlPhraseRegion,
  field: BhlWorldField,
  motif: readonly number[],
  intervals: readonly number[],
  count: number,
  seed: number,
  bar: BhlBassBar,
  previousPc: number | null,
  bassFell: boolean | null,
): { line: number[]; retained: boolean; contrasted: boolean } {
  const invert = region.pitchTransform === 'invert-into-field';
  if (region.role === 'statement' || region.pitchTransform === 'neighbor-statement') {
    const line = motif.map(mod12);
    while (line.length < count) line.push(line[line.length % Math.max(motif.length, 1)] ?? field.rootPc);
    return { line: line.slice(0, count), retained: false, contrasted: false };
  }
  if (region.role === 'return' || region.pitchTransform === 'recall-cell') {
    const transposed = motif.map((pitchClass) => mod12(pitchClass + field.contrastInterval));
    while (transposed.length < count) transposed.push(transposed[transposed.length % Math.max(motif.length, 1)]!);
    const retained = previousPc !== null && transposed.includes(mod12(previousPc));
    return { line: transposed.slice(0, count), retained, contrasted: !isFifthStep(field.contrastInterval) };
  }
  const pool = groupFor(field, bar.bar, seed);
  const spin = (seed + bar.bar + hash(seed, bar.bar, region.role === 'development' ? 3 : 1)) % Math.max(pool.length, 1);
  const ordered = invert ? [...pool].reverse() : pool;
  let line = Array.from({ length: count }, (_, index) => ordered[(spin + index) % ordered.length] ?? field.rootPc);
  if (motifIntervals(line).join(',') === intervals.join(',') && line.length > 1 && ordered.length > 1) {
    line[line.length - 1] = ordered[(spin + count) % ordered.length]!;
  }
  while (line.length < count) line.push(pool[line.length % pool.length] ?? start);
  line = line.slice(0, count);
  let retained = false;
  if (previousPc !== null && region.role === 'continuation' && field.pitchClasses.includes(mod12(previousPc))) {
    line[0] = mod12(previousPc);
    retained = true;
  }
  if (bassFell !== null && line.length > 1 && previousPc !== null) {
    const step = signedInterval(line[0]!, line[1]!);
    const wrongWay = (bassFell && step < 0) || (!bassFell && step > 0);
    if (wrongWay) {
      const flipped = mod12(line[0]! - step);
      line[1] = pool.includes(flipped) ? flipped : nearest(flipped, pool);
    }
  }
  const contrasted = line.some((pitchClass, index) => index > 0 && !pool.includes(line[index - 1]!) || (index === 0 && previousPc !== null && !pool.includes(mod12(previousPc))));
  return { line, retained, contrasted: contrasted || region.role === 'development' || region.role === 'transformation' };
}

function stack(
  melody: number,
  density: BhlDensity,
  index: number,
  field: BhlWorldField,
  low: number,
): number[] {
  const wantTriad = density === 'triad' || (density === 'dyad' && index === 0);
  const wantDyad = density === 'dyad' || density === 'alternate' && index % 2 === 0 || density === 'triad';
  if (density === 'single' || density === 'counterline') return [melody];
  const pool = field.pitchClasses;
  const lowerPcs = pool
    .map((pitchClass) => mod12(melody - pitchClass))
    .filter((interval) => interval >= 1 && interval <= 4);
  const interval = lowerPcs.sort((a, b) => a - b)[0];
  if (!wantDyad || interval === undefined) return [melody];
  const lower = melody - interval;
  if (lower < low) return [melody];
  const dyad = [lower, melody];
  if (!assessGuitarFeasibility(dyad).feasible) return [melody];
  if (!wantTriad) return dyad;
  const thirdInterval = pool
    .map((pitchClass) => mod12(pitchClass - mod12(melody)))
    .filter((gap) => gap >= 3 && gap <= 4)
    .sort((a, b) => a - b)[0];
  if (thirdInterval === undefined) return dyad;
  const upper = melody + thirdInterval;
  const triad = [lower, melody, upper];
  if (upper > 84 || !assessGuitarFeasibility(triad).feasible) return dyad;
  return triad;
}

function fitGrip(midis: number[], melody: number): { midis: number[]; dropped: boolean } {
  let sounding = [...new Set(midis)].sort((a, b) => a - b);
  let dropped = false;
  while (sounding.length > 1 && !assessGuitarFeasibility(sounding).feasible) {
    sounding = sounding.filter((midi) => midi !== Math.min(...sounding));
    dropped = true;
  }
  if (!sounding.length || !assessGuitarFeasibility(sounding).feasible) return { midis: [melody], dropped: true };
  return { midis: sounding, dropped };
}

function bassDirection(bars: readonly BhlBassBar[], bar: number): boolean | null {
  const index = bars.findIndex((candidate) => candidate.bar === bar);
  if (index <= 0) return null;
  const step = signedInterval(bars[index - 1]!.rootPc, bars[index]!.rootPc);
  if (step === 0) return null;
  return step < 0;
}

function eventOf(
  bar: number,
  region: BhlPhraseRegion,
  onset: number,
  quarters: number,
  midis: number[],
  voice?: '1' | '2',
): BhlGuitarEvent {
  return {
    bar,
    regionId: region.id,
    onsetQuarters: onset,
    quarters,
    midis,
    pitchClasses: [...new Set(midis.map(mod12))].sort((a, b) => a - b),
    ...(voice ? { voice } : {}),
  };
}

function restoreReturnInterval(events: BhlGuitarEvent[], plan: BhlPhrasePlan): void {
  const returning = plan.regions.find((region) => region.role === 'return');
  const step = plan.motif.intervals[0];
  if (!returning || step === undefined) return;
  const lead = events.filter((event) => event.regionId === returning.id && event.voice !== '2');
  if (lead.length < 2) return;
  if (motifIntervals(tops(lead)).includes(step)) return;
  const first = mod12(Math.max(...lead[0]!.midis));
  const target = mod12(first + step);
  const midi = midiNear(target, returning.registerLow, returning.registerHigh, Math.max(...lead[0]!.midis));
  lead[1]!.midis = [midi];
  lead[1]!.pitchClasses = [mod12(midi)];
}

function clearPitchStalls(
  events: BhlGuitarEvent[],
  plan: BhlPhrasePlan,
  bars: readonly BhlBassBar[],
  world: BhlWorldId,
): void {
  const ordered = events.slice().sort((a, b) => a.bar - b.bar || a.onsetQuarters - b.onsetQuarters || (a.voice ?? '1').localeCompare(b.voice ?? '1'));
  let run = 0;
  for (const event of ordered) {
    const top = mod12(Math.max(...event.midis));
    if (top === 4 || top === 7) run += 1;
    else run = 0;
    if (run < 4) continue;
    const region = plan.regions.find((item) => item.id === event.regionId);
    if (!region || region.role === 'statement' || region.role === 'return') continue;
    const bar = bars.find((candidate) => candidate.bar === event.bar);
    if (!bar) continue;
    const field = buildBhlWorldField(world, bar, region.tensionState);
    const replacement = field.pitchClasses.find((pitchClass) => pitchClass !== 4 && pitchClass !== 7);
    if (replacement === undefined) continue;
    const midi = midiNear(replacement, region.registerLow, region.registerHigh, Math.max(...event.midis));
    event.midis = [midi];
    event.pitchClasses = [mod12(midi)];
    run = 0;
  }
}

function tops(events: readonly BhlGuitarEvent[]): number[] {
  return events.map((event) => mod12(Math.max(...event.midis)));
}

export function generateBhlWorldGuitar(
  sourcePlan: BhlPhrasePlan,
  bars: readonly BhlBassBar[],
  request: BhlWorldGenerateRequest,
): BhlWorldGuitar {
  const plan = applyArc(sourcePlan, request.phraseArc, request.rhythm);
  const onsetPlans = planPhraseOnsets(bars, plan.regions);
  const events: BhlGuitarEvent[] = [];
  const snaps: BhlFieldSnap[] = [];
  const liquid: BhlLiquidTrace[] = [];
  const feasibility: BhlWorldGuitar['feasibility'] = [];
  const info = bhlWorldInfo(request.world);
  const usedPcs = new Set<number>();
  let commonToneRetentions = 0;
  let contrastingMoves = 0;
  let fifthSteps = 0;
  let previousPc: number | null = null;
  let previousMidi: number | null = null;
  const motif = plan.motif.pitchClasses.map(mod12);
  const intervals = plan.motif.intervals;

  for (const region of plan.regions) {
    for (const onset of onsetPlans.filter((item) => region.bars.includes(item.bar))) {
      const bar = bars.find((candidate) => candidate.bar === onset.bar);
      if (!bar) throw new Error(`missing bass bar ${onset.bar}`);
      const field = buildBhlWorldField(request.world, bar, region.tensionState);
      for (const pitchClass of field.pitchClasses) usedPcs.add(pitchClass);
      if (field.chordType) {
        liquid.push({
          regionId: region.id,
          chordType: field.chordType,
          rootPc: field.rootPc,
          tensionState: region.tensionState,
          melodyPitchClass: field.liquidMelodyPc ?? field.rootPc,
          layerPitchClasses: field.pitchClasses,
        });
      }
      if (isFifthStep(field.contrastInterval) && request.world !== 'B') fifthSteps += 1;
      const count = Math.max(onset.onsets.length, region.role === 'statement' ? motif.length : 1);
      const shaped = melodyLine(region, field, motif, intervals, count, request.seed, bar, previousPc, bassDirection(bars, bar.bar));
      if (shaped.retained) commonToneRetentions += 1;
      if (shaped.contrasted) contrastingMoves += 1;
      const useOnsets = onset.onsets.slice(0, shaped.line.length);
      while (useOnsets.length < shaped.line.length && region.role === 'statement') break;
      useOnsets.forEach((start, index) => {
        let pitchClass = shaped.line[index] ?? shaped.line[shaped.line.length - 1] ?? field.rootPc;
        if (region.role !== 'statement' && region.role !== 'return' && !field.pitchClasses.includes(pitchClass)) {
          const snapped = nearest(pitchClass, field.pitchClasses);
          snaps.push({ bar: bar.bar, onsetQuarters: start, fromPc: pitchClass, toPc: snapped, reason: 'invert-or-transpose' });
          pitchClass = snapped;
        }
        const melody = midiNear(pitchClass, region.registerLow, region.registerHigh, previousMidi);
        let duration = onset.durations[index] ?? 0.5;
        if (region.dialogue === 'handoff-before-bass') {
          const nextBass = bar.attacks.find((attack) => attack > start + 1e-6);
          if (nextBass !== undefined) {
            const capped = Math.floor((nextBass - start) * 2) / 2;
            if (capped >= 0.5) duration = Math.min(duration, capped);
          }
        }
        const texture: BhlDensity = region.density;
        const grip = stack(melody, texture, index, field, region.registerLow);
        const fitted = fitGrip(grip, melody);
        if (fitted.dropped && grip.length > 1) {
          snaps.push({ bar: bar.bar, onsetQuarters: start, fromPc: mod12(grip[0]!), toPc: mod12(melody), reason: 'partner-dropped' });
        }
        const lead = eventOf(bar.bar, region, start, duration, fitted.midis, texture === 'counterline' ? '1' : undefined);
        events.push(lead);
        const check = assessGuitarFeasibility(fitted.midis);
        feasibility.push({ bar: bar.bar, onsetQuarters: start, midis: fitted.midis, feasible: check.feasible, fretSpan: check.fretSpan });
        if (texture === 'counterline') {
          const answerStart = Math.round((start + 0.5) * 2) / 2;
          const room = bar.quarters - answerStart;
          if (room >= 0.5 - 1e-6) {
            const preferred = [3, 4, 2, 1, 5].flatMap((interval) => {
              const down = bassDirection(bars, bar.bar) === false ? melody + interval : melody - interval;
              const up = bassDirection(bars, bar.bar) === false ? melody - interval : melody + interval;
              return [down, up];
            });
            const playable = preferred.filter(
              (midi) =>
                midi >= region.registerLow &&
                midi <= region.registerHigh &&
                midi !== melody &&
                assessGuitarFeasibility([Math.min(midi, melody), Math.max(midi, melody)]).feasible,
            );
            const answerMidi = playable.find((midi) => field.pitchClasses.includes(mod12(midi))) ?? playable[0] ?? null;
            const pairOk = answerMidi !== null;
            if (pairOk && answerMidi !== null) {
              const answer = eventOf(bar.bar, region, answerStart, Math.min(0.5, room), [answerMidi], '2');
              const overlapsLead = events.some(
                (event) => event.bar === bar.bar && event.voice === '2' && event.onsetQuarters < answer.onsetQuarters + answer.quarters && answer.onsetQuarters < event.onsetQuarters + event.quarters,
              );
              if (!overlapsLead) {
                events.push(answer);
                const answerCheck = assessGuitarFeasibility([answerMidi]);
                feasibility.push({
                  bar: bar.bar,
                  onsetQuarters: answerStart,
                  midis: [answerMidi],
                  feasible: answerCheck.feasible,
                  fretSpan: answerCheck.fretSpan,
                });
              }
            } else {
              snaps.push({ bar: bar.bar, onsetQuarters: start, fromPc: pitchClass, toPc: pitchClass, reason: 'partner-dropped' });
            }
          }
        }
        previousPc = mod12(Math.max(...fitted.midis));
        previousMidi = Math.max(...fitted.midis);
        if (index > 0 && fitted.midis.length === 1 && previousPc === mod12(melody) && duration <= 0.5) {
          /* reattack of one pitch stays a separate event */
        }
      });
      if (region.role === 'continuation' && region.density !== 'counterline') {
        const mine = events.filter((event) => event.bar === bar.bar && event.regionId === region.id && event.voice !== '2');
        if (mine.length >= 2 && mine.every((event) => event.quarters <= 0.5)) {
          const first = mine[0]!;
          const rest = mine.slice(1);
          const joined = Math.min(bar.quarters - first.onsetQuarters, first.quarters + rest.reduce((sum, event) => sum + event.quarters, 0));
          if (joined - first.quarters >= 0.5 && bar.quarters - (first.onsetQuarters + joined) >= 1 - 1e-6) {
            first.quarters = joined;
            for (const extra of rest) {
              const at = events.indexOf(extra);
              if (at >= 0) events.splice(at, 1);
            }
          }
        }
      }
    }
  }

  const statement = plan.regions.find((region) => region.role === 'statement');
  const statementTops = tops(events.filter((event) => event.regionId === statement?.id && event.voice !== '2'));
  const heard = motifIntervals(statementTops);
  if (intervals.length && heard.join(',') !== intervals.join(',')) {
    const statementEvents = events.filter((event) => event.regionId === statement?.id && event.voice !== '2');
    statementEvents.forEach((event, index) => {
      const pitchClass = motif[index] ?? motif[motif.length - 1];
      if (pitchClass === undefined) return;
      const midi = midiNear(pitchClass, statement?.registerLow ?? 64, statement?.registerHigh ?? 74, index ? Math.max(...statementEvents[index - 1]!.midis) : null);
      event.midis = [midi];
      event.pitchClasses = [mod12(midi)];
    });
  }

  restoreReturnInterval(events, plan);
  clearPitchStalls(events, plan, bars, request.world);
  const fieldOf = (region: BhlPhraseRegion, bar: BhlBassBar) => buildBhlWorldField(request.world, bar, region.tensionState).pitchClasses;
  const limitations = realiseBhlIntentions(plan, bars, events, fieldOf);
  const fieldNotes = collectFieldNotes(plan, bars, events, fieldOf);
  feasibility.splice(0, feasibility.length, ...guitarFeasibility(events));
  const binder = bindGenerated(events, bars, plan);
  return {
    plan,
    events,
    snaps,
    onsetPlans,
    liquid,
    feasibility,
    worldId: request.world,
    worldName: info.name,
    resource: info.resource,
    pitchClasses: [...usedPcs].sort((a, b) => a - b),
    commonToneRetentions,
    contrastingMoves,
    fifthSteps,
    binder,
    limitations,
    fieldNotes,
  };
}

function bindGenerated(events: readonly BhlGuitarEvent[], bars: readonly BhlBassBar[], plan: BhlPhrasePlan): BhlPhraseBinderReport {
  const binderEvents: BhlBinderEvent[] = [];
  let seq = 0;
  for (const bar of bars) {
    for (const note of bar.notes) {
      seq += 1;
      binderEvents.push(binderEvent({
        bar: bar.bar,
        onset: note.onset,
        dur: note.quarters,
        role: 'bass',
        voice: '1',
        midi: note.midi,
        group: `bass-${bar.bar}-${seq}`,
        beats: bar.quarters === 3 ? 3 : 4,
      }));
    }
  }
  for (const event of events) {
    const voice = event.voice ?? '1';
    event.midis.forEach((midi, chordIndex) => {
      seq += 1;
      binderEvents.push(binderEvent({
        bar: event.bar,
        onset: event.onsetQuarters,
        dur: event.quarters,
        role: 'guitar',
        voice,
        midi,
        group: `g-${event.bar}-${event.onsetQuarters}-${voice}`,
        chordIndex,
        beats: bars.find((bar) => bar.bar === event.bar)?.quarters === 3 ? 3 : 4,
      }));
    });
  }
  const relationships = bindBhlPhrase(binderEvents);
  const readings = readBhlPhrase(binderEvents, { plan });
  const guitarByBar = new Map<number, number>();
  for (const event of events) guitarByBar.set(event.bar, (guitarByBar.get(event.bar) ?? 0) + event.quarters);
  const silence = bars
    .filter((bar) => events.some((event) => event.bar === bar.bar))
    .filter((bar) => bar.quarters - (guitarByBar.get(bar.bar) ?? 0) >= 1 - 1e-6)
    .map((bar) => bar.bar);
  const lead = events.filter((event) => event.voice !== '2');
  let reattacks = 0;
  for (let index = 1; index < lead.length; index++) {
    const previous = lead[index - 1]!;
    const current = lead[index]!;
    if (current.bar === previous.bar && mod12(Math.max(...current.midis)) === mod12(Math.max(...previous.midis)) && current.quarters <= 0.5 && previous.quarters <= 0.5) {
      reattacks += 1;
    }
  }
  const statement = plan.regions.find((region) => region.role === 'statement');
  const returning = plan.regions.find((region) => region.role === 'return');
  const statementIntervals = motifIntervals(tops(lead.filter((event) => event.regionId === statement?.id)));
  const returnIntervals = motifIntervals(tops(lead.filter((event) => event.regionId === returning?.id)));
  const motifStep = plan.motif.intervals[0];
  const bassSteps: number[] = [];
  for (let index = 1; index < bars.length; index++) bassSteps.push(signedInterval(bars[index - 1]!.rootPc, bars[index]!.rootPc));
  const guitarSteps = motifIntervals(tops(lead));
  const contrary = guitarSteps.some((step, index) => bassSteps[index] && step && Math.sign(step) !== Math.sign(bassSteps[index]!));
  return {
    relationshipCount: relationships.length,
    types: [...new Set(relationships.map((item) => item.type))],
    readings: readings.slice(0, 16),
    motifIntervalReturns: motifStep !== undefined && (returnIntervals.includes(motifStep) || statementIntervals.includes(motifStep)),
    contraryToBass: contrary || relationships.some((item) => item.subtype === 'contrary'),
    guitarSilenceBars: silence,
    dyadOrTriadAttacks: lead.filter((event) => event.midis.length >= 2).length,
    independentVoiceAttacks: events.filter((event) => event.voice === '2').length,
    sustainedAttacks: lead.filter((event) => event.quarters >= 1).length,
    reattackCount: reattacks,
  };
}

function binderEvent(input: {
  bar: number;
  onset: number;
  dur: number;
  role: 'guitar' | 'bass';
  voice: string;
  midi: number;
  group: string;
  chordIndex?: number;
  beats: number;
}): BhlBinderEvent {
  return {
    bar: input.bar,
    onsetTicks: Math.round(input.onset * 2),
    absQ: input.bar * 4 + input.onset,
    durQ: input.dur,
    partId: input.role === 'bass' ? 'B' : 'G',
    instrument: input.role === 'bass' ? 'Upright Bass' : 'Electric Guitar',
    role: input.role,
    voice: input.voice,
    midi: input.midi,
    rest: false,
    tieStart: false,
    tieStop: false,
    chordIndex: input.chordIndex ?? 0,
    group: input.chordIndex ? input.group.replace(/-\d+$/, '') : input.group,
    beat: Math.round((input.onset + 1) * 1000) / 1000,
    divisions: 2,
    beats: input.beats,
    beatType: 4,
  };
}

export function worldPitchSignature(events: readonly BhlGuitarEvent[]): string {
  return events
    .filter((event) => event.voice !== '2')
    .map((event) => `${event.bar}:${[...event.pitchClasses].sort((a, b) => a - b).join('.')}`)
    .join('|');
}

export function describeWorldField(world: BhlWorldId, bars: readonly BhlBassBar[]): string {
  const sample = bars[0];
  if (!sample) return bhlWorldInfo(world).resource;
  const field = buildBhlWorldField(world, sample, 'primary');
  return `${bhlWorldInfo(world).name}: ${formatWorldPcs(field.pitchClasses)} from bass ${formatWorldPcs([sample.rootPc])}. ${bhlWorldInfo(world).resource}`;
}

export type { BhlPitchTransform, BhlRhythmTransform, BhlDialogue };
