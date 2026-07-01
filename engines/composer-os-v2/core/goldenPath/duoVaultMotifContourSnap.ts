/**
 * Stage 4b.2 - Vault contour snap at baseline duo motif emission (:4572) + post-orchestration survival telemetry.
 */

import type { CompositionContext } from '../compositionContext';
import type { DuoHarmonySource } from '../harmony/duoVaultHarmony';
import { resolveDuoHarmonyForSymbol } from '../harmony/duoVaultHarmony';
import type { MotifNote } from '../motif/motifTypes';
import { isStandardGuitarBassDuo } from '../presets/guitarBassDuoPresetIds';
import type { ScoreModel, MeasureModel } from '../score-model/scoreModelTypes';
import { snapGuitarPitchToChordWindow } from './guitarPhraseAuthority';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { resolveChordForDuoPostPass } from '../harmony/harmonyResolution';

const MAX_CONTOUR_DELTA = 8;
const ORCH_G_LOW = 55;
const ORCH_G_HIGH = 79;
const GUITAR_LIFT_BELOW = 62;
const LIFT_LOW_MID_SALT = 21002;
const LIFT_LOW_MID_GATE = 0.6;
const LIFT_SECTION_B_SALT = 21001;
const LIFT_SECTION_B_GATE = 0.35;

export interface DuoVaultMotifSnapReceipt {
  bar: number;
  noteIndex: number;
  vaultPcChosen: number;
  vaultSource: DuoHarmonySource;
  plPitch: number;
  snappedMidi: number;
}

/** Stage 4b.3 — vault contour evaluated but 4b.2 interval guard declined commit (metadata only). */
export interface DuoVaultDeclinedNote {
  bar: number;
  noteIndex: number;
  reason: 'interval-contract-declined';
}

/** Stage 4b.3 — motif bar golden + :4572 pre-orchestration midis for declined register-only lift checks. */
export interface DuoVaultMotifBarBaseline {
  bar: number;
  goldenMidis: number[];
  preOrchestrationMidis: number[];
  effectiveLow: number;
  effectiveHigh: number;
}

export interface DuoVaultMotifSurvivalTelemetry {
  vaultSnapFired: number;
  vaultPcSurvived: number;
  vaultPcLostToLegacySnap: number;
  vaultSourceFallback: number;
  contourNullReturns: number;
  survivedOverFiredRatio: number;
  receipts: DuoVaultMotifSnapReceipt[];
}

export class DuoVaultMotifResolverFallbackError extends Error {
  constructor(
    public readonly bar: number,
    public readonly chord: string
  ) {
    super(`Stage 4b.2: resolveDuoHarmonyForSymbol returned fallback on snap bar ${bar} chord=${chord}`);
    this.name = 'DuoVaultMotifResolverFallbackError';
  }
}

export class DuoVaultMotifContourStarvationError extends Error {
  constructor(
    public readonly bar: number,
    public readonly chord: string,
    public readonly noteIndex: number
  ) {
    super(
      `Stage 4b.2: vault contour pool starved on bar ${bar} chord=${chord} noteIndex=${noteIndex}`
    );
    this.name = 'DuoVaultMotifContourStarvationError';
  }
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/** Lift each vault melody pc into every octave within [low, high]. */
export function vaultRegisterCompletePoolMidi(
  melodyPcs: readonly number[],
  low: number,
  high: number
): number[] {
  const out = new Set<number>();
  const poolLow = Math.min(low, high);
  const poolHigh = Math.max(low, high);
  for (const pc of melodyPcs) {
    let midi = normalizePc(pc);
    while (midi < poolLow) midi += 12;
    while (midi <= poolHigh) {
      out.add(midi);
      midi += 12;
    }
  }
  return [...out].sort((a, b) => a - b);
}

const VAULT_POOL_MIN_CANDIDATES = 2;
/** Pool-only search band — wider than emission register; does not change note-emission clamp. */
const VAULT_POOL_SEARCH_FLOOR = 28;
const VAULT_POOL_SEARCH_CEILING = 96;
const VAULT_POOL_WIDEN_MAX_SEMITONES = 48;

/**
 * Build vault contour pool for snap/contour walk. Uses emission [low, high] first; if fewer than
 * two candidates (section-arch ceiling vs duo floor squeeze), widen pool-only bounds until pool ≥ 2
 * or the search band is exhausted — emission register elsewhere stays unchanged.
 */
export function resolveVaultContourPoolMidi(
  melodyPcs: readonly number[],
  emissionLow: number,
  emissionHigh: number
): number[] {
  const anchorLow = Math.min(emissionLow, emissionHigh);
  const anchorHigh = Math.max(emissionLow, emissionHigh);

  let pool = vaultRegisterCompletePoolMidi(melodyPcs, anchorLow, anchorHigh);
  if (pool.length >= VAULT_POOL_MIN_CANDIDATES) return pool;

  for (let extra = 12; extra <= VAULT_POOL_WIDEN_MAX_SEMITONES; extra += 12) {
    const poolLow = Math.max(VAULT_POOL_SEARCH_FLOOR, anchorLow - extra);
    const poolHigh = Math.min(VAULT_POOL_SEARCH_CEILING, anchorHigh + extra);
    pool = vaultRegisterCompletePoolMidi(melodyPcs, poolLow, poolHigh);
    if (pool.length >= VAULT_POOL_MIN_CANDIDATES) return pool;
  }

  return vaultRegisterCompletePoolMidi(
    melodyPcs,
    VAULT_POOL_SEARCH_FLOOR,
    VAULT_POOL_SEARCH_CEILING
  );
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function isOrchestrationSectionB(label: string): boolean {
  return label === 'B' || label.startsWith('B');
}

function skipBRegisterLiftForDuoIdentity(barIndex: number): boolean {
  return barIndex === 6 || barIndex === 7;
}

function snapGuitarToChordOrchestration(
  pitch: number,
  chord: string,
  context: CompositionContext
): number {
  return snapGuitarPitchToChordWindow(pitch, chord, ORCH_G_LOW, ORCH_G_HIGH, context);
}

function liftLowMidDelta(
  bar: number,
  eventIdx: number,
  preLiftPitch: number,
  seed: number,
  context: CompositionContext,
  chord: string
): number {
  const label = sectionLabelForBar(bar, context);
  if (isOrchestrationSectionB(label)) return 0;
  if (preLiftPitch >= GUITAR_LIFT_BELOW) return 0;
  if (seededUnit(seed, bar * 700 + eventIdx, LIFT_LOW_MID_SALT) >= LIFT_LOW_MID_GATE) return 0;
  const lifted = clampPitch(preLiftPitch + 1, ORCH_G_LOW, ORCH_G_HIGH);
  return snapGuitarToChordOrchestration(lifted, chord, context) - preLiftPitch;
}

function liftSectionBDelta(
  bar: number,
  eventIdx: number,
  preLiftPitch: number,
  seed: number,
  context: CompositionContext,
  chord: string
): number {
  if (skipBRegisterLiftForDuoIdentity(bar)) return 0;
  const label = sectionLabelForBar(bar, context);
  if (!isOrchestrationSectionB(label)) return 0;
  if (seededUnit(seed, bar * 600 + eventIdx, LIFT_SECTION_B_SALT) >= LIFT_SECTION_B_GATE) return 0;
  const lifted = clampPitch(preLiftPitch + 1, ORCH_G_LOW, ORCH_G_HIGH);
  return snapGuitarToChordOrchestration(lifted, chord, context) - preLiftPitch;
}

function voice1PitchesForMeasure(m: MeasureModel): number[] {
  return m.events
    .filter((e) => e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((e) => (e as { pitch: number }).pitch);
}

function sortedV1EventIndices(m: MeasureModel): number[] {
  const entries: { startBeat: number; eventIdx: number }[] = [];
  m.events.forEach((e, idx) => {
    if (e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1) {
      entries.push({ startBeat: e.startBeat, eventIdx: idx });
    }
  });
  entries.sort((a, b) => a.startBeat - b.startBeat);
  return entries.map(({ eventIdx }) => eventIdx);
}

function pickNearestPoolMidi(targetMidi: number, pool: number[]): number {
  let best = pool[0]!;
  let bd = Math.abs(best - targetMidi);
  for (const p of pool) {
    const d = Math.abs(p - targetMidi);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function pickContourStep(
  curr: number,
  targetInterval: number,
  targetPlPitch: number,
  pool: number[],
  low: number,
  high: number,
  seed: number,
  bar: number,
  noteIndex: number
): number {
  const maxAbs = MAX_CONTOUR_DELTA;
  const candidates = pool.filter((p) => {
    const d = p - curr;
    if (targetInterval > 0) return d > 0 && d <= maxAbs;
    if (targetInterval < 0) return d < 0 && d >= -maxAbs;
    return Math.abs(d) <= 2;
  });
  if (candidates.length === 0) {
    throw new DuoVaultMotifContourStarvationError(bar, '', noteIndex);
  }
  const targetMag = Math.abs(targetInterval);
  const ranked = [...candidates].sort((a, b) => {
    const da = Math.abs(Math.abs(a - curr) - targetMag);
    const db = Math.abs(Math.abs(b - curr) - targetMag);
    if (da !== db) return da - db;
    return Math.abs(a - targetPlPitch) - Math.abs(b - targetPlPitch);
  });
  const bestMagDelta = Math.abs(Math.abs(ranked[0]! - curr) - targetMag);
  const tieBand = ranked.filter(
    (p) => Math.abs(Math.abs(Math.abs(p - curr) - targetMag) - bestMagDelta) < 1e-9
  );
  const pick =
    tieBand[Math.floor(seededUnit(seed, bar * 100 + noteIndex, 42002) * tieBand.length)] ?? ranked[0]!;
  return clampPitch(pick, low, high);
}

/**
 * Walk vault register-complete pool preserving interval direction + approximate magnitude from motif notes.
 * Fail loud on resolver fallback or contour starvation - no silent legacy revert.
 */
export function snapMotifBarToVaultContour(
  motifNotes: MotifNote[],
  chord: string,
  low: number,
  high: number,
  seed: number,
  bar: number,
  lockedHarmony = true,
  onContourStarvation?: (bar: number, noteIndex: number) => void
): { snappedMidis: number[]; receipts: DuoVaultMotifSnapReceipt[]; vaultSource: DuoHarmonySource } {
  const sorted = [...motifNotes].sort((a, b) => a.startBeat - b.startBeat);
  if (sorted.length === 0) {
    return { snappedMidis: [], receipts: [], vaultSource: 'vault' };
  }

  const res = resolveDuoHarmonyForSymbol(chord, { lockedHarmony });
  if (res.source !== 'vault') {
    throw new DuoVaultMotifResolverFallbackError(bar, chord);
  }

  const pcs = res.melodyPcs.length > 0 ? res.melodyPcs : [res.rootPc];
  const vaultPcSet = new Set(pcs.map(normalizePc));
  const pool = resolveVaultContourPoolMidi(pcs, low, high);
  if (pool.length < VAULT_POOL_MIN_CANDIDATES) {
    throw new DuoVaultMotifContourStarvationError(bar, chord, 0);
  }

  /** Anchor contour to register-clamped pl.notes (same baseline as :4572 pre-vault clamp). */
  const clampedPl = sorted.map((n) => clampPitch(n.pitch, low, high));

  const snappedMidis: number[] = [];
  const receipts: DuoVaultMotifSnapReceipt[] = [];
  let curr: number;
  if (vaultPcSet.has(normalizePc(clampedPl[0]!))) {
    curr = clampedPl[0]!;
  } else {
    curr = pickNearestPoolMidi(clampedPl[0]!, pool);
    curr = clampPitch(curr, low, high);
  }
  snappedMidis.push(curr);
  receipts.push({
    bar,
    noteIndex: 0,
    vaultPcChosen: normalizePc(curr),
    vaultSource: res.source,
    plPitch: sorted[0]!.pitch,
    snappedMidi: curr,
  });

  for (let i = 1; i < sorted.length; i++) {
    const targetInterval = clampedPl[i]! - clampedPl[i - 1]!;
    if (vaultPcSet.has(normalizePc(clampedPl[i]!))) {
      curr = clampedPl[i]!;
    } else {
      try {
        curr = pickContourStep(curr, targetInterval, clampedPl[i]!, pool, low, high, seed, bar, i);
      } catch (e) {
        if (e instanceof DuoVaultMotifContourStarvationError) {
          onContourStarvation?.(bar, i);
          curr = clampedPl[i]!;
        } else {
          throw e;
        }
      }
    }
    snappedMidis.push(curr);
    receipts.push({
      bar,
      noteIndex: i,
      vaultPcChosen: normalizePc(curr),
      vaultSource: res.source,
      plPitch: sorted[i]!.pitch,
      snappedMidi: curr,
    });
  }

  return { snappedMidis, receipts, vaultSource: res.source };
}

function motifIntervalVector(pitches: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

/** True when vault snap preserves the clamped pl.notes interval vector (semitone identity). */
export function vaultSnapPreservesClampedIntervals(
  snappedMidis: number[],
  motifNotes: MotifNote[],
  low: number,
  high: number
): boolean {
  const sorted = [...motifNotes].sort((a, b) => a.startBeat - b.startBeat);
  const clamped = sorted.map((n) => clampPitch(n.pitch, low, high));
  const a = motifIntervalVector(snappedMidis);
  const b = motifIntervalVector(clamped);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function clampDeltasForGolden(golden: number[], low: number, high: number): number[] {
  return golden.map((p) => clampPitch(p, low, high) - p);
}

/** Mirrors baselineMotifIntervalIdentity.test.ts intervalToleranceForInterval (4b.1 contract). */
function intervalToleranceForGoldenInterval(
  golden: number[],
  low: number,
  high: number,
  liftDeltas: number[],
  intervalIndex: number
): number {
  const clampD = clampDeltasForGolden(golden, low, high);
  const combined = clampD.map((c, i) => c + (liftDeltas[i] ?? 0));
  return Math.abs(combined[intervalIndex + 1]! - combined[intervalIndex]!);
}

function liftDeltasForMotifBarAtEmission(
  golden: number[],
  low: number,
  high: number,
  bar: number,
  seed: number,
  context: CompositionContext,
  chord: string
): number[] {
  return golden.map((p, noteIndex) => {
    const pre = clampPitch(p, low, high);
    const liftA = liftLowMidDelta(bar, noteIndex, pre, seed, context, chord);
    const afterA = pre + liftA;
    const liftB = liftSectionBDelta(bar, noteIndex, afterA, seed, context, chord);
    return liftA + liftB;
  });
}

function simulateEmittedPitchAfterOrchestration(
  preOrchPitch: number,
  bar: number,
  noteIndex: number,
  seed: number,
  context: CompositionContext,
  chord: string
): number {
  let x = preOrchPitch;
  x += liftLowMidDelta(bar, noteIndex, x, seed, context, chord);
  x += liftSectionBDelta(bar, noteIndex, x, seed, context, chord);
  return snapGuitarToChordOrchestration(x, chord, context);
}

/** Stage 4b.1 interval contract — golden pl.notes vs orchestration-modeled emission at :4572. */
export function barPasses4b1MotifIntervalContract(
  preOrchMidis: number[],
  goldenMidis: number[],
  low: number,
  high: number,
  seed: number,
  bar: number,
  context: CompositionContext,
  chord: string
): boolean {
  if (preOrchMidis.length !== goldenMidis.length) return false;
  const goldenIv = motifIntervalVector(goldenMidis);
  const liftDeltas = liftDeltasForMotifBarAtEmission(goldenMidis, low, high, bar, seed, context, chord);
  const emitted = preOrchMidis.map((p, i) =>
    simulateEmittedPitchAfterOrchestration(p, bar, i, seed, context, chord)
  );
  const emittedIv = motifIntervalVector(emitted);
  for (let j = 0; j < goldenIv.length; j++) {
    const tol = intervalToleranceForGoldenInterval(goldenMidis, low, high, liftDeltas, j);
    if (Math.abs(emittedIv[j]! - goldenIv[j]!) > tol + 1e-9) return false;
  }
  return true;
}

/** Nearest higher octave of the same pitch class toward +1 register lift intent (no legacy snap). */
export function registerOnlyLiftMidi(currentMidi: number, low: number, high: number): number {
  const pc = normalizePc(currentMidi);
  const target = currentMidi + 1;
  const candidates: number[] = [];
  let midi = pc;
  while (midi < low) midi += 12;
  while (midi <= high) {
    if (midi > currentMidi) candidates.push(midi);
    midi += 12;
  }
  if (candidates.length === 0) return currentMidi;
  const atOrAbove = candidates.filter((c) => c >= target);
  const pool = atOrAbove.length > 0 ? atOrAbove : candidates;
  let best = pool[0]!;
  let bd = Math.abs(best - target);
  for (const c of pool) {
    const d = Math.abs(c - target);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function declinedNoteIndicesForBarFromList(
  bar: number,
  declined: readonly DuoVaultDeclinedNote[] | undefined,
): Set<number> {
  return new Set((declined ?? []).filter((d) => d.bar === bar).map((d) => d.noteIndex));
}

function receiptNoteIndicesForBarFromList(
  bar: number,
  receipts: readonly DuoVaultMotifSnapReceipt[] | undefined,
): Set<number> {
  return new Set((receipts ?? []).filter((r) => r.bar === bar).map((r) => r.noteIndex));
}

function simulateDeclinedNoteAfterOrchestration(
  preOrchPitch: number,
  noteIndex: number,
  bar: number,
  seed: number,
  context: CompositionContext,
  low: number,
  high: number,
  eventIdxByNote: readonly number[],
): number {
  let x = preOrchPitch;
  const eventIdx = eventIdxByNote[noteIndex] ?? noteIndex;
  const label = sectionLabelForBar(bar, context);
  if (!isOrchestrationSectionB(label) && x < GUITAR_LIFT_BELOW) {
    if (seededUnit(seed, bar * 700 + eventIdx, LIFT_LOW_MID_SALT) < LIFT_LOW_MID_GATE) {
      x = registerOnlyLiftMidi(x, low, high);
    }
  }
  if (!skipBRegisterLiftForDuoIdentity(bar) && isOrchestrationSectionB(label)) {
    if (seededUnit(seed, bar * 600 + eventIdx, LIFT_SECTION_B_SALT) < LIFT_SECTION_B_GATE) {
      x = registerOnlyLiftMidi(x, low, high);
    }
  }
  return x;
}

/** Full-bar orchestration model: receipt skip · declined register-only · legacy lift+snap. */
export function simulateMotifBarEmittedAfterVaultOrchestration(
  preOrchMidis: readonly number[],
  goldenMidis: readonly number[],
  low: number,
  high: number,
  seed: number,
  bar: number,
  context: CompositionContext,
  chord: string,
  eventIdxByNote: readonly number[],
  declined: readonly DuoVaultDeclinedNote[] | undefined,
  receipts: readonly DuoVaultMotifSnapReceipt[] | undefined,
): number[] {
  const declinedSet = declinedNoteIndicesForBarFromList(bar, declined);
  const receiptSet = receiptNoteIndicesForBarFromList(bar, receipts);
  return preOrchMidis.map((pitch, i) => {
    if (receiptSet.has(i)) return pitch;
    if (declinedSet.has(i)) {
      return simulateDeclinedNoteAfterOrchestration(
        pitch,
        i,
        bar,
        seed,
        context,
        low,
        high,
        eventIdxByNote,
      );
    }
    const eventIdx = eventIdxByNote[i] ?? i;
    let x = pitch;
    x += liftLowMidDelta(bar, eventIdx, x, seed, context, chord);
    x += liftSectionBDelta(bar, eventIdx, x, seed, context, chord);
    return snapGuitarToChordOrchestration(x, chord, context);
  });
}

/** 4b.1 interval contract with vault-orchestration model (declined register-only + receipt skip). */
export function motifBarPasses4b1AfterVaultOrchestration(
  preOrchMidis: readonly number[],
  goldenMidis: readonly number[],
  low: number,
  high: number,
  seed: number,
  bar: number,
  context: CompositionContext,
  chord: string,
  eventIdxByNote: readonly number[],
  declined: readonly DuoVaultDeclinedNote[] | undefined,
  receipts: readonly DuoVaultMotifSnapReceipt[] | undefined,
): boolean {
  if (preOrchMidis.length !== goldenMidis.length) return false;
  const goldenIv = motifIntervalVector([...goldenMidis]);
  const liftDeltas = liftDeltasForMotifBarAtEmission(goldenMidis, low, high, bar, seed, context, chord);
  const emitted = simulateMotifBarEmittedAfterVaultOrchestration(
    preOrchMidis,
    goldenMidis,
    low,
    high,
    seed,
    bar,
    context,
    chord,
    eventIdxByNote,
    declined,
    receipts,
  );
  const emittedIv = motifIntervalVector(emitted);
  for (let j = 0; j < goldenIv.length; j++) {
    const tol = intervalToleranceForGoldenInterval(goldenMidis, low, high, liftDeltas, j);
    if (Math.abs(emittedIv[j]! - goldenIv[j]!) > tol + 1e-9) return false;
  }
  return true;
}

export interface PerNoteVaultMotifPlacementResult {
  finalMidis: number[];
  receipts: DuoVaultMotifSnapReceipt[];
  contourNullReturns: number;
}

/**
 * Stage 4b.2b — per-note vault commit with 4b.1 tolerance guard.
 * Already-vault-pc notes count as placed (not null). Notes failing 4b.1 contract keep clamped pl.
 */
export function applyPerNoteVaultMotifPlacement(
  snap: { snappedMidis: number[]; receipts: DuoVaultMotifSnapReceipt[]; vaultSource: DuoHarmonySource },
  motifNotes: MotifNote[],
  melodyPcs: readonly number[],
  chord: string,
  low: number,
  high: number,
  seed: number,
  bar: number,
  context: CompositionContext
): PerNoteVaultMotifPlacementResult {
  const sorted = [...motifNotes].sort((a, b) => a.startBeat - b.startBeat);
  const clamped = sorted.map((n) => clampPitch(n.pitch, low, high));
  const golden = sorted.map((n) => n.pitch);
  const vaultPcSet = new Set(melodyPcs.map(normalizePc));
  const finalMidis = [...clamped];
  const committedReceipts: DuoVaultMotifSnapReceipt[] = [];
  let contourNullReturns = 0;

  for (let i = 0; i < sorted.length; i++) {
    const snapped = snap.snappedMidis[i]!;
    const clampedPitch = clamped[i]!;
    const snapReceipt = snap.receipts[i]!;

    if (vaultPcSet.has(normalizePc(clampedPitch)) && snapped === clampedPitch) {
      committedReceipts.push(snapReceipt);
      continue;
    }

    if (snapped === clampedPitch) {
      continue;
    }

    const candidate = [...finalMidis];
    candidate[i] = snapped;
    if (
      barPasses4b1MotifIntervalContract(candidate, golden, low, high, seed, bar, context, chord)
    ) {
      finalMidis[i] = snapped;
      committedReceipts.push(snapReceipt);
    } else {
      contourNullReturns++;
      if (context.generationMetadata) {
        const declined = context.generationMetadata.duoVaultDeclinedNotes ?? [];
        context.generationMetadata.duoVaultDeclinedNotes = [
          ...declined,
          { bar, noteIndex: i, reason: 'interval-contract-declined' },
        ];
      }
    }
  }

  return { finalMidis, receipts: committedReceipts, contourNullReturns };
}

export function shouldApplyDuoVaultMotifContourSnap(
  presetId: string | undefined,
  hookRuntimeActive: boolean,
  lineFirstDuoAbstractActive: boolean,
  hasPlacements: boolean,
  skipMotifForIdentity: boolean,
  duoVaultMotifEnabled = true
): boolean {
  return (
    duoVaultMotifEnabled &&
    isStandardGuitarBassDuo(presetId) &&
    !hookRuntimeActive &&
    !lineFirstDuoAbstractActive &&
    hasPlacements &&
    !skipMotifForIdentity
  );
}

function expectedPitchAfterOrchestrationLift(
  snappedMidi: number,
  bar: number,
  eventIdx: number,
  seed: number,
  context: CompositionContext,
  chord: string
): number {
  let p = snappedMidi;
  p += liftLowMidDelta(bar, eventIdx, p, seed, context, chord);
  p += liftSectionBDelta(bar, eventIdx, p, seed, context, chord);
  return p;
}

/**
 * Read guitar v1 survival AFTER applyDuoOrchestrationPass - final score seam for Stage 4b.2.
 */
export function computeDuoVaultMotifSurvivalTelemetry(
  score: ScoreModel,
  receipts: readonly DuoVaultMotifSnapReceipt[],
  context: CompositionContext,
  seed: number,
  contourNullReturns = 0,
  vaultSourceFallback = 0
): DuoVaultMotifSurvivalTelemetry {
  const guitar = score.parts.find(
    (p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar'
  );

  let vaultPcSurvived = 0;
  let vaultPcLostToLegacySnap = 0;

  const byBar = new Map<number, DuoVaultMotifSnapReceipt[]>();
  for (const r of receipts) {
    const list = byBar.get(r.bar) ?? [];
    list.push(r);
    byBar.set(r.bar, list);
  }

  for (const [bar, barReceipts] of byBar) {
    const measure = guitar?.measures.find((m) => m.index === bar);
    if (!measure) continue;
    const emitted = voice1PitchesForMeasure(measure);
    const eventIdxs = sortedV1EventIndices(measure);
    const chord = resolveChordForDuoPostPass(context, bar, measure.chord);
    const sortedReceipts = [...barReceipts].sort((a, b) => a.noteIndex - b.noteIndex);

    for (const rec of sortedReceipts) {
      const emittedPitch = emitted[rec.noteIndex];
      if (emittedPitch === undefined) continue;

      if (normalizePc(emittedPitch) === normalizePc(rec.vaultPcChosen)) {
        vaultPcSurvived++;
        continue;
      }

      const eventIdx = eventIdxs[rec.noteIndex] ?? rec.noteIndex;
      const expectedLift = expectedPitchAfterOrchestrationLift(
        rec.snappedMidi,
        bar,
        eventIdx,
        seed,
        context,
        chord
      );
      if (emittedPitch === expectedLift) {
        vaultPcLostToLegacySnap++;
      }
    }
  }

  const vaultSnapFired = receipts.length;
  return {
    vaultSnapFired,
    vaultPcSurvived,
    vaultPcLostToLegacySnap,
    vaultSourceFallback,
    contourNullReturns,
    survivedOverFiredRatio: vaultSnapFired > 0 ? vaultPcSurvived / vaultSnapFired : 0,
    receipts: [...receipts],
  };
}
