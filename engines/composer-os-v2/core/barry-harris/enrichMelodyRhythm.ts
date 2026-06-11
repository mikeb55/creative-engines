/**
 * V85 Phase 3 - BH melody rhythm enrichment (onsets only; pitches locked).
 * Replaces V83d Phase 2 interior onset logic with cell library selection.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { isStrongBeat } from './voicingEngine';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';
import {
  BEATS_PER_BAR,
  type BhCellFamily,
  type BhRhythmEnrichmentMeta,
  deriveBhMelodyRhythmSeed,
  interiorOnsetFromCellLibrary,
  melodyIoiEntropy,
  mulberry32,
  pickWeightedTemplate,
  resolveBhMelodyOnsetCollisionsSmart,
  selectRhythmCellForNote,
} from './bhRhythmCellLibrary';

// Re-export Phase 3 metrics so callers import from one place.
export {
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
} from './bhRhythmCellLibrary';
export type { BhRhythmEnrichmentMeta, BhCellFamily } from './bhRhythmCellLibrary';

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

/** Rest / breath / skipped-bar boundary - not normal within-bar harmonic rhythm. */
function isRestLikePhraseBreak(prev: ImportMelodyNote, curr: ImportMelodyNote): boolean {
  if (curr.bar > prev.bar + 1) return true;
  const gap = ioiBeats(prev, curr);
  const silence = silentGapBeats(prev, curr);
  if (silence >= REST_SILENCE_BEATS) return true;
  if (gap >= BEATS_PER_BAR + 0.5) return true;
  if (prev.durationBeats >= LONG_NOTE_BEATS && silence >= 1) return true;
  return false;
}

/** Phrase boundaries from rests / long IOIs - not fixed indices. */
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

function indexInPhrase(melody: readonly ImportMelodyNote[], index: number, roles: PhraseRoles): number {
  let start = 0;
  for (const s of [...roles.phraseStarts].sort((a, b) => a - b)) {
    if (s <= index) start = s;
    else break;
  }
  return index - start;
}

function phraseLengthAt(index: number, roles: PhraseRoles, total: number): number {
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

function isOffbeatOnset(onsetBeat: number): boolean {
  return Math.abs(onsetBeat - Math.round(onsetBeat)) > 0.11;
}

function trimOffbeatOverflow(notes: readonly ImportMelodyNote[], roles: PhraseRoles): ImportMelodyNote[] {
  let out = [...notes];
  for (let pass = 0; pass < 6; pass++) {
    if (melodyOffbeatRatio(out) <= 0.74) break;
    const idx = out.findIndex((n, i) => !isStructuralLandingIndex(i, roles) && isOffbeatOnset(n.onsetBeat));
    if (idx < 0) break;
    const beat = ((out[idx]!.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const anchor = beat < 1.5 ? 0 : beat < 3.5 ? 2 : 0;
    out = out.map((n, i) => (i === idx ? { ...n, onsetBeat: anchor } : n));
  }
  return resolveBhMelodyOnsetCollisionsSmart(out);
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
 * Returns same pitch sequence with BH-profile onsets only (V85 Phase 3 - cell library).
 * Throws if output pitches diverge from input (preservePitchSequence contract).
 */
export function enrichMelodyRhythm(
  melody: readonly ImportMelodyNote[],
  profile: BhMelodyRhythmProfile,
  options?: { seed?: number; meta?: BhRhythmEnrichmentMeta }
): ImportMelodyNote[] {
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  const roles = detectPhraseRoles(ordered);

  const baseSeed = options?.seed ?? 88109;
  const recentFamilies: BhCellFamily[] = [];
  const familyCounts: Partial<Record<BhCellFamily, number>> = {};
  let offbeatCount = 0;
  let interiorCount = 0;

  const barNoteCounts = new Map<number, number>();
  for (const n of ordered) barNoteCounts.set(n.bar, (barNoteCounts.get(n.bar) ?? 0) + 1);
  const barNoteSeen = new Map<number, number>();

  const withOnsets = ordered.map((note, index) => {
    if (isStructuralLandingIndex(index, roles)) {
      return { ...note, onsetBeat: structuralLandingOnset(note, index, roles), fieldOrigin: note.fieldOrigin };
    }

    // Cell-library interior onset
    const phraseIdx = indexInPhrase(ordered, index, roles);
    const phrLen = phraseLengthAt(index, roles, ordered.length);
    const projectedOffbeatRate =
      interiorCount > 0 ? offbeatCount / interiorCount : 0;

    const noteSeed = deriveBhMelodyRhythmSeed(baseSeed, index);
    const rand = mulberry32(noteSeed);

    const family = selectRhythmCellForNote(
      profile.syncopationShiftRate,
      profile.anticipationBias,
      phraseIdx,
      phrLen,
      recentFamilies.slice(-7),
      projectedOffbeatRate,
      rand
    );
    const template = pickWeightedTemplate(family, recentFamilies, rand);
    let onsetBeat = interiorOnsetFromCellLibrary(note.onsetBeat, family, template);
    const inBarIndex = barNoteSeen.get(note.bar) ?? 0;
    barNoteSeen.set(note.bar, inBarIndex + 1);
    const barCount = barNoteCounts.get(note.bar) ?? 1;
    const barSlotsFirst = [2.5, 2.75, 2.67];
    const barSlotsSecond = [3.0, 3.25, 3.5, 3.75];
    if (barCount >= 2 && inBarIndex === 0 && onsetBeat > 2.75) {
      onsetBeat = barSlotsFirst[(note.bar + index) % barSlotsFirst.length]!;
    }
    if (barCount >= 2 && inBarIndex === 1 && onsetBeat <= 2.75) {
      onsetBeat = barSlotsSecond[(note.bar + index) % barSlotsSecond.length]!;
    }

    recentFamilies.push(family);
    if (recentFamilies.length > 20) recentFamilies.shift();
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
    interiorCount++;

    const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const onQuarter =
      Math.abs(beat) < 0.05 ||
      Math.abs(beat - 1) < 0.05 ||
      Math.abs(beat - 2) < 0.05 ||
      Math.abs(beat - 3) < 0.05;
    if (!onQuarter) offbeatCount++;

    return { ...note, onsetBeat, fieldOrigin: note.fieldOrigin };
  });

  let collisionFree = resolveBhMelodyOnsetCollisionsSmart(withOnsets);
  collisionFree = trimOffbeatOverflow(collisionFree, roles);

  const withDuration = collisionFree.map((note) => ({
    ...note,
    durationBeats: holdDurationToNext(note, collisionFree),
  }));

  assertPreservePitchSequence(ordered, withDuration);

  // Populate meta if provided
  if (options?.meta) {
    const m = options.meta;
    m.familyCounts = familyCounts;
    m.totalNotes = ordered.length;
    m.offbeatRatio = interiorCount > 0 ? offbeatCount / interiorCount : 0;
    m.ioiEntropy = melodyIoiEntropy(withDuration);
    let maxCount = 0;
    let dominant: BhCellFamily | undefined;
    for (const [f, c] of Object.entries(familyCounts) as [BhCellFamily, number][]) {
      if (c > maxCount) {
        maxCount = c;
        dominant = f;
      }
    }
    m.dominantFamily = dominant;
  }

  return withDuration;
}

// ---------------------------------------------------------------------------
// Phase 2 metrics (preserved from V83d Phase 2)
// ---------------------------------------------------------------------------

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