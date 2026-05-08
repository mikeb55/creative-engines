/**
 * Style Panel harmonic voice tags merged into `styleGenerationContextKeys` after `hv:<id>`.
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';

export const MORRICONE_HARMONIC_STYLE_KEYS: readonly string[] = [
  'modal_dorian',
  'aeolian_lament_bass',
  'plagal_thirds_I_vi_IV_I',
  'simple_diatonic_triadism',
  'additive_orchestration_over_pedal',
  'twang_guitar_over_string_pads',
  'nonfunctional_modal_vamps',
  'stepwise_voice_leading_suspensions',
  'lyrical_intervallic_themes',
  'softened_plagal_cadence',
];

export const HERRMANN_HARMONIC_STYLE_KEYS: readonly string[] = [
  'chromatic_planing_major7',
  'tertian_polytonality',
  'ostinato_strings',
  'unresolved_chromatic_cadence',
  'parallel_sevenths_and_thirds',
  'quartal_color_chords',
  'cluster_intensity_high_register',
  'hemiola_rhythmic_cells',
  'slow_harmonic_rhythm',
  'monophonic_melody_over_blocks',
];

export const QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS: readonly string[] = [
  'functional_ii_V_I_jazz',
  'extended_dominants_9_13',
  'blues_gospel_cadences',
  'mixolydian_funk_vamps',
  'big_band_shout_choruses',
  'strings_jazz_pads',
  'groove_driven_harmony',
  'syncopated_backbeat_rhythms',
  'rnb_influenced_voicings',
  'chromatic_approach_dominants',
];

export const BADALAMENTI_HARMONIC_STYLE_KEYS: readonly string[] = [
  'slow_minor_ballad_harmony',
  'extended_chords_with_suspensions',
  'chromatic_inner_voice_motion',
  'noir_lounge_jazz_color',
  'ambient_string_pads',
  'unresolved_soft_cadences',
  'swing_inflected_ballads',
  'blues_tinged_melody',
  'synth_strings_hybrid_textures',
  'tonal_ambiguity_with_pedal',
];

export const JOHN_COLTRANE_HARMONIC_STYLE_KEYS: readonly string[] = [
  'coltrane_changes_cycle',
  'augmented_triad_tonal_centers',
  'rapid_modulatory_ii_v',
  'modal_dorian_pedals',
  'quartal_tyner_voicings',
  'lydian_maj7_sharp11',
  'pentatonic_superimposition',
  'sheets_of_sound_cells',
  'altered_dominant_tritone_sub',
  'minor_major7_tension',
  'symmetric_mode_collections',
  'free_cluster_pedal_textures',
  'third_relation_key_shifts',
  'planing_quartal_strings',
];

export const GIL_EVANS_HARMONIC_STYLE_KEYS: readonly string[] = [
  'non_functional_bass_motion',
  'modal_pedal_suspension',
  'mid_register_cluster_stacks',
  'top_voice_minor_second',
  'wide_bass_to_cluster_gap',
  'lydian_color_pads',
  'phrygian_spanish_flavor',
  'horn_flute_color_blend',
  'tuba_dark_root_foundation',
  'orchestration_as_chord_quality',
  'static_harmony_melodic_drift',
  'unresolved_suspension_tension',
  'parallel_modal_planing',
  'slow_cloud_harmonic_rhythm',
  'polyrhythmic_bass_against_pads',
];

export const MARIA_SCHNEIDER_HARMONIC_STYLE_KEYS: readonly string[] = [
  'organic_chord_morphing',
  'common_tone_voice_leading',
  'modal_pastoral_scenes',
  'lydian_dorian_color_blend',
  'interval_seeded_harmony',
  'narrative_harmonic_arc',
  'flugelhorn_woodwind_blend',
  'accordion_brass_color_pads',
  'suspended_but_soft_cadences',
  'brazilian_influenced_groove_modal',
  'data_world_dissonant_textures',
  'nature_world_lyrical_expansion',
  'mixed_quartal_tertian_stacks',
  'cross_section_orchestral_voicing',
  'long_pedal_with_inner_motion',
];

/** Wayne Shorter — motivic harmony, axis motion, melody-driven form (research-grounded Style Panel tags). */
/** Henry Threadgill — interval-set systems, modular forms, anti-metric ensemble logic. */
export const HENRY_THREADGILL_HARMONIC_STYLE_KEYS: readonly string[] = [
  'fixed_interval_cell_harmony',
  'closed_family_chord_series',
  'interval_pool_melodic_constraints',
  'non_functional_but_organized_harmony',
  'modular_formal_architecture',
  'orchestration_as_system',
  'anti_metric_drum_conduct',
  'concurrent_duet_tonal_fusion',
  'mosaic_block_counterpoint',
  'blues_march_source_material',
  'avant_blues_deformation',
  'hocket_layered_texture',
  'multi_meter_polyrhythm_streams',
  'register_stratified_ensembles',
  'tuba_guitar_interval_engine',
  'interval_based_cadence_convergence',
];

export const WAYNE_SHORTER_HARMONIC_STYLE_KEYS: readonly string[] = [
  'motivic_harmonic_derivation',
  'non_functional_neighbor_harmony',
  'axis_root_motion',
  'chromatic_mediant_shifts',
  'unresolved_sus_plateaus',
  'pedal_based_modal_plateaus',
  'major7_minor_major7_bias',
  'wrong_bass_upper_structure_voicings',
  'pentatonic_lyric_melody_core',
  'octave_leaps_with_contrary_resolution',
  'asymmetric_phrase_silence',
  'melody_driven_form_emergence',
  'postbop_plateau_forms',
  'quartet_textural_orchestration',
  'orchestral_coloristic_extensions',
  'motivic_imitation_across_sections',
];

/** Extra harmonic tags for Style Panel voices (empty when none). */
export function resolveHarmonicVoiceStyleContextKeys(voiceId: SongwriterRuleId): string[] {
  switch (voiceId) {
    case 'morricone':
      return [...MORRICONE_HARMONIC_STYLE_KEYS];
    case 'herrmann':
      return [...HERRMANN_HARMONIC_STYLE_KEYS];
    case 'quincy_jones_film':
      return [...QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS];
    case 'badalamenti':
      return [...BADALAMENTI_HARMONIC_STYLE_KEYS];
    case 'john_coltrane':
      return [...JOHN_COLTRANE_HARMONIC_STYLE_KEYS];
    case 'gil_evans':
      return [...GIL_EVANS_HARMONIC_STYLE_KEYS];
    case 'maria_schneider':
      return [...MARIA_SCHNEIDER_HARMONIC_STYLE_KEYS];
    case 'wayne_shorter':
      return [...WAYNE_SHORTER_HARMONIC_STYLE_KEYS];
    case 'henry_threadgill':
      return [...HENRY_THREADGILL_HARMONIC_STYLE_KEYS];
    default:
      return [];
  }
}
