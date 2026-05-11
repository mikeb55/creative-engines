/**
 * Alban Berg — twelve-tone row modules, derived-row vocabulary, formal climax hooks (Song Mode / duo golden-path).
 * Lead-sheet symbols only — receipts **`ab:*`**.
 */

import type { BergStyleMode } from '../style/berg/bergStyleModes';
import {
  deriveTwelveToneRows,
  ic16WeightedRowScore,
  indexSharedTrichords,
  selectPreferredTransform,
} from '../style/berg/bergRowEngine';
import { scheduleClimax, tagStructuralSilences } from '../style/berg/bergFormModules';
import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function seededPermutation12(seed: number): number[] {
  const a = Array.from({ length: 12 }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = 11; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function enrichAlteredAtClimax(
  symbol: string,
  climaxBar: number,
  bar: number,
  seed: number
): string {
  if (bar !== climaxBar) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  const root = m?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 991001);
  if (u < 0.55) return `${root}7alt${slash}`;
  return `${root}maj7#11${slash}`;
}

function applySparseMinorThirdColour(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 991101) >= 0.18) continue;
    const sym = out[b - 1]!;
    const hp = parseChordSymbol(sym).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    const root = m?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    out[b - 1] = `${root}m11${slash}`;
    receipts.push(`ab:minor_eleventh_colour@bar${b}`);
  }
}

export function isSongwriterBerg(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'berg' } {
  return genMeta?.songwriterStyleId === 'berg';
}

export interface BergHarmonyAccumulator {
  barsConsidered: number;
  alteredTouches: number;
  chromaticTouches: number;
}

export function createBergHarmonyAccumulator(): BergHarmonyAccumulator {
  return { barsConsidered: 0, alteredTouches: 0, chromaticTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: BergHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/alt|7alt|#11|maj7#11/.test(t)) acc.alteredTouches++;
  if (/m11|dim|aug|o7|ø/.test(t)) acc.chromaticTouches++;
}

export function accumulateBergHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BergHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function finalizeBergMetadata(metadata: GenerationMetadata, acc: BergHarmonyAccumulator): void {
  const flat = [...(metadata.bergDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'berg' as const,
    barsConsidered: acc.barsConsidered,
    alteredTouches: acc.alteredTouches,
    chromaticTouches: acc.chromaticTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Berg (slice): altered≈${acc.alteredTouches}`,
    `chromatic≈${acc.chromaticTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.bergDiagnostics = { ...d };
  metadata.bergSliceReceipt = receipt;
}

export function precomputeBergEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const mode: BergStyleMode = genMeta.bergStyleMode ?? 'middle_berg';
  genMeta.bergStyleMode = mode;

  const primeRow = seededPermutation12(seed ^ 0xbad5eed);
  const derived = deriveTwelveToneRows(primeRow, 0);
  const preferred = selectPreferredTransform(derived);
  const tri = indexSharedTrichords({
    P: derived.prime,
    R: derived.retrograde,
    I: derived.inverse,
    RI: derived.retrogradeInverse,
  });

  genMeta.bergRowPrimePcs = [...derived.prime];
  genMeta.bergPreferredTransform = preferred.name;
  genMeta.bergRowIc16Score = ic16WeightedRowScore(preferred.row);
  genMeta.bergSharedTrichordIndex = tri.slice(0, 12);

  const clim = scheduleClimax(tb, seed);
  genMeta.bergClimaxPlan = clim;
  genMeta.bergStructuralSilences = tagStructuralSilences(tb, seed, 4);

  const receipts: string[] = [];
  receipts.push(`ab:row_${preferred.name.toLowerCase()}@ic16=${genMeta.bergRowIc16Score.toFixed(2)}`);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = enrichAlteredAtClimax(sym, clim.climaxBar, b, seed);
    raw.push(sym);
  }

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);
  applySparseMinorThirdColour(out, seed, receipts, tb, context);

  genMeta.bergEffectiveHarmonyBars = out;
  genMeta.bergDeviceReceipts = receipts;
}
