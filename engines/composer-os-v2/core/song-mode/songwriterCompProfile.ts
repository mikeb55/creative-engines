/**
 * Song Mode — songwriter-led comp profile (keyboard vs guitar-centred writers).
 * Receipt-oriented metadata for routing and honest UI lines — not artist mimicry.
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

/** Primary instrument association for Song Mode menu writers (planning / receipts). */
export type SongwriterPrimaryInstrumentKind = 'keys' | 'guitar' | 'other';

/** Primary harmony carrier for comp lane routing. */
export type PrimaryCompInstrument = 'keys' | 'guitar' | 'ensemble';

export type RegisterBiasId = 'mid' | 'wide' | 'low_mid';

/** Small, inspectable comp profile — engine hooks use ids + metadata; prose stays on receipts. */
export interface SongwriterCompProfile {
  id: SongwriterRuleId;
  primaryCompInstrument: PrimaryCompInstrument;
  /** Stable tokens for downstream voicing hints (optional). */
  voicingBias: string[];
  registerBias: RegisterBiasId;
  rhythmicFeel: string[];
  smallMovementRules: string[];
  /** 1–2 lines appended to `songModeStyleSurfaceNotes` when this profile applies. */
  receiptLines: string[];
}

/** Guitar-forward primary in Song Mode — keep duo guitar/bass lead path without keys-comp overlay. */
export const GUITAR_CENTRIC_SONGWRITER_IDS: ReadonlySet<SongwriterRuleId> = new Set([
  'beatles',
  'joni_mitchell',
  'richard_thompson',
  'paul_simon',
]);

/** Canonical map: guitar trio explicit; all other Song Mode writers default to keys-centred comp for this slice. */
export const SONGWRITER_PRIMARY_INSTRUMENT: Record<SongwriterRuleId, SongwriterPrimaryInstrumentKind> = {
  bacharach: 'keys',
  barry_harris: 'keys',
  ecm_chamber: 'keys',
  stevie_wonder: 'keys',
  beatles: 'guitar',
  joni_mitchell: 'guitar',
  donald_fagen: 'keys',
  bob_dylan: 'keys',
  paul_simon: 'guitar',
  jeff_tweedy: 'keys',
  carole_king: 'keys',
  smokey_robinson: 'keys',
  randy_newman: 'keys',
  richard_thompson: 'guitar',
  max_martin: 'keys',
  brian_wilson: 'keys',
  paul_mccartney: 'keys',
  jeff_lynne: 'keys',
  xtc: 'keys',
  kurt_weill: 'keys',
  holland_dozier_holland: 'keys',
  norman_whitfield: 'keys',
  bach: 'keys',
  badalamenti: 'keys',
  beethoven: 'keys',
  bill_evans: 'keys',
  debussy: 'keys',
  herrmann: 'keys',
  stravinsky: 'keys',
  ravel: 'keys',
  schubert: 'keys',
  mahler: 'keys',
  prokofiev: 'keys',
  shostakovich: 'keys',
  messiaen: 'keys',
  morricone: 'keys',
  duke_ellington: 'keys',
  billy_strayhorn: 'keys',
  james_brown: 'keys',
  prince: 'keys',
  kendrick_lamar: 'keys',
  gil_evans: 'keys',
  thad_jones: 'keys',
  sammy_nestico: 'keys',
  quincy_jones: 'keys',
  quincy_jones_film: 'keys',
  bob_brookmeyer: 'keys',
  maria_schneider: 'keys',
  clare_fischer: 'keys',
  manny_albam: 'keys',
  oliver_nelson: 'keys',
  gerald_wilson: 'keys',
  neal_hefti: 'keys',
  don_sebesky: 'keys',
  arcade_fire: 'keys',
  blur: 'keys',
  pavement: 'keys',
  radiohead: 'keys',
  sonic_youth: 'keys',
  wayne_shorter: 'keys',
  pat_metheny: 'keys',
  andrew_hill: 'keys',
  charlie_parker: 'keys',
  cole_porter: 'keys',
  dave_brubeck: 'keys',
  miles_davis: 'keys',
  bartok: 'keys',
  gershwin: 'keys',
  arvo_part: 'keys',
  satie: 'keys',
  fela_kuti: 'keys',
  greek_rebetiko: 'guitar',
  brazilian: 'guitar',
  new_orleans_second_line: 'keys',
  cuban_afro_cuban: 'keys',
  frank_zappa: 'keys',
  john_coltrane: 'keys',
  antonio_carlos_jobim: 'keys',
  herbie_hancock: 'keys',
  stephen_sondheim: 'keys',
  kate_bush: 'keys',
  thelonious_monk: 'keys',
};

export function songWriterPrimaryInstrument(id: SongwriterRuleId): SongwriterPrimaryInstrumentKind {
  return SONGWRITER_PRIMARY_INSTRUMENT[id];
}

export function isKeyboardCentricSongwriter(raw: string | undefined | null): boolean {
  const id = normalizeSongwriterStyleKey(raw ?? '');
  if (!id) return false;
  return songWriterPrimaryInstrument(id) === 'keys';
}

const FAGEN_KEYS_COMP: SongwriterCompProfile = {
  id: 'donald_fagen',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'compact_four_voice_colour',
    'prefer_third_seventh_ninth_thirteenth',
    'root_light_when_bass_implies_root',
    'maj9_alt_lydian_colour_when_symbol_allows',
  ],
  registerBias: 'mid',
  rhythmicFeel: [
    'anticipation_into_beats_two_four',
    'short_offbeat_stabs_half_bar_reply',
    'thin_whole_bar_pad_velocity',
  ],
  smallMovementRules: [
    'inner_voice_stepwise_adjacent_bars',
    'phrase_four_bar_tension_then_clearer_landing',
    'b_section_register_density_lift',
  ],
  /** Receipt lines for Fagen come from `applySongModeFagenKeysCompV15` + Donald surface — avoid duplicate bullets. */
  receiptLines: [],
};

const BACHARACH_KEYS_COMP: SongwriterCompProfile = {
  id: 'bacharach',
  primaryCompInstrument: 'keys',
  voicingBias: ['maj7_functional_pop_jazz', 'iv_sus_colour'],
  registerBias: 'mid',
  rhythmicFeel: ['gentle_phrasing_irregularities'],
  smallMovementRules: ['smooth_top_line_support'],
  receiptLines: [
    'Song Mode Bacharach slice: keyboard comp favoured smooth I/IV maj7 and IV/V sus colours with gentle phrasing irregularities. Not an imitation of any artist.',
  ],
};

const GIL_EVANS_KEYS_COMP: SongwriterCompProfile = {
  id: 'gil_evans',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'mid_register_cluster_mid_high_gap',
    'minor_second_extension_top',
    'non_tertian_stack_order',
    'quartet_vla_vln2_extension_carrier',
    'cello_pedal_contrary_line',
  ],
  registerBias: 'wide',
  rhythmicFeel: ['slow_cloud_harmonic_rhythm', 'polyrhythm_in_grid_not_harmony'],
  smallMovementRules: [
    'parallel_modal_planing_by_step_or_third',
    'unresolved_suspension_hold',
    'wide_bass_to_upper_air',
  ],
  receiptLines: [
    'Harmonic voice Gil Evans — rhythm pairing hints: Brazilian bossa/samba (br) slow changes + extended chords; Cuban/Afro-Cuban (cu) polyrhythmic layering vs static pads (Sketches hybrid); Fela Afrobeat (fk) modal vamps + cluster orchestration; Greek Rebetiko (gr) secondary fit only; New Orleans Second Line (sl) avoid as primary (brassy functional clash). Quartet: inner colour tones on viola/Vln2, cello root/pedal, biting m2 inner not top. Not an imitation of any artist.',
  ],
};

const JOHN_COLTRANE_KEYS_COMP: SongwriterCompProfile = {
  id: 'john_coltrane',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'quartal_stack_tyner',
    'perfect_fourth_fifth_inner_chains',
    'cluster_minor_second_late_period',
    'major_third_cycle_inner_motion',
  ],
  registerBias: 'wide',
  rhythmicFeel: ['changes_burst_cells', 'modal_pedal_even_eighths', 'free_texture_rubato_pockets'],
  smallMovementRules: [
    'inner_tritone_structural_pairs',
    'parallel_quartal_planing_non_functional',
    'outer_voice_stepwise_over_inner_third_shifts',
  ],
  receiptLines: [
    'Harmonic voice John Coltrane — rhythm pairing hints: Fela Afrobeat (fk) one–two chord vamps + layered ostinati for Dorian pedal + pentatonic superimposition; Brazilian bossa (br) continuous eighths + extended harmony for modal/changes hybrids; Cuban Afro 6/8 (cu) pedal + modal vamp over clave (Africa/Brass / Olé lineage). Not an imitation of any artist.',
  ],
};

const JONI_ACOUSTIC_COMP: SongwriterCompProfile = {
  id: 'joni_mitchell',
  primaryCompInstrument: 'guitar',
  voicingBias: [
    'acoustic_guitar_primary',
    'open_string_drone_high',
    'sus_add9_six_nine_colour',
    'omit_third_where_possible',
  ],
  registerBias: 'mid',
  rhythmicFeel: ['fingerpicked_arpeggiated', 'sparse_strum_windows'],
  smallMovementRules: [
    'pedal_bass_stepwise_or_static',
    'tuning_family_open_d_open_e_open_g_annotation_only',
  ],
  receiptLines: [
    'Song Mode Joni Mitchell slice: acoustic guitar–led texture — fingerpicked / arpeggiated, high drone tendency; open D / open E / open G tuning families remain annotation-only in export metadata. Not an imitation of any artist.',
  ],
};

function genericKeysCompProfile(id: SongwriterRuleId): SongwriterCompProfile {
  return {
    id,
    primaryCompInstrument: 'keys',
    voicingBias: ['functional_block_chords'],
    registerBias: 'mid',
    rhythmicFeel: ['chart_friendly_timing'],
    smallMovementRules: ['minimal_inner_motion'],
    receiptLines: [
      'Song Mode: keyboard-led comp presentation (mid-register chord voicings on the primary harmony staff). Not an imitation of any artist.',
    ],
  };
}

/**
 * Non-null only for keyboard-centric primaries — guitar-led writers (Beatles, Paul Simon, Richard Thompson)
 * return null so Song Mode keeps the existing guitar/bass duo behaviour without keys-comp routing.
 */
export function getSongwriterCompProfile(raw: string | undefined | null): SongwriterCompProfile | null {
  const id = normalizeSongwriterStyleKey(raw ?? '');
  if (!id) return null;
  if (id === 'joni_mitchell') return JONI_ACOUSTIC_COMP;
  if (!isKeyboardCentricSongwriter(id)) return null;
  switch (id) {
    case 'donald_fagen':
      return FAGEN_KEYS_COMP;
    case 'bacharach':
      return BACHARACH_KEYS_COMP;
    case 'john_coltrane':
      return JOHN_COLTRANE_KEYS_COMP;
    case 'gil_evans':
      return GIL_EVANS_KEYS_COMP;
    default:
      return genericKeysCompProfile(id);
  }
}
