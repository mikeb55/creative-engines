/**
 * Melody behaviour metadata — repetition, intervals, rhythm, phrase shape, research-derived devices.
 * Profiles drive {@link planLeadMelody}; optional vocal-lead-sheet manifest hints.
 */

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
}

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
    repetitionVsVariationBias: 0.8,
    phraseLength: 5,
    contourProfile: 'flat_with_terminal_climax',
    phraseAsymmetryTendency: 0.68,
    cadenceFrequency: 'low',
    devices: ['cell_repetition', 'modal_unease', 'metric_dislocation'],
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
    intervalTendency: 'mixed',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.3,
    phraseLength: 8,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.52,
    cadenceFrequency: 'medium',
    devices: ['destination_tone', 'inside_outside_arc', 'guitaristic_leap', 'lyrical_jazz'],
  },
  wayne_shorter: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'mixed',
    repetitionVsVariationBias: 0.3,
    phraseLength: 3,
    contourProfile: 'irregular',
    phraseAsymmetryTendency: 0.62,
    cadenceFrequency: 'medium',
    devices: ['tritone', '4th_5th_leap', 'enigmatic_cadence', 'motivic_fragmentation'],
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
    devices: ['tritone', 'whole_tone_fragment', 'chromatic_enclosure', 'deliberate_silence'],
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
  john_coltrane: {
    intervalTendency: 'angular',
    rhythmicSubdivision: 'eighth_patterns',
    repetitionVsVariationBias: 0.22,
    phraseLength: 4,
    contourProfile: 'bebop_arc',
    phraseAsymmetryTendency: 0.44,
    cadenceFrequency: 'high',
    devices: ['chromatic_side_slip', 'sequential_cell', 'third_pairs', 'sheets_of_sound_density'],
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
    cadenceFrequency: 'medium',
    devices: ['quartal_melody', 'pentatonic_sideslip', 'suspended_dominant', 'funk_ostinato'],
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
    phraseLength: 4,
    contourProfile: 'arch',
    phraseAsymmetryTendency: 0.55,
    cadenceFrequency: 'medium',
    devices: ['aaba_form', 'flat_side_modal', 'co_tonic_switch', 'chromatic_mediant', 'suite_form'],
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
    devices: ['whole_tone_melody', 'pentatonic_contrast', 'parallel_planing', 'unresolved_appoggiatura', 'arabesque'],
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

/**
 * Style-specific melodic behaviour for Song Mode lead melody planning.
 * Prefer {@link MELODY_PROFILES}; fallback is seed-tinted defaults.
 */
export function planMelodyBehaviour(seed: number, primaryStyle: SongwriterRuleId): MelodyBehaviourPlan {
  const row = MELODY_PROFILES[primaryStyle];
  const base = defaultMelodyBehaviour(seed);
  if (!row) {
    return base;
  }
  return {
    ...row,
    repetitionVsVariationBias: clamp01(row.repetitionVsVariationBias),
    phraseAsymmetryTendency: clamp01(row.phraseAsymmetryTendency),
    devices: [...row.devices],
  };
}
