/**
 * Composer OS V2 — Minimal Song Mode pipeline (structural; no golden path / ECM).
 */

import { buildCompiledSong, buildLeadSheetContractFromCompiled, summaryStringForManifest } from './songModeBuilder';
import type { CompiledSong } from './songCompilationTypes';
import type { LeadSheetContract } from './leadSheetContract';
import { DEFAULT_SONG_VOICE_TYPE, type SongVoiceType } from './songModeTypes';
import {
  planBeatlesPrimaryVVbV,
  planBeatlesSecondaryVerseChorus,
  planDefaultVerseChorusStructure,
  planExtendedPopStructure,
} from './songSectionPlanner';
import {
  mergeSongModeValidation,
  validateCompiledSong,
  validateLeadSheetContract,
  validateSectionPlanForSongMode,
  validateSongModeRunInput,
  validateSongModeProsodyPlan,
  validateSongModeLeadMelodyPlan,
  validateSongwritingPlanning,
  type SongModeValidationResult,
} from './songModeValidation';
import type { UniversalLeadSheet } from '../lead-sheet/universalLeadSheetTypes';
import {
  buildUniversalLeadSheetFromImportedLeadSheet,
  buildUniversalLeadSheetFromSongContract,
} from '../lead-sheet/universalLeadSheetBuilder';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import type { AuthorRuleId, ClassicalSongRuleId, SongwriterRuleId } from './songwritingResearchTypes';
import type { BeatlesContextMode, BeatlesFormTemplateId, BeatlesMelodicLens } from '../compositionContext';
import type { StylePairingInput } from '../style-pairing/stylePairingTypes';
import { DEFAULT_PRIMARY_SONGWRITER_STYLE, normalizeSongwriterStyleKey } from './songwriterStyleProfiles';
import { resolveSongModeStudyTitle } from '../../app-api/scoreTitleDefaults';

export type SongModeStructureVariant = 'default' | 'extended';

export interface SongModeRunInput {
  seed: number;
  title?: string;
  /** Song form length for default verse–chorus scaffold (planner); defaults to 32. */
  totalBars?: number;
  variant?: SongModeStructureVariant;
  voiceType?: SongVoiceType;
  /** Override bundled `data/Songwriting.md` (or `COMPOSER_OS_SONGWRITING_RESEARCH`). */
  researchPathOverride?: string;
  /** Default `beatles` when omitted. Must not be `null`. */
  primarySongwriterStyle?: SongwriterRuleId | string | null;
  secondarySongwriterStyle?: SongwriterRuleId | string | null;
  /** Secondary share. Omitted keeps 0.35 when a secondary id is set. */
  songwriterBlendWeight?: number;
  authorOverlay?: AuthorRuleId | null;
  classicalOverlay?: ClassicalSongRuleId | null;
  /** Optional songwriter ↔ arranger pairing (additive metadata). */
  stylePairing?: StylePairingInput | null;
  /** Optional imported lead sheet (full LeadSheet MusicXML adapt path; highest priority). */
  leadSheet?: LeadSheet;
  /** ParsedChart → LeadSheet from `musicXmlSource` when no `songModeLeadSheetMusicXml` is supplied. */
  musicXmlLeadSheet?: LeadSheet;
  /** Phase 2+3a — harmonic voice bundle id (engine policy shadow). */
  harmonicVoice?: string | null;
  beatlesContext?: BeatlesContextMode;
  beatlesMelodicLens?: BeatlesMelodicLens;
  /** Beatles macro-form (`songSectionPlanner`). Default **`vv_br_v`** when primary is **`beatles`**. */
  beatlesFormTemplate?: BeatlesFormTemplateId;
  /** Radiohead — RH_MEL_05 acoustic vs electronic (`planMelodyBehaviour`). */
  radioheadMelodicContext?: 'acoustic' | 'electronic';
  /** V3.3 shared motif operators. Omitted or false leaves generator cells unchanged. */
  motifOpsEnabled?: boolean;
}

export interface SongModeRunManifestHints {
  songHookId: string;
  songHookSummary: string;
  songSectionSequence: string[];
  leadSheetReady: boolean;
  songwritingModuleIds: string[];
  presetType: 'song_mode';
  songModeVoiceType: string;
  songwritingPrimaryStyle: string;
  songwritingRuleCount: number;
  researchParseOk: boolean;
  songwritingFingerprint: string;
}

export interface SongModeRunResult {
  compiledSong: CompiledSong;
  leadSheetContract: LeadSheetContract;
  validation: SongModeValidationResult;
  manifestHints: SongModeRunManifestHints;
  /** Same universal contract shape as Duo/ECM via `generateComposition`. */
  universalLeadSheet: UniversalLeadSheet;
}

/**
 * Full structural Song Mode run: sections → hook/chorus/melody planners → style resolution → rules → compiled song → lead sheet → validation.
 */
export function runSongMode(input: SongModeRunInput): SongModeRunResult {
  const primaryResolved =
    normalizeSongwriterStyleKey(input.primarySongwriterStyle ?? '') ?? DEFAULT_PRIMARY_SONGWRITER_STYLE;
  const title =
    input.title?.trim() ||
    resolveSongModeStudyTitle(primaryResolved, input.seed);
  const voiceType = input.voiceType ?? DEFAULT_SONG_VOICE_TYPE;
  const sectionBarTarget = input.totalBars ?? 32;
  const beatlesTpl = input.beatlesFormTemplate ?? 'vv_br_v';
  const sections =
    input.variant === 'extended'
      ? planExtendedPopStructure()
      : primaryResolved === 'beatles' && beatlesTpl === 'vv_br_v'
        ? planBeatlesPrimaryVVbV(sectionBarTarget)
        : primaryResolved === 'beatles' && beatlesTpl === 'verse_chorus'
          ? planBeatlesSecondaryVerseChorus(sectionBarTarget)
          : primaryResolved === 'beatles' && beatlesTpl === 'legacy_vc'
            ? planDefaultVerseChorusStructure(sectionBarTarget)
            : planDefaultVerseChorusStructure(sectionBarTarget);

  const planVal = validateSectionPlanForSongMode(sections, {
    requireChorus: !(primaryResolved === 'beatles' && beatlesTpl === 'vv_br_v'),
  });
  const v0 = validateSongModeRunInput(input);
  const secondaryTrimmed =
    input.secondarySongwriterStyle != null && String(input.secondarySongwriterStyle).trim() !== ''
      ? String(input.secondarySongwriterStyle).trim()
      : undefined;
  const authorTrimmed: AuthorRuleId | undefined =
    input.authorOverlay != null && String(input.authorOverlay).trim() !== ''
      ? (String(input.authorOverlay).trim() as AuthorRuleId)
      : undefined;
  const compiled = buildCompiledSong({
    seed: input.seed,
    title,
    sections,
    voiceType,
    researchPathOverride: input.researchPathOverride,
    primarySongwriterStyle: input.primarySongwriterStyle ?? undefined,
    secondarySongwriterStyle: secondaryTrimmed,
    songwriterBlendWeight: input.songwriterBlendWeight,
    authorOverlay: authorTrimmed,
    classicalOverlay: input.classicalOverlay ?? undefined,
    stylePairing: input.stylePairing ?? undefined,
    harmonicVoice: input.harmonicVoice ?? undefined,
    beatlesContext: input.beatlesContext,
    beatlesMelodicLens: input.beatlesMelodicLens,
    beatlesFormTemplate: primaryResolved === 'beatles' ? beatlesTpl : undefined,
    songTotalBars: sectionBarTarget,
    radioheadMelodicContext: input.radioheadMelodicContext,
    motifOpsEnabled: input.motifOpsEnabled === true,
  });
  const lead = buildLeadSheetContractFromCompiled(compiled);

  const v1 = validateCompiledSong(compiled, { voiceType });
  const v2 = validateLeadSheetContract(lead);
  const v3 = planVal;
  const v4 = validateSongwritingPlanning(compiled);
  const v5 = validateSongModeProsodyPlan(compiled);
  const v6 = validateSongModeLeadMelodyPlan(compiled);
  const validation = mergeSongModeValidation(v0, v3, v1, v2, v4, v5, v6);

  const sw = compiled.songwriting;
  const manifestHints: SongModeRunManifestHints = {
    songHookId: compiled.hook.id,
    songHookSummary: summaryStringForManifest(compiled),
    songSectionSequence: compiled.sectionSummary,
    leadSheetReady: compiled.leadSheetReady,
    songwritingModuleIds: ['song_mode_compile', 'songwriting_research_rules'],
    presetType: 'song_mode',
    songModeVoiceType: voiceType,
    songwritingPrimaryStyle: sw?.resolvedStyle.primaryId ?? 'unknown',
    songwritingRuleCount: sw?.resolvedStyle.resolvedRuleIds.length ?? 0,
    researchParseOk: sw?.researchParseOk ?? false,
    songwritingFingerprint: sw?.resolvedStyle.styleFingerprint ?? '',
  };

  const importedLeadSheet = input.leadSheet ?? input.musicXmlLeadSheet;
  const universalLeadSheet: UniversalLeadSheet = importedLeadSheet
    ? buildUniversalLeadSheetFromImportedLeadSheet(importedLeadSheet)
    : buildUniversalLeadSheetFromSongContract(lead);

  return {
    compiledSong: compiled,
    leadSheetContract: lead,
    validation,
    manifestHints,
    universalLeadSheet,
  };
}
