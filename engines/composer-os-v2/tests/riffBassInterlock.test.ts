import { bassInterlockForBar } from '../core/riff-generator/riffBass';
import { chordTonesForChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import type { RiffRhythmSegment } from '../core/riff-generator/riffTypes';

const BAR_RHYTHM: RiffRhythmSegment[] = [
  { startBeat: 0, duration: 1, rest: false },
  { startBeat: 1, duration: 1, rest: false },
  { startBeat: 2, duration: 1, rest: false },
  { startBeat: 3, duration: 1, rest: false },
];

function rng(): number {
  return 0.3;
}

export function runRiffBassInterlockTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'sly_stone',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const notes = bassInterlockForBar('E9', 1, profile, [], BAR_RHYTHM, rng, [], false);
    const anticipates = notes.some((n) => Math.abs(n.startBeat - 3.75) < 0.02);
    const hasOctave = notes.some((n) => n.pitch >= 52);
    out.push({
      ok: anticipates && hasOctave,
      name: 'sly_stone bass interlock: a-of-4 anticipation and octave jump in range',
    });
  }

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'led_zeppelin',
      style: 'neutral',
      grid: 'eighth',
      density: 'medium',
    });
    const rigid = { ...profile, pedalRigid: true, bassContourPolicy: undefined };
    const tones = chordTonesForChordSymbol('D', { lockedHarmony: true });
    const rootPc = ((tones.root % 12) + 12) % 12;
    const notes = bassInterlockForBar('D', 0, rigid, [], BAR_RHYTHM, rng, [], true);
    const anticipates = notes.some((n) => Math.abs(n.startBeat - 3.75) < 0.02);
    const allRoot = notes.length > 0 && notes.every((n) => ((n.pitch % 12) + 12) % 12 === rootPc);
    out.push({
      ok: !anticipates && allRoot,
      name: 'led_zeppelin epic_modal_heavy pedalRigid: no anticipation, tonic pedal only',
    });
  }

  return out;
}
