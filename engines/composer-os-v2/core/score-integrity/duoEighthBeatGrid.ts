/**
 * Guitar–bass duo: strict 4/4 attack grid (quarter-note beat units).
 * Allowed note/rest onset positions only — no continuous timing for attacks.
 */

import type { MeasureModel, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';

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

/** True iff value is exactly one of the eight attack slots (notes may not start at beat 4). */
export function isStrictDuoNoteAttack(beats: number): boolean {
  for (const g of DUO_ATTACK_GRID_BEATS) {
    if (Math.abs(beats - g) < EPS) return true;
  }
  return false;
}

/** Rests may start on the same grid; onset at beat 4 only if zero-length (padding). */
export function isStrictDuoRestStart(beats: number, duration: number): boolean {
  if (Math.abs(beats - snapAttackBeatToGrid(beats)) >= EPS) return false;
  if (beats <= 3.5 + EPS) return true;
  if (Math.abs(beats - BEATS_PER_MEASURE) < EPS && duration <= EPS) return true;
  return false;
}

/** Snap one note/rest span to nearest eighth-beat boundaries; clamp last note onset to ≤ 3.5. */
export function snapEventToEighthBeatGrid(e: ScoreEvent): void {
  if (e.kind !== 'note' && e.kind !== 'rest') return;
  const n = e as { startBeat: number; duration: number };
  let sb = snapAttackBeatToGrid(n.startBeat);
  let eb = snapAttackBeatToGrid(n.startBeat + n.duration);
  if (eb > BEATS_PER_MEASURE) eb = BEATS_PER_MEASURE;
  if (eb < sb) eb = sb;
  if (e.kind === 'note' && sb >= BEATS_PER_MEASURE - EPS) {
    sb = BEATS_PER_MEASURE - 0.5;
    eb = BEATS_PER_MEASURE;
  }
  n.startBeat = sb;
  n.duration = Math.max(0, eb - sb);
}

export function normalizeMeasureToEighthBeatGrid(m: MeasureModel): void {
  for (const e of m.events) snapEventToEighthBeatGrid(e);
}

export interface DuoAttackGridValidationResult {
  valid: boolean;
  errors: string[];
}

function checkMeasureAttacks(
  partId: string,
  m: MeasureModel,
  errors: string[]
): void {
  const num = m.index;
  for (const e of m.events) {
    if (e.kind !== 'note' && e.kind !== 'rest') continue;
    const sb = (e as { startBeat: number }).startBeat;
    const dur = (e as { duration: number }).duration;
    if (e.kind === 'note') {
      if (!isStrictDuoNoteAttack(sb)) {
        errors.push(
          `Duo attack grid: ${partId} bar ${num} note start ${sb} not in {0,0.5,…,3.5}`
        );
      }
    } else if (!isStrictDuoRestStart(sb, dur)) {
      errors.push(`Duo attack grid: ${partId} bar ${num} rest start ${sb} (dur ${dur}) not on grid`);
    }
  }
}

/** Assert every note onset is exactly on DUO_ATTACK_GRID_BEATS. */
export function validateScoreDuoAttackGrid(score: ScoreModel): DuoAttackGridValidationResult {
  const errors: string[] = [];
  for (const p of score.parts) {
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
