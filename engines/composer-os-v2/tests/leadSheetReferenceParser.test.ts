/**
 * Lead-sheet reference parser.
 */

import { parseLeadSheetReferenceText } from '../core/reference-import/leadSheetReferenceParser';

export function runLeadSheetReferenceParserTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const r = parseLeadSheetReferenceText('C | Dm | G | C');
  out.push({
    ok: r.ok && !!r.piece && r.piece.chordSegments.length >= 1 && r.piece.totalBars >= 4,
    name: 'lead sheet pipe progression parses',
  });

  const bad = parseLeadSheetReferenceText('');
  out.push({
    ok: !bad.ok,
    name: 'negative: empty lead sheet',
  });

  return out;
}
