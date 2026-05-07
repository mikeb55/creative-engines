/**
 * Style Panel harmonic voice tags merged into `styleGenerationContextKeys` after `hv:<id>`.
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';

export const MORRICONE_HARMONIC_STYLE_KEYS: readonly string[] = [
  'parallel_planing',
  'modal_mixture',
  'open_fifths_pad',
  'dorian_pastoral',
  'phrygian_inflection',
  'lydian_noble',
  'suspended_resolution',
  'chromatic_bass_motion',
  'pedal_tone_epic',
  'added_ninth_pad',
  'repeat_note_motto',
  'italian_operatic_prep',
];

export const HERRMANN_HARMONIC_STYLE_KEYS: readonly string[] = [
  'diminished_seventh_axis',
  'augmented_sonority',
  'parallel_cluster_strings',
  'chromatic_sequence',
  'whole_tone_tint',
  'tritone_tremolo',
  'motor_ostinato',
  'psycho_cluster',
  'vertigo_chromatic_descent',
  'cadential_avoidance',
  'locked_parallel_motion',
  'noir_harmonic_darkness',
];

export const QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS: readonly string[] = [
  'dominant_extensions',
  'two_five_one',
  'blues_gospel_iv',
  'bebop_approach',
  'big_band_spread',
  'slash_chords',
  'turnaround_language',
  'mixolydian_groove',
  'rhythm_section_pocket',
  'soul_ballad_pad',
  'shout_chorus_energy',
];

export const BADALAMENTI_HARMONIC_STYLE_KEYS: readonly string[] = [
  'minor_major_seventh',
  'chromatic_descending_line',
  'maj7_ballad',
  'sus_haze',
  'melodic_minor_color',
  'modal_stasis',
  'hypnotic_loop',
  'cool_jazz_ballad',
  'noir_lounge',
  'behind_the_beat',
  'lynchian_uncanny',
  'sixth_added_warmth',
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
    default:
      return [];
  }
}
