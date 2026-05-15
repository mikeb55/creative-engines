/**
 * VRB ids that use line-first duo abstract fill + identity post-process on guitar/bass
 * (no PC mutation in {@link postProcessDuoAbstractGuitar} / {@link postProcessDuoAbstractBass}).
 */

/** Priority 3 — line-first with optional colour post-process (see {@link LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET}). */
export const LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_IDS = [
  'donald_fagen',
  'bacharach',
  'frank_zappa',
  'ecm_chamber',
  'fripp_king_crimson',
  'james_brown',
  'messiaen',
] as const;

export const LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET = new Set<string>(LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_IDS);

export const LINE_FIRST_DUO_ENGINE_VRB_IDS = [
  'bob_brookmeyer',
  'bartok',
  'bill_evans',
  'john_coltrane',
  'pat_metheny',
  'debussy',
  'wayne_shorter',
  'herbie_hancock',
  'charles_mingus',
  'duke_ellington',
  'thad_jones',
  'count_basie',
  'ravel',
  'maria_schneider',
  'oliver_nelson',
  'thelonious_monk',
  'beethoven_late',
  'turtle_island',
  'reich_glass',
  'shostakovich',
  'lachenmann',
  'ligeti',
  'crumb_black_angels',
  'part',
  'dutilleux',
  ...LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_IDS,
] as const;

export const LINE_FIRST_DUO_ENGINE_VRB_ID_SET = new Set<string>(LINE_FIRST_DUO_ENGINE_VRB_IDS);
