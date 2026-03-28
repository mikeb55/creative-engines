/**
 * Song Mode hook-first guitar identity — re-exports core motif engine (abstract motifs + realization).
 */

export {
  SONG_MODE_HOOK_RETURN_BAR,
  SONG_MODE_MOTIF_BAR_9,
  SONG_MODE_MOTIF_BAR_17,
  generateRiffCoreMotif,
  buildSongModeHookRuntime,
  songModeMotifCount,
  validateSongModeHookIdentity,
  validateSongModeMotifSystem,
  contourDirSignatureFromPitches,
  isGenericScaleRun,
  type HookContourDirs,
  type SongModeHookIdentityCell,
} from '../motif/songModeMotifEngine';
