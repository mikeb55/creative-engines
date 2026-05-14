/**
 * String Quartet — free / proportional rhythm engine (time-field diagnostics; not a beat lattice).
 * Serves Dutilleux, Ligeti, Crumb, Lachenmann-style contexts: gesture-governed spans, cue coordination, no recurring additive pulse as primary truth.
 */

import type { GenerationMetadata } from '../compositionContext';

export type FreeProportionalTimeMode = 'free' | 'proportional' | 'quasi_measured' | 'measured';

export type FreeProportionalDurationBucket =
  | 'very_short'
  | 'short'
  | 'medium'
  | 'long'
  | 'very_long';

export type FreeProportionalGestureType =
  | 'single_event'
  | 'short_group'
  | 'sustained_mass'
  | 'glissando_span'
  | 'cluster_dissolve'
  | 'silence';

export type FreeProportionalCoordinationLevel = 'fixed_sync' | 'soft_window' | 'independent_local';

export type FreeProportionalComposerProfileId = 'dutilleux' | 'ligeti' | 'crumb' | 'lachenmann';

export type FreeProportionalPulseState = 'none' | 'quasi_steady';

export interface FreeProportionalRhythmEnginePolicy {
  rhythmEngineId: 'free_proportional';
  label: 'Free / Proportional';
  primaryAbstraction: 'time_field';
  timeModes: readonly FreeProportionalTimeMode[];
  durationBuckets: readonly FreeProportionalDurationBucket[];
  gestureTypes: readonly FreeProportionalGestureType[];
  coordinationLevels: readonly FreeProportionalCoordinationLevel[];
  composerProfiles: readonly FreeProportionalComposerProfileId[];
  antiMetric: true;
  pulseStateDefault: FreeProportionalPulseState;
  dynamicDensityDecoupled: true;
}

export const FREE_PROPORTIONAL_DEFAULT_POLICY: FreeProportionalRhythmEnginePolicy = {
  rhythmEngineId: 'free_proportional',
  label: 'Free / Proportional',
  primaryAbstraction: 'time_field',
  timeModes: ['free', 'proportional', 'quasi_measured', 'measured'],
  durationBuckets: ['very_short', 'short', 'medium', 'long', 'very_long'],
  gestureTypes: ['single_event', 'short_group', 'sustained_mass', 'glissando_span', 'cluster_dissolve', 'silence'],
  coordinationLevels: ['fixed_sync', 'soft_window', 'independent_local'],
  composerProfiles: ['dutilleux', 'ligeti', 'crumb', 'lachenmann'],
  antiMetric: true,
  pulseStateDefault: 'none',
  dynamicDensityDecoupled: true,
};

/** Fingerprint receipts for SQ free/proportional engine. Prefix: FP_RHYTHM_* */
export const FREE_PROPORTIONAL_RHYTHM_RECEIPTS: readonly string[] = [
  'FP_RHYTHM_POLICY_01:rhythmEngineId=free_proportional',
  'FP_RHYTHM_POLICY_02:primaryAbstraction=time_field_not_beat_cycle',
  'FP_RHYTHM_POLICY_03:no_pulse_base_no_subgroup_vector_no_meter_signature_truth',
  'FP_RHYTHM_EVENT_STORE:onset_sec+duration_sec+local_ratio+gesture_class',
  'FP_RHYTHM_TIME_MODE_01:free_no_governing_pulse_fermata_ad_lib',
  'FP_RHYTHM_TIME_MODE_02:proportional_boxed_span_relative_duration',
  'FP_RHYTHM_TIME_MODE_03:quasi_measured_controlled_quasi_free_dutilleux_default',
  'FP_RHYTHM_TIME_MODE_04:measured_gateway_to_from_free_sections',
  'FP_RHYTHM_BUCKET_01:very_short_0p1_to_0p4s_impulse',
  'FP_RHYTHM_BUCKET_02:short_0p4_to_1p2s_attack_decay',
  'FP_RHYTHM_BUCKET_03:medium_1p2_to_3s_fragment',
  'FP_RHYTHM_BUCKET_04:long_3_to_8s_field_gliss',
  'FP_RHYTHM_BUCKET_05:very_long_8_to_20s_plus_process',
  'FP_RHYTHM_RATIO:scalar_vs_local_norm_per_event_dual_store',
  'FP_RHYTHM_GESTURE_01:single_event_attack_snap_scratch_short_tone',
  'FP_RHYTHM_GESTURE_02:short_group_2_to_5_burst_span_internal_spacing_profile',
  'FP_RHYTHM_GESTURE_03:sustained_mass_tremolo_noise_band_activity_density',
  'FP_RHYTHM_GESTURE_04:glissando_span_start_end_continuity_quality',
  'FP_RHYTHM_GESTURE_05:cluster_dissolve_density_envelope_not_note_sequence',
  'FP_RHYTHM_SILENCE:first_class_gesture_not_absence_tension_structural',
  'FP_RHYTHM_SEQUENCE_01:single_to_group_to_mass_to_dissolve_to_silence_process',
  'FP_RHYTHM_SEQUENCE_02:mass_internal_fracture_to_dispersed_residues',
  'FP_RHYTHM_COORD_01:fixed_sync_formal_boundaries_ritual_cues',
  'FP_RHYTHM_COORD_02:soft_window_100_to_500ms_texture_entry_exit_default_DL',
  'FP_RHYTHM_COORD_03:independent_local_bounded_span_crumb_lachenmann',
  'FP_RHYTHM_RULE:section_specifies_coordination_per_event_class_no_global_hard_sync_default_free',
  'FP_RHYTHM_DENSITY_DISCRETE:sparse_active_volatile_events_per_sec_per_player',
  'FP_RHYTHM_DENSITY_CONTINUOUS:sustained_mass_internal_activity_separate_axis',
  'FP_RHYTHM_DECOUPLE:forbid_louder_equals_denser_automatic_mapping',
  'FP_RHYTHM_ACCEL_NO_TEMPO:shrink_gaps_overlap_silence_tighten_register_agitation',
  'FP_RHYTHM_STASIS:long_span_stable_dyn_low_change_broad_silence',
  'FP_RHYTHM_TRANS_M2F_01:abrupt_suspension_pulse_cessation',
  'FP_RHYTHM_TRANS_M2F_02:progressive_erosion_ritard_into_duration_field',
  'FP_RHYTHM_TRANS_M2F_03:gateway_gesture_long_hold_absorbs_beat_identity',
  'FP_RHYTHM_TRANS_F2M_01:anchor_emergence_equal_attacks_crystalize_meter',
  'FP_RHYTHM_TRANS_F2M_02:ostinato_crystallization_repeat_establishes_subdivision',
  'FP_RHYTHM_TRANS_F2M_03:cue_return_notated_or_gesture',
  'FP_RHYTHM_GATEWAY_TAG:transition_marker_events_required_explicit',
  'FP_RHYTHM_PROFILE_DU:quasi_measured_soft_window_high_timbral_continuity_palindrome_ok',
  'FP_RHYTHM_PROFILE_LG:free_soft_window_100_300ms_texture_mutation_volatile_can_stay_soft',
  'FP_RHYTHM_PROFILE_CB:free_fixed_sync_anchors_independent_local_dispersion_ritual_silence',
  'FP_RHYTHM_PROFILE_LC:free_independent_local_action_fields_density_not_loudness',
  'FP_RHYTHM_DIFF_AKSAK:no_additive_micro_pulse_lattice_not_countable_micro_pulse_primary',
  'FP_RHYTHM_DIFF_BAROQUE:forbid_periodic_phrase_hierarchy_regular_tactus_cadential_metric_expectation',
  'FP_RHYTHM_DIFF_GROOVE:no_stable_cyclic_entrainment_no_repeating_interlock',
  'FP_RHYTHM_DIFF_RUBATO:grid_replaced_not_deformed_ontologically_gesture_governed',
  'FP_RHYTHM_FORMULA:gestures_not_beats_anchors_not_bars_density_energy_not_pulse_recurrence',
  'FP_RHYTHM_SUSTAIN_RULE:long_sustain_requires_bow_change_stagger_trem_or_pressure_noise',
];

export function mergeFreeProportionalSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'free_proportional',
    sqRhythmEngineReceipts: FREE_PROPORTIONAL_RHYTHM_RECEIPTS,
  };
}
