/**
 * Composer OS V2 — Song Mode scaffold types (Phase 1A+1B).
 * No harmony generation, MusicXML, or pipeline integration.
 */

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
