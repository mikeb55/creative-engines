/**
 * Piano V1.1 phrase development.
 * Opt-in. Twelve two-bar spans on the 24-bar form.
 * Candidates come from the shared motif operators and are scored on the realised notes.
 */

import { applyOperator } from '../motif-ops/operators';
import type { Motif, MotifNoteEvent, OperatorId } from '../motif-ops/types';

export type PianoPhraseIntent =
  | 'statement'
  | 'development'
  | 'contrast'
  | 'dialogue'
  | 'preparation'
  | 'climax'
  | 'return'
  | 'continuation'
  | 'ending';

export interface PhraseCandidateScore {
  id: string;
  score: number;
}

export interface PhraseSpanChoice {
  span: number;
  bars: [number, number];
  intent: PianoPhraseIntent;
  chosen: string;
  candidates: PhraseCandidateScore[];
}

const BAR_INTENT: readonly PianoPhraseIntent[] = [
  'statement', 'statement',
  'development', 'development',
  'development', 'development',
  'development', 'development',
  'contrast', 'contrast',
  'dialogue', 'dialogue',
  'dialogue', 'dialogue',
  'dialogue', 'dialogue',
  'preparation', 'preparation',
  'climax', 'climax',
  'return', 'continuation',
  'continuation', 'ending',
];

interface CandidateSpec {
  id: string;
  op?: OperatorId;
  params?: Record<string, number>;
}

const CANDIDATES: readonly CandidateSpec[] = [
  { id: 'identity' },
  { id: 'sequence-up', op: 'sequence-tonal', params: { steps: 1 } },
  { id: 'sequence-down', op: 'sequence-tonal', params: { steps: -1 } },
  { id: 'sequence-two', op: 'sequence-tonal', params: { steps: 2 } },
  { id: 'invert', op: 'invert-in-field' },
  { id: 'retrograde', op: 'retrograde' },
  { id: 'augment', op: 'augment' },
  { id: 'diminish', op: 'diminish' },
  { id: 'head', op: 'fragment-head', params: { count: 3 } },
  { id: 'rest', op: 'insert-rest', params: { index: 1, duration: 0.5 } },
  { id: 'lift', op: 'register-lift', params: { octaves: 1 } },
  { id: 'expand', op: 'expand-intervals', params: { amount: 1 } },
];

export function phraseIntentAt(bar: number): PianoPhraseIntent {
  return BAR_INTENT[bar - 1] ?? 'development';
}

export function phraseSpanIndex(bar: number): number {
  return Math.floor((bar - 1) / 2);
}

function sounding(events: readonly MotifNoteEvent[]): MotifNoteEvent[] {
  return events.filter((event) => event.midi !== null);
}

function contour(events: readonly MotifNoteEvent[]): number[] {
  const pitches = sounding(events).map((event) => event.midi!);
  const signs: number[] = [];
  for (let index = 1; index < pitches.length; index += 1) {
    const delta = pitches[index]! - pitches[index - 1]!;
    signs.push(delta === 0 ? 0 : delta > 0 ? 1 : -1);
  }
  return signs;
}

function durations(events: readonly MotifNoteEvent[]): number[] {
  return sounding(events).map((event) => event.duration);
}

export function scorePhraseCandidate(
  intent: PianoPhraseIntent,
  id: string,
  events: readonly MotifNoteEvent[],
  opening: readonly MotifNoteEvent[],
  previousPitch: number,
): number {
  const openingContour = contour(opening);
  const nextContour = contour(events);
  let retention = 0;
  for (let index = 0; index < Math.min(openingContour.length, nextContour.length); index += 1) {
    if (openingContour[index] === nextContour[index]) retention += 1;
  }
  const openingRhythm = durations(opening);
  const nextRhythm = durations(events);
  let rhythm = 0;
  for (let index = 0; index < Math.min(openingRhythm.length, nextRhythm.length); index += 1) {
    if (Math.abs(openingRhythm[index]! - nextRhythm[index]!) < 1e-6) rhythm += 1;
  }
  const first = sounding(events)[0]?.midi ?? previousPitch;
  const continuity = Math.max(0, 8 - Math.min(8, Math.abs(first - previousPitch)));
  let register = 0;
  const last = [...sounding(events)].reverse()[0]?.midi ?? first;
  if (intent === 'climax' && last >= previousPitch) register += 3;
  if (intent === 'ending' && last <= previousPitch + 2) register += 2;
  if ((intent === 'contrast' || intent === 'dialogue') && nextContour.join(',') !== openingContour.join(',')) register += 2;
  const restCount = events.filter((event) => event.midi === null).length;
  let texture = 0;
  if ((intent === 'preparation' || intent === 'ending') && restCount > 0) texture += 4;
  if (intent === 'statement' && restCount === 0) texture += 2;
  if (intent === 'development' && id.startsWith('sequence')) texture += 3;
  if (intent === 'contrast' && id === 'invert') texture += 3;
  if (intent === 'dialogue' && (id === 'retrograde' || id === 'expand')) texture += 3;
  if (intent === 'climax' && id === 'lift') texture += 5;
  if ((intent === 'return' || intent === 'statement') && id === 'identity') texture += 8;
  if (intent === 'continuation' && id === 'sequence-up') texture += 4;
  if (intent === 'preparation' && id === 'rest') texture += 4;
  if (intent === 'ending' && (id === 'rest' || id === 'diminish')) texture += 3;
  return retention + rhythm + continuity + register + texture;
}

export function phraseCandidates(opening: Motif): { id: string; events: MotifNoteEvent[] }[] {
  return CANDIDATES.slice(0, 12).map((spec) => {
    if (!spec.op) return { id: spec.id, events: opening.events.map((event) => ({ ...event })) };
    const applied = applyOperator(opening, spec.op, spec.params);
    return { id: spec.id, events: applied.motif.events.map((event) => ({ ...event })) };
  });
}

export function choosePhraseSpan(
  span: number,
  intent: PianoPhraseIntent,
  opening: Motif,
  previousPitch: number,
): PhraseSpanChoice & { events: MotifNoteEvent[] } {
  const candidates = phraseCandidates(opening);
  const scored = candidates.map((candidate) => ({
    id: candidate.id,
    score: scorePhraseCandidate(intent, candidate.id, candidate.events, opening.events, previousPitch),
    events: candidate.events,
  }));
  scored.sort((a, b) => b.score - a.score || candidates.findIndex((item) => item.id === a.id) - candidates.findIndex((item) => item.id === b.id));
  const winner = scored[0]!;
  return {
    span,
    bars: [span * 2 + 1, span * 2 + 2],
    intent,
    chosen: winner.id,
    candidates: scored.map((item) => ({ id: item.id, score: item.score })),
    events: winner.events,
  };
}

export function eventsForPhraseBar(
  intent: PianoPhraseIntent,
  opening: Motif,
  chosenEvents: readonly MotifNoteEvent[],
  tonicMidi: number,
): { id: string; events: MotifNoteEvent[] } {
  if (intent === 'statement' || intent === 'return') {
    return { id: 'identity', events: opening.events.map((event) => ({ ...event })) };
  }
  if (intent === 'continuation') {
    const sequenced = phraseCandidates(opening).find((item) => item.id === 'sequence-up');
    return sequenced ?? { id: 'identity', events: opening.events.map((event) => ({ ...event })) };
  }
  if (intent === 'ending') {
    return {
      id: 'ending-rest',
      events: [
        { onset: 0, duration: 0.5, midi: null },
        { onset: 0.5, duration: 1, midi: tonicMidi },
      ],
    };
  }
  return { id: 'chosen', events: chosenEvents.map((event) => ({ ...event })) };
}

export function rhythmSignature(events: readonly { duration: number; midi: number | null }[]): number[] {
  return events.filter((event) => event.midi !== null).map((event) => event.duration);
}
