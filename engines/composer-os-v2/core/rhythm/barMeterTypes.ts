/**
 * Bar-level time signatures for odd-meter / mixed-meter maps (Phase A).
 * Keys are 1-based score bar numbers matching MusicXML measure numbering.
 */

export interface BarMeterSignature {
  numerator: number;
  denominator: number;
}

/** 1-based bar index → meter; absent bars default to 4/4 in resolver helpers. */
export type BarMeterMap = Record<number, BarMeterSignature>;

/** Drop invalid entries; keeps only finite positive integer numerator/denominator per bar. */
export function sanitizeBarMeterMap(raw: BarMeterMap | undefined): BarMeterMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: BarMeterMap = {};
  for (const [k, v] of Object.entries(raw)) {
    const bar = typeof k === 'string' ? parseInt(k, 10) : Number(k);
    if (!Number.isFinite(bar) || bar < 1) continue;
    const numerator = Math.round(Number(v?.numerator));
    const denominator = Math.round(Number(v?.denominator));
    if (numerator <= 0 || denominator <= 0) continue;
    out[bar] = { numerator, denominator };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
