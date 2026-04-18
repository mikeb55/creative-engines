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
  'richard_thompson',
  'paul_simon',
]);

/** Canonical map: guitar trio explicit; all other Song Mode writers default to keys-centred comp for this slice. */
export const SONGWRITER_PRIMARY_INSTRUMENT: Record<SongwriterRuleId, SongwriterPrimaryInstrumentKind> = {
  bacharach: 'keys',
  stevie_wonder: 'keys',
  beatles: 'guitar',
  joni_mitchell: 'keys',
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
  beethoven: 'keys',
  debussy: 'keys',
  stravinsky: 'keys',
  ravel: 'keys',
  schubert: 'keys',
  mahler: 'keys',
  prokofiev: 'keys',
  shostakovich: 'keys',
  messiaen: 'keys',
  duke_ellington: 'keys',
  billy_strayhorn: 'keys',
  james_brown: 'keys',
  prince: 'keys',
  kendrick_lamar: 'keys',
  gil_evans: 'keys',
  thad_jones: 'keys',
  sammy_nestico: 'keys',
  quincy_jones: 'keys',
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
  andrew_hill: 'keys',
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
  if (!isKeyboardCentricSongwriter(id)) return null;
  switch (id) {
    case 'donald_fagen':
      return FAGEN_KEYS_COMP;
    case 'bacharach':
      return BACHARACH_KEYS_COMP;
    default:
      return genericKeysCompProfile(id);
  }
}
