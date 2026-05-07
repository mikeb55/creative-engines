/**
 * App barrel — second line / NOLA brass rhythm presets + MusicXML helper (Song Mode UI).
 */

export {
  DEFAULT_SECOND_LINE_RHYTHM_PRESET_ID,
  exportSecondLineRhythmToMusicXml,
  SECOND_LINE_RHYTHM_PRESETS,
  getSecondLineRhythmPresetById,
  SECOND_LINE_RHYTHM_EXPORT_ENGINE,
} from '@composer-os/core/rhythm/secondLineRhythmMusicXmlExporter';
export type { SecondLineFeelProfile, SecondLineRhythmPreset } from '@composer-os/core/rhythm/secondLineRhythmTypes';

export const SECOND_LINE_RHYTHM_CONTEXT_PREFIX = 'sl:' as const;

export const SECOND_LINE_FAMILY_CONTEXT_KEYS = {
  'second-line': 'sl:second-line',
  'brass-band': 'sl:brass-band',
  'mardi-gras': 'sl:mardi-gras',
  'new-orleans-funk': 'sl:new-orleans-funk',
} as const;
