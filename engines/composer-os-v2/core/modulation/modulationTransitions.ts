/**
 * Modulation transition helpers — voice-leading-aware intent strings; transpose utilities.
 * Does not generate progressions — supports planning + validation only.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

const PC_TO_SHARP: Record<number, string> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'D#',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'G#',
  9: 'A',
  10: 'A#',
  11: 'B',
};

export function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12] ?? 'C';
}

/** Transpose chord symbol by semitones (harmony + optional slash bass). */
export function transposeChordSymbol(symbol: string, semitones: number): string {
  const s = symbol.trim();
  const slashIdx = s.indexOf('/');
  const main = slashIdx >= 0 ? s.slice(0, slashIdx).trim() : s;
  const bassPart = slashIdx >= 0 ? s.slice(slashIdx + 1).trim() : '';

  const m = main.match(ROOT_RE);
  if (!m) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const newRootPc = (rootPc + semitones + 120) % 12;
  const newRoot = pitchClassToSharpName(newRootPc);
  const rest = main.slice(m[1].length);

  let out = `${newRoot}${rest}`;
  if (bassPart) {
    const bPc = noteNameToPitchClass(bassPart);
    if (bPc !== undefined) {
      const nb = pitchClassToSharpName((bPc + semitones + 120) % 12);
      out = `${out}/${nb}`;
    } else {
      out = `${out}/${bassPart}`;
    }
  }
  return out;
}

/** Heuristic: shared pitch classes between two chord roots (pivot thinking). */
export function pivotOverlapPc(rootA: string, rootB: string): number {
  const a = noteNameToPitchClass(rootA);
  const b = noteNameToPitchClass(rootB);
  if (a === undefined || b === undefined) return 0;
  return a === b ? 1 : 0;
}

/** Chromatic approach: dominant a semitone below target root PC. */
export function chromaticDominantApproachPc(targetRootPc: number): number {
  return (targetRootPc + 10) % 12;
}

/** Semitone below / above for return gestures. */
export function semitoneReturnSourcePc(homeRootPc: number, fromAbove: boolean): number {
  return (homeRootPc + (fromAbove ? -1 : 1) + 12) % 12;
}

/** Tritone related root (colour bridge). */
export function tritoneRelatedPc(rootPc: number): number {
  return (rootPc + 6) % 12;
}

/** Strip harmony to root for analysis. */
export function chordRootName(symbol: string): string | undefined {
  const p = parseChordSymbol(symbol);
  const m = p.harmonyPart.match(ROOT_RE);
  return m ? m[1] : undefined;
}
