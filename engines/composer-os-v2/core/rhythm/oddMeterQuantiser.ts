/**
 * Odd-meter grid helpers + pulse quantisation (Phase A infrastructure).
 * Supports mixed meters bar-by-bar; defaults to 4/4 when a bar is not listed.
 */

import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { BarMeterMap, BarMeterSignature } from './barMeterTypes';

export const DEFAULT_BAR_METER: BarMeterSignature = { numerator: 4, denominator: 4 };

/** Divisions (ticks) for one full measure at the given notated meter. */
export function measureDivisionsForMeter(numerator: number, denominator: number): number {
  if (numerator <= 0 || denominator <= 0) {
    throw new Error(`oddMeterQuantiser: invalid meter ${numerator}/${denominator}`);
  }
  return Math.round((numerator * 4 * DIVISIONS) / denominator);
}

/** Effective meter for a 1-based bar; defaults to 4/4 when map or entry missing. */
export function resolveMeterForBar(bar1Based: number, map: BarMeterMap | undefined): BarMeterSignature {
  if (!map) return DEFAULT_BAR_METER;
  const m = map[bar1Based];
  return m ?? DEFAULT_BAR_METER;
}

/** Measure length in MusicXML divisions for bar `bar1Based`. */
export function resolveMeasureDivisionsForBar(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return measureDivisionsForMeter(sig.numerator, sig.denominator);
}

export interface QuantisedBar {
  bar: number;
  numerator: number;
  denominator: number;
  measureDivisions: number;
  /** Onsets snapped to the notated beat grid (sorted ascending). */
  onsetDivisionsSorted: number[];
}

/**
 * Quantise normalized pulses (0..1 along the bar) to the nearest beat boundary for the bar's meter.
 * Pulses outside [0,1] are clamped before scaling.
 */
export function quantiseToMeter(bar1Based: number, pulses: number[], map: BarMeterMap): QuantisedBar {
  const sig = resolveMeterForBar(bar1Based, map);
  const measureDivisions = measureDivisionsForMeter(sig.numerator, sig.denominator);
  const beatGrid =
    sig.numerator > 0 ? measureDivisions / sig.numerator : DIVISIONS;

  const onsets: number[] = [];
  for (const rawPulse of pulses) {
    const pulse = Math.min(1, Math.max(0, rawPulse));
    const pos = pulse * measureDivisions;
    const snapped = Math.round(pos / beatGrid) * beatGrid;
    const clamped = Math.min(measureDivisions, Math.max(0, snapped));
    onsets.push(clamped);
  }
  onsets.sort((a, b) => a - b);
  return {
    bar: bar1Based,
    numerator: sig.numerator,
    denominator: sig.denominator,
    measureDivisions,
    onsetDivisionsSorted: onsets,
  };
}

/** True if meter differs between two adjacent 1-based bars (export: emit `<time>` when true). */
export function adjacentBarsMeterDiffers(prevBar1Based: number, nextBar1Based: number, map: BarMeterMap | undefined): boolean {
  const a = resolveMeterForBar(prevBar1Based, map);
  const b = resolveMeterForBar(nextBar1Based, map);
  return a.numerator !== b.numerator || a.denominator !== b.denominator;
}
