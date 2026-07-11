/**
 * Cole Porter — Great American Songbook chromatic / theatre jazz harmony slice (`cp:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { buildHarmonyPlanFromBars, buildChordSymbolPlanFromBars } from '../harmony/chordProgressionParser';
import { buildLockedHarmonyBarContracts, assertLockedHarmonyContractsToneParity } from '../harmony/harmonyBarContract';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function isMinorishChord(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
}

function inferMajorKeyFromOpening(symbolAtBar1: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return true;
  const r = harmonyRootPc(symbolAtBar1);
  if (r !== tonicPc) return true;
  return !isMinorishChord(symbolAtBar1);
}

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/maj9|maj13|maj6|6\/9|#11/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj/.test(rest);
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length);
  // Bare `7b9` / `7alt` (no parens) are dominant-family — same enrich path as `7` / `7(b9)`.
  // (`7#9` already matched via `[^a-z]` after `7`.)
  return (
    /^7([^a-z]|$)|^7\(|^7b9|^7alt/.test(rest) ||
    /^9([^a-z]|$)/.test(rest) ||
    /^13([^a-z]|$)/.test(rest)
  );
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

/** Weights: 4-bar 65%, 8-bar 22%, 2-bar 10%, 6-bar 3%. */
function porterPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 995001);
  if (u < 0.65) return 4;
  if (u < 0.87) return 8;
  if (u < 0.97) return 2;
  return 6;
}

/** Phrase grid for Porter slice devices (cadential colour + secondary dominants). */
export function computePorterPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = porterPhraseLength(seed, phraseIdx);
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

function enrichPorterTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 995101);
  if (u < 0.45) return `${root}maj7${slash}`;
  if (u < 0.75) return `${root}6/9${slash}`;
  return `${root}maj9${slash}`;
}

function enrichPorterDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 995201);
  if (u < 0.4) return `${root}9${slash}`;
  if (u < 0.7) return `${root}13${slash}`;
  if (u < 0.9) return `${root}7(b9)${slash}`;
  return `${root}7sus4${slash}`;
}

function enrichPorterMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 995301);
  if (u < 0.5) return `${root}m7${slash}`;
  if (u < 0.8) return `${root}m9${slash}`;
  return `${root}m6${slash}`;
}

function chromaticDescentSpan(
  tonicPc: number,
  slash: string
): [string, string, string, string] {
  const rSharpIv = pitchClassToSharpName((tonicPc + 6) % 12);
  const rIv = pitchClassToSharpName((tonicPc + 5) % 12);
  const rIii = pitchClassToSharpName((tonicPc + 4) % 12);
  const rIi = pitchClassToSharpName((tonicPc + 2) % 12);
  return [`${rSharpIv}ø7${slash}`, `${rIv}m7${slash}`, `${rIii}m7${slash}`, `${rIi}m7${slash}`];
}

function applyChromaticDescentPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 4; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    if (seededUnit(seed, b, 995401) >= 0.42) continue;
    let blocked = false;
    for (let k = b - 3; k <= b; k++) {
      if (isProtectedBar(k, context)) blocked = true;
    }
    if (blocked) continue;
    const slash = slashTail(out[b - 1] ?? '');
    const tonicPc = inferTonicPitchClassFromBar1(context);
    const seq = chromaticDescentSpan(tonicPc ?? 0, slash);
    out[b - 4] = seq[0]!;
    out[b - 3] = seq[1]!;
    out[b - 2] = seq[2]!;
    out[b - 1] = seq[3]!;
    receipts.push(`cp:chrom_descent@bar${b}`);
  }
}

function isDominantOfTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return false;
  return r === (tonicPc + 7) % 12;
}

function isTonicChord(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  return r === tonicPc;
}

function applyBVIColorPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  tonicPc: number | undefined
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 995501) >= 0.28) continue;
    if (isProtectedBar(b, context)) continue;
    const next = out[b];
    if (!next) continue;
    if (!isDominantOfTonic(next, tonicPc) && !isTonicChord(next, tonicPc)) continue;
    const slash = slashTail(next);
    const bViRoot = pitchClassToSharpName((tonicPc + 8) % 12);
    const u = seededUnit(seed, b, 995502);
    out[b - 1] = u < 0.55 ? `${bViRoot}maj7${slash}` : `${bViRoot}6${slash}`;
    receipts.push(`cp:bvi_color@bar${b}`);
  }
}

function applyMinorMajorShiftPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  tonicPc: number | undefined,
  openingSym: string
): void {
  const majorMode = inferMajorKeyFromOpening(openingSym, tonicPc);
  for (let b = 1; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) === 'phraseStart') {
      if (seededUnit(seed, b, 995601) >= 0.18) continue;
      if (isProtectedBar(b, context)) continue;
      const sym = out[b - 1]!;
      if (!majorMode || !looksBareMajorOnTonic(sym, tonicPc)) continue;
      const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(sym);
      out[b - 1] = `${root}m7${slash}`;
      receipts.push(`cp:min_maj_shift@bar${b}`);
    }
    if (phraseRoleAtBar(b, positions) === 'phraseFinal' && !majorMode) {
      if (seededUnit(seed, b, 995602) >= 0.3) continue;
      if (isProtectedBar(b, context)) continue;
      const sym = out[b - 1]!;
      if (!isMinorishChord(sym) || harmonyRootPc(sym) !== tonicPc) continue;
      const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(sym);
      out[b - 1] = seededUnit(seed, b, 995603) < 0.5 ? `${root}maj7${slash}` : `${root}6/9${slash}`;
      receipts.push(`cp:min_maj_shift@bar${b}`);
    }
  }
}

function applyDiatonicDensityPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (seededUnit(seed, b, 995701) >= 0.35) continue;
    if (isProtectedBar(b, context)) continue;
    const nextSym = out[b];
    if (!nextSym) continue;
    const nextRoot = harmonyRootPc(nextSym);
    if (nextRoot === undefined) continue;
    const domPc = (nextRoot + 7) % 12;
    const slash = slashTail(out[b - 1] ?? '');
    out[b - 1] = `${pitchClassToSharpName(domPc)}7${slash}`;
    receipts.push(`cp:diatonic_density@bar${b}`);
  }
}

function applyBeguineRhythmFlag(
  genMeta: GenerationMetadata & Record<string, unknown>,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  // Beguine feel stamps stay primary-only — HV must not steal primary surface identity.
  if (genMeta.songwriterStyleId !== 'cole_porter') return;
  genMeta.porterBeguineFeelActive = true;
  const bars: number[] = [];
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 995802) >= 0.55) continue;
    bars.push(b);
    receipts.push(`cp:beguine@bar${b}`);
  }
  if (bars.length) genMeta.porterBeguineBars = bars;
}

/**
 * Echo slice-authoritative bars into locked + parsed so eval strip / LOCK
 * match `getChordForBar` (STYLE_SOPHISTICATED_POP dressing otherwise leaves
 * raw builtin A7alt in parsedCustomProgressionBars and stripFromContext
 * prefers that over calmed effective bars).
 */
function syncColePorterAuthorityBars(context: CompositionContext, out: string[]): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  if (out.length !== tb) return;

  context.lockedHarmonyBarsRaw = [...out];
  context.harmony = buildHarmonyPlanFromBars(out);
  context.chordSymbolPlan = buildChordSymbolPlanFromBars(out);
  context.lockedHarmonyBarContracts = buildLockedHarmonyBarContracts(out);
  assertLockedHarmonyContractsToneParity(context.lockedHarmonyBarContracts);

  genMeta.customChordProgressionSummary = out.join(' | ');
  genMeta.parsedCustomProgressionBars = [...out];
}

export function isSongwriterColePorter(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'cole_porter' } {
  return genMeta?.songwriterStyleId === 'cole_porter';
}

/**
 * Primary songwriter or harmonicVoice selects Cole Porter harmony authority.
 * Single-gate (no styleProfile) — Wave-C / bill_evans HV pattern.
 *
 * Exact id `cole_porter` only — soft aliases (`porter`, …) stay primary-intake via
 * songwriter normalize; they do **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - **`applyColePorterStyleSurface`** — Song Mode bias nudges from primaryId.
 * - Beguine feel stamps (`porterBeguineFeelActive` / `porterBeguineBars`).
 */
export function isColePorterHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'cole_porter' || voice === 'cole_porter';
}

export interface ColePorterHarmonyAccumulator {
  barsConsidered: number;
  chromaticTouches: number;
  secondaryDominantTouches: number;
  majColourTouches: number;
}

export function createColePorterHarmonyAccumulator(): ColePorterHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticTouches: 0,
    secondaryDominantTouches: 0,
    majColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: ColePorterHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/ø|dim|m7b5|b9|#9/.test(t)) acc.chromaticTouches++;
  if (/^[a-g].*7/.test(t.replace(/\s/g, '')) && /v\/|secondary/i.test(t) === false) {
    /* heuristic */ void 0;
  }
  if (/13|9|sus|maj7|maj9|6\/9/.test(t)) acc.majColourTouches++;
  if (/^[a-g][#b]?/.test(c) && /7/.test(t)) acc.secondaryDominantTouches++;
}

export function accumulateColePorterHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: ColePorterHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface ColePorterAntiElaborationGuards {
  noopEnrich: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeColePorterEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: ColePorterAntiElaborationGuards = { noopEnrich: 0 };

  const positions = computePorterPhrasePositions(tb, seed);

  const raw: string[] = [];
  const openingSym = resolveBarSymbol(context, 1).symbol;
  for (let b = 1; b <= tb; b++) {
    const rawIn = resolveBarSymbol(context, b).symbol;
    let sym = rawIn;
    sym = enrichPorterTonic(sym, tonicPc, seed, b);
    sym = enrichPorterDominant(sym, seed, b);
    sym = enrichPorterMinor(sym, seed, b);
    if (sym === rawIn) guards.noopEnrich++;
    raw.push(sym);
  }

  const out = [...raw];

  applyChromaticDescentPass(out, seed, receipts, tb, context, positions);
  applyBVIColorPass(out, seed, receipts, tb, context, positions, tonicPc);
  applyMinorMajorShiftPass(out, seed, receipts, tb, context, positions, tonicPc, openingSym);
  applyDiatonicDensityPass(out, seed, receipts, tb, context, tonicPc);
  applyBeguineRhythmFlag(genMeta, seed, receipts, tb, context);

  genMeta.colePorterEffectiveHarmonyBars = out;
  genMeta.colePorterDeviceReceipts = receipts;
  genMeta.colePorterAntiElaborationGuards = guards;

  // Keep strip/LOCK in lockstep with slice authority (calms bare 7b9 / 7alt endings).
  syncColePorterAuthorityBars(context, out);

  if (tb === 32) {
    const uniq = new Set(out.map((s) => s.trim()));
    genMeta.colePorterDistinctChordCount32 = uniq.size;
  }
}

export function finalizeColePorterMetadata(metadata: GenerationMetadata, acc: ColePorterHarmonyAccumulator): void {
  const flat = [...(metadata.colePorterDeviceReceipts ?? [])];
  const g = metadata.colePorterAntiElaborationGuards ?? { noopEnrich: 0 };
  const d = {
    songwriterId: 'cole_porter' as const,
    barsConsidered: acc.barsConsidered,
    chromaticTouches: acc.chromaticTouches,
    secondaryDominantTouches: acc.secondaryDominantTouches,
    majColourTouches: acc.majColourTouches,
    antiElaborationGuardTriggers: g.noopEnrich,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Cole Porter (slice): chromatic≈${acc.chromaticTouches}`,
    `dom-colour≈${acc.secondaryDominantTouches}`,
    `maj-ext≈${acc.majColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.colePorterDiagnostics = { ...d };
  metadata.colePorterSliceReceipt = receipt;
}
