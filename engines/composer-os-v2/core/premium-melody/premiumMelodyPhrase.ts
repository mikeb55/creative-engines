import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { BEATS_PER_BAR } from './premiumMelodyCellLibrary';
import {
  PREMIUM_MELODY_DEFAULT_LONG_NOTE_PHRASE_BREAK_BEATS,
  PREMIUM_MELODY_DEFAULT_REST_PHRASE_BREAK_BEATS,
  PREMIUM_MELODY_DEFAULT_STRUCTURAL_LANDING_MODE,
  type PremiumMelodyStructuralLandingMode,
} from './premiumMelodyProfile';

export type PremiumMelodyPhraseDetectionOptions = {
  restPhraseBreakBeats?: number;
  longNotePhraseBreakBeats?: number;
};

export type PremiumMelodyPhraseRoles = {
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

/** Rest / breath / skipped-bar boundary - not normal within-bar harmonic rhythm. */
function isRestLikePhraseBreak(
  prev: ImportMelodyNote,
  curr: ImportMelodyNote,
  restPhraseBreakBeats: number,
  longNotePhraseBreakBeats: number
): boolean {
  if (curr.bar > prev.bar + 1) return true;
  const gap = ioiBeats(prev, curr);
  const silence = silentGapBeats(prev, curr);
  if (silence >= restPhraseBreakBeats) return true;
  if (gap >= BEATS_PER_BAR + 0.5) return true;
  if (prev.durationBeats >= longNotePhraseBreakBeats && silence >= 1) return true;
  return false;
}

/** Phrase boundaries from rests / long IOIs - not fixed indices. */
export function detectPhraseRoles(
  melody: readonly ImportMelodyNote[],
  options?: PremiumMelodyPhraseDetectionOptions
): PremiumMelodyPhraseRoles {
  const restPhraseBreakBeats =
    options?.restPhraseBreakBeats ?? PREMIUM_MELODY_DEFAULT_REST_PHRASE_BREAK_BEATS;
  const longNotePhraseBreakBeats =
    options?.longNotePhraseBreakBeats ?? PREMIUM_MELODY_DEFAULT_LONG_NOTE_PHRASE_BREAK_BEATS;

  const phraseStarts = new Set<number>();
  const phraseEnds = new Set<number>();
  if (melody.length === 0) return { phraseStarts, phraseEnds };

  phraseStarts.add(0);
  phraseEnds.add(melody.length - 1);

  for (let i = 1; i < melody.length; i++) {
    const prev = melody[i - 1]!;
    const curr = melody[i]!;
    if (isRestLikePhraseBreak(prev, curr, restPhraseBreakBeats, longNotePhraseBreakBeats)) {
      phraseStarts.add(i);
      phraseEnds.add(i - 1);
    }
  }

  return { phraseStarts, phraseEnds };
}

export function isStructuralLandingIndex(index: number, roles: PremiumMelodyPhraseRoles): boolean {
  return roles.phraseStarts.has(index) || roles.phraseEnds.has(index);
}

/** Beat 1 or beat 3 (0-indexed 0 or 2) - structural anchor grid. */
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

function structuralLandingOnsetBhGrounded(
  note: ImportMelodyNote,
  index: number,
  roles: PremiumMelodyPhraseRoles
): number {
  const beat = ((note.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;

  if (roles.phraseStarts.has(index)) {
    if (beat < 0.75) return 0;
    if (beat >= 2.75) return 2;
    return nearestStructuralBeat(note.onsetBeat);
  }

  if (roles.phraseEnds.has(index)) {
    if (isPremiumMelodyStrongBeat(note.onsetBeat)) return note.onsetBeat;
    return nearestStructuralBeat(note.onsetBeat);
  }

  return nearestStructuralBeat(note.onsetBeat);
}

export function structuralLandingOnset(
  note: ImportMelodyNote,
  index: number,
  roles: PremiumMelodyPhraseRoles,
  mode: PremiumMelodyStructuralLandingMode = PREMIUM_MELODY_DEFAULT_STRUCTURAL_LANDING_MODE
): number {
  switch (mode) {
    case 'bh_grounded':
      return structuralLandingOnsetBhGrounded(note, index, roles);
    default: {
      const _exhaustive: never = mode;
      return structuralLandingOnsetBhGrounded(note, index, roles);
    }
  }
}

export function indexInPhrase(
  melody: readonly ImportMelodyNote[],
  index: number,
  roles: PremiumMelodyPhraseRoles
): number {
  let start = 0;
  for (const s of [...roles.phraseStarts].sort((a, b) => a - b)) {
    if (s <= index) start = s;
    else break;
  }
  return index - start;
}

export function phraseLengthAt(index: number, roles: PremiumMelodyPhraseRoles, total: number): number {
  const starts = [...roles.phraseStarts].sort((a, b) => a - b);
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]!;
    if (s > index) {
      return s - (starts[i - 1] ?? 0);
    }
  }
  const lastStart = starts[starts.length - 1] ?? 0;
  return total - lastStart;
}

export function isOffbeatOnset(onsetBeat: number): boolean {
  return Math.abs(onsetBeat - Math.round(onsetBeat)) > 0.11;
}

/**
 * Strong beats (beats 1 and 3 in 4/4).
 * Intentionally duplicated from barry-harris/voicingEngine — do NOT import voicingEngine here;
 * preserves shared-engine isolation boundary.
 */
export function isPremiumMelodyStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}
