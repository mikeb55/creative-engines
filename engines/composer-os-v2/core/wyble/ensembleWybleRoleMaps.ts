/**
 * Static maps: abstract Wyble roles → existing ensemble part ids (see quartet / big-band / duo score builders).
 * String quartet score building consumes `WYBLE_ROLE_MAP_STRING_QUARTET` (violin II ↔ viola). Big band score building consumes `WYBLE_ROLE_MAP_BIG_BAND` (alto lead vs tenor inner separation). Duo family golden path consumes `WYBLE_ROLE_MAP_DUO_FAMILY` (bar 1 bass anchor nudge in `duoWybleBassAnchorNudge.ts`).
 */

import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';
import type { EnsembleWybleRoleMap } from './wybleVoiceLayoutTypes';

/** Part ids match `generateGoldenPathDuoScore` (`id: 'guitar'`, `id: 'bass'`). Inner line = guitar voice 2. */
export const WYBLE_ROLE_MAP_DUO_FAMILY: EnsembleWybleRoleMap = {
  lead_line: { partId: 'guitar', voice: 1 },
  inner_counter: { partId: 'guitar', voice: 2 },
  bass_anchor: { partId: 'bass' },
};

/** Part ids match `quartetScoreBuilder` / `stringQuartetTypes` (`SQ_PART_*`). */
export const WYBLE_ROLE_MAP_STRING_QUARTET: EnsembleWybleRoleMap = {
  lead_line: { partId: SQ_PART_V1 },
  inner_counter: { partId: SQ_PART_V2 },
  bass_anchor: { partId: SQ_PART_VC },
};

/** Alto + tenor saxes + rhythm bass staff ids match `bigBandScoreBuilder` `BB_PART_IDS`; rhythm = double-bass line (`bb_rhythm_section` = `BB_PART_RHYTHM`). */
export const WYBLE_ROLE_MAP_BIG_BAND: EnsembleWybleRoleMap = {
  lead_line: { partId: 'bb_alto_sax' },
  inner_counter: { partId: 'bb_tenor_sax' },
  bass_anchor: { partId: 'bb_rhythm_section' },
};
