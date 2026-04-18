/**
 * STYLE_SOPHISTICATED_POP v1 — deterministic chord-symbol dressing on locked progressions.
 * Small extensions (7ths/9ths), section-aware intensity; no functional rewrites that depend on key analysis.
 */

import type { CompositionContext } from '../compositionContext';
import type { GenerationMetadata } from '../compositionContext';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { buildHarmonyPlanFromBars, buildChordSymbolPlanFromBars } from '../harmony/chordProgressionParser';
import { buildLockedHarmonyBarContracts, assertLockedHarmonyContractsToneParity } from '../harmony/harmonyBarContract';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  isValidChordShapeNormalized,
  normalizeChordSymbol,
  normalizeLeadSheetChordSpelling,
} from '../../../core/leadSheetChordNormalize';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

export type SophisticatedPopSectionKind = 'A' | 'A_prime' | 'B' | 'return' | 'single';

export function sectionKindForBar(barIndex1: number, totalBars: number): SophisticatedPopSectionKind {
  if (totalBars <= 8) return 'single';
  if (totalBars === 16) return barIndex1 <= 8 ? 'A' : 'B';
  if (totalBars === 24) {
    if (barIndex1 <= 8) return 'A';
    if (barIndex1 <= 16) return 'B';
    return 'return';
  }
  if (totalBars >= 32) {
    if (barIndex1 <= 8) return 'A';
    if (barIndex1 <= 16) return 'A_prime';
    if (barIndex1 <= 24) return 'B';
    return 'return';
  }
  return barIndex1 <= totalBars / 2 ? 'A' : 'B';
}

/** 0 = triad-level / minimal symbol, 1 = seventh family, 2 = ninth or richer. */
export function chordColourDepth(symbol: string): number {
  const h = parseChordSymbol(symbol).harmonyPart;
  const rest = h.replace(/^([A-G][#b]?)/i, '').trim();
  const low = rest.toLowerCase();
  if (!rest) return 0;
  if (/^(m|min|dim|aug)(?!aj)/i.test(rest) && !/m7|m9|m11/.test(low)) return 0;
  if (/maj9|m9|add9|6\/9|13sus|13|11|maj7#11|#11/i.test(low)) return 2;
  if (/maj7|m7|7alt|7|Δ|maj|ø|m7b5|sus/i.test(low)) return 1;
  return 1;
}

function sectionIntensity(kind: SophisticatedPopSectionKind): number {
  switch (kind) {
    case 'A':
      return 0.38;
    case 'A_prime':
      return 0.48;
    case 'B':
      return 0.92;
    case 'return':
      return 0.62;
    default:
      return 0.5;
  }
}

function validateChord(out: string): boolean {
  const t = normalizeChordSymbol(out.trim());
  return isValidChordShapeNormalized(t);
}

/**
 * Dress one chord for Sophisticated Pop v1. Preserves slash bass.
 * Returns updated chord + whether the symbol changed.
 */
export function dressSophisticatedPopChordForBar(args: {
  fullChord: string;
  barIndex1: number;
  totalBars: number;
  seed: number;
}): { chord: string; changed: boolean; depthAfter: number } {
  const { fullChord, barIndex1, totalBars, seed } = args;
  const p = parseChordSymbol(fullChord);
  const slash = fullChord.includes('/') ? fullChord.slice(fullChord.indexOf('/')) : '';
  let h = p.harmonyPart.trim();
  const kind = sectionKindForBar(barIndex1, totalBars);
  const intensity = sectionIntensity(kind);
  const salt = barIndex1 * 7919 + totalBars * 31;

  const rootRe = /^([A-G][#b]?)/;
  const rm = h.match(rootRe);
  if (!rm) {
    return { chord: fullChord, changed: false, depthAfter: chordColourDepth(fullChord) };
  }
  const root = rm[1];
  const rest = h.slice(rm[0].length).trim();
  const restLow = rest.toLowerCase();

  let candidate: string | null = null;

  // Bare major triad (no quality / only major triad spelling).
  if (rest === '') {
    const u = seededUnit(seed, 90210, salt);
    if (u < intensity * 0.22) candidate = `${root}maj9`;
    else if (u < intensity * 0.62) candidate = `${root}maj7`;
  }
  // Minor triad (Am, F#m) — no 7 in symbol yet.
  else if (/^m(in)?$/i.test(rest)) {
    const u = seededUnit(seed, 90211, salt);
    if (u < intensity * 0.28) candidate = `${root}m9`;
    else if (u < intensity * 0.72) candidate = `${root}m7`;
  }
  // Dominant 7 — nudge toward richer colour in brighter sections (not full jazz density).
  else if (/^7$/.test(restLow) || restLow === '7alt') {
    const u = seededUnit(seed, 90212, salt);
    if (kind === 'B' && u < 0.35) candidate = `${root}13`;
    else if (u < intensity * 0.25) candidate = `${root}9`;
  }

  if (candidate && validateChord(candidate + slash)) {
    const out = normalizeLeadSheetChordSpelling(candidate + slash).replace(/\s+/g, ' ').trim();
    return { chord: out, changed: true, depthAfter: chordColourDepth(out) };
  }

  return { chord: fullChord, changed: false, depthAfter: chordColourDepth(fullChord) };
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Mutates `context`: dresses `lockedHarmonyBarsRaw`, rebuilds harmony plans + contracts.
 * No-op unless `styleProfile === 'STYLE_SOPHISTICATED_POP'` and locked bars exist.
 */
export function applySophisticatedPopHarmonyDressing(context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata;
  if (!md || md.styleProfile !== 'STYLE_SOPHISTICATED_POP') return;
  /** Bacharach uses its own harmony dressing pass; Sophisticated Pop chord extensions would stack awkwardly. */
  if (normalizeSongwriterStyleKey(md.songwriterStyleId ?? '') === 'bacharach') return;
  const bars = context.lockedHarmonyBarsRaw;
  if (!bars?.length) return;

  const totalBars = bars.length;
  const depthsAfter: number[] = [];
  const depthsA: number[] = [];
  const depthsB: number[] = [];
  let barsChanged = 0;
  let extensionAdds = 0;

  const newBars = bars.map((c, i) => {
    const barIndex1 = i + 1;
    const before = chordColourDepth(c);
    const r = dressSophisticatedPopChordForBar({
      fullChord: c,
      barIndex1,
      totalBars,
      seed: context.seed,
    });
    if (r.changed) {
      barsChanged++;
      if (r.depthAfter > before) extensionAdds++;
    }
    depthsAfter.push(r.depthAfter);
    const sk = sectionKindForBar(barIndex1, totalBars);
    if (sk === 'A' || sk === 'A_prime' || sk === 'single') depthsA.push(r.depthAfter);
    if (sk === 'B') depthsB.push(r.depthAfter);
    return r.chord;
  });

  context.lockedHarmonyBarsRaw = newBars;
  context.harmony = buildHarmonyPlanFromBars(newBars);
  context.chordSymbolPlan = buildChordSymbolPlanFromBars(newBars);
  context.lockedHarmonyBarContracts = buildLockedHarmonyBarContracts(newBars);
  assertLockedHarmonyContractsToneParity(context.lockedHarmonyBarContracts);

  /** Echo final progression for manifests / eval (builtin or custom). */
  md.customChordProgressionSummary = newBars.join(' | ');
  md.parsedCustomProgressionBars = [...newBars];

  const meanA = mean(depthsA.length ? depthsA : depthsAfter);
  const meanB = mean(depthsB.length ? depthsB : depthsAfter);
  const sectionContrastDelta = meanB - meanA;

  md.sophisticatedPopHarmonyDiagnostics = {
    barsConsidered: totalBars,
    barsChanged,
    meanColourDepth: mean(depthsAfter),
    meanColourDepthSectionA: meanA,
    meanColourDepthSectionB: meanB,
    sectionContrastDelta,
    extensionAdds,
  };
}
