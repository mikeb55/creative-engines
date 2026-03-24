/**
 * Composer OS V2 — MX Readiness Score
 */

/** MX Readiness category. */
export type MxCategory =
  | 'rhythmic_correctness'
  | 'register_correctness'
  | 'musicxml_validity'
  | 'sibelius_safe_profile'
  | 'chord_rehearsal_completeness';

/** Single MX category score. */
export interface MxCategoryScore {
  category: MxCategory;
  score: number;
  passed: boolean;
}

/** MX Readiness result. */
export interface MxReadinessResult {
  passed: boolean;
  overall: number;
  categories: MxCategoryScore[];
}

/** Default MX threshold. */
export const MX_READINESS_THRESHOLD = 0.85;

const MX_CATEGORIES: MxCategory[] = [
  'rhythmic_correctness',
  'register_correctness',
  'musicxml_validity',
  'sibelius_safe_profile',
  'chord_rehearsal_completeness',
];

/** Stub: compute MX readiness. */
export function computeMxReadiness(input: {
  rhythmicCorrect: boolean;
  registerCorrect: boolean;
  musicXmlValid: boolean;
  sibeliusSafe: boolean;
  chordRehearsalComplete: boolean;
}): MxReadinessResult {
  const scores: MxCategoryScore[] = MX_CATEGORIES.map((cat) => {
    let score = 0;
    if (cat === 'rhythmic_correctness' && input.rhythmicCorrect) score = 1;
    if (cat === 'register_correctness' && input.registerCorrect) score = 1;
    if (cat === 'musicxml_validity' && input.musicXmlValid) score = 1;
    if (cat === 'sibelius_safe_profile' && input.sibeliusSafe) score = 1;
    if (cat === 'chord_rehearsal_completeness' && input.chordRehearsalComplete) score = 1;
    if (score === 0) score = 0.5; // placeholder when unknown
    return { category: cat, score, passed: score >= MX_READINESS_THRESHOLD };
  });

  const overall = scores.reduce((a, c) => a + c.score, 0) / scores.length;
  const passed = scores.every((c) => c.passed) && overall >= MX_READINESS_THRESHOLD;

  return { passed, overall, categories: scores };
}
