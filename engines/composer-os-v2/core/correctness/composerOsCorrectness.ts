/**
 * Single entry for Composer OS correctness gates (paths, bar math, bass identity, performance rules).
 */

export { resolveOpenFolderTarget } from '../../app-api/composerOsOutputPaths';
export {
  DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE,
  resolveScoreTitleForPreset,
} from '../../app-api/scoreTitleDefaults';
export { validateStrictBarMath } from '../score-integrity/strictBarMath';
export { validateExportedMusicXmlBarMath } from '../export/validateMusicXmlBarMath';
export { validateGuitarBassDuoBassIdentityInMusicXml } from '../export/validateBassIdentityInMusicXml';
export {
  GUITAR_BASS_DUO_BASS_PART_NAME,
  GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND,
  GUITAR_BASS_DUO_BASS_MIDI_PROGRAM_ZERO_BASED,
} from '../instrument-profiles/guitarBassDuoExportNames';
export { PERFORMANCE_PASS_ALLOWS_DURATION_OR_BAR_CHANGES } from '../performance/performanceRules';
