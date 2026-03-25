/**
 * Composer OS V2 — Compiled song (internal contract before score/MusicXML).
 */

import type { AuthorOverlayBehaviour } from './authorOverlayResolver';
import type { ChorusPlan } from './chorusPlanner';
import type { HookPlan } from './hookPlanner';
import type { LeadMelodyPlan } from './leadMelodyTypes';
import type { ProsodyPlaceholderPlan } from './lyricProsodyTypes';
import type { MelodyBehaviourPlan } from './melodyBehaviourPlanner';
import type { SingerRangeValidationResult } from './singerRangeTypes';
import type { SongHook } from './songHookTypes';
import type { SongSectionKind, SongVoiceType } from './songModeTypes';
import type { ParsedSongwritingResearch } from './songwritingResearchTypes';
import type { ResolvedSongwritingStyle } from './songwriterStyleResolver';

/** Placeholder structure for future lyric/prosody lane. */
export interface LyricProsodyPlaceholderMetadata {
  stableUnstableTagging: boolean;
  stressMappingPlanned: boolean;
  lineLengthContrast: 'verse_loose_chorus_tight' | 'balanced';
}

/** Research-driven songwriting planning (Prompt 6.5/7). */
export interface SongwritingPlanningBundle {
  researchParseOk: boolean;
  researchErrors: string[];
  researchStats: ParsedSongwritingResearch['stats'];
  resolvedStyle: ResolvedSongwritingStyle;
  hookPlan: HookPlan;
  chorusPlan: ChorusPlan;
  melodyBehaviour: MelodyBehaviourPlan;
  lyricProsody: LyricProsodyPlaceholderMetadata;
  authorOverlayBehaviour: AuthorOverlayBehaviour | null;
  sectionContrastDimensions: { melody: number; harmony: number; rhythm: number };
}

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
  /** Present after Prompt 6.5/7 — research + style resolution + planners. */
  songwriting?: SongwritingPlanningBundle;
  /** Lead melody plan (Prompt B/3 — Song Mode completion). */
  leadMelodyPlan?: LeadMelodyPlan;
  singerRangeValidation?: SingerRangeValidationResult;
  prosodyPlaceholderPlan?: ProsodyPlaceholderPlan;
}
