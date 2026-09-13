/**
 * Wes Montgomery — singing jazz-guitar harmony slice. Receipts **`wm:*`**.
 * Lead-sheet colour from riff VRB `chordQualitySet` (dom7 / min7 / maj7 / min9 / dom9 / sus4 / m7b5).
 * Mosaic dispatch still remaps to `jim_hall` (holdback). Riff VRB stays primary-only.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

export function isSongwriterWesMontgomery(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'wes_montgomery' } {
  return genMeta?.songwriterStyleId === 'wes_montgomery';
}

/**
 * Harmonic-path gate — primary `wes_montgomery` **or** exact `harmonicVoice=wes_montgomery`.
 * Single-gate (no styleProfile) — Wave-C / jim_hall HV pattern.
 *
 * Exact id `wes_montgomery` only — soft `wes` / `montgomery` stay songwriter-normalize;
 * they do **not** engage HV.
 *
 * Mosaic DISPATCH_STUB_ALIASES `wes_montgomery → jim_hall` stay (holdback).
 */
export function isWesMontgomeryHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'wes_montgomery' || voice === 'wes_montgomery';
}

export interface WesMontgomeryHarmonyAccumulator {
  barsConsidered: number;
  octaveColourTouches: number;
}

export function createWesMontgomeryHarmonyAccumulator(): WesMontgomeryHarmonyAccumulator {
  return { barsConsidered: 0, octaveColourTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: WesMontgomeryHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj7|maj9|m9|\b9\b|sus4/.test(t)) acc.octaveColourTouches++;
}

export function accumulateWesMontgomeryHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: WesMontgomeryHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function applyWesOctaveColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');

  if (/dim|ø|quartal|alt/.test(tl)) return symbol;

  if (/\bmaj7\b|maj9|Δ/.test(tl) && !/mmaj/.test(tl)) {
    if (/maj9/.test(tl)) return symbol;
    return `${root}maj7${slash}`;
  }

  if ((/^m7|^m9/i.test(rest) || /\bm7\b/.test(tl)) && !/maj/.test(tl)) {
    if (/m9/.test(tl)) return symbol;
    return seededUnit(seed, bar, 79111) < 0.55 ? `${root}m9${slash}` : `${root}m7${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    const u = seededUnit(seed, bar, 79113);
    if (u < 0.4) return `${root}9${slash}`;
    if (u < 0.7) return `${root}7${slash}`;
    return `${root}7sus4${slash}`;
  }

  if (rest === '' || rest === 'maj') {
    return seededUnit(seed, bar, 79114) < 0.6 ? `${root}maj7${slash}` : `${root}maj9${slash}`;
  }

  return symbol;
}

function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

function spellWesTonicCadence(bar: number, tonicPc: number): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return { symbol: `${nm}maj9`, receipt: `wm:final_tonic_cadence@bar${bar}` };
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
  const { symbol, receipt } = spellWesTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellWesTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function precomputeWesMontgomeryEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const baseSym = resolveBarSymbol(context, b).symbol;
    let sym = baseSym;
    if (!isProtectedBar(b, context)) {
      sym = applyWesOctaveColour(sym, seed, b);
      if (sym !== baseSym) receipts.push(`wm:octave_colour@bar${b}`);
    }
    out.push(sym);
  }

  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.wesMontgomeryEffectiveHarmonyBars = out;
  genMeta.wesMontgomeryDeviceReceipts = receipts;
}

export function finalizeWesMontgomeryMetadata(
  metadata: GenerationMetadata,
  acc: WesMontgomeryHarmonyAccumulator
): void {
  const flat = [...(metadata.wesMontgomeryDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'wes_montgomery' as const,
    barsConsidered: acc.barsConsidered,
    octaveColourTouches: acc.octaveColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Wes Montgomery (jazz-guitar harmony slice): colour≈${acc.octaveColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.wesMontgomeryDiagnostics = { ...d };
  metadata.wesMontgomerySliceReceipt = receipt;
}
