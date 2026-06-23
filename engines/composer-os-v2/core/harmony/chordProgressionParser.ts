/**
 * User chord progression input: bar-separated tokens (`|`, `,`, `;`, and sometimes spaced `/`),
 * one primary chord per bar for duo engine.
 * Multiple chords in a cell → first chord drives harmony for that bar (documented in UI).
 * Internally normalized to `|` before validation.
 */

import type { ChordSymbolPlan } from '../compositionContext';
import type { ChordSegment, HarmonyPlan } from '../primitives/harmonyTypes';
import {
  ChordQualityFamily,
  parseChordStructureFromNormalized,
  type ParsedChordStructure,
} from '../../../core/chordSymbolRegistry';
import {
  chordWithFallback,
  isValidChordShapeNormalized,
  normalizeChordSymbol,
  normalizeLeadSheetChordSpelling,
} from '../../../core/leadSheetChordNormalize';
import { noteNameToPitchClass } from './chordSymbolAnalysis';

const DEFAULT_DUO_BAR_COUNT = 8;

/**
 * Normalize user bar separators to `|` for parsing. Accepts `|`, `,`, and `;`.
 *
 * **Bar breaks without `|`:** When the trimmed input contains **no** `|` character, we treat
 * (1) newlines and (2) spaced `/` (`\s+/\s+`) as bar separators. That fixes one-chord-per-line
 * pastes (newlines are not matched by `\s+/\s+` alone). Slash bass like `D/F#` is unchanged
 * (no spaces around `/`).
 *
 * **Input that already uses `|`:** If the original trimmed input contains **any** `|`, we do
 * **not** rewrite spaced `/` or newlines — each pipe-delimited cell is one bar; spaced `/` in a
 * cell means multiple chords in that bar (first wins). This matches legacy pipe-based editing.
 *
 * **Note:** `pipeCount` is taken from the raw trimmed input **before** `,` / `;` → `|` expansion.
 */
export function normalizeChordProgressionSeparators(input: string): string {
  const trimmedIn = input.trim();
  if (!trimmedIn) return '';
  const pipeCountInRaw = (trimmedIn.match(/\|/g) || []).length;
  /** Only for completely pipe-free lines do we treat newline / spaced-slash as bar breaks. */
  const noPipeCharInUserInput = pipeCountInRaw === 0;

  let s = trimmedIn;
  s = s.replace(/\s*,\s*/g, ' | ');
  s = s.replace(/\s*;\s*/g, ' | ');
  if (noPipeCharInUserInput) {
    s = s.replace(/\r\n|\r|\n/g, ' | ');
    s = s.replace(/\s+\/\s+/g, ' | ');
  }
  s = s.replace(/\s*\|\s*/g, ' | ');
  s = s.replace(/\s+/g, ' ').trim();
  while (s.includes('| |')) {
    s = s.replace(/\|\s*\|/g, '|');
  }
  return s.trim();
}

/** Canonical comparison for user chords vs score/XML (normalizeChordSymbol + collapse whitespace). */
export function normalizeChordToken(raw: string): string {
  return normalizeChordSymbol(raw).trim().replace(/\s+/g, '');
}

/**
 * Harmony-lock checks: same chord after mapping roots (and slash bass) to pitch class.
 * Treats enharmonic spellings as equal (e.g. C#7b9 ≡ Db7b9, D/F# ≡ D/Gb).
 */
export function lockedHarmonyChordSymbolsEquivalent(a: string, b: string): boolean {
  const na = normalizeChordToken(a);
  const nb = normalizeChordToken(b);
  if (na === nb) return true;
  const pa = parseChordStructureFromNormalized(na);
  const pb = parseChordStructureFromNormalized(nb);
  if (!pa || !pb) return false;
  const ra = noteNameToPitchClass(pa.root);
  const rb = noteNameToPitchClass(pb.root);
  if (ra === undefined || rb === undefined || ra !== rb) return false;
  const sa = pa.suffix.trim().replace(/\s+/g, '');
  const sb = pb.suffix.trim().replace(/\s+/g, '');
  if (sa !== sb) return false;
  if (pa.bass === null && pb.bass === null) return true;
  if (pa.bass === null || pb.bass === null) return false;
  const ba = noteNameToPitchClass(pa.bass);
  const bb = noteNameToPitchClass(pb.bass);
  return ba !== undefined && bb !== undefined && ba === bb;
}

function isValidChordShape(s: string): boolean {
  return isValidChordShapeNormalized(s);
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
  expectedBarCount: number,
  alternateAcceptedBarCounts?: readonly number[]
): ParseChordProgressionResult {
  const acceptedCounts = new Set<number>([expectedBarCount, ...(alternateAcceptedBarCounts ?? [])]);
  const acceptedLabel = [...acceptedCounts].sort((a, b) => a - b).join(' or ');
  const trimmed = normalizeChordProgressionSeparators(input);
  if (!trimmed) {
    return {
      ok: false,
      error: `Chord progression is empty. Enter exactly ${acceptedLabel} bars (use | , ; or spaced / between chords).`,
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
    const rawCell = tokens[0].trim().replace(/\s+/g, ' ');
    const primary = normalizeChordToken(rawCell);
    if (/^tonic_wash$/i.test(primary.replace(/\s+/g, ''))) {
      bars.push('tonic_wash');
      continue;
    }
    if (!isValidChordShape(primary)) {
      const fb = chordWithFallback(rawCell);
      bars.push(fb.chord);
      continue;
    }
    bars.push(normalizeLeadSheetChordSpelling(rawCell).replace(/\s+/g, ' ').trim());
  }
  if (!acceptedCounts.has(bars.length)) {
    return {
      ok: false,
      error: `Expected exactly ${acceptedLabel} bars (use | , ; or spaced / between chords) (found ${bars.length}).`,
    };
  }
  return { ok: true, bars };
}

/**
 * Parse bar-separated chords (after normalizing `,` `;` and spaced `/` to `|`).
 * Requires exactly 8 bars for Guitar–Bass Duo.
 */
export function parseChordProgressionInput(input: string): ParseChordProgressionResult {
  return parseChordProgressionInputWithBarCount(input, DEFAULT_DUO_BAR_COUNT);
}

/**
 * Repeat `seedBars` end-to-end until `totalBars` length (pure cycle, no variation).
 * Returns null when seed is empty or `totalBars` is not a multiple of seed length.
 */
export function expandChordProgressionBarsToCount(
  seedBars: string[],
  totalBars: number
): string[] | null {
  const seedLen = seedBars.length;
  if (seedLen === 0 || totalBars % seedLen !== 0) return null;
  const repeats = totalBars / seedLen;
  const out: string[] = [];
  for (let i = 0; i < repeats; i++) {
    out.push(...seedBars);
  }
  return out;
}

/**
 * Wyble etude / variable length: one primary chord per bar, any count ≥ 1.
 * Same separator and slash-chord rules as `parseChordProgressionInputWithBarCount`; no fixed bar target.
 */
export function parseChordProgressionInputFlexible(input: string): ParseChordProgressionResult {
  const trimmed = normalizeChordProgressionSeparators(input);
  if (!trimmed) {
    return { ok: false, error: 'Chord progression is empty.' };
  }
  const rawBars = trimmed.split('|').map((s) => s.trim());
  const bars: string[] = [];
  for (const cell of rawBars) {
    if (cell === '') continue;
    const tokens = cell.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return { ok: false, error: 'Empty bar between | separators.' };
    }
    const rawCell = tokens[0].trim().replace(/\s+/g, ' ');
    const primary = normalizeChordToken(rawCell);
    if (/^tonic_wash$/i.test(primary.replace(/\s+/g, ''))) {
      bars.push('tonic_wash');
      continue;
    }
    if (!isValidChordShape(primary)) {
      const fb = chordWithFallback(rawCell);
      bars.push(fb.chord);
      continue;
    }
    bars.push(normalizeLeadSheetChordSpelling(rawCell).replace(/\s+/g, ' ').trim());
  }
  if (bars.length === 0) {
    return {
      ok: false,
      error: 'No chords found. Separate bars with | , ; or (without | in the line) newlines or spaced /.',
    };
  }
  return { ok: true, bars };
}

/** One parsed chord slot from pipe-delimited riff / etude input (null = unrecognized symbol). */
export type ParsedChordProgressionEntry = {
  symbol: string;
  rootPc: number;
  structure: ParsedChordStructure;
};

function parseOnePipeDelimitedChord(rawCell: string): ParsedChordProgressionEntry | null {
  const raw = rawCell.trim().replace(/\s+/g, ' ');
  if (!raw) return null;
  const primary = normalizeChordToken(raw);
  if (/^tonic_wash$/i.test(primary.replace(/\s+/g, ''))) {
    const structure: ParsedChordStructure = {
      root: 'C',
      bass: null,
      suffix: '',
      qualityFamily: ChordQualityFamily.Maj,
    };
    return { symbol: 'tonic_wash', rootPc: 0, structure };
  }
  if (!isValidChordShape(primary)) {
    console.warn(`[riff-chord] unrecognized chord symbol: "${rawCell}"`);
    return null;
  }
  const symbol = normalizeLeadSheetChordSpelling(raw).replace(/\s+/g, ' ').trim();
  const structure = parseChordStructureFromNormalized(normalizeChordToken(symbol));
  if (!structure) {
    console.warn(`[riff-chord] structure parse failed: "${rawCell}"`);
    return null;
  }
  const rootPc = noteNameToPitchClass(structure.root);
  if (rootPc === undefined) {
    console.warn(`[riff-chord] root pitch class failed: "${rawCell}"`);
    return null;
  }
  return { symbol, rootPc, structure };
}

/**
 * Parse pipe-delimited chord progression into one entry per bar cell (no bar-count gate).
 * Returns `null` slots for unrecognized symbols (logs symbol) — no silent maj7 substitution.
 */
export function parseChordsFromPipeDelimited(input: string): (ParsedChordProgressionEntry | null)[] {
  const trimmed = normalizeChordProgressionSeparators(input.trim());
  if (!trimmed) return [];
  const rawBars = trimmed.split('|').map((s) => s.trim());
  const out: (ParsedChordProgressionEntry | null)[] = [];
  for (const cell of rawBars) {
    if (cell === '') continue;
    const tokens = cell.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      out.push(null);
      continue;
    }
    out.push(parseOnePipeDelimitedChord(tokens[0]!));
  }
  return out;
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
