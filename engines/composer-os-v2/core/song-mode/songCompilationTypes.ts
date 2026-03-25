/**
 * Composer OS V2 — Compiled song (internal contract before score/MusicXML).
 */

import type { SongHook } from './songHookTypes';
import type { SongVoiceType } from './songModeTypes';
import type { SongSectionKind } from './songModeTypes';

/** Simple per-section chord scaffold (metadata / planning level). */
export interface SectionChordPlan {
  sectionOrder: number;
  sectionKind: SongSectionKind;
  /** Planning intent — not performance dynamics. */
  intensity: 'low' | 'medium' | 'high' | 'contrast';
  /** Placeholder symbols (e.g. one per bar in 4/4). */
  chordSymbols: string[];
}

export interface CompiledSong {
  id: string;
  title: string;
  voiceType: SongVoiceType;
  hook: SongHook;
  sectionSummary: string[];
  chordPlan: SectionChordPlan[];
  melodyFirst: boolean;
  hookFirst: boolean;
  leadSheetReady: boolean;
}
