/**
 * Rhythm blend lab — thin re-exports (catalog session + MusicXML exporters).
 */

export { exportSongFormToMusicXml } from '@composer-os/core/blend/blendMusicXmlExporter';
export {
  exportBlendedScoreToMusicXml,
  getRhythmBlendSessionState,
  resetRhythmBlendSessionForTests,
  setConflictStrategy,
  setEngineA,
  setEngineB,
  setPresetIdA,
  setPresetIdB,
} from '@composer-os/core/blend/rhythmBlendSession';
