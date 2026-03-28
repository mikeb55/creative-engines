/**
 * Song Mode / locked long-form: one contract per bar — display text + parsed semantics (single parse at boundary).
 * Generation uses chord tones derived from the same display string (locked harmonic path); export uses display verbatim.
 */

import type { LockedChordSemantics } from './lockedChordSemantics';
import { parseLockedChordSemantics } from './lockedChordSemantics';
import { chordTonesFromSymbol, parseChordSymbol } from './chordSymbolAnalysis';
import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';

export interface HarmonyBarContract {
  /** 1-based bar index */
  barIndex1: number;
  /** Exact symbol for score + MusicXML */
  displayText: string;
  /** Structured parse — same source as display */
  semantics: LockedChordSemantics;
}

export function buildLockedHarmonyBarContracts(bars: string[]): HarmonyBarContract[] {
  return bars.map((displayText, i) => ({
    barIndex1: i + 1,
    displayText: displayText.trim(),
    semantics: parseLockedChordSemantics(displayText),
  }));
}

function rootAlterToAccidental(alter: number): string {
  if (alter === 1) return '#';
  if (alter === -1) return 'b';
  return '';
}

/** Harmony portion reconstructed from semantics (for parity checks vs display). */
export function harmonyPartFromLockedSemantics(sem: LockedChordSemantics): string {
  const acc = rootAlterToAccidental(sem.rootAlter);
  return `${sem.rootLetter}${acc}${sem.qualityAndExtensionsText}`.trim();
}

/**
 * Locked generation must not diverge: heuristic chord tones from the written harmony part must match
 * tones from structured semantics (same bar, single object).
 */
export function assertLockedHarmonyContractsToneParity(contracts: HarmonyBarContract[]): void {
  for (const c of contracts) {
    const harmonyPart = parseChordSymbol(c.displayText).harmonyPart;
    const fromDisplay = chordTonesFromSymbol(harmonyPart, { lockedHarmony: true });
    const hpSem = harmonyPartFromLockedSemantics(c.semantics);
    const fromSemantics = chordTonesFromSymbol(hpSem, { lockedHarmony: true });
    const pcs = (t: ChordToneSet) =>
      [t.root, t.third, t.fifth, t.seventh].map((x) => (((Math.round(x) % 12) + 12) % 12));
    const a = pcs(fromDisplay).join(',');
    const b = pcs(fromSemantics).join(',');
    if (a !== b) {
      throw new Error(
        `LOCKED HARMONY SEMANTIC DIVERGENCE bar ${c.barIndex1}: display "${c.displayText}" harmonyPart "${harmonyPart}" tones [${a}] vs semantics "${hpSem}" [${b}]`
      );
    }
  }
}

/** Compare export chord string to contract display (normalized) — used in validation. */
export function contractDisplayForBar(contracts: HarmonyBarContract[] | undefined, barIndex1: number): string | undefined {
  const c = contracts?.find((x) => x.barIndex1 === barIndex1);
  return c?.displayText;
}
