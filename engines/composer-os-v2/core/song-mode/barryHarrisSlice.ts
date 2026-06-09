/**
 * Barry Harris — bebop / sixth–diminished Song Mode / duo golden-path **harmony** slice.
 * Layered on locked harmony: cluster-safe voicing labels, tritone subs, sixth–dim colour,
 * bebop dominant colour, root-position bias, cadential ii–V prep — receipts `bh:*`.
 *
 * Melodic bebop scale / voice-leading nudges remain in `style-modules/barry-harris/moduleApply` (post-score).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { dim7RootPcForSixthRoot, stashBarryHarrisChordMelodyFoundation } from '../barry-harris';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function phrasePositionFromBar(bar: number): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

export function isSongwriterBarryHarris(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'barry_harris' } {
  return genMeta?.songwriterStyleId === 'barry_harris';
}

export interface BarryHarrisHarmonyAccumulator {
  barsConsidered: number;
  sixthChordTouches: number;
  diminishedTouches: number;
  dominantTouches: number;
}

export function createBarryHarrisHarmonyAccumulator(): BarryHarrisHarmonyAccumulator {
  return {
    barsConsidered: 0,
    sixthChordTouches: 0,
    diminishedTouches: 0,
    dominantTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BarryHarrisHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  const compact = hp.replace(/\s/g, '');
  if (/\b(dim|°)/.test(t) || /dim7/.test(t)) acc.diminishedTouches++;
  if (/^[a-g][#b]?6([^0-9]|\/|$)/i.test(compact) || /\bmaj6\b/.test(t)) acc.sixthChordTouches++;
  if (looksPlainDominantSeventh(c)) acc.dominantTouches++;
}

export function accumulateBarryHarrisHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BarryHarrisHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BarryHarrisAntiElaborationGuards {
  clusterVoicingReduced: number;
  slashFlattenedToRoot: number;
  denseAlterationReduced: number;
}

/** Strip dense cluster / poly-alteration symbols toward 3–4 note bebop-functional spellings. */
function sanitizeBarryHarrisSymbol(symbol: string, guards: BarryHarrisAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const slash = s.includes('/') ? s.slice(s.indexOf('/')) : '';
  const tl = hp.toLowerCase();

  if (/add11|#11.*13|13.*\(.*#11|maj9\(.*#11|\(13.*11\)/.test(tl)) {
    guards.clusterVoicingReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    const tail = hp.slice(root.length);
    if (/maj|Δ/.test(tail)) return `${root}maj7${slash}`;
    if (/m(?!aj)/.test(tail)) return `${root}m7${slash}`;
    return `${root}7${slash}`;
  }

  if (/alt\b|7\(.*alt|7\(.*b13.*#9/.test(tl)) {
    guards.denseAlterationReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    return `${root}7b9${slash}`;
  }

  return s;
}

function tritoneSubDominantSymbol(symbol: string): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const subPc = (r + 6) % 12;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  return `${pitchClassToSharpName(subPc)}7${slash}`;
}

/** Prefer root position or first inversion only: drop slash when bass is chordal inner voice (3rd/5th). */
function maybeFlattenSlashToRoot(symbol: string, seed: number, bar: number, guards: BarryHarrisAntiElaborationGuards): string {
  if (!symbol.includes('/')) return symbol;
  const root = harmonyRootPc(symbol);
  const after = symbol.split('/')[1]?.trim();
  if (root === undefined || !after) return symbol;
  const bassPc = noteNameToPitchClass(after.match(ROOT_AT_START)?.[1] ?? '');
  if (bassPc === undefined) return symbol;
  const third = (root + 4) % 12;
  const fifth = (root + 7) % 12;
  const isThirdOrFifth = bassPc === third || bassPc === fifth;
  if (isThirdOrFifth && seededUnit(seed, bar, 883301) < 0.42) {
    guards.slashFlattenedToRoot++;
    return symbol.slice(0, symbol.indexOf('/'));
  }
  return symbol;
}

function majSymbolToSixth(symbol: string): string | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  if (!/maj7|maj9|Δ|\bmaj\b/.test(tl)) return undefined;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/m|dim|sus|ø/.test(rest)) return undefined;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  return `${root}6${slash}`;
}

function applyBebopDominantColourPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const sym = out[b - 1]!;
    if (!looksPlainDominantSeventh(sym)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (!/\b9\b|maj9|add9|11|13/.test(tl)) continue;
    if (seededUnit(seed, b, 883401) >= 0.38) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
    out[b - 1] = `${root}7b9${slash}`;
    receipts.push(`bh:bebop_dom_colour@bar${b}`);
  }
}

function applyTritoneSubstitutionPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const v = out[b - 1]!;
    const i = out[b]!;
    if (!looksPlainDominantSeventh(v)) continue;
    if (harmonyRootPc(i) !== tonicPc) continue;
    if (phrasePositionFromBar(b + 1) !== 'phraseFinal' && seededUnit(seed, b, 883501) > 0.55) continue;
    if (seededUnit(seed, b, 883502) >= 0.34) continue;
    out[b - 1] = tritoneSubDominantSymbol(v);
    receipts.push(`bh:tritone_sub@bar${b}`);
  }
}

function applySixthDiminishedColourPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseMiddle') continue;
    const sym = out[b - 1]!;
    const sixth = majSymbolToSixth(sym);
    if (!sixth) continue;
    if (seededUnit(seed, b, 883601) >= 0.26) continue;
    out[b - 1] = sixth;
    receipts.push(`bh:sixth_dim_tonic@bar${b}`);
    const next = b < tb ? out[b] : '';
    const dimRootPc = dim7RootPcForSixthRoot(harmonyRootPc(sixth)!);
    if (next && b < tb && !isProtectedBar(b + 1, context) && seededUnit(seed, b, 883602) < 0.18) {
      out[b] = `${pitchClassToSharpName(dimRootPc)}dim7`;
      receipts.push(`bh:sixth_dim_pass@bar${b + 1}`);
    }
  }
}

function applyCadentialTwoFivePrepPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const iiPc = (tonicPc + 2) % 12;
  for (let b = 3; b <= tb; b++) {
    const prevTonicBar = b - 2;
    if (isProtectedBar(prevTonicBar, context)) continue;
    const a = out[b - 3]!;
    const v = out[b - 2]!;
    const iCh = out[b - 1]!;
    if (harmonyRootPc(iCh) !== tonicPc) continue;
    if (!looksPlainDominantSeventh(v)) continue;
    if (harmonyRootPc(a) !== tonicPc) continue;
    const aHp = parseChordSymbol(a).harmonyPart.toLowerCase();
    if (/\bm7\b|min7|m9/.test(aHp) && harmonyRootPc(a) === iiPc) continue;
    if (seededUnit(seed, b, 883701) >= 0.28) continue;
    out[b - 3] = `${pitchClassToSharpName(iiPc)}m7`;
    receipts.push(`bh:ii_V_cadence@bar${b - 2}`);
  }
}

/**
 * Precompute effective one chord per bar after Barry Harris slice devices (primary `barry_harris` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeBarryHarrisEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: BarryHarrisAntiElaborationGuards = {
    clusterVoicingReduced: 0,
    slashFlattenedToRoot: 0,
    denseAlterationReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = sanitizeBarryHarrisSymbol(resolveBarSymbol(context, b).symbol, guards);
    sym = maybeFlattenSlashToRoot(sym, seed, b, guards);
    raw.push(sym);
  }

  const out = [...raw];

  applyBebopDominantColourPass(out, seed, receipts, tb, context);
  applyTritoneSubstitutionPass(out, tonicPc, seed, receipts, tb, context);
  applySixthDiminishedColourPass(out, seed, receipts, tb, context);
  applyCadentialTwoFivePrepPass(out, tonicPc, seed, receipts, tb, context);

  genMeta.barryHarrisEffectiveHarmonyBars = out;
  genMeta.barryHarrisDeviceReceipts = receipts;
  genMeta.barryHarrisAntiElaborationGuards = guards;

  if (hasAuthoritativeHarmonySpineForChordMelody(context)) {
    try {
      stashBarryHarrisChordMelodyFoundation(context);
    } catch {
      // Locked/import spine required for section tonic map — skip when unavailable.
    }
  }
}

function hasAuthoritativeHarmonySpineForChordMelody(context: CompositionContext): boolean {
  const tb = context.form.totalBars;
  if (context.lockedHarmonyBarsRaw?.length === tb) return true;
  if (context.generationMetadata?.parsedCustomProgressionBars?.length === tb) return true;
  if (context.harmonyContext?.bars.length === tb) return true;
  return false;
}

export function finalizeBarryHarrisMetadata(metadata: GenerationMetadata, acc: BarryHarrisHarmonyAccumulator): void {
  const flat = [...(metadata.barryHarrisDeviceReceipts ?? [])];
  const g = metadata.barryHarrisAntiElaborationGuards ?? {
    clusterVoicingReduced: 0,
    slashFlattenedToRoot: 0,
    denseAlterationReduced: 0,
  };
  const guardTotal = g.clusterVoicingReduced + g.slashFlattenedToRoot + g.denseAlterationReduced;
  const d = {
    songwriterId: 'barry_harris' as const,
    barsConsidered: acc.barsConsidered,
    sixthChordTouches: acc.sixthChordTouches,
    diminishedTouches: acc.diminishedTouches,
    dominantTouches: acc.dominantTouches,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Barry Harris (bebop / sixth–dim slice): dim≈${acc.diminishedTouches}`,
    `6th≈${acc.sixthChordTouches}`,
    `dom≈${acc.dominantTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.barryHarrisDiagnostics = { ...d };
  metadata.barryHarrisSliceReceipt = receipt;
}
