/**
 * Composer OS V2 — Song Mode scaffold types (Phase 1A).
 * No harmony generation, MusicXML, or pipeline integration.
 */

export type SongSectionKind = 'verse' | 'chorus';

export interface SongSectionPlan {
  order: number;
  kind: SongSectionKind;
}

/** Default vocal target for Song Mode V1 scaffold. */
export type SongVoiceType = 'male_tenor';

export const DEFAULT_SONG_VOICE_TYPE: SongVoiceType = 'male_tenor';
