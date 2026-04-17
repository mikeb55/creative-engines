/**
 * Resolve static Wyble role map for supported presets (read-only metadata).
 */

import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import type { EnsembleWybleRoleMap } from './wybleVoiceLayoutTypes';
import {
  WYBLE_ROLE_MAP_BIG_BAND,
  WYBLE_ROLE_MAP_DUO_FAMILY,
  WYBLE_ROLE_MAP_STRING_QUARTET,
} from './ensembleWybleRoleMaps';

export function wybleVoiceLayoutForPreset(presetId: string | undefined): EnsembleWybleRoleMap | undefined {
  if (isGuitarBassDuoFamily(presetId)) return WYBLE_ROLE_MAP_DUO_FAMILY;
  if (presetId === 'string_quartet') return WYBLE_ROLE_MAP_STRING_QUARTET;
  if (presetId === 'big_band') return WYBLE_ROLE_MAP_BIG_BAND;
  return undefined;
}
