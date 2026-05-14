/**
 * String Quartet — Steve Reich phasing + pattern-process rhythm engine (diagnostics).
 * Pairs with Reich/Glass SQ VRB: strict even pulse grid + pattern displacement; Module A (true phase) vs Module B (post-phase pattern / Different Trains).
 */

import type { GenerationMetadata } from '../compositionContext';

export type ReichPhasingModule = 'true_phase_process' | 'post_phase_pattern_music';

export type ReichPhasingOperator = 'continuous_dephasing' | 'stepped_rotation';

export interface ReichPhasingGridRhythmEnginePolicy {
  rhythmEngineId: 'reich_phasing_grid';
  label: 'Reich / Phasing Grid';
  primaryAbstraction: 'strict_pulse_grid_plus_pattern_displacement';
  modules: readonly ReichPhasingModule[];
  phasingOperators: readonly ReichPhasingOperator[];
  baseCycleLengthDefault: 12;
  baseCycleLengthsAllowed: readonly [6, 8, 10, 12, 16, 24];
  shiftUnitSubdivisions: 1;
  repetitionsBeforeShiftBarsDefaultMin: 8;
  repetitionsBeforeShiftBarsDefaultMax: 12;
  additiveProcessChainable: true;
  resultantPatternDetection: true;
  harmonicFieldStasis: true;
  speechDerivedMotifModuleB: true;
  antiMetric: false;
  dynamicsTerracedDefault: true;
}

export const REICH_PHASING_GRID_DEFAULT_POLICY: ReichPhasingGridRhythmEnginePolicy = {
  rhythmEngineId: 'reich_phasing_grid',
  label: 'Reich / Phasing Grid',
  primaryAbstraction: 'strict_pulse_grid_plus_pattern_displacement',
  modules: ['true_phase_process', 'post_phase_pattern_music'],
  phasingOperators: ['continuous_dephasing', 'stepped_rotation'],
  baseCycleLengthDefault: 12,
  baseCycleLengthsAllowed: [6, 8, 10, 12, 16, 24],
  shiftUnitSubdivisions: 1,
  repetitionsBeforeShiftBarsDefaultMin: 8,
  repetitionsBeforeShiftBarsDefaultMax: 12,
  additiveProcessChainable: true,
  resultantPatternDetection: true,
  harmonicFieldStasis: true,
  speechDerivedMotifModuleB: true,
  antiMetric: false,
  dynamicsTerracedDefault: true,
};

/** Fingerprint receipts. Prefix: RP_RHYTHM_* */
export const REICH_PHASING_GRID_RHYTHM_RECEIPTS: readonly string[] = [
  'RP_RHYTHM_POLICY_01:rhythmEngineId=reich_phasing_grid',
  'RP_RHYTHM_POLICY_02:primaryAbstraction=strict_even_pulse_plus_controlled_displacement',
  'RP_RHYTHM_POLICY_03:process_revelatory_not_affect_class_groove',
  'RP_RHYTHM_MODULE_A:true_phase_identical_patterns_exact_subdivision_misalignment',
  'RP_RHYTHM_MODULE_B:post_phase_cells_speech_motives_layered_ostinati_no_literal_mechanical_only',
  'RP_RHYTHM_GRID:pulse_invariant_8th_or_16th_base_not_swing_not_rubato',
  'RP_RHYTHM_PATTERN:short_cyclic_onset_vector_binary_attack_rest',
  'RP_RHYTHM_PATTERN_LENGTHS:primary_6_8_10_12_16_24_pulses',
  'RP_RHYTHM_PATTERN_RULE:asymmetric_enough_rotations_perceptibly_distinct',
  'RP_RHYTHM_STORE:onset_vector_binary_plus_pitch_set',
  'RP_RHYTHM_CYCLE12_01:canonical_twelve_positions_twelve_phase_offsets_before_unison',
  'RP_RHYTHM_CYCLE12_02:clapping_music_model_not_aksak_unequal_packets',
  'RP_RHYTHM_REPETITIONS:R_bars_per_phase_position_default_8_to_12',
  'RP_RHYTHM_STRINGS:short_melodic_fragments_one_to_two_measures_pulse_even_cells',
  'RP_RHYTHM_STRINGS:speech_derived_motives_contour_rhythm_of_spoken_phrase',
  'RP_RHYTHM_OP1_CONTINUOUS:tempo_epsilon_drift_until_offset_then_lock_intermediate_offsets_heard',
  'RP_RHYTHM_OP1_PARAMS:drift_rate_epsilon_stable_offset_dwell_duration',
  'RP_RHYTHM_OP1_USE:gradual_phase_violin_phase_string_model',
  'RP_RHYTHM_OP2_STEPPED:repeat_R_times_advance_one_subdivision_discrete_jumps_only',
  'RP_RHYTHM_OP2_PARAMS:shift_unit_1_subdivision_repetitions_before_shift_R',
  'RP_RHYTHM_OP2_USE:live_quartet_practical_performance_model',
  'RP_RHYTHM_OFFSET_ENCODE:integer_subdivisions_within_cycle_continuous_also_time_drift_param',
  'RP_RHYTHM_CONTROL:N_cycle_length_shift_unit_R_dwell_total_rotations_before_change',
  'RP_RHYTHM_ADDITIVE:separate_operator_chainable_add_attack_to_unfilled_onset_positions',
  'RP_RHYTHM_ADDITIVE:not_same_as_phase_shift_precedes_or_follows_stable_loop',
  'RP_RHYTHM_RESULTANT:vertical_horizontal_composites_from_superposed_offset_grids',
  'RP_RHYTHM_RESULTANT_GOAL:emergent_accents_implied_melodies_perceptual_target',
  'RP_RHYTHM_VOICE_V1:fixed_reference_pattern',
  'RP_RHYTHM_VOICE_V2:primary_moving_phased_copy_minimum_two_voices_core',
  'RP_RHYTHM_VOICE_VA:resultant_highlighter_or_harmonic_fill',
  'RP_RHYTHM_VOICE_VC:equal_ostinato_anchor_or_speech_motivic_imitator_DT_model',
  'RP_RHYTHM_DT:speech_phrase_motive_layers_ostinato_not_literal_mechanical_phase',
  'RP_RHYTHM_DT_TRIGGERS:new_phrase_new_ostinato_module_frame_change',
  'RP_RHYTHM_HARM:diatonic_modal_restricted_collection_non_functional_clear_centred',
  'RP_RHYTHM_HARM_STASIS:field_may_sustain_while_rhythmic_process_generates_change',
  'RP_RHYTHM_HARM_CHANGE:separate_operator_from_phase_completion_cue_speech_module',
  'RP_RHYTHM_ARTIC:short_detaché_motoric_clean_controlled_legato_speech_or_field_only',
  'RP_RHYTHM_ARTIC_FORBID:romantic_slur_flexible_rubato_process_legibility',
  'RP_RHYTHM_DYN:terraced_steady_planes_modest_reveal_resultant_section_DT_urgency_ok',
  'RP_RHYTHM_FORM:one_field_one_mechanism_per_section_sustain_long_enough',
  'RP_RHYTHM_OPENING:clear_pulse_before_complexity_close_unison_thinning_fixation_cessation',
  'RP_RHYTHM_DIFF_GLASS:displacement_emergent_composite_vs_additive_expand_harmonic_wash',
  'RP_RHYTHM_DIFF_AKSAK:even_grid_asymmetric_onsets_inside_equal_pulses_not_2plus2plus3',
  'RP_RHYTHM_DIFF_BAROQUE:non_teleological_process_no_cadence_dance_periodicity',
  'RP_RHYTHM_DIFF_FREE_PROP:underlying_pulse_rigid_countable_even_when_resultant_blurs_meter',
];

export function mergeReichPhasingGridSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'reich_phasing_grid',
    sqRhythmEngineReceipts: REICH_PHASING_GRID_RHYTHM_RECEIPTS,
  };
}
