/**
 * Canonical Slonimsky pattern catalogue for Structure / Tuning UI (V66 P1).
 * Interval DNA aligns with engines/composer-os-v2/core/slonimsky/thesaurusRegistry.ts.
 */

/** @typedef {{ id: string, name: string, intervals: number[], intervalSummary: string, section?: string, tensionLevel?: number }} SlonimskyPatternRow */

/** @type {readonly SlonimskyPatternRow[]} */
export const SLONIMSKY_PATTERNS = [
  {
    id: 'p_ultraChromatic',
    name: 'Ultra-chromatic',
    intervals: [1, 1, 1, 1],
    intervalSummary: '+1 +1 +1 +1',
    section: 'semitone_progression',
    tensionLevel: 3,
  },
  {
    id: 'p_chromaticInterp',
    name: 'Interpolation',
    intervals: [1, 1, 1],
    intervalSummary: '+1 +1 +1',
    section: 'semitone_progression',
    tensionLevel: 2,
  },
  {
    id: 'p_expanding',
    name: 'Ultrapolation',
    intervals: [1, 2, 3, 4],
    intervalSummary: '+1 +2 +3 +4',
    section: 'intervallic_mirror_permutations',
    tensionLevel: 3,
  },
  {
    id: 'p_contracting',
    name: 'Infrapolation',
    intervals: [4, 3, 2, 1],
    intervalSummary: '+4 +3 +2 +1',
    section: 'intervallic_mirror_permutations',
    tensionLevel: 1,
  },
  {
    id: 'p_minorThirdCycle',
    name: 'Minor 3rd Cycle',
    intervals: [3, 3, 3],
    intervalSummary: '+3 +3 +3',
    section: 'sesquitone_progression',
    tensionLevel: 3,
  },
  {
    id: 'p_majorThirdCycle',
    name: 'Major 3rd Cycle',
    intervals: [4, 4],
    intervalSummary: '+4 +4',
    section: 'ditone_progression',
    tensionLevel: 3,
  },
  {
    id: 'p_tritonePole',
    name: 'Tritone Progression',
    intervals: [6, -6],
    intervalSummary: '+6 −6',
    section: 'tritone_progression',
    tensionLevel: 3,
  },
  {
    id: 'p_wholeTone',
    name: 'Whole-tone',
    intervals: [2, 2, 2],
    intervalSummary: '+2 +2 +2',
    section: 'whole_tone_progression',
    tensionLevel: 1,
  },
  {
    id: 'p_asymCell123',
    name: 'Sesquitone cell',
    intervals: [1, 2, 3],
    intervalSummary: '+1 +2 +3',
    section: 'intervallic_mirror_permutations',
    tensionLevel: 2,
  },
  {
    id: 'p_quadritone',
    name: 'Quadritone',
    intervals: [5, 5],
    intervalSummary: '+5 +5',
    section: 'quadritone_progression',
    tensionLevel: 2,
  },
  {
    id: 'p_pentatonic',
    name: 'Pentatonic scaffold',
    intervals: [2, 2, 3, 2],
    intervalSummary: '+2 +2 +3 +2',
    section: 'pentatonic_scales',
    tensionLevel: 1,
  },
  {
    id: 'p_dodecaphonic',
    name: 'Dodecaphonic axis',
    intervals: [1, 1, 1, 1, 1, 1],
    intervalSummary: '+1×6',
    section: 'twelve_tone_dodecaphonic',
    tensionLevel: 3,
  },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** @param {SlonimskyPatternRow} pattern @param {number} [rootPc] */
export function previewPatternNoteNames(pattern, rootPc = 0) {
  const names = [];
  let pc = ((rootPc % 12) + 12) % 12;
  names.push(NOTE_NAMES[pc]);
  for (const step of pattern.intervals) {
    pc = (pc + step + 120) % 12;
    names.push(NOTE_NAMES[pc]);
  }
  return names.join(' · ');
}

/** @param {string} id */
export function getSlonimskyPatternById(id) {
  return SLONIMSKY_PATTERNS.find((p) => p.id === id);
}
