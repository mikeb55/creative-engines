/**
 * String Quartet — Baroque dance rhythm engine (diagnostic receipts + policy).
 * Dance-class identity with periodic hierarchy: tactus, pickup grammar, bar-accent profile, cadence weight — survives modern harmony (Crumb consort_past / lament model).
 */

import type { GenerationMetadata } from '../compositionContext';

export type BaroqueDanceClassId =
  | 'BD1'
  | 'BD2'
  | 'BD3'
  | 'BD4'
  | 'BD5'
  | 'BD6'
  | 'BD7'
  | 'BD8'
  | 'BD9'
  | 'pavane';

export type BaroquePickupKind = 'none' | 'weak' | 'short_note_upbeat' | 'one_beat' | 'half_bar' | 'noble_lift';

export interface BaroqueDanceRhythmEnginePolicy {
  rhythmEngineId: 'baroque_dance';
  label: 'Baroque Dance';
  primaryAbstraction: 'dance_class_with_periodic_hierarchy';
  danceClassLibrary: readonly BaroqueDanceClassId[];
  pickupTypes: readonly ('none' | 'one_beat' | 'half_bar' | 'short_note_upbeat')[];
  accentProfile: 'dance_specific';
  hemiolaEnabledForFrenchCourante: true;
  ornamentClasses: readonly ('structural' | 'decorative')[];
  structuralOrnamentsDefaultOff: true;
  cellosRole: 'tactus_anchor_primary_equal_bd2_bd5';
  groundBassEnabledBd9: true;
  modernHarmonyCompatible: true;
  antiMetric: false;
  phraseLengthDefaultBars: readonly [4, 8];
}

export const BAROQUE_DANCE_DEFAULT_POLICY: BaroqueDanceRhythmEnginePolicy = {
  rhythmEngineId: 'baroque_dance',
  label: 'Baroque Dance',
  primaryAbstraction: 'dance_class_with_periodic_hierarchy',
  danceClassLibrary: ['BD1', 'BD2', 'BD3', 'BD4', 'BD5', 'BD6', 'BD7', 'BD8', 'BD9', 'pavane'],
  pickupTypes: ['none', 'one_beat', 'half_bar', 'short_note_upbeat'],
  accentProfile: 'dance_specific',
  hemiolaEnabledForFrenchCourante: true,
  ornamentClasses: ['structural', 'decorative'],
  structuralOrnamentsDefaultOff: true,
  cellosRole: 'tactus_anchor_primary_equal_bd2_bd5',
  groundBassEnabledBd9: true,
  modernHarmonyCompatible: true,
  antiMetric: false,
  phraseLengthDefaultBars: [4, 8],
};

/** Canonical dance rows (meter feel, tempo band, pickup). Notation remains host decision. */
export const BAROQUE_DANCE_CLASS_SPECS: Record<
  Exclude<BaroqueDanceClassId, 'pavane'>,
  { dance: string; meter: string; tempoHint: string; pickup: BaroquePickupKind }
> = {
  BD1: { dance: 'Sarabande', meter: '3/4 slow', tempoHint: 'q=40–72', pickup: 'none' },
  BD2: { dance: 'Gigue', meter: '6/8,9/8,12/8', tempoHint: 'dotted q=72–132', pickup: 'short_note_upbeat' },
  BD3: { dance: 'French Courante', meter: '3/2 or 6/4', tempoHint: 'half=45–72', pickup: 'noble_lift' },
  BD4: { dance: 'Corrente', meter: '3/4 or 3/8', tempoHint: 'q=96–144', pickup: 'weak' },
  BD5: { dance: 'Allemande', meter: '4/4 or 2/2', tempoHint: 'q=60–96', pickup: 'short_note_upbeat' },
  BD6: { dance: 'Gavotte', meter: '2/2 or 4/4', tempoHint: 'half=52–80', pickup: 'half_bar' },
  BD7: { dance: 'Bourrée', meter: '2/2 or 2/4', tempoHint: 'half=66–88', pickup: 'one_beat' },
  BD8: { dance: 'Minuet', meter: '3/4', tempoHint: 'q=84–132', pickup: 'weak' },
  BD9: { dance: 'Chaconne/Passacaglia', meter: '3/4 or 3/2', tempoHint: 'q=45–88', pickup: 'none' },
};

/** Fingerprint receipts. Prefix: BD_RHYTHM_* */
export const BAROQUE_DANCE_RHYTHM_RECEIPTS: readonly string[] = [
  'BD_RHYTHM_POLICY_01:rhythmEngineId=baroque_dance',
  'BD_RHYTHM_POLICY_02:primaryAbstraction=dance_class_with_periodic_hierarchy',
  'BD_RHYTHM_POLICY_03:identity_pickup_type+tactus_level+bar_accent_profile+cadence_grammar+bass_function',
  'BD_RHYTHM_POLICY_04:not_surface_ornament_only_rhythm_survives_modern_harmony',
  'BD_RHYTHM_CLASS_BD1:Sarabande_3_4_slow_beat2_gravity_mid_bar_center',
  'BD_RHYTHM_CLASS_BD2:Gigue_compound_dotted_q_tactus_triplet_subdivide_leap_motion',
  'BD_RHYTHM_CLASS_BD3:French_courante_3_2_or_6_4_hemiola_primary_cadential_signal',
  'BD_RHYTHM_CLASS_BD4:Corrente_3_4_or_3_8_running_uniform_lighter_than_BD3',
  'BD_RHYTHM_CLASS_BD5:Allemande_4_4_or_2_2_one_to_three_short_upbeat_flowing_16ths',
  'BD_RHYTHM_CLASS_BD6:Gavotte_half_bar_upbeat_beat3_entry_buoyant_symmetry',
  'BD_RHYTHM_CLASS_BD7:Bourree_one_beat_upbeat_last_quarter_duple_drive',
  'BD_RHYTHM_CLASS_BD8:Minuet_3_4_balanced_court_regular_not_sarabande_beat2',
  'BD_RHYTHM_CLASS_BD9:Chaconne_passacaglia_ground_cycle_form_engine',
  'BD_RHYTHM_CLASS_PAVANE:slow_duple_archaic_lament_adjacent_BD1_crumb_consort_past',
  'BD_RHYTHM_BD1_FORMULA:stable_1_expressive_2_or_sustain_across_2_release_3',
  'BD_RHYTHM_BD1_HARM:slow_chord_per_beat_or_bar_suspension_appogg_on_bar_center',
  'BD_RHYTHM_BD2_CADENCE:sequential_momentum_hemiola_like_tightening_before_close',
  'BD_RHYTHM_BD3_HEMIOLA:explicit_voice_regroup_3+3_as_2+2+2_at_phrase_hinge',
  'BD_RHYTHM_BD4_CADENCE:quick_run_lighter_arrival_vs_courante',
  'BD_RHYTHM_BD5_AFFECT:learned_discourse_no_syncopated_dance_jolt',
  'BD_RHYTHM_BD6_CADENCE:square_symmetrical_half_bar_periodic_support',
  'BD_RHYTHM_BD7_CADENCE:pickup_sharp_cheerful_close',
  'BD_RHYTHM_BD8_CADENCE:symmetrical_balanced_periodic_arrival',
  'BD_RHYTHM_BD9_GROUND:cello_unchanged_or_near_N_cycles_before_variation',
  'BD_RHYTHM_BD9_PHRASE:ground_length_times_variation_not_binary_only',
  'BD_RHYTHM_VOICE_V1:melody_ornament_dance_pickup_profile',
  'BD_RHYTHM_VOICE_V2:counter_inner_offbeat_imitation_gigue_allemande',
  'BD_RHYTHM_VOICE_VA:harmonic_filler_suspension_inner_motion',
  'BD_RHYTHM_VOICE_VC:tactus_anchor_cadence_weight_equal_counterpoint_BD2_BD5',
  'BD_RHYTHM_ORNAMENT_STRUCTURAL:cadential_trill_appoggiatura_BD1_BD8_on_cadence_event_only',
  'BD_RHYTHM_ORNAMENT_DECORATIVE:passing_mordent_turn_BD6_BD7_optional_suppress',
  'BD_RHYTHM_ORNAMENT_DEFAULT:off_structural_gates_by_dance_class_and_cadence',
  'BD_RHYTHM_PHRASE:binary_default_4_or_8_bars_extensions_6_10_12_sequence_repeat_delay',
  'BD_RHYTHM_SELECT_LAMENT:BD1_pavane_BD9_ritual_archaic',
  'BD_RHYTHM_SELECT_NOBLE_TRIPLE:BD3_mobile',
  'BD_RHYTHM_SELECT_FINALE:BD2_imitative_propulsion',
  'BD_RHYTHM_MODERN_HARM:chromatic_aggregates_non_functional_verticals_allowed_identity_stable',
  'BD_RHYTHM_CRUMB_SARABANDE:slow_triple_beat2_gravity_ritual_spacing_modern_harmony_ok',
  'BD_RHYTHM_DIFF_WALTZ:BD8_minuet_restrained_square_not_rotational_one_bar_19c_lilt',
  'BD_RHYTHM_DIFF_AKSAK:periodic_tactus_regular_meter_no_subgroup_vector',
  'BD_RHYTHM_DIFF_FREE_PROP:grid_governed_tactus_phrase_periodicity_not_time_field',
  'BD_RHYTHM_DIFF_CLASSICAL:type_bound_choreographic_grammar_stable_not_dev_rhetoric_primary',
  'BD_RHYTHM_ARTIC_SUMMARY:BD1_broad_BD2_springy_BD3_noble_BD4_light_BD5_flowing_BD6_buoyant_BD7_sharp_BD8_restrained_BD9_ground_weight',
];

export function mergeBaroqueDanceSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'baroque_dance',
    sqRhythmEngineReceipts: BAROQUE_DANCE_RHYTHM_RECEIPTS,
  };
}
