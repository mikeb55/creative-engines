/**

 * SQ→BB user chord progression parser (Session 6 + V2).

 * Permissive input, conservative interpretation; bar-level default with optional beat-level cells.

 */



import {

  isChordSymbolRecognizedNormalized,

  isValidChordShapeNormalized,

  normalizeChordSymbol,

} from '../../../core/leadSheetChordNormalize';

import { parseChordStructureFromNormalized } from '../../../core/chordSymbolRegistry';

import type { CompositionContext } from '../compositionContext';

import { getChordForBar } from '../harmony/harmonyResolution';

import type { SqToBbChordSourceMode } from './sqToBbWorkflowTypes';



export type ParsedChordParseConfidence = 'ok' | 'warning' | 'error';



export type BeatLevelChord = {

  beatIndex: number;

  beatDuration: number;

  originalSymbol: string;

  normalizedSymbol: string;

  parseConfidence: ParsedChordParseConfidence;

  warningReason?: string;

};



export type ParsedChordBar = {

  barIndex: number;

  originalSymbol: string;

  normalizedSymbol: string;

  source: 'user';

  parseConfidence: ParsedChordParseConfidence;

  warningReason?: string;

  beatLevelChords?: BeatLevelChord[];

};



export type ParsedChordTimeline = ParsedChordBar[];



export type ParsedChordTokenSpan = {

  token: string;

  start: number;

  end: number;

  confidence: ParsedChordParseConfidence;

  warningReason?: string;

};



export type ParseUserChordInputResult = {

  timeline: ParsedChordTimeline;

  tokens: ParsedChordTokenSpan[];

  chordCount: number;

  hasErrors: boolean;

  hasWarnings: boolean;

};



export type BarCountMismatchKind = 'match' | 'fewer' | 'more';



export type BarCountMismatch = {

  kind: BarCountMismatchKind;

  chordCount: number;

  barCount: number;

};



export type MergedChordTimelineBar = {

  barIndex: number;

  originalSymbol: string;

  normalizedSymbol: string;

  source: 'user' | 'internal';

  parseConfidence?: ParsedChordParseConfidence;

  warningReason?: string;

  beatLevelChords?: BeatLevelChord[];

};



export type SqToBbChordTimelineSource = 'user' | 'internal' | 'mixed';



export type SqToBbChordMismatchResolution =

  | 'repeat'

  | 'fill_internal'

  | 'stretch'

  | 'compress';



const ROOT_RE = /^[A-G](?:#|b)?/i;

const NC_RE = /^N\.?\s*C\.?$/i;

const BEATS_PER_BAR = 4;



/** Orbit lead sheet — first 28 bars of 32-bar form (Session 6 test fixture). */

export const ORBIT_28_BAR_PROGRESSION =

  'Dbmaj7 | Bb7 | Fmaj7 | Fmaj7 | Fmaj7#11 | Ebmaj7#5 | Dbmaj7 | Bmaj7 | Bbm9 | Abmaj7 | Gbmaj7 | Emaj7 | ' +

  'Fmaj7#11 | Ebmaj7#5 | Dbmaj7 | Bmaj7 | Bbm9 | Abmaj7 | Gbmaj7 | Emaj7 | Gmaj7/F | Gmaj7/F | Ebmaj7/F | Ebmaj7/F | ' +

  'Dbmaj7 | Bb7 | Fmaj7 | Fmaj7';



function unicodeToAsciiChord(s: string): string {

  return s

    .replace(/\u0394/g, 'maj')

    .replace(/\u2206/g, 'maj')

    .replace(/\^/g, '')

    .replace(/ø7/gi, 'm7b5')

    .replace(/\u00F8/g, 'm7b5')

    .replace(/\u00D8/g, 'm7b5');

}



/** Spec normalization — preserve `originalSymbol`; engine uses `normalizedSymbol`. */

export function normalizeUserChordSymbol(raw: string): string {

  let s = unicodeToAsciiChord(raw.trim());

  if (NC_RE.test(s)) return 'NC';

  s = s.replace(/\s+/g, ' ');

  s = s.replace(/∆7|Δ7|\^7/gi, 'maj7');

  s = s.replace(/\^/g, '');

  s = s.replace(/M7(?!\w)/gi, 'maj7');

  s = s.replace(/([A-G](?:#|b)?)-7\b/gi, '$1m7');

  s = s.replace(/\bmin\b/gi, 'm');

  s = s.replace(/\bdim\b/gi, 'dim');

  s = s.replace(/\bo7\b/gi, 'dim7');

  s = s.replace(/maj7\(#11\)/gi, 'maj7#11');

  s = s.replace(/maj7\(#5\)/gi, 'maj7#5');

  s = normalizeChordSymbol(s).replace(/\s+/g, '');

  return s;

}



function classifyToken(raw: string): {

  confidence: ParsedChordParseConfidence;

  normalizedSymbol: string;

  warningReason?: string;

} {

  const original = raw.trim();

  if (!original) {

    return { confidence: 'error', normalizedSymbol: '', warningReason: 'Empty chord token' };

  }

  if (NC_RE.test(original)) {

    return { confidence: 'ok', normalizedSymbol: 'NC' };

  }

  const normalized = normalizeUserChordSymbol(original);

  if (!ROOT_RE.test(normalized)) {

    return {

      confidence: 'error',

      normalizedSymbol: normalized || original,

      warningReason: `Could not parse '${original}' — check this symbol`,

    };

  }

  const collapsed = normalized.replace(/\s+/g, '');

  if (isChordSymbolRecognizedNormalized(collapsed) && isValidChordShapeNormalized(collapsed)) {

    return { confidence: 'ok', normalizedSymbol: collapsed };

  }

  const parsed = parseChordStructureFromNormalized(normalized);

  if (parsed && ROOT_RE.test(parsed.root)) {

    return {

      confidence: 'warning',

      normalizedSymbol: collapsed,

      warningReason: 'Unrecognized chord symbol — will pass through',

    };

  }

  return {

    confidence: 'error',

    normalizedSymbol: collapsed || original,

    warningReason: `Could not parse '${original}' — check this symbol`,

  };

}



function buildBeatLevelChords(symbols: readonly string[]): BeatLevelChord[] {

  const n = symbols.length;

  const segmentBeats = BEATS_PER_BAR / n;

  return symbols.map((sym, i) => {

    const classified = classifyToken(sym);

    return {

      beatIndex: i * segmentBeats,

      beatDuration: segmentBeats / BEATS_PER_BAR,

      originalSymbol: sym,

      normalizedSymbol: classified.normalizedSymbol,

      parseConfidence: classified.confidence,

      ...(classified.warningReason ? { warningReason: classified.warningReason } : {}),

    };

  });

}



function splitBarCells(raw: string): string[] {

  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = normalized.split('\n');

  const cells: string[] = [];

  for (const line of lines) {

    const trimmed = line.trim();

    if (!trimmed) continue;

    for (const part of trimmed.split(/[|,]/)) {

      const cell = part.trim();

      if (cell) cells.push(cell);

    }

  }

  return cells;

}



type CellParseEntry = {

  symbol: string;

  repeat: number;

  beatLevelSymbols?: string[];

};



function parseBarCell(cell: string): CellParseEntry[] {

  if (/\s+\/\s+/.test(cell)) {

    const beatParts = cell

      .split(/\s+\/\s+/)

      .map((p) => p.trim())

      .filter(Boolean);

    if (beatParts.length > 1) {

      return [{ symbol: beatParts[0]!, repeat: 1, beatLevelSymbols: beatParts }];

    }

  }



  const tokens = cell.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return [];

  const last = tokens[tokens.length - 1]!;

  const xSuffixOnly = tokens.length >= 2 ? last.match(/^x\s*(\d+)\s*$/i) : null;

  if (xSuffixOnly) {

    const sym = tokens[tokens.length - 2]!.trim();

    const repeat = Math.max(1, Math.floor(Number(xSuffixOnly[1])));

    const leading = tokens.slice(0, -2);

    const out = leading.map((symbol) => ({ symbol, repeat: 1 }));

    out.push({ symbol: sym, repeat });

    return out;

  }

  const xMatch = last.match(/^(.+?)\s*x\s*(\d+)\s*$/i);

  if (xMatch) {

    const sym = xMatch[1]!.trim();

    const repeat = Math.max(1, Math.floor(Number(xMatch[2])));

    tokens[tokens.length - 1] = sym;

    const out = tokens.map((symbol) => ({ symbol, repeat: 1 }));

    out[out.length - 1]!.repeat = repeat;

    return out;

  }

  return tokens.map((symbol) => ({ symbol, repeat: 1 }));

}



function pushParsedBar(

  timeline: ParsedChordTimeline,

  entry: CellParseEntry,

  classified: ReturnType<typeof classifyToken>,

): void {

  if (entry.beatLevelSymbols && entry.beatLevelSymbols.length > 1) {

    const beatLevelChords = buildBeatLevelChords(entry.beatLevelSymbols);

    const worst = beatLevelChords.reduce<ParsedChordParseConfidence>((acc, b) => {

      if (b.parseConfidence === 'error') return 'error';

      if (acc === 'error') return 'error';

      if (b.parseConfidence === 'warning') return 'warning';

      return acc;

    }, 'ok');

    timeline.push({

      barIndex: timeline.length + 1,

      originalSymbol: entry.beatLevelSymbols[0]!,

      normalizedSymbol: beatLevelChords[0]!.normalizedSymbol,

      source: 'user',

      parseConfidence: worst,

      beatLevelChords,

      ...(beatLevelChords.some((b) => b.warningReason)

        ? { warningReason: beatLevelChords.find((b) => b.warningReason)?.warningReason }

        : {}),

    });

    return;

  }

  timeline.push({

    barIndex: timeline.length + 1,

    originalSymbol: entry.symbol,

    normalizedSymbol: classified.normalizedSymbol,

    source: 'user',

    parseConfidence: classified.confidence,

    ...(classified.warningReason ? { warningReason: classified.warningReason } : {}),

  });

}



/** Light parse — chord bar count only (paste). */

export function lightCountUserChordBars(raw: string): number {

  if (!raw.trim()) return 0;

  let count = 0;

  for (const cell of splitBarCells(raw)) {

    for (const entry of parseBarCell(cell)) {

      count += entry.repeat;

    }

  }

  return count;

}



export function parseUserChordInput(raw: string): ParseUserChordInputResult {

  const input = raw ?? '';

  const tokens: ParsedChordTokenSpan[] = [];

  const timeline: ParsedChordTimeline = [];

  if (!input.trim()) {

    return { timeline, tokens, chordCount: 0, hasErrors: true, hasWarnings: false };

  }



  let cursor = 0;

  for (const cell of splitBarCells(input)) {

    const cellStart = input.indexOf(cell, cursor);

    cursor = cellStart >= 0 ? cellStart + cell.length : cursor + cell.length;

    for (const entry of parseBarCell(cell)) {

      if (entry.beatLevelSymbols) {

        for (const sym of entry.beatLevelSymbols) {

          const tokenStart = input.indexOf(sym, Math.max(0, cellStart));

          const start = tokenStart >= 0 ? tokenStart : cellStart;

          const classified = classifyToken(sym);

          tokens.push({

            token: sym,

            start,

            end: start + sym.length,

            confidence: classified.confidence,

            warningReason: classified.warningReason,

          });

        }

        pushParsedBar(timeline, entry, classifyToken(entry.beatLevelSymbols[0]!));

        continue;

      }

      const tokenStart = input.indexOf(entry.symbol, Math.max(0, cellStart));

      const start = tokenStart >= 0 ? tokenStart : cellStart;

      const end = start + entry.symbol.length;

      const classified = classifyToken(entry.symbol);

      tokens.push({

        token: entry.symbol,

        start,

        end,

        confidence: classified.confidence,

        warningReason: classified.warningReason,

      });

      for (let i = 0; i < entry.repeat; i++) {

        pushParsedBar(timeline, { symbol: entry.symbol, repeat: 1 }, classified);

      }

    }

  }



  const hasErrors = timeline.some((b) => b.parseConfidence === 'error');

  const hasWarnings = timeline.some((b) => b.parseConfidence === 'warning');

  return {

    timeline,

    tokens,

    chordCount: timeline.length,

    hasErrors,

    hasWarnings,

  };

}



export function detectBarCountMismatch(chordCount: number, barCount: number): BarCountMismatch {

  if (chordCount === barCount) return { kind: 'match', chordCount, barCount };

  if (chordCount < barCount) return { kind: 'fewer', chordCount, barCount };

  return { kind: 'more', chordCount, barCount };

}



function builtinChordForBar(context: CompositionContext, barIndex: number): string {

  const saved = {

    userChordTimeline: context.generationMetadata?.userChordTimeline,

    parsedCustomProgressionBars: context.generationMetadata?.parsedCustomProgressionBars,

    lockedHarmonyBarsRaw: context.lockedHarmonyBarsRaw,

    harmonySource: context.generationMetadata?.harmonySource,

  };

  try {

    if (context.generationMetadata) {

      delete context.generationMetadata.userChordTimeline;

      delete context.generationMetadata.parsedCustomProgressionBars;

      delete context.generationMetadata.harmonySource;

    }

    context.lockedHarmonyBarsRaw = undefined;

    return getChordForBar(barIndex, context);

  } finally {

    if (context.generationMetadata) {

      context.generationMetadata.userChordTimeline = saved.userChordTimeline;

      context.generationMetadata.parsedCustomProgressionBars = saved.parsedCustomProgressionBars;

      context.generationMetadata.harmonySource = saved.harmonySource;

    }

    context.lockedHarmonyBarsRaw = saved.lockedHarmonyBarsRaw;

  }

}



function mergedBarFromParsed(u: ParsedChordBar, barIndex: number): MergedChordTimelineBar {

  return {

    barIndex,

    originalSymbol: u.originalSymbol,

    normalizedSymbol: u.normalizedSymbol,

    source: 'user',

    parseConfidence: u.parseConfidence,

    warningReason: u.warningReason,

    ...(u.beatLevelChords ? { beatLevelChords: u.beatLevelChords } : {}),

  };

}



function mergeStretch(parsed: ParsedChordTimeline, totalBars: number): MergedChordTimelineBar[] {

  const n = parsed.length;

  const bars: MergedChordTimelineBar[] = [];

  for (let b = 1; b <= totalBars; b++) {

    const chordIdx = Math.min(n - 1, Math.floor(((b - 1) * n) / totalBars));

    bars.push(mergedBarFromParsed(parsed[chordIdx]!, b));

  }

  return bars;

}



function compressParsedTimeline(parsed: ParsedChordTimeline): ParsedChordTimeline {

  const out: ParsedChordTimeline = [];

  for (const p of parsed) {

    const last = out[out.length - 1];

    if (last && last.normalizedSymbol === p.normalizedSymbol && !last.beatLevelChords && !p.beatLevelChords) {

      continue;

    }

    out.push({ ...p, barIndex: out.length + 1 });

  }

  return out;

}



function mergeCompress(

  parsed: ParsedChordTimeline,

  totalBars: number,

): { bars: MergedChordTimelineBar[]; truncated: boolean } {

  let compressed = compressParsedTimeline(parsed);

  let truncated = false;

  if (compressed.length > totalBars) {

    truncated = true;

    compressed = compressed.slice(0, totalBars);

  }

  const bars = compressed.map((u, i) => {

    const merged = mergedBarFromParsed(u, i + 1);

    if (truncated && i === totalBars - 1) {

      merged.warningReason = merged.warningReason

        ? `${merged.warningReason}; extra chords truncated`

        : 'Extra chords truncated to fit bar count.';

      if (merged.parseConfidence === 'ok') merged.parseConfidence = 'warning';

    }

    return merged;

  });

  return { bars, truncated };

}



export function mergeUserChordTimelineToBarCount(

  parsed: ParsedChordTimeline,

  totalBars: number,

  resolution: SqToBbChordMismatchResolution | null,

  context: CompositionContext,

): { ok: true; bars: MergedChordTimelineBar[]; source: SqToBbChordTimelineSource } | { ok: false; error: string } {

  if (parsed.some((b) => b.parseConfidence === 'error')) {

    return { ok: false, error: 'Chord progression has parse errors.' };

  }

  const mismatch = detectBarCountMismatch(parsed.length, totalBars);

  if (mismatch.kind === 'more' && resolution !== 'compress') {

    return {

      ok: false,

      error: `${mismatch.chordCount} chords found for ${mismatch.barCount} bars. Extra chords are not applied.`,

    };

  }

  if (mismatch.kind === 'fewer' && !resolution) {

    return {

      ok: false,

      error: `${mismatch.chordCount} chords found for ${mismatch.barCount} bars. Choose how to fill the timeline.`,

    };

  }



  const userSymbols = parsed.map((b) => b.normalizedSymbol);

  const bars: MergedChordTimelineBar[] = [];



  if (mismatch.kind === 'match') {

    for (let i = 0; i < totalBars; i++) {

      bars.push(mergedBarFromParsed(parsed[i]!, i + 1));

    }

    return { ok: true, bars, source: 'user' };

  }



  if (mismatch.kind === 'fewer' && resolution === 'stretch') {

    return { ok: true, bars: mergeStretch(parsed, totalBars), source: 'user' };

  }



  if (mismatch.kind === 'fewer' && resolution === 'repeat') {

    for (let b = 1; b <= totalBars; b++) {

      const u = parsed[(b - 1) % userSymbols.length]!;

      bars.push(mergedBarFromParsed(u, b));

    }

    return { ok: true, bars, source: 'user' };

  }



  if (mismatch.kind === 'fewer' && resolution === 'fill_internal') {

    let userIdx = 0;

    for (let b = 1; b <= totalBars; b++) {

      if (userIdx < parsed.length) {

        bars.push(mergedBarFromParsed(parsed[userIdx]!, b));

        userIdx++;

      } else {

        const sym = normalizeUserChordSymbol(builtinChordForBar(context, b));

        bars.push({

          barIndex: b,

          originalSymbol: sym,

          normalizedSymbol: sym,

          source: 'internal',

        });

      }

    }

    return { ok: true, bars, source: 'mixed' };

  }



  if (mismatch.kind === 'more' && resolution === 'compress') {

    const { bars: compressedBars } = mergeCompress(parsed, totalBars);

    return { ok: true, bars: compressedBars, source: 'user' };

  }



  return { ok: false, error: 'Unable to merge chord timeline.' };

}



export function canGenerateWithUserChords(

  raw: string,

  barCount: number,

  mode: SqToBbChordSourceMode | undefined,

  resolution: SqToBbChordMismatchResolution | null | undefined,

): { ok: true } | { ok: false; message: string; mismatch?: BarCountMismatch } {

  if (mode !== 'use_user_chords') return { ok: true };

  const trimmed = raw.trim();

  if (!trimmed) return { ok: false, message: 'Enter a chord progression or switch to Generate harmony.' };

  const parsed = parseUserChordInput(trimmed);

  if (parsed.hasErrors) {

    const bad = parsed.tokens.find((t) => t.confidence === 'error');

    return {

      ok: false,

      message: bad?.warningReason ?? 'Fix chord symbols before generating.',

    };

  }

  const mismatch = detectBarCountMismatch(parsed.chordCount, barCount);

  if (mismatch.kind === 'more' && resolution !== 'compress') {

    return {

      ok: false,

      message: `${mismatch.chordCount} chords found for ${mismatch.barCount} bars. Extra chords are not applied. Edit input or increase bar count.`,

      mismatch,

    };

  }

  if (mismatch.kind === 'fewer' && !resolution) {

    return {

      ok: false,

      message: `${mismatch.chordCount} chords found for ${mismatch.barCount} bars. Choose how to fill the timeline.`,

      mismatch,

    };

  }

  return { ok: true };

}



export function wireSqToBbUserChordTimeline(

  context: CompositionContext,

  mode: SqToBbChordSourceMode | undefined,

  raw: string | null | undefined,

  totalBars: number,

  resolution: SqToBbChordMismatchResolution | null | undefined,

): { ok: true } | { ok: false; error: string } {

  const gen = context.generationMetadata ?? {};

  context.generationMetadata = gen;



  if (mode !== 'use_user_chords' || !raw?.trim()) {

    gen.userChordTimeline = null;

    gen.chordTimelineSource = 'internal';

    delete gen.parsedCustomProgressionBars;

    delete gen.harmonySource;

    context.lockedHarmonyBarsRaw = undefined;

    return { ok: true };

  }



  const parsed = parseUserChordInput(raw);

  if (parsed.hasErrors) {

    const bad = parsed.tokens.find((t) => t.confidence === 'error');

    return { ok: false, error: bad?.warningReason ?? 'Chord progression has parse errors.' };

  }



  const merged = mergeUserChordTimelineToBarCount(parsed.timeline, totalBars, resolution ?? null, context);

  if (!merged.ok) return { ok: false, error: merged.error };



  const symbols = merged.bars.map((b) => b.normalizedSymbol);

  gen.userChordTimeline = merged.bars;

  gen.chordTimelineSource = merged.source;

  gen.parsedCustomProgressionBars = symbols;

  gen.harmonySource = 'custom';

  gen.harmonyModeRequested = 'custom';

  context.lockedHarmonyBarsRaw = [...symbols];

  return { ok: true };

}


