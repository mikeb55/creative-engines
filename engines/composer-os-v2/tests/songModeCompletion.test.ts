/**
 * Song Mode completion — lead melody, singer range, prosody, lead sheet (Prompt B/3).
 */

import { runSongMode } from '../core/song-mode/runSongMode';
import { validateSongModeLeadMelodyPlan, validateSongModeProsodyPlan } from '../core/song-mode/songModeValidation';

export function runSongModeCompletionTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const run = runSongMode({ seed: 2025, title: 'Completion Smoke' });
  const c = run.compiledSong;
  const ls = run.leadSheetContract;

  out.push({
    ok:
      run.validation.valid &&
      Boolean(c.leadMelodyPlan?.notes.length) &&
      c.singerRangeValidation?.ok === true &&
      Boolean(c.prosodyPlaceholderPlan?.lines.length),
    name: 'runSongMode validates with lead melody, singer range, prosody',
  });

  out.push({
    ok:
      ls.vocalMelody.events.length > 0 &&
      ls.vocalMelody.singerProfileId != null &&
      (ls.prosodySlots?.length ?? 0) >= 1 &&
      ls.voiceMetadata?.singerRangeOk === true,
    name: 'lead sheet contract carries melody events, prosody slots, voice metadata',
  });

  const vm = validateSongModeLeadMelodyPlan(c);
  const vp = validateSongModeProsodyPlan(c);
  out.push({
    ok: vm.valid && vp.valid,
    name: 'explicit lead melody + prosody validators pass on compiled song',
  });

  return out;
}
