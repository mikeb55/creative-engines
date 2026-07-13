/**
 * Billy Strayhorn — chromatic song-form / extended-tone fusion Song Mode harmony slice.
 * Melody and harmony as one integrated extended-tone system — receipts `bs:*`.
 * Distinct from Ellington: no riff logic, jungle growl, or shout-chorus dominance.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `billy_strayhorn` only — soft `strayhorn` / BY_ID `bs` stay songwriter-normalize;
 * do **not** engage HV. Arranger `strayhorn` / line-first holdbacks untouched.
 */
export function isBillyStrayhornHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'billy_strayhorn' || voice === 'billy_strayhorn';
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Six Strayhorn slice parameters (0–1). */
export interface BillyStrayhornSliceParams {
  /** Harmony moves by chromatic reinterpretation vs diatonic function. */
  chromaticContinuity: number;
  /** Accented melody notes land on maj7/9/11/13 rather than root or 5th. */
  extendedToneMelody: number;
  /** Non-functional parallel chord planing (minor-6/maj7) at phrase openings. */
  parallelColorMotion: number;
  /** Phrase span tendency — ballad 6–10 beats; rubato allows 10–14. */
  phraseArcLength: number;
  /** Chromatic inner voice leading density in accompaniment. */
  innerVoiceActivity: number;
  /** Block voicing persists ≥2 bars as structural texture. */
  closedBlockSustain: number;
}

export const DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS: BillyStrayhornSliceParams = {
  chromaticContinuity: 0.72,
  extendedToneMelody: 0.68,
  parallelColorMotion: 0.55,
  phraseArcLength: 0.65,
  innerVoiceActivity: 0.60,
  closedBlockSustain: 0.55,
};

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

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function strayhornPhraseLength(seed: number, phraseIndex: number, phraseArcLength: number): number {
  const u = seededUnit(seed, phraseIndex, 891011);
  if (phraseArcLength >= 0.7) {
    if (u < 0.35) return 6;
    if (u < 0.65) return 8;
    if (u < 0.85) return 4;
    return 5;
  }
  if (phraseArcLength >= 0.45) {
    if (u < 0.4) return 4;
    if (u < 0.72) return 6;
    if (u < 0.9) return 3;
    return 2;
  }
  if (u < 0.45) return 2;
  if (u < 0.78) return 4;
  return 3;
}

export function computeStrayhornPhrasePositions(
  totalBars: number,
  seed: number,
  phraseArcLength: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = strayhornPhraseLength(seed, phraseIdx, phraseArcLength);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    for (let i = 0; i < span; i++) {
      const globalBar = bar + i;
      if (span <= 1) {
        out.push('phraseFinal');
      } else if (globalBar === bar) {
        out.push('phraseStart');
      } else if (globalBar === end) {
        out.push('phraseFinal');
      } else {
        out.push('phraseMiddle');
      }
    }
    bar = end + 1;
    phraseIdx++;
  }
  while (out.length < totalBars) out.push('phraseMiddle');
  return out.slice(0, totalBars);
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

export function resolveBillyStrayhornSliceParams(
  genMeta: GenerationMetadata | undefined
): BillyStrayhornSliceParams {
  const fromMeta = genMeta?.billyStrayhornSliceParams;
  if (!fromMeta) return { ...DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS };
  return {
    chromaticContinuity: clamp01(fromMeta.chromaticContinuity ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.chromaticContinuity),
    extendedToneMelody: clamp01(fromMeta.extendedToneMelody ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.extendedToneMelody),
    parallelColorMotion: clamp01(fromMeta.parallelColorMotion ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.parallelColorMotion),
    phraseArcLength: clamp01(fromMeta.phraseArcLength ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.phraseArcLength),
    innerVoiceActivity: clamp01(fromMeta.innerVoiceActivity ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.innerVoiceActivity),
    closedBlockSustain: clamp01(fromMeta.closedBlockSustain ?? DEFAULT_BILLY_STRAYHORN_SLICE_PARAMS.closedBlockSustain),
  };
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(stemOnly(symbol)) !== tonicPc) return false;
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/maj9|maj13|maj6|6\/9|#11|11|13/.test(tl)) return false;
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj|6/.test(rest);
}

function isMinorishChord(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11|m6/.test(tl);
}

function enrichStrayhornExtendedTone(
  symbol: string,
  tonicPc: number | undefined,
  seed: number,
  bar: number,
  extendedToneMelody: number
): string {
  const st = stemOnly(symbol);
  const root = parseChordSymbol(st).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 891101);

  if (looksBareMajorOnTonic(symbol, tonicPc)) {
    if (u < extendedToneMelody * 0.45) return `${root}maj9(#11)${slash}`;
    if (u < extendedToneMelody * 0.75) return `${root}maj13${slash}`;
    if (u < extendedToneMelody * 0.92) return `${root}maj7(9,13)${slash}`;
    return `${root}maj9${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    if (u < extendedToneMelody * 0.5) return `${root}13(b9)${slash}`;
    if (u < extendedToneMelody * 0.8) return `${root}9(13)${slash}`;
    return `${root}13${slash}`;
  }

  if (looksBareMinor(symbol)) {
    if (u < extendedToneMelody * 0.55) return `${root}m6(9)${slash}`;
    if (u < extendedToneMelody * 0.85) return `${root}m9${slash}`;
    return `${root}m7(11)${slash}`;
  }

  return symbol;
}

function applyTritoneSubPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    if (seededUnit(seed, b, 891201) >= params.chromaticContinuity * 0.68) continue;
    const prev = out[b - 2];
    if (!prev || !looksPlainDominantSeventh(prev)) continue;
    const domPc = harmonyRootPc(prev);
    if (domPc === undefined) continue;
    const subPc = (domPc + 6) % 12;
    out[b - 2] = `${pitchClassToSharpName(subPc)}7(b9,13)${slashTail(prev)}`;
    receipts.push(`bs:tritone_sub@bar${b - 1}`);
  }
}

function applyMinorThirdDriftPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 891301) >= params.chromaticContinuity * 0.55) continue;
    const sym = out[b - 1]!;
    if (harmonyRootPc(sym) !== tonicPc) continue;
    const driftPc = (tonicPc + 3) % 12;
    const driftName = pitchClassToSharpName(driftPc);
    const hp = parseChordSymbol(stemOnly(sym)).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const qual = hp.slice(root.length);
    out[b - 1] = `${driftName}${qual || 'maj9'}${slashTail(sym)}`;
    receipts.push(`bs:minor_third_drift@bar${b}`);
  }
}

function applyEnharmonicDimPivotPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let cadBar = 2; cadBar <= tb; cadBar++) {
    if (phraseRoleAtBar(cadBar, positions) !== 'phraseFinal') continue;
    const approachBar = cadBar - 1;
    if (approachBar < 1 || isProtectedBar(approachBar, context)) continue;
    if (seededUnit(seed, cadBar, 891401) >= params.chromaticContinuity * 0.48) continue;
    const targetSym = out[cadBar - 1]!;
    const targetPc = harmonyRootPc(targetSym);
    if (targetPc === undefined) continue;
    const dimPc = (targetPc + 1) % 12;
    out[approachBar - 1] = `${pitchClassToSharpName(dimPc)}dim7`;
    receipts.push(`bs:enharmonic_pivot@bar${approachBar}`);
  }
}

function applyDescendingDomChainPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let start = 4; start <= tb - 2; start++) {
    if (phraseRoleAtBar(start, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, start, 891501) >= params.chromaticContinuity * 0.35) continue;
    const chainLen = seededUnit(seed, start, 891502) < 0.5 ? 3 : 4;
    if (start + chainLen - 1 > tb) continue;
    let ok = true;
    for (let i = 0; i < chainLen; i++) {
      if (isProtectedBar(start + i, context)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const firstDom = harmonyRootPc(out[start - 1]!);
    if (firstDom === undefined || !looksPlainDominantSeventh(out[start - 1]!)) continue;
    for (let i = 0; i < chainLen; i++) {
      const pc = (firstDom - i + 12) % 12;
      out[start - 1 + i] = `${pitchClassToSharpName(pc)}13(b9)`;
    }
    receipts.push(`bs:dom_chain@bar${start}`);
  }
}

function applyParallelColorPlaningPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 891601) >= params.parallelColorMotion) continue;
    const root = parseChordSymbol(stemOnly(out[b - 1]!)).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const u = seededUnit(seed, b, 891602);
    const slash = slashTail(out[b - 1]!);
    if (u < 0.5) {
      out[b - 1] = `${root}m6(9)${slash}`;
    } else {
      out[b - 1] = `${root}maj7(9,13)${slash}`;
    }
    if (b + 1 <= tb && !isProtectedBar(b + 1, context)) {
      const rootPc = harmonyRootPc(out[b - 1]!);
      if (rootPc !== undefined) {
        const nextPc = (rootPc + (u < 0.5 ? 1 : -1) + 12) % 12;
        const nextName = pitchClassToSharpName(nextPc);
        out[b] = u < 0.5 ? `${nextName}m6(9)${slash}` : `${nextName}maj7(9,13)${slash}`;
      }
    }
    receipts.push(`bs:parallel_color@bar${b}`);
  }
}

function applyTonalObscuringCadencePass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    if (seededUnit(seed, b, 891701) >= params.extendedToneMelody * 0.88) continue;
    const sym = out[b - 1]!;
    if (harmonyRootPc(sym) !== tonicPc) continue;
    const root = pitchClassToSharpName(tonicPc);
    const slash = slashTail(sym);
    out[b - 1] = `${root}maj9(#11,13)${slash}`;
    receipts.push(`bs:tonal_obscure@bar${b}`);
  }
}

function applyInnerVoiceMotionReceiptPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams
): void {
  for (let b = 2; b <= tb; b++) {
    if (seededUnit(seed, b, 891801) >= params.innerVoiceActivity * 0.75) continue;
    receipts.push(`bs:inner_voice@bar${b}`);
  }
}

function applyClosedBlockSustainPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  blockBarsOut: number[]
): void {
  for (let b = 1; b <= tb - 1; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 891901) >= params.closedBlockSustain) continue;
    const span = seededUnit(seed, b, 891902) < 0.5 ? 2 : 3;
    for (let i = 0; i < span && b + i <= tb; i++) {
      blockBarsOut.push(b + i);
    }
    receipts.push(`bs:closed_block@bar${b}`);
  }
}

function applyExtendedToneMelodyReceiptPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams
): void {
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 892001) >= params.extendedToneMelody) continue;
    receipts.push(`bs:ext_tone_mel@bar${b}`);
  }
}

function applyLegatoAngularReceiptPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams
): void {
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 892101) >= params.phraseArcLength * 0.95) continue;
    receipts.push(`bs:legato_angular@bar${b}`);
  }
}

function applySaxCountermelodyReceiptPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams
): void {
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 892201) >= params.innerVoiceActivity * 0.75) continue;
    receipts.push(`bs:sax_counter@bar${b}`);
  }
}

function applyMaj7ArpeggioReceiptPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 892301) >= params.extendedToneMelody * 0.58) continue;
    receipts.push(`bs:maj7_arpeggio@bar${b}`);
  }
}

function applyPolyphonicBackgroundReceiptPass(
  seed: number,
  receipts: string[],
  tb: number,
  params: BillyStrayhornSliceParams
): void {
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 892401) >= params.innerVoiceActivity * 0.92) continue;
    receipts.push(`bs:poly_bg@bar${b}`);
  }
}

export function isSongwriterBillyStrayhorn(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'billy_strayhorn' } {
  return genMeta?.songwriterStyleId === 'billy_strayhorn';
}

export interface BillyStrayhornHarmonyAccumulator {
  barsConsidered: number;
  extensionTouches: number;
  chromaticTouches: number;
  parallelColorTouches: number;
  innerVoiceTouches: number;
}

export function createBillyStrayhornHarmonyAccumulator(): BillyStrayhornHarmonyAccumulator {
  return {
    barsConsidered: 0,
    extensionTouches: 0,
    chromaticTouches: 0,
    parallelColorTouches: 0,
    innerVoiceTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BillyStrayhornHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|maj13|maj7|m6\(9\)|m9|11|13|#11/.test(t)) acc.extensionTouches++;
  if (/dim7|13\(b9\)|7\(b9|tritone|m6/.test(t)) acc.chromaticTouches++;
  if (/m6|maj7\(9/.test(t)) acc.parallelColorTouches++;
}

export function accumulateBillyStrayhornHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BillyStrayhornHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BillyStrayhornAntiElaborationGuards {
  bareMajorRaised: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeBillyStrayhornEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const params = resolveBillyStrayhornSliceParams(context.generationMetadata);
  genMeta.billyStrayhornSliceParams = params;

  const receipts: string[] = [];
  const guards: BillyStrayhornAntiElaborationGuards = { bareMajorRaised: 0 };
  const positions = computeStrayhornPhrasePositions(tb, seed, params.phraseArcLength);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const rawIn = resolveBarSymbol(context, b).symbol;
    const bareTonic = looksBareMajorOnTonic(rawIn, tonicPc);
    let sym = enrichStrayhornExtendedTone(rawIn, tonicPc, seed, b, params.extendedToneMelody);
    if (bareTonic && sym !== rawIn) guards.bareMajorRaised++;
    raw.push(sym);
  }

  const out = [...raw];

  applyParallelColorPlaningPass(out, seed, receipts, tb, context, params, positions);
  applyTritoneSubPass(out, seed, receipts, tb, context, params, positions);
  applyMinorThirdDriftPass(out, tonicPc, seed, receipts, tb, context, params, positions);
  applyEnharmonicDimPivotPass(out, tonicPc, seed, receipts, tb, context, params, positions);
  applyDescendingDomChainPass(out, seed, receipts, tb, context, params, positions);
  applyTonalObscuringCadencePass(out, tonicPc, seed, receipts, tb, context, params, positions);

  applyInnerVoiceMotionReceiptPass(out, seed, receipts, tb, params);
  applyExtendedToneMelodyReceiptPass(seed, receipts, tb, params);
  applyLegatoAngularReceiptPass(seed, receipts, tb, params);
  applySaxCountermelodyReceiptPass(seed, receipts, tb, params);
  applyMaj7ArpeggioReceiptPass(seed, receipts, tb, params, positions);
  applyPolyphonicBackgroundReceiptPass(seed, receipts, tb, params);

  const blockBars: number[] = [];
  applyClosedBlockSustainPass(seed, receipts, tb, params, positions, blockBars);

  /* Piece-final only: bias toward Strayhorn parallel-planing landings that already pass fBT. */
  biasBillyStrayhornFinalBarIdiomaticOpen(out, seed, tb, receipts, context, tonicPc);

  genMeta.billyStrayhornEffectiveHarmonyBars = out;
  genMeta.billyStrayhornDeviceReceipts = receipts;
  genMeta.billyStrayhornAntiElaborationGuards = guards;
  genMeta.strayhornClosedBlockBars = blockBars;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece parallel_color / tonal_obscure / chrom devices untouched.
 * Note: maj7(9,13) / maj9(#11,13) trip via digit `13` even when mid-piece idiomatic.
 */
function chordLooksDominantFamilyForFbtStrayhorn(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Strayhorn parallel-planing pool that already passes fBT
 * (C#m6(9) proven; maj9(#11) without 13 — never maj7(9,13) / maj9(#11,13) digit trap).
 * Not a forced jazz tonic cadence — non-functional parallel colour preserved.
 */
function biasBillyStrayhornFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtStrayhorn(sym)) return;

  const rootPc = tonicPc ?? harmonyRootPc(sym);
  if (rootPc === undefined) return;
  const root = pitchClassToSharpName(rootPc);
  const slash = slashTail(sym);
  const u = seededUnit(seed, totalBars, 892101);

  let next: string;
  // Proven FBT-pass parallel colour is m6(9); maj9(#11) without 13 as lighter secondary.
  if (u < 0.55) next = `${root}m6(9)${slash}`;
  else if (u < 0.82) next = `${root}maj9(#11)${slash}`;
  else next = `${root}maj9${slash}`;

  out[idx] = next;
  receipts.push(`bs:final_open_bias@bar${totalBars}`);
}

export function finalizeBillyStrayhornMetadata(
  metadata: GenerationMetadata,
  acc: BillyStrayhornHarmonyAccumulator
): void {
  const flat = [...(metadata.billyStrayhornDeviceReceipts ?? [])];
  const g = metadata.billyStrayhornAntiElaborationGuards ?? { bareMajorRaised: 0 };
  const params = resolveBillyStrayhornSliceParams(metadata);
  const chromReceipts = flat.filter((r) =>
    /bs:(tritone_sub|minor_third_drift|enharmonic_pivot|dom_chain)@/.test(r)
  ).length;
  const d = {
    songwriterId: 'billy_strayhorn' as const,
    barsConsidered: acc.barsConsidered,
    extensionTouches: acc.extensionTouches,
    chromaticTouches: acc.chromaticTouches,
    parallelColorTouches: acc.parallelColorTouches,
    innerVoiceTouches: flat.filter((r) => r.startsWith('bs:inner_voice@')).length,
    sliceParams: params,
    chromaticArchitectureCount: chromReceipts,
    antiElaborationGuardTriggers: g.bareMajorRaised,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Billy Strayhorn (chromatic song slice): ext≈${acc.extensionTouches}`,
    `chrom≈${acc.chromaticTouches}`,
    `parallel≈${acc.parallelColorTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.billyStrayhornDiagnostics = { ...d };
  metadata.billyStrayhornSliceReceipt = receipt;
}
