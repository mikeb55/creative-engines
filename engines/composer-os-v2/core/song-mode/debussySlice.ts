/**
 * Debussy — impressionist colour / parallel planing Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols only — receipts **`db:*`**.
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

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = head.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  return `${newRoot}${rest}${slash}`;
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  return true;
}

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/maj9|maj13|maj6|6\/9|#11|add2|aug/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj|add/.test(rest);
}

/** Plain dominant seventh only — no ext / alt / sus (Debussy enrich + whole-tone field). */
function looksPlainDom7Strict(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return /^7([^a-z]|$)|^7\(/.test(rest);
}

function extractRootAndSlash(symbol: string): { root: string; slash: string; rest: string } | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  const root = m[1];
  const rest = head.slice(root.length);
  return { root, slash: slashTail(symbol), rest };
}

function debussyPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 770101);
  if (u < 0.06) return 2;
  if (u < 0.3) return 3;
  if (u < 0.57) return 4;
  if (u < 0.78) return 5;
  if (u < 0.92) return 6;
  if (u < 0.95) return 7;
  return 8;
}

/** Phrase grid — weighted lengths (Debussy arabesque asymmetry). */
export function computeDebussyPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = debussyPhraseLength(seed, phraseIdx);
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

function enrichDebussyTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770201);
  const { root, slash } = ex;
  if (u < 0.3) return `${root}add2${slash}`;
  if (u < 0.55) return `${root}maj9${slash}`;
  if (u < 0.8) return `${root}6/9${slash}`;
  return `${root}aug${slash}`;
}

function enrichDebussyDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDom7Strict(symbol)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770301);
  const { root, slash } = ex;
  if (u < 0.4) return `${root}9(no11)${slash}`;
  if (u < 0.75) return `${root}aug7${slash}`;
  return `${root}7(b5#5)${slash}`;
}

function enrichDebussyMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770401);
  const { root, slash } = ex;
  if (u < 0.35) return `${root}m(add2)${slash}`;
  if (u < 0.65) return `${root}m9${slash}`;
  if (u < 0.85) return `${root}m6${slash}`;
  return `${root}m7${slash}`;
}

function isBridgeBar(bar: number, context: CompositionContext): boolean {
  for (const s of context.form.sections) {
    const lb = (s.label ?? '').toLowerCase();
    if (lb.includes('bridge') || lb === 'b') {
      if (bar >= s.startBar && bar < s.startBar + s.length) return true;
    }
  }
  return false;
}

function isMidOrBridgeBar(bar: number, tb: number, context: CompositionContext): boolean {
  if (isBridgeBar(bar, context)) return true;
  const lo = Math.floor(tb * 0.25);
  const hi = Math.ceil(tb * 0.75);
  return bar > lo && bar <= hi;
}

function looksResolvedDomToTonic(
  domSym: string,
  nextSym: string | undefined,
  tonicPc: number | undefined
): boolean {
  if (nextSym === undefined || tonicPc === undefined) return false;
  if (!looksPlainDom7Strict(domSym)) return false;
  return looksMajorTonicColour(nextSym, tonicPc);
}

function pickWholeToneColour(root: string, slash: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 770601);
  if (u < 0.28) return `${root}aug${slash}`;
  if (u < 0.44) return `${root}9(no11)${slash}`;
  if (u < 0.53) return `${root}maj7(#5)${slash}`;
  if (u < 0.64) return `${root}6/9(no5)${slash}`;
  if (u < 0.78) return `${root}add2(add6)${slash}`;
  if (u < 0.86) return `${root}7sus4${slash}`;
  return `${root}7(#5)${slash}`;
}

function applyWholeToneFieldPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  let wtBarsRemaining = 0;
  let wtColl: 0 | 1 = 0;

  for (let b = 1; b <= tb; b++) {
    if (wtBarsRemaining > 0) wtBarsRemaining--;
    if (isProtectedBar(b, context)) continue;
    const role = phraseRoleAtBar(b, positions);
    if (role !== 'phraseStart' && role !== 'phraseMiddle') continue;
    const sym = out[b - 1]!;
    const eligible = looksPlainDom7Strict(sym) || looksMajorTonicColour(sym, tonicPc);
    if (!eligible) continue;
    if (seededUnit(seed, b, 770501) >= 0.41) continue;

    if (wtBarsRemaining <= 0) {
      const span = 4 + Math.floor(seededUnit(seed, b, 770502) * 5);
      wtBarsRemaining = Math.max(0, span - 1);
      wtColl = seededUnit(seed, b, 770503) < 0.5 ? 0 : 1;
    }

    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    let { root } = ex;
    const { slash } = ex;
    const rPc = harmonyRootPc(sym);
    if (rPc === undefined) continue;

    if (wtColl === 1) {
      root = pitchClassToSharpName((rPc + 1 + 12) % 12);
    }

    out[b - 1] = pickWholeToneColour(root, slash, seed, b);
    receipts.push(`db:whole_tone@bar${b}`);
  }
}

function pickPlaningQuality(root: string, slash: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 770801);
  if (u < 0.16) return `${root}add2${slash}`;
  if (u < 0.31) return `${root}9${slash}`;
  if (u < 0.48) return `${root}${slash}`;
  if (u < 0.62) return `${root}7sus4${slash}`;
  if (u < 0.7) return `${root}maj9${slash}`;
  if (u < 0.81) return `${root}m${slash}`;
  if (u < 0.91) return `${root}6${slash}`;
  return `${root}7${slash}`;
}

function applyParallelPlaningPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 770701) >= 0.64) continue;
    const sym = out[b - 1]!;
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const uMove = seededUnit(seed, b, 770702);
    const delta = uMove < 0.71 ? 2 : uMove < 0.92 ? 1 : 0;
    if (delta === 0) continue;
    const moved = transposeChordRoot(sym, delta);
    const ex2 = extractRootAndSlash(moved);
    if (!ex2) continue;
    out[b - 1] = pickPlaningQuality(ex2.root, ex2.slash, seed, b);
    receipts.push(`db:planing@bar${b}`);
  }
}

function pentatonicBassPc(rootPc: number, seed: number, bar: number): number {
  const pent = [0, 2, 4, 7, 9];
  const idx = Math.floor(seededUnit(seed, bar, 770901) * pent.length) % pent.length;
  return (rootPc + (pent[idx] ?? 0) + 12) % 12;
}

function applyPentatonicContrastPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (!isMidOrBridgeBar(b, tb, context)) continue;
    if (seededUnit(seed, b, 771001) >= 0.34) continue;
    const sym = out[b - 1]!;
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const rootPc = harmonyRootPc(sym);
    if (rootPc === undefined) continue;
    const mode = seededUnit(seed, b, 771002);
    const bassPc = pentatonicBassPc(rootPc, seed, b);
    const bassName = pitchClassToSharpName(bassPc);
    const stemNoSlash = `${ex.root}${ex.rest}`;
    if (mode < 0.41) {
      out[b - 1] = `${stemNoSlash}/${bassName}`;
    } else if (mode < 0.63) {
      out[b - 1] = `${ex.root}sus4${ex.slash}`;
    } else if (mode < 0.82) {
      out[b - 1] = `${ex.root}6${ex.slash}`;
    } else {
      out[b - 1] = `${ex.root}6/9${ex.slash}`;
    }
    receipts.push(`db:pentatonic@bar${b}`);
  }
}

function applyUnresolvedAppoggiaturaPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  guards: DebussyAntiElaborationGuards
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 771101) >= 0.27) continue;
    const sym = out[b - 1]!;
    const next = b < tb ? out[b] : undefined;
    if (
      seededUnit(seed, b, 771102) < 0.72 &&
      looksResolvedDomToTonic(sym, next, tonicPc)
    ) {
      guards.resolutionSuppressed++;
      continue;
    }
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const { root, slash } = ex;
    const u = seededUnit(seed, b, 771103);
    if (u < 0.26) out[b - 1] = `${root}add2${slash}`;
    else if (u < 0.4) out[b - 1] = `${root}6${slash}`;
    else if (u < 0.62) out[b - 1] = `${root}maj9${slash}`;
    else if (u < 0.81) out[b - 1] = `${root}9${slash}`;
    else out[b - 1] = `${root}add2(add6)${slash}`;
    receipts.push(`db:appoggiatura@bar${b}`);
  }
}

export type DebussyArabesqueMotifKind =
  | 'sequence_by_step'
  | 'rhythmic_augmentation'
  | 'fragment_extension'
  | 'register_shift'
  | 'ornamental';

function pickArabesqueMotifKind(seed: number, bar: number): DebussyArabesqueMotifKind {
  const u = seededUnit(seed, bar, 771201);
  if (u < 0.33) return 'sequence_by_step';
  if (u < 0.47) return 'rhythmic_augmentation';
  if (u < 0.66) return 'fragment_extension';
  if (u < 0.79) return 'register_shift';
  return 'ornamental';
}

function applyArabesqueMotifFlag(
  genMeta: GenerationMetadata & Record<string, unknown>,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const bars: number[] = [];
  const byBar: Record<number, DebussyArabesqueMotifKind> = {};
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 771301) >= 0.38) continue;
    bars.push(b);
    byBar[b] = pickArabesqueMotifKind(seed, b);
    receipts.push(`db:arabesque@bar${b}`);
  }
  genMeta.debussyArabesqueBars = bars.length ? bars : undefined;
  genMeta.debussyArabesqueMotifByBar = Object.keys(byBar).length ? byBar : undefined;
}

export function isSongwriterDebussy(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'debussy' } {
  return genMeta?.songwriterStyleId === 'debussy';
}

export interface DebussyHarmonyAccumulator {
  barsConsidered: number;
  wholeToneTouches: number;
  planingTouches: number;
  pentatonicTouches: number;
  appoggiaturaTouches: number;
  arabesqueTouches: number;
}

export function createDebussyHarmonyAccumulator(): DebussyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    wholeToneTouches: 0,
    planingTouches: 0,
    pentatonicTouches: 0,
    appoggiaturaTouches: 0,
    arabesqueTouches: 0,
  };
}

function scanChordForDebussyDiagnostics(chord: string, acc: DebussyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/aug|#5|\(#5\)/.test(t)) acc.wholeToneTouches++;
  if (/add2|planing|sus4/.test(t)) acc.planingTouches++;
  if (/6\/9|pentatonic/.test(t) || /sus4/.test(t)) acc.pentatonicTouches++;
  if (/add2\(add6\)|maj9|m\(add2\)/.test(t)) acc.appoggiaturaTouches++;
}

export function accumulateDebussyHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: DebussyHarmonyAccumulator
): void {
  scanChordForDebussyDiagnostics(currentChord, acc);
}

export interface DebussyAntiElaborationGuards {
  noopEnrich: number;
  resolutionSuppressed: number;
}

export function precomputeDebussyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: DebussyAntiElaborationGuards = {
    noopEnrich: 0,
    resolutionSuppressed: 0,
  };

  const positions = computeDebussyPhrasePositions(tb, seed);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = getChordForBar(b, context);
    const before = sym;
    sym = enrichDebussyTonic(sym, tonicPc, seed, b);
    sym = enrichDebussyDominant(sym, seed, b);
    sym = enrichDebussyMinor(sym, seed, b);
    if (
      sym === before &&
      (looksBareMajorOnTonic(before, tonicPc) || looksBareMinor(before) || looksPlainDom7Strict(before))
    ) {
      guards.noopEnrich++;
    }
    raw.push(sym);
  }

  const out = [...raw];

  applyWholeToneFieldPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyParallelPlaningPass(out, seed, receipts, tb, context);
  applyPentatonicContrastPass(out, tonicPc, seed, receipts, tb, context);
  applyUnresolvedAppoggiaturaPass(out, tonicPc, seed, receipts, tb, context, positions, guards);

  applyArabesqueMotifFlag(genMeta, seed, receipts, tb, context);

  genMeta.debussyEffectiveHarmonyBars = out;
  genMeta.debussyDeviceReceipts = receipts;
  genMeta.debussyAntiElaborationGuards = guards;
}

export function finalizeDebussyMetadata(metadata: GenerationMetadata, acc: DebussyHarmonyAccumulator): void {
  const flat = [...(metadata.debussyDeviceReceipts ?? [])];
  const g = metadata.debussyAntiElaborationGuards ?? {
    noopEnrich: 0,
    resolutionSuppressed: 0,
  };
  const guardTotal = g.noopEnrich + g.resolutionSuppressed;
  const arab = metadata.debussyArabesqueBars ?? [];
  const d = {
    songwriterId: 'debussy' as const,
    barsConsidered: acc.barsConsidered,
    wholeToneTouches: acc.wholeToneTouches,
    planingTouches: acc.planingTouches,
    pentatonicTouches: acc.pentatonicTouches,
    appoggiaturaTouches: acc.appoggiaturaTouches,
    arabesqueTouches: arab.length,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Debussy (impressionist slice): wt≈${acc.wholeToneTouches}`,
    `plan≈${acc.planingTouches}`,
    `pent≈${acc.pentatonicTouches}`,
    `appog≈${acc.appoggiaturaTouches}`,
    `arab=${arab.length}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.debussyDiagnostics = { ...d };
  metadata.debussySliceReceipt = receipt;
}
