/**
 * V82b+c - Fake-book harmony to 6th/m6 anchor.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { importTimelineToLockedHarmony } from '../import/importTimelineAdapters';
import type { MosaicImportTimeline } from '../import/mosaicImportTimeline';
import { dim7RootPcForSixthRoot, sixthDimPair } from './scaleOfChords';
import type { SixthDimPair } from './types';

const ROOT_AT_START = /^([A-G](?:#|b)?)/i;

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function normaliseFakeBookSymbol(symbol: string): string {
  return normalizeChordSymbol(String(symbol || '').trim());
}

export function buildHarmonyBarsFromSources(
  context: CompositionContext,
  importTimeline?: MosaicImportTimeline
): string[] {
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb) return locked.map((s) => normaliseFakeBookSymbol(s));
  const parsed = context.generationMetadata?.parsedCustomProgressionBars;
  if (parsed && parsed.length === tb) return parsed.map((s) => normaliseFakeBookSymbol(s));
  if (importTimeline) {
    const fromIr = importTimelineToLockedHarmony(importTimeline);
    const slice = fromIr.length >= tb ? fromIr.slice(0, tb) : fromIr;
    if (slice.length > 0) return slice.map((s) => normaliseFakeBookSymbol(s));
  }
  const hc = context.harmonyContext;
  if (hc && hc.bars.length === tb) return hc.bars.map((s) => normaliseFakeBookSymbol(s));
  throw new Error(
    `buildHarmonyBarsFromSources: no authoritative harmony covering bars 1-${tb}`
  );
}

export function readHarmonyBarSymbol(
  context: CompositionContext,
  barIndex: number,
  importTimeline?: MosaicImportTimeline
): string {
  const bars = buildHarmonyBarsFromSources(context, importTimeline);
  if (barIndex < 1 || barIndex > bars.length) {
    throw new Error(`readHarmonyBarSymbol: bar ${barIndex} out of range 1-${bars.length}`);
  }
  return bars[barIndex - 1] ?? '';
}

function isDiminishedSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bdim7\b|°7|o7/.test(hp) || (/\bdim\b|°/.test(hp) && /7/.test(hp));
}

function inferSixthQuality(symbol: string): '6' | 'm6' {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return '6';
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  if (/^m6\b/.test(rest)) return 'm6';
  if (/^m(?!aj)/.test(rest)) return 'm6';
  if (/^m\/maj7/.test(rest)) return 'm6';
  if (/\bm7|min7|min9|m9\b|m11|m13|ø|dim/.test(rest)) return 'm6';
  if (/^6\b|maj6/.test(rest)) return '6';
  return '6';
}

export function reinterpretFakeBookSymbol(symbol: string): SixthDimPair | undefined {
  const norm = normaliseFakeBookSymbol(symbol);
  if (!norm) return undefined;
  const rootPc = harmonyRootPc(norm);
  if (rootPc === undefined) return undefined;
  if (isDiminishedSeventh(norm)) {
    return sixthDimPair((rootPc + 1) % 12, inferSixthQuality(norm));
  }
  return {
    sixthRootPc: rootPc,
    sixthQuality: inferSixthQuality(norm),
    dim7RootPc: dim7RootPcForSixthRoot(rootPc),
  };
}

export function reinterpretHarmonyBars(
  context: CompositionContext,
  importTimeline?: MosaicImportTimeline
): SixthDimPair[] {
  const bars = buildHarmonyBarsFromSources(context, importTimeline);
  return bars.map((sym) => reinterpretFakeBookSymbol(sym)).filter((a): a is SixthDimPair => a != null);
}