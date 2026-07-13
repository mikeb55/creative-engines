/**
 * Gil Evans — cool-orchestration modal colour Song Mode / duo harmony slice (`ge:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `gil_evans` only — soft `evans` removed from songwriter ALIASES
 * (was colliding with BY_ID `evans` → BILL_EVANS). Soft never engages HV.
 * BB Gil arranger / style-profile holdbacks untouched.
 */
export function isGilEvansHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'gil_evans' || voice === 'gil_evans';
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

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest);
}

function enrichCoolModalTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 772001);
  if (u < 0.38) return `${root}maj7(#11)${slash}`;
  if (u < 0.72) return `${root}maj9(#11)${slash}`;
  return `${root}maj13sus${slash}`;
}

function enrichCoolDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 772002);
  if (u < 0.42) return `${root}13sus(b9)${slash}`;
  if (u < 0.78) return `${root}7sus(b9,13)${slash}`;
  return `${root}9(sus4)${slash}`;
}

function applyChromaticSideSlip(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number
): void {
  if (tonicPc === undefined) return;
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    if (bar % 8 !== 0 || bar >= tb) continue;
    const u = seededUnit(seed, bar, 772003);
    if (u > 0.38) continue;
    const sym = out[i]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const nr = (r + (u < 0.19 ? 5 : 6) + 12) % 12;
    out[i] = replaceChordRoot(sym, pitchClassToSharpName(nr));
    receipts.push(`ge:sideslip@${bar}`);
  }
}

export function isSongwriterGilEvans(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'gil_evans' } {
  return genMeta?.songwriterStyleId === 'gil_evans';
}

export interface GilEvansHarmonyAccumulator {
  barsConsidered: number;
  modalTouches: number;
  susTouches: number;
  sideSlipTouches: number;
}

export function createGilEvansHarmonyAccumulator(): GilEvansHarmonyAccumulator {
  return { barsConsidered: 0, modalTouches: 0, susTouches: 0, sideSlipTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: GilEvansHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const tl = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/#11|maj9/.test(tl)) acc.modalTouches++;
  if (/sus/.test(tl)) acc.susTouches++;
}

export function accumulateGilEvansHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: GilEvansHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeGilEvansEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    let sym = out[i]!;
    const before = sym;
    sym = enrichCoolModalTonic(sym, tonicPc, seed, bar);
    sym = enrichCoolDominant(sym, seed, bar);
    if (sym !== before) receipts.push(`ge:colour@${bar}`);
    out[i] = sym;
  }

  applyChromaticSideSlip(out, tonicPc, seed, receipts, tb);
  for (const r of receipts) {
    if (r.startsWith('ge:sideslip@')) {
      /* counted in receipts length */
    }
  }

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.gilEvansEffectiveHarmonyBars = out;
  genMeta.gilEvansDeviceReceipts = receipts;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Gil Evans colour untouched.
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

/**
 * Piece-final tonic: maj9(#11) — enrichCoolModalTonic cool-modal pool
 * (maj7(#11) · maj9(#11); avoid maj13sus digit-`13` FBT trap).
 */
function spellGilEvansTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9(#11)`,
    receipt: `ge:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellGilEvansTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellGilEvansTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizeGilEvansMetadata(metadata: GenerationMetadata, acc: GilEvansHarmonyAccumulator): void {
  const flat = [...(metadata.gilEvansDeviceReceipts ?? [])];
  const sideSlips = flat.filter((r) => r.startsWith('ge:sideslip@')).length;
  metadata.gilEvansDiagnostics = {
    songwriterId: 'gil_evans',
    barsConsidered: acc.barsConsidered,
    modalTouches: acc.modalTouches,
    susTouches: acc.susTouches,
    sideSlipTouches: sideSlips,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.gilEvansSliceReceipt = [
    `Gil Evans (cool-orchestration slice): modal≈${acc.modalTouches}`,
    `sus≈${acc.susTouches}`,
    `sideslip=${sideSlips}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
