/**
 * String Quartet — Bartók-style Bulgarian aksak additive rhythm engine (diagnostic receipts + policy).
 * Internal model: subgroup vectors on a fast micro-pulse grid (16th or 8th), not “generic odd meter”.
 */

import type { GenerationMetadata } from '../compositionContext';

export type BartokBulgarianAksakPulseBase = '16th' | '8th';

/** Canonical additive cells (B1 = Bartók textbook exemplar). */
export type BartokBulgarianAksakCellId = 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';

export type BartokBulgarianAksakAccentLayer = 'metric' | 'melodic';

export type BartokBulgarianAksakVoiceRole =
  | 'metric_declarer'
  | 'offset_support'
  | 'cross_accent'
  | 'cello_rhythmic';

export type BartokBulgarianAksakCelloMode =
  | 'repeated_anchor'
  | 'pedal_plus_puncture'
  | 'active_counterline';

export type BartokBulgarianAksakPatternTransition = 'common_tail' | 'pivot_bar' | 'phrase_compression';

export interface BartokBulgarianAksakRhythmEnginePolicy {
  rhythmEngineId: 'bartok_bulgarian_aksak';
  label: "Bartók / Bulgarian Aksak";
  pulseBase: BartokBulgarianAksakPulseBase;
  /** Default subgroup packet (Bartók exemplar 4+2+3). */
  subgroupVector: readonly [number, number, number];
  cellLibrary: readonly BartokBulgarianAksakCellId[];
  accentLayers: { metric: true; melodic: true };
  voiceRoles: Record<'A' | 'B' | 'C' | 'D', BartokBulgarianAksakVoiceRole>;
  minPatternStabilityBars: number;
  maxPatternStabilityBars: number;
  patternTransitionTypes: readonly BartokBulgarianAksakPatternTransition[];
  formalRole: 'high_energy_contrast_zone';
  /** Pulse always present (additive metric); not gesture-only free time. */
  antiMetric: boolean;
  harmonicRhythmAlignment: 'optional_aligned_or_misaligned';
  /** Motoric tempo band for 16th pulses (MM), surface feel. */
  tempoSixteenthMmMin: number;
  tempoSixteenthMmMax: number;
}

export const BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY: BartokBulgarianAksakRhythmEnginePolicy = {
  rhythmEngineId: 'bartok_bulgarian_aksak',
  label: 'Bartók / Bulgarian Aksak',
  pulseBase: '16th',
  subgroupVector: [4, 2, 3],
  cellLibrary: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
  accentLayers: { metric: true, melodic: true },
  voiceRoles: {
    A: 'metric_declarer',
    B: 'offset_support',
    C: 'cross_accent',
    D: 'cello_rhythmic',
  },
  minPatternStabilityBars: 2,
  maxPatternStabilityBars: 6,
  patternTransitionTypes: ['common_tail', 'pivot_bar', 'phrase_compression'],
  formalRole: 'high_energy_contrast_zone',
  antiMetric: false,
  harmonicRhythmAlignment: 'optional_aligned_or_misaligned',
  tempoSixteenthMmMin: 300,
  tempoSixteenthMmMax: 400,
};

/** Cell specs: vector, pulse base, total pulses per bar. */
export const BARTOK_BULGARIAN_AKSAK_CELL_SPECS: Record<
  BartokBulgarianAksakCellId,
  { vector: readonly number[]; pulseBase: '16th' | '8th'; totalPulses: number }
> = {
  B1: { vector: [4, 2, 3], pulseBase: '16th', totalPulses: 9 },
  B2: { vector: [3, 2, 3], pulseBase: '8th', totalPulses: 8 },
  B3: { vector: [2, 2, 3], pulseBase: '8th', totalPulses: 7 },
  B4: { vector: [2, 3], pulseBase: '8th', totalPulses: 5 },
  B5: { vector: [3, 2], pulseBase: '8th', totalPulses: 5 },
  B6: { vector: [3, 2, 2, 3], pulseBase: '8th', totalPulses: 10 },
};

/**
 * Fingerprint receipts for SQ aksak engine (additive packet grammar, layered accents, voice roles).
 * Prefix: BG_RHYTHM_*
 */
export const BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS: readonly string[] = [
  'BG_RHYTHM_POLICY_01:rhythmEngineId=bartok_bulgarian_aksak',
  'BG_RHYTHM_POLICY_02:pulse_base_default=16th_fast_micro_grid',
  'BG_RHYTHM_POLICY_03:subgroup_vector_primary=[4,2,3]_B1_default',
  'BG_RHYTHM_POLICY_04:notation_rendering_decoupled_from_internal_pulse_store',
  'BG_RHYTHM_CELL_B1:vector_4+2+3_pulses_9_textbook_exemplar',
  'BG_RHYTHM_CELL_B2:vector_3+2+3_pulses_8',
  'BG_RHYTHM_CELL_B3:vector_2+2+3_pulses_7',
  'BG_RHYTHM_CELL_B4:vector_2+3_pulses_5_inversional_partner_B5',
  'BG_RHYTHM_CELL_B5:vector_3+2_pulses_5_inversional_partner_B4',
  'BG_RHYTHM_CELL_B6:vector_3+2+2+3_pulses_10_chained_expansion',
  'BG_RHYTHM_PACKET_01:long_short_packet_identity_not_even_beat_count',
  'BG_RHYTHM_PACKET_02:unequal_ordering_repeated_within_section',
  'BG_RHYTHM_PACKET_03:fast_pulse_embodied_body_feel',
  'BG_RHYTHM_TEMPO_01:sixteenth_mm_band_300_400_motoric_surface',
  'BG_RHYTHM_ACCENT_01:metric_layer_strongest_bar_onset',
  'BG_RHYTHM_ACCENT_02:metric_secondary_largest_internal_subgroup_break',
  'BG_RHYTHM_ACCENT_03:melodic_layer_independent_of_metric',
  'BG_RHYTHM_ACCENT_04:melodic_anticipation_last_pulse_prior_subgroup',
  'BG_RHYTHM_ACCENT_05:melodic_delayed_arrival_second_pulse_long_subgroup',
  'BG_RHYTHM_ACCENT_06:cross_accent_sforzando_registral_peak_vs_metric',
  'BG_RHYTHM_ACCENT_07:four_bar_span_upper_voice_melodic_displacement_required',
  'BG_RHYTHM_ACCENT_08:forbid_all_voices_subgroup_start_unison_extended',
  'BG_RHYTHM_ACCENT_09:hierarchical_dynamic_not_equal_every_subgroup',
  'BG_RHYTHM_VOICE_A:metric_declarer_short_dry_motoric_detaché',
  'BG_RHYTHM_VOICE_B:parallel_offset_support_subgroup_or_pulse_before',
  'BG_RHYTHM_VOICE_C:cross_accent_ostinato_slurred_crossing_blur_boundary',
  'BG_RHYTHM_VOICE_D1:cello_repeated_anchor_selected_subgroup_first_pulses',
  'BG_RHYTHM_VOICE_D2:cello_pedal_plus_puncture_sustain_then_punctuate',
  'BG_RHYTHM_VOICE_D3:cello_active_counterline_additive_confirm_not_root_pad',
  'BG_RHYTHM_VOICE_RULE:max_two_voices_full_coincidence_subgroup_starts_gt2bars_forbidden',
  'BG_RHYTHM_ARTIC_01:default_short_dry_motoric_detaché_adjacent_martelé',
  'BG_RHYTHM_ARTIC_02:martelé_primary_subgroup_starts_selective',
  'BG_RHYTHM_ARTIC_03:slurred_crossing_phrase_override_subgroup',
  'BG_RHYTHM_ARTIC_04:texture_contrast_muted_pizz_sharp_detached_scherzo_finale',
  'BG_RHYTHM_STAB_01:min_stability_bars_2_max_6_before_mutation',
  'BG_RHYTHM_STAB_02:legal_transition_common_tail_preserve_final_packet',
  'BG_RHYTHM_STAB_03:legal_transition_pivot_bar_voice_prepares_one_bar_early',
  'BG_RHYTHM_STAB_04:legal_transition_phrase_compression_long_packet_minus_one_pulse',
  'BG_RHYTHM_STAB_05:forbid_random_odd_bar_jumps_unrelated_patterns',
  'BG_RHYTHM_FORM_01:role_high_energy_contrast_scherzo_finale_climax',
  'BG_RHYTHM_FORM_02:entrance_abrupt_or_post_decompression_corridor',
  'BG_RHYTHM_EXIT_01:reduce_attack_density_first',
  'BG_RHYTHM_EXIT_02:collapse_subgroup_accents_second',
  'BG_RHYTHM_EXIT_03:long_slurs_sustain_replace_additive_beaming_third',
  'BG_RHYTHM_EXIT_04:subdivision_residue_one_voice_while_others_regularize_fourth',
  'BG_RHYTHM_HARM_01:harmonic_change_may_align_or_misalign_subgroup_boundary',
  'BG_RHYTHM_HARM_02:do_not_force_harmonic_rhythm_to_additive_grouping',
  'BG_RHYTHM_DIFF_01:vs_rebetiko_first_class_subgroup_vector_not_phrase_ornament_groove_only',
  'BG_RHYTHM_DIFF_02:vs_generic_odd_meter_requires_packet_identity_not_beat_count_only',
  'BG_RHYTHM_DIFF_03:vs_stravinsky_stable_additive_section_not_random_bar_length_blocks',
  'BG_RHYTHM_DIFF_04:vs_free_proportional_pulse_state_steady_countable_micro_pulse',
  'BG_RHYTHM_ERR_01:avoid_four_voices_identical_continuous_square',
  'BG_RHYTHM_ERR_02:avoid_broad_legato_ignoring_subdivision',
  'BG_RHYTHM_ERR_03:avoid_equal_mechanical_subgroup_accents',
  'BG_RHYTHM_ERR_04:avoid_lush_padding_neutralizing_rhythmic_bite',
  'BG_RHYTHM_ERR_05:avoid_pattern_flip_every_bar_without_body_register',
];

export function mergeBartokBulgarianAksakSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'bartok_bulgarian_aksak',
    sqRhythmEngineReceipts: BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS,
  };
}
