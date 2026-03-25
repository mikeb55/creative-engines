/**
 * Local JSON session — save/reload UI state (no cloud).
 */

import type { AppLocks, AppStyleStack, EcmChamberMode } from '../../app-api/appApiTypes';
import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { NamedPresetId } from '../presets-plus/namedPresetTypes';

/** Bump when adding optional session fields (loaders accept prior versions). */
export const SESSION_FORMAT_VERSION = 2 as const;

/** Supported on-disk format versions (older files remain loadable). */
export const SESSION_FORMAT_VERSIONS_SUPPORTED = [1, 2] as const;

export type SessionFormatVersion = (typeof SESSION_FORMAT_VERSIONS_SUPPORTED)[number];

export interface ComposerSessionV1 {
  formatVersion: SessionFormatVersion;
  savedAt: string;
  /** Base app preset id (guitar_bass_duo, ecm_chamber, …). */
  presetId: string;
  namedPresetId?: NamedPresetId;
  styleStack: AppStyleStack;
  seed: number;
  title?: string;
  outputPath?: string;
  lastManifestSummary?: string;
  locks?: AppLocks;
  ecmMode?: EcmChamberMode;
  bigBandEra?: BigBandEraId;
  primarySongwriterStyle?: string;
  harmonyMode?: 'builtin' | 'custom';
  chordProgressionText?: string;
  /** Candidate compare: best seed from last ranked batch (optional). */
  lastBestCandidateSeed?: number;
  /** Candidate compare: first and second seeds from last ranking (optional). */
  lastCandidateSelection?: { bestSeed?: number; secondBestSeed?: number };
  /** Saved style-stack preset id (see `style-stack-presets`), not the named mode preset. */
  styleStackPresetId?: string;
  /** Opaque reference for continuation (e.g. last output manifest id or path stem). */
  continuationSourceRef?: string;
  /** Last mode label for quick restore (may mirror presetId). */
  lastModeLabel?: string;
}
