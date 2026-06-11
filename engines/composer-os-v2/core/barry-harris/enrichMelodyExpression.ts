/**
 * V85 Phase 3b — BH melody expression (articulation + velocity + export stress).
 * Operates on rhythm-enriched melody only — must NOT alter pitch, onset, or duration.
 */

import type { Articulation } from '../score-model/scoreModelTypes';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';
import {
  BEATS_PER_BAR,
  type BhCellFamily,
  type BhRhythmEnrichmentMeta,
  deriveBhMelodyRhythmSeed,
  mulberry32,
  pickWeightedTemplate,
  selectRhythmCellForNote,
} from './bhRhythmCellLibrary';
import {
  bhDetectPhraseRoles,
  bhIndexInPhrase,
  bhPhraseLengthAt,
  isBhStructuralLandingIndex,
  type BhPhraseRoles,
} from './enrichMelodyRhythm';

export type BhDurationAccentKind = 'none' | 'stress';

export interface BhExpressiveMelodyNote extends ImportMelodyNote {
  articulation?: Articulation;
  velocity?: number;
  durationAccent?: BhDurationAccentKind;
}

export interface BhExpressionEnrichmentMeta {
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
  expressiveMelody: readonly BhExpressiveMelodyNote[]
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

function isOffbeatOnset(onsetBeat: number): boolean {
  const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  return (
    Math.abs(beat) > 0.11 &&
    Math.abs(beat - 1) > 0.11 &&
    Math.abs(beat - 2) > 0.11 &&
    Math.abs(beat - 3) > 0.11
  );
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
  profile: BhMelodyRhythmProfile,
  roles: BhPhraseRoles,
  baseSeed: number
): (BhCellFamily | 'structural')[] {
  const recentFamilies: BhCellFamily[] = [];
  let offbeatCount = 0;
  let interiorCount = 0;

  return ordered.map((note, index) => {
    if (isBhStructuralLandingIndex(index, roles)) return 'structural';

    const phraseIdx = bhIndexInPhrase(ordered, index, roles);
    const phrLen = bhPhraseLengthAt(index, roles, ordered.length);
    const projectedOffbeatRate = interiorCount > 0 ? offbeatCount / interiorCount : 0;
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

function assignArticulation(
  family: BhCellFamily | 'structural',
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

function isRunningInterior(
  ordered: readonly ImportMelodyNote[],
  index: number,
  roles: BhPhraseRoles
): boolean {
  if (isBhStructuralLandingIndex(index, roles)) return false;
  const prev = index > 0 && !isBhStructuralLandingIndex(index - 1, roles);
  const next = index + 1 < ordered.length && !isBhStructuralLandingIndex(index + 1, roles);
  return prev || next;
}

export function enrichMelodyExpression(
  rhythmMelody: readonly ImportMelodyNote[],
  profile: BhMelodyRhythmProfile,
  options?: { seed?: number; rhythmMeta?: BhRhythmEnrichmentMeta; meta?: BhExpressionEnrichmentMeta }
): BhExpressiveMelodyNote[] {
  const ordered = sortMelody(rhythmMelody);
  const roles = bhDetectPhraseRoles(ordered);
  const baseSeed = options?.seed ?? 88109;
  const families = replayCellFamilies(ordered, profile, roles, baseSeed);

  const articulationCounts: Partial<Record<Articulation, number>> = {};
  let durationAccentCount = 0;
  let velocityMin = VELOCITY_MAX;
  let velocityMax = VELOCITY_MIN;
  let structuralLandingAccentHits = 0;
  let structuralLandingTotal = 0;
  const phraseVelocitySpreads: number[] = [];
  const phraseVelocities = new Map<number, number[]>();

  const out: BhExpressiveMelodyNote[] = ordered.map((note, index) => {
    const family = families[index]!;
    const isLanding = isBhStructuralLandingIndex(index, roles);
    const phraseIdx = bhIndexInPhrase(ordered, index, roles);
    const phraseLen = bhPhraseLengthAt(index, roles, ordered.length);
    const noteSeed = deriveBhMelodyRhythmSeed(baseSeed, index + 10007);
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

    let durationAccent: BhDurationAccentKind = 'none';
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
  notes: readonly Pick<BhExpressiveMelodyNote, 'articulation'>[]
): number {
  const s = new Set<Articulation>();
  for (const n of notes) {
    if (n.articulation) s.add(n.articulation);
  }
  return s.size;
}

export function phraseVelocitySpread(notes: readonly Pick<BhExpressiveMelodyNote, 'velocity'>[]): {
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
