/**
 * Larry Carlton — fusion-funk guitar harmony slice. Receipts **`lc:*`**.
 * Lead-sheet colour from riff VRB `chordQualitySet` (sus2 / add9 / maj9 / dom9 / dom13 / min7 / maj7).
 * Riff VRB surfaces stay primary-only — this module owns **harmony** only.
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

export function isSongwriterLarryCarlton(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'larry_carlton' } {
  return genMeta?.songwriterStyleId === 'larry_carlton';
}

/**
 * Harmonic-path gate — primary `larry_carlton` **or** exact `harmonicVoice=larry_carlton`.
 * Single-gate (no styleProfile) — Wave-C / nile_rodgers HV pattern.
 *
 * Exact id `larry_carlton` only — soft `carlton` / `mr_335` stay songwriter-normalize / VRB BY_ID;
 * they do **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - Riff VRB / fusion-funk `riffProfile`
 */
export function isLarryCarltonHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'larry_carlton' || voice === 'larry_carlton';
}

export interface LarryCarltonHarmonyAccumulator {
  barsConsidered: number;
  fusionColourTouches: number;
}

export function createLarryCarltonHarmonyAccumulator(): LarryCarltonHarmonyAccumulator {
  return { barsConsidered: 0, fusionColourTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: LarryCarltonHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|add9|sus2|13|\b9\b|maj7/.test(t)) acc.fusionColourTouches++;
}

export function accumulateLarryCarltonHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: LarryCarltonHarmonyAccumulator
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

function applyLarryFusionColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');

  if (/dim|ø|quartal|alt/.test(tl)) return symbol;

  if (/\bmaj7\b|maj9|Δ/.test(tl) && !/mmaj/.test(tl)) {
    if (/maj9|add9/.test(tl)) return symbol;
    const u = seededUnit(seed, bar, 78110);
    return u < 0.6 ? `${root}maj9${slash}` : `${root}add9${slash}`;
  }

  if ((/^m7|^m9/i.test(rest) || /\bm7\b/.test(tl)) && !/maj/.test(tl)) {
    if (/m9/.test(tl)) return symbol;
    return seededUnit(seed, bar, 78111) < 0.5 ? `${root}m7${slash}` : `${root}m9${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    const u = seededUnit(seed, bar, 78113);
    return u < 0.5 ? `${root}9${slash}` : `${root}13${slash}`;
  }

  if (rest === '' || rest === 'maj') {
    const u = seededUnit(seed, bar, 78114);
    if (u < 0.4) return `${root}maj9${slash}`;
    if (u < 0.75) return `${root}add9${slash}`;
    return `${root}sus2${slash}`;
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

function spellLarryTonicCadence(bar: number, tonicPc: number): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return { symbol: `${nm}maj9`, receipt: `lc:final_tonic_cadence@bar${bar}` };
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
  const { symbol, receipt } = spellLarryTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellLarryTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function precomputeLarryCarltonEffectiveHarmonyBars(context: CompositionContext): void {
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
      sym = applyLarryFusionColour(sym, seed, b);
      if (sym !== baseSym) receipts.push(`lc:fusion_colour@bar${b}`);
    }
    out.push(sym);
  }

  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.larryCarltonEffectiveHarmonyBars = out;
  genMeta.larryCarltonDeviceReceipts = receipts;
}

export function finalizeLarryCarltonMetadata(
  metadata: GenerationMetadata,
  acc: LarryCarltonHarmonyAccumulator
): void {
  const flat = [...(metadata.larryCarltonDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'larry_carlton' as const,
    barsConsidered: acc.barsConsidered,
    fusionColourTouches: acc.fusionColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Larry Carlton (fusion-funk harmony slice): colour≈${acc.fusionColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.larryCarltonDiagnostics = { ...d };
  metadata.larryCarltonSliceReceipt = receipt;
}
