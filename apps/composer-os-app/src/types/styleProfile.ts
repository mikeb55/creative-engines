/**
 * V44 — Harmonic voice vs rhythm engine are independent UI dimensions.
 */

import type { SongwriterRuleId } from '@composer-os/core/song-mode/songwritingResearchTypes';
import { resolveHarmonicVoiceStyleContextKeys } from '@composer-os/core/song-mode/harmonicVoiceStyleContextKeys';

export type RhythmEngineId =
  | 'fela_kuti'
  | 'greek_rebetiko'
  | 'brazilian'
  | 'new_orleans_second_line'
  | 'cuban_afro_cuban'
  | 'bartok_bulgarian_aksak'
  | 'free_proportional'
  | 'baroque_dance'
  | 'reich_phasing_grid'
  | 'viennese_waltz'
  | 'jewish_klezmer'
  | 'straight_rock'
  | 'shuffle_blues_rock'
  | 'funk_rock'
  | 'half_time_hip_hop'
  | 'reggae_family'
  | 'hard_rock_metal'
  | 'prog_5_4'
  | 'prog_7_8'
  | 'prog_7_4'
  | 'jazz_rock_fusion'
  | 'afrobeat_rock';

/** All shipped harmonic writers — excludes rhythm-only Song Mode engines. */
export type HarmonicVoiceId = Exclude<SongwriterRuleId, RhythmEngineId>;

export type RhythmContextPrefix =
  | 'fk'
  | 'gr'
  | 'br'
  | 'sl'
  | 'cu'
  | 'bg'
  | 'fp'
  | 'bd'
  | 'rp'
  | 'vw'
  | 'kl'
  | 'sr'
  | 'sb'
  | 'fn'
  | 'ht'
  | 'rg'
  | 'hr'
  | 'p5'
  | 'p8'
  | 'p4'
  | 'jf'
  | 'ar';

/** Curated harmonic voice labels — mirror HomeGenerate `SONGWRITER_OPTIONS`. */
export const HARMONIC_VOICE_LABELS: Pick<
  Record<HarmonicVoiceId, string>,
  | 'ennio_morricone'
  | 'bernard_herrmann'
  | 'john_williams'
  | 'nino_rota'
  | 'jerry_goldsmith'
  | 'lalo_schifrin'
  | 'philip_glass'
  | 'hans_zimmer'
  | 'angelo_badalamenti'
  | 'quincy_jones_film'
  | 'john_coltrane'
  | 'gil_evans'
  | 'maria_schneider'
  | 'wayne_shorter'
  | 'henry_threadgill'
  | 'charles_mingus'
  | 'pat_metheny'
> = {
  ennio_morricone: 'Ennio Morricone',
  bernard_herrmann: 'Bernard Herrmann',
  john_williams: 'John Williams',
  nino_rota: 'Nino Rota',
  jerry_goldsmith: 'Jerry Goldsmith',
  lalo_schifrin: 'Lalo Schifrin',
  philip_glass: 'Philip Glass',
  hans_zimmer: 'Hans Zimmer',
  angelo_badalamenti: 'Angelo Badalamenti',
  quincy_jones_film: 'Quincy Jones',
  john_coltrane: 'John Coltrane',
  gil_evans: 'Gil Evans',
  maria_schneider: 'Maria Schneider',
  wayne_shorter: 'Wayne Shorter',
  henry_threadgill: 'Henry Threadgill',
  charles_mingus: 'Charles Mingus',
  pat_metheny: 'Pat Metheny',
};

export interface HarmonicSelection {
  voiceId: HarmonicVoiceId | null;
}

export interface RhythmSelection {
  engineId: RhythmEngineId | null;
  presetId: string | null;
  contextKeys: string[];
}

/** String Quartet multi-arranger blend (max two ids; weights sum to 1). */
export type ArrangerBlendEntry = { id: string; weight: number };

export interface StyleProfile {
  harmonic: HarmonicSelection;
  rhythm: RhythmSelection;
  pairPresetId?: string | null;
  /** SQ preset: optional dual arranger blend weights (UI / diagnostics). */
  arrangerBlend?: ArrangerBlendEntry[];
}

export interface GenerationContext {
  harmonicKeys: string[];
  rhythmKeys: string[];
  combinedKeys: string[];
}

export function resolveHarmonicContextKeys(voiceId: HarmonicVoiceId): string[] {
  return [`hv:${voiceId}`, ...resolveHarmonicVoiceStyleContextKeys(voiceId)];
}

export function resolveRhythmContextKeys(engineId: RhythmEngineId, presetId: string | null): string[] {
  const prefixMap: Record<RhythmEngineId, RhythmContextPrefix> = {
    fela_kuti: 'fk',
    greek_rebetiko: 'gr',
    brazilian: 'br',
    new_orleans_second_line: 'sl',
    cuban_afro_cuban: 'cu',
    bartok_bulgarian_aksak: 'bg',
    free_proportional: 'fp',
    baroque_dance: 'bd',
    reich_phasing_grid: 'rp',
    viennese_waltz: 'vw',
    jewish_klezmer: 'kl',
    straight_rock: 'sr',
    shuffle_blues_rock: 'sb',
    funk_rock: 'fn',
    half_time_hip_hop: 'ht',
    reggae_family: 'rg',
    hard_rock_metal: 'hr',
    prog_5_4: 'p5',
    prog_7_8: 'p8',
    prog_7_4: 'p4',
    jazz_rock_fusion: 'jf',
    afrobeat_rock: 'ar',
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

/** Map legacy single `arrangerStyle` string to blend array for SQ UI migration. */
export function migrateArrangerStyleToArrangerBlend(arrangerStyle: string | undefined | null): ArrangerBlendEntry[] {
  const id = typeof arrangerStyle === 'string' ? arrangerStyle.trim() : '';
  if (!id) return [{ id: 'none', weight: 1 }];
  return [{ id, weight: 1 }];
}

export function migrateLegacySongwriterValue(value: string): Partial<StyleProfile> {
  const rhythmMap: Record<string, RhythmEngineId> = {
    fela_kuti: 'fela_kuti',
    greek_rebetiko: 'greek_rebetiko',
    brazilian: 'brazilian',
    new_orleans_second_line: 'new_orleans_second_line',
    cuban_afro_cuban: 'cuban_afro_cuban',
    bartok_bulgarian_aksak: 'bartok_bulgarian_aksak',
    free_proportional: 'free_proportional',
    baroque_dance: 'baroque_dance',
    reich_phasing_grid: 'reich_phasing_grid',
    viennese_waltz: 'viennese_waltz',
    jewish_klezmer: 'jewish_klezmer',
    straight_rock: 'straight_rock',
    shuffle_blues_rock: 'shuffle_blues_rock',
    funk_rock: 'funk_rock',
    half_time_hip_hop: 'half_time_hip_hop',
    reggae_family: 'reggae_family',
    hard_rock_metal: 'hard_rock_metal',
    prog_5_4: 'prog_5_4',
    prog_7_8: 'prog_7_8',
    prog_7_4: 'prog_7_4',
    jazz_rock_fusion: 'jazz_rock_fusion',
    afrobeat_rock: 'afrobeat_rock',
  };
  if (value in rhythmMap) {
    return { rhythm: { engineId: rhythmMap[value]!, presetId: null, contextKeys: [] } };
  }
  return { harmonic: { voiceId: value as HarmonicVoiceId } };
}
