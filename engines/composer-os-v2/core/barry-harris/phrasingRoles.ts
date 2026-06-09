/**
 * V80j - Phrasing roles for Barry Harris chord-melody export density.
 */

import { chordTonePcsForResolved } from './identities';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PhrasingRole, ResolvedChordMelodyNote } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function isStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}

function isCadentialBar(bar: number, totalBars: number): boolean {
  return bar === totalBars || bar % 4 === 0;
}

function isPassingContour(melody: readonly ImportMelodyNote[], index: number, melodyPc: number): boolean {
  const prev = melody[index - 1];
  const next = melody[index + 1];
  if (!prev || !next) return false;
  const prevPc = mod12(prev.midiPitch % 12);
  const nextPc = mod12(next.midiPitch % 12);
  const stepPrev = Math.min((melodyPc - prevPc + 12) % 12, (prevPc - melodyPc + 12) % 12);
  const stepNext = Math.min((melodyPc - nextPc + 12) % 12, (nextPc - melodyPc + 12) % 12);
  return stepPrev <= 2 && stepNext <= 2 && prevPc !== nextPc;
}

function isChordTone(resolved: ResolvedChordMelodyNote): boolean {
  return chordTonePcsForResolved(resolved).includes(mod12(resolved.melodyPc));
}

function baseRoleForNote(
  resolved: ResolvedChordMelodyNote,
  mel: ImportMelodyNote,
  melodyIndex: number,
  melody: readonly ImportMelodyNote[],
  totalBars: number
): PhrasingRole {
  const strong = isStrongBeat(resolved.onsetBeat);
  const duration = mel.durationBeats;
  const cadential = isCadentialBar(resolved.bar, totalBars) && isChordTone(resolved);
  const passing = isPassingContour(melody, melodyIndex, resolved.melodyPc);
  if (strong && (cadential || isChordTone(resolved))) return 'full';
  if (passing && duration <= 1) return duration <= 0.5 ? 'single' : 'dyad';
  if (!strong && duration <= 0.5) return 'single';
  if (!strong && duration <= 1) return 'dyad';
  if (cadential) return 'full';
  return strong ? 'full' : 'dyad';
}

export function assignPhrasingRoles(
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  totalBars: number
): ResolvedChordMelodyNote[] {
  const roles: PhrasingRole[] = [];
  for (let i = 0; i < resolvedNotes.length; i++) {
    const r = resolvedNotes[i]!;
    const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    const idx = melody.findIndex((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    roles.push(mel && idx >= 0 ? baseRoleForNote(r, mel, idx, melody, totalBars) : isStrongBeat(r.onsetBeat) ? 'full' : 'dyad');
  }
  for (let i = 1; i < resolvedNotes.length; i++) {
    const prev = resolvedNotes[i - 1]!;
    const curr = resolvedNotes[i]!;
    if (prev.melodyPc === curr.melodyPc && prev.bar === curr.bar) {
      roles[i] = roles[i - 1] === 'full' ? 'dyad' : roles[i - 1] === 'dyad' ? 'single' : 'full';
    } else if (prev.melodyPc === curr.melodyPc) {
      roles[i] = roles[i - 1] === roles[i] ? (roles[i] === 'full' ? 'dyad' : 'full') : roles[i]!;
    }
  }
  return resolvedNotes.map((r, i) => ({ ...r, phrasingRole: roles[i]! }));
}