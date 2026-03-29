/**
 * Song Mode — phrase behaviour rule IDs and explicit severity (critical vs warning).
 * Detection logic lives in `songModePhraseEngineV1` validators; this module only classifies outcomes.
 */

/** One row per distinct phrase-validation branch (deterministic; not derived from message text). */
export type SongModePhraseRuleId =
  | 'phrase_min_notes'
  | 'phrase_directional_run'
  | 'phrase_ambiguous_peaks'
  | 'phrase_peak_ascent'
  | 'phrase_fall_after_peak'
  | 'phrase_bar_zigzag'
  | 'phrase_cadence_notes_missing'
  | 'phrase_landing_strong_tone'
  | 'phrase_landing_lowest_after_peak'
  | 'phrase_cadence_duration_ratio'
  | 'phrase_anti_noodle_space'
  | 'phrase_rhythm_contrast'
  | 'phrase_eighth_run_space';

export interface SongModePhraseIssue {
  ruleId: SongModePhraseRuleId;
  message: string;
}

/**
 * Explicit mapping: each rule is either critical (blocks generation) or warning (non-blocking).
 * Structural / invariant failures → critical; musical-quality contour/cadence issues → warning.
 */
export const SONG_MODE_PHRASE_RULE_SEVERITY: Record<SongModePhraseRuleId, 'critical' | 'warning'> = {
  phrase_min_notes: 'critical',
  phrase_directional_run: 'warning',
  phrase_ambiguous_peaks: 'warning',
  phrase_peak_ascent: 'warning',
  phrase_fall_after_peak: 'warning',
  phrase_bar_zigzag: 'warning',
  phrase_cadence_notes_missing: 'critical',
  phrase_landing_strong_tone: 'warning',
  phrase_landing_lowest_after_peak: 'warning',
  phrase_cadence_duration_ratio: 'warning',
  phrase_anti_noodle_space: 'warning',
  phrase_rhythm_contrast: 'warning',
  phrase_eighth_run_space: 'warning',
};

export function partitionSongModePhraseIssues(issues: SongModePhraseIssue[]): {
  critical: string[];
  warnings: string[];
} {
  const critical: string[] = [];
  const warnings: string[] = [];
  for (const i of issues) {
    if (SONG_MODE_PHRASE_RULE_SEVERITY[i.ruleId] === 'critical') critical.push(i.message);
    else warnings.push(i.message);
  }
  return { critical, warnings };
}
