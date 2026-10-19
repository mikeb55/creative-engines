/**
 * Billy Strayhorn — root-motion guard.
 *
 * The Strayhorn slice passes recolour and reroute bars, but nothing in the
 * pipeline inspects root motion across three consecutive bars. A spine that
 * arrives carrying a functional ii-V-I therefore survives the slice fully
 * intact — enriched into `Dm9 | G13(b9) | Cmaj9(#11)`, still a ii-V-I.
 *
 * Strayhorn's distinctive writing avoids that specific root chain: his
 * characteristic passages move by 0, +/-1, +/-2, +/-3, +/-4 and +/-6 semitones.
 * Genuine ii-V-I appears in his work only at deliberately key-confirming
 * cadences (Chelsea Bridge A section, Isfahan B section), never in the
 * chromatic interior. This guard enforces that distinction mechanically.
 *
 * Detection is on root motion, not on chord spelling alone: a minor-seventh
 * family chord, then a dominant family chord a perfect fourth above it, then a
 * major family chord a perfect fourth above that. Both the ascending-fourth
 * (+5) and ascending-fifth (+7) readings are blocked so the guard is
 * insensitive to which inversion of the cycle the spine expresses.
 *
 * Repair prefers tritone reinterpretation of the middle dominant (BS_HARM_04),
 * which is Strayhorn's own device for exactly this situation — it breaks the
 * root chain to +11 / +11 while leaving the harmonic colour idiomatic. If the
 * middle bar is protected, the first chord is replanted as a minor-6/9 colour
 * sonority instead (BS_HARM_01), which removes it from the minor-seventh family
 * and dissolves the pattern without touching any root.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Root ascents that spell the forbidden cycle. +5 is the textbook fourth; +7 its fifth reading. */
const FORBIDDEN_ASCENTS: readonly number[] = [5, 7];

export interface StrayhornRootMotionViolation {
  /** 1-based bar of the minor-seventh chord that opens the chain. */
  startBar: number;
  /** The three offending symbols in order. */
  chords: readonly [string, string, string];
  /** Signed semitone root motion between consecutive pairs. */
  intervals: readonly [number, number];
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyPartOf(symbol: string): string {
  return parseChordSymbol(stemOnly(symbol)).harmonyPart;
}

function rootPcOf(symbol: string): number | undefined {
  const m = harmonyPartOf(symbol).match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function qualityOf(symbol: string): string {
  const hp = harmonyPartOf(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  return root ? hp.slice(root.length) : hp;
}

/** Ascending semitone distance from `a` up to `b`. */
function ascent(a: number, b: number): number {
  return ((b - a) % 12 + 12) % 12;
}

/**
 * Minor-seventh family: the `ii` of the forbidden cycle.
 * Excludes minor-6, minor-major7 and half-diminished — Strayhorn's minor colour
 * chords, which never function as a cycle-opening ii.
 */
export function isMinorSeventhFamily(symbol: string): boolean {
  const q = qualityOf(symbol);
  if (!q) return false;
  const lower = q.toLowerCase();
  if (/^m?maj/.test(lower) || lower.startsWith('mmaj')) return false;
  if (!/^m(?!aj)|^min|^-/.test(lower)) return false;
  if (/b5|ø|dim|half/.test(lower)) return false;
  if (/maj/.test(lower)) return false;
  if (/(^|[^0-9])6/.test(lower)) return false;
  return /(^|[^0-9])(7|9|11)/.test(lower);
}

/** Dominant family: the `V` of the forbidden cycle. */
export function isDominantFamily(symbol: string): boolean {
  const q = qualityOf(symbol);
  if (!q) return false;
  const lower = q.toLowerCase();
  if (/maj|dim|ø|sus|^m(?!aj)|^min|^-/.test(lower)) return false;
  return /^7|^9|^11|^13|^alt/.test(lower);
}

/** Major family: the `I` of the forbidden cycle. Bare triads included. */
export function isMajorFamily(symbol: string): boolean {
  const q = qualityOf(symbol);
  const lower = q.toLowerCase();
  if (/^m(?!aj)|^min|^-|dim|ø|aug|sus|b5/.test(lower)) return false;
  if (lower === '' || /^6/.test(lower)) return true;
  return /^maj|^m?maj/.test(lower);
}

/**
 * True when the three symbols spell minor7 -> dominant7 -> major with each root
 * ascending a perfect fourth (or its fifth reading).
 */
export function isForbiddenCycle(a: string, b: string, c: string): boolean {
  const pa = rootPcOf(a);
  const pb = rootPcOf(b);
  const pc = rootPcOf(c);
  if (pa === undefined || pb === undefined || pc === undefined) return false;

  const first = ascent(pa, pb);
  const second = ascent(pb, pc);
  if (!FORBIDDEN_ASCENTS.includes(first) || !FORBIDDEN_ASCENTS.includes(second)) return false;
  if (first !== second) return false;

  return isMinorSeventhFamily(a) && isDominantFamily(b) && isMajorFamily(c);
}

/** Signed semitone motion, ascending positive, folded to the nearest direction. */
function signedInterval(from: string, to: string): number {
  const a = rootPcOf(from);
  const b = rootPcOf(to);
  if (a === undefined || b === undefined) return 0;
  const up = ascent(a, b);
  return up > 6 ? up - 12 : up;
}

/** Every forbidden cycle in a bar array, scanning consecutive triples. */
export function findRootMotionViolations(bars: readonly string[]): StrayhornRootMotionViolation[] {
  const out: StrayhornRootMotionViolation[] = [];
  for (let i = 0; i + 2 < bars.length; i++) {
    const a = bars[i];
    const b = bars[i + 1];
    const c = bars[i + 2];
    if (!a || !b || !c) continue;
    if (!isForbiddenCycle(a, b, c)) continue;
    out.push({
      startBar: i + 1,
      chords: [a, b, c],
      intervals: [signedInterval(a, b), signedInterval(b, c)],
    });
  }
  return out;
}

/** Tritone reinterpretation of a dominant, preserving any slash bass. */
export function tritoneReinterpret(symbol: string): string | undefined {
  const pc = rootPcOf(symbol);
  if (pc === undefined) return undefined;
  return `${pitchClassToSharpName((pc + 6) % 12)}13(b9)${slashTail(symbol)}`;
}

/** Replant a chord as a minor-6/9 parallel colour sonority on its own root. */
export function replantAsColourChord(symbol: string): string | undefined {
  const root = harmonyPartOf(symbol).match(ROOT_AT_START)?.[1];
  if (!root) return undefined;
  return `${root}m6(9)${slashTail(symbol)}`;
}

export interface RootMotionGuardOptions {
  /** Returns true when a 1-based bar must not be rewritten. */
  isProtectedBar?: (bar: number) => boolean;
}

export interface RootMotionGuardResult {
  /** Number of cycles rewritten. */
  defused: number;
  /** Cycles that could not be rewritten because every candidate bar was protected. */
  unresolved: StrayhornRootMotionViolation[];
  /** `bs:*` receipts describing each rewrite. */
  receipts: string[];
}

/**
 * Rewrites every forbidden cycle in `bars` in place. Re-scans after each repair
 * so that a rewrite which happens to create a new cycle downstream is caught in
 * the same call, and terminates on a bounded pass count.
 */
export function applyStrayhornRootMotionGuard(
  bars: string[],
  opts: RootMotionGuardOptions = {}
): RootMotionGuardResult {
  const protectedBar = opts.isProtectedBar ?? (() => false);
  const receipts: string[] = [];
  let defused = 0;
  let unresolved: StrayhornRootMotionViolation[] = [];

  const maxPasses = bars.length + 4;
  for (let pass = 0; pass < maxPasses; pass++) {
    const violations = findRootMotionViolations(bars);
    if (violations.length === 0) {
      unresolved = [];
      break;
    }

    let progressed = false;
    unresolved = [];

    for (const v of violations) {
      const domBar = v.startBar + 1;
      const minorBar = v.startBar;

      if (!protectedBar(domBar)) {
        const sub = tritoneReinterpret(bars[domBar - 1]!);
        if (sub) {
          bars[domBar - 1] = sub;
          receipts.push(`bs:iiVI_defused@bar${domBar}:tritone_reinterpretation`);
          defused++;
          progressed = true;
          continue;
        }
      }

      if (!protectedBar(minorBar)) {
        const colour = replantAsColourChord(bars[minorBar - 1]!);
        if (colour) {
          bars[minorBar - 1] = colour;
          receipts.push(`bs:iiVI_defused@bar${minorBar}:parallel_colour_replant`);
          defused++;
          progressed = true;
          continue;
        }
      }

      unresolved.push(v);
    }

    if (!progressed) break;
  }

  return { defused, unresolved, receipts };
}
