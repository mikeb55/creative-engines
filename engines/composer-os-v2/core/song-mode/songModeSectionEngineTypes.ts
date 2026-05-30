/**
 * Song Mode per-section MusicContext producer ids (V104p7).
 */

import type { SongSectionKind, SongModeSectionEngine } from './songModeTypes';

export type { SongModeSectionEngine };

export const SONG_MODE_SECTION_ENGINES: readonly SongModeSectionEngine[] = [
  'song_mode',
  'ecm_chamber',
  'big_band',
  'tritonic_vault',
  'wayne_shorter',
];

export const DEFAULT_SONG_MODE_SECTION_ENGINE: SongModeSectionEngine = 'song_mode';

/** Illustrative defaults (explicit sectionEngine on input overrides). */
export function defaultSectionEngineForKind(kind: SongSectionKind): SongModeSectionEngine {
  switch (kind) {
    case 'verse':
      return 'ecm_chamber';
    case 'chorus':
      return 'big_band';
    case 'bridge':
      return 'tritonic_vault';
    default:
      return DEFAULT_SONG_MODE_SECTION_ENGINE;
  }
}
