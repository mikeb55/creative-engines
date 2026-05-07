/**
 * App barrel — Cuban / Afro-Cuban rhythm presets + MusicXML helper (Song Mode UI).
 */

export {
  CUBAN_RHYTHM_PRESETS,
  DEFAULT_CUBAN_RHYTHM_PRESET_ID,
  exportCubanRhythmToMusicXml,
  getCubanRhythmPresetById,
  CUBAN_RHYTHM_EXPORT_ENGINE,
} from '@composer-os/core/rhythm/cubanRhythmMusicXmlExporter';
export type { CubanFeelProfile, CubanRhythmPreset } from '@composer-os/core/rhythm/cubanRhythmTypes';

export const CUBAN_RHYTHM_CONTEXT_PREFIX = 'cu:' as const;

export const CUBAN_FAMILY_CONTEXT_KEYS = {
  son: 'cu:son',
  rumba: 'cu:rumba',
  mambo: 'cu:mambo',
  'cha-cha': 'cu:cha-cha',
  bolero: 'cu:bolero',
  mozambique: 'cu:mozambique',
  afro: 'cu:afro',
} as const;
