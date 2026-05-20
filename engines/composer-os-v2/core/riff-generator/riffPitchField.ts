/**
 * Per-bar chord-derived pitch field for riff melody (when USE_PITCH_FIELD_NOTE_SELECTION).
 */

import { USE_PITCH_FIELD_NOTE_SELECTION } from '../counterpoint/engineFeatureFlags';
import { chordTonesForChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass, ResolvedPitchField } from '../harmony/pitchFieldSpineTypes';
import type { RiffStyleId } from './riffTypes';

function pcFromMidi(midi: number): PitchClass {
  return (((midi % 12) + 12) % 12) as PitchClass;
}

function styleRegister(style: RiffStyleId): { low: number; high: number } {
  switch (style) {
    case 'metheny':
      return { low: 55, high: 76 };
    case 'scofield':
      return { low: 52, high: 74 };
    case 'funk':
      return { low: 50, high: 72 };
    default:
      return { low: 52, high: 75 };
  }
}

/** Extension pitch classes implied by lead-sheet suffix (per chord, not a static scale pool). */
function extensionPcsForHarmony(harmonyPart: string, rootPc: number): PitchClass[] {
  const s = harmonyPart.toLowerCase();
  const out: PitchClass[] = [];
  const add = (semi: number) => {
    const pc = ((rootPc + semi) % 12) as PitchClass;
    if (!out.includes(pc)) out.push(pc);
  };
  if (/sus4|9sus4/.test(s)) add(5);
  if (/sus2/.test(s)) add(2);
  if (/#11/.test(s)) add(6);
  if (/\b11\b/.test(s) && !/#11/.test(s)) add(5);
  if (/9/.test(s) && !/sus/.test(s)) add(2);
  if (/13/.test(s)) add(9);
  if (/6/.test(s) && !/16/.test(s)) add(9);
  return out;
}

/**
 * Build a resolved pitch field for one bar from the chord symbol (extensions + chord tones).
 */
export function pitchFieldFromChords(chord: string, style: RiffStyleId): ResolvedPitchField {
  const tones = chordTonesForChordSymbol(chord, { lockedHarmony: true });
  const parsed = parseChordSymbol(chord);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? 0) : 0;

  const allowed: Array<{ pc: PitchClass; weight: number }> = [];
  const push = (midi: number, weight: number) => {
    const pc = pcFromMidi(midi);
    if (!allowed.some((e) => e.pc === pc)) allowed.push({ pc, weight });
  };

  push(tones.root, 1.0);
  push(tones.third, 0.95);
  push(tones.fifth, 0.85);
  push(tones.seventh, 0.9);
  for (const ext of extensionPcsForHarmony(parsed.harmonyPart, rootPc)) {
    if (!allowed.some((e) => e.pc === ext)) allowed.push({ pc: ext, weight: 0.78 });
  }

  const { low, high } = styleRegister(style);
  return {
    allowedPcs: allowed,
    preferredIntervals: [],
    registerCenterMidi: Math.floor((low + high) / 2),
    registerSpread: Math.max(4, Math.floor((high - low) / 2)),
    regionId: `riff_chord_${parsed.display}`,
  };
}

export function riffPitchFieldForBar(
  chord: string,
  style: RiffStyleId
): ResolvedPitchField | undefined {
  if (!USE_PITCH_FIELD_NOTE_SELECTION) return undefined;
  return pitchFieldFromChords(chord, style);
}
