/**
 * Composer OS V2 — Minimal Song Mode pipeline (structural; no golden path / ECM).
 */

import { buildCompiledSong, buildLeadSheetContractFromCompiled, summaryStringForManifest } from './songModeBuilder';
import type { CompiledSong } from './songCompilationTypes';
import type { LeadSheetContract } from './leadSheetContract';
import { DEFAULT_SONG_VOICE_TYPE, type SongVoiceType } from './songModeTypes';
import { planDefaultVerseChorusStructure, planExtendedPopStructure } from './songSectionPlanner';
import {
  mergeSongModeValidation,
  validateCompiledSong,
  validateLeadSheetContract,
  validateSectionPlanForSongMode,
  type SongModeValidationResult,
} from './songModeValidation';

export type SongModeStructureVariant = 'default' | 'extended';

export interface SongModeRunInput {
  seed: number;
  title?: string;
  variant?: SongModeStructureVariant;
  voiceType?: SongVoiceType;
}

export interface SongModeRunManifestHints {
  songHookId: string;
  songHookSummary: string;
  songSectionSequence: string[];
  leadSheetReady: boolean;
  songwritingModuleIds: string[];
  presetType: 'song_mode';
  songModeVoiceType: string;
}

export interface SongModeRunResult {
  compiledSong: CompiledSong;
  leadSheetContract: LeadSheetContract;
  validation: SongModeValidationResult;
  manifestHints: SongModeRunManifestHints;
}

/**
 * Full structural Song Mode run: sections → hook → chord scaffold → compiled song → lead sheet → validation.
 */
export function runSongMode(input: SongModeRunInput): SongModeRunResult {
  const title = input.title ?? `Song Mode Study ${input.seed}`;
  const voiceType = input.voiceType ?? DEFAULT_SONG_VOICE_TYPE;
  const sections =
    input.variant === 'extended' ? planExtendedPopStructure() : planDefaultVerseChorusStructure();

  const planVal = validateSectionPlanForSongMode(sections);
  const compiled = buildCompiledSong({
    seed: input.seed,
    title,
    sections,
    voiceType,
  });
  const lead = buildLeadSheetContractFromCompiled(compiled);

  const v1 = validateCompiledSong(compiled, { voiceType });
  const v2 = validateLeadSheetContract(lead);
  const v3 = planVal;
  const validation = mergeSongModeValidation(v3, v1, v2);

  const manifestHints: SongModeRunManifestHints = {
    songHookId: compiled.hook.id,
    songHookSummary: summaryStringForManifest(compiled),
    songSectionSequence: compiled.sectionSummary,
    leadSheetReady: compiled.leadSheetReady,
    songwritingModuleIds: ['song_mode_compile'],
    presetType: 'song_mode',
    songModeVoiceType: voiceType,
  };

  return {
    compiledSong: compiled,
    leadSheetContract: lead,
    validation,
    manifestHints,
  };
}
