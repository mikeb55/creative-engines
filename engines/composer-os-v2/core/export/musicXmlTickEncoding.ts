/**
 * Single source for MusicXML <duration> + <type> (+ <dot/>) from one tick integer.
 * divisions = ticks per quarter note (e.g. 480). No independent type/duration inference.
 */

import { MUSIC_XML_DIVISIONS_PER_QUARTER, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';

export type TickNoteSpec = { ticks: number; type: string; dots: 0 | 1 | 2 };

/** 1/32 beat at 480 divisions/quarter — all quantized spans decompose cleanly to standard note lengths. */
export const TICK_GRID = 15;

/** Quantize beat-derived raw ticks to grid (straight; no swing). */
export function quantizeBeatToTicks(beat: number): number {
  const raw = Math.round(beat * MUSIC_XML_DIVISIONS_PER_QUARTER);
  const q = Math.round(raw / TICK_GRID) * TICK_GRID;
  return Math.min(MEASURE_DIVISIONS, Math.max(0, q));
}

/** Map beat span to integer ticks (same quantization as export note/rest segments). */
export function beatSpanToTicks(startBeat: number, endBeat: number): { start: number; end: number } {
  const start = Math.min(MEASURE_DIVISIONS, Math.max(0, quantizeBeatToTicks(startBeat)));
  const end = Math.min(MEASURE_DIVISIONS, Math.max(0, quantizeBeatToTicks(endBeat)));
  return { start, end: Math.max(start, end) };
}

/** Build every standard length (undotted, dotted, double-dotted) in 480-based system. */
function buildStandardSpecs(): TickNoteSpec[] {
  const D = MUSIC_XML_DIVISIONS_PER_QUARTER;
  const mults = [4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125]; // whole .. 128th in quarter units
  const types = ['whole', 'half', 'quarter', 'eighth', '16th', '32nd', '64th', '128th'] as const;
  const specs: TickNoteSpec[] = [];
  for (let i = 0; i < mults.length; i++) {
    const base = Math.round(D * mults[i]);
    if (base < 1) continue;
    const t = types[i];
    const push = (ticks: number, dots: 0 | 1 | 2) => {
      if (ticks > 0 && ticks <= MEASURE_DIVISIONS) specs.push({ ticks, type: t, dots });
    };
    push(base, 0);
    push(Math.round(base * 1.5), 1);
    push(Math.round(base * 1.75), 2);
  }
  const byTicks = new Map<number, TickNoteSpec>();
  for (const s of specs) {
    if (s.ticks > 0 && s.ticks <= MEASURE_DIVISIONS && !byTicks.has(s.ticks)) {
      byTicks.set(s.ticks, s);
    }
  }
  return [...byTicks.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, v]) => v);
}

const STANDARD_SPECS_DESC = buildStandardSpecs();
const STANDARD_TICKS_DESC = STANDARD_SPECS_DESC.map((s) => s.ticks);

/** Greedy decomposition into standard tick lengths (all on 15-grid). */
export function decomposeTicksToStandardParts(totalTicks: number): number[] {
  if (totalTicks === 0) return [];
  if (totalTicks < 0 || totalTicks > MEASURE_DIVISIONS) {
    throw new Error(`musicXmlTickEncoding: invalid segment ticks ${totalTicks}`);
  }
  if (totalTicks % TICK_GRID !== 0) {
    throw new Error(
      `musicXmlTickEncoding: ticks ${totalTicks} not on ${TICK_GRID}-tick grid (quantize beats first)`
    );
  }
  const parts: number[] = [];
  let remaining = totalTicks;
  while (remaining > 0) {
    let found = 0;
    for (const len of STANDARD_TICKS_DESC) {
      if (len <= remaining) {
        found = len;
        break;
      }
    }
    if (found === 0) {
      throw new Error(`musicXmlTickEncoding: cannot decompose ${remaining} ticks into standard note lengths`);
    }
    parts.push(found);
    remaining -= found;
  }
  return parts;
}

const COINS_ASC = [...new Set(STANDARD_TICKS_DESC)].sort((a, b) => a - b);

/**
 * Minimize the number of note/rest elements (fewer ties) while using only standard tick lengths.
 * Can differ from greedy decomposition when multiple coin combinations exist for the same total.
 */
export function decomposeTicksToMinimalParts(totalTicks: number): number[] {
  if (totalTicks === 0) return [];
  if (totalTicks < 0 || totalTicks > MEASURE_DIVISIONS) {
    throw new Error(`musicXmlTickEncoding: invalid segment ticks ${totalTicks}`);
  }
  if (totalTicks % TICK_GRID !== 0) {
    throw new Error(
      `musicXmlTickEncoding: ticks ${totalTicks} not on ${TICK_GRID}-tick grid (quantize beats first)`
    );
  }
  const dp = new Array(totalTicks + 1).fill(Infinity);
  dp[0] = 0;
  for (let n = 1; n <= totalTicks; n++) {
    for (const c of COINS_ASC) {
      if (c <= n && dp[n - c] !== Infinity) {
        dp[n] = Math.min(dp[n], 1 + dp[n - c]);
      }
    }
  }
  if (dp[totalTicks] === Infinity) {
    throw new Error(`musicXmlTickEncoding: cannot decompose ${totalTicks} ticks (minimal parts)`);
  }
  const parts: number[] = [];
  let remaining = totalTicks;
  while (remaining > 0) {
    let bestC = 0;
    for (const c of COINS_ASC) {
      if (c <= remaining && dp[remaining] === 1 + dp[remaining - c] && c > bestC) {
        bestC = c;
      }
    }
    if (bestC === 0) {
      throw new Error(`musicXmlTickEncoding: minimal decomposition reconstruct failed at ${remaining}`);
    }
    parts.push(bestC);
    remaining -= bestC;
  }
  return parts;
}

/** Map a single standard tick length to type + dots XML (same source as duration). */
export function tickSpecForLength(ticks: number): TickNoteSpec {
  const spec = STANDARD_SPECS_DESC.find((s) => s.ticks === ticks);
  if (!spec) {
    throw new Error(`musicXmlTickEncoding: no single-note spec for ${ticks} ticks`);
  }
  return spec;
}

export function typeAndDotsXml(spec: TickNoteSpec): string {
  let xml = `<type>${spec.type}</type>`;
  if (spec.dots >= 1) xml += '<dot/>';
  if (spec.dots >= 2) xml += '<dot/>';
  return xml;
}

/** Duration + type + dots from one tick value (must be a standard single-note length). */
export function durationTypeDotsXmlFromTicks(ticks: number): string {
  const spec = tickSpecForLength(ticks);
  return `<duration>${ticks}</duration>${typeAndDotsXml(spec)}`;
}
