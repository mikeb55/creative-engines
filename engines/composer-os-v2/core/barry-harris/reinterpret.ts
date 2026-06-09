/**
 * V82b+c / V80j - Fake-book harmony to 6th/m6 anchor.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { importTimelineToLockedHarmony } from '../import/importTimelineAdapters';
import type { MosaicImportTimeline } from '../import/mosaicImportTimeline';
import { dim7RootPcForSixthRoot, sixthDimPair } from './scaleOfChords';
import type { SixthDimPair } from './types';

const ROOT_AT_START = /^([A-G](?:#|b)?)/i;

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

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

/** Half-dim / m7b5 — inverse of identities m6_m7b5 (m6 root + 3 semitones). */
function isHalfDiminished(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bm7b5\b|m7♭5|ø7|ø|half.?dim|hdim/.test(hp);
}

/** Maj9 — inverse of identities six_on_five_maj9 (6 root − 7 semitones). */
function isMajorNinth(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bmaj9\b|ma9\b|maj9\b|△9/.test(hp);
}

/** Alt dominant family — inverse of identities m6_on_flat2_dom7alt (m6 root − 1 semitone). */
function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  return /^7($|[^a-z])/.test(rest) || rest === '7';
}

function hasAlteredRootAccidental(symbol: string): boolean {
  const m = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START);
  return !!(m?.[1] && /[#b]/i.test(m[1]));
}

function isAltDominantFamily(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/7alt|7#9|7b9|7♭9|7#11|7♯11|7b13|7♭13/.test(hp)) return true;
  return isPlainDominantSeventh(symbol) && hasAlteredRootAccidental(symbol);
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
    return sixthDimPair(mod12(rootPc + 1), inferSixthQuality(norm));
  }

  if (isHalfDiminished(norm)) {
    return sixthDimPair(mod12(rootPc + 3), 'm6');
  }

  if (isMajorNinth(norm)) {
    return sixthDimPair(mod12(rootPc + 7), '6');
  }

  if (isAltDominantFamily(norm)) {
    return sixthDimPair(mod12(rootPc + 1), 'm6');
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
