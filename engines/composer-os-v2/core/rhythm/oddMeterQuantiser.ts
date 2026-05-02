/**
 * Odd-meter grid helpers + pulse quantisation (Phase A infrastructure).
 * Supports mixed meters bar-by-bar; defaults to 4/4 when a bar is not listed.
 */

import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { BarMeterMap, BarMeterSignature } from './barMeterTypes';

/** Reference 2-bar alternating cycles (same tiling as app `zappa_classic` / `black_page` meter presets). */
export const ZAPPA_CLASSIC_METER_CYCLE: readonly BarMeterSignature[] = [
  { numerator: 7, denominator: 8 },
  { numerator: 4, denominator: 4 },
];

export const ZAPPA_BLACK_PAGE_METER_CYCLE: readonly BarMeterSignature[] = [
  { numerator: 19, denominator: 16 },
  { numerator: 4, denominator: 4 },
];

/**
 * Named Zappa meter preset: one full cycle tiled bar-by-bar for `totalBars`
 * (same semantics as HomeGenerate Pattern tab with `barsPerStep: 1`).
 */
export interface ZappaMeterCyclePresetDefinition {
  readonly id: string;
  readonly label: string;
  readonly cycle: readonly BarMeterSignature[];
}

/** Seven extended UI/engine presets (cycles only; Classic / Black Page remain in-app defaults). */
export const ZAPPA_METER_CYCLE_PRESET_DEFINITIONS: readonly ZappaMeterCyclePresetDefinition[] = [
  {
    id: 'zappa_oh_no',
    label: 'Oh No (4/4 + 3/4)',
    cycle: [
      { numerator: 4, denominator: 4 },
      { numerator: 3, denominator: 4 },
    ],
  },
  {
    id: 'zappa_thirteen',
    label: 'Thirteen (4/4 + 5/8)',
    cycle: [
      { numerator: 4, denominator: 4 },
      { numerator: 5, denominator: 8 },
    ],
  },
  {
    id: 'zappa_five_five_five',
    label: 'Five Five FIVE (5/8 + 5/8 + 5/4)',
    cycle: [
      { numerator: 5, denominator: 8 },
      { numerator: 5, denominator: 8 },
      { numerator: 5, denominator: 4 },
    ],
  },
  {
    id: 'zappa_outside_now',
    label: 'Outside Now (11/8)',
    cycle: [{ numerator: 11, denominator: 8 }],
  },
  {
    id: 'zappa_watermelon',
    label: 'Watermelon (9/4)',
    cycle: [{ numerator: 9, denominator: 4 }],
  },
  {
    id: 'zappa_toads',
    label: 'Toads (5/4 + 3/4 + 4/4)',
    cycle: [
      { numerator: 5, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 4, denominator: 4 },
    ],
  },
  {
    id: 'zappa_factory',
    label: 'Factory (5/4)',
    cycle: [{ numerator: 5, denominator: 4 }],
  },
];

/** Tile `cycle` across `barCount` bars (1-based bar order). */
export function tileZappaMeterCycle(
  cycle: readonly BarMeterSignature[],
  barCount: number
): Array<{ numerator: number; denominator: number }> {
  const n = Math.max(0, Math.floor(barCount));
  if (cycle.length === 0 || n === 0) return [];
  const out: Array<{ numerator: number; denominator: number }> = [];
  for (let b = 1; b <= n; b++) {
    const m = cycle[(b - 1) % cycle.length]!;
    out.push({ numerator: m.numerator, denominator: m.denominator });
  }
  return out;
}

/** Pattern-tab seed: one step per bar in the cycle, `barsPerStep` 1. */
export function zappaMeterCycleToPresetPattern(cycle: readonly BarMeterSignature[]): {
  steps: Array<{ numerator: number; denominator: number }>;
  barsPerStep: number;
} {
  return {
    steps: cycle.map((c) => ({ numerator: c.numerator, denominator: c.denominator })),
    barsPerStep: 1,
  };
}

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

/** Bar span in quarter-note beat units (score model), same as `resolveMeasureDivisionsForBar / DIVISIONS`. */
export function resolveMeasureBeatSpanQuarters(bar1Based: number, map: BarMeterMap | undefined): number {
  return resolveMeasureDivisionsForBar(bar1Based, map) / DIVISIONS;
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
