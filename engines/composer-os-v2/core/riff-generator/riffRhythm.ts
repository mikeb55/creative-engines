/**
 * Grid-aligned riff rhythms: eighth or sixteenth grid, allowed durations only.
 */

import type { RiffDensity, RiffGridMode, RiffRhythmSegment } from './riffTypes';
import { randInt } from './riffRandom';

const EPS = 1e-5;

function fillRatioForDensity(d: RiffDensity): number {
  if (d === 'sparse') return 0.4;
  if (d === 'dense') return 0.62;
  return 0.52;
}

function allowedDurations(grid: RiffGridMode, remaining: number): number[] {
  const base =
    grid === 'sixteenth' ? [0.25, 0.5, 1, 1.5, 2] : [0.5, 1, 1.5, 2];
  return base.filter((x) => x <= remaining + EPS).sort((a, b) => b - a);
}

/**
 * One bar of rhythm segments (sum = 4 beats).
 */
export function buildOneBarRhythm(
  rng: () => number,
  grid: RiffGridMode,
  density: RiffDensity,
  startOnAnd: boolean
): RiffRhythmSegment[] {
  const fill = fillRatioForDensity(density);
  const out: RiffRhythmSegment[] = [];
  let cursor = startOnAnd ? 0.5 : 0;

  while (cursor < 4 - EPS) {
    const remaining = 4 - cursor;
    const choices = allowedDurations(grid, remaining);
    if (choices.length === 0) break;
    const d = choices[randInt(rng, 0, choices.length - 1)]!;
    const rest = rng() > fill;
    out.push({ startBeat: cursor, duration: d, rest });
    cursor += d;
  }

  if (out.length === 0) {
    return [{ startBeat: 0, duration: 4, rest: true }];
  }
  let sum = 0;
  for (const s of out) sum += s.duration;
  if (Math.abs(sum - 4) > EPS) {
    const last = out[out.length - 1]!;
    last.duration += 4 - sum;
  }
  if (out.every((s) => s.rest)) {
    return [
      { startBeat: 0, duration: 1, rest: false },
      { startBeat: 1, duration: 1, rest: false },
      { startBeat: 2, duration: 1, rest: false },
      { startBeat: 3, duration: 1, rest: false },
    ];
  }
  return out;
}

function copyBar(bar: RiffRhythmSegment[]): RiffRhythmSegment[] {
  return bar.map((b) => ({ ...b }));
}

/** Slight variation for asymmetry (not identical to first bar). */
function varyBar(motif: RiffRhythmSegment[], rng: () => number): RiffRhythmSegment[] {
  const v = copyBar(motif);
  const idx = randInt(rng, 0, Math.max(0, v.length - 1));
  const seg = v[idx];
  if (seg && !seg.rest) seg.rest = rng() > 0.65;
  return v;
}

/**
 * Multi-bar: repeat rhythmic cell ≥2×; last bar may vary for loop; avoid full-bar symmetry when possible.
 */
export function buildMultiBarRhythm(
  rng: () => number,
  grid: RiffGridMode,
  density: RiffDensity,
  bars: number
): RiffRhythmSegment[][] {
  const startOnAnd = rng() > 0.45;
  const motif = buildOneBarRhythm(rng, grid, density, startOnAnd);
  const perBar: RiffRhythmSegment[][] = [];

  for (let b = 0; b < bars; b++) {
    if (bars >= 2 && b === bars - 1) {
      perBar.push(varyBar(motif, rng));
    } else {
      perBar.push(copyBar(motif));
    }
  }
  return perBar;
}

export function rhythmFingerprint(bar: RiffRhythmSegment[]): string {
  return bar
    .filter((s) => !s.rest)
    .map((s) => `${s.startBeat.toFixed(2)}:${s.duration.toFixed(2)}`)
    .join('|');
}

export function countMaxRhythmRepeats(perBar: RiffRhythmSegment[][]): number {
  const fps = perBar.map(rhythmFingerprint);
  const counts = new Map<string, number>();
  for (const f of fps) {
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return Math.max(0, ...[...counts.values()]);
}

export function hasSyncopation(perBar: RiffRhythmSegment[][]): boolean {
  for (const bar of perBar) {
    for (const s of bar) {
      if (s.rest) continue;
      const x = s.startBeat;
      if (Math.abs(x - Math.round(x)) > 0.11) return true;
    }
  }
  return false;
}
