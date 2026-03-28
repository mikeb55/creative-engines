/**
 * Chord symbol analysis for duo engine: slash bass, generic chord tones (bass register).
 */

import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

/** Map note name to pitch class 0–11. */
export function noteNameToPitchClass(name: string): number | undefined {
  const n = name.trim();
  const table: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
    Cb: 11,
    Bs: 1,
    Ebb: 3,
    Fb: 4,
  };
  const u = n.charAt(0).toUpperCase() + n.slice(1);
  if (table[u] !== undefined) return table[u];
  return undefined;
}

export interface ParsedChordSymbol {
  /** Full symbol for score / export */
  display: string;
  /** Harmonic part before / (for chord-tone construction) */
  harmonyPart: string;
  /** Pitch class 0–11 of slash bass, if any */
  slashBassPc?: number;
}

/** Split "D/F#" → harmony D, slash F#. */
export function parseChordSymbol(symbol: string): ParsedChordSymbol {
  const s = symbol.trim();
  const slash = s.indexOf('/');
  if (slash < 0) {
    return { display: s, harmonyPart: s };
  }
  const harmonyPart = s.slice(0, slash).trim();
  const bassPart = s.slice(slash + 1).trim();
  const slashBassPc = noteNameToPitchClass(bassPart);
  return { display: s, harmonyPart, slashBassPc };
}

/** Place pitch class in walking range (prefer octave 2–3). */
export function pitchClassToBassMidi(pc: number, walkLow: number, high: number): number {
  let m = Math.floor(walkLow / 12) * 12 + ((pc % 12) + 12) % 12;
  while (m < walkLow) m += 12;
  while (m > high) m -= 12;
  return Math.max(walkLow, Math.min(high, m));
}

export interface ChordTonesOptions {
  /**
   * When true, skip golden-path canonical substitution (G7→G13, C→Cmaj9, …) so generation matches user / locked symbols.
   */
  lockedHarmony?: boolean;
}

/** Full chord symbol (may include slash) → chord tones in bass register. */
export function chordTonesForChordSymbol(fullChord: string, opts?: ChordTonesOptions): ChordToneSet {
  const p = parseChordSymbol(fullChord);
  return chordTonesFromSymbol(p.harmonyPart, opts);
}

function goldenCanonicalHarmony(h: string): string | null {
  const t = h.trim();
  if (/^D(min9|m9|-9)$/i.test(t)) return 'Dmin9';
  if (/^G13$/i.test(t)) return 'G13';
  if (/^G7$/i.test(t)) return 'G13';
  if (/^C(maj9|maj7)$/i.test(t)) return 'Cmaj9';
  if (/^C$/i.test(t)) return 'Cmaj9';
  if (/^A7(alt)?$/i.test(t)) return 'A7alt';
  return null;
}

/**
 * Generic chord tones from symbol (harmonic part only — strip slash for upper structure).
 * Falls back to golden-path switch, then heuristic from quality string.
 */
export function chordTonesFromSymbol(harmonyPart: string, opts?: ChordTonesOptions): ChordToneSet {
  const h = harmonyPart.trim();
  if (!opts?.lockedHarmony) {
    const canon = goldenCanonicalHarmony(h);
    if (canon) {
      return chordTonesForGoldenChord(canon);
    }
  }

  const rm = h.match(ROOT_RE);
  if (!rm) {
    return { root: 40, third: 44, fifth: 47, seventh: 46 };
  }
  const rootPc = noteNameToPitchClass(rm[1]);
  if (rootPc === undefined) {
    return { root: 40, third: 44, fifth: 47, seventh: 46 };
  }
  const rest = h.slice(rm[1].length).toLowerCase();
  const minorThird = /^(m|min|dim|ø|°)/.test(rest) || /m7|m9|m11|m13/.test(rest);
  const maj7 = /maj|Δ|ma7|M7/.test(rest);
  const dom = /^(7|9|11|13)/.test(rest) || /7alt|7#|7b|sus/.test(rest) || /13|11|9/.test(rest);
  const halfDim = /ø|m7b5|half/.test(rest);

  const thirdPc = (rootPc + (minorThird || halfDim ? 3 : 4)) % 12;
  const fifthPc = (rootPc + (halfDim ? 6 : 7)) % 12;
  let seventhPc: number;
  if (maj7) seventhPc = (rootPc + 11) % 12;
  else if (/6/.test(rest) && !dom) seventhPc = (rootPc + 9) % 12;
  else seventhPc = (rootPc + 10) % 12;

  const oct = (pc: number) => 36 + pc;
  return {
    root: oct(rootPc),
    third: oct(thirdPc),
    fifth: oct(fifthPc),
    seventh: oct(seventhPc),
  };
}
