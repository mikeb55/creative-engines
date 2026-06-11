/**
 * Shared premium-melody rhythm enrichment (onsets only; pitches locked).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyProfile } from './premiumMelodyProfile';
import {
  PREMIUM_MELODY_DEFAULT_BAR_SLOT_NUDGES_ENABLED,
  PREMIUM_MELODY_DEFAULT_OFFBEAT_TRIM_CEILING,
  PREMIUM_MELODY_DEFAULT_PROJECTED_OFFBEAT_BLOCK_THRESHOLD,
  PREMIUM_MELODY_DEFAULT_RHYTHM_SEED_SALT,
  PREMIUM_MELODY_DEFAULT_STRUCTURAL_LANDING_MODE,
} from './premiumMelodyProfile';
import {
  BEATS_PER_BAR,
  type PremiumMelodyCellFamily,
  type PremiumMelodyRhythmEnrichmentMeta,
  interiorOnsetFromCellLibrary,
  pickWeightedTemplate,
  selectRhythmCellForNote,
} from './premiumMelodyCellLibrary';
import { resolvePremiumMelodyOnsetCollisionsSmart } from './premiumMelodyCollision';
import { deriveMelodyRhythmSeed, mulberry32 } from './premiumMelodyPrng';
import { melodyIoiEntropy } from './premiumMelodyMetrics';
import {
  detectPhraseRoles,
  indexInPhrase,
  isOffbeatOnset,
  isStructuralLandingIndex,
  phraseLengthAt,
  structuralLandingOnset,
} from './premiumMelodyPhrase';

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

function trimOffbeatOverflow(
  notes: readonly ImportMelodyNote[],
  roles: ReturnType<typeof detectPhraseRoles>,
  offbeatTrimCeiling: number
): ImportMelodyNote[] {
  let out = [...notes];
  for (let pass = 0; pass < 6; pass++) {
    if (melodyOffbeatRatio(out) <= offbeatTrimCeiling) break;
    const idx = out.findIndex((n, i) => !isStructuralLandingIndex(i, roles) && isOffbeatOnset(n.onsetBeat));
    if (idx < 0) break;
    const beat = ((out[idx]!.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const anchor = beat < 1.5 ? 0 : beat < 3.5 ? 2 : 0;
    out = out.map((n, i) => (i === idx ? { ...n, onsetBeat: anchor } : n));
  }
  return resolvePremiumMelodyOnsetCollisionsSmart(out);
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

/** Fraction of attacks on non-integer beats. */
export function melodyOffbeatRatio(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  let offbeat = 0;
  for (const n of melody) {
    if (Math.abs(n.onsetBeat - Math.round(n.onsetBeat)) > 0.11) offbeat++;
  }
  return offbeat / melody.length;
}

/**
 * Returns same pitch sequence with profile onsets only (cell library).
 * Throws if output pitches diverge from input (preservePitchSequence contract).
 */
export function enrichMelodyRhythm(
  melody: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  options?: { seed?: number; meta?: PremiumMelodyRhythmEnrichmentMeta }
): ImportMelodyNote[] {
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  const offbeatTrimCeiling = profile.offbeatTrimCeiling ?? PREMIUM_MELODY_DEFAULT_OFFBEAT_TRIM_CEILING;
  const barSlotNudgesEnabled =
    profile.barSlotNudgesEnabled ?? PREMIUM_MELODY_DEFAULT_BAR_SLOT_NUDGES_ENABLED;
  const structuralLandingMode =
    profile.structuralLandingMode ?? PREMIUM_MELODY_DEFAULT_STRUCTURAL_LANDING_MODE;
  const projectedOffbeatBlockThreshold =
    profile.projectedOffbeatBlockThreshold ?? PREMIUM_MELODY_DEFAULT_PROJECTED_OFFBEAT_BLOCK_THRESHOLD;
  const rhythmSeedSalt = profile.rhythmSeedSalt ?? PREMIUM_MELODY_DEFAULT_RHYTHM_SEED_SALT;

  const roles = detectPhraseRoles(ordered, {
    restPhraseBreakBeats: profile.restPhraseBreakBeats,
    longNotePhraseBreakBeats: profile.longNotePhraseBreakBeats,
  });

  const baseSeed = options?.seed ?? 88109;
  const recentFamilies: PremiumMelodyCellFamily[] = [];
  const familyCounts: Partial<Record<PremiumMelodyCellFamily, number>> = {};
  let offbeatCount = 0;
  let interiorCount = 0;

  const barNoteCounts = new Map<number, number>();
  for (const n of ordered) barNoteCounts.set(n.bar, (barNoteCounts.get(n.bar) ?? 0) + 1);
  const barNoteSeen = new Map<number, number>();

  const withOnsets = ordered.map((note, index) => {
    if (isStructuralLandingIndex(index, roles)) {
      return {
        ...note,
        onsetBeat: structuralLandingOnset(note, index, roles, structuralLandingMode),
        fieldOrigin: note.fieldOrigin,
      };
    }

    const phraseIdx = indexInPhrase(ordered, index, roles);
    const phrLen = phraseLengthAt(index, roles, ordered.length);
    const projectedOffbeatRate = interiorCount > 0 ? offbeatCount / interiorCount : 0;

    const noteSeed = deriveMelodyRhythmSeed(baseSeed, index, rhythmSeedSalt);
    const rand = mulberry32(noteSeed);

    const family = selectRhythmCellForNote(
      profile.syncopationShiftRate,
      profile.anticipationBias,
      phraseIdx,
      phrLen,
      recentFamilies.slice(-7),
      projectedOffbeatRate,
      rand,
      projectedOffbeatBlockThreshold
    );
    const template = pickWeightedTemplate(family, recentFamilies, rand);
    let onsetBeat = interiorOnsetFromCellLibrary(note.onsetBeat, family, template);
    const inBarIndex = barNoteSeen.get(note.bar) ?? 0;
    barNoteSeen.set(note.bar, inBarIndex + 1);
    const barCount = barNoteCounts.get(note.bar) ?? 1;
    const barSlotsFirst = [2.5, 2.75, 2.67];
    const barSlotsSecond = [3.0, 3.25, 3.5, 3.75];
    if (barSlotNudgesEnabled && barCount >= 2 && inBarIndex === 0 && onsetBeat > 2.75) {
      onsetBeat = barSlotsFirst[(note.bar + index) % barSlotsFirst.length]!;
    }
    if (barSlotNudgesEnabled && barCount >= 2 && inBarIndex === 1 && onsetBeat <= 2.75) {
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

  let collisionFree = resolvePremiumMelodyOnsetCollisionsSmart(withOnsets);
  collisionFree = trimOffbeatOverflow(collisionFree, roles, offbeatTrimCeiling);

  const withDuration = collisionFree.map((note) => ({
    ...note,
    durationBeats: holdDurationToNext(note, collisionFree),
  }));

  assertPreservePitchSequence(ordered, withDuration);

  if (options?.meta) {
    const m = options.meta;
    m.familyCounts = familyCounts;
    m.totalNotes = ordered.length;
    m.offbeatRatio = interiorCount > 0 ? offbeatCount / interiorCount : 0;
    m.ioiEntropy = melodyIoiEntropy(withDuration);
    let maxCount = 0;
    let dominant: PremiumMelodyCellFamily | undefined;
    for (const [f, c] of Object.entries(familyCounts) as [PremiumMelodyCellFamily, number][]) {
      if (c > maxCount) {
        maxCount = c;
        dominant = f;
      }
    }
    m.dominantFamily = dominant;
  }

  return withDuration;
}
