/**
 * Shared Bacharach “signal” detection — must match what the generator guarantees.
 * PASS if there is subtle chromatic colour OR phrase asymmetry (not fully diatonic + square).
 */

import type { MeasureModel } from '../../score-model/scoreModelTypes';

const EPS = 1e-5;

/** Strong-beat grid only (square phrasing): onsets exactly on 0, 1, 2, or 3. */
export function isOnStrongQuarterGrid(s: number): boolean {
  return [0, 1, 2, 3].some((w) => Math.abs(s - w) < EPS);
}

/** At least one onset off the 0/1/2/3 downbeat grid (0.25 / 0.5 / 0.75 / 1.5 …). */
export function hasOffStrongGridOnset(startBeats: number[]): boolean {
  return startBeats.some((s) => !isOnStrongQuarterGrid(s));
}

/** Consecutive semitone steps in time-ordered melodic motion (any voice in measure stream). */
export function countMelodicChromaticSteps(pitchesOrdered: number[]): number {
  let n = 0;
  for (let i = 1; i < pitchesOrdered.length; i++) {
    if (Math.abs(pitchesOrdered[i] - pitchesOrdered[i - 1]) === 1) n++;
  }
  return n;
}

/** Rhythmic variety: enough distinct onset positions on the quarter grid. */
export function hasRhythmicVariety(startBeats: number[]): boolean {
  if (startBeats.length < 2) return false;
  const keys = new Set(startBeats.map((s) => Math.round(s * 4)));
  return keys.size >= 3;
}

export interface GuitarSectionSignal {
  pitchesOrdered: number[];
  startBeats: number[];
  chromaticSteps: number;
  offStrongGrid: boolean;
  variety: boolean;
}

export function analyzeGuitarSectionMeasures(measures: MeasureModel[]): GuitarSectionSignal {
  const timed: { t: number; pitch: number }[] = [];
  const starts: number[] = [];
  for (const m of measures) {
    const barOff = (m.index - 1) * 4;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const sb = (e as { startBeat: number }).startBeat;
      const pitch = (e as { pitch: number }).pitch;
      starts.push(sb);
      timed.push({ t: barOff + sb, pitch });
    }
  }
  timed.sort((a, b) => a.t - b.t);
  const pitchesOrdered = timed.map((x) => x.pitch);
  const chromaticSteps = countMelodicChromaticSteps(pitchesOrdered);
  return {
    pitchesOrdered,
    startBeats: starts,
    chromaticSteps,
    offStrongGrid: hasOffStrongGridOnset(starts),
    variety: hasRhythmicVariety(starts),
  };
}

/**
 * Section passes if there is at least one chromatic step, or off-grid placement, or rhythmic variety.
 * Fails only when the line is fully diatonic (no semitone steps) AND square (on-grid + low variety).
 */
export function sectionHasBacharachSignal(sig: GuitarSectionSignal): boolean {
  if (sig.pitchesOrdered.length === 0) return false;
  if (sig.chromaticSteps >= 1) return true;
  if (sig.offStrongGrid) return true;
  if (sig.variety) return true;
  return false;
}
