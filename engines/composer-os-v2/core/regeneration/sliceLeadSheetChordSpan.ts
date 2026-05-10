import type { LeadSheet } from '../lead-sheet/leadSheetTypes';

/** Keep chord events whose bar falls in [startBar, endBar], renumbered to fragment-local 1..span. */
export function sliceLeadSheetChordEventsForSpan(
  leadSheet: LeadSheet | undefined,
  startBar: number,
  endBar: number
): LeadSheet | undefined {
  if (!leadSheet?.chordEvents?.length) return leadSheet;
  const offset = startBar - 1;
  const mapped = [...leadSheet.chordEvents]
    .filter((e) => e.bar >= startBar && e.bar <= endBar)
    .map((e) => ({ ...e, bar: e.bar - offset }));
  return { ...leadSheet, chordEvents: mapped };
}
