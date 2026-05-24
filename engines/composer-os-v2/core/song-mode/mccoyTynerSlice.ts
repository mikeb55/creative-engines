/**
 * McCoy Tyner — quartal stacks, pentatonic clusters, modal minor fields, IV-rooted quartal over minor tonality.
 * Receipts **`mt:*`** (McCoy Tyner). Distinct from Herbie Hancock (lighter sus/colouristic) and generic tertian fallback.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

export const MCCOY_TYNER_SLICE_PARAMETERS = {
  quartalBias: 0.92,
  pentatonicBias: 0.78,
  modalMinorBias: 0.85,
  ivQuartalRate: 0.52,
  tritoneRate: 0.12,
  susBias: 0.9,
  chromaticMediantBias: 0.35,
  staticDominantBias: 0.25,
  voicingNotes:
    'Quartal m11/sus4 stacks; pentatonic sus9 clusters; modal minor pedals; IV-degree quartal bass on minor tonality',
} as const;

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

function symbolLooksMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|dim|ø/.test(hp)) return false;
  return /\bm(?!aj)|min|m7|m9|m11|m6/.test(hp);
}

function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)/.test(tl)) return false;
  if (/sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

export function isSongwriterMccoyTyner(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'mccoy_tyner' } {
  return genMeta?.songwriterStyleId === 'mccoy_tyner';
}

export interface MccoyTynerHarmonyAccumulator {
  barsConsidered: number;
  quartalTouches: number;
  pentatonicTouches: number;
  ivQuartalTouches: number;
  modalMinorTouches: number;
}

export function createMccoyTynerHarmonyAccumulator(): MccoyTynerHarmonyAccumulator {
  return {
    barsConsidered: 0,
    quartalTouches: 0,
    pentatonicTouches: 0,
    ivQuartalTouches: 0,
    modalMinorTouches: 0,
  };
}

export function accumulateMccoyTynerHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: MccoyTynerHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/m11|sus4|sus9|sus\b|quartal/.test(t)) acc.quartalTouches++;
  if (/sus9|6\/9|add9|add2/.test(t)) acc.pentatonicTouches++;
  if (/mt:iv|\/[a-g#b]/i.test(c) || /m11\/|sus4\//.test(c)) acc.ivQuartalTouches++;
  if (/m11|m9|m7|m6/.test(t) && !/maj/.test(t)) acc.modalMinorTouches++;
}

/** Modal minor shells (m7/m9) → quartal m11/sus4 — McCoy comping palette. */
function colourModalMinorToQuartal(symbol: string, seed: number, bar: number): string {
  if (!symbolLooksMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/m11|sus4|sus9|quartal/.test(tl)) return symbol;
  const slash = slashTail(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 661011);
  if (u < 0.58) return `${root}m11${slash}`;
  if (u < 0.84) return `${root}sus4${slash}`;
  return `${root}sus9${slash}`;
}

/** Bare tertians → Tyner quartal palette (heavy m11/sus, not Evans tertian maj7). */
function colourBareTertianToQuartal(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/m11|sus4|sus9|quartal|6\/9/.test(tl)) return symbol;
  if (symbolLooksMinor(symbol)) return colourModalMinorToQuartal(symbol, seed, bar);
  if (/[79]|maj|dim|ø|alt|m13|add/.test(rest) && rest !== '' && rest !== 'm') return symbol;

  const u = seededUnit(seed, bar, 661010);
  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    if (u < 0.5) return `${root}m11${slash}`;
    if (u < 0.82) return `${root}sus4${slash}`;
    return `${root}m9${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    if (u < 0.55) return `${root}sus9${slash}`;
    if (u < 0.78) return `${root}6/9${slash}`;
    return `${root}maj7#11${slash}`;
  }
  return symbol;
}

/** Plain V7 → 9sus4 / 13sus4 (McCoy comping colour, not functional alt). */
function colourPlainDominantToSus(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 661020);
  if (u < 0.62) return `${root}9sus4${slash}`;
  if (u < 0.88) return `${root}13sus4${slash}`;
  return `${root}7sus4${slash}`;
}

/** Pentatonic cluster pass — sus9 / add9 on quartal bases. */
function applyPentatonicClusterPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 661101) >= MCCOY_TYNER_SLICE_PARAMETERS.pentatonicBias * 0.55) continue;
    const sym = out[b - 1]!;
    const hp = parseChordSymbol(sym).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) continue;
    const root = m[1];
    const slash = slashTail(sym);
    const u = seededUnit(seed, b, 661102);
    if (u < 0.5) {
      out[b - 1] = `${root}sus9${slash}`;
      receipts.push(`mt:pentatonic_cluster@bar${b}`);
    } else {
      out[b - 1] = `${root}6/9${slash}`;
      receipts.push(`mt:pentatonic_six_nine@bar${b}`);
    }
  }
}

/** IV-rooted quartal stacks when minor tonality (subdominant quartal anchor). */
function applyIvQuartalOverMinor(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const bar1Minor = symbolLooksMinor(out[0] ?? '');
  if (!bar1Minor) return;
  const ivPc = (tonicPc + 5) % 12;
  const ivName = pitchClassToSharpName(ivPc);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const phraseStart = (b - 1) % 4 === 0;
    const ivThreshold = phraseStart ? 0.38 : MCCOY_TYNER_SLICE_PARAMETERS.ivQuartalRate;
    if (seededUnit(seed, b, 661201) >= ivThreshold) continue;
    const sym = out[b - 1]!;
    if (!symbolLooksMinor(sym) && !phraseStart) continue;
    const u = seededUnit(seed, b, 661202);
    if (u < 0.48) {
      out[b - 1] = `${ivName}m11`;
      receipts.push(`mt:iv_quartal@bar${b}`);
    } else if (u < 0.76) {
      out[b - 1] = `${ivName}sus4`;
      receipts.push(`mt:iv_quartal@bar${b}`);
    } else {
      const upperPc = (ivPc + 7) % 12;
      out[b - 1] = `${pitchClassToSharpName(upperPc)}m11/${ivName}`;
      receipts.push(`mt:iv_quartal_stack@bar${b}`);
    }
  }
}

/** Long modal minor pedals — m11 fields on phrase starts. */
function applyModalMinorPedalPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const role = (b - 1) % 4;
    if (role !== 0 && seededUnit(seed, b, 661301) >= MCCOY_TYNER_SLICE_PARAMETERS.modalMinorBias) continue;
    const sym = out[b - 1]!;
    if (!symbolLooksMinor(sym) && (tonicPc === undefined || harmonyRootPc(sym) !== tonicPc)) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    out[b - 1] = `${root}m11${slash}`;
    receipts.push(`mt:modal_minor_pedal@bar${b}`);
  }
}

/**
 * Precompute effective harmony — primary **`mccoy_tyner`** only.
 */
export function precomputeMccoyTynerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = colourModalMinorToQuartal(sym, seed, b);
    sym = colourBareTertianToQuartal(sym, seed, b);
    sym = colourPlainDominantToSus(sym, seed, b);
    out.push(sym);
  }

  applyModalMinorPedalPass(out, tonicPc, seed, receipts, tb, context);
  applyIvQuartalOverMinor(out, tonicPc, seed, receipts, tb, context);
  applyPentatonicClusterPass(out, seed, receipts, tb, context);

  genMeta.mccoyTynerEffectiveHarmonyBars = out;
  genMeta.mccoyTynerDeviceReceipts = receipts.length ? receipts : undefined;
}

function scanEffectiveBarsForMcCoyDiagnostics(eff: string[]): {
  quartalTouches: number;
  pentatonicTouches: number;
  ivQuartalTouches: number;
  modalMinorTouches: number;
} {
  let quartalTouches = 0;
  let pentatonicTouches = 0;
  let ivQuartalTouches = 0;
  let modalMinorTouches = 0;
  for (const sym of eff) {
    const t = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/m11|sus4|sus9|sus\b|quartal/.test(t)) quartalTouches++;
    if (/sus9|6\/9|add9|add2/.test(t)) pentatonicTouches++;
    if (/m11\/|sus4\//.test(sym) || /^[A-G#b]+m11$/.test(sym.replace(/\s/g, ''))) {
      ivQuartalTouches++;
    }
    if (/m11|m9|m7|m6/.test(t) && !/maj/.test(t)) modalMinorTouches++;
  }
  return { quartalTouches, pentatonicTouches, ivQuartalTouches, modalMinorTouches };
}

export function finalizeMccoyTynerMetadata(
  metadata: GenerationMetadata,
  acc: MccoyTynerHarmonyAccumulator
): void {
  const flat = [...(metadata.mccoyTynerDeviceReceipts ?? [])];
  const ivFromReceipts = flat.filter((r) => r.includes('mt:iv_quartal')).length;
  const eff = metadata.mccoyTynerEffectiveHarmonyBars ?? [];
  const scanned = eff.length ? scanEffectiveBarsForMcCoyDiagnostics(eff) : null;
  const quartalTouches = scanned?.quartalTouches ?? acc.quartalTouches;
  const pentatonicTouches = scanned?.pentatonicTouches ?? acc.pentatonicTouches;
  const ivQuartalTouches = Math.max(ivFromReceipts, scanned?.ivQuartalTouches ?? acc.ivQuartalTouches);
  const modalMinorTouches = scanned?.modalMinorTouches ?? acc.modalMinorTouches;
  const d = {
    songwriterId: 'mccoy_tyner' as const,
    sliceParameters: {
      quartalBias: MCCOY_TYNER_SLICE_PARAMETERS.quartalBias,
      pentatonicBias: MCCOY_TYNER_SLICE_PARAMETERS.pentatonicBias,
      modalMinorBias: MCCOY_TYNER_SLICE_PARAMETERS.modalMinorBias,
      ivQuartalRate: MCCOY_TYNER_SLICE_PARAMETERS.ivQuartalRate,
      tritoneRate: MCCOY_TYNER_SLICE_PARAMETERS.tritoneRate,
      susBias: MCCOY_TYNER_SLICE_PARAMETERS.susBias,
    },
    barsConsidered: Math.max(acc.barsConsidered, eff.length),
    quartalTouches,
    pentatonicTouches,
    ivQuartalTouches,
    modalMinorTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.mccoyTynerDiagnostics = d;
  metadata.mccoyTynerSliceReceipt = [
    `McCoy Tyner (quartal/modal slice): quartal≈${quartalTouches}`,
    `pentatonic≈${pentatonicTouches}`,
    `ivQuartal≈${ivQuartalTouches}`,
    `modalMinor≈${modalMinorTouches}`,
    `bars=${d.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
