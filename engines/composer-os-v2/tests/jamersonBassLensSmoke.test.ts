/**
 * Smoke — James Jamerson bass lens (harmonicVoice + bassContourPolicy + duo golden path).
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { bassInterlockForBar } from '../core/riff-generator/riffBass';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { resolveDuoRiffVrbLaneId } from '../core/song-mode/songwriterStyleProfiles';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RiffRhythmSegment } from '../core/riff-generator/riffTypes';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';
import type { GenerationMetadata } from '../core/compositionContext';

const BAR_RHYTHM: RiffRhythmSegment[] = [
  { startBeat: 0, duration: 1, rest: false },
  { startBeat: 1, duration: 1, rest: false },
  { startBeat: 2, duration: 1, rest: false },
  { startBeat: 3, duration: 1, rest: false },
];

function rng(): number {
  return 0.31;
}

function bassNotesFromScore(score: NonNullable<ReturnType<typeof runGoldenPathOnce>['score']>): NoteEvent[] {
  const part = score.parts.find((p) => p.id === 'bass' || p.instrumentIdentity === 'upright_bass');
  if (!part) return [];
  const out: NoteEvent[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') out.push(e as NoteEvent);
    }
  }
  return out;
}

export function runJamersonBassLensSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const jamerson = getVoiceRuleBundle('jamerson');
  const alias = getVoiceRuleBundle('james_jamerson');
  const contour = jamerson.riffProfile?.bassContourPolicy;

  out.push({
    ok:
      jamerson.voiceId === 'jamerson' &&
      alias.voiceId === 'jamerson' &&
      contour?.melodicCounterpart === true &&
      (contour?.anticipateBeats?.includes(0) ?? false) &&
      (contour?.anticipateBeats?.includes(2) ?? false) &&
      (contour?.octaveJumpProbability ?? 0) >= 0.6,
    name: 'Jamerson VRB: alias resolution + bassContourPolicy (anticipate, octave jump, melodicCounterpart)',
  });

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'jamerson',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const notes = bassInterlockForBar('E9', 1, profile, [], BAR_RHYTHM, rng, [], false);
    const anticipates = notes.some((n) => Math.abs(n.startBeat - 3.75) < 0.02);
    const hasOctave = notes.some((n) => n.pitch >= 52);
    out.push({
      ok: anticipates && hasOctave && profile.bassContourPolicy?.melodicCounterpart === true,
      name: 'Jamerson bass interlock: beat-1 anticipation + octave jump from contour policy',
    });
  }

  {
    const lane = resolveDuoRiffVrbLaneId({
      harmonicVoice: 'jamerson',
      songwriterStyleId: 'hendrix',
    } as GenerationMetadata);
    out.push({
      ok: lane === 'jamerson',
      name: 'resolveDuoRiffVrbLaneId: harmonicVoice jamerson wins over primary hendrix (bass lane)',
    });
  }

  const duo = runGoldenPathOnce(50221, {
    presetId: 'guitar_bass_duo',
    harmonicVoice: 'jamerson',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'james_brown',
  });

  out.push({
    ok:
      Boolean(duo.score) &&
      duo.context?.generationMetadata?.harmonicVoice === 'jamerson' &&
      duo.context?.generationMetadata?.riffVrbDuoLaneReceipt?.includes('jamerson') === true,
    name: 'Jamerson duo golden path: no crash + riffVrbDuoLaneReceipt',
  });

  const duoBand = runGoldenPathOnce(50222, {
    presetId: 'guitar_bass_duo',
    harmonicVoice: 'jamerson',
    bandModeEnabled: true,
    totalBars: 32,
    longFormEnabled: true,
  });

  const bassNotes = bassNotesFromScore(duoBand.score!);
  out.push({
    ok: Boolean(duoBand.score) && bassNotes.length >= 8,
    name: 'Jamerson + bandModeEnabled: generates bass line without crash',
  });

  return out;
}

if (require.main === module) {
  const results = runJamersonBassLensSmokeTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
