import type { CompositionContext } from '../compositionContext';
import { mapChordToVaultType, parseRootNoteToPc } from '../irealpro/chordSymbolMapper';
import type { ParsedChord } from '../irealpro/parsedChart';
import { getChordForBar } from './harmonyResolution';

export type BarChordEntry = {
  /** 1-based bar index (matches {@link getChordForBar}). */
  barIndex: number;
  chordSymbol: string;
  vaultChordTypeId: string;
  rootPc: number;
  mappingNull: boolean;
};

/** Split a lead-sheet token into {@link ParsedChord} fields — mirrors `chordSymbolMapper` behaviour without exporting internals. */
function parseChordSymbolForVault(symbol: string): ParsedChord | null {
  const s = symbol.trim();
  if (!s || /^n\.?c\.?$/i.test(s)) return null;
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(s);
  if (!m) return null;
  const rootNote = (m[1]! + (m[2] ?? '')).toLowerCase();
  const chordQuality = (m[3] ?? '').trim();
  if (parseRootNoteToPc(rootNote) === null) return null;
  return {
    symbol: s,
    rootNote,
    chordQuality,
    duration: 1,
    barIndex: 0,
    beatIndex: 0,
  };
}

/**
 * Returns one chord per bar in **[startBar, endBar]** (inclusive, 1-based), using {@link getChordForBar} only
 * (full spine + harmonic rhythm / scene bias). Maps each symbol to Tonality Vault ids via {@link mapChordToVaultType}.
 */
export function getChordRangeForBars(
  startBar: number,
  endBar: number,
  context: CompositionContext
): BarChordEntry[] {
  const tb = context.form.totalBars;
  if (
    !Number.isFinite(startBar) ||
    !Number.isFinite(endBar) ||
    startBar < 1 ||
    endBar < startBar ||
    endBar > tb
  ) {
    throw new Error(`getChordRangeForBars: invalid range ${startBar}–${endBar} (totalBars=${tb})`);
  }

  const out: BarChordEntry[] = [];
  for (let b = startBar; b <= endBar; b++) {
    const chordSymbol = getChordForBar(b, context).trim();
    const parsed = parseChordSymbolForVault(chordSymbol);
    if (!parsed) {
      out.push({
        barIndex: b,
        chordSymbol,
        vaultChordTypeId: '',
        rootPc: 0,
        mappingNull: true,
      });
      continue;
    }
    const mapped = mapChordToVaultType(parsed);
    if (!mapped) {
      out.push({
        barIndex: b,
        chordSymbol,
        vaultChordTypeId: '',
        rootPc: 0,
        mappingNull: true,
      });
      continue;
    }
    out.push({
      barIndex: b,
      chordSymbol,
      vaultChordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
      mappingNull: false,
    });
  }
  return out;
}
