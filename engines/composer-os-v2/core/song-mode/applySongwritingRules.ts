/**
 * Apply resolved songwriting rules to compiled song + contract metadata (planning only).
 */

import type { AuthorOverlayBehaviour } from './authorOverlayResolver';
import type { ChorusPlan } from './chorusPlanner';
import type { HookPlan } from './hookPlanner';
import type { MelodyBehaviourPlan } from './melodyBehaviourPlanner';
import type { CompiledSong, LyricProsodyPlaceholderMetadata, SongwritingPlanningBundle } from './songCompilationTypes';
import type { SongHook } from './songHookTypes';
import type { ParsedSongwritingResearch } from './songwritingResearchTypes';
import type { ResolvedSongwritingStyle } from './songwriterStyleResolver';
import type { StylePairingResult } from '../style-pairing/stylePairingTypes';

function buildLyricProsodyMeta(
  primaryId: ResolvedSongwritingStyle['primaryId'],
  author: AuthorOverlayBehaviour | null
): LyricProsodyPlaceholderMetadata {
  const strongProsody = (author?.prosodyStructureEmphasis ?? 0) > 0.65;
  return {
    stableUnstableTagging: strongProsody || primaryId === 'paul_simon',
    stressMappingPlanned: true,
    lineLengthContrast:
      primaryId === 'bob_dylan' || primaryId === 'joni_mitchell'
        ? 'verse_loose_chorus_tight'
        : 'balanced',
  };
}

function sectionContrastDims(resolution: ResolvedSongwritingStyle): SongwritingPlanningBundle['sectionContrastDimensions'] {
  const p = resolution.blendedProfile;
  return {
    melody: p.sectionContrast * 0.6 + 0.1,
    harmony: p.harmonyColourBias * 0.5 + 0.1,
    rhythm: p.syncopationBias * 0.6 + 0.1,
  };
}

function mergeHook(base: SongHook, hookPlan: HookPlan): SongHook {
  return {
    ...base,
    primaryHookType: hookPlan.primaryHookType,
    hookTypePriorityOrder: hookPlan.hookTypePriorityOrder,
    repetitionPriority: Math.max(
      0.15,
      Math.min(0.98, base.repetitionPriority * (0.85 + hookPlan.minRepetitionsAcrossForm / 40))
    ),
  };
}

export function applySongwritingRules(params: {
  compiled: CompiledSong;
  research: ParsedSongwritingResearch;
  resolution: ResolvedSongwritingStyle;
  hookPlan: HookPlan;
  chorusPlan: ChorusPlan;
  melodyBehaviour: MelodyBehaviourPlan;
  authorOverlay: AuthorOverlayBehaviour | null;
  stylePairingResolution?: StylePairingResult | null;
}): CompiledSong {
  const {
    compiled,
    research,
    resolution,
    hookPlan,
    chorusPlan,
    melodyBehaviour,
    authorOverlay,
    stylePairingResolution,
  } = params;
  const lyricProsody = buildLyricProsodyMeta(resolution.primaryId, authorOverlay);
  const baseContrast = sectionContrastDims(resolution);
  const conf = stylePairingResolution?.confidenceScore ?? 0;
  const sectionContrastDimensions = stylePairingResolution
    ? {
        melody: Math.min(0.95, baseContrast.melody + 0.06 * conf),
        harmony: Math.min(0.95, baseContrast.harmony + 0.05 * conf),
        rhythm: Math.min(0.95, baseContrast.rhythm + 0.03 * conf),
      }
    : baseContrast;
  const songwriting: SongwritingPlanningBundle = {
    researchParseOk: research.ok,
    researchErrors: [...research.errors],
    researchStats: { ...research.stats },
    resolvedStyle: resolution,
    hookPlan,
    chorusPlan,
    melodyBehaviour,
    lyricProsody,
    authorOverlayBehaviour: authorOverlay,
    sectionContrastDimensions,
    stylePairingResolution: stylePairingResolution ?? undefined,
  };
  return {
    ...compiled,
    hook: mergeHook(compiled.hook, hookPlan),
    songwriting,
    melodyFirst: true,
    hookFirst: true,
    leadSheetReady: true,
  };
}
