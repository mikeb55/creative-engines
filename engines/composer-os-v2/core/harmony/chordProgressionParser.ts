/**
 * User chord progression input: bar-separated tokens (`|`, `,`, `;`, and sometimes spaced `/`),
 * one primary chord per bar for duo engine.
 * Multiple chords in a cell → first chord drives harmony for that bar (documented in UI).
 * Internally normalized to `|` before validation.
 */

import type { ChordSymbolPlan } from '../compositionContext';
import type { ChordSegment, HarmonyPlan } from '../primitives/harmonyTypes';

const BAR_COUNT = 8;

/**
 * Normalize user bar separators to `|` for parsing. Accepts `|`, `,`, and `;`.
 * Spaced `/` (`\s+/\s+`) becomes a bar separator only when the **original** input had no `|`
 * (comma/semicolon style). If the user already used `|`, each pipe-delimited cell stays one bar
 * and spaced `/` is left as multiple tokens in that cell (first chord wins) — slash bass like
 * `D/F#` is never split because it has no spaces around `/`.
 * Collapses redundant spaces; does not alter chord spellings inside tokens.
 */
export function normalizeChordProgressionSeparators(input: string): string {
  const hadBarPipeChar = input.includes('|');
  let s = input.trim();
  if (!s) return '';
  s = s.replace(/\s*,\s*/g, ' | ');
  s = s.replace(/\s*;\s*/g, ' | ');
  if (!hadBarPipeChar) {
    s = s.replace(/\s+\/\s+/g, ' | ');
  }
  s = s.replace(/\s*\|\s*/g, ' | ');
  s = s.replace(/\s+/g, ' ').trim();
  while (s.includes('| |')) {
    s = s.replace(/\|\s*\|/g, '|');
  }
  return s.trim();
}

/** Root (incl. Bb, F#) + quality + optional slash bass (e.g. Cmaj7/E, D/F#). */
const CHORD_TOKEN =
  /^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/i;

/** Canonical comparison for user chords vs score/XML (trim + collapse whitespace). */
export function normalizeChordToken(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

function isValidChordShape(s: string): boolean {
  if (!s) return false;
  const m = s.match(CHORD_TOKEN);
  if (!m) return false;
  const qual = (m[2] ?? '').trim();
  if (qual.length > 14) return false;
  return true;
}

export type ParseChordProgressionResult =
  | { ok: true; bars: string[] }
  | { ok: false; error: string };

/**
 * Parse bar-separated chords (after normalizing `,` `;` and spaced `/` to `|`).
 * Single parsing path — `parseChordProgressionInput` fixes bar count at 8 for duo.
 * Within a bar, whitespace separates chords — the first chord is used for that measure.
 */
export function parseChordProgressionInputWithBarCount(
  input: string,
  expectedBarCount: number
): ParseChordProgressionResult {
  const trimmed = normalizeChordProgressionSeparators(input);
  if (!trimmed) {
    return {
      ok: false,
      error: `Chord progression is empty. Enter exactly ${expectedBarCount} bars (use | , ; or spaced / between chords).`,
    };
  }
  const rawBars = trimmed.split('|').map((s) => s.trim());
  const bars: string[] = [];
  for (const cell of rawBars) {
    if (cell === '') continue;
    const tokens = cell.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return { ok: false, error: 'Empty bar between | separators.' };
    }
    const primary = normalizeChordToken(tokens[0]);
    if (!isValidChordShape(primary)) {
      return { ok: false, error: `Unrecognized chord symbol: "${tokens[0]}".` };
    }
    bars.push(primary);
  }
  if (bars.length !== expectedBarCount) {
    return {
      ok: false,
      error: `Expected exactly ${expectedBarCount} bars (use | , ; or spaced / between chords) (found ${bars.length}).`,
    };
  }
  return { ok: true, bars };
}

/**
 * Parse bar-separated chords (after normalizing `,` `;` and spaced `/` to `|`).
 * Requires exactly 8 bars for Guitar–Bass Duo.
 */
export function parseChordProgressionInput(input: string): ParseChordProgressionResult {
  return parseChordProgressionInputWithBarCount(input, BAR_COUNT);
}

/** Merge consecutive identical chords into segments (exactly 8 bars). */
export function buildHarmonyPlanFromBars(bars: string[]): HarmonyPlan {
  const segments: ChordSegment[] = [];
  let i = 0;
  while (i < bars.length) {
    const chord = bars[i];
    let len = 1;
    while (i + len < bars.length && bars[i + len] === chord) len++;
    segments.push({ chord, bars: len });
    i += len;
  }
  return { segments, totalBars: bars.length };
}

/** Chord symbol plan with bar ranges for score / export. */
export function buildChordSymbolPlanFromBars(bars: string[]): ChordSymbolPlan {
  const segments: ChordSymbolPlan['segments'] = [];
  let i = 0;
  while (i < bars.length) {
    const chord = bars[i];
    let len = 1;
    while (i + len < bars.length && bars[i + len] === chord) len++;
    segments.push({ chord, startBar: i + 1, bars: len });
    i += len;
  }
  return { segments, totalBars: bars.length };
}

/** Ensures segments are contiguous from bar 1 through `totalBars`. */
export function validateChordSymbolPlanCoversBars(
  plan: ChordSymbolPlan,
  totalBars: number
): string | null {
  if (plan.totalBars !== totalBars) {
    return `Chord symbol plan totalBars is ${plan.totalBars}, expected ${totalBars}.`;
  }
  const segs = [...plan.segments].sort((a, b) => a.startBar - b.startBar);
  let expectedStart = 1;
  for (const s of segs) {
    if (s.startBar !== expectedStart) {
      return `Chord symbol plan gap: expected segment at bar ${expectedStart}, found bar ${s.startBar}.`;
    }
    expectedStart += s.bars;
  }
  if (expectedStart !== totalBars + 1) {
    return `Chord symbol plan does not cover bars 1–${totalBars}.`;
  }
  return null;
}
