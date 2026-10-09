/**
 * Performance Composer — chord labels, pitch spelling and seeded random.
 * Plumbing moved unchanged from the retired WWH RESPOND operator (873d791).
 * Chord qualities cover all labels in the nine WWH duo leadsheets (checked against tonal.js).
 */

/* ------------------------------------------------------------------ chords */

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = 'CDEFGAB';

/** Interval content of chord qualities used across the nine WWH duo leadsheets (checked against tonal.js). */
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  maj9: [0, 2, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m9: [0, 2, 3, 7, 10],
  m11: [0, 2, 3, 5, 7, 10],
  mMaj7: [0, 3, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  'maj7#5': [0, 4, 8, 11],
  'maj7#11': [0, 4, 6, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '9': [0, 2, 4, 7, 10],
  '13': [0, 2, 4, 7, 9, 10],
};
const ADD_DEGREE: Record<string, number> = {
  '2': 2, b2: 1, '4': 5, '#4': 6, b6: 8, '6': 9, '9': 2, b9: 1, '#9': 3, '11': 5, '#11': 6, '13': 9, b13: 8,
};

export interface PcChord {
  label: string;
  rootPc: number;
  rootStep: string;
  rootAlter: number;
  chordPcs: number[];
  /** Chord tones plus colour tensions that suit the quality. */
  fieldPcs: number[];
  bassPc?: number;
  augmentedFifth: boolean;
}

function pcOf(step: string, alter: number): number {
  return (((NATURAL[step] ?? 0) + alter) % 12 + 12) % 12;
}

function noteToken(token: string): { step: string; alter: number } | null {
  const m = /^([A-G])(#{1,2}|b{1,2})?$/.exec(token);
  if (!m) return null;
  const acc = m[2] ?? '';
  return { step: m[1]!, alter: acc.startsWith('#') ? acc.length : -acc.length };
}

/** Parse an imported harmony label (e.g. "Fm(add9)", "Eb7sus4/Ab", "Amajor/#C", "C°7"). Null for N.C. */
export function parseChordLabel(label: string): PcChord | null {
  const raw = label.trim();
  if (!raw || /N\.?C\.?/i.test(raw)) return null;
  const [bodyRaw, bassRaw] = raw.split('/');
  const body = bodyRaw ?? '';
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(body);
  if (!m) throw new Error(`chord "${label}" has no root`);
  const root = noteToken(m[1]!);
  if (!root) throw new Error(`chord "${label}" has a bad root`);
  let quality = (m[2] ?? '').trim();
  const adds: number[] = [];
  const paren = /\(([^)]*)\)/.exec(quality);
  if (paren) {
    quality = quality.replace(paren[0], '');
    for (const part of paren[1]!.split(',')) {
      const token = part.trim().replace(/^add/, '');
      if (token === 'maj7') {
        quality = `${quality}Maj7`;
        continue;
      }
      const degree = ADD_DEGREE[token];
      if (degree === undefined) throw new Error(`chord "${label}": unknown added degree "${token}"`);
      adds.push(degree);
    }
  }
  quality = quality
    .replace(/^major$/, '')
    .replace(/^minor$/, 'm')
    .replace(/°7/, 'dim7')
    .replace(/°/, 'dim')
    .replace(/^mMaj7$|^mmaj7$|^m\(maj7\)$/, 'mMaj7')
    .replace(/^min/, 'm')
    .replace(/^add9$/, '')
    .trim();
  if (/^add9$/.test((m[2] ?? '').trim())) adds.push(2);
  if (quality === 'Maj7') quality = 'maj7';
  if (quality === 'mMaj7' || quality === 'mmaj7') quality = 'mMaj7';
  const intervals = QUALITY[quality];
  if (!intervals) throw new Error(`chord "${label}": unknown quality "${quality}"`);
  const rootPc = pcOf(root.step, root.alter);
  const chord = new Set(intervals.map((i) => (rootPc + i) % 12));
  for (const add of adds) chord.add((rootPc + add) % 12);
  const has = (i: number) => chord.has((rootPc + i) % 12);
  const colour = new Set<number>();
  const minorThird = has(3) && !has(4);
  const diminished = has(3) && has(6) && !has(7);
  if (diminished) {
    /* diminished colours stay inside the chord */
  } else if (minorThird) {
    colour.add(2);
    colour.add(5);
  } else if (has(10) && has(4)) {
    colour.add(2);
    colour.add(9);
  } else if (has(5) || has(2)) {
    colour.add(2);
    colour.add(9);
    if (!has(10)) colour.add(5);
  } else if (has(4)) {
    colour.add(2);
    colour.add(9);
    if (!has(5)) colour.add(6);
  } else {
    colour.add(2);
    colour.add(5);
  }
  const field = new Set(chord);
  for (const c of colour) field.add((rootPc + c) % 12);
  let bassPc: number | undefined;
  if (bassRaw) {
    const fixed = bassRaw.trim().replace(/^([#b])([A-G])$/, '$2$1');
    const bass = noteToken(fixed);
    if (!bass) throw new Error(`chord "${label}" has a bad bass`);
    bassPc = pcOf(bass.step, bass.alter);
  }
  return {
    label: raw,
    rootPc,
    rootStep: root.step,
    rootAlter: root.alter,
    chordPcs: [...chord].sort((a, b) => a - b),
    fieldPcs: [...field].sort((a, b) => a - b),
    bassPc,
    augmentedFifth: has(8) && has(4) && !has(7),
  };
}

/** Spell a sounding MIDI pitch relative to the chord root (b3, b7, #11 …). */
export function spellForChord(midi: number, chord: PcChord | null, fifths: number): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  let step: string;
  let alter: number;
  if (chord) {
    const interval = (pc - chord.rootPc + 12) % 12;
    const letterSteps = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6][interval]!;
    const adjusted = interval === 6 && !chord.chordPcs.includes(pc) ? 3 : interval === 8 && chord.augmentedFifth ? 4 : letterSteps;
    const letterIndex = (LETTERS.indexOf(chord.rootStep) + adjusted) % 7;
    step = LETTERS[letterIndex]!;
    alter = pc - NATURAL[step]!;
    if (alter > 6) alter -= 12;
    if (alter < -6) alter += 12;
    if (Math.abs(alter) > 1) {
      ({ step, alter } = plainSpelling(pc, fifths));
    }
  } else {
    ({ step, alter } = plainSpelling(pc, fifths));
  }
  const octave = Math.floor((midi - NATURAL[step]! - alter) / 12) - 1;
  return { step, alter, octave };
}

function plainSpelling(pc: number, fifths: number): { step: string; alter: number } {
  const flats = fifths <= 0;
  for (const step of LETTERS) if (NATURAL[step] === pc) return { step, alter: 0 };
  if (flats) {
    const step = [...LETTERS].find((s: string) => (NATURAL[s]! - 1 + 12) % 12 === pc)!;
    return { step, alter: -1 };
  }
  const step = [...LETTERS].find((s: string) => (NATURAL[s]! + 1) % 12 === pc)!;
  return { step, alter: 1 };
}

/* ------------------------------------------------------------------ seeded random */

export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) ^ 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sounding MIDI number from a spelled pitch (C4 = 60). */
export function midiOfPitch(step: string, alter: number, octave: number): number {
  const natural = NATURAL[step];
  if (natural === undefined) throw new Error(`bad step ${step}`);
  return (octave + 1) * 12 + natural + alter;
}
