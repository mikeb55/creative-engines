/**
 * V83d Phase 2 - BH melody rhythm enrichment (onsets only; pitches locked).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { isStrongBeat, isWeakBeat } from './voicingEngine';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';

export class PreservePitchSequenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreservePitchSequenceError';
  }
}

export function assertPreservePitchSequence(
  input: readonly ImportMelodyNote[],
  output: readonly ImportMelodyNote[]
): void {
  if (input.length !== output.length) {
    throw new PreservePitchSequenceError(
      `pitch count mismatch: input=${input.length} output=${output.length}`
    );
  }
  for (let i = 0; i < input.length; i++) {
    if (input[i]!.midiPitch !== output[i]!.midiPitch) {
      throw new PreservePitchSequenceError(
        `pitch diverged at index ${i}: input=${input[i]!.midiPitch} output=${output[i]!.midiPitch}`
      );
    }
  }
}

const BEATS_PER_BAR = 4;
const LONG_NOTE_BEATS = 1.25;
const REST_SILENCE_BEATS = 1.75;

type PhraseRoles = {
  phraseStarts: Set<number>;
  phraseEnds: Set<number>;
};

function absoluteOnsetBeats(note: ImportMelodyNote): number {
  return note.bar * BEATS_PER_BAR + note.onsetBeat;
}

function ioiBeats(prev: ImportMelodyNote, curr: ImportMelodyNote): number {
  return absoluteOnsetBeats(curr) - absoluteOnsetBeats(prev);
}

function silentGapBeats(prev: ImportMelodyNote, curr: ImportMelodyNote): number {
  const prevEnd = absoluteOnsetBeats(prev) + prev.durationBeats;
  return absoluteOnsetBeats(curr) - prevEnd;
}

/** Rest / breath / skipped-bar boundary — not normal within-bar harmonic rhythm. */
function isRestLikePhraseBreak(prev: ImportMelodyNote, curr: ImportMelodyNote): boolean {
  if (curr.bar > prev.bar + 1) return true;
  const gap = ioiBeats(prev, curr);
  const silence = silentGapBeats(prev, curr);
  if (silence >= REST_SILENCE_BEATS) return true;
  if (gap >= BEATS_PER_BAR + 0.5) return true;
  if (prev.durationBeats >= LONG_NOTE_BEATS && silence >= 1) return true;
  return false;
}

/** Phrase boundaries from rests / long IOIs / phrase starts — not fixed indices. */
function detectPhraseRoles(melody: readonly ImportMelodyNote[]): PhraseRoles {
  const phraseStarts = new Set<number>();
  const phraseEnds = new Set<number>();
  if (melody.length === 0) return { phraseStarts, phraseEnds };

  phraseStarts.add(0);
  phraseEnds.add(melody.length - 1);

  for (let i = 1; i < melody.length; i++) {
    const prev = melody[i - 1]!;
    const curr = melody[i]!;
    if (isRestLikePhraseBreak(prev, curr)) {
      phraseStarts.add(i);
      phraseEnds.add(i - 1);
    }
  }

  return { phraseStarts, phraseEnds };
}

function isStructuralLandingIndex(index: number, roles: PhraseRoles): boolean {
  return roles.phraseStarts.has(index) || roles.phraseEnds.has(index);
}

/** Beat 1 or beat 3 (0-indexed 0 or 2) — structural anchor grid. */
function nearestStructuralBeat(onsetBeat: number): number {
  const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  const candidates = [0, 2];
  let best = candidates[0]!;
  let bestDist = Math.abs(beat - best);
  for (const c of candidates.slice(1)) {
    const dist = Math.abs(beat - c);
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

function structuralLandingOnset(note: ImportMelodyNote, index: number, roles: PhraseRoles): number {
  const beat = ((note.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;

  if (roles.phraseStarts.has(index)) {
    if (beat < 0.75) return 0;
    if (beat >= 2.75) return 2;
    return nearestStructuralBeat(note.onsetBeat);
  }

  if (roles.phraseEnds.has(index)) {
    if (isStrongBeat(note.onsetBeat)) return note.onsetBeat;
    return nearestStructuralBeat(note.onsetBeat);
  }

  return nearestStructuralBeat(note.onsetBeat);
}

/** Interior BH enrichment — anticipation / delayed attack, not uniform displacement. */
function interiorEnrichedOnset(
  note: ImportMelodyNote,
  indexInPhrase: number,
  profile: BhMelodyRhythmProfile
): number {
  const onsetBeat = note.onsetBeat;
  const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  const useAnticipation = profile.anticipationBias >= 0.55;
  const groundedAnchor = indexInPhrase > 0 && indexInPhrase % 4 === 0;

  if (groundedAnchor && isStrongBeat(onsetBeat)) return onsetBeat;

  if (isStrongBeat(onsetBeat)) {
    if (Math.abs(beat) < 0.05) {
      return useAnticipation ? 0.5 : 0.75;
    }
    if (Math.abs(beat - 2) < 0.05) {
      return useAnticipation ? 2.5 : 2.75;
    }
  }

  if (isWeakBeat(onsetBeat)) {
    const nudge = (indexInPhrase + note.bar) % 3 !== 0;
    if (nudge) {
      const nudged = useAnticipation ? onsetBeat - 0.25 : onsetBeat + 0.25;
      if (nudged >= 0 && nudged <= BEATS_PER_BAR - 0.25) return nudged;
    }
    return onsetBeat;
  }

  return onsetBeat;
}

function indexInPhrase(melody: readonly ImportMelodyNote[], index: number, roles: PhraseRoles): number {
  let start = 0;
  for (const s of [...roles.phraseStarts].sort((a, b) => a - b)) {
    if (s <= index) start = s;
    else break;
  }
  return index - start;
}

/** Keep same-bar onsets strictly increasing (min 0.5 beat gap). */
function resolveBhMelodyOnsetCollisions(notes: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  const out: ImportMelodyNote[] = [];
  const lastOnsetByBar = new Map<number, number>();
  for (const note of notes) {
    let onsetBeat = note.onsetBeat;
    const prev = lastOnsetByBar.get(note.bar);
    if (prev != null && onsetBeat <= prev + 0.24) {
      onsetBeat = Math.min(3.75, prev + 0.5);
    }
    lastOnsetByBar.set(note.bar, onsetBeat);
    out.push({ ...note, onsetBeat });
  }
  return out;
}

function holdDurationToNext(
  note: ImportMelodyNote,
  melody: readonly ImportMelodyNote[],
  barBeats = BEATS_PER_BAR
): number {
  const idx = melody.indexOf(note);
  const next = idx >= 0 ? melody[idx + 1] : undefined;
  if (next && next.bar === note.bar && next.onsetBeat > note.onsetBeat) {
    return Math.max(0.25, next.onsetBeat - note.onsetBeat);
  }
  return Math.max(note.durationBeats, barBeats - note.onsetBeat);
}

/**
 * Returns the same pitch sequence with BH-profile onsets only.
 * Throws if output pitches diverge from input (preservePitchSequence contract).
 */
export function enrichMelodyRhythm(
  melody: readonly ImportMelodyNote[],
  profile: BhMelodyRhythmProfile
): ImportMelodyNote[] {
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  const roles = detectPhraseRoles(ordered);

  const withOnsets = ordered.map((note, index) => {
    const onsetBeat = isStructuralLandingIndex(index, roles)
      ? structuralLandingOnset(note, index, roles)
      : interiorEnrichedOnset(note, indexInPhrase(ordered, index, roles), profile);
    return { ...note, onsetBeat, fieldOrigin: note.fieldOrigin };
  });

  const collisionFree = resolveBhMelodyOnsetCollisions(withOnsets);

  const withDuration = collisionFree.map((note) => ({
    ...note,
    durationBeats: holdDurationToNext(note, collisionFree),
  }));

  assertPreservePitchSequence(ordered, withDuration);
  return withDuration;
}

/** 0-1 - attacks off the quarter grid (beats 0/1/2/3). */
export function melodySyncopationScore(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  let offGrid = 0;
  for (const n of melody) {
    const beat = ((n.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const onQuarter =
      Math.abs(beat) < 0.05 ||
      Math.abs(beat - 1) < 0.05 ||
      Math.abs(beat - 2) < 0.05 ||
      Math.abs(beat - 3) < 0.05;
    if (!onQuarter) offGrid++;
  }
  return offGrid / melody.length;
}

/** Fraction of attacks on non-integer beats (BH offbeat ratio). */
export function melodyOffbeatRatio(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  let offbeat = 0;
  for (const n of melody) {
    if (Math.abs(n.onsetBeat - Math.round(n.onsetBeat)) > 0.11) offbeat++;
  }
  return offbeat / melody.length;
}

/** At least one melody attack on beat 1 or 3 at a phrase start or cadence. */
export function melodyStructuralLandingCount(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  const roles = detectPhraseRoles(ordered);
  let count = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (!isStructuralLandingIndex(i, roles)) continue;
    if (isStrongBeat(ordered[i]!.onsetBeat)) count++;
  }
  return count;
}

/** Distinct IOI buckets (16th-quantized) across consecutive attacks. */
export function distinctMelodyIoiBuckets(melody: readonly ImportMelodyNote[]): number {
  const sorted = [...melody].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const buckets = new Set<number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const ioi = (curr.bar - prev.bar) * BEATS_PER_BAR + (curr.onsetBeat - prev.onsetBeat);
    buckets.add(Math.round(ioi * 4) / 4);
  }
  return buckets.size;
}
