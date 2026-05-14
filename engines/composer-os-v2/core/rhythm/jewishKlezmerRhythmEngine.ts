/**
 * String Quartet — Jewish / Klezmer SQ rhythm engine (six gait library + doina pole;
 * pairs with Shostakovich SQ VRB `jewish_dance_rhythm` language; not aksak packets, not Baroque court dance).
 */

import type { GenerationMetadata } from '../compositionContext';

/** Six distinct dance / free-rhetoric gaits (KL1–KL6). */
export type KlezmerGaitId = 'KL1' | 'KL2' | 'KL3' | 'KL4' | 'KL5' | 'KL6';

export interface JewishKlezmerRhythmEnginePolicy {
  rhythmEngineId: 'jewish_klezmer';
  label: 'Jewish / Klezmer';
  /** Gait = meter + subdivision + accent + roles + ornament + cadence; not one groove. */
  primaryAbstraction: 'dance_gait_family';
  gaitLibrary: readonly KlezmerGaitId[];
  feltSubdivisionLayer: true;
  ornamentClasses: readonly ('pre_accent' | 'on_accent' | 'cadential')[];
  modalCoupling: readonly ('freygish' | 'mi_sheberakh' | 'natural_minor_variant')[];
  portamentoStructural: true;
  /** Stylized subclass: retain gait + modal markers; intensify irony / friction. */
  shostakovichVariant: true;
  /** KL1–KL5: bar grid. KL6: phrase-timed (see `doinaAntiMetric`). */
  antiMetric: false;
  /** KL6 Doina — unmeasured / proportional; not slow 4/4 with rubato only. */
  doinaAntiMetric: true;
}

export const JEWISH_KLEZMER_DEFAULT_POLICY: JewishKlezmerRhythmEnginePolicy = {
  rhythmEngineId: 'jewish_klezmer',
  label: 'Jewish / Klezmer',
  primaryAbstraction: 'dance_gait_family',
  gaitLibrary: ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6'],
  feltSubdivisionLayer: true,
  ornamentClasses: ['pre_accent', 'on_accent', 'cadential'],
  modalCoupling: ['freygish', 'mi_sheberakh', 'natural_minor_variant'],
  portamentoStructural: true,
  shostakovichVariant: true,
  antiMetric: false,
  doinaAntiMetric: true,
};

/** Fingerprint receipts. Prefix: KL_RHYTHM_* (30+). */
export const JEWISH_KLEZMER_RHYTHM_RECEIPTS: readonly string[] = [
  'KL_RHYTHM_POLICY_01:rhythmEngineId=jewish_klezmer',
  'KL_RHYTHM_POLICY_02:label=Jewish_Klezmer',
  'KL_RHYTHM_POLICY_03:primaryAbstraction=dance_gait_family_plus_free_rubato_type',
  'KL_RHYTHM_POLICY_04:gaitLibrary=KL1_KL2_KL3_KL4_KL5_KL6',
  'KL_RHYTHM_POLICY_05:feltSubdivisionLayer=true_written_meter_and_felt_subdivision_per_gait',
  'KL_RHYTHM_POLICY_06:ornamentClasses=pre_accent_on_accent_cadential',
  'KL_RHYTHM_POLICY_07:modalCoupling=freygish_mi_sheberakh_natural_minor_variant',
  'KL_RHYTHM_POLICY_08:portamentoStructural=true_metric_or_phrase_peak_attack_shaping',
  'KL_RHYTHM_POLICY_09:shostakovich_variant=true_irony_harmonic_friction_under_gait',
  'KL_RHYTHM_POLICY_10:antiMetric_false_KL1_to_KL5_doinaAntiMetric_true_KL6_only',
  'KL_RHYTHM_CORE:six_gaits_not_single_groove_family',
  'KL_RHYTHM_PAIRING:shostakovich_SQ_VRB_jewish_dance_rhythm_receipts_adjacent',
  'KL_RHYTHM_KL1:freylekhs_2_4_16step_grid_accent_vector_b1_strong_offbeat_spring',
  'KL_RHYTHM_KL1_CELLS:eighth_pairs_quarter_16_run_push_into_beat2',
  'KL_RHYTHM_KL1_BOW:buoyant_detaché_spring_into_ampersand_of_1_and_beat2',
  'KL_RHYTHM_KL2:bulgar_2_4_triplet_gallop_six_internal_pulses_accent_1_and_4',
  'KL_RHYTHM_KL2_DRIVE:giddyup_repeated_note_propulsion_heavier_than_freylekhs',
  'KL_RHYTHM_KL2_BOW:martele_like_emphasis_each_gallop_cell_start',
  'KL_RHYTHM_KL3:sher_2_4_even_8_16_march_like_square_beat1_periodic',
  'KL_RHYTHM_KL3_BOW:clear_articulated_detaché_regulated_group_dance',
  'KL_RHYTHM_KL4:khosidl_2_4_slower_duple_strong1_light2_stately_sway_lower_density',
  'KL_RHYTHM_KL4_BOW:broad_strokes_weighted_b1_gentler_b2',
  'KL_RHYTHM_KL5:hora_zhok_3_8_klezmer_NOT_romanian_hora_one_omitted_light_three_limp',
  'KL_RHYTHM_KL5_PATTERN:beat1_and_3_present_beat2_omitted_or_ghost_in_1_feel',
  'KL_RHYTHM_KL5_BOW:broad_on_1_and_3_audible_space_on_2',
  'KL_RHYTHM_KL6:doina_unmeasured_or_proportional_phrase_rhetoric_not_barlines',
  'KL_RHYTHM_KL6_TIME:breath_melisma_held_tones_stretch_compress_around_peaks',
  'KL_RHYTHM_KL6_ROLE:free_intro_mode_established_then_inherited_first_dance_strain',
  'KL_RHYTHM_FELT:KL1_live_offbeats_KL2_triplet_under_KL5_sway_omit_mid_KL6_none',
  'KL_RHYTHM_SYNCOP:weak_part_stress_offbeat_buoyancy_KL1_gallop_pickups_KL2',
  'KL_RHYTHM_ORN_PRE:krekht_slide_flat2_to_3_freygish_augmented_second_entries',
  'KL_RHYTHM_ORN_ON:tshok_crushed_grace_on_accent',
  'KL_RHYTHM_ORN_CAD:dreydl_sob_fall_phrase_end_snap_delay_resolution',
  'KL_RHYTHM_VOICES:V1_lead_ornaments_rhetoric_V2_Va_secunda_chop_offbeat_doubles',
  'KL_RHYTHM_VC:oom_pah_root_b1_fifth_or_rest_b2_not_jazz_walking_bass',
  'KL_RHYTHM_OOMPAH_KL1_4:dance_gaits_inner_offbeat_or_b2_chord_hits',
  'KL_RHYTHM_HORA_MODEL_KL5:VC_root_b1_b3_silence_b2_inner_light_b3_or_rest',
  'KL_RHYTHM_DOINA_MODEL_KL6:drone_pedal_sparse_sustain_no_oom_pah_grid',
  'KL_RHYTHM_HARM_RHYTHM:dance_tonic_dom_pedal_cycles_doina_drone_melody_first',
  'KL_RHYTHM_PHRASE:4plus4_inside_8bar_AABB_or_AABBCCBB_multi_strain',
  'KL_RHYTHM_CADENCE:tonic_return_ornamental_prep_descend_held_slide_or_sob',
  'KL_RHYTHM_CHAIN:doina_to_hora_to_freylekhs_to_bulgar_increasing_regularity',
  'KL_RHYTHM_SHOST_RETAIN:gait_weak_beat_stress_oom_pa_modal_aug2_gliss_pizz',
  'KL_RHYTHM_SHOST_TRANSFORM:more_dissonant_ironic_brutal_concert_frame',
  'KL_RHYTHM_FESTIVE:KL1_to_KL4_stable_meter_short_bows_high_recurrence_loops',
  'KL_RHYTHM_LAMENT:KL6_no_regular_grid_long_bows_melisma_suspended_cadence',
  'KL_RHYTHM_MODAL:accent_longer_slide_on_augmented_second_raised4_flat2_to_3',
  'KL_RHYTHM_DIFF_AKSAK:accent_displace_omit_triplet_NOT_recurring_additive_packets',
  'KL_RHYTHM_DIFF_BAROQUE:no_courtly_symmetry_vocalized_heterophony_freygish_profile',
  'KL_RHYTHM_DIFF_REBETIKO:ashkenazi_gaits_vs_zeibekiko_hasapiko_greek_ottoman',
  'KL_RHYTHM_DIFF_SHOST_PURE:grotesque_motoric_without_klezmer_gait_modal_identity',
  'KL_RHYTHM_DIFF_VIENNESE:not_rotational_3_4_waltz_lilt_primary',
  'KL_RHYTHM_ERR:avoid_polka_square_major_triad_grid_only',
  'KL_RHYTHM_ERR:avoid_uniform_eights_without_gait_identity',
  'KL_RHYTHM_ERR:avoid_doina_as_slow_metrical_4_4_with_rubato_only',
  'KL_RHYTHM_PRESET_DEFAULT:kl_chain_strain_ordering',
];

export function mergeJewishKlezmerSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'jewish_klezmer',
    sqRhythmEngineReceipts: JEWISH_KLEZMER_RHYTHM_RECEIPTS,
  };
}
