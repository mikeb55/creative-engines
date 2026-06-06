/**
 * Song Mode — songwriter-led comp profile (keyboard vs guitar-centred writers).
 * Receipt-oriented metadata for routing and honest UI lines — not artist mimicry.
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';
import { isRiffVrbSongwriterId, normalizeSongwriterStyleKey } from './songwriterStyleProfiles';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { RiffProfile } from '../composer/riffProfileTypes';

/** Primary instrument association for Song Mode menu writers (planning / receipts). */
export type SongwriterPrimaryInstrumentKind = 'keys' | 'guitar' | 'ensemble' | 'flugelhorn' | 'other';

/** Primary harmony carrier for comp lane routing. */
export type PrimaryCompInstrument = 'keys' | 'guitar' | 'ensemble' | 'sax' | 'flugelhorn';

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
  'jim_hall',
  'richard_thompson',
  'paul_simon',
  'fripp_king_crimson',
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
  angelo_badalamenti: 'keys',
  beethoven: 'keys',
  bill_evans: 'keys',
  debussy: 'keys',
  bernard_herrmann: 'keys',
  stravinsky: 'keys',
  ravel: 'keys',
  schubert: 'keys',
  mahler: 'keys',
  prokofiev: 'keys',
  shostakovich: 'keys',
  messiaen: 'keys',
  ennio_morricone: 'keys',
  john_williams: 'keys',
  nino_rota: 'keys',
  jerry_goldsmith: 'keys',
  lalo_schifrin: 'keys',
  john_barry: 'keys',
  philip_glass: 'keys',
  steve_reich: 'keys',
  hans_zimmer: 'keys',
  duke_ellington: 'keys',
  billy_strayhorn: 'keys',
  james_brown: 'keys',
  prince: 'keys',
  kendrick_lamar: 'keys',
  gil_evans: 'keys',
  thad_jones: 'keys',
  count_basie: 'keys',
  sammy_nestico: 'keys',
  quincy_jones: 'keys',
  quincy_jones_film: 'keys',
  bob_brookmeyer: 'keys',
  maria_schneider: 'keys',
  kenny_wheeler: 'flugelhorn',
  jan_garbarek: 'other',
  john_surman: 'other',
  ralph_towner: 'other',
  eberhard_weber: 'other',
  claus_ogerman: 'keys',
  bill_holman: 'keys',
  carla_bley: 'keys',
  clare_fischer: 'keys',
  manny_albam: 'keys',
  oliver_nelson: 'keys',
  gerald_wilson: 'keys',
  neal_hefti: 'keys',
  don_sebesky: 'keys',
  johnny_mandel: 'keys',
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
  mccoy_tyner: 'keys',
  bartok: 'keys',
  berg: 'ensemble',
  gershwin: 'keys',
  arvo_part: 'keys',
  satie: 'keys',
  fela_kuti: 'keys',
  greek_rebetiko: 'guitar',
  brazilian: 'guitar',
  new_orleans_second_line: 'keys',
  cuban_afro_cuban: 'keys',
  bartok_bulgarian_aksak: 'ensemble',
  free_proportional: 'ensemble',
  baroque_dance: 'ensemble',
  reich_phasing_grid: 'ensemble',
  viennese_waltz: 'ensemble',
  jewish_klezmer: 'ensemble',
  frank_zappa: 'keys',
  nile_rodgers: 'guitar',
  larry_carlton: 'guitar',
  wes_montgomery: 'guitar',
  joe_pass: 'guitar',
  allan_holdsworth: 'guitar',
  jack_white: 'guitar',
  beefheart: 'guitar',
  marr: 'guitar',
  scott_henderson: 'guitar',
  sly_stone: 'guitar',
  iommi: 'guitar',
  david_gilmour: 'guitar',
  hendrix: 'guitar',
  eddie_van_halen: 'guitar',
  led_zeppelin: 'guitar',
  weather_report: 'guitar',
  mahavishnu: 'guitar',
  verlaine: 'guitar',
  morello: 'guitar',
  fripp: 'guitar',
  fripp_king_crimson: 'guitar',
  john_coltrane: 'keys',
  jim_hall: 'guitar',
  antonio_carlos_jobim: 'keys',
  herbie_hancock: 'keys',
  henry_threadgill: 'keys',
  charles_mingus: 'keys',
  stephen_sondheim: 'keys',
  kate_bush: 'keys',
  thelonious_monk: 'keys',
  beethoven_late: 'keys',
  turtle_island: 'keys',
  reich_glass: 'keys',
  lachenmann: 'keys',
  ligeti: 'keys',
  crumb_black_angels: 'keys',
  dutilleux: 'keys',
  ornette_coleman: 'ensemble',
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

const DUKE_ELLINGTON_KEYS_COMP: SongwriterCompProfile = {
  id: 'duke_ellington',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'close_sax_soli_unison_doubles',
    'plunger_brass_dialogue_register',
    'warm_reed_pad_and_soli_lead',
    'stride_fill_structural_gaps',
  ],
  registerBias: 'wide',
  rhythmicFeel: ['two_beat_early_four_beat_later', 'swing_piano_push_pull'],
  smallMovementRules: [
    'soloist_led_arrangement_frames',
    'intro_outro_compositional_weight',
    'call_response_map_registers',
  ],
  receiptLines: [
    'Harmonic voice Duke Ellington — plunger/growl brass identity; jungle low brass + woodwind colour vs tutti homophony; stride/active piano comp (fills gaps vs sparse Basie); AABA + weighted intros/outros; solo frames steer orchestration; VRB fingerprints align BigBandResearch + playbook slice. Not an imitation of any artist.',
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

const CHARLES_MINGUS_KEYS_COMP: SongwriterCompProfile = {
  id: 'charles_mingus',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'dense_mid_register_horn_colour',
    'altered_dominant_extensions',
    'chromatic_bass_led_upper_structures',
    'gospel_shout_cluster_peaks',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'second_line_collective_parade',
    'clave_grid_without_downbeat_lock',
    'protest_groove_ostinato_layers',
  ],
  smallMovementRules: [
    'bass_line_first_then_harmony',
    'call_response_register_split',
    'collective_arrival_over_functional_cadence',
  ],
  receiptLines: [
    'Harmonic voice Charles Mingus — rhythm pairing hints: New Orleans Second Line (sl) primary — parade/collective improv, blues/gospel shout seams, march roots then displacement; Cuban Afro 6/8 (cu) clave as implicit grid while melodic strata deliberately drift off downbeats; Fela Afrobeat (fk) long protest ostinati + layered collective improvisation with blues-suite pitch grammar on repeating riffs.',
    'String quartet translation: cello carries Mingus-style bass counterlines; upper strings take shout countermelodies and chorale voicings; inner voices melodically independent with blues/gospel inflection.',
    'Big band translation: sections as independent contrapuntal choirs — brass vs reeds call–response; gospel-shout homophony reserved for climax; chromatic bass as harmonic driver not mere root pad. Not an imitation of any artist.',
  ],
};

const HENRY_THREADGILL_KEYS_COMP: SongwriterCompProfile = {
  id: 'henry_threadgill',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'three_note_interval_cells_only',
    'register_stratified_sparse_stacks',
    'no_functional_root_cycle_in_bass',
    'closed_family_rotation_hint',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'anti_metric_layers',
    'polyrhythm_loop_mismatch',
    'independent_stream_accents',
  ],
  smallMovementRules: [
    'interval_pool_lock_per_section',
    'hocket_voice_exchange',
    'cadence_unison_or_texture_flip_only',
  ],
  receiptLines: [
    'Harmonic voice Henry Threadgill — rhythm pairing hints: New Orleans Second Line (sl) march/blues seeds then anti-metric displacement and layer mismatch; Fela Afrobeat (fk) long ostinati + layered polyrhythms for modular cumulative forms with interval-governed riff pitch classes; Cuban Afro 6/8 (cu) clave as ghost metric — melodic strata deliberately avoid downbeat lock with percussion.',
    'String quartet translation: interval-set counterpoint, hocket time offsets, unison/octave convergence reserved for cadences, concurrent duets on disjoint rhythmic grids.',
    'Big band translation: sections behave as interval engines — no tutti block stacks; independent lines stratified by register; full-band unisons only as structural markers. Not an imitation of any artist.',
  ],
};

const PAT_METHENY_KEYS_COMP: SongwriterCompProfile = {
  id: 'pat_metheny',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'lydian_major_seven_sharp_eleven_colour',
    'open_spacing_add_nine_sus_plateau',
    'pedal_shimmer_long_hold_pairs',
    'diatonic_planing_non_functional_roots',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'brazilian_bossa_samba_baiao_under_lyrical_line',
    'afro_cuban_clave_intensity_under_modal_pad',
    'second_line_swamp_groove_americana_inflection',
  ],
  smallMovementRules: [
    'extension_weight_ninth_eleventh_thirteenth_over_shell',
    'avoid_dominant_chain_resolution_bias',
    'parallel_triad_or_constant_structure_over_static_bass',
  ],
  receiptLines: [
    'Harmonic voice Pat Metheny — rhythm pairing hints: Brazilian bossa/samba/baião (br) primary — lush Lydian/add9 harmony over understated groove and long-line melody; Cuban/Afro-Cuban (cu) for rhythmically intense spans — tumbao/clave under modal/Lydian fields; New Orleans Second Line (sl) for Americana-leaning landscapes — swampy groove under hymn-like pentatonic seeds.',
    'String quartet translation: sustained maj7/Lydian pads; natural harmonics as “open string” resonance; parallel triads over static bass; arching cantabile countermelody in upper strings.',
    'Big band translation: wide sectional spread — layered ostinati rather than shout choruses; lead trumpet/sax on #11/13 extensions; Brazilian percussion colours integrated as colour grid not funk backbeat. Not an imitation of any artist.',
  ],
};

const WAYNE_SHORTER_KEYS_COMP: SongwriterCompProfile = {
  id: 'wayne_shorter',
  primaryCompInstrument: 'sax',
  voicingBias: [
    'neighbor_inner_voice_strings',
    'compound_interval_outer_voices',
    'perfect_fourth_structural_interval',
    'upper_structure_extensions_over_axis',
    'reed_motivic_development_carriers',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'second_line_polyrhythm_modal_neighbor',
    'bossa_static_plateau_lyrical',
    'afro_cuban_six_eight_modal_vamp',
  ],
  smallMovementRules: [
    'brass_chromatic_mediant_accents',
    'bass_axis_outline_not_functional_root_cycle',
    'inner_neighbor_voice_pairs',
  ],
  receiptLines: [
    'Harmonic voice Wayne Shorter — rhythm pairing hints: New Orleans Second Line (sl) polyrhythmic rolling groove supports non-functional modal harmony + chromatic mediant shifts (Footprints-type axis motion); Brazilian bossa (br) static harmonic plateaus + lyrical melody + lush extensions (classic quartet ballads); Cuban Afro 6/8 (cu) vamp-based modal layers + neighbour chord stacks.',
    'String quartet translation: neighbour harmony in inner voices; wide compound intervals between outer voices; perfect 4th as structural interval between strands.',
    'Big band translation: reeds carry motivic development lines; brass punctuate chromatic mediant hits; bass outlines axis progressions rather than textbook functional roots. Sax-forward melodic primacy — keyboard comp is supportive colour only. Not an imitation of any artist.',
  ],
};

const MARIA_SCHNEIDER_KEYS_COMP: SongwriterCompProfile = {
  id: 'maria_schneider',
  primaryCompInstrument: 'keys',
  voicingBias: [
    'mixed_tertian_quartal_extensions_inner_seconds_fourths',
    'non_root_top_ninth_sharp_eleventh_thirteenth',
    'omit_fifth_third_for_modal_morph',
    'thick_transparent_register_spacing',
    'cross_section_colour_roles',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'static_harmony_over_active_groove_pastoral',
    'harmonic_rhythm_climax_coupling',
    'brazilian_bossa_samba_baiao_under_modal',
  ],
  smallMovementRules: [
    'common_tone_maximum_hold_inner_stepwise',
    'interval_seeded_three_pitch_cells',
    'pedal_ground_upper_colour_shift',
  ],
  receiptLines: [
    'Harmonic voice Maria Schneider — rhythm pairing hints: Brazilian bossa/samba/baião (br) primary — floating modal harmony over understated groove (Hang Gliding lineage); Cuban/Afro-Cuban (cu) layered propulsion with orchestral pads riding clave; Fela Afrobeat (fk) long vamps + layered ostinati for darker Data Lords material; Greek Rebetiko (gr) secondary / poor fit; New Orleans Second Line (sl) secondary / avoid — idiom clash. Primary instrument map: keys-centred comp lane (see SONGWRITER_PRIMARY_INSTRUMENT). Not an imitation of any artist.',
    'String quartet translation (when quartet texture): violin I long lyric tops on 9/13/#11; violin II/viola moving inner voices + quartal fragments (sax/woodwind-like); cello pedals roots/fifths + occasional counterlines; favour seconds/thirds stepwise, 4ths/5ths structural; sul tasto/dolce/harmonics as colour morph; bias generators stepwise, penalise wide leaps unless contrast. Not an imitation of any artist.',
  ],
};

const KENNY_WHEELER_FLUGEL_COMP: SongwriterCompProfile = {
  id: 'kenny_wheeler',
  primaryCompInstrument: 'flugelhorn',
  voicingBias: [
    'upper_structure_sus_six_nine_sharp_eleven',
    'independent_bass_semitone_major_third',
    'slash_polyaxial_spacing',
    'preserve_specific_six_nine_sharp_eleven_spellings',
  ],
  registerBias: 'wide',
  rhythmicFeel: [
    'floating_phrase_anacrusis',
    'barline_tie_ambiguity',
    'chamber_sparse_to_medium_bloom',
  ],
  smallMovementRules: [
    'bass_trajectory_independent_of_upper_root',
    'tension_carry_not_functional_resolve',
    'open_cadence_six_nine_maj7_add9',
  ],
  receiptLines: [
    'Harmonic voice Kenny Wheeler — polyaxial ECM/chamber jazz: upper sonority + independent bass; flugel/trumpet lyric lead; woodwind halo on 9/#11; brittle intervallic melody with stepwise repair. Versus Schneider: less cinematic bloom, more fragile unstable sonorities. Not an imitation of any artist.',
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

function densityClassFromRiffProfile(rp: RiffProfile | undefined): string {
  const sc = rp?.silencePolicy?.styleClass ?? 'medium';
  if (/sparse|light/i.test(sc)) return 'sparse';
  if (/dense|busy|heavy/i.test(sc)) return 'dense';
  return 'medium';
}

function riffVrbGuitarCompProfile(id: SongwriterRuleId): SongwriterCompProfile {
  const rp = getVoiceRuleBundle(id).riffProfile;
  const density = densityClassFromRiffProfile(rp);
  const scaleKeys = rp?.scalePool ? Object.keys(rp.scalePool).slice(0, 4).join(', ') : 'chart pool';
  return {
    id,
    primaryCompInstrument: 'guitar',
    voicingBias: ['riff_cell_guitar', 'power_interval_bias'],
    registerBias: 'mid',
    rhythmicFeel: ['riff_subdivision_grid'],
    smallMovementRules: ['phrase_cell_persistence'],
    receiptLines: [
      `Song Mode riff VRB ${id}: guitar-led comp from riffProfile (density ${density}; scale pool ${scaleKeys}). Not an imitation of any artist.`,
    ],
  };
}

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
 * Keyboard-centric primaries return a keys comp profile; guitar-centric writers may return a guitar
 * comp profile (e.g. Joni Mitchell acoustic) or null when Song Mode keeps guitar/bass duo without comp routing.
 */
export function getSongwriterCompProfile(raw: string | undefined | null): SongwriterCompProfile | null {
  const id = normalizeSongwriterStyleKey(raw ?? '');
  if (!id) return null;
  if (id === 'joni_mitchell') return JONI_ACOUSTIC_COMP;
  if (isRiffVrbSongwriterId(id) && id !== 'frank_zappa') return riffVrbGuitarCompProfile(id);
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
    case 'duke_ellington':
      return DUKE_ELLINGTON_KEYS_COMP;
    case 'maria_schneider':
      return MARIA_SCHNEIDER_KEYS_COMP;
    case 'kenny_wheeler':
      return KENNY_WHEELER_FLUGEL_COMP;
    case 'eberhard_weber':
      return genericKeysCompProfile('eberhard_weber');
    case 'claus_ogerman':
      return genericKeysCompProfile('claus_ogerman');
    case 'henry_threadgill':
      return HENRY_THREADGILL_KEYS_COMP;
    case 'charles_mingus':
      return CHARLES_MINGUS_KEYS_COMP;
    case 'pat_metheny':
      return PAT_METHENY_KEYS_COMP;
    case 'wayne_shorter':
      return WAYNE_SHORTER_KEYS_COMP;
    default:
      return genericKeysCompProfile(id);
  }
}
