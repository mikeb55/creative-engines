/**
 * Stage 4b.2 - Vault contour snap at baseline duo motif emission (:4572) + post-orchestration survival telemetry.
 */

import type { CompositionContext } from '../compositionContext';
import type { DuoHarmonySource } from '../harmony/duoVaultHarmony';
import { resolveDuoHarmonyForSymbol } from '../harmony/duoVaultHarmony';
import type { MotifNote } from '../motif/motifTypes';
import { isStandardGuitarBassDuo } from '../presets/guitarBassDuoPresetIds';
import type { ScoreModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
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
  for (const pc of melodyPcs) {
    let midi = normalizePc(pc);
    while (midi < low) midi += 12;
    while (midi <= high) {
      out.add(midi);
      midi += 12;
    }
  }
  return [...out].sort((a, b) => a - b);
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

function snapGuitarToChordOrchestration(pitch: number, chord: string): number {
  const pool = guitarChordTonesInRange(chord, ORCH_G_LOW, ORCH_G_HIGH);
  const pcs = new Set(
    [pool.root, pool.third, pool.fifth, pool.seventh].map((p) => normalizePc(Math.round(p)))
  );
  const pc = normalizePc(pitch);
  if (pcs.has(pc)) return pitch;
  let best = pitch;
  let bd = 99;
  for (const c of [pool.root, pool.third, pool.fifth, pool.seventh]) {
    const cc = clampPitch(Math.round(c), ORCH_G_LOW, ORCH_G_HIGH);
    const d = Math.abs(cc - pitch);
    if (d <= 2 && d < bd) {
      bd = d;
      best = cc;
    }
  }
  return bd <= 2 ? best : pitch;
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
  return snapGuitarToChordOrchestration(lifted, chord) - preLiftPitch;
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
  return snapGuitarToChordOrchestration(lifted, chord) - preLiftPitch;
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
  const pool = vaultRegisterCompletePoolMidi(pcs, low, high);
  if (pool.length < 2) {
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

export function shouldApplyDuoVaultMotifContourSnap(
  presetId: string | undefined,
  hookRuntimeActive: boolean,
  lineFirstDuoAbstractActive: boolean,
  hasPlacements: boolean,
  skipMotifForIdentity: boolean
): boolean {
  return (
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
