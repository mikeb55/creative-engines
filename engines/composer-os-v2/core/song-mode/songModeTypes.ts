/**
 * Composer OS V2 — Song Mode scaffold types (Phase 1A+1B).
 * No harmony generation, MusicXML, or pipeline integration.
 */

import type { MusicContext } from '../music-context/musicContextTypes';

export type SongSectionKind = 'verse' | 'pre_chorus' | 'chorus' | 'bridge';

export interface SongSectionPlan {
  order: number;
  kind: SongSectionKind;
}

/** Default vocal target for Song Mode; additional ids use placeholder tessitura until expanded. */
export type SongVoiceType = 'male_tenor' | 'female_alto' | 'baritone' | 'soprano';

export const DEFAULT_SONG_VOICE_TYPE: SongVoiceType = 'male_tenor';

/** All supported section kinds (planner may use a subset by default). */
export const SONG_MODE_SECTION_KINDS: readonly SongSectionKind[] = [
  'verse',
  'pre_chorus',
  'chorus',
  'bridge',
];

/** Metadata-only flags for Song Mode preset (no runtime generation yet). */
export interface SongModeScaffoldMetadata {
  melodyFirst: true;
  hookFirst: true;
  leadSheetReady: true;
  voiceType: SongVoiceType;
}

export const DEFAULT_SONG_MODE_SCAFFOLD_METADATA: SongModeScaffoldMetadata = {
  melodyFirst: true,
  hookFirst: true,
  leadSheetReady: true,
  voiceType: DEFAULT_SONG_VOICE_TYPE,
};

/** Hook-first Song Mode treats chorus as the primary hook-return section. */
export const PRIMARY_HOOK_SECTION_KIND = 'chorus' as const;

/**
 * V103a — Song Mode export-truth + LOCK types (Shared Brain producer path).
 * Duplicate `sectionId` values are invalid by contract; assembler hard-fails on collision.
 */

/** Per-section realised export record (harmony bars normalised at build time). */
export interface SongModeSectionContext {
  sectionId: string;
  plan: SongSectionPlan;
  musicContext: MusicContext;
  /** Checksum over normalised harmony bars for this section only. */
  checksum: string;
}

/** Deterministic song-mode export truth before LOCK. */
export interface SongModeExportTruth {
  /** Sections in stable assembly order (`plan.order`, then `sectionId`). */
  sectionsOrdered: readonly SongModeSectionContext[];
  /** Keyed lookup — one entry per section; duplicate IDs forbidden at assembly. */
  sectionById: Readonly<Record<string, SongModeSectionContext>>;
  /** Fingerprint over ordered section identity + per-section checksums. */
  masterChecksum: string;
  capturedAt: number;
}

/** Normalised section snapshot sealed at LOCK time (mirrors {@link DuoLock} voice snapshots). */
export interface SongModeLockedSection {
  sectionId: string;
  plan: SongSectionPlan;
  checksum: string;
  harmonyBars: string[];
}

/** Song Mode LOCK — mirrors {@link DuoLock} shape (`sections` + `lockedAt` + `checksum`). */
export interface SongModeLock {
  sections: SongModeLockedSection[];
  lockedAt: number;
  checksum: string;
}
