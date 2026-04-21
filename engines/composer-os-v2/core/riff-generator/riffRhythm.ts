/**
 * Grid-aligned riff rhythms: eighth or sixteenth grid, allowed durations only.
 */

import type { RiffDensity, RiffGridMode, RiffRhythmSegment, RiffStyleId } from './riffTypes';
import { randInt } from './riffRandom';

const EPS = 1e-5;

function fillRatioForDensity(d: RiffDensity): number {
  /** Probability a grid cell is played (vs rest): slightly higher “medium” fill reduces threadbare loops. */
  if (d === 'sparse') return 0.42;
  if (d === 'dense') return 0.62;
  return 0.56;
}

function allowedDurations(grid: RiffGridMode, remaining: number): number[] {
  const base =
    grid === 'sixteenth' ? [0.25, 0.5, 1, 1.5, 2] : [0.5, 1, 1.5, 2];
  return base.filter((x) => x <= remaining + EPS).sort((a, b) => b - a);
}

function isStrong(startBeat: number): boolean {
  return Math.abs(startBeat - Math.round(startBeat)) < 0.11;
}

/**
 * Short-riff style identity pass:
 * - neutral: slightly straighter attack profile (on-beat anchor preserved)
 * - scofield: more off-beat articulation without destroying motif shape
 * - funk: strongest off-beat bias (anticipation feel)
 */
function applyShortRiffStyleBias(
  bar: RiffRhythmSegment[],
  style: RiffStyleId,
  grid: RiffGridMode,
  rng: () => number
): void {
  if (style === 'neutral') {
    const offPlayed = bar.find((s) => !s.rest && !isStrong(s.startBeat));
    const onRest = bar.find((s) => s.rest && isStrong(s.startBeat));
    if (offPlayed && onRest && rng() > 0.58) {
      offPlayed.rest = true;
      onRest.rest = false;
    }
    return;
  }
  const offPool = bar.filter((s) => !isStrong(s.startBeat));
  if (offPool.length === 0) return;
  const target =
    style === 'funk'
      ? offPool.find((s) => Math.abs((s.startBeat % 1) - 0.5) < 0.11) ?? offPool[0]
      : offPool[offPool.length - 1];
  if (!target) return;
  target.rest = false;
  if (style === 'funk') {
    const strongPlayed = bar.find((s) => !s.rest && isStrong(s.startBeat) && s.duration <= (grid === 'sixteenth' ? 0.5 : 1));
    if (strongPlayed && rng() > 0.52) {
      strongPlayed.rest = true;
    }
  }
}

/**
 * One bar of rhythm segments (sum = 4 beats).
 */
export function buildOneBarRhythm(
  rng: () => number,
  grid: RiffGridMode,
  density: RiffDensity,
  startOnAnd: boolean,
  style: RiffStyleId
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
  applyShortRiffStyleBias(out, style, grid, rng);
  return out;
}

function copyBar(bar: RiffRhythmSegment[]): RiffRhythmSegment[] {
  return bar.map((b) => ({ ...b }));
}

/**
 * Build a lightweight response bar from motif:
 * keep attack geometry but rebalance rests across phrase halves so bar 2 answers bar 1.
 */
function buildResponseBar(motif: RiffRhythmSegment[], rng: () => number): RiffRhythmSegment[] {
  const out = copyBar(motif);
  const latePlayed = out.find((s) => !s.rest && s.startBeat >= 2);
  const earlyRest = out.find((s) => s.rest && s.startBeat < 2);
  if (latePlayed && earlyRest) {
    latePlayed.rest = true;
    earlyRest.rest = false;
    return out;
  }
  const firstPlayed = out.find((s) => !s.rest);
  if (firstPlayed) {
    firstPlayed.rest = rng() > 0.5;
  }
  if (out.every((s) => s.rest) && out[0]) {
    out[0].rest = false;
  }
  return out;
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
  bars: number,
  style: RiffStyleId
): RiffRhythmSegment[][] {
  const startOnAnd = rng() > 0.45;
  const motifA = buildOneBarRhythm(rng, grid, density, startOnAnd, style);
  const motifB = buildResponseBar(motifA, rng);
  const perBar: RiffRhythmSegment[][] = [];

  for (let b = 0; b < bars; b++) {
    if (bars >= 2 && b === bars - 1) {
      const tailBase = bars >= 4 && b % 2 === 1 ? motifB : motifA;
      perBar.push(varyBar(tailBase, rng));
    } else {
      const base = bars >= 4 && b % 2 === 1 ? motifB : motifA;
      perBar.push(copyBar(base));
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
