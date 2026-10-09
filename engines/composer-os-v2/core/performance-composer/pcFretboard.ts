/**
 * Performance Composer — fretboard path solver (standard tuning, sounding pitch).
 * Finds one fingering for a whole guitar part: every attack moment, every held note kept on its string,
 * hand shifts priced by the time available. Reports the hardest moments so playability is checked, not assumed.
 */

/** Sounding MIDI of the open strings, string 1 (high E) to string 6 (low E). */
export const OPEN_STRINGS = [64, 59, 55, 50, 45, 40] as const;
export const FRET_MAX = 15;
/** Largest distance between fretted notes held at once (frets), without a stretch. */
export const SPAN_MAX = 4;

export interface Fingering {
  midi: number;
  /** MusicXML string number: 1 = high E. */
  string: number;
  fret: number;
}

export interface FretSlice {
  /** Absolute time in quarter notes from the start of the piece. */
  time: number;
  /** Every pitch sounding at this moment (new attacks plus held notes). */
  midis: number[];
  /** Pitches in `midis` that are held over from the previous slice (must keep their string and fret). */
  held: number[];
  /** Bar this slice belongs to (document order). */
  bar: number;
}

export interface FretSolution {
  ok: boolean;
  /** Index of the first slice that could not be fingered (when ok is false). */
  failedAt: number;
  fingerings: Fingering[][];
  maxFret: number;
  maxSpan: number;
  /** Hand moves of more than five frets with less than one beat to make them. */
  hardShifts: number;
  /** Hand position (lowest fretted fret) at each slice; 0 = open strings only. */
  positions: number[];
}

/** Every way to put these pitches on separate strings, highest pitch on the highest string. */
export function fingeringOptions(midis: readonly number[]): Fingering[][] {
  const notes = [...new Set(midis)].sort((a, b) => b - a);
  const out: Fingering[][] = [];
  if (notes.length === 0) return [[]];
  if (notes.length > 4) return out;
  const walk = (i: number, minString: number, acc: Fingering[]) => {
    if (i === notes.length) {
      const fretted = acc.filter((f) => f.fret > 0).map((f) => f.fret);
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > SPAN_MAX) return;
      out.push([...acc]);
      return;
    }
    for (let s = minString; s <= 6; s++) {
      const fret = notes[i]! - OPEN_STRINGS[s - 1]!;
      if (fret < 0 || fret > FRET_MAX) continue;
      acc.push({ midi: notes[i]!, string: s, fret });
      walk(i + 1, s + 1, acc);
      acc.pop();
    }
  };
  walk(0, 1, []);
  return out;
}

function positionOf(f: readonly Fingering[]): number {
  const fretted = f.filter((x) => x.fret > 0).map((x) => x.fret);
  return fretted.length ? Math.min(...fretted) : 0;
}

function spanOf(f: readonly Fingering[]): number {
  const fretted = f.filter((x) => x.fret > 0).map((x) => x.fret);
  return fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
}

function nodeCost(f: readonly Fingering[]): number {
  let c = 0;
  for (const x of f) if (x.fret > 9) c += 0.6 * (x.fret - 9) + (x.fret > 12 ? 2 * (x.fret - 12) : 0);
  const span = spanOf(f);
  if (span === 4) c += 3;
  else if (span === 3) c += 0.8;
  return c;
}

/** Choose the cheapest fingering path through all slices (dynamic programming). */
export function solveFretPath(slices: readonly FretSlice[]): FretSolution {
  const empty: FretSolution = { ok: true, failedAt: -1, fingerings: [], maxFret: 0, maxSpan: 0, hardShifts: 0, positions: [] };
  if (!slices.length) return empty;
  const layers: Array<{ opts: Fingering[][]; cost: number[]; back: number[] }> = [];
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i]!;
    const opts = fingeringOptions(s.midis);
    const cost = new Array<number>(opts.length).fill(Infinity);
    const back = new Array<number>(opts.length).fill(-1);
    if (i === 0) {
      opts.forEach((o, k) => (cost[k] = nodeCost(o)));
    } else {
      const prev = layers[i - 1]!;
      const prevSlice = slices[i - 1]!;
      const gap = s.time - prevSlice.time;
      // Staying in one position is worth more than any single comfortable fingering.
      const weight = gap < 0.5 ? 3 : gap < 1 ? 1.8 : gap < 2 ? 1.2 : 0.8;
      opts.forEach((o, k) => {
        for (let j = 0; j < prev.opts.length; j++) {
          if (!Number.isFinite(prev.cost[j]!)) continue;
          const p = prev.opts[j]!;
          // Held notes stay exactly where they are.
          let okHeld = true;
          for (const h of s.held) {
            const a = p.find((x) => x.midi === h);
            const b = o.find((x) => x.midi === h);
            if (!a || !b || a.string !== b.string || a.fret !== b.fret) {
              okHeld = false;
              break;
            }
          }
          if (!okHeld) continue;
          const pp = positionOf(p);
          const op = positionOf(o);
          const shift = pp && op ? Math.abs(pp - op) : 0;
          let c = prev.cost[j]! + nodeCost(o) + shift * weight + (shift > 0 ? 1.5 : 0);
          if (shift > 5 && gap < 1) c += 25;
          if (c < cost[k]!) {
            cost[k] = c;
            back[k] = j;
          }
        }
      });
    }
    layers.push({ opts, cost, back });
    if (!cost.some((c) => Number.isFinite(c))) {
      return { ...empty, ok: false, failedAt: i };
    }
  }
  const last = layers[layers.length - 1]!;
  let k = last.cost.indexOf(Math.min(...last.cost));
  const fingerings: Fingering[][] = new Array(slices.length);
  for (let i = slices.length - 1; i >= 0; i--) {
    fingerings[i] = layers[i]!.opts[k]!;
    k = layers[i]!.back[k]!;
  }
  let maxFret = 0;
  let maxSpan = 0;
  let hardShifts = 0;
  const positions = fingerings.map(positionOf);
  fingerings.forEach((f, i) => {
    for (const x of f) maxFret = Math.max(maxFret, x.fret);
    maxSpan = Math.max(maxSpan, spanOf(f));
    if (i > 0) {
      const gap = slices[i]!.time - slices[i - 1]!.time;
      const a = positions[i - 1]!;
      const b = positions[i]!;
      if (a && b && Math.abs(a - b) > 5 && gap < 1) hardShifts += 1;
    }
  });
  return { ok: true, failedAt: -1, fingerings, maxFret, maxSpan, hardShifts, positions };
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
export function romanPosition(fret: number): string {
  return ROMAN[fret] ?? String(fret);
}
