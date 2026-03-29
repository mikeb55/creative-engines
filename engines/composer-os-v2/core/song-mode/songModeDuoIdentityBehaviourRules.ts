/**
 * Song Mode — Duo / Phrase Authority / LOCK / Identity rule IDs and explicit severity.
 * Detection logic stays in score-integrity validators; this module only classifies outcomes for Song Mode routing.
 */

import type { CompositionContext } from '../compositionContext';

export type SongModeDuoIdentityRuleId =
  | 'pa_guitar_too_thin'
  | 'pa_register_span_narrow'
  | 'pa_endings_lack_variety'
  | 'pa_insufficient_handoffs'
  | 'pa_no_strong_call_response'
  | 'pa_excessive_simultaneous_attacks'
  | 'pa_section_ab_contrast_subtle'
  | 'pa_no_memorable_cadence'
  | 'lock_gce_floor'
  | 'lock_polish_score_low'
  | 'lock_polish_too_square'
  | 'lock_rhythm_cell_repeat'
  | 'lock_unison_dense_rhythm'
  | 'swing_guitar_rests_too_low'
  | 'swing_guitar_rests_too_high'
  | 'swing_dual_dense_run'
  | 'swing_bass_constant_walking'
  | 'swing_bass_rhythm_cell_repeat'
  | 'ix_call_response_events'
  | 'ix_guitar_wall_to_wall'
  | 'ix_bass_wall_to_wall'
  | 'ix_role_contrast_weak'
  | 'id_moment_score_low'
  | 'id_bar7_not_most_distinctive'
  | 'id_bar7_rhythm_same_as_bar6'
  | 'id_bar7_rhythm_same_as_bar8'
  | 'id_bass_mirrors_guitar_bar7'
  | 'v3_motif_coverage_low'
  | 'v3_motif_placements_missing'
  | 'v3_exact_repetition_required'
  | 'v3_contour_rise_peak_fall'
  | 'v3_leap_exceeds_max'
  | 'v3_multiple_large_leaps'
  | 'v3_scale_run_too_long'
  | 'v3_range_exceeds_ninth_multi_bar'
  | 'v3_phrase_end_not_chord_tone'
  | 'v3_syncopation_required'
  | 'v3_memorability_weak'
  | 'v3_zigzag_too_often';

export interface SongModeDuoIdentityIssue {
  ruleId: SongModeDuoIdentityRuleId;
  message: string;
}

/**
 * Fixed per-rule severity. In non–Song Mode runs, callers treat every issue as blocking (see `partitionDuoIdentityIssues`).
 */
export const SONG_MODE_DUO_IDENTITY_RULE_SEVERITY: Record<SongModeDuoIdentityRuleId, 'critical' | 'warning'> = {
  pa_guitar_too_thin: 'critical',
  pa_register_span_narrow: 'warning',
  pa_endings_lack_variety: 'warning',
  pa_insufficient_handoffs: 'warning',
  pa_no_strong_call_response: 'warning',
  pa_excessive_simultaneous_attacks: 'warning',
  pa_section_ab_contrast_subtle: 'warning',
  pa_no_memorable_cadence: 'warning',
  lock_gce_floor: 'warning',
  lock_polish_score_low: 'warning',
  lock_polish_too_square: 'warning',
  lock_rhythm_cell_repeat: 'warning',
  lock_unison_dense_rhythm: 'warning',
  swing_guitar_rests_too_low: 'warning',
  swing_guitar_rests_too_high: 'warning',
  swing_dual_dense_run: 'warning',
  swing_bass_constant_walking: 'warning',
  swing_bass_rhythm_cell_repeat: 'warning',
  ix_call_response_events: 'warning',
  ix_guitar_wall_to_wall: 'warning',
  ix_bass_wall_to_wall: 'warning',
  ix_role_contrast_weak: 'warning',
  id_moment_score_low: 'warning',
  id_bar7_not_most_distinctive: 'warning',
  id_bar7_rhythm_same_as_bar6: 'warning',
  id_bar7_rhythm_same_as_bar8: 'warning',
  id_bass_mirrors_guitar_bar7: 'warning',
  v3_motif_coverage_low: 'critical',
  v3_motif_placements_missing: 'critical',
  v3_exact_repetition_required: 'warning',
  v3_contour_rise_peak_fall: 'warning',
  v3_leap_exceeds_max: 'warning',
  v3_multiple_large_leaps: 'warning',
  v3_scale_run_too_long: 'warning',
  v3_range_exceeds_ninth_multi_bar: 'warning',
  v3_phrase_end_not_chord_tone: 'warning',
  v3_syncopation_required: 'warning',
  v3_memorability_weak: 'warning',
  v3_zigzag_too_often: 'warning',
};

export function isSongModeHookFirstIdentity(context: CompositionContext | undefined): boolean {
  return context?.generationMetadata?.songModeHookFirstIdentity === true;
}

export function partitionDuoIdentityIssues(
  issues: SongModeDuoIdentityIssue[],
  songMode: boolean
): { blocking: string[]; warnings: string[] } {
  const blocking: string[] = [];
  const warnings: string[] = [];
  for (const i of issues) {
    const sev = songMode ? SONG_MODE_DUO_IDENTITY_RULE_SEVERITY[i.ruleId] : 'critical';
    if (sev === 'critical') blocking.push(i.message);
    else warnings.push(i.message);
  }
  return { blocking, warnings };
}
