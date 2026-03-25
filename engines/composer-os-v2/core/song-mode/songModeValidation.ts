/**
 * Composer OS V2 — Song Mode structural validation (no score integrity / MusicXML).
 */

import type { LeadSheetContract } from './leadSheetContract';
import type { CompiledSong } from './songCompilationTypes';
import type { SongSectionPlan } from './songModeTypes';
import { DEFAULT_SONG_VOICE_TYPE, type SongVoiceType } from './songModeTypes';
import { structureHasChorus } from './songStructureTypes';

export interface SongModeValidationResult {
  valid: boolean;
  errors: string[];
}

function err(errors: string[], msg: string): void {
  errors.push(msg);
}

/** Section plan must include chorus for hook-first pop-oriented Song Mode. */
export function validateSectionPlanForSongMode(
  sections: SongSectionPlan[],
  opts?: { requireChorus?: boolean }
): SongModeValidationResult {
  const errors: string[] = [];
  const requireChorus = opts?.requireChorus !== false;
  if (sections.length === 0) err(errors, 'Song Mode: section plan is empty');
  const orders = sections.map((s) => s.order);
  if (new Set(orders).size !== orders.length) err(errors, 'Song Mode: duplicate section order index');
  if (requireChorus && !structureHasChorus({ sections })) {
    err(errors, 'Song Mode: chorus is required');
  }
  return { valid: errors.length === 0, errors };
}

export function validateCompiledSong(
  song: CompiledSong,
  opts?: { voiceType?: SongVoiceType }
): SongModeValidationResult {
  const errors: string[] = [];
  if (!song.id) err(errors, 'Compiled song: missing id');
  if (!song.title) err(errors, 'Compiled song: missing title');
  const expectedVoice = opts?.voiceType ?? DEFAULT_SONG_VOICE_TYPE;
  if (song.voiceType !== expectedVoice) err(errors, `Compiled song: expected voiceType ${expectedVoice}`);
  if (!song.hook?.id) err(errors, 'Compiled song: missing hook id');
  if (song.sectionSummary.length === 0) err(errors, 'Compiled song: empty section summary');
  if (song.chordPlan.length === 0) err(errors, 'Compiled song: empty chord plan');
  if (!song.hookFirst || !song.melodyFirst) err(errors, 'Compiled song: melodyFirst/hookFirst flags required');
  if (!song.leadSheetReady) err(errors, 'Compiled song: leadSheetReady expected for Song Mode');
  return { valid: errors.length === 0, errors };
}

export function validateLeadSheetContract(c: LeadSheetContract): SongModeValidationResult {
  const errors: string[] = [];
  if (!c.title) err(errors, 'Lead sheet: missing title');
  if (!c.vocalMelody?.voiceType) err(errors, 'Lead sheet: missing vocal voice type');
  if (c.chordSymbols.length === 0) err(errors, 'Lead sheet: no chord symbols');
  if (!c.formSummary?.sections?.length) err(errors, 'Lead sheet: form summary empty');
  for (const ph of c.lyricPlaceholders) {
    if (!ph.placeholderId) err(errors, 'Lead sheet: lyric placeholder missing id');
  }
  return { valid: errors.length === 0, errors };
}

/** Merge validation results. */
export function mergeSongModeValidation(...results: SongModeValidationResult[]): SongModeValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return { valid: errors.length === 0, errors };
}

/** Reject explicit null primary style (use undefined for default). */
export function validateSongModeRunInput(input: { primarySongwriterStyle?: unknown }): SongModeValidationResult {
  const errors: string[] = [];
  if (input.primarySongwriterStyle === null) {
    err(errors, 'Song Mode: primarySongwriterStyle cannot be null (omit for default)');
  }
  return { valid: errors.length === 0, errors };
}

/** Research + hook/chorus behaviour layer (Prompt 6.5/7). */
export function validateSongwritingPlanning(
  song: CompiledSong,
  opts?: { requireResearchOk?: boolean }
): SongModeValidationResult {
  const errors: string[] = [];
  if (!song.songwriting) err(errors, 'Song Mode: songwriting planning bundle missing');
  const sw = song.songwriting;
  if (sw) {
    if (opts?.requireResearchOk !== false && !sw.researchParseOk) {
      err(errors, 'Song Mode: songwriting research parse failed');
    }
    if (!sw.hookPlan?.primaryHookType) err(errors, 'Song Mode: hook plan invalid');
    if (!sw.resolvedStyle?.styleFingerprint) err(errors, 'Song Mode: style resolution missing');
    const hasChorus = song.sectionSummary.includes('chorus');
    if (hasChorus && sw.chorusPlan.relativeIntensityVsVerse !== 'higher') {
      err(errors, 'Song Mode: chorus payoff contrast not reflected in plan');
    }
    if (!song.hookFirst || !song.melodyFirst) err(errors, 'Song Mode: melodyFirst/hookFirst must stay true');
  }
  return { valid: errors.length === 0, errors };
}
