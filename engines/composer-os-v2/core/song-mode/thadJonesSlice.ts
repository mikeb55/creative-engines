/**
 * Thad Jones — extended common-practice big-band harmony slice (`tj:*` receipts).
 * Nonachord / poly-chord default stacks; SOLI vs SHOUT contrast; bebop-derived chromatic approaches.
 */

import type { CompositionContext, GenerationMetadata, ThadJonesPhaseMode } from '../compositionContext';
import { computeEllingtonPhrasePositions } from './dukeEllingtonSlice';
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

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

/** Research defaults — `buildReharmLensConfig('thad_jones')`, SOLI/SHOUT orchestration. */
export const THAD_JONES_SLICE_PARAMETERS = {
  coreDevice: 'extended_common_practice_big_band' as const,
  defaultPhase: 'swing' as ThadJonesPhaseMode,
  phaseComment:
    "'swing' = bebop-derived solis + nonachord shouts | 'ballad' = slow harmonic rhythm, lush nonachords | 'groove' = dominant vamp + dense upper-structure",
  nonachordBias: 0.7,
  nonachordComment: "// Thad's everyday voicing is what others treat as special effect",
  sideSlipRate: 0.35,
  shoutAlterationMultiplier: 1.8,
  bluesInflectionBias: 0.55,
  tritoneRate: 0.45,
  susBias: 0.1,
  chromaticMediantBias: 0.3,
  staticDominantBias: 0.2,
} as const;

function computeShoutStartBar(tb: number): number {
  let span: number;
  if (tb >= 32) span = 16;
  else if (tb >= 16) span = 8;
  else span = Math.max(4, Math.min(8, Math.floor(tb / 2)));
  span = Math.min(span, tb);
  return tb - span + 1;
}

export function resolveThadJonesPhase(genMeta: GenerationMetadata & Record<string, unknown>): ThadJonesPhaseMode {
  const raw = genMeta.thadPhase as ThadJonesPhaseMode | undefined;
  if (raw === 'swing' || raw === 'ballad' || raw === 'groove') return raw;
  return THAD_JONES_SLICE_PARAMETERS.defaultPhase;
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

/** Full maj-type nonachord stack — lead-sheet friendly symbols. */
function enrichThadMajorNonachord(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 771101);
  const sp = THAD_JONES_SLICE_PARAMETERS;
  if (u < sp.nonachordBias * 0.45) return `${root}maj13(#11)${slash}`;
  if (u < sp.nonachordBias * 0.78) return `${root}maj9(11,13)${slash}`;
  if (u < sp.nonachordBias * 0.95) return `${root}maj13${slash}`;
  return `${root}maj9${slash}`;
}

function enrichThadDominant(
  symbol: string,
  seed: number,
  bar: number,
  shout: boolean,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const mult = shout ? THAD_JONES_SLICE_PARAMETERS.shoutAlterationMultiplier : 1;
  const u = seededUnit(seed, bar, 771102);
  const thr = shout ? Math.min(0.98, 0.35 * mult * 0.5) : 0.35;
  if (u < thr * 0.45) return `${root}7(b9,#11,b13)${slash}`;
  if (u < thr * 0.78) return `${root}7alt${slash}`;
  if (u < thr * 0.92) return `${root}13(b9)${slash}`;
  if (phraseRoleAtBar(bar, positions) === 'phraseFinal' && !shout)
    return `${root}13(#11)${slash}`;
  return `${root}13${slash}`;
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

function enrichThadMinorMelodicMinorColour(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 771103);
  if (u < 0.4) return `${root}m9(11,13)${slash}`;
  if (u < 0.72) return `${root}m11${slash}`;
  if (u < 0.9) return `${root}m9(6)${slash}`;
  return `${root}m9${slash}`;
}

function applySideSlipPass(
  out: string[],
  shoutBars: Set<number>,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const rate = THAD_JONES_SLICE_PARAMETERS.sideSlipRate;
  for (let b = 1; b <= tb; b++) {
    if (!shoutBars.has(b) || isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 771201) >= rate) continue;
    const sym = stemOnly(out[b - 1]!);
    if (!looksPlainDominantSeventh(sym) && !/\b7\b|alt|13/.test(parseChordSymbol(sym).harmonyPart.toLowerCase())) continue;
    const rpc = harmonyRootPc(sym);
    if (rpc === undefined) continue;
    const dir = seededUnit(seed, b, 771202) < 0.5 ? 1 : -1;
    const newPc = (rpc + dir + 12) % 12;
    const newRoot = pitchClassToSharpName(newPc);
    out[b - 1] = replaceChordRoot(out[b - 1]!, newRoot);
    receipts.push(`tj:side_slip@bar${b}`);
  }
}

function applyBluesIvBorrowPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const ivPc = (tonicPc + 5) % 12;
  const bias = THAD_JONES_SLICE_PARAMETERS.bluesInflectionBias;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 771301) >= bias * 0.22) continue;
    const stem = stemOnly(out[b - 1]!);
    if (harmonyRootPc(stem) !== ivPc) continue;
    if (!looksMajorTonicColour(stem, ivPc)) continue;
    const hp = parseChordSymbol(stem).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    out[b - 1] = `${root}m9${slash}`;
    receipts.push(`tj:blues_ivm@bar${b}`);
  }
}

function applyPolyChordShoutPass(
  out: string[],
  shoutBars: Set<number>,
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (!shoutBars.has(b) || isProtectedBar(b, context)) continue;
    if (b % 4 !== 1) continue;
    if (seededUnit(seed, b, 771401) >= 0.28) continue;
    const sym = out[b - 1]!;
    const stem = stemOnly(sym);
    const rpc = harmonyRootPc(stem);
    if (rpc === undefined) continue;
    const bassPc = (rpc + 7) % 12;
    const slash = `/${pitchClassToSharpName(bassPc)}`;
    if (sym.includes('/')) continue;
    out[b - 1] = `${stem}${slash}`;
    receipts.push(`tj:poly_chord@bar${b}`);
  }
}

export function isSongwriterThadJones(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'thad_jones' } {
  return genMeta?.songwriterStyleId === 'thad_jones';
}

export interface ThadJonesHarmonyAccumulator {
  barsConsidered: number;
  nonachordTouches: number;
  shoutTouches: number;
  dominantAlterTouches: number;
}

export function createThadJonesHarmonyAccumulator(): ThadJonesHarmonyAccumulator {
  return {
    barsConsidered: 0,
    nonachordTouches: 0,
    shoutTouches: 0,
    dominantAlterTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: ThadJonesHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj13|maj9\(11|maj9\(11,13\)|maj13\(#11\)/.test(t) || (/maj9/.test(t) && /11|13/.test(t))) acc.nonachordTouches++;
  if (/alt|b9|#9|#11|b13/.test(t)) acc.dominantAlterTouches++;
}

export function accumulateThadJonesHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: ThadJonesHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeThadJonesEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];

  genMeta.thadResolvedPhase = resolveThadJonesPhase(genMeta);
  const phase = genMeta.thadResolvedPhase;

  const positions =
    phase === 'ballad'
      ? computeEllingtonPhrasePositions(tb, seed ^ 0xf00d)
      : computeEllingtonPhrasePositions(tb, seed);

  const shoutStart = computeShoutStartBar(tb);
  const shoutBars = new Set<number>();
  for (let b = shoutStart; b <= tb; b++) {
    shoutBars.add(b);
  }
  receipts.push(`tj:soli@bars1-${shoutStart - 1}`);
  receipts.push(`tj:shout@bars${shoutStart}-${tb}`);

  genMeta.thadJonesShoutBars = [...shoutBars].sort((a, b) => a - b);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = raw.map((s, i) => {
    const bar = i + 1;
    let sym = s;
    const shout = shoutBars.has(bar);
    sym = enrichThadMajorNonachord(sym, tonicPc, seed, bar);
    sym = enrichThadDominant(sym, seed, bar, shout, positions);
    sym = enrichThadMinorMelodicMinorColour(sym, seed, bar);
    return sym;
  });

  if (phase === 'groove') {
    for (let b = 1; b <= tb; b++) {
      if (isProtectedBar(b, context)) continue;
      if (seededUnit(seed, b, 771501) >= 0.55) continue;
      const stem = stemOnly(out[b - 1]!);
      const rpc = harmonyRootPc(stem);
      if (rpc === undefined || tonicPc === undefined) continue;
      if (rpc !== (tonicPc + 7) % 12) continue;
      const root = parseChordSymbol(stem).harmonyPart.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(out[b - 1]!);
      out[b - 1] = `${root}13(#11)${slash}`;
      receipts.push(`tj:groove_vamp@bar${b}`);
    }
  }

  applySideSlipPass(out, shoutBars, seed, receipts, tb, context);
  applyBluesIvBorrowPass(out, tonicPc, seed, receipts, tb, context);
  applyPolyChordShoutPass(out, shoutBars, tonicPc, seed, receipts, tb, context);

  genMeta.thadJonesEffectiveHarmonyBars = out;
  genMeta.thadJonesDeviceReceipts = receipts;
}

export function finalizeThadJonesMetadata(metadata: GenerationMetadata, acc: ThadJonesHarmonyAccumulator): void {
  const flat = [...(metadata.thadJonesDeviceReceipts ?? [])];
  const shoutN = metadata.thadJonesShoutBars?.length ?? 0;
  const sp = THAD_JONES_SLICE_PARAMETERS;
  metadata.thadJonesDiagnostics = {
    songwriterId: 'thad_jones',
    thadResolvedPhase: metadata.thadResolvedPhase ?? sp.defaultPhase,
    sliceParameters: {
      nonachordBias: sp.nonachordBias,
      sideSlipRate: sp.sideSlipRate,
      shoutAlterationMultiplier: sp.shoutAlterationMultiplier,
      bluesInflectionBias: sp.bluesInflectionBias,
      defaultPhase: sp.defaultPhase,
    },
    barsConsidered: acc.barsConsidered,
    nonachordTouches: acc.nonachordTouches,
    shoutTouches: shoutN,
    dominantAlterTouches: acc.dominantAlterTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.thadJonesSliceReceipt = [
    `Thad Jones (big-band slice): phase=${metadata.thadResolvedPhase ?? sp.defaultPhase}`,
    `nonachord≈${acc.nonachordTouches}`,
    `shout=${shoutN}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
