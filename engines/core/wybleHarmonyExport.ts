/**
 * Single writer for lead-sheet `<harmony>` in Wyble / core `Score` → MusicXML.
 * Canonical user chord (`canonicalChord.text`) is the only authoritative string when present.
 * No generator-only chord stream is consulted here — only fields on `Measure`.
 */

import type { Measure } from './timing';
import { buildHarmonyXmlLine } from './chordSymbolMusicXml';
import { buildHarmonyXmlLineFromCanonical } from './canonicalChord';

/** Top staff only — MusicXML harmony applies to one staff; avoids hosts repeating symbols on lower staves. */
export const WYBLE_HARMONY_STAFF_NUMBER = 1 as const;

/**
 * One `<harmony>` line per measure, or empty string if this measure has no chord.
 * Prefer `canonicalChord` (parsed user bar token); otherwise `chordSymbol` (kind/@text + hidden degrees).
 */
export function buildWybleMeasureHarmonyXml(measure: Measure): string {
  if (measure.canonicalChord) {
    return buildHarmonyXmlLineFromCanonical(measure.canonicalChord, {
      staffNumber: WYBLE_HARMONY_STAFF_NUMBER,
    });
  }
  const raw = measure.chordSymbol?.trim();
  if (raw) {
    return buildHarmonyXmlLine(raw, {
      staffNumber: WYBLE_HARMONY_STAFF_NUMBER,
    });
  }
  return '';
}

/** Expected number of `<harmony>` blocks for a score (one per measure that carries a chord). */
export function expectedWybleHarmonyCount(score: { measures: Measure[] }): number {
  let n = 0;
  for (const m of score.measures) {
    if (m.canonicalChord || (m.chordSymbol?.trim() ?? '').length > 0) n++;
  }
  return n;
}

/**
 * Post-export guard: total harmony count and at most one harmony per measure in the first (only) part.
 */
export function assertWybleHarmonyExportInvariant(xml: string, expectedHarmonyCount: number): void {
  const all = xml.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/g) ?? [];
  if (all.length !== expectedHarmonyCount) {
    throw new Error(
      `Wyble MusicXML harmony invariant: expected ${expectedHarmonyCount} <harmony> blocks, found ${all.length}`
    );
  }
  const partMatch = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/);
  const part = partMatch?.[0];
  if (!part) return;
  const measures = part.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
  for (let i = 0; i < measures.length; i++) {
    const hs = measures[i]!.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/g) ?? [];
    if (hs.length > 1) {
      throw new Error(
        `Wyble MusicXML harmony invariant: measure ${i + 1} has ${hs.length} harmony blocks (max 1)`
      );
    }
  }
}
