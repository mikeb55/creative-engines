/**
 * Maria Schneider — large-ensemble modal / pastoral Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols only — receipts `ms:*`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `maria_schneider` only — soft `schneider` stays songwriter-normalize;
 * does **not** engage HV. BB Schneider through-composed / texture holdbacks untouched.
 */
export function isMariaSchneiderHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'maria_schneider' || voice === 'maria_schneider';
}

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

/** Phrase lengths 4/6/8/5/7/9 at 28/22/22/14/9/5%. */
function schneiderPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 991011);
  if (u < 0.28) return 4;
  if (u < 0.5) return 6;
  if (u < 0.72) return 8;
  if (u < 0.86) return 5;
  if (u < 0.95) return 7;
  return 9;
}

export function computeSchneiderPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = schneiderPhraseLength(seed, phraseIdx);
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

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
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
  if (/maj9|maj13|maj6|6\/9|#11/.test(tl)) return false;
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
  return !/[79]|11|13|maj/.test(rest);
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function enrichSchneiderTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 991101);
  if (u < 0.45) return `${root}maj9(#11)${slash}`;
  if (u < 0.7) return `${root}maj13(#11)${slash}`;
  if (u < 0.9) return `${root}maj7(#11)${slash}`;
  return `${root}6/9(#11)${slash}`;
}

function enrichSchneiderDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 991102);
  if (u < 0.45) return `${root}7(b9,#11,13)${slash}`;
  if (u < 0.75) return `${root}7alt${slash}`;
  return `${root}9(#11)${slash}`;
}

function enrichSchneiderMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 991103);
  if (u < 0.3) return `${root}m(maj7)${slash}`;
  if (u < 0.55) return `${root}m7(b6)${slash}`;
  if (u < 0.8) return `${root}m9${slash}`;
  return `${root}m11${slash}`;
}

function applyLydianModalCenterPass(
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
    if (seededUnit(seed, b, 991201) >= 0.65) continue;
    const sym = stemOnly(out[b - 1]!);
    if (!looksMajorTonicColour(sym, tonicPc)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (!/\bmaj7\b|\bmaj9\b|\bmaj13\b/.test(tl)) continue;
    if (/#11/.test(tl)) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    let next: string;
    if (/\bmaj13\b/.test(tl)) next = `${root}maj13(#11)`;
    else if (/\bmaj9\b/.test(tl)) next = `${root}maj9(#11)`;
    else next = `${root}maj7(#11)`;
    out[b - 1] = `${next}${slash}`;
    receipts.push(`ms:lyd_center@bar${b}`);
  }
}

function applyPedalOstinatoPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  pedalBarsOut: number[]
): void {
  let i = 0;
  while (i < tb) {
    const r = harmonyRootPc(out[i]!);
    if (r === undefined) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < tb && harmonyRootPc(out[j]!) === r) j++;
    const len = j - i;
    if (len >= 4) {
      for (let k = i; k < j; k++) {
        const bb = k + 1;
        if (isProtectedBar(bb, context)) continue;
        if (seededUnit(seed, bb, 991301) >= 0.4) continue;
        pedalBarsOut.push(bb);
        const st = stemOnly(out[k]!);
        const bassPc = (r + [0, 4, 7][(k - i) % 3] + 12) % 12;
        out[k] = `${st}/${pitchClassToSharpName(bassPc)}`;
        receipts.push(`ms:pedal@bar${bb}`);
      }
    }
    i = j;
  }
}

function applyNatureArcTexturePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const introMax = Math.min(4, tb);
  const outroMin = Math.max(1, tb - 3);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const inIntro = b <= introMax;
    const inOutro = b >= outroMin;
    if (!inIntro && !inOutro) continue;
    if (seededUnit(seed, b, 991401) >= 0.15) continue;
    const sym = stemOnly(out[b - 1]!);
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    out[b - 1] = `${root}maj7(add9)${slash}`;
    receipts.push(`ms:nature_arc@bar${b}`);
  }
}

function applyColorStackPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  colorStackOut: number[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    if (seededUnit(seed, b, 991501) >= 0.55) continue;
    const sym = out[b - 1]!;
    const st = stemOnly(sym);
    const tl = parseChordSymbol(st).harmonyPart.toLowerCase();
    if (!/(add9|b9|#9|#11|b13)/.test(tl)) {
      const slash = slashTail(sym);
      const hp = parseChordSymbol(st).harmonyPart;
      const root = hp.match(ROOT_AT_START)?.[1];
      if (root) out[b - 1] = `${root}${hp.slice(root.length).trim()}(add9)${slash}`;
    }
    colorStackOut.push(b);
    receipts.push(`ms:color_stack@bar${b}`);
  }
}

function matchesMajorTwoFiveOne(
  out: string[],
  iiBar: number,
  tonicPc: number,
  tb: number
): boolean {
  if (iiBar + 2 > tb) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

function applyNonFunctionalPlaningPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  majorMode: boolean
): void {
  if (tonicPc === undefined || !majorMode) return;
  const deltas = [2, -2, 3, -3] as const;
  for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
    if (
      phraseRoleAtBar(iiBar, positions) !== 'phraseMiddle' ||
      phraseRoleAtBar(iiBar + 1, positions) !== 'phraseMiddle' ||
      phraseRoleAtBar(iiBar + 2, positions) !== 'phraseMiddle'
    ) {
      continue;
    }
    if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
    if (isProtectedBar(iiBar, context) || isProtectedBar(iiBar + 1, context) || isProtectedBar(iiBar + 2, context)) continue;
    if (seededUnit(seed, iiBar, 991601) >= 0.35) continue;
    const di = Math.floor(seededUnit(seed, iiBar, 991602) * 4) % 4;
    const delta = deltas[di]!;
    for (let k = 0; k < 3; k++) {
      const bar = iiBar + k;
      const sym = out[bar - 1]!;
      const oldR = harmonyRootPc(stemOnly(sym));
      if (oldR === undefined) continue;
      const newPc = (oldR + delta + 12) % 12;
      out[bar - 1] = replaceChordRoot(sym, pitchClassToSharpName(newPc));
    }
    receipts.push(`ms:planing@bar${iiBar}`);
  }
}

export function isSongwriterMariaSchneider(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'maria_schneider' } {
  return genMeta?.songwriterStyleId === 'maria_schneider';
}

export interface MariaSchneiderHarmonyAccumulator {
  barsConsidered: number;
  lydianTouches: number;
  pedalTouches: number;
  natureTouches: number;
  colorStackTouches: number;
  planingTouches: number;
}

export function createMariaSchneiderHarmonyAccumulator(): MariaSchneiderHarmonyAccumulator {
  return {
    barsConsidered: 0,
    lydianTouches: 0,
    pedalTouches: 0,
    natureTouches: 0,
    colorStackTouches: 0,
    planingTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: MariaSchneiderHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/#11/.test(t)) acc.lydianTouches++;
  if (/\//.test(c)) acc.pedalTouches++;
  if (/add9/.test(t)) acc.natureTouches++;
  if (/\(add9\)|b9|#9/.test(t)) acc.colorStackTouches++;
  if (/7alt|\(b9,#11,13\)/.test(t)) acc.planingTouches++;
}

export function accumulateMariaSchneiderHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: MariaSchneiderHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface MariaSchneiderAntiElaborationGuards {
  bareMajorRaised: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeMariaSchneiderEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: MariaSchneiderAntiElaborationGuards = {
    bareMajorRaised: 0,
  };

  const positions = computeSchneiderPhrasePositions(tb, seed);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const rawIn = resolveBarSymbol(context, b).symbol;
    const bareTonicMajor = looksBareMajorOnTonic(rawIn, tonicPc);
    let sym = rawIn;
    sym = enrichSchneiderTonic(sym, tonicPc, seed, b);
    sym = enrichSchneiderDominant(sym, seed, b);
    sym = enrichSchneiderMinor(sym, seed, b);
    if (bareTonicMajor && sym !== rawIn) guards.bareMajorRaised++;
    raw.push(sym);
  }

  const majorMode = inferMajorKeyFromOpening(raw[0]!, tonicPc);
  const out = [...raw];

  applyNonFunctionalPlaningPass(out, tonicPc, seed, receipts, tb, context, positions, majorMode);
  applyLydianModalCenterPass(out, tonicPc, seed, receipts, tb, context);

  const pedalBars: number[] = [];
  applyPedalOstinatoPass(out, seed, receipts, tb, context, pedalBars);

  applyNatureArcTexturePass(out, seed, receipts, tb, context);

  const colorStackBars: number[] = [];
  applyColorStackPass(out, seed, receipts, tb, context, positions, colorStackBars);

  /* Piece-final only: bias toward Schneider pedal/planing landings that already pass fBT. */
  biasMariaSchneiderFinalBarIdiomaticOpen(out, seed, tb, receipts, context, tonicPc);

  genMeta.mariaSchneiderEffectiveHarmonyBars = out;
  genMeta.mariaSchneiderDeviceReceipts = receipts;
  genMeta.mariaSchneiderAntiElaborationGuards = guards;
  genMeta.schneiderPedalBars = pedalBars;
  genMeta.schneiderColorStackBars = colorStackBars;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece pedal / planing / nature_arc devices untouched.
 */
function chordLooksDominantFamilyForFbtSchneider(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Schneider pool landings that already pass fBT
 * (Amaj7(add9) nature_arc / pedal-slash; sus4 planing secondary).
 * Not a forced jazz tonic cadence — pedal ostinato / non-functional planing idiom preserved.
 */
function biasMariaSchneiderFinalBarIdiomaticOpen(
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
  if (!sym || !chordLooksDominantFamilyForFbtSchneider(sym)) return;

  const rootPc = tonicPc ?? harmonyRootPc(sym);
  if (rootPc === undefined) return;
  const root = pitchClassToSharpName(rootPc);
  const slash = slashTail(sym);
  const u = seededUnit(seed, totalBars, 991601);

  let next: string;
  // Proven FBT-pass: maj7(add9); pedal bass optional; sus4 for planing colour.
  if (u < 0.55) next = `${root}maj7(add9)${slash}`;
  else if (u < 0.78) next = `${root}maj9${slash}`;
  else if (u < 0.9) next = `${root}sus4${slash}`;
  else next = `${root}maj7(add9)/${root}`;

  out[idx] = next;
  receipts.push(`ms:final_open_bias@bar${totalBars}`);
}

export function finalizeMariaSchneiderMetadata(metadata: GenerationMetadata, acc: MariaSchneiderHarmonyAccumulator): void {
  const flat = [...(metadata.mariaSchneiderDeviceReceipts ?? [])];
  const g = metadata.mariaSchneiderAntiElaborationGuards ?? { bareMajorRaised: 0 };
  const planingReceipts = flat.filter((r) => r.startsWith('ms:planing@')).length;
  const d = {
    songwriterId: 'maria_schneider' as const,
    barsConsidered: acc.barsConsidered,
    lydianTouches: acc.lydianTouches,
    pedalTouches: acc.pedalTouches,
    natureTouches: acc.natureTouches,
    colorStackTouches: acc.colorStackTouches,
    planingTouches: planingReceipts,
    antiElaborationGuardTriggers: g.bareMajorRaised,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Maria Schneider (modal orchestral slice): lyd≈${acc.lydianTouches}`,
    `ped≈${acc.pedalTouches}`,
    `nature≈${acc.natureTouches}`,
    `color≈${acc.colorStackTouches}`,
    `plan≈${planingReceipts}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.mariaSchneiderDiagnostics = { ...d };
  metadata.mariaSchneiderSliceReceipt = receipt;
}
