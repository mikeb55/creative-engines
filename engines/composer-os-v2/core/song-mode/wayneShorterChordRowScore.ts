/**
 * Heuristic scoring for Wayne Shorter–style chord rows (Song Mode pools).
 * Picks pool rows by rule affinity instead of pure modulo indexing.
 */

const ROOT_AT_START = /^([A-G])([#b]?)/;

function chordRootPc(symbol: string): number | null {
  const m = symbol.trim().match(ROOT_AT_START);
  if (!m) return null;
  const letter = m[1]!;
  const acc = m[2] ?? '';
  const baseMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const base = baseMap[letter];
  if (base === undefined) return null;
  const accOff = acc === '#' ? 1 : acc === 'b' ? -1 : 0;
  return (base + accOff + 120) % 12;
}

/** Smallest distance 0–6 between two pitch classes. */
function intervalClassBetween(pc0: number, pc1: number): number {
  const d = (pc1 - pc0 + 12) % 12;
  if (d === 0) return 0;
  return Math.min(d, 12 - d);
}

function isPlainMajorOrMinorTriadSymbol(symbol: string): boolean {
  const s = symbol.trim();
  return /^[A-G][#b]?$/.test(s) || /^[A-G][#b]?m$/.test(s);
}

function isMinorSevenChord(symbol: string): boolean {
  return /^[A-G][#b]?m7/.test(symbol.trim());
}

/** Dominant family (excludes minor7, maj7, mmaj7). */
function isDominantStyleChord(symbol: string): boolean {
  const t = symbol.trim();
  if (/^[A-G][#b]?m7/.test(t)) return false;
  if (/maj7|mmaj7/.test(t)) return false;
  if (/7alt|7sus|13sus|7#11/.test(t)) return true;
  /** Strict letter-root dominant 7 (e.g. G7, Bb7) without “maj7”. */
  return /^[A-G][#b]?7(?:$|[^a-z#])/i.test(t);
}

function hasMajorSeven(symbol: string): boolean {
  return /maj7/.test(symbol.trim());
}

function hasObviousIiVI(row: string[]): boolean {
  if (row.length < 3) return false;
  for (let i = 0; i <= row.length - 3; i++) {
    const a = row[i]!;
    const b = row[i + 1]!;
    const c = row[i + 2]!;
    if (!isMinorSevenChord(a)) continue;
    if (!isDominantStyleChord(b)) continue;
    if (!hasMajorSeven(c)) continue;
    const ra = chordRootPc(a);
    const rb = chordRootPc(b);
    const rc = chordRootPc(c);
    if (ra == null || rb == null || rc == null) continue;
    const up0 = (rb - ra + 12) % 12;
    const up1 = (rc - rb + 12) % 12;
    /** Ascending fifth / fourth chain typical of ii–V–I in major (roots P4 apart). */
    if (up0 === 5 && up1 === 5) return true;
  }
  return false;
}

/**
 * Score a chord row for Shorter-like characteristics; clamped to 0–100.
 */
export function scoreChordRowForShorter(row: string[]): number {
  let score = 0;
  const syms = row.map((s) => s.trim());

  if (syms.some((s) => /maj7#11|maj7b5/.test(s))) score += 10;
  if (syms.some((s) => /7alt|7#11/.test(s))) score += 10;
  if (syms.some((s) => /m9|m11|mmaj7/.test(s))) score += 10;
  if (!syms.some(isPlainMajorOrMinorTriadSymbol)) score += 10;

  if (syms.length >= 2) {
    const pcs = syms.map(chordRootPc);
    let motionOk = true;
    let sawFourthClass = false;
    for (let i = 0; i < pcs.length - 1; i++) {
      const p0 = pcs[i];
      const p1 = pcs[i + 1];
      if (p0 == null || p1 == null) {
        motionOk = false;
        continue;
      }
      const ic = intervalClassBetween(p0, p1);
      if (ic === 5) sawFourthClass = true;
      if (ic !== 0 && ic !== 2 && ic !== 3) motionOk = false;
    }
    if (!sawFourthClass && motionOk) score += 15;
  }

  if (hasObviousIiVI(syms)) score -= 20;

  return Math.max(0, Math.min(100, score));
}
