/**
 * John Coltrane — three-tonic (augmented-triad) harmonic motion + optional modal quartal pedals.
 * Receipts **`jc:*`** · phase **`changes`** (dense third-cycle moves) vs **`modal`** (long vamp).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
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

/**
 * Primary songwriter or harmonicVoice selects John Coltrane harmony authority.
 * Single-gate (no styleProfile) — Wave-C / bill_evans HV pattern.
 *
 * Exact id `john_coltrane` only — soft aliases (`coltrane`, …) stay primary-intake via
 * songwriter normalize; they do **not** engage HV.
 */
export function isJohnColtraneHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'john_coltrane' || voice === 'john_coltrane';
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

/** GCE tonic-family check (mirrors cadentialClarityCoverage / chordSymbolTonicFamily). */
function chordLooksTonicFamily(symbol: string): boolean {
  const c = symbol.trim().split('(')[0]!.trim().split('/')[0]!.trim();
  if (/maj7|maj9|maj6|maj11|maj13|mmaj7|add9/i.test(c)) return true;
  if (/[A-G][#b]?m(7|9|11|13)/i.test(c) || /[A-G][#b]?min(7|9|11|13)/i.test(c)) return true;
  if (/maj6|6\/9|6-9/i.test(c)) return true;
  if (/^[A-G][#b]?(m|min)?$/i.test(c)) return true;
  /* Dominant-family (excludes maj7 / minor-7); anything else counts as tonic-family. */
  if (/maj7|mmaj|maj9|maj11|maj13/i.test(c)) return true;
  if (/^[A-G][#b]?m(7|9|11|13)/i.test(c) || /^[A-G][#b]?min(7|9|11|13)/i.test(c)) return true;
  if (/7alt/i.test(c)) return false;
  if (/7b9|7#9/i.test(c)) return false;
  if (/b13/i.test(c)) return false;
  if (/7#11/i.test(c)) return false;
  if (/13/i.test(c) && !/13sus/i.test(c) && !/maj13/i.test(c) && !/m13/i.test(c)) return false;
  if (/b9/i.test(c) && !/maj9/i.test(c) && !/add9/i.test(c)) return false;
  if (/#9/i.test(c) && !/maj9/i.test(c)) return false;
  if (/^[A-G][#b]?(9|11|13)$/i.test(c)) return false;
  if (/^[A-G][#b]?7([^m]|$)/i.test(c)) return false;
  return true;
}

/**
 * Structural cadence bars — 8-bar section grid (A / A' / B / A'' on 32-bar charts).
 * These are the section-ending bars whose lookback windows feed cadentialClarityCoverage.
 */
export function coltraneStructuralCadenceBars(totalBars: number): number[] {
  const out: number[] = [];
  for (let b = 8; b <= totalBars; b += 8) out.push(b);
  if (totalBars > 0 && totalBars % 8 !== 0) out.push(totalBars);
  return out;
}

function isColtraneStructuralCadenceBar(bar: number, totalBars: number): boolean {
  return coltraneStructuralCadenceBars(totalBars).includes(bar);
}

/** Spell a three-tonic-centre maj7 landing (Giant Steps / Countdown key-center cadence). */
function spellCycleTonicCadence(
  bar: number,
  cycle: readonly [number, number, number]
): { symbol: string; receipt: string } {
  const step = (bar - 1) % 3;
  const nm = pitchClassToSharpName(cycle[step]!);
  return {
    symbol: `${nm}maj7`,
    receipt: `jc:third_cycle_tonic_cadence@bar${bar}`,
  };
}

/**
 * Changes-cycle spelling.
 * Mid-phrase: altered dominants / quartal minors / Lydian maj7#11 as before.
 * Structural cadences: tonic maj7 is an explicit cadential option (not permanent dominant drift).
 */
function spellChangesBar(
  bar: number,
  cycle: readonly [number, number, number],
  rawSym: string,
  seed: number,
  totalBars: number
): { symbol: string; receipt?: string } {
  const step = (bar - 1) % 3;
  const rpc = cycle[step]!;
  const nm = pitchClassToSharpName(rpc);
  const u = seededUnit(seed, bar, 992010);
  const atCadence = isColtraneStructuralCadenceBar(bar, totalBars);

  /* Cadential option: land on the active key-centre tonic maj7 (~42% when otherwise dominant-path). */
  if (atCadence && seededUnit(seed, bar, 992015) < 0.42) {
    return spellCycleTonicCadence(bar, cycle);
  }

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

/**
 * Guardrail: each 16-bar half of a 32-bar chart must have ≥1 structural cadence
 * whose lookback contains a tonic-family chord in the three-tonic matrix.
 * Does not force tonic at every cadence — only eliminates the 0%-tonic failure mode.
 */
function enforceHalfTonicCadenceGuardrail(
  out: string[],
  cycle: readonly [number, number, number],
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (totalBars !== 32 || out.length < 32) return;

  const halves: Array<{ start: number; end: number }> = [
    { start: 1, end: 16 },
    { start: 17, end: 32 },
  ];

  for (const half of halves) {
    const cadenceBars = coltraneStructuralCadenceBars(totalBars).filter(
      (b) => b >= half.start && b <= half.end && !isProtectedBar(b, context)
    );
    const hasTonicCadence = coltraneStructuralCadenceBars(totalBars)
      .filter((b) => b >= half.start && b <= half.end)
      .some((endBar) => {
        const lookStart = Math.max(half.start, endBar - 3);
        for (let b = lookStart; b <= endBar; b++) {
          const sym = out[b - 1];
          if (sym && chordLooksTonicFamily(sym)) return true;
        }
        return false;
      });
    if (hasTonicCadence) continue;
    if (cadenceBars.length === 0) continue;

    /* Prefer latest cadence in the half (bar 16 / 32). */
    const bar = cadenceBars[cadenceBars.length - 1]!;
    const { symbol, receipt } = spellCycleTonicCadence(bar, cycle);
    out[bar - 1] = symbol;
    receipts.push(`${receipt}|half_guardrail`);
  }
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
  if (/maj7/.test(t)) acc.lydianTonicTouches++;
  if (/7alt|7b9/.test(t)) acc.alteredDominantTouches++;
  if (/m11|sus4/.test(t) || /\bsus/.test(t)) acc.modalPedalTouches++;
}

/**
 * Precompute effective one chord per bar — primary or HV **`john_coltrane`**
 * (see {@link isJohnColtraneHarmonicPath}).
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
      const { symbol, receipt } = spellChangesBar(b, cycle, rawSym, seed, tb);
      out.push(symbol);
      if (receipt) receipts.push(receipt);
    }
  }

  if (phase === 'changes' && tonicPc !== undefined) {
    enforceHalfTonicCadenceGuardrail(out, cycle, tb, receipts, context);
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
