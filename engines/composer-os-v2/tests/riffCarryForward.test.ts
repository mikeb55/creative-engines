import { retargetLockedBarToChord } from '../core/riff-generator/riffCarryForward';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { chordTonesForChordSymbol, noteNameToPitchClass } from '../core/harmony/chordSymbolAnalysis';
import { parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import type { RiffBarSnapshot } from '../core/riff-generator/riffCarryForward';

export function runRiffCarryForwardTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const rhythm = [
    { startBeat: 0, duration: 0.5, rest: false },
    { startBeat: 0.5, duration: 0.5, rest: false },
    { startBeat: 2, duration: 1, rest: false },
  ];
  const locked: RiffBarSnapshot = {
    rhythm: rhythm.map((r) => ({ ...r })),
    guitarNotes: [
      { pitch: 64, startBeat: 0, duration: 0.5, voice: 1 },
      { pitch: 67, startBeat: 0.5, duration: 0.5, voice: 1 },
    ],
    bassNotes: [{ pitch: 40, startBeat: 0, duration: 1, voice: 1 }],
    chord: 'E9',
  };
  const profile = resolveRiffGeneratorProfile({
    vrbId: 'sly_stone',
    style: 'funk',
    grid: 'sixteenth',
    density: 'medium',
  });

  {
    const ret = retargetLockedBarToChord(locked, 'G13', profile, 'sly_stone', 0, 'funk');
    const rhythmOk =
      ret.rhythm.length === locked.rhythm.length &&
      ret.rhythm.every((r, i) => Math.abs(r.startBeat - locked.rhythm[i]!.startBeat) < 0.01);
    const parsed = parseChordSymbol('G13');
    const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
    const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? -1) : -1;
    const tones = chordTonesForChordSymbol('G13', { lockedHarmony: true });
    const bassRootOk = (ret.bassNotes ?? []).some(
      (n) => ((n.pitch % 12) + 12) % 12 === rootPc || ((n.pitch % 12) + 12) % 12 === ((tones.root % 12) + 12) % 12
    );
    out.push({
      ok: rhythmOk && ret.chord === 'G13' && bassRootOk,
      name: 'retargetLockedBarToChord: rhythm skeleton preserved, bass matches new root',
    });
  }

  {
    const ret = retargetLockedBarToChord(locked, 'G13', profile, 'sly_stone', 0, 'funk');
    const gPcs = ret.guitarNotes.map((n) => ((n.pitch % 12) + 12) % 12);
    const tones = chordTonesForChordSymbol('G13', { lockedHarmony: true });
    const allowed = new Set([
      tones.root % 12,
      tones.third % 12,
      tones.fifth % 12,
      tones.seventh % 12,
      (tones.root + 9) % 12,
    ]);
    const guitarOk = gPcs.every((pc) => allowed.has(pc));
    out.push({
      ok: guitarOk,
      name: 'retargetLockedBarToChord: guitar pitches align with new chord field',
    });
  }

  return out;
}
