/**
 * Parse M1 "Protect guitar bars" specs: "28-29, 33, 36-39".
 * Empty / whitespace → no additional protection.
 */

export type ParseProtectedGuitarBarsResult =
  | { ok: true; bars: number[] }
  | { ok: false; error: string };

/**
 * Expand comma/semicolon/whitespace-separated bars and inclusive ranges.
 * Rejects invalid tokens and bars outside 1..barCount.
 */
export function parseProtectedGuitarBarSpec(
  raw: string | undefined | null,
  barCount: number,
): ParseProtectedGuitarBarsResult {
  if (raw === undefined || raw === null) return { ok: true, bars: [] };
  const text = String(raw).trim();
  if (!text) return { ok: true, bars: [] };
  if (!Number.isInteger(barCount) || barCount < 1) {
    return { ok: false, error: 'Cannot validate protected guitar bars without score bar count.' };
  }

  const bars = new Set<number>();
  const tokens = text.split(/[,;\s]+/).filter(Boolean);
  for (const token of tokens) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        return { ok: false, error: `Invalid range "${token}".` };
      }
      if (from > to) {
        return { ok: false, error: `Invalid range ${token}: start > end.` };
      }
      for (let b = from; b <= to; b++) {
        if (b < 1 || b > barCount) {
          return { ok: false, error: `Bar ${b} out of score (1–${barCount}).` };
        }
        bars.add(b);
      }
      continue;
    }
    if (!/^\d+$/.test(token)) {
      return { ok: false, error: `Invalid bar token "${token}". Use bars or ranges (e.g. 28-29, 33).` };
    }
    const n = Number(token);
    if (n < 1 || n > barCount) {
      return { ok: false, error: `Bar ${n} out of score (1–${barCount}).` };
    }
    bars.add(n);
  }
  return { ok: true, bars: [...bars].sort((a, b) => a - b) };
}
