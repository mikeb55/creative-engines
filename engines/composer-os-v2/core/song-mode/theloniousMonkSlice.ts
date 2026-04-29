/**
 * Thelonious Monk — angular / blues-shadowed / altered-dominant harmony Song Mode / duo golden-path **harmony** slice.
 * Space-forward grammar at chord row: b9 dominants, tonic maj7/#11, strip lush stacks, deferred cadence colour — receipts **`tm:*`**.
 *
 * Symbol-level harmony only for primary `thelonious_monk` (research brief from Monk engine harmonic fields — no Python bridge).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
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

function phrasePositionFromBar(bar: number): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function isSongwriterTheloniousMonk(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'thelonious_monk' } {
  return genMeta?.songwriterStyleId === 'thelonious_monk';
}

export interface TheloniousMonkHarmonyAccumulator {
  barsConsidered: number;
  b9DominantTouches: number;
  angularHarmonyTouches: number;
  tonicColourTouches: number;
}

export function createTheloniousMonkHarmonyAccumulator(): TheloniousMonkHarmonyAccumulator {
  return {
    barsConsidered: 0,
    b9DominantTouches: 0,
    angularHarmonyTouches: 0,
    tonicColourTouches: 0,
  };
}

export interface TheloniousMonkAntiElaborationGuards {
  lushExtensionStripped: number;
}

function scanChordForDiagnostics(chord: string, acc: TheloniousMonkHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/7b9|b9|7alt|\balt\b/.test(t)) acc.b9DominantTouches++;
  if (/dim|ø|7sus|#11|maj7/.test(t) || /sus/.test(t)) acc.angularHarmonyTouches++;
  if (/maj7|#11|\b6\b/.test(t) && !/maj9|maj13/.test(t)) acc.tonicColourTouches++;
}

export function accumulateTheloniousMonkHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: TheloniousMonkHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** Dominant spelled as plain `7` / `9` / `13` without b9/alt — eligible for Monk b9 colour. */
function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/b9|#9|alt|#11|b13/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7' || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

/** Dominant-function chord after Monk colouring — plain `7`/`9`/`13` or already `7b9`/`7alt`; excludes maj/min/sus/m7. */
function isDominantFunctionSymbol(symbol: string): boolean {
  if (isPlainDominantSeventh(symbol)) return true;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|dim7|ø|sus/.test(tl)) return false;
  if (/\bm7\b/.test(tl) && !/7b9/.test(tl)) return false;
  return /\b7b9\b|\b7alt\b/.test(tl);
}

function isTonicAtPc(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  return harmonyRootPc(symbol) === tonicPc;
}

function isContrastSectionBar(bar: number, context: CompositionContext): boolean {
  const secs = context.form?.sections ?? [];
  for (const sec of secs) {
    const L = (sec.label ?? '').toUpperCase();
    if (L === 'B' || L.includes('BRIDGE') || L.includes('CONTRAST')) {
      const end = sec.startBar + sec.length - 1;
      if (bar >= sec.startBar && bar <= end) return true;
    }
  }
  return false;
}

/** Anti–lush: maj9/maj13 streams → maj7 / maj7#11; dom13 → 7b9. */
function stripLushExtensions(
  symbol: string,
  seed: number,
  bar: number,
  guards: TheloniousMonkAntiElaborationGuards
): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;

  if (/\bmaj9\b|\bmaj13\b|\bm13\b/.test(tl)) {
    guards.lushExtensionStripped++;
    return seededUnit(seed, bar, 886010) < 0.55 ? `${root}maj7(#11)${slash}` : `${root}maj7${slash}`;
  }
  if (/\bmaj11\b/.test(tl)) {
    guards.lushExtensionStripped++;
    return `${root}maj7(#11)${slash}`;
  }
  if (/\bm9\b/.test(tl) && !/add/.test(tl)) {
    guards.lushExtensionStripped++;
    return `${root}m7${slash}`;
  }
  if (/\b13\b/.test(tl) && /7|9/.test(tl) && !/b9|#11/.test(tl)) {
    guards.lushExtensionStripped++;
    return `${root}7b9${slash}`;
  }
  return symbol;
}

/** Tonic major: maj7 / maj7(#11) / 6 — never bare triad or sweet maj9. */
function colourTonicMonk(
  symbol: string,
  tonicPc: number | undefined,
  seed: number,
  bar: number
): string {
  if (tonicPc === undefined) return symbol;
  if (!isTonicAtPc(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/dim|ø|sus|m(?!aj)|maj9|maj13/.test(tl)) return symbol;
  if (/maj7/.test(tl)) {
    if (!/#11/.test(tl) && seededUnit(seed, bar, 886020) < 0.4) {
      return `${root}maj7(#11)${slash}`;
    }
    return symbol;
  }
  if (rest === '' || /^maj$/i.test(rest) || rest === 'major') {
    const u = seededUnit(seed, bar, 886021);
    if (u < 0.34) return `${root}maj7(#11)${slash}`;
    if (u < 0.67) return `${root}maj7${slash}`;
    return `${root}6${slash}`;
  }
  return symbol;
}

/** Dominant: 7b9 primary; sometimes 7alt; avoid slick unresolved 13s (handled in strip). */
function colourDominantMonk(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 886030);
  if (u < 0.72) return `${root}7b9${slash}`;
  if (u < 0.92) return `${root}7alt${slash}`;
  return `${root}7${slash}`;
}

/** Phrase-final dominant before tonic: tritone sub + b9 — deferred cadence, angular root motion. */
function deferCadenceWithTritoneSub(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
    if (seededUnit(seed, b, 886101) >= 0.38) continue;
    const domSym = out[b - 1]!;
    const tonSym = out[b]!;
    if (!isDominantFunctionSymbol(domSym)) continue;
    if (!isTonicAtPc(tonSym, tonicPc)) continue;
    const r = harmonyRootPc(domSym);
    if (r === undefined) continue;
    const subPc = (r + 6) % 12;
    const slash = slashTail(domSym);
    const subRoot = pitchClassToSharpName(subPc);
    out[b - 1] = `${subRoot}7b9${slash}`;
    receipts.push(`tm:tritone_sub@bar${b}`);
  }
}

/** Bridge/contrast: more 7sus / dim colour vs blues core. */
function applyContrastSectionColour(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (!isContrastSectionBar(b, context)) continue;
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 886201) >= 0.45) continue;
    const sym = out[b - 1]!;
    if (!isPlainDominantSeventh(sym)) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    out[b - 1] = `${root}7sus4${slash}`;
    receipts.push(`tm:contrast_sus@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Monk slice devices (primary `thelonious_monk` only).
 */
export function precomputeTheloniousMonkEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: TheloniousMonkAntiElaborationGuards = {
    lushExtensionStripped: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = getChordForBar(b, context);
    sym = stripLushExtensions(sym, seed, b, guards);
    sym = colourTonicMonk(sym, tonicPc, seed, b);
    sym = colourDominantMonk(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  deferCadenceWithTritoneSub(out, tonicPc, seed, receipts, tb, context);
  applyContrastSectionColour(out, seed, receipts, tb, context);

  genMeta.theloniousMonkEffectiveHarmonyBars = out;
  genMeta.theloniousMonkDeviceReceipts = receipts;
  genMeta.theloniousMonkAntiElaborationGuards = guards;
}

export function finalizeTheloniousMonkMetadata(
  metadata: GenerationMetadata,
  acc: TheloniousMonkHarmonyAccumulator
): void {
  const flat = [...(metadata.theloniousMonkDeviceReceipts ?? [])];
  const g = metadata.theloniousMonkAntiElaborationGuards ?? {
    lushExtensionStripped: 0,
  };
  const guardTotal = g.lushExtensionStripped;
  const tritoneSubs = flat.filter((r) => r.includes('tm:tritone_sub')).length;
  const d = {
    songwriterId: 'thelonious_monk' as const,
    barsConsidered: acc.barsConsidered,
    b9DominantTouches: acc.b9DominantTouches,
    angularHarmonyTouches: acc.angularHarmonyTouches,
    tonicColourTouches: acc.tonicColourTouches,
    tritoneSubReceiptTouches: tritoneSubs,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Thelonious Monk (angular harmony slice): b9≈${acc.b9DominantTouches}`,
    `angular≈${acc.angularHarmonyTouches}`,
    `tonicColour≈${acc.tonicColourTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.theloniousMonkDiagnostics = { ...d };
  metadata.theloniousMonkSliceReceipt = receipt;
}
