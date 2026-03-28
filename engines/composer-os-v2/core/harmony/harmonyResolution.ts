/**
 * Authoritative chord symbol per bar — same source for generation, measure.chord, and MusicXML export.
 *
 * Final runtime authority: `getChordForBar` only. Score builder and export read measure.chord set from here;
 * MusicXML writes `m.chord` from the score model (see `musicxmlExporter.ts`).
 *
 * Full-form custom harmony must come from `lockedHarmonyBarsRaw` and/or `generationMetadata.parsedCustomProgressionBars`.
 * Falling through to `chordSymbolPlan` for a full pasted progression (while metadata still says custom) is a routing bug.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeChordToken } from './chordProgressionParser';

/** True when one authoritative chord per bar covers the entire form — no chordSymbolPlan fallback for those bars. */
export function isAuthoritativeLockedHarmonyFullForm(context: CompositionContext): boolean {
  const locked = context.lockedHarmonyBarsRaw;
  return !!locked && locked.length === context.form.totalBars;
}

function assertLockedMatchesParsedWhenBothFull(
  locked: string[],
  parsed: string[],
  tb: number
): void {
  for (let i = 0; i < tb; i++) {
    if (normalizeChordToken(locked[i] ?? '') !== normalizeChordToken(parsed[i] ?? '')) {
      throw new Error(
        `HARMONY AUTHORITY: lockedHarmonyBarsRaw !== parsedCustomProgressionBars at bar ${i + 1} ("${locked[i]}" vs "${parsed[i]}")`
      );
    }
  }
}

export function getChordForBar(barIndex: number, context: CompositionContext): string {
  const locked = context.lockedHarmonyBarsRaw;
  const meta = context.generationMetadata;
  const tb = context.form.totalBars;
  const parsed = meta.parsedCustomProgressionBars;

  if (locked && locked.length === tb && parsed && parsed.length === tb && meta.harmonySource === 'custom') {
    assertLockedMatchesParsedWhenBothFull(locked, parsed, tb);
  }

  if (locked && locked.length === tb) {
    if (barIndex >= 1 && barIndex <= tb) {
      return locked[barIndex - 1]!;
    }
    if (meta.customHarmonyLocked === true) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: missing locked harmony for bar ${barIndex} (custom_locked is authoritative).`
      );
    }
  }

  /**
   * When `lockedHarmonyBarsRaw` failed to wire but the parse snapshot matches the form, use it — otherwise
   * `chordSymbolPlan` (often still the built-in Dmin9/G13 cycle) would win and the score would ignore the paste.
   */
  if (parsed && parsed.length === tb && meta.harmonySource === 'custom') {
    if (barIndex >= 1 && barIndex <= tb) {
      return parsed[barIndex - 1]!;
    }
    if (meta.customHarmonyLocked === true) {
      throw new Error(
        `HARMONY AUTHORITY: bar ${barIndex} out of range for parsedCustomProgressionBars (totalBars=${tb}).`
      );
    }
  }

  if (locked && barIndex >= 1 && barIndex <= locked.length) {
    return locked[barIndex - 1]!;
  }

  if (meta.customHarmonyLocked === true) {
    throw new Error(
      `HARMONY AUTHORITY: bar ${barIndex} — custom_locked progression cannot use chordSymbolPlan fallback ` +
        `(locked=${locked?.length ?? 0} parsed=${parsed?.length ?? 0} totalBars=${tb}).`
    );
  }

  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) {
      return seg.chord;
    }
  }
  throw new Error(
    `Chord symbol plan does not define bar ${barIndex} — plan must cover bars 1–${context.form.totalBars} contiguously.`
  );
}

/**
 * Post passes: prefer measure chord when set; fail loudly if it disagrees with authoritative harmony for that bar.
 */
export function resolveChordForDuoPostPass(
  context: CompositionContext,
  barIndex: number,
  measureChord?: string
): string {
  const authoritative = getChordForBar(barIndex, context);
  if (measureChord && measureChord.trim()) {
    const t = measureChord.trim();
    if (t !== authoritative) {
      throw new Error(
        `HARMONY WIRE FAILURE bar ${barIndex}: measure chord "${t}" !== authoritative "${authoritative}"`
      );
    }
    return t;
  }
  return authoritative;
}
