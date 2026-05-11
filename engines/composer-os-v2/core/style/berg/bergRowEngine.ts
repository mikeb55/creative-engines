/**
 * Alban Berg–family row utilities — modular segments, classical twelve-tone transforms,
 * hexachord bookkeeping, trichord motivic index, ic1/ic6 weighting (reference vocabulary).
 */

export type BergRowSegmentTag = 'triadic-tonal' | 'whole-tone' | 'chromatic-link';

export type BergTriadQuality = 'maj' | 'min' | 'dim' | 'aug';
export type BergSeventhQuality = 'dom7' | 'halfdim7' | 'maj7' | 'min7';

export interface BergRecoverableHarmony {
  kind: 'triad' | 'seventh';
  rootPc: number;
  quality: BergTriadQuality | BergSeventhQuality;
}

export interface BergRowModule {
  tag: BergRowSegmentTag;
  /** Ordered pitch classes for this segment (0–11). */
  orderedPitchClasses: readonly number[];
  /** Recoverable tertian interpretations for segment windows (planning / receipts). */
  recoverable: readonly BergRecoverableHarmony[];
}

export interface BergDerivedRows {
  prime: readonly number[];
  retrograde: readonly number[];
  inverse: readonly number[];
  retrogradeInverse: readonly number[];
}

export interface BergTrichordIndexEntry {
  /** Normalized trichord pitch-class set string e.g. "0,2,4". */
  setKey: string;
  /** Which derived row names contain this window (any contiguous triple). */
  rows: readonly string[];
  /** Occurrence count across all scanned rows. */
  count: number;
}

const IC1_IC6_WEIGHT = 2.5;
const OTHER_IC_WEIGHT = 1;

function pc(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Ordered pitch-class row (typically length 12, all pcs distinct). */
export function normalizeTwelveToneRow(row: readonly number[]): number[] {
  return row.map((p) => pc(p));
}

export function retrograde(row: readonly number[]): number[] {
  return [...row].reverse().map(pc);
}

export function inverse(row: readonly number[], axisPc = 0): number[] {
  return row.map((p) => pc(axisPc - (p - axisPc)));
}

export function retrogradeInverse(row: readonly number[], axisPc = 0): number[] {
  return retrograde(inverse(row, axisPc));
}

export function deriveTwelveToneRows(row: readonly number[], axisPc = 0): BergDerivedRows {
  const P = normalizeTwelveToneRow(row);
  return {
    prime: P,
    retrograde: retrograde(P),
    inverse: inverse(P, axisPc),
    retrogradeInverse: retrogradeInverse(P, axisPc),
  };
}

/** First six ordered pitch classes (hexachord H0). */
export function orderedHexachord(row: readonly number[]): number[] {
  const r = normalizeTwelveToneRow(row);
  return r.slice(0, 6);
}

/** Unordered pitch-class set of first hexachord. */
export function unorderedHexachordSet(row: readonly number[]): Set<number> {
  return new Set(orderedHexachord(row));
}

/**
 * Complement hexachord (unordered) — the six pitch classes not in the first hexachord.
 */
export function complementaryHexachordSet(row: readonly number[]): Set<number> {
  const h = unorderedHexachordSet(row);
  const out = new Set<number>();
  for (let p = 0; p < 12; p++) {
    if (!h.has(p)) out.add(p);
  }
  return out;
}

/**
 * Split row into two ordered hexachords; second half uses remaining pcs in row order.
 */
export function splitHexachordHalves(row: readonly number[]): { first: number[]; second: number[] } {
  const r = normalizeTwelveToneRow(row);
  return { first: r.slice(0, 6), second: r.slice(6, 12) };
}

/**
 * Ordered interval classes between consecutive pcs in a row (length row.length - 1).
 */
export function orderedIntervalClasses(row: readonly number[]): number[] {
  const r = normalizeTwelveToneRow(row);
  const out: number[] = [];
  for (let i = 0; i < r.length - 1; i++) {
    const d = pc(r[i + 1]! - r[i]!);
    out.push(Math.min(d, 12 - d));
  }
  return out;
}

/**
 * Weighted score favouring ic1 (minor second) and ic6 (tritone) in adjacent intervals.
 */
export function ic16WeightedRowScore(row: readonly number[]): number {
  const oic = orderedIntervalClasses(row);
  let s = 0;
  for (const ic of oic) {
    if (ic === 1 || ic === 6) s += IC1_IC6_WEIGHT;
    else s += OTHER_IC_WEIGHT;
  }
  return s;
}

/**
 * Compare two rows by ic1/ic6 emphasis + lex tie-break (higher better).
 */
export function compareRowsByIc16Bias(a: readonly number[], b: readonly number[]): number {
  const sa = ic16WeightedRowScore(a);
  const sb = ic16WeightedRowScore(b);
  if (sa !== sb) return sa - sb;
  const aa = normalizeTwelveToneRow(a).join(',');
  const bb = normalizeTwelveToneRow(b).join(',');
  return aa < bb ? -1 : aa > bb ? 1 : 0;
}

function trichordKey(a: number, b: number, c: number): string {
  const x = [pc(a), pc(b), pc(c)].sort((u, v) => u - v);
  return `${x[0]},${x[1]},${x[2]}`;
}

/** All contiguous trichord windows (unordered set keys) in a row. */
export function trichordWindowKeys(row: readonly number[]): string[] {
  const r = normalizeTwelveToneRow(row);
  const keys: string[] = [];
  for (let i = 0; i + 2 < r.length; i++) {
    keys.push(trichordKey(r[i]!, r[i + 1]!, r[i + 2]!));
  }
  return keys;
}

/**
 * Index shared trichords across named derived rows for motivic overlap diagnostics.
 */
export function indexSharedTrichords(labeledRows: Record<string, readonly number[]>): BergTrichordIndexEntry[] {
  const tally = new Map<string, { rows: Set<string>; count: number }>();
  for (const [name, row] of Object.entries(labeledRows)) {
    const seen = new Set<string>();
    for (const k of trichordWindowKeys(row)) {
      seen.add(k);
    }
    for (const k of seen) {
      let e = tally.get(k);
      if (!e) {
        e = { rows: new Set(), count: 0 };
        tally.set(k, e);
      }
      e.rows.add(name);
      e.count++;
    }
  }
  const out: BergTrichordIndexEntry[] = [];
  for (const [setKey, v] of tally) {
    if (v.rows.size >= 2) {
      out.push({ setKey, rows: [...v.rows].sort(), count: v.count });
    }
  }
  out.sort((a, b) => b.count - a.count || a.setKey.localeCompare(b.setKey));
  return out;
}

/**
 * Pick best transform among P/R/I/RI by ic1/ic6 weighted adjacent intervals.
 */
export function selectPreferredTransform(d: BergDerivedRows): {
  name: 'P' | 'R' | 'I' | 'RI';
  row: readonly number[];
} {
  const candidates: { name: 'P' | 'R' | 'I' | 'RI'; row: readonly number[] }[] = [
    { name: 'P', row: d.prime },
    { name: 'R', row: d.retrograde },
    { name: 'I', row: d.inverse },
    { name: 'RI', row: d.retrogradeInverse },
  ];
  let best = candidates[0]!;
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    if (compareRowsByIc16Bias(c.row, best.row) > 0) best = c;
  }
  return best;
}

/**
 * Validate modules concatenate to a twelve-tone row (optional strict uniqueness).
 */
export function modulesToTwelveToneRow(modules: readonly BergRowModule[]): number[] | null {
  const pcs: number[] = [];
  for (const m of modules) {
    for (const p of m.orderedPitchClasses) pcs.push(pc(p));
  }
  if (pcs.length !== 12) return null;
  const set = new Set(pcs);
  if (set.size !== 12) return null;
  return pcs;
}
