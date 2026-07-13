/**
 * Sammy Nestico — Basie-school chart clarity / kicks / riff punches (`sn:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

/**
 * Exact id `sammy_nestico` only — soft `nestico` stays songwriter-normalize;
 * does **not** engage HV. BB Nestico chart surfaces stay primary-only.
 */
export function isSammyNesticoHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'sammy_nestico' || voice === 'sammy_nestico';
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function enrichFunctionalDominant(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  const root = m?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase();
  if (!/^[a-g][#b]?7/.test(tl.replace(/\s/g, '')) && !/dom/.test(tl)) return symbol;
  const slash = slashTail(symbol);
  if (seededUnit(seed, bar, 881101) < 0.38) return `${root}13${slash}`;
  return symbol;
}

function applyKickFigureReceipts(tb: number, seed: number, receipts: string[]): void {
  for (let b = 2; b <= tb; b += 4) {
    if (seededUnit(seed, b, 881201) < 0.55) receipts.push(`sn:kick_align@bar${b}`);
  }
}

export function isSongwriterSammyNestico(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'sammy_nestico' } {
  return genMeta?.songwriterStyleId === 'sammy_nestico';
}

export interface SammyNesticoHarmonyAccumulator {
  barsConsidered: number;
  dominantTouches: number;
  extensionTouches: number;
}

export function createSammyNesticoHarmonyAccumulator(): SammyNesticoHarmonyAccumulator {
  return { barsConsidered: 0, dominantTouches: 0, extensionTouches: 0 };
}

function scanChord(chord: string, acc: SammyNesticoHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/^([a-g][#b]?)?7|dom|13|9/.test(t)) acc.dominantTouches++;
  if (/maj9|m11|6\/9|13/.test(t)) acc.extensionTouches++;
}

export function accumulateSammyNesticoHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: SammyNesticoHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeSammyNesticoMetadata(metadata: GenerationMetadata, acc: SammyNesticoHarmonyAccumulator): void {
  const flat = [...(metadata.sammyNesticoDeviceReceipts ?? [])];
  metadata.sammyNesticoDiagnostics = {
    songwriterId: 'sammy_nestico',
    barsConsidered: acc.barsConsidered,
    dominantTouches: acc.dominantTouches,
    extensionTouches: acc.extensionTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.sammyNesticoSliceReceipt = [
    `Nestico (slice): dom≈${acc.dominantTouches}`,
    `ext≈${acc.extensionTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeSammyNesticoEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const sym = enrichFunctionalDominant(out[i]!, seed, bar);
    if (sym !== out[i]) receipts.push(`sn:functional_clarity@bar${bar}`);
    out[i] = sym;
  }

  applyKickFigureReceipts(tb, seed, receipts);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 881301) < 0.22) receipts.push(`sn:riff_punch@bar${b}`);
  }

  /* Piece-final only: Basie-school tonic maj9 + safety net (standard tonic-force; mid-piece unchanged). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.sammyNesticoEffectiveHarmonyBars = out;
  genMeta.sammyNesticoDeviceReceipts = receipts;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Nestico devices untouched.
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

/** Piece-final tonic: maj9 — Nestico chart clarity / Basie-school landing. */
function spellSammyNesticoTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9`,
    receipt: `sn:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellSammyNesticoTonicCadence(totalBars, tonicPc);
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
  if (chordLooksTonicFamily(out[idx]!)) return;
  const { symbol, receipt } = spellSammyNesticoTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|enforce`);
}
