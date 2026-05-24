/**
 * P6/P7 — Song schema meterMap → dense {@link BarMeterMap} + merge helpers.
 */

import type { BarMeterMap, BarMeterSignature } from '../rhythm/barMeterTypes';
import { sanitizeBarMeterMap } from '../rhythm/barMeterTypes';
import type { Song } from './sectionArchitectureTypes';

const DEFAULT_METER: BarMeterSignature = { numerator: 4, denominator: 4 };

/** Parse written meter label (e.g. `4/4`, `7/8`) to signature. Invalid → 4/4. */
export function parseMeterLabel(meter: string | undefined): BarMeterSignature {
  if (!meter || typeof meter !== 'string') return { ...DEFAULT_METER };
  const parts = meter.trim().split('/');
  if (parts.length !== 2) return { ...DEFAULT_METER };
  const numerator = Math.round(Number(parts[0]));
  const denominator = Math.round(Number(parts[1]));
  if (numerator <= 0 || denominator <= 0) return { ...DEFAULT_METER };
  return { numerator, denominator };
}

/** Dense map: every bar 1..totalBars carries `meter` (default 4/4). */
export function denseBarMeterFromDefaults(totalBars: number, meter?: string): BarMeterMap {
  const sig = parseMeterLabel(meter ?? '4/4');
  const map: BarMeterMap = {};
  const tb = Math.max(0, Math.floor(totalBars));
  for (let b = 1; b <= tb; b++) {
    map[b] = { ...sig };
  }
  return map;
}

/**
 * Expand {@link Song} section `meterMap` spans to a dense {@link BarMeterMap}.
 * Global {@link SongDefaults.meter} seeds all bars; section spans carry-forward within each section.
 */
export function resolveBarMeterMapFromSong(song: Song): BarMeterMap {
  const tb = Math.max(1, Math.floor(song.totalBars));
  const map = denseBarMeterFromDefaults(tb, song.globalDefaults.meter ?? '4/4');

  for (const section of song.sections) {
    const lo = Math.max(1, Math.floor(section.barRange.startBar));
    const hi = Math.min(tb, Math.floor(section.barRange.endBar));
    if (hi < lo) continue;

    const spans = section.meterMap ?? [];
    if (spans.length === 0) continue;

    const sorted = [...spans].sort((a, b) => a.bar - b.bar);

    for (let b = lo; b <= hi; b++) {
      let active = map[b] ?? parseMeterLabel(song.globalDefaults.meter);
      for (const span of sorted) {
        if (Math.floor(span.bar) <= b) {
          active = parseMeterLabel(span.meter);
        }
      }
      map[b] = { ...active };
    }
  }

  return map;
}

/**
 * Merge two maps; `overlay` wins per bar. All bars from both maps appear in output.
 */
export function mergeBarMeterMaps(
  base: BarMeterMap | undefined,
  overlay: BarMeterMap | undefined
): BarMeterMap | undefined {
  const b = base ?? {};
  const o = overlay ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(o)]);
  if (keys.size === 0) return undefined;
  const out: BarMeterMap = {};
  for (const k of keys) {
    const bar = parseInt(k, 10);
    if (!Number.isFinite(bar) || bar < 1) continue;
    out[bar] = o[bar] ?? b[bar]!;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Sanitized request map merged on top of section-derived map (request wins). */
export function mergeSectionAndRequestBarMeterMaps(
  sectionMap: BarMeterMap | undefined,
  requestMap: BarMeterMap | undefined
): BarMeterMap | undefined {
  return mergeBarMeterMaps(sectionMap, sanitizeBarMeterMap(requestMap));
}
