/**
 * V44 — Harmonic voice vs rhythm engine are independent UI dimensions.
 */

import type { SongwriterRuleId } from '@composer-os/core/song-mode/songwritingResearchTypes';

export type RhythmEngineId =
  | 'fela_kuti'
  | 'greek_rebetiko'
  | 'brazilian'
  | 'new_orleans_second_line'
  | 'cuban_afro_cuban';

/** All shipped harmonic writers — excludes rhythm-only Song Mode engines. */
export type HarmonicVoiceId = Exclude<SongwriterRuleId, RhythmEngineId>;

export type RhythmContextPrefix = 'fk' | 'gr' | 'br' | 'sl' | 'cu';

export interface HarmonicSelection {
  voiceId: HarmonicVoiceId | null;
}

export interface RhythmSelection {
  engineId: RhythmEngineId | null;
  presetId: string | null;
  contextKeys: string[];
}

export interface StyleProfile {
  harmonic: HarmonicSelection;
  rhythm: RhythmSelection;
  pairPresetId?: string | null;
}

export interface GenerationContext {
  harmonicKeys: string[];
  rhythmKeys: string[];
  combinedKeys: string[];
}

export function resolveHarmonicContextKeys(voiceId: HarmonicVoiceId): string[] {
  return [`hv:${voiceId}`];
}

export function resolveRhythmContextKeys(engineId: RhythmEngineId, presetId: string | null): string[] {
  const prefixMap: Record<RhythmEngineId, RhythmContextPrefix> = {
    fela_kuti: 'fk',
    greek_rebetiko: 'gr',
    brazilian: 'br',
    new_orleans_second_line: 'sl',
    cuban_afro_cuban: 'cu',
  };
  const prefix = prefixMap[engineId];
  return presetId ? [`${prefix}:core`, `${prefix}:${presetId}`] : [`${prefix}:core`];
}

export function buildGenerationContext(style: StyleProfile): GenerationContext {
  const harmonicKeys = style.harmonic.voiceId ? resolveHarmonicContextKeys(style.harmonic.voiceId) : [];
  const rhythmKeys = style.rhythm.engineId
    ? resolveRhythmContextKeys(style.rhythm.engineId, style.rhythm.presetId)
    : [];
  return {
    harmonicKeys,
    rhythmKeys,
    combinedKeys: [...harmonicKeys, ...rhythmKeys],
  };
}

export function migrateLegacySongwriterValue(value: string): Partial<StyleProfile> {
  const rhythmMap: Record<string, RhythmEngineId> = {
    fela_kuti: 'fela_kuti',
    greek_rebetiko: 'greek_rebetiko',
    brazilian: 'brazilian',
    new_orleans_second_line: 'new_orleans_second_line',
    cuban_afro_cuban: 'cuban_afro_cuban',
  };
  if (value in rhythmMap) {
    return { rhythm: { engineId: rhythmMap[value]!, presetId: null, contextKeys: [] } };
  }
  return { harmonic: { voiceId: value as HarmonicVoiceId } };
}
