/**
 * Derive one chord symbol per bar for ensemble realisation (matches runBigBandRealisation / runQuartetRealisation).
 */

import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';

/** Cycle a short progression to `targetLen` bars (index wraps with `% bars.length`). */
export function tileChordProgression(bars: readonly string[], targetLen: number): string[] {
  if (bars.length === 0 || targetLen <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < targetLen; i++) {
    out.push(bars[i % bars.length]!);
  }
  return out;
}

export function deriveChordBarsFromProgressionOrLeadSheet(params: {
  chordProgressionText?: string;
  leadSheet?: LeadSheet;
  totalBars: number;
  /** When set, accept this cycle length and tile to `totalBars` (e.g. Orbit 28 → 120). */
  tileFromBarCount?: number;
}): string[] | undefined {
  const tb = params.totalBars;
  let raw = typeof params.chordProgressionText === 'string' ? params.chordProgressionText.trim() : '';
  if (params.leadSheet?.chordEvents?.length) {
    const sorted = [...params.leadSheet.chordEvents].sort(
      (a, b) => a.bar - b.bar || a.beat - b.beat
    );
    const primaryByBar = new Map<number, string>();
    for (const e of sorted) {
      if (e.bar >= 1 && e.bar <= tb && !primaryByBar.has(e.bar)) {
        primaryByBar.set(e.bar, e.symbol);
      }
    }
    let carry = 'C';
    const cells: string[] = [];
    for (let bar = 1; bar <= tb; bar++) {
      const sym = primaryByBar.get(bar);
      if (sym !== undefined) carry = sym;
      cells.push(carry);
    }
    raw = cells.join(' | ');
  }
  if (!raw) return undefined;

  const cycleLen = params.tileFromBarCount;
  const alternate =
    typeof cycleLen === 'number' && cycleLen > 0 && cycleLen !== tb ? ([cycleLen] as const) : undefined;
  const p = parseChordProgressionInputWithBarCount(raw, tb, alternate);
  if (!p.ok) return undefined;
  if (p.bars.length === tb) return p.bars;
  if (typeof cycleLen === 'number' && cycleLen > 0 && p.bars.length === cycleLen) {
    return tileChordProgression(p.bars, tb);
  }
  return undefined;
}
