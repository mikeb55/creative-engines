/**
 * Local JSON session — save/reload UI state (no cloud).
 */

import type { AppLocks, AppStyleStack, EcmChamberMode } from '../../app-api/appApiTypes';
import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { NamedPresetId } from '../presets-plus/namedPresetTypes';

export const SESSION_FORMAT_VERSION = 1 as const;

export interface ComposerSessionV1 {
  formatVersion: typeof SESSION_FORMAT_VERSION;
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
}
