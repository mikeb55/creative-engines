/**
 * App barrel — Brazilian rhythm presets + MusicXML helper (Song Mode UI).
 */

export {
  DEFAULT_BRAZILIAN_RHYTHM_PRESET_ID,
  exportBrazilianRhythmToMusicXml,
  BRAZILIAN_RHYTHM_PRESETS,
  getBrazilianRhythmPresetById,
  BRAZILIAN_RHYTHM_EXPORT_ENGINE,
} from '@composer-os/core/rhythm/brazilianRhythmMusicXmlExporter';
export type { BrazilianFeelProfile, BrazilianRhythmPreset } from '@composer-os/core/rhythm/brazilianRhythmTypes';

export const BRAZILIAN_RHYTHM_CONTEXT_PREFIX = 'br:' as const;

export const BRAZILIAN_FAMILY_CONTEXT_KEYS = {
  'bossa-nova': 'br:bossa-nova',
  samba: 'br:samba',
  baiao: 'br:baiao',
  'son-clave': 'br:son-clave',
} as const;
