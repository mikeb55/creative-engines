/**
 * Miles Davis — modal centre / space / electric vamp Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols only — receipts **`md:*`**.
 */

import type { CompositionContext, GenerationMetadata, MilesDavisContextMode } from '../compositionContext';
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

function isMinorishChord(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
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

/** Bare triad / simple maj or min without extensions (electric-era shell targets). */
function looksBareTriadOrSimple(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = head.toLowerCase().replace(/\s/g, '');
  if (/maj7|mmaj|dim|ø|sus|add|m7|m11|7alt|\b7\b|9|11|13|#|b[0-9]/.test(tl)) return false;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = head.slice(m[1].length).replace(/\s/g, '');
  return rest === '' || rest === 'm' || /^maj$|^M?$/.test(rest);
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

export function milesPhraseLength(seed: number, phraseIndex: number, ctx: MilesDavisContextMode): number {
  const u = seededUnit(seed, phraseIndex, 991001);
  if (ctx === 'modal_1959') {
    if (u < 0.55) return 4;
    if (u < 0.83) return 2;
    if (u < 0.95) return 6;
    return 8;
  }
  if (ctx === 'quintet_1965') {
    if (u < 0.45) return 4;
    if (u < 0.8) return 2;
    if (u < 0.95) return 6;
    return 8;
  }
  if (u < 0.4) return 4;
  if (u < 0.75) return 8;
  if (u < 0.95) return 16;
  return 2;
}

/** Phrase grid positions — lengths depend on {@link MilesDavisContextMode}. */
export function computeMilesDavisPhrasePositions(
  totalBars: number,
  seed: number,
  ctx: MilesDavisContextMode
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = milesPhraseLength(seed, phraseIdx, ctx);
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

function enrichMilesDavisTonic(
  symbol: string,
  tonicPc: number | undefined,
  seed: number,
  bar: number,
  ctx: MilesDavisContextMode
): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;

  if (looksBareMinor(symbol)) {
    const u = seededUnit(seed, bar, 992101);
    if (ctx === 'electric_1970') {
      if (u < 0.35) return `${root}m7sus${slash}`;
      if (u < 0.7) return `${root}m7${slash}`;
      return `${root}m11${slash}`;
    }
    if (ctx === 'quintet_1965') {
      if (u < 0.45) return `${root}m9${slash}`;
      if (u < 0.72) return `${root}m11${slash}`;
      if (u < 0.88) return `${root}m7(b5)${slash}`;
      return `${root}m7${slash}`;
    }
    if (u < 0.6) return `${root}m7${slash}`;
    if (u < 0.8) return `${root}m9${slash}`;
    return `${root}m11${slash}`;
  }

  if (looksBareMajorOnTonic(symbol, tonicPc)) {
    const u = seededUnit(seed, bar, 992102);
    if (ctx === 'electric_1970') {
      if (u < 0.4) return `${root}7sus4${slash}`;
      if (u < 0.75) return `${root}7(#9)${slash}`;
      return `${root}13sus4${slash}`;
    }
    if (ctx === 'quintet_1965') {
      if (u < 0.42) return `${root}maj9(#11)${slash}`;
      if (u < 0.68) return `${root}maj7#11${slash}`;
      if (u < 0.85) return `${root}maj7${slash}`;
      return `${root}6/9${slash}`;
    }
    if (u < 0.5) return `${root}maj9(#11)${slash}`;
    if (u < 0.8) return `${root}maj7${slash}`;
    return `${root}6/9${slash}`;
  }

  if (ctx === 'electric_1970' && looksBareTriadOrSimple(symbol) && !looksBareMinor(symbol)) {
    const u = seededUnit(seed, bar, 992103);
    if (u < 0.4) return `${root}7sus4${slash}`;
    if (u < 0.75) return `${root}m7sus${slash}`;
    return `${root}7(#9)${slash}`;
  }

  return symbol;
}

function enrichMilesDavisDominant(symbol: string, seed: number, bar: number, ctx: MilesDavisContextMode): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 992201);

  if (ctx === 'modal_1959') {
    if (u < 0.55) return `${root}7(9,#11,13)${slash}`;
    if (u < 0.8) return `${root}7(b9)${slash}`;
    return `${root}9${slash}`;
  }
  if (ctx === 'quintet_1965') {
    if (u < 0.4) return `${root}7alt${slash}`;
    if (u < 0.75) return transposeChordRoot(`${root}7${slash}`, 6);
    return `${root}13${slash}`;
  }
  if (u < 0.5) return `${root}7sus4${slash}`;
  if (u < 0.85) return `${root}7(#9)${slash}`;
  return `${root}13${slash}`;
}

function enrichMilesDavisMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 992301);
  if (u < 0.55) return `${root}m7${slash}`;
  if (u < 0.8) return `${root}m9${slash}`;
  return `${root}m11${slash}`;
}

function inferModalCentreLabel(symbol: string, tonicPc: number | undefined): string {
  const rpc = harmonyRootPc(symbol);
  if (tonicPc !== undefined && rpc === tonicPc) {
    return isMinorishChord(symbol) ? 'Dorian' : 'Lydian/Mixolydian field';
  }
  return looksPlainDominantSeventh(symbol) ? 'Mixolydian' : 'Modal centre';
}

function applyModalCenterPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: MilesDavisContextMode,
  modalMap: Record<number, string>
): void {
  if (ctx !== 'modal_1959') return;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 993101) >= 0.85) continue;
    const sym = out[b - 1]!;
    modalMap[b] = inferModalCentreLabel(sym, tonicPc);
    receipts.push(`md:modal_center@bar${b}`);
  }
}

function applyTimeNoChangesPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: MilesDavisContextMode,
  timeNoChangesBars: number[]
): void {
  if (ctx !== 'quintet_1965') return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 993201) >= 0.45) continue;
    const sym = out[b - 1]!;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const u = seededUnit(seed, b, 993202);
    out[b - 1] = u < 0.55 ? `${root}7sus4${slash}` : `${root}sus4${slash}`;
    timeNoChangesBars.push(b);
    receipts.push(`md:time_no_changes@bar${b}`);
  }
}

function applyGrooveVampPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: MilesDavisContextMode,
  vampBars: number[]
): void {
  if (ctx !== 'electric_1970' || tb < 16) return;
  if (seededUnit(seed, 1, 993301) >= 0.75) return;
  const span = seededUnit(seed, 2, 993302) < 0.5 ? 16 : Math.min(32, tb);
  const start = 1 + Math.floor(seededUnit(seed, 3, 993303) * Math.max(0, tb - span));
  const anchor = out[start - 1] ?? out[0]!;
  const root = parseChordSymbol(anchor).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return;
  const slash = slashTail(anchor);
  const locked = seededUnit(seed, 4, 993304) < 0.5 ? `${root}7sus4${slash}` : `${root}m7${slash}`;
  const end = Math.min(tb, start + span - 1);
  for (let b = start; b <= end; b++) {
    if (isProtectedBar(b, context)) continue;
    out[b - 1] = locked;
    vampBars.push(b);
    receipts.push(`md:groove_vamp@bar${b}`);
  }
}

function applyCoolPhrasingPass(
  genMeta: GenerationMetadata & Record<string, unknown>,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  let any = false;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 993401) >= 0.55) continue;
    receipts.push(`md:cool_phrase@bar${b}`);
    any = true;
  }
  if (any) genMeta.milesDavisCoolMode = true;
}

function applyHarmonMuteColorPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const role = phraseRoleAtBar(b, positions);
    if (role !== 'phraseFinal' && seededUnit(seed, b, 993501) >= 0.35) continue;
    if (seededUnit(seed, b, 993502) >= 0.35) continue;
    const sym = out[b - 1]!;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const u = seededUnit(seed, b, 993503);
    if (looksMajorTonicColour(sym, inferTonicPitchClassFromBar1(context))) {
      out[b - 1] = u < 0.5 ? `${root}maj9(#11)${slash}` : `${root}6/9${slash}`;
    } else if (isMinorishChord(sym)) {
      out[b - 1] = u < 0.55 ? `${root}m9${slash}` : `${root}m11${slash}`;
    } else if (looksPlainDominantSeventh(sym)) {
      out[b - 1] = `${root}7(9,13)${slash}`;
    } else {
      continue;
    }
    receipts.push(`md:harmon_color@bar${b}`);
  }
}

export function isSongwriterMilesDavis(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'miles_davis' } {
  return genMeta?.songwriterStyleId === 'miles_davis';
}

export interface MilesDavisHarmonyAccumulator {
  barsConsidered: number;
  modalColourTouches: number;
  dominantColourTouches: number;
  minorColourTouches: number;
}

export function createMilesDavisHarmonyAccumulator(): MilesDavisHarmonyAccumulator {
  return {
    barsConsidered: 0,
    modalColourTouches: 0,
    dominantColourTouches: 0,
    minorColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: MilesDavisHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/m7|m9|m11|maj9|6\/9|sus/.test(t)) acc.modalColourTouches++;
  if (/7alt|7\(9|13|#11|b9|#9/.test(t)) acc.dominantColourTouches++;
  if (/m7|m9|m11/.test(t)) acc.minorColourTouches++;
}

export function accumulateMilesDavisHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: MilesDavisHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface MilesDavisAntiElaborationGuards {
  noopTonic: number;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Miles devices untouched.
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/** Piece-final tonic: maj9(#11) (Miles modal vocabulary; passes finalBarTension tonic-family). */
function spellMilesTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9(#11)`,
    receipt: `md:final_tonic_cadence@bar${bar}`,
  };
}

function forceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellMilesTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

function enforceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || chordLooksTonicFamily(sym)) return;
  const { symbol, receipt } = spellMilesTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/**
 * Precompute effective one chord per bar after Miles Davis slice devices (primary `miles_davis` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeMilesDavisEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const mdCtx: MilesDavisContextMode = genMeta.milesDavisContext ?? 'modal_1959';
  genMeta.milesDavisContext = mdCtx;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: MilesDavisAntiElaborationGuards = {
    noopTonic: 0,
  };

  const positions = computeMilesDavisPhrasePositions(tb, seed, mdCtx);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const rawIn = resolveBarSymbol(context, b).symbol;
    let sym = rawIn;
    sym = enrichMilesDavisTonic(sym, tonicPc, seed, b, mdCtx);
    sym = enrichMilesDavisDominant(sym, seed, b, mdCtx);
    sym = enrichMilesDavisMinor(sym, seed, b);
    if (sym === rawIn && looksBareMajorOnTonic(rawIn, tonicPc)) guards.noopTonic++;
    raw.push(sym);
  }

  const out = [...raw];
  const modalCenter: Record<number, string> = {};
  const timeNoChangesBars: number[] = [];
  const vampBars: number[] = [];

  applyModalCenterPass(out, seed, receipts, tb, context, mdCtx, modalCenter);
  applyTimeNoChangesPass(out, seed, receipts, tb, context, mdCtx, timeNoChangesBars);
  applyGrooveVampPass(out, seed, receipts, tb, context, mdCtx, vampBars);
  applyCoolPhrasingPass(genMeta, seed, receipts, tb, context);
  applyHarmonMuteColorPass(out, seed, receipts, tb, context, positions);

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.milesDavisEffectiveHarmonyBars = out;
  genMeta.milesDavisDeviceReceipts = receipts;
  genMeta.milesDavisAntiElaborationGuards = guards;
  genMeta.milesDavisModalCenterBars = Object.keys(modalCenter).length ? modalCenter : undefined;
  genMeta.milesDavisTimeNoChangesBars = timeNoChangesBars.length ? timeNoChangesBars : undefined;
  genMeta.milesDavisVampBars = vampBars.length ? vampBars : undefined;
}

export function finalizeMilesDavisMetadata(metadata: GenerationMetadata, acc: MilesDavisHarmonyAccumulator): void {
  const flat = [...(metadata.milesDavisDeviceReceipts ?? [])];
  const g = metadata.milesDavisAntiElaborationGuards ?? { noopTonic: 0 };
  const d = {
    songwriterId: 'miles_davis' as const,
    barsConsidered: acc.barsConsidered,
    modalColourTouches: acc.modalColourTouches,
    dominantColourTouches: acc.dominantColourTouches,
    minorColourTouches: acc.minorColourTouches,
    antiElaborationGuardTriggers: g.noopTonic,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Miles Davis (slice): modal≈${acc.modalColourTouches}`,
    `dom≈${acc.dominantColourTouches}`,
    `min≈${acc.minorColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.milesDavisDiagnostics = { ...d };
  metadata.milesDavisSliceReceipt = receipt;
}
