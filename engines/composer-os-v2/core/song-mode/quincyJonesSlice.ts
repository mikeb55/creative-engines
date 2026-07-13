/**
 * Quincy Jones — tight brass / pop–jazz crossover / rhythmic precision (`qj:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

export const QUINCY_JONES_HARMONIC_VOICE_IDS = ['quincy_jones', 'quincy_jones_film'] as const;

export function isQuincyJonesHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'quincy_jones' || id === 'quincy_jones_film';
}

/**
 * Exact `quincy_jones` or film twin `quincy_jones_film` only.
 * Soft `quincy` (ALIASES → quincy_jones) does **not** engage HV.
 * BB Quincy / film profile surfaces stay primary-only holdbacks.
 */
export function isQuincyJonesHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isQuincyJonesHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isQuincyJonesHarmonicVoiceId(metadata?.harmonicVoice)
  );
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

/** Soul–crossover colour on dominants / majors where palette stays readable on weak beats. */
function crossoverColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase().replace(/\s/g, '');
  const slash = slashTail(symbol);
  if (/maj|Δ/.test(tl) && seededUnit(seed, bar, 887101) < 0.35) {
    return `${root}maj9${slash}`;
  }
  if (/^([a-g][#b]?)?m7|min7/.test(tl) && seededUnit(seed, bar, 887102) < 0.32) {
    return `${root}m9${slash}`;
  }
  if (/^([a-g][#b]?)?7|dom/.test(tl) && seededUnit(seed, bar, 887103) < 0.38) {
    return `${root}13${slash}`;
  }
  return symbol;
}

export function isSongwriterQuincyJones(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'quincy_jones' } {
  return genMeta?.songwriterStyleId === 'quincy_jones';
}

export interface QuincyJonesHarmonyAccumulator {
  barsConsidered: number;
  soulTouches: number;
  swingTouches: number;
  orchestralTouches: number;
}

export function createQuincyJonesHarmonyAccumulator(): QuincyJonesHarmonyAccumulator {
  return { barsConsidered: 0, soulTouches: 0, swingTouches: 0, orchestralTouches: 0 };
}

function scanChord(chord: string, acc: QuincyJonesHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|m9|sus9|add9|13/.test(t)) acc.soulTouches++;
  if (/m7|maj9|13|9\b/.test(t)) acc.swingTouches++;
  if (/maj7|maj13|#11|maj9\(/.test(t)) acc.orchestralTouches++;
}

export function accumulateQuincyJonesHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: QuincyJonesHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeQuincyJonesMetadata(metadata: GenerationMetadata, acc: QuincyJonesHarmonyAccumulator): void {
  const flat = [...(metadata.quincyJonesDeviceReceipts ?? [])];
  metadata.quincyJonesDiagnostics = {
    songwriterId: 'quincy_jones',
    barsConsidered: acc.barsConsidered,
    soulTouches: acc.soulTouches,
    swingTouches: acc.swingTouches,
    orchestralTouches: acc.orchestralTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.quincyJonesSliceReceipt = [
    `Quincy (slice): soul≈${acc.soulTouches}`,
    `swing≈${acc.swingTouches}`,
    `orch≈${acc.orchestralTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeQuincyJonesEffectiveHarmonyBars(context: CompositionContext): void {
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
    const before = out[i]!;
    const after = crossoverColour(before, seed, bar);
    if (after !== before) {
      out[i] = after;
      receipts.push(`qj:crossover_colour@bar${bar}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887201) < 0.28) receipts.push(`qj:tight_brass_kick@bar${b}`);
    if (seededUnit(seed, b, 887301) < 0.26) receipts.push(`qj:call_response@bar${b}`);
    if (seededUnit(seed, b, 887401) < 0.24) receipts.push(`qj:rhythm_precision@bar${b}`);
    if (seededUnit(seed, b, 887501) < 0.2) receipts.push(`qj:orchestral_lift@bar${b}`);
  }

  /* Piece-final only: force tonic maj9 + safety net (Wayne fBT pattern; mid-piece unchanged). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.quincyJonesEffectiveHarmonyBars = out;
  genMeta.quincyJonesDeviceReceipts = receipts;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece crossover colour untouched.
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
 * Piece-final tonic: maj9 (Quincy crossover major colour).
 * Avoid bare maj13 — FBT `13` proxy treats it as dominant-family.
 */
function spellQuincyJonesTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9`,
    receipt: `qj:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellQuincyJonesTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellQuincyJonesTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}
