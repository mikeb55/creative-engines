/**
 * Composer OS V2 — Song Mode structural validation (no score integrity / MusicXML).
 */

import type { LeadSheetContract } from './leadSheetContract';
import type { CompiledSong } from './songCompilationTypes';
import { validateHookReturnConsistency, validateLeadMelodyPlan } from './melodyValidation';
import type { SongSectionPlan } from './songModeTypes';
import type { SongVoiceType } from './songModeTypes';
import { structureHasChorus } from './songStructureTypes';
import { validateProsodyPlaceholderPlan } from './prosodyValidation';

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
  if (opts?.voiceType != null && song.voiceType !== opts.voiceType) {
    err(errors, `Compiled song: expected voiceType ${opts.voiceType}`);
  }
  if (!song.hook?.id) err(errors, 'Compiled song: missing hook id');
  if (song.sectionSummary.length === 0) err(errors, 'Compiled song: empty section summary');
  if (song.chordPlan.length === 0) err(errors, 'Compiled song: empty chord plan');
  if (!song.hookFirst || !song.melodyFirst) err(errors, 'Compiled song: melodyFirst/hookFirst flags required');
  if (!song.leadSheetReady) err(errors, 'Compiled song: leadSheetReady expected for Song Mode');
  if (!song.leadMelodyPlan) err(errors, 'Compiled song: lead melody plan required');
  if (!song.singerRangeValidation) err(errors, 'Compiled song: singer range validation missing');
  else {
    for (const e of song.singerRangeValidation.errors) err(errors, e);
  }
  if (!song.prosodyPlaceholderPlan) err(errors, 'Compiled song: prosody placeholder plan required');
  return { valid: errors.length === 0, errors };
}

export function validateLeadSheetContract(c: LeadSheetContract): SongModeValidationResult {
  const errors: string[] = [];
  if (!c.title) err(errors, 'Lead sheet: missing title');
  if (!c.vocalMelody?.voiceType) err(errors, 'Lead sheet: missing vocal voice type');
  if (c.vocalMelody.events.length === 0) err(errors, 'Lead sheet: no lead melody events');
  if (c.chordSymbols.length === 0) err(errors, 'Lead sheet: no chord symbols');
  if (!c.formSummary?.sections?.length) err(errors, 'Lead sheet: form summary empty');
  for (const ph of c.lyricPlaceholders) {
    if (!ph.placeholderId) err(errors, 'Lead sheet: lyric placeholder missing id');
  }
  return { valid: errors.length === 0, errors };
}

/** Prosody placeholder layer (Prompt B/3). */
export function validateSongModeProsodyPlan(song: CompiledSong): SongModeValidationResult {
  const r = validateProsodyPlaceholderPlan(song.prosodyPlaceholderPlan);
  return { valid: r.ok, errors: r.errors };
}

/** Lead melody shape + hook-return consistency (Prompt B/3). */
export function validateSongModeLeadMelodyPlan(song: CompiledSong): SongModeValidationResult {
  const errors: string[] = [];
  const m = validateLeadMelodyPlan(song.leadMelodyPlan);
  if (!m.ok) for (const e of m.errors) err(errors, e);
  const expects = song.songwriting?.hookPlan?.expectsHookReturnInChorus ?? false;
  if (song.leadMelodyPlan) {
    const h = validateHookReturnConsistency(song.leadMelodyPlan, expects);
    if (!h.ok) for (const e of h.errors) err(errors, e);
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
    const pair = sw.stylePairingResolution;
    if (pair) {
      const c = pair.confidenceScore;
      if (typeof c !== 'number' || c < 0 || c > 1 || Number.isNaN(c)) {
        err(errors, 'Song Mode: style pairing confidenceScore must be in [0, 1]');
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
