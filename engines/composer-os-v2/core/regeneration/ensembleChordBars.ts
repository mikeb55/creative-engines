/**
 * Derive one chord symbol per bar for ensemble realisation (matches runBigBandRealisation / runQuartetRealisation).
 */

import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';

export function deriveChordBarsFromProgressionOrLeadSheet(params: {
  chordProgressionText?: string;
  leadSheet?: LeadSheet;
  totalBars: number;
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
  const p = parseChordProgressionInputWithBarCount(raw, tb);
  return p.ok ? p.bars : undefined;
}
