/**
 * String Quartet — Viennese Waltz SQ rhythm engine (3/4 one-bar rotational unit;
 * lilt = timing + weight + duration; distinct from minuet BD8, sarabande BD1, Reich grid).
 */

import type { GenerationMetadata } from '../compositionContext';

export type VienneseWaltzStyleProfileId =
  | 'standard'
  | 'brahms_variant'
  | 'ravel_variant'
  | 'ironic_grotesque';

export interface VienneseWaltzRhythmEnginePolicy {
  rhythmEngineId: 'viennese_waltz';
  label: 'Viennese Waltz';
  meter: '3/4';
  /** Bar = single rotating unit; NOT three equal pulses. */
  primaryAbstraction: 'one_bar_rotational_unit';
  /** Non-negotiable beat hierarchy: w1 > w2 > w3. */
  beatWeightProfile: readonly ['w1_high', 'w2_medium', 'w3_low'];
  vienneseLiltEnabled: true;
  /** Beat 2 anticipated: early by this % of bar (spec 3–8). */
  liltTimingOffsetPercentMin: 3;
  liltTimingOffsetPercentMax: 8;
  /** Beat 2 marginally more present than 3; NOT sarabande accent on 2. */
  accentAsymmetry: 'beat2_marginally_more_present_than_beat3_not_sarabande';
  /** Combined with timing_offset + accent_asymmetry for lilt. */
  durationEncoding: 'b1_medium_short_b2_light_brushed_b3_released';
  bassChordPolarity: 'enforced_vc_beat1_inner_homorhythmic_beats2_3';
  hypermetricDefault: '2bar_cells_8bar_phrases';
  phraseLevelRubato: true;
  tempoRangeBpmMin: 145;
  tempoRangeBpmMax: 190;
  tempoActiveCenterMin: 156;
  tempoActiveCenterMax: 180;
  styleProfiles: readonly VienneseWaltzStyleProfileId[];
  antiMetric: false;
  contrastVsBaroqueMinuet: true;
}

export const VIENNESE_WALTZ_DEFAULT_POLICY: VienneseWaltzRhythmEnginePolicy = {
  rhythmEngineId: 'viennese_waltz',
  label: 'Viennese Waltz',
  meter: '3/4',
  primaryAbstraction: 'one_bar_rotational_unit',
  beatWeightProfile: ['w1_high', 'w2_medium', 'w3_low'],
  vienneseLiltEnabled: true,
  liltTimingOffsetPercentMin: 3,
  liltTimingOffsetPercentMax: 8,
  accentAsymmetry: 'beat2_marginally_more_present_than_beat3_not_sarabande',
  durationEncoding: 'b1_medium_short_b2_light_brushed_b3_released',
  bassChordPolarity: 'enforced_vc_beat1_inner_homorhythmic_beats2_3',
  hypermetricDefault: '2bar_cells_8bar_phrases',
  phraseLevelRubato: true,
  tempoRangeBpmMin: 145,
  tempoRangeBpmMax: 190,
  tempoActiveCenterMin: 156,
  tempoActiveCenterMax: 180,
  styleProfiles: ['standard', 'brahms_variant', 'ravel_variant', 'ironic_grotesque'],
  antiMetric: false,
  contrastVsBaroqueMinuet: true,
};

/** Fingerprint receipts. Prefix: VW_RHYTHM_* (30+). */
export const VIENNESE_WALTZ_RHYTHM_RECEIPTS: readonly string[] = [
  'VW_RHYTHM_POLICY_01:rhythmEngineId=viennese_waltz',
  'VW_RHYTHM_POLICY_02:label=Viennese_Waltz',
  'VW_RHYTHM_POLICY_03:meter=3_4_invariant',
  'VW_RHYTHM_POLICY_04:primaryAbstraction=one_bar_rotational_unit',
  'VW_RHYTHM_POLICY_05:beatWeightProfile=w1_high_w2_medium_w3_low',
  'VW_RHYTHM_POLICY_06:vienneseLiltEnabled=true',
  'VW_RHYTHM_POLICY_07:liltTimingOffsetPercent=3_to_8_beat2_early',
  'VW_RHYTHM_POLICY_08:bassChordPolarity=enforced_vc_b1_inner_b23',
  'VW_RHYTHM_POLICY_09:hypermetricDefault=2bar_cells_8bar_phrases',
  'VW_RHYTHM_POLICY_10:phraseLevelRubato=true',
  'VW_RHYTHM_POLICY_11:tempoRangeBpm=145_to_190_active_center_156_to_180',
  'VW_RHYTHM_POLICY_12:styleProfiles=standard_brahms_variant_ravel_variant_ironic_grotesque',
  'VW_RHYTHM_POLICY_13:antiMetric=false',
  'VW_RHYTHM_CORE:bar_single_rotating_unit_not_three_equal_pulses',
  'VW_RHYTHM_IDENTITY:weight_timing_bass_polarity_phrase_rubato_hypermeter',
  'VW_RHYTHM_LILT:combined_timing_weight_duration_phrase_sensitive',
  'VW_RHYTHM_BEAT1:accented_buoyant_medium_short_bass_attack_w1_highest',
  'VW_RHYTHM_BEAT2:lighter_anticipated_early_3_to_8pct_bar_chordal_w2_medium',
  'VW_RHYTHM_BEAT3:lightest_released_near_ghost_w3_lowest',
  'VW_RHYTHM_WEIGHT_RULE:w1_gt_w2_gt_w3_non_negotiable',
  'VW_RHYTHM_LILT_TIMING:shorten_1_to_2_lengthen_2_to_3_b3_released_not_rushed',
  'VW_RHYTHM_LILT_ACCENT:b2_more_than_b3_not_equal_chord_beats_not_sarabande_on_2',
  'VW_RHYTHM_LILT_DURATION:b1_medium_short_b2_brushed_b3_released',
  'VW_RHYTHM_TEMPO:below_145_concert_or_slow_waltz_drift',
  'VW_RHYTHM_TEMPO:above_190_loses_rotation_rushed',
  'VW_RHYTHM_HYPER:2bar_local_rotation_cell_primary',
  'VW_RHYTHM_PHRASE:8bar_standard_4bar_subhalf_pickups_tags_intro_elision',
  'VW_RHYTHM_PHRASE_END:strong_arrival_beat1_default',
  'VW_RHYTHM_ELISION:next_phrase_immediate_cadence_ballroom_momentum',
  'VW_RHYTHM_BREATH:1bar_rest_transition_before_pickup_reentry',
  'VW_RHYTHM_RUBATO_ARC:8bar_push_mid_broaden_close_lilt_stable_within_arc',
  'VW_RHYTHM_RUBATO_LEVEL:phrase_level_not_bar_by_bar_mechanical',
  'VW_RHYTHM_VC:beat1_bass_octave_fifth_ok_never_equal_three_beat_pounding',
  'VW_RHYTHM_VC_B23:rest_pizz_shadow_harmonic_residue_no_full_chord_weight',
  'VW_RHYTHM_VA_V2:b23_homorhythmic_chord_simultaneous_attack_default',
  'VW_RHYTHM_STAGGER_OPT:va_v2_10_to_35ms_air_excess_weakens_pa_pa',
  'VW_RHYTHM_V1:melody_above_grid_pickups_suspensions_slurred_rotational_glide',
  'VW_RHYTHM_ARTIC_B1:clear_not_heavy_buoyant_not_ponderous_downbow',
  'VW_RHYTHM_ARTIC_B23:lifted_brushed_off_string_semi_staccato_short',
  'VW_RHYTHM_ARTIC_B2_vs_B3:b2_marginally_more_present_than_b3',
  'VW_RHYTHM_MELODY_SLUR:bar_spanning_against_accompaniment_grid',
  'VW_RHYTHM_DYN_BAR:b1_strongest_b2_less_b3_least_buoyant',
  'VW_RHYTHM_DYN_PHRASE:swell_overrides_local_accents_at_climax',
  'VW_RHYTHM_PROFILE_STANDARD:strauss_full_lilt_intro_thematic_chain',
  'VW_RHYTHM_PROFILE_BRAHMS:syncopation_hemiola_displacement_dense_inner',
  'VW_RHYTHM_PROFILE_RAVEL:sharp_harmony_refined_texture_valses_nobles',
  'VW_RHYTHM_PROFILE_LA_VALSE:instability_excess_while_triple_topic_readable',
  'VW_RHYTHM_PROFILE_IRONIC:shostakovich_distort_secondaries_grammar_legible',
  'VW_RHYTHM_FORM:scherzo_substitute_trio_lyric_ironic_memory_whole_movement',
  'VW_RHYTHM_OPEN_STRAUSS:harmonic_textural_intro_before_bass_chord_lock',
  'VW_RHYTHM_OPEN_MODERN:shimmer_haze_motivic_before_bar_profile_locks',
  'VW_RHYTHM_CLOSE:broaden_rubato_exaggerate_b1_coda_optional_2_to_4bars',
  'VW_RHYTHM_TRANS_INTO:b1_bass_anchor_light_b23_establish_one_bar_rotation',
  'VW_RHYTHM_TRANS_OUT:equalize_beats_remove_polarity_or_smear_texture',
  'VW_RHYTHM_ERR:forbid_three_equal_beats',
  'VW_RHYTHM_ERR:forbid_b1_peasant_heavy_kills_lift',
  'VW_RHYTHM_ERR:forbid_vc_marking_all_three_beats_equally',
  'VW_RHYTHM_ERR:forbid_inner_chords_too_legato_or_dense',
  'VW_RHYTHM_ERR:forbid_missing_phrase_rubato_or_hypermeter',
  'VW_RHYTHM_ERR:forbid_mechanical_identical_lilt_every_bar',
  'VW_RHYTHM_NONNEG:rotation_bass_polarity_light_b23_phrase_buoyancy_hypermeter',
  'VW_RHYTHM_DIFF_MINUET:faster_circular_lilt_centrifugal_stronger_polarity_than_BD8',
  'VW_RHYTHM_DIFF_SARABANDE:slow_b2_gravity_vs_waltz_b1_propulsion_mobile',
  'VW_RHYTHM_DIFF_SCHERZO34:waltz_dance_topic_accomp_ballroom_archetype',
  'VW_RHYTHM_DIFF_FP:periodic_hypermeter_vs_span_cues_energy_field',
  'VW_RHYTHM_ALIAS_NOTE:waltz_viennese_wiener_walzer_strauss_waltz_engine_level',
  'VW_RHYTHM_PRESET_DEFAULT:standard_strauss_model',
];

export function mergeVienneseWaltzSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'viennese_waltz',
    sqRhythmEngineReceipts: VIENNESE_WALTZ_RHYTHM_RECEIPTS,
  };
}
