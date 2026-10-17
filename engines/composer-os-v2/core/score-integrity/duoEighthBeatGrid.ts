/**
 * Guitar–bass duo: strict 4/4 attack grid (quarter-note beat units).
 * Allowed note/rest onset positions only — no continuous timing for attacks.
 */

import type { MeasureModel, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';

const EPS = 1e-5;

/** Allowed attack positions in beats (eighth-note grid within the bar). */
export const DUO_ATTACK_GRID_BEATS: readonly number[] = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

/** Snap any beat value to nearest eighth (same as allowed grid for [0, 4]). */
export function snapAttackBeatToGrid(beats: number): number {
  return Math.round(beats * 2) / 2;
}

/** Legacy alias — same as snapAttackBeatToGrid. */
export function snapEighthBeat(x: number): number {
  return snapAttackBeatToGrid(x);
}

/** Eighth-note attack slots from 0 up to (but not including) `barSpan` quarter-note beats. */
export function duoEighthAttackSlots(barSpanQuarters: number): readonly number[] {
  const n = Math.max(0, Math.round(barSpanQuarters * 2));
  return Array.from({ length: n }, (_, i) => i * 0.5);
}

/** True iff value is on the eighth-note grid for this bar's span (notes may not start at the barline). */
export function isStrictDuoNoteAttack(beats: number, barSpanQuarters: number = BEATS_PER_MEASURE): boolean {
  for (const g of duoEighthAttackSlots(barSpanQuarters)) {
    if (Math.abs(beats - g) < EPS) return true;
  }
  return false;
}

/** Rests may start on the same grid; onset at barline only if zero-length (padding). */
export function isStrictDuoRestStart(
  beats: number,
  duration: number,
  barSpanQuarters: number = BEATS_PER_MEASURE
): boolean {
  if (Math.abs(beats - snapAttackBeatToGrid(beats)) >= EPS) return false;
  const lastSlot = barSpanQuarters - 0.5;
  if (beats <= lastSlot + EPS) return true;
  if (Math.abs(beats - barSpanQuarters) < EPS && duration <= EPS) return true;
  return false;
}

/**
 * Snap one note/rest span to nearest eighth-beat boundaries within `barSpanQuarters`.
 * Last attack slot is one eighth before the barline when span aligns to the grid.
 */
export function snapEventToEighthBeatGrid(e: ScoreEvent, barSpanQuarters: number = BEATS_PER_MEASURE): void {
  if (e.kind !== 'note' && e.kind !== 'rest') return;
  const n = e as { startBeat: number; duration: number };
  let sb = snapAttackBeatToGrid(n.startBeat);
  let eb = snapAttackBeatToGrid(n.startBeat + n.duration);
  if (eb > barSpanQuarters) eb = barSpanQuarters;
  if (eb < sb) eb = sb;
  if (e.kind === 'note' && sb >= barSpanQuarters - EPS) {
    sb = Math.max(0, barSpanQuarters - 0.5);
    eb = barSpanQuarters;
  }
  n.startBeat = sb;
  n.duration = Math.max(0, eb - sb);
}

export function normalizeMeasureToEighthBeatGrid(m: MeasureModel): void {
  const span = measureBeatSpanQuartersOf(m);
  for (const e of m.events) snapEventToEighthBeatGrid(e, span);
}

export interface DuoAttackGridValidationResult {
  valid: boolean;
  errors: string[];
}

function isSixteenthSlot(beats: number, barSpanQuarters: number): boolean {
  const slots = Math.max(0, Math.round(barSpanQuarters * 4));
  for (let i = 0; i < slots; i++) {
    if (Math.abs(beats - i * 0.25) < EPS) return true;
  }
  return false;
}

function checkMeasureAttacks(
  partId: string,
  m: MeasureModel,
  errors: string[]
): void {
  const num = m.index;
  const span = measureBeatSpanQuartersOf(m);
  if (m.b1PulsePreserve) {
    for (const e of m.events) {
      if (e.kind !== 'note' && e.kind !== 'rest') continue;
      const sb = (e as { startBeat: number }).startBeat;
      if (!isSixteenthSlot(sb, span)) {
        errors.push(`Duo attack grid: ${partId} bar ${num} ${e.kind} start ${sb} not on 16th grid span ${span} beats`);
      }
    }
    return;
  }
  const gridLabel =
    span === BEATS_PER_MEASURE ? '{0,0.5,…,3.5}' : `eighth grid span ${span} beats`;
  for (const e of m.events) {
    if (e.kind !== 'note' && e.kind !== 'rest') continue;
    const sb = (e as { startBeat: number }).startBeat;
    const dur = (e as { duration: number }).duration;
    if (e.kind === 'note') {
      if (!isStrictDuoNoteAttack(sb, span)) {
        errors.push(`Duo attack grid: ${partId} bar ${num} note start ${sb} not in ${gridLabel}`);
      }
    } else if (!isStrictDuoRestStart(sb, dur, span)) {
      errors.push(`Duo attack grid: ${partId} bar ${num} rest start ${sb} (dur ${dur}) not on grid`);
    }
  }
}

/** Assert every note onset is exactly on DUO_ATTACK_GRID_BEATS. */
export function validateScoreDuoAttackGrid(score: ScoreModel): DuoAttackGridValidationResult {
  const errors: string[] = [];
  for (const p of score.parts) {
    /** Afrobeat drum grid is 16ths — exempt from duo eighth attack seal (`felaKutiSlice.ts`). */
    if (p.instrumentIdentity === 'fela_afrobeat_drums') continue;
    if (p.instrumentIdentity === 'art_rock_band_drums') continue;
    /** Zappa solo staff — ferocity bursts use sub-eighth spacing; validated via bar-math + export, not duo grid. */
    if (p.id === 'zappa_solo') continue;
    for (const m of p.measures) {
      checkMeasureAttacks(p.id, m, errors);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Per-bar attack positions (notes + rest starts) for debugging. */
export function collectAttackPositionsForMeasure(m: MeasureModel): number[] {
  const xs: number[] = [];
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') {
      xs.push((e as { startBeat: number }).startBeat);
    }
  }
  return [...new Set(xs.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
}

/** When COMPOSER_OS_DUO_ATTACK_GRID_DEBUG=1, log attack grid per bar per part. */
export function debugPrintDuoAttackGridIfEnabled(score: ScoreModel, label?: string): void {
  if (typeof process === 'undefined' || process.env?.COMPOSER_OS_DUO_ATTACK_GRID_DEBUG !== '1') return;
  const pre = label ? `[${label}] ` : '';
  for (const p of score.parts) {
    const ordered = [...p.measures].sort((a, b) => a.index - b.index);
    for (const m of ordered) {
      const attacks = collectAttackPositionsForMeasure(m);
      console.log(`${pre}duo attacks ${p.id} m${m.index}: [${attacks.join(', ')}]`);
    }
  }
}
