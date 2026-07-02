/**
 * Song Mode hook-first guitar identity — re-exports core motif engine (abstract motifs + realization).
 */

export {
  SONG_MODE_HOOK_RETURN_BAR,
  SONG_MODE_MOTIF_BAR_9,
  SONG_MODE_MOTIF_BAR_17,
  SONG_MODE_HOOK_RETURN_SIMILARITY_MIN,
  SONG_MODE_HOOK_CORE_CONTOUR_STEPS,
  generateRiffCoreMotif,
  buildSongModeHookRuntime,
  songModeMotifCount,
  validateSongModeHookIdentity,
  validateSongModeMotifSystem,
  contourDirSignatureFromPitches,
  hookContourCoreMatches,
  isGenericScaleRun,
  type HookContourDirs,
  type SongModeHookIdentityCell,
} from '../motif/songModeMotifEngine';
