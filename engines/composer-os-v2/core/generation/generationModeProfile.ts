/**
 * Build I — Generation Mode Profiles (solo vs melody).
 * Phrase planning is deterministic for fixed (bars, mode).
 */

export type RhythmCell =
  | ['8', '8', 'q']
  | ['q', '8', '8']
  | ['8', 'q', '8']
  | ['h']
  | ['8', '8', '8', '8']
  | ['16', '16', '8', 'q'];

export type PhraseContour =
  | 'arch'
  | 'descending'
  | 'wave'
  | 'flat-then-lift'
  | 'question'
  | 'answer';

export type PhrasePlan = {
  bars: number;
  contour: PhraseContour;
  apexBar: number;
  apexBeat: number;
  cadencePitchClassRole:
    | 'triadRoot'
    | 'triadThird'
    | 'triadFifth'
    | 'primaryTension';
  rhythmCells: RhythmCell[];
  motifId?: string;
};

export type GenerationModeProfile = {
  notesPerBarRange: [number, number];
  longNoteRatio: number;
  restRatio: number;
  motifReuseProbability: number;
  exactMotifRepeatProbability: number;
  contourPlanningStrength: number;
  harmonyProofPerBar: number;
  harmonyProofPerPhrase: number;
  maxPhraseSpanSemitones: number;
  stepwiseMotionRatio: number;
  leapProbability: number;
  maxTensionLayerDefault: 0 | 1 | 2 | 3;
  postCadenceRestProbability: number;
  barCrossingContinuationProbability: number;
  rhythmicCellReuseProbability: number;
  melodicOverrideVsLocalHarmony: number;
};

export const SOLO_PROFILE: GenerationModeProfile = {
  notesPerBarRange: [5, 10],
  longNoteRatio: 0.18,
  restRatio: 0.06,
  motifReuseProbability: 0.25,
  exactMotifRepeatProbability: 0.08,
  contourPlanningStrength: 0.25,
  harmonyProofPerBar: 1,
  harmonyProofPerPhrase: 0,
  maxPhraseSpanSemitones: 14,
  stepwiseMotionRatio: 0.58,
  leapProbability: 0.22,
  maxTensionLayerDefault: 2,
  postCadenceRestProbability: 0.15,
  barCrossingContinuationProbability: 0.68,
  rhythmicCellReuseProbability: 0.2,
  melodicOverrideVsLocalHarmony: 0.15,
};

export const MELODY_PROFILE: GenerationModeProfile = {
  notesPerBarRange: [2, 6],
  longNoteRatio: 0.48,
  restRatio: 0.24,
  motifReuseProbability: 0.62,
  exactMotifRepeatProbability: 0.32,
  contourPlanningStrength: 0.85,
  harmonyProofPerBar: 0,
  harmonyProofPerPhrase: 2,
  maxPhraseSpanSemitones: 8,
  stepwiseMotionRatio: 0.72,
  leapProbability: 0.12,
  maxTensionLayerDefault: 1,
  postCadenceRestProbability: 0.46,
  barCrossingContinuationProbability: 0.42,
  rhythmicCellReuseProbability: 0.66,
  melodicOverrideVsLocalHarmony: 0.58,
};

export type GenerationMode = 'solo' | 'melody';

const ALL_CONTOURS: PhraseContour[] = [
  'arch',
  'descending',
  'wave',
  'flat-then-lift',
  'question',
  'answer',
];

/** Higher contourPlanningStrength biases toward melodic arcs (arch / wave / question / answer). */
const STRUCTURED_CONTOURS: PhraseContour[] = ['arch', 'wave', 'question', 'answer'];

const RHYTHM_POOL: RhythmCell[] = [
  ['8', '8', 'q'],
  ['q', '8', '8'],
  ['8', 'q', '8'],
  ['h'],
  ['8', '8', '8', '8'],
  ['16', '16', '8', 'q'],
];

const CADENCE_ROLES: PhrasePlan['cadencePitchClassRole'][] = [
  'triadRoot',
  'triadThird',
  'triadFifth',
  'primaryTension',
];

/** Lower attack density — aligns with longNoteRatio / restRatio (melody > solo). */
const SPARSE_CELLS: RhythmCell[] = [['h'], ['8', '8', 'q'], ['q', '8', '8']];

/** Higher attack density — solo-friendly. */
const DENSE_CELLS: RhythmCell[] = [
  ['8', '8', '8', '8'],
  ['16', '16', '8', 'q'],
  ['8', 'q', '8'],
];

function seedFromBarsMode(bars: number, mode: GenerationMode): number {
  let h = 2166136261 >>> 0;
  h = Math.imul(h ^ bars, 16777619) >>> 0;
  for (let i = 0; i < mode.length; i++) {
    h = Math.imul(h ^ mode.charCodeAt(i), 16777619) >>> 0;
  }
  return h || 1;
}

/** Deterministic PRNG in [0, 1). */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampBars(bars: number): number {
  if (!Number.isFinite(bars) || bars < 1) return 1;
  return Math.floor(bars);
}

function pickRhythmCell(
  rand: () => number,
  profile: GenerationModeProfile,
): RhythmCell {
  const longBias = profile.longNoteRatio;
  const restBias = profile.restRatio;
  const sparsePull = (longBias + restBias) * 0.5;
  if (rand() < sparsePull) {
    return SPARSE_CELLS[Math.floor(rand() * SPARSE_CELLS.length)];
  }
  if (rand() < longBias * 0.35) {
    return DENSE_CELLS[Math.floor(rand() * DENSE_CELLS.length)];
  }
  return RHYTHM_POOL[Math.floor(rand() * RHYTHM_POOL.length)];
}

function pickCadenceRole(
  rand: () => number,
  mode: GenerationMode,
  profile: GenerationModeProfile,
): PhrasePlan['cadencePitchClassRole'] {
  if (mode === 'melody' && rand() < 0.55 + profile.contourPlanningStrength * 0.1) {
    return rand() < 0.52 ? 'triadRoot' : 'triadThird';
  }
  if (mode === 'solo' && rand() < profile.leapProbability * 0.35) {
    return rand() < 0.5 ? 'primaryTension' : 'triadFifth';
  }
  return CADENCE_ROLES[Math.floor(rand() * CADENCE_ROLES.length)];
}

export function getProfileForMode(mode: GenerationMode): GenerationModeProfile {
  return mode === 'melody' ? MELODY_PROFILE : SOLO_PROFILE;
}

/**
 * Builds a phrase blueprint from profile weights and deterministic RNG(seed bars+mode).
 */
export function planPhrase(bars: number, mode: GenerationMode): PhrasePlan {
  const b = clampBars(bars);
  const profile = getProfileForMode(mode);
  const rand = mulberry32(seedFromBarsMode(b, mode));

  const strength = profile.contourPlanningStrength;
  let contour: PhraseContour;
  if (rand() < strength) {
    contour = STRUCTURED_CONTOURS[Math.floor(rand() * STRUCTURED_CONTOURS.length)];
  } else {
    contour = ALL_CONTOURS[Math.floor(rand() * ALL_CONTOURS.length)];
  }

  const apexBar = Math.min(b - 1, Math.floor(rand() * b));
  const apexBeat = 1 + Math.floor(rand() * 4);

  const cadencePitchClassRole = pickCadenceRole(rand, mode, profile);

  const rhythmCells: RhythmCell[] = [];
  let prev: RhythmCell | undefined;
  for (let i = 0; i < b; i++) {
    const reuse =
      i > 0 && prev !== undefined && rand() < profile.rhythmicCellReuseProbability;
    if (reuse && prev) {
      rhythmCells.push(prev);
      continue;
    }
    const cell = pickRhythmCell(rand, profile);
    rhythmCells.push(cell);
    prev = cell;
  }

  let motifId: string | undefined;
  if (rand() < profile.motifReuseProbability) {
    motifId = `motif-${mode}-${b}-${apexBar}-${contour}`;
    if (rand() >= profile.exactMotifRepeatProbability) {
      motifId = `${motifId}-var`;
    }
  }

  return {
    bars: b,
    contour,
    apexBar,
    apexBeat,
    cadencePitchClassRole,
    rhythmCells,
    motifId,
  };
}
