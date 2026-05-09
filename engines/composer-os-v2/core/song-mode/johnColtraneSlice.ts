/**
 * John Coltrane — three-tonic (augmented-triad) harmonic motion + optional modal quartal pedals.
 * Receipts **`jc:*`** · phase **`changes`** (dense third-cycle moves) vs **`modal`** (long vamp).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

export type ColtranePhase = 'changes' | 'modal';

/** Symbol-level defaults aligned with reharm lens + research brief. */
export const COLTRANE_SLICE_PARAMETERS = {
  coreDevice: 'three_tonic_augmented_cycle',
  tensionMaj: '#11 Lydian maj7',
  tensionDom: 'b9/#9/#11 altered',
  tensionMinorVamp: 'quartal / m11',
  tritoneRate: 0.15,
  susBias: 0.5,
  chromaticMediantBias: 0.95,
  staticDominantBias: 0.1,
  /** `'changes'` = dense third-cycle harmony each bar · `'modal'` = long min7/sus vamp, quartal pedal */
  defaultPhase: 'changes' as ColtranePhase,
  harmonicDensityChanges: { chordsPerBar: 2 as const },
  harmonicDensityModal: { chordsPerBar: 0.25 as const },
  voicingNotes: 'Lydian maj7 tonics; altered dominants; quartal minor stacks',
  vaultPhraseTemplates: ['ascending_thirds', 'quartal'] as const,
} as const;

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

/** Three major-third centres partitioning the octave (Coltrane substitution lattice). */
export function coltraneThreeTonicCycle(rootPc: number): readonly [number, number, number] {
  const r = ((rootPc % 12) + 12) % 12;
  return [r, (r + 4) % 12, (r + 8) % 12] as const;
}

export function isSongwriterJohnColtrane(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'john_coltrane' } {
  return genMeta?.songwriterStyleId === 'john_coltrane';
}

function resolveColtranePhase(genMeta: GenerationMetadata & Record<string, unknown>, seed: number): ColtranePhase {
  const raw = genMeta.coltranePhase;
  if (raw === 'changes' || raw === 'modal') return raw;
  /* Explore modal ~18% when unset — default remains **changes** per brief */
  return seededUnit(seed, 0, 993001) < 0.18 ? 'modal' : 'changes';
}

function rawChordLooksDominant(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj7|mmaj|dim|ø/.test(hp)) return false;
  if (/\bm(?!aj)/.test(hp) && !/maj/.test(hp)) return false;
  return /\b7|alt|9|11|13|6\/|sus/.test(hp) || /([^a-z]|^)7([^a-z0-9]|$)/.test(hp);
}

function rawChordLooksMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bm(?!aj)|min/.test(hp);
}

function spellChangesBar(
  bar: number,
  cycle: readonly [number, number, number],
  rawSym: string,
  seed: number
): { symbol: string; receipt?: string } {
  const step = (bar - 1) % 3;
  const rpc = cycle[step]!;
  const nm = pitchClassToSharpName(rpc);
  const u = seededUnit(seed, bar, 992010);
  if (rawChordLooksDominant(rawSym)) {
    return {
      symbol: u < 0.55 ? `${nm}7alt` : `${nm}7b9#11`,
      receipt: `jc:third_cycle_dom@bar${bar}`,
    };
  }
  if (rawChordLooksMinor(rawSym)) {
    return {
      symbol: u < 0.58 ? `${nm}m11` : `${nm}sus4`,
      receipt: `jc:quartal_minor@bar${bar}`,
    };
  }
  return {
    symbol: `${nm}maj7#11`,
    receipt: `jc:lydian_centre@bar${bar}`,
  };
}

function spellModalBar(
  bar: number,
  tonicPc: number,
  cycle: readonly [number, number, number],
  seed: number
): { symbol: string; receipt?: string } {
  const iiPc = (tonicPc + 2) % 12;
  const nm = pitchClassToSharpName(iiPc);
  const block = Math.floor((bar - 1) / 8);
  const colourPc = cycle[block % 3]!;
  const bassColour = pitchClassToSharpName(colourPc);
  const u = seededUnit(seed, block + bar, 992020);
  if (u < 0.42) return { symbol: `${nm}m11`, receipt: `jc:modal_pedal@bar${bar}` };
  if (u < 0.72) return { symbol: `${nm}sus4`, receipt: `jc:modal_sus@bar${bar}` };
  return { symbol: `${nm}m11/${bassColour}`, receipt: `jc:modal_superimposed_M3@bar${bar}` };
}

export interface JohnColtraneHarmonyAccumulator {
  barsConsidered: number;
  thirdCycleTouches: number;
  lydianTonicTouches: number;
  alteredDominantTouches: number;
  modalPedalTouches: number;
}

export function createJohnColtraneHarmonyAccumulator(): JohnColtraneHarmonyAccumulator {
  return {
    barsConsidered: 0,
    thirdCycleTouches: 0,
    lydianTonicTouches: 0,
    alteredDominantTouches: 0,
    modalPedalTouches: 0,
  };
}

export function accumulateJohnColtraneHarmonyDiagnostics(
  _prev: string | undefined,
  current: string,
  acc: JohnColtraneHarmonyAccumulator
): void {
  const c = current.trim();
  if (!c) return;
  acc.barsConsidered++;
  acc.thirdCycleTouches++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj7#11|maj9#11|Δ#11/.test(t) || (/maj7/.test(t) && /#11/.test(t))) acc.lydianTonicTouches++;
  if (/7alt|7b9/.test(t)) acc.alteredDominantTouches++;
  if (/m11|sus4/.test(t) || /\bsus/.test(t)) acc.modalPedalTouches++;
}

/**
 * Precompute effective one chord per bar — primary **`john_coltrane`** only.
 */
export function precomputeJohnColtraneEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const phase = resolveColtranePhase(genMeta, seed);
  genMeta.coltranePhase = phase;
  genMeta.coltraneHarmonicDensity =
    phase === 'changes' ? COLTRANE_SLICE_PARAMETERS.harmonicDensityChanges : COLTRANE_SLICE_PARAMETERS.harmonicDensityModal;

  const cycle =
    tonicPc !== undefined ? coltraneThreeTonicCycle(tonicPc) : ([0, 4, 8] as const as unknown as [number, number, number]);
  const receipts: string[] = [];
  const out: string[] = [];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) {
      out.push(resolveBarSymbol(context, b).symbol);
      continue;
    }
    const rawSym = resolveBarSymbol(context, b).symbol;
    if (tonicPc === undefined) {
      out.push(rawSym);
      continue;
    }
    if (phase === 'modal') {
      const { symbol, receipt } = spellModalBar(b, tonicPc, cycle, seed);
      out.push(symbol);
      if (receipt) receipts.push(receipt);
    } else {
      const { symbol, receipt } = spellChangesBar(b, cycle, rawSym, seed);
      out.push(symbol);
      if (receipt) receipts.push(receipt);
    }
  }

  genMeta.johnColtraneEffectiveHarmonyBars = out;
  genMeta.johnColtraneDeviceReceipts = receipts.length ? receipts : undefined;
}

export function finalizeJohnColtraneMetadata(metadata: GenerationMetadata, acc: JohnColtraneHarmonyAccumulator): void {
  const phase = metadata.coltranePhase ?? 'changes';
  const receipts = metadata.johnColtraneDeviceReceipts ?? [];
  metadata.johnColtraneDiagnostics = {
    songwriterId: 'john_coltrane',
    barsConsidered: acc.barsConsidered,
    thirdCycleTouches: acc.thirdCycleTouches,
    lydianTonicTouches: acc.lydianTonicTouches,
    alteredDominantTouches: acc.alteredDominantTouches,
    modalPedalTouches: acc.modalPedalTouches,
    coltranePhase: phase,
    sliceParameters: {
      tritoneRate: COLTRANE_SLICE_PARAMETERS.tritoneRate,
      susBias: COLTRANE_SLICE_PARAMETERS.susBias,
      chromaticMediantBias: COLTRANE_SLICE_PARAMETERS.chromaticMediantBias,
      staticDominantBias: COLTRANE_SLICE_PARAMETERS.staticDominantBias,
    },
    deviceReceipts: receipts.length ? receipts : undefined,
  };
  metadata.johnColtraneSliceReceipt = [
    `John Coltrane (three-tonic slice): phase=${phase}`,
    `lydian≈${acc.lydianTonicTouches}`,
    `altDom≈${acc.alteredDominantTouches}`,
    `bars=${acc.barsConsidered}`,
    receipts.length ? `devices=${receipts.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
