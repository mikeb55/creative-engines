/**
 * Songwriting Engine (Phase 1) — public surface only.
 */

export type { SongRequest, SongResult } from './songEngineTypes';
export { generateSong } from './generateSong';
export { applySwingPass } from './swingPass';
export { getOutputPath, SONG_ENGINE_OUTPUT_KINDS, type SongEngineOutputKind } from '../../app-api/composerOsOutputPaths';
