/**
 * Shared premium-melody expression (articulation + velocity + export stress).
 * Operates on rhythm-enriched melody only - must NOT alter pitch, onset, or duration.
 */

import type { Articulation } from '../score-model/scoreModelTypes';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyProfile } from './premiumMelodyProfile';
import {
  PREMIUM_MELODY_DEFAULT_EXPRESSION_CHARACTER,
  PREMIUM_MELODY_DEFAULT_PROJECTED_OFFBEAT_BLOCK_THRESHOLD,
  PREMIUM_MELODY_DEFAULT_RHYTHM_SEED_SALT,
} from './premiumMelodyProfile';
import {
  BEATS_PER_BAR,
  type PremiumMelodyCellFamily,
  type PremiumMelodyRhythmEnrichmentMeta,
  pickWeightedTemplate,
  selectRhythmCellForNote,
} from './premiumMelodyCellLibrary';
import { deriveMelodyRhythmSeed, mulberry32 } from './premiumMelodyPrng';
import {
  detectPhraseRoles,
  indexInPhrase,
  isOffbeatOnset,
  isStructuralLandingIndex,
  phraseLengthAt,
  type PremiumMelodyPhraseRoles,
} from './premiumMelodyPhrase';

export type PremiumMelodyDurationAccentKind = 'none' | 'stress';

export interface PremiumMelodyExpressiveNote extends ImportMelodyNote {
  articulation?: Articulation;
  velocity?: number;
  durationAccent?: PremiumMelodyDurationAccentKind;
}

export interface PremiumMelodyExpressionEnrichmentMeta {
  articulationCounts: Partial<Record<Articulation, number>>;
  durationAccentCount: number;
  velocityMin: number;
  velocityMax: number;
  perPhraseVelocitySpread: number;
  structuralLandingAccentHits: number;
  structuralLandingTotal: number;
}

export class PreserveMelodyTimingGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreserveMelodyTimingGridError';
  }
}

const VELOCITY_MIN = 58;
const VELOCITY_MAX = 108;
const VELOCITY_BASE = 74;
const VELOCITY_PEAK = 96;
const VELOCITY_CADENCE = 80;

/** PROVISIONAL (V86 2-pre-2) — tune in Wayne 2b. */
const MODAL_LYRIC_VELOCITY_MIN = 62;
const MODAL_LYRIC_VELOCITY_MAX = 92;
const MODAL_LYRIC_VELOCITY_BASE = 70;
const MODAL_LYRIC_VELOCITY_PEAK = 84;
const MODAL_LYRIC_VELOCITY_CADENCE = 76;

function sortMelody(notes: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  return [...notes].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
}

function timingGridKey(note: ImportMelodyNote): string {
  return `${note.bar}:${note.onsetBeat.toFixed(4)}:${note.durationBeats.toFixed(4)}:${note.midiPitch}`;
}

export function assertPreserveMelodyTimingGrid(
  rhythmMelody: readonly ImportMelodyNote[],
  expressiveMelody: readonly PremiumMelodyExpressiveNote[]
): void {
  if (rhythmMelody.length !== expressiveMelody.length) {
    throw new PreserveMelodyTimingGridError(
      `note count mismatch: rhythm=${rhythmMelody.length} expressive=${expressiveMelody.length}`
    );
  }
  const rhythm = sortMelody(rhythmMelody);
  const expressive = sortMelody(expressiveMelody);
  for (let i = 0; i < rhythm.length; i++) {
    if (timingGridKey(rhythm[i]!) !== timingGridKey(expressive[i]!)) {
      throw new PreserveMelodyTimingGridError(
        `timing grid diverged at index ${i}: rhythm=${timingGridKey(rhythm[i]!)} expressive=${timingGridKey(expressive[i]!)}`
      );
    }
  }
}

function ioiToNext(melody: readonly ImportMelodyNote[], index: number): number {
  const curr = melody[index]!;
  const next = melody[index + 1];
  if (!next) return BEATS_PER_BAR - curr.onsetBeat;
  if (next.bar !== curr.bar) {
    return BEATS_PER_BAR - curr.onsetBeat + next.onsetBeat + (next.bar - curr.bar - 1) * BEATS_PER_BAR;
  }
  return next.onsetBeat - curr.onsetBeat;
}

function replayCellFamilies(
  ordered: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  roles: PremiumMelodyPhraseRoles,
  baseSeed: number,
  rhythmSeedSalt: number,
  projectedOffbeatBlockThreshold: number
): (PremiumMelodyCellFamily | 'structural')[] {
  const recentFamilies: PremiumMelodyCellFamily[] = [];
  let offbeatCount = 0;
  let interiorCount = 0;

  return ordered.map((note, index) => {
    if (isStructuralLandingIndex(index, roles)) return 'structural';

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
    pickWeightedTemplate(family, recentFamilies, rand);
    recentFamilies.push(family);
    if (recentFamilies.length > 20) recentFamilies.shift();
    interiorCount++;
    if (isOffbeatOnset(note.onsetBeat)) offbeatCount++;
    return family;
  });
}

function phraseArcVelocity(
  indexInPhrase: number,
  phraseLen: number,
  isLanding: boolean,
  rand01: number
): number {
  if (phraseLen <= 1) return VELOCITY_BASE;
  const t = indexInPhrase / Math.max(1, phraseLen - 1);
  let v: number;
  if (isLanding) {
    v = VELOCITY_CADENCE + rand01 * 4;
  } else if (t < 0.2) {
    v = VELOCITY_BASE + t * 20;
  } else if (t > 0.82) {
    v = VELOCITY_PEAK - (t - 0.82) * 55;
  } else {
    const peakT = 0.55;
    const dist = Math.abs(t - peakT);
    v = VELOCITY_PEAK - dist * 18 + rand01 * 6;
  }
  return Math.round(Math.min(VELOCITY_MAX, Math.max(VELOCITY_MIN, v)));
}

/** PROVISIONAL (V86 2-pre-2) — softer arc; tune in Wayne 2b. */
function phraseArcVelocityModalLyric(
  indexInPhrase: number,
  phraseLen: number,
  isLanding: boolean,
  rand01: number
): number {
  if (phraseLen <= 1) return MODAL_LYRIC_VELOCITY_BASE;
  const t = indexInPhrase / Math.max(1, phraseLen - 1);
  let v: number;
  if (isLanding) {
    v = MODAL_LYRIC_VELOCITY_CADENCE + rand01 * 2;
  } else if (t < 0.25) {
    v = MODAL_LYRIC_VELOCITY_BASE + t * 10;
  } else if (t > 0.85) {
    v = MODAL_LYRIC_VELOCITY_PEAK - (t - 0.85) * 28;
  } else {
    const peakT = 0.5;
    const dist = Math.abs(t - peakT);
    v = MODAL_LYRIC_VELOCITY_PEAK - dist * 10 + rand01 * 3;
  }
  return Math.round(
    Math.min(MODAL_LYRIC_VELOCITY_MAX, Math.max(MODAL_LYRIC_VELOCITY_MIN, v))
  );
}

function assignArticulation(
  family: PremiumMelodyCellFamily | 'structural',
  isLanding: boolean,
  shortOffbeat: boolean,
  runningInterior: boolean
): Articulation {
  if (isLanding) return 'accent';
  if (shortOffbeat && (family === 'triplet_pickup' || family === 'anticipate' || family === 'delayed')) {
    return 'staccato';
  }
  if (family === 'long_gap') return 'staccato';
  if (runningInterior && (family === 'and_of_2' || family === 'dotted')) return 'tenuto';
  if (family === 'anticipate' || family === 'and_of_2') return 'tenuto';
  if (family === 'delayed' || family === 'dotted') return 'tenuto';
  if (family === 'triplet_pickup') return 'staccato';
  return 'tenuto';
}

/** PROVISIONAL (V86 2-pre-2) — lighter articulation weighting; tune in Wayne 2b. */
function assignArticulationModalLyric(
  family: PremiumMelodyCellFamily | 'structural',
  isLanding: boolean,
  shortOffbeat: boolean,
  runningInterior: boolean
): Articulation {
  if (isLanding) return 'tenuto';
  if (shortOffbeat && family === 'triplet_pickup') return 'staccato';
  if (runningInterior && (family === 'and_of_2' || family === 'dotted')) return 'tenuto';
  if (family === 'anticipate' || family === 'and_of_2' || family === 'delayed' || family === 'dotted') {
    return 'tenuto';
  }
  return 'tenuto';
}

function isRunningInterior(
  ordered: readonly ImportMelodyNote[],
  index: number,
  roles: PremiumMelodyPhraseRoles
): boolean {
  if (isStructuralLandingIndex(index, roles)) return false;
  const prev = index > 0 && !isStructuralLandingIndex(index - 1, roles);
  const next = index + 1 < ordered.length && !isStructuralLandingIndex(index + 1, roles);
  return prev || next;
}

export function enrichMelodyExpression(
  rhythmMelody: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  options?: {
    seed?: number;
    rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta;
    meta?: PremiumMelodyExpressionEnrichmentMeta;
  }
): PremiumMelodyExpressiveNote[] {
  const ordered = sortMelody(rhythmMelody);
  const roles = detectPhraseRoles(ordered, {
    restPhraseBreakBeats: profile.restPhraseBreakBeats,
    longNotePhraseBreakBeats: profile.longNotePhraseBreakBeats,
  });
  const baseSeed = options?.seed ?? 88109;
  const rhythmSeedSalt = profile.rhythmSeedSalt ?? PREMIUM_MELODY_DEFAULT_RHYTHM_SEED_SALT;
  const projectedOffbeatBlockThreshold =
    profile.projectedOffbeatBlockThreshold ?? PREMIUM_MELODY_DEFAULT_PROJECTED_OFFBEAT_BLOCK_THRESHOLD;
  const expressionCharacter = profile.expressionCharacter ?? PREMIUM_MELODY_DEFAULT_EXPRESSION_CHARACTER;
  const families = replayCellFamilies(
    ordered,
    profile,
    roles,
    baseSeed,
    rhythmSeedSalt,
    projectedOffbeatBlockThreshold
  );

  const articulationCounts: Partial<Record<Articulation, number>> = {};
  let durationAccentCount = 0;
  let velocityMin = VELOCITY_MAX;
  let velocityMax = VELOCITY_MIN;
  let structuralLandingAccentHits = 0;
  let structuralLandingTotal = 0;
  const phraseVelocitySpreads: number[] = [];
  const phraseVelocities = new Map<number, number[]>();

  const out: PremiumMelodyExpressiveNote[] = ordered.map((note, index) => {
    switch (expressionCharacter) {
      case 'bh_bebop': {
        const family = families[index]!;
        const isLanding = isStructuralLandingIndex(index, roles);
        const phraseIdx = indexInPhrase(ordered, index, roles);
        const phraseLen = phraseLengthAt(index, roles, ordered.length);
        const noteSeed = deriveMelodyRhythmSeed(baseSeed, index + 10007, rhythmSeedSalt);
        const rand = mulberry32(noteSeed);

        const ioi = ioiToNext(ordered, index);
        const shortOffbeat = isOffbeatOnset(note.onsetBeat) && ioi <= 0.75 && note.durationBeats <= 0.75;
        const running = isRunningInterior(ordered, index, roles);

        const articulation = assignArticulation(family, isLanding, shortOffbeat, running);
        articulationCounts[articulation] = (articulationCounts[articulation] ?? 0) + 1;

        if (isLanding) {
          structuralLandingTotal++;
          if (articulation === 'accent') structuralLandingAccentHits++;
        }

        const velocity = phraseArcVelocity(phraseIdx, phraseLen, isLanding, rand());
        velocityMin = Math.min(velocityMin, velocity);
        velocityMax = Math.max(velocityMax, velocity);

        const sortedPhraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);
        let phraseKey = 0;
        for (const start of sortedPhraseStarts) {
          if (start <= index) phraseKey = start;
          else break;
        }
        const bucket = phraseVelocities.get(phraseKey) ?? [];
        bucket.push(velocity);
        phraseVelocities.set(phraseKey, bucket);

        let durationAccent: PremiumMelodyDurationAccentKind = 'none';
        if (isLanding || (phraseIdx === Math.floor(phraseLen * 0.55) && articulation === 'tenuto')) {
          durationAccent = 'stress';
          durationAccentCount++;
        } else if (shortOffbeat && articulation === 'staccato') {
          durationAccent = 'stress';
          durationAccentCount++;
        }

        return {
          ...note,
          articulation,
          velocity,
          durationAccent,
        };
      }
      case 'modal_lyric': {
        const family = families[index]!;
        const isLanding = isStructuralLandingIndex(index, roles);
        const phraseIdx = indexInPhrase(ordered, index, roles);
        const phraseLen = phraseLengthAt(index, roles, ordered.length);
        const noteSeed = deriveMelodyRhythmSeed(baseSeed, index + 10007, rhythmSeedSalt);
        const rand = mulberry32(noteSeed);

        const ioi = ioiToNext(ordered, index);
        const shortOffbeat = isOffbeatOnset(note.onsetBeat) && ioi <= 0.75 && note.durationBeats <= 0.75;
        const running = isRunningInterior(ordered, index, roles);

        const articulation = assignArticulationModalLyric(family, isLanding, shortOffbeat, running);
        articulationCounts[articulation] = (articulationCounts[articulation] ?? 0) + 1;

        if (isLanding) {
          structuralLandingTotal++;
          if (articulation === 'accent') structuralLandingAccentHits++;
        }

        const velocity = phraseArcVelocityModalLyric(phraseIdx, phraseLen, isLanding, rand());
        velocityMin = Math.min(velocityMin, velocity);
        velocityMax = Math.max(velocityMax, velocity);

        const sortedPhraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);
        let phraseKey = 0;
        for (const start of sortedPhraseStarts) {
          if (start <= index) phraseKey = start;
          else break;
        }
        const bucket = phraseVelocities.get(phraseKey) ?? [];
        bucket.push(velocity);
        phraseVelocities.set(phraseKey, bucket);

        let durationAccent: PremiumMelodyDurationAccentKind = 'none';
        if (isLanding && articulation === 'tenuto') {
          durationAccent = 'stress';
          durationAccentCount++;
        }

        return {
          ...note,
          articulation,
          velocity,
          durationAccent,
        };
      }
      default: {
        const _exhaustive: never = expressionCharacter;
        void _exhaustive;
        const family = families[index]!;
        const isLanding = isStructuralLandingIndex(index, roles);
        const phraseIdx = indexInPhrase(ordered, index, roles);
        const phraseLen = phraseLengthAt(index, roles, ordered.length);
        const noteSeed = deriveMelodyRhythmSeed(baseSeed, index + 10007, rhythmSeedSalt);
        const rand = mulberry32(noteSeed);

        const ioi = ioiToNext(ordered, index);
        const shortOffbeat = isOffbeatOnset(note.onsetBeat) && ioi <= 0.75 && note.durationBeats <= 0.75;
        const running = isRunningInterior(ordered, index, roles);

        const articulation = assignArticulation(family, isLanding, shortOffbeat, running);
        articulationCounts[articulation] = (articulationCounts[articulation] ?? 0) + 1;

        if (isLanding) {
          structuralLandingTotal++;
          if (articulation === 'accent') structuralLandingAccentHits++;
        }

        const velocity = phraseArcVelocity(phraseIdx, phraseLen, isLanding, rand());
        velocityMin = Math.min(velocityMin, velocity);
        velocityMax = Math.max(velocityMax, velocity);

        const sortedPhraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);
        let phraseKey = 0;
        for (const start of sortedPhraseStarts) {
          if (start <= index) phraseKey = start;
          else break;
        }
        const bucket = phraseVelocities.get(phraseKey) ?? [];
        bucket.push(velocity);
        phraseVelocities.set(phraseKey, bucket);

        let durationAccent: PremiumMelodyDurationAccentKind = 'none';
        if (isLanding || (phraseIdx === Math.floor(phraseLen * 0.55) && articulation === 'tenuto')) {
          durationAccent = 'stress';
          durationAccentCount++;
        } else if (shortOffbeat && articulation === 'staccato') {
          durationAccent = 'stress';
          durationAccentCount++;
        }

        return {
          ...note,
          articulation,
          velocity,
          durationAccent,
        };
      }
    }
  });

  for (const velocities of phraseVelocities.values()) {
    if (velocities.length < 2) continue;
    phraseVelocitySpreads.push(Math.max(...velocities) - Math.min(...velocities));
  }
  const perPhraseVelocitySpread =
    phraseVelocitySpreads.length > 0
      ? phraseVelocitySpreads.reduce((a, b) => a + b, 0) / phraseVelocitySpreads.length
      : 0;

  assertPreserveMelodyTimingGrid(ordered, out);

  if (options?.meta) {
    options.meta.articulationCounts = articulationCounts;
    options.meta.durationAccentCount = durationAccentCount;
    options.meta.velocityMin = velocityMin;
    options.meta.velocityMax = velocityMax;
    options.meta.perPhraseVelocitySpread = perPhraseVelocitySpread;
    options.meta.structuralLandingAccentHits = structuralLandingAccentHits;
    options.meta.structuralLandingTotal = structuralLandingTotal;
  }

  void options?.rhythmMeta;
  return out;
}

export function distinctArticulationTypes(
  notes: readonly Pick<PremiumMelodyExpressiveNote, 'articulation'>[]
): number {
  const s = new Set<Articulation>();
  for (const n of notes) {
    if (n.articulation) s.add(n.articulation);
  }
  return s.size;
}

export function phraseVelocitySpread(notes: readonly Pick<PremiumMelodyExpressiveNote, 'velocity'>[]): {
  min: number;
  max: number;
  spread: number;
} {
  const vels = notes.map((n) => n.velocity).filter((v): v is number => v != null);
  if (vels.length === 0) return { min: 0, max: 0, spread: 0 };
  const min = Math.min(...vels);
  const max = Math.max(...vels);
  return { min, max, spread: max - min };
}
