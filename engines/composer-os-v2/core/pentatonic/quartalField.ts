/**
 * Dev 5C quartal use of one pentatonic field.
 * Vertical colour for comping. One fourth-led cell for a line.
 * Not a McCoy Tyner vocabulary and not a guitar fingering model.
 */

import { mod12 } from './pitch';

export const PENTATONIC_QUARTAL_VERSION = 'pentatonic-quartal-field-5c';

export interface QuartalSubset {
  pitchClasses: readonly number[];
  perfectFourths: number;
  incomplete: true;
}

export interface QuartalComp {
  version: typeof PENTATONIC_QUARTAL_VERSION;
  kind: 'COMP';
  pitches: readonly number[];
  pitchClasses: readonly number[];
  perfectFourths: number;
  incomplete: true;
  /** Attacks divided by a 4-beat bar. Sparse stays under 1. */
  density: number;
  fillsEveryBeat: boolean;
}

export interface QuartalLine {
  version: typeof PENTATONIC_QUARTAL_VERSION;
  kind: 'LINE';
  pitches: readonly number[];
  pitchClasses: readonly number[];
  perfectFourths: number;
  mechanical: boolean;
  scaleRun: boolean;
  registerJump: boolean;
  lineagePreserved: boolean;
  declined: boolean;
}

function unique(pcs: readonly number[]): number[] {
  return [...new Set(pcs.map((pc) => mod12(pc)))].sort((left, right) => left - right);
}

export function isPerfectFourth(left: number, right: number): boolean {
  const raw = Math.abs(mod12(left) - mod12(right));
  return Math.min(raw, 12 - raw) === 5;
}

function fourthCount(pcs: readonly number[]): number {
  let count = 0;
  for (let i = 0; i < pcs.length; i += 1) {
    for (let j = i + 1; j < pcs.length; j += 1) {
      if (isPerfectFourth(pcs[i]!, pcs[j]!)) count += 1;
    }
  }
  return count;
}

export function quartalSubsets(pitchClasses: readonly number[]): QuartalSubset[] {
  const pcs = unique(pitchClasses);
  const subsets: QuartalSubset[] = [];
  for (let i = 0; i < pcs.length; i += 1) {
    for (let j = i + 1; j < pcs.length; j += 1) {
      const pair = [pcs[i]!, pcs[j]!];
      const fourths = fourthCount(pair);
      if (fourths === 0) continue;
      subsets.push({ pitchClasses: pair, perfectFourths: fourths, incomplete: true });
    }
  }
  for (let i = 0; i < pcs.length; i += 1) {
    for (let j = i + 1; j < pcs.length; j += 1) {
      for (let k = j + 1; k < pcs.length; k += 1) {
        const group = [pcs[i]!, pcs[j]!, pcs[k]!];
        const fourths = fourthCount(group);
        if (fourths === 0) continue;
        subsets.push({ pitchClasses: group, perfectFourths: fourths, incomplete: true });
      }
    }
  }
  return subsets.sort((left, right) => right.perfectFourths - left.perfectFourths || left.pitchClasses.length - right.pitchClasses.length);
}

function nearestMidi(midi: number, pc: number): number {
  let best = midi;
  let bestDistance = 99;
  for (let candidate = midi - 12; candidate <= midi + 12; candidate += 1) {
    if (mod12(candidate) !== mod12(pc)) continue;
    const distance = Math.abs(candidate - midi);
    if (distance < bestDistance || (distance === bestDistance && candidate >= midi && best < midi)) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function inField(pitch: number, field: readonly number[]): boolean {
  const wanted = new Set(unique(field));
  return wanted.has(mod12(pitch));
}

/** Prefer a 2-note fourth. A 3-note stack is used only when it links two fourths. */
export function realiseQuartalComp(pitchClasses: readonly number[], register = 64): QuartalComp | null {
  const subsets = quartalSubsets(pitchClasses);
  const linked = subsets.find((subset) => subset.pitchClasses.length === 3 && subset.perfectFourths >= 2);
  const pair = subsets.find((subset) => subset.pitchClasses.length === 2);
  const chosen = pair ?? linked ?? subsets[0];
  if (!chosen) return null;
  const voices = chosen.pitchClasses.length <= 2 ? chosen : linked && !pair ? linked : chosen;
  const limited = voices.pitchClasses.slice(0, 3);
  let cursor = register;
  const pitches = limited.map((pc) => {
    const midi = nearestMidi(cursor, pc);
    cursor = midi + 1;
    return midi;
  });
  const ordered = [...pitches].sort((left, right) => left - right);
  return {
    version: PENTATONIC_QUARTAL_VERSION,
    kind: 'COMP',
    pitches: ordered,
    pitchClasses: limited,
    perfectFourths: fourthCount(limited),
    incomplete: true,
    density: ordered.length / 4,
    fillsEveryBeat: ordered.length >= 4,
  };
}

function melodicFourths(pitches: readonly number[]): number {
  let count = 0;
  let previousSign = 0;
  for (let index = 1; index < pitches.length; index += 1) {
    const gap = pitches[index]! - pitches[index - 1]!;
    if (Math.abs(gap) !== 5) {
      previousSign = 0;
      continue;
    }
    const sign = gap > 0 ? 1 : -1;
    if (sign === previousSign) count += 1;
    previousSign = sign;
  }
  return count;
}

export function quartalLineFaults(pitches: readonly number[], field: readonly number[]): {
  mechanical: boolean;
  scaleRun: boolean;
  registerJump: boolean;
  outsideField: boolean;
  overDensity: boolean;
} {
  const ordered = unique(field);
  const degrees = pitches.map((pitch) => ordered.indexOf(mod12(pitch)));
  let adjacent = 0;
  let run = 0;
  for (let index = 1; index < degrees.length; index += 1) {
    const left = degrees[index - 1]!;
    const right = degrees[index]!;
    if (left >= 0 && right >= 0 && (Math.abs(left - right) === 1 || Math.abs(left - right) === ordered.length - 1)) {
      run += 1;
      if (run > adjacent) adjacent = run;
    } else {
      run = 0;
    }
  }
  return {
    mechanical: melodicFourths(pitches) >= 1,
    scaleRun: pitches.length >= 4 && adjacent >= 3,
    registerJump: pitches.some((pitch, index) => index > 0 && Math.abs(pitch - pitches[index - 1]!) > 9),
    outsideField: pitches.some((pitch) => !inField(pitch, field)),
    overDensity: pitches.length > 4,
  };
}

/**
 * One fourth, then a field tone that is not another fourth in the same direction.
 * The cell keeps parent pitch classes that already live in the field.
 */
export function realiseQuartalLine(args: {
  fieldPitchClasses: readonly number[];
  parentPitches: readonly number[];
  register?: number;
}): QuartalLine {
  const field = unique(args.fieldPitchClasses);
  const parent = args.parentPitches.filter((pitch) => inField(pitch, field));
  const startPitch = parent[0] ?? nearestMidi(args.register ?? 64, field[0] ?? 0);
  const startPc = mod12(startPitch);
  const fourths = field.filter((pc) => isPerfectFourth(startPc, pc));
  const empty: QuartalLine = {
    version: PENTATONIC_QUARTAL_VERSION,
    kind: 'LINE',
    pitches: [],
    pitchClasses: [],
    perfectFourths: 0,
    mechanical: false,
    scaleRun: false,
    registerJump: false,
    lineagePreserved: false,
    declined: true,
  };
  if (fourths.length === 0) return empty;
  const secondPc = fourths
    .map((pc) => nearestMidi(startPitch, pc))
    .sort((left, right) => Math.abs(left - startPitch) - Math.abs(right - startPitch) || left - right)[0]!;
  const secondPitch = Math.abs(secondPc - startPitch) > 7 ? startPitch + (secondPc > startPitch ? 5 : -5) : secondPc;
  const safeSecond = mod12(secondPitch) === mod12(secondPc) ? secondPitch : nearestMidi(startPitch, secondPc);
  const thirds = field.filter((pc) => pc !== mod12(safeSecond) && pc !== startPc && !isPerfectFourth(mod12(safeSecond), pc));
  if (thirds.length === 0) return empty;
  const parentPcs = new Set(parent.map((pitch) => mod12(pitch)));
  const preferred = thirds.filter((pc) => parentPcs.has(pc));
  const pool = preferred.length > 0 ? preferred : thirds;
  const thirdPitch = pool
    .map((pc) => nearestMidi(safeSecond, pc))
    .sort((left, right) => Math.abs(left - safeSecond) - Math.abs(right - safeSecond) || left - right)[0]!;
  let pitches = [startPitch, safeSecond, thirdPitch];
  if (Math.abs(thirdPitch - safeSecond) === 5 && Math.sign(thirdPitch - safeSecond) === Math.sign(safeSecond - startPitch)) {
    const other = pool.map((pc) => nearestMidi(safeSecond, pc)).find((midi) => Math.abs(midi - safeSecond) !== 5);
    if (other === undefined) return empty;
    pitches = [startPitch, safeSecond, other];
  }
  const faults = quartalLineFaults(pitches, field);
  if (faults.mechanical || faults.scaleRun || faults.registerJump || faults.outsideField) return empty;
  const sounded = new Set(pitches.map((pitch) => mod12(pitch)));
  let shared = 0;
  for (const pc of parentPcs) if (sounded.has(pc)) shared += 1;
  const lineagePreserved = parentPcs.size === 0 ? true : shared >= Math.min(2, parentPcs.size);
  return {
    version: PENTATONIC_QUARTAL_VERSION,
    kind: 'LINE',
    pitches,
    pitchClasses: pitches.map((pitch) => mod12(pitch)),
    perfectFourths: 1,
    mechanical: false,
    scaleRun: false,
    registerJump: false,
    lineagePreserved,
    declined: !lineagePreserved,
  };
}
