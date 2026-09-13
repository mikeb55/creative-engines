/**
 * Nile Rodgers — Chic funk-guitar harmony slice. Receipts **`nr:*`**.
 * Lead-sheet colour from riff VRB `chordQualitySet` (maj7 / min7 / dom9 / dom13 / 6·9 / sus2 / add9).
 * Riff VRB / funk-grid surfaces stay primary-only — this module owns **harmony** only.
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

export function isSongwriterNileRodgers(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'nile_rodgers' } {
  return genMeta?.songwriterStyleId === 'nile_rodgers';
}

/**
 * Harmonic-path gate — primary `nile_rodgers` **or** exact `harmonicVoice=nile_rodgers`.
 * Single-gate (no styleProfile) — Wave-C / jim_hall HV pattern.
 *
 * Exact id `nile_rodgers` only — soft `nile` stays songwriter-normalize / VRB BY_ID;
 * it does **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - Riff VRB / funk-grid `riffProfile`
 * - Guitar bar / rhythm overlay stamps
 */
export function isNileRodgersHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'nile_rodgers' || voice === 'nile_rodgers';
}

export interface NileRodgersHarmonyAccumulator {
  barsConsidered: number;
  chicColourTouches: number;
}

export function createNileRodgersHarmonyAccumulator(): NileRodgersHarmonyAccumulator {
  return { barsConsidered: 0, chicColourTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: NileRodgersHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj7|maj9|6\/9|69|add9|sus2|dom9|9|13/.test(t)) acc.chicColourTouches++;
}

export function accumulateNileRodgersHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: NileRodgersHarmonyAccumulator
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

/** Chic colour: maj7 / 6·9 / add9 / sus2 on majors; min7; 9/13 on dominants. */
function applyNileChicColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');

  if (/dim|ø|quartal|alt/.test(tl)) return symbol;

  if (/\bmaj7\b|maj9|Δ/.test(tl) && !/mmaj/.test(tl)) {
    if (/6\/9|69|add9|maj9/.test(tl)) return symbol;
    const u = seededUnit(seed, bar, 77110);
    return u < 0.45 ? `${root}6/9${slash}` : u < 0.75 ? `${root}maj9${slash}` : `${root}maj7${slash}`;
  }

  if ((/^m7|^m9/i.test(rest) || /\bm7\b/.test(tl)) && !/maj/.test(tl)) {
    if (/m9|m11/.test(tl)) return symbol;
    return `${root}m7${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    const u = seededUnit(seed, bar, 77113);
    return u < 0.55 ? `${root}9${slash}` : `${root}13${slash}`;
  }

  if (rest === '' || rest === 'maj' || rest === '6') {
    const u = seededUnit(seed, bar, 77114);
    if (u < 0.4) return `${root}maj7${slash}`;
    if (u < 0.7) return `${root}add9${slash}`;
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

function spellNileTonicCadence(bar: number, tonicPc: number): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return { symbol: `${nm}maj7`, receipt: `nr:final_tonic_cadence@bar${bar}` };
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
  const { symbol, receipt } = spellNileTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellNileTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/**
 * Precompute effective harmony — locked truth + Chic colour + **`nr:*`** receipts.
 * Call when {@link isNileRodgersHarmonicPath} (primary or exact HV).
 */
export function precomputeNileRodgersEffectiveHarmonyBars(context: CompositionContext): void {
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
      sym = applyNileChicColour(sym, seed, b);
      if (sym !== baseSym) receipts.push(`nr:chic_colour@bar${b}`);
    }
    out.push(sym);
  }

  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.nileRodgersEffectiveHarmonyBars = out;
  genMeta.nileRodgersDeviceReceipts = receipts;
}

export function finalizeNileRodgersMetadata(
  metadata: GenerationMetadata,
  acc: NileRodgersHarmonyAccumulator
): void {
  const flat = [...(metadata.nileRodgersDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'nile_rodgers' as const,
    barsConsidered: acc.barsConsidered,
    chicColourTouches: acc.chicColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Nile Rodgers (Chic funk harmony slice): colour≈${acc.chicColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.nileRodgersDiagnostics = { ...d };
  metadata.nileRodgersSliceReceipt = receipt;
}
