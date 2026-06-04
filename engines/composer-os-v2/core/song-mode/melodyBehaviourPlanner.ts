/**
 * Melody behaviour metadata — repetition, intervals, rhythm, phrase shape, research-derived devices.
 * Profiles drive {@link planLeadMelody}; optional vocal-lead-sheet manifest hints.
 */

import type { BeatlesContextMode, BeatlesMelodicLens } from '../compositionContext';
import type { SongwriterRuleId } from './songwritingResearchTypes';

/** Vocal planning rhythm density — drives quarter vs eighth patterns in {@link planLeadMelody}. */
export type MelodyRhythmicSubdivision =
  | 'whole_bar'
  | 'half_quarter'
  | 'eighth_patterns'
  | 'mixed';

/** Research-derived melodic contour label (maps to phrase contour bias in {@link planLeadMelody}). */
export type MelodyContourProfileId =
  | 'arch'
  | 'ascending'
  | 'flat_with_terminal_climax'
  | 'riff'
  | 'flat'
  | 'irregular'
  | 'speech_contour'
  | 'dramatic_leap'
  | 'bebop_arc'
  | 'wide_arc'
  | 'conversational'
  | 'groove_arc'
  | 'sequence'
  | 'motivic_development'
  | 'recitation'
  | 'rising'
  | 'dissolving'
  | 'cabaret_arc';

/** Optional Motif Authority Layer hints — consumed by {@link planLeadMelody} where wired. */
export interface MalLeadHints {
  attackDensity?: 'low' | 'medium' | 'high';
  interOnsetSpacing?: 'narrow' | 'medium' | 'wide';
  avoidStrongBeatOneAttack?: boolean;
  commonToneReturnBias?: number;
  sequentialDisplacementBias?: number;
  modalIntervalPreference?: boolean;
}

export interface MelodyBehaviourPlan {
  repetitionVsVariationBias: number;
  intervalTendency: 'stepwise' | 'mixed' | 'angular';
  phraseAsymmetryTendency: number;
  cadenceFrequency: 'low' | 'medium' | 'high';
  rhythmicSubdivision: MelodyRhythmicSubdivision;
  /** Target phrase length hint (bars). */
  phraseLength: number;
  contourProfile: MelodyContourProfileId;
  /** Named devices for pedagogy / manifests (slice vocabulary hooks). */
  devices: readonly string[];
  /**
   * When true with {@link intervalTendency} `stepwise`, the first melodic cell on the phrase apex bar
   * may take one **8–11 semitone** leap toward a chord tone (ECM-style emotional peak).
   */
  wideLeapPeakPerPhrase?: boolean;
  malLeadHints?: MalLeadHints;
  /** Beatles BT_MEL / BT_FP_04 — Lennon vs McCartney vs blended writer lens (default **`blended`**). */
  beatlesMelodicLens?: BeatlesMelodicLens;
  /** Beatles BT_MEL_05 — Abbey-era exotic/modal melody vocabulary. */
  beatlesLatePeriodModalMelody?: boolean;
  /** Beatles BT_MEL_02 — perfect-fourth leaps emphasized only in late-period encoding. */
  beatlesAllowFourthLeapEmphasis?: boolean;
  /** RH_MEL_05 — resolved acoustic (stepwise chord-tone) vs electronic (syncopated layered) posture. */
  radioheadMelodicContext?: 'acoustic' | 'electronic';
}

/** RH_MEL_* pattern tags — Radiohead melodic research (`radioheadSlice` cross-ref). */
export const radioheadMelodicGrammarTags = {
  mel01_semitone_dominant: 'rh:mel01_semitone_dominant',
  mel02_narrow_range_obsessive: 'rh:mel02_narrow_range_obsessive',
  mel03_outside_modal_clash: 'rh:mel03_outside_modal_clash',
  mel04_falsetto_break: 'rh:mel04_falsetto_break_boundary',
  mel05_acoustic: 'rh:mel05_acoustic_mode',
  mel05_electronic: 'rh:mel05_electronic_mode',
} as const;

export type RadioheadMelodyPlanOptions = {
  melodicContext?: 'acoustic' | 'electronic';
};

/** DB_MEL_01–05 — Debussy melodic research (`applyDebussyMelodicEncoding`). */
export const debussyMelodicGrammarTags = {
  mel01_conjunct_arabesque: 'db:mel01_conjunct_arabesque',
  mel02_modal_pentatonic_cells: 'db:mel02_modal_pentatonic_cells',
  mel03_gesture_timbre_handoff: 'db:mel03_gesture_timbre_handoff',
  mel04_coloristic_ornaments: 'db:mel04_coloristic_ornaments',
  mel05_texture_embedded: 'db:mel05_texture_embedded',
} as const;

export function collectDebussyMelodicGrammarReceipts(plan: MelodyBehaviourPlan): string[] {
  return plan.devices.filter((d) => d.startsWith('db:mel'));
}

/** Receipt tags aligned with Beatles melodic research (BT_MEL_01–05). */
export const beatlesMelodicGrammarTags = {
  mel01_SRDC: 'bt:mel01_SRDC_eight_bar',
  mel02_distribution: 'bt:mel02_interval_distribution_arch',
  mel03_lennon: 'bt:mel03_lennon_mode',
  mel04_mccartney: 'bt:mel04_mccartney_mode',
  mel05_late_modal: 'bt:mel05_late_period_modal_melody',
} as const;

export type BeatlesMelodyPlanOptions = {
  beatlesContext?: BeatlesContextMode;
  beatlesMelodicLens?: BeatlesMelodicLens;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Defaults when no research row exists — seed-tinted for variety. */
function defaultMelodyBehaviour(seed: number): MelodyBehaviourPlan {
  return {
    repetitionVsVariationBias: clamp01(0.5 + (seed % 20) / 100),
    intervalTendency: 'mixed',
    phraseAsymmetryTendency: clamp01(0.4 + (seed % 17) / 100),
    cadenceFrequency: 'medium',
    rhythmicSubdivision: (['whole_bar', 'half_quarter', 'eighth_patterns', 'mixed'] as const)[seed % 4]!,
    phraseLength: 4,
    contourProfile: 'arch',
    devices: [],
  };
}

/**
 * Research-derived profiles for SongwriterRuleId.
 * Cadence / phrase-asymmetry extras align with harmonic rhythm where not specified in research bullets.
 */
export const MELODY_PROFILES: Partial<Record<SongwriterRuleId, MelodyBehaviourPlan>> = {
  brian_wilson: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 7,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.72,
    cadenceFrequency: 'medium',
    devices: ['sequential_expansion', 'appoggiatura', 'suspension'],
  },
  stevie_wonder: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.4,
    phraseLength: 4,
    contourProfile: 'ascending',
    phraseAsymmetryTendency: 0.48,
    cadenceFrequency: 'medium',
    devices: ['melisma', 'syncopated_anticipation', 'blues_note', 'gospel_lift'],
  },
  radiohead: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.82,
    phraseLength: 5,
    contourProfile: 'flat_with_terminal_climax',
    phraseAsymmetryTendency: 0.68,
    cadenceFrequency: 'low',
    devices: ['cell_repetition', 'modal_unease', 'metric_dislocation'],
    wideLeapPeakPerPhrase: true,
  },
  james_brown: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.9,
    phraseLength: 2,
    contourProfile: 'riff',
    phraseAsymmetryTendency: 0.35,
    cadenceFrequency: 'high',
    devices: ['on_the_one', 'blues_note', 'call_response', 'sparse_density'],
  },
  prince: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.58,
    phraseLength: 4,
    contourProfile: 'groove_arc',
    phraseAsymmetryTendency: 0.5,
    cadenceFrequency: 'medium',
    devices: ['minor_vamp', 'gospel_cadence', 'chromatic_bass', 'stop_time', 'bridge_modulation'],
  },
  sonic_youth: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.7,
    phraseLength: 2,
    contourProfile: 'flat',
    phraseAsymmetryTendency: 0.81,
    cadenceFrequency: 'low',
    devices: ['drone_melody', 'dissonant_dyad', 'shape_melody', 'narrow_range'],
  },
  pat_metheny: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.65,
    phraseLength: 10,
    contourProfile: 'wide_arc',
    phraseAsymmetryTendency: 0.58,
    cadenceFrequency: 'low',
    devices: [
      'stepwise_and_thirds_majority',
      'extension_targets_nine_sharp_eleven_thirteen',
      'long_arch_multi_bar_ascent_descent_plateau',
      'breath_and_long_tone_phrase_endings',
      'two_three_motives_high_reuse_transpose_orchestrate',
      'americana_pentatonic_seed_then_lydian_palette',
      'singer_like_phrasing_cross_barline_odd_meter',
    ],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
      avoidStrongBeatOneAttack: false,
    },
  },
  wayne_shorter: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.74,
    phraseLength: 5,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.78,
    cadenceFrequency: 'medium',
    devices: [
      'extension_primary_targets_9_11_13',
      'sparse_triadic_skeleton',
      'micro_motive_ops_transposition_inversion_rhythm_shift',
      'probabilistic_breath_and_long_tone_pivot',
      'phrase_offset_grid_eighth',
      'cross_barline_elision',
      'weak_beat_delayed_resolution',
      'asymmetric_three_five_seven_beat_cells',
    ],
    malLeadHints: {
      attackDensity: 'medium',
      interOnsetSpacing: 'medium',
    },
  },
  jim_hall: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.55,
    phraseLength: 6,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.62,
    cadenceFrequency: 'medium',
    devices: [
      'sparse_interval_shell',
      'inner_voice_chromatic_pass',
      'counter_melody_to_bass',
      'guide_tone_anchor',
      'third_sixth_tenth_voicing_bias',
      'breath_between_phrases',
    ],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
    },
  },
  barry_harris: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.4,
    phraseLength: 4,
    contourProfile: 'bebop_arc',
    phraseAsymmetryTendency: 0.41,
    cadenceFrequency: 'high',
    devices: ['chromatic_enclosure', 'approach_tone', 'bebop_scale', 'ii_V_outline'],
  },
  stephen_sondheim: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.3,
    phraseLength: 5,
    contourProfile: 'speech_contour',
    phraseAsymmetryTendency: 0.88,
    cadenceFrequency: 'high',
    devices: ['word_painting', 'chromatic_tension', 'asymmetric_phrase'],
  },
  kate_bush: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.3,
    phraseLength: 6,
    contourProfile: 'dramatic_leap',
    phraseAsymmetryTendency: 0.76,
    cadenceFrequency: 'low',
    devices: ['wide_leap', 'melisma', 'modal_color', 'dramaturgical_phrase'],
  },
  thelonious_monk: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.6,
    phraseLength: 2,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.69,
    cadenceFrequency: 'medium',
    devices: [
      'tritone',
      'whole_tone_fragment',
      'chromatic_enclosure',
      'deliberate_silence',
      'rhythmic_displacement',
    ],
  },
  dave_brubeck: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.58,
    cadenceFrequency: 'medium',
    devices: ['odd_meter_alignment', 'quartal_shape', 'additive_cell', 'blues_modal_mixture'],
  },
  bartok: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.35,
    phraseLength: 5,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.68,
    cadenceFrequency: 'low',
    devices: ['folk_pentatonic_cell', 'axis_motion', 'bulgarian_cell', 'mirror_fragment', 'cluster_passing'],
  },
  gershwin: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.38,
    phraseLength: 8,
    contourProfile: 'cabaret_arc',
    phraseAsymmetryTendency: 0.58,
    cadenceFrequency: 'high',
    devices: ['aaba_form', 'blue_note_color', 'syncopated_anticipation', 'chromatic_passing', 'minor_third_modulation'],
  },
  andrew_hill: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.4,
    phraseLength: 5,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.74,
    cadenceFrequency: 'low',
    devices: ['motivic_fragmentation', 'interval_expansion', 'chromatic_sideslip', 'pedal_ambiguity'],
  },
  charlie_parker: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.2,
    phraseLength: 4,
    contourProfile: 'bebop_arc',
    phraseAsymmetryTendency: 0.44,
    cadenceFrequency: 'high',
    devices: ['chromatic_enclosure', 'upper_structure_arpeggio', 'ii_V_outline', 'bebop_scale'],
  },
  bill_evans: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.4,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.5,
    cadenceFrequency: 'medium',
    devices: ['inner_voice_melody', 'modal_interchange', 'delayed_resolution', 'impressionistic_voicing'],
  },
  gil_evans: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.42,
    phraseLength: 6,
    contourProfile: 'dissolving',
    phraseAsymmetryTendency: 0.62,
    cadenceFrequency: 'low',
    devices: ['modal_cloud', 'floating_register', 'pedal_haze', 'voice_led_strip', 'sparse_density'],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
      avoidStrongBeatOneAttack: true,
      modalIntervalPreference: true,
    },
  },
  maria_schneider: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.55,
    phraseLength: 8,
    contourProfile: 'wide_arc',
    phraseAsymmetryTendency: 0.72,
    cadenceFrequency: 'low',
    devices: ['sparse_phrase', 'modal_field', 'breath_space', 'nature_arc', 'chamber_texture', 'common_tone_return'],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
      commonToneReturnBias: 0.62,
    },
  },
  kenny_wheeler: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.52,
    phraseLength: 5,
    contourProfile: 'wide_arc',
    phraseAsymmetryTendency: 0.78,
    cadenceFrequency: 'low',
    devices: ['polyaxial_harmony', 'tension_carry', 'wide_leap_repair', 'open_cadence', 'anacrusis', 'register_gap'],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
      avoidStrongBeatOneAttack: true,
    },
  },
  john_coltrane: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.22,
    phraseLength: 4,
    contourProfile: 'bebop_arc',
    phraseAsymmetryTendency: 0.44,
    cadenceFrequency: 'high',
    devices: ['sequential_cell', 'third_pairs', 'quartal_stack', 'sheets_of_sound_density'],
    malLeadHints: {
      attackDensity: 'high',
      interOnsetSpacing: 'narrow',
      sequentialDisplacementBias: 0.65,
    },
  },
  bacharach: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.3,
    phraseLength: 5,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.85,
    cadenceFrequency: 'medium',
    devices: ['metric_shift', 'phrase_extension', 'suspended_appoggiatura', 'chromatic_bass'],
  },
  donald_fagen: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.5,
    phraseLength: 4,
    contourProfile: 'conversational',
    phraseAsymmetryTendency: 0.56,
    cadenceFrequency: 'medium',
    devices: ['guide_tone_melody', 'blues_over_jazz_harmony', 'syncopated_hook', 'static_pitch_over_moving_chords'],
  },
  frank_zappa: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.2,
    phraseLength: 3,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.77,
    cadenceFrequency: 'medium',
    devices: ['polyrhythmic_unison', 'chromatic_sideslip', 'interval_expansion', 'synthetic_scale', 'sudden_meter_change'],
  },
  joni_mitchell: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.3,
    phraseLength: 6,
    contourProfile: 'wide_arc',
    phraseAsymmetryTendency: 0.78,
    cadenceFrequency: 'low',
    devices: ['open_tuning_pitch_field', 'unresolved_suspension', 'wide_leap_stepwise_descent', 'modal_drone'],
  },
  antonio_carlos_jobim: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.5,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.46,
    cadenceFrequency: 'low',
    devices: ['bossa_anticipation', 'lydian_dominant', 'chromatic_approach', 'sigh_figure'],
  },
  herbie_hancock: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.4,
    phraseLength: 4,
    contourProfile: 'groove_arc',
    phraseAsymmetryTendency: 0.49,
    cadenceFrequency: 'low',
    devices: ['quartal', 'modal_pedal', 'side_slip', 'upper_structure_triad'],
  },
  henry_threadgill: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.68,
    phraseLength: 4,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.76,
    cadenceFrequency: 'low',
    devices: [
      'interval_pool_majority_constraint',
      'angular_jagged_contour',
      'probabilistic_hocket_rest_after_cell',
      'unison_octave_arrival_reserved_for_cadence',
      'mosaic_canon_displacement',
      'blues_march_seed_then_interval_transform',
    ],
    malLeadHints: {
      attackDensity: 'medium',
      interOnsetSpacing: 'wide',
    },
  },
  charles_mingus: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.42,
    phraseLength: 6,
    contourProfile: 'speech_contour',
    phraseAsymmetryTendency: 0.74,
    cadenceFrequency: 'medium',
    devices: [
      'blues_scale_core_with_chromatic_approaches',
      'bass_led_counter_melody_bias',
      'collective_line_agents_two_three_note_cells',
      'irregular_phrase_lengths_shouts_vs_interjections',
      'gospel_shout_density_when_section_tagged',
      'call_response_high_low_alternate_two_four_bars',
      'blues_gospel_seed_then_transform',
    ],
    malLeadHints: {
      attackDensity: 'medium',
      interOnsetSpacing: 'medium',
      avoidStrongBeatOneAttack: false,
    },
  },
  bach: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.4,
    phraseLength: 2,
    contourProfile: 'sequence',
    phraseAsymmetryTendency: 0.42,
    cadenceFrequency: 'high',
    devices: ['imitation', 'sequence', 'suspension_chain', 'invertible_counterpoint', 'circle_of_fifths'],
  },
  beatles: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.55,
    cadenceFrequency: 'medium',
    devices: [
      'aaba_form',
      'flat_side_modal',
      'co_tonic_switch',
      'chromatic_mediant',
      'suite_form',
      'vl01_chromatic_inner_voice_line',
      'vl06_SRDC_phrase_roles',
      'vl05_blue_note_clash_colour',
    ],
  },
  fela_kuti: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.52,
    phraseLength: 4,
    contourProfile: 'groove_arc',
    phraseAsymmetryTendency: 0.58,
    cadenceFrequency: 'low',
    devices: ['static_vamp', 'call_response', 'pentatonic_layer', 'parallel_horns', 'polymetric_grid'],
  },
  beethoven: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 4,
    contourProfile: 'motivic_development',
    phraseAsymmetryTendency: 0.62,
    cadenceFrequency: 'medium',
    devices: ['motivic_fragmentation', 'sequence', 'liquidation', 'sforzando_displacement', 'registral_expansion'],
  },
  billy_strayhorn: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.4,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.58,
    cadenceFrequency: 'medium',
    devices: ['chromatic_descent', 'dominant_chain', 'lush_extensions', 'delayed_cadence', 'sequence_through_remote_keys'],
  },
  bob_dylan: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.8,
    phraseLength: 8,
    contourProfile: 'recitation',
    phraseAsymmetryTendency: 0.55,
    cadenceFrequency: 'low',
    devices: ['strophic_variation', 'repeated_note_recitation', 'modal_pentatonic', 'line_ending_fall', 'folk_drone'],
  },
  carole_king: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 4,
    contourProfile: 'rising',
    phraseAsymmetryTendency: 0.5,
    cadenceFrequency: 'medium',
    devices: ['gospel_suspension', 'repeated_note_hook', 'stepwise_verse_build', 'rising_chorus_sequence'],
  },
  debussy: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 3,
    contourProfile: 'dissolving',
    phraseAsymmetryTendency: 0.7,
    cadenceFrequency: 'low',
    devices: [
      'whole_tone_melody',
      'pentatonic_contrast',
      'parallel_planing',
      'unresolved_appoggiatura',
      'arabesque',
      'heterophonic_doubling',
      'extreme_pedal_register',
      'bell_register_frame',
    ],
  },
  bernard_herrmann: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.6,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.55,
    cadenceFrequency: 'medium',
    devices: ['polytonal_menace', 'neurotic_ostinato', 'cluster_stab', 'pedal_swell', 'tritone_inflection'],
  },
  john_williams: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.55,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.52,
    cadenceFrequency: 'high',
    devices: ['lydian_wonder', 'mixolydian_hero', 'leitmotif_anchor', 'brass_fanfare', 'chromatic_mediant'],
  },
  ennio_morricone: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.7,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.5,
    cadenceFrequency: 'medium',
    devices: ['endless_ostinato', 'plagal_thirds', 'dorian_colour', 'lament_bass', 'timbre_hook'],
  },
  nino_rota: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.75,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.48,
    cadenceFrequency: 'high',
    devices: ['waltz_colour', 'carnival_band', 'melancholy_cantilena', 'diatonic_glue', 'stravinsky_punch'],
  },
  jerry_goldsmith: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.5,
    phraseLength: 6,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.62,
    cadenceFrequency: 'low',
    devices: ['polytonal_action', 'mixed_meter_ostinato', 'quartal_brass', 'octatonic_suspense', 'motif_fragmentation'],
  },
  philip_glass: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.9,
    phraseLength: 4,
    contourProfile: 'riff',
    phraseAsymmetryTendency: 0.35,
    cadenceFrequency: 'low',
    devices: ['additive_cell', 'arpeggio_engine', 'static_pedal', 'micro_variation', 'modal_stasis'],
  },
  steve_reich: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.92,
    phraseLength: 8,
    contourProfile: 'sequence',
    phraseAsymmetryTendency: 0.28,
    cadenceFrequency: 'low',
    devices: [
      'additive_build',
      'phase_cell_canon',
      'drone_field_anchor',
      'diatonic_cluster_byproduct',
      'pulse_grid_dense',
    ],
    malLeadHints: {
      attackDensity: 'high',
      interOnsetSpacing: 'narrow',
    },
  },
  messiaen: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.55,
    phraseLength: 7,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.72,
    cadenceFrequency: 'low',
    devices: ['mode_colour_field', 'birdsong_ornament', 'non_retrogradable_cell', 'additive_prime_pulse'],
    malLeadHints: {
      attackDensity: 'low',
      interOnsetSpacing: 'wide',
    },
  },
  hans_zimmer: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.85,
    phraseLength: 4,
    contourProfile: 'riff',
    phraseAsymmetryTendency: 0.42,
    cadenceFrequency: 'medium',
    devices: ['ostinato_engine', 'hybrid_epic', 'static_time', 'mediantic_drift', 'low_end_impact'],
  },
  angelo_badalamenti: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.65,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.5,
    cadenceFrequency: 'low',
    devices: ['dark_lounge', 'chromatic_dream', 'vocal_theme', 'soft_pedal', 'parallel_shadow'],
  },
  duke_ellington: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.6,
    phraseLength: 4,
    contourProfile: 'riff',
    phraseAsymmetryTendency: 0.48,
    cadenceFrequency: 'high',
    devices: ['blues_riff', 'call_response', 'chromatic_inner_voice', 'plunger_color', 'sectional_shout'],
  },
  holland_dozier_holland: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.7,
    phraseLength: 2,
    contourProfile: 'rising',
    phraseAsymmetryTendency: 0.38,
    cadenceFrequency: 'high',
    devices: ['call_response_hook', 'repeated_title_phrase', 'tambourine_anticipation', 'backing_vocal_echo'],
  },
  jeff_lynne: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.6,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.45,
    cadenceFrequency: 'medium',
    devices: ['stacked_harmony_hook', 'octave_doubled_melody', 'string_countermelody', 'descending_bass_hook'],
  },
  jeff_tweedy: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.7,
    phraseLength: 4,
    contourProfile: 'flat',
    phraseAsymmetryTendency: 0.64,
    cadenceFrequency: 'low',
    devices: ['deadpan_repeated_note', 'modal_bVII', 'unresolved_suspension', 'folk_drone', 'understated_chorus'],
  },
  kendrick_lamar: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.5,
    phraseLength: 3,
    contourProfile: 'speech_contour',
    phraseAsymmetryTendency: 0.52,
    cadenceFrequency: 'medium',
    devices: ['flow_modulation', 'syllabic_ostinato', 'pitch_zone_contrast', 'barline_displacement', 'triplet_switch'],
  },
  kurt_weill: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.6,
    phraseLength: 4,
    contourProfile: 'cabaret_arc',
    phraseAsymmetryTendency: 0.82,
    cadenceFrequency: 'high',
    devices: ['descending_minor_3rd', 'tritone_bitterness', 'chant_repeated_tone', 'major_minor_irony', 'mechanical_ostinato'],
  },
  max_martin: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'half_quarter',
    repetitionVsVariationBias: 0.88,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.25,
    cadenceFrequency: 'high',
    devices: ['hook_density', 'rise_and_payoff', 'section_lift'],
  },
  miles_davis: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.72,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.52,
    cadenceFrequency: 'low',
    wideLeapPeakPerPhrase: false,
    devices: ['modal_field', 'breath_space', 'deliberate_silence', 'cool_phrasing', 'motivic_cell'],
  },
  arvo_part: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'whole_bar',
    repetitionVsVariationBias: 0.55,
    phraseLength: 4,
    contourProfile: 'flat_with_terminal_climax',
    phraseAsymmetryTendency: 0.32,
    cadenceFrequency: 'low',
    devices: ['tintinnabuli_voice', 'silence_as_structure', 'additive_cell', 'register_arch', 'triadic_transform'],
  },
  satie: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'whole_bar',
    repetitionVsVariationBias: 0.62,
    phraseLength: 4,
    contourProfile: 'flat',
    phraseAsymmetryTendency: 0.38,
    cadenceFrequency: 'low',
    devices: ['static_field', 'parallel_planning', 'cell_repetition', 'texture_form', 'modal_collection'],
  },
  ornette_coleman: {
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.44,
    phraseLength: 2,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.72,
    cadenceFrequency: 'low',
    devices: ['pitch_field', 'harmolodic_unison', 'democratic_foreground', 'blues_inflection', 'pulse_float'],
  },
  cole_porter: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.75,
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.28,
    cadenceFrequency: 'high',
    devices: ['chromatic_descent', 'hook_identity', 'bvi_color', 'diatonic_density', 'beguine_feel'],
  },
  ecm_chamber: {
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'whole_bar',
    repetitionVsVariationBias: 0.34,
    phraseLength: 6,
    contourProfile: 'dissolving',
    phraseAsymmetryTendency: 0.67,
    cadenceFrequency: 'low',
    devices: ['sparse_phrase', 'modal_field', 'breath_space'],
    wideLeapPeakPerPhrase: true,
  },
};

function seededUnitRadiohead(seed: number, salt: number): number {
  let s = (seed ^ salt * 1103515245) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** RH_MEL_01–05 — semitone-led line, narrow obsessive centre, outside clashes, falsetto boundary, acoustic/electronic split. */
function applyRadioheadMelodicEncoding(
  row: MelodyBehaviourPlan,
  seed: number,
  opts?: RadioheadMelodyPlanOptions
): MelodyBehaviourPlan {
  const devices = [...row.devices];
  const pushTag = (t: string): void => {
    if (!devices.includes(t)) devices.push(t);
  };
  pushTag(radioheadMelodicGrammarTags.mel01_semitone_dominant);
  pushTag(radioheadMelodicGrammarTags.mel02_narrow_range_obsessive);
  pushTag(radioheadMelodicGrammarTags.mel03_outside_modal_clash);
  pushTag(radioheadMelodicGrammarTags.mel04_falsetto_break);

  const ctx: 'acoustic' | 'electronic' =
    opts?.melodicContext ??
    (seededUnitRadiohead(seed, 55103) < 0.5 ? 'acoustic' : 'electronic');

  pushTag(ctx === 'acoustic' ? radioheadMelodicGrammarTags.mel05_acoustic : radioheadMelodicGrammarTags.mel05_electronic);

  const rhythmicSubdivision: MelodyRhythmicSubdivision =
    ctx === 'acoustic' ? 'half_quarter' : 'eighth_patterns';

  return {
    ...row,
    devices,
    intervalTendency: 'stepwise',
    rhythmicSubdivision,
    repetitionVsVariationBias: clamp01(0.82 + (seed % 11) / 100),
    cadenceFrequency: 'low',
    wideLeapPeakPerPhrase: true,
    phraseLength: Math.min(row.phraseLength, 6),
    contourProfile: row.contourProfile ?? 'flat_with_terminal_climax',
    radioheadMelodicContext: ctx,
  };
}

export function collectRadioheadMelodicGrammarReceipts(plan: MelodyBehaviourPlan): string[] {
  const out = plan.devices.filter((d) => d.startsWith('rh:mel'));
  if (plan.radioheadMelodicContext) {
    out.push(`rh:mel05_context=${plan.radioheadMelodicContext}`);
  }
  return out;
}

/** DB_MEL_01–05 — conjunct arabesque + M2 field; modal/pentatonic independence; timbral gesture handoff; weak-beat ornaments; texture-fused line. */
function applyDebussyMelodicEncoding(row: MelodyBehaviourPlan, seed: number): MelodyBehaviourPlan {
  const devices = [...row.devices];
  const pushTag = (t: string): void => {
    if (!devices.includes(t)) devices.push(t);
  };
  pushTag(debussyMelodicGrammarTags.mel01_conjunct_arabesque);
  pushTag(debussyMelodicGrammarTags.mel02_modal_pentatonic_cells);
  pushTag(debussyMelodicGrammarTags.mel03_gesture_timbre_handoff);
  pushTag(debussyMelodicGrammarTags.mel04_coloristic_ornaments);
  pushTag(debussyMelodicGrammarTags.mel05_texture_embedded);

  const mal: MalLeadHints = {
    ...(row.malLeadHints ?? {}),
    modalIntervalPreference: true,
    avoidStrongBeatOneAttack: true,
    commonToneReturnBias: clamp01(0.52 + (seed % 7) / 100),
    sequentialDisplacementBias: clamp01(0.28 + (seed % 5) / 100),
    attackDensity: 'low',
    interOnsetSpacing: 'wide',
  };

  return {
    ...row,
    devices,
    intervalTendency: 'stepwise',
    rhythmicSubdivision: 'half_quarter',
    phraseLength: Math.min(row.phraseLength, 4),
    repetitionVsVariationBias: clamp01(0.42 + (seed % 9) / 100),
    cadenceFrequency: 'low',
    contourProfile: row.contourProfile ?? 'dissolving',
    malLeadHints: mal,
  };
}

function applyBeatlesMelodicEncoding(
  row: MelodyBehaviourPlan,
  _seed: number,
  opts?: BeatlesMelodyPlanOptions
): MelodyBehaviourPlan {
  const lens: BeatlesMelodicLens = opts?.beatlesMelodicLens ?? 'blended';
  const lateModal = opts?.beatlesContext === 'abbey_road_1968';
  const fourthEmphasis = opts?.beatlesContext === 'abbey_road_1968';

  const devices = [...row.devices];
  const pushDev = (t: string): void => {
    if (!devices.includes(t)) devices.push(t);
  };
  pushDev(beatlesMelodicGrammarTags.mel01_SRDC);
  pushDev(beatlesMelodicGrammarTags.mel02_distribution);
  pushDev('beatles_fp02_NCT_departure_D');

  let intervalTendency = row.intervalTendency;
  const mal: MalLeadHints = { ...(row.malLeadHints ?? {}) };

  if (lens === 'blended') {
    intervalTendency = 'stepwise';
    mal.modalIntervalPreference = true;
    pushDev(beatlesMelodicGrammarTags.mel03_lennon);
    pushDev(beatlesMelodicGrammarTags.mel04_mccartney);
  } else if (lens === 'lennon') {
    intervalTendency = 'stepwise';
    mal.modalIntervalPreference = true;
    pushDev(beatlesMelodicGrammarTags.mel03_lennon);
  } else if (lens === 'mccartney') {
    intervalTendency = 'mixed';
    pushDev(beatlesMelodicGrammarTags.mel04_mccartney);
  }

  if (lateModal) {
    pushDev(beatlesMelodicGrammarTags.mel05_late_modal);
    mal.modalIntervalPreference = true;
  }

  return {
    ...row,
    devices,
    intervalTendency,
    malLeadHints: Object.keys(mal).length ? mal : undefined,
    beatlesMelodicLens: lens,
    beatlesLatePeriodModalMelody: lateModal,
    beatlesAllowFourthLeapEmphasis: fourthEmphasis,
  };
}

/**
 * Style-specific melodic behaviour for Song Mode lead melody planning.
 * Prefer {@link MELODY_PROFILES}; fallback is seed-tinted defaults.
 */
export function planMelodyBehaviour(
  seed: number,
  primaryStyle: SongwriterRuleId,
  beatlesOpts?: BeatlesMelodyPlanOptions,
  radioheadOpts?: RadioheadMelodyPlanOptions
): MelodyBehaviourPlan {
  const row = MELODY_PROFILES[primaryStyle];
  const base = defaultMelodyBehaviour(seed);
  if (!row) {
    return base;
  }
  const merged =
    primaryStyle === 'beatles'
      ? applyBeatlesMelodicEncoding(row, seed, beatlesOpts)
      : primaryStyle === 'radiohead'
        ? applyRadioheadMelodicEncoding(row, seed, radioheadOpts)
        : primaryStyle === 'debussy'
          ? applyDebussyMelodicEncoding(row, seed)
          : { ...row, devices: [...row.devices] };
  return {
    ...merged,
    repetitionVsVariationBias: clamp01(merged.repetitionVsVariationBias),
    phraseAsymmetryTendency: clamp01(merged.phraseAsymmetryTendency),
    devices: [...merged.devices],
  };
}

export type { BeatlesMelodicLens } from '../compositionContext';
