/**
 * V3.4 E1 checkpoint 3C — Herrmann, Ravel, Dutilleux.
 * One opt-in realiser. Three grammars. Not three engines.
 * Off unless `e1ComposerLanguage` is true. Lead-sheet anchors and a Stage D
 * phrase-block or secondary-authoritative blend refuse the pass.
 * Identity-locked bars are left as they were. This is not artistic approval.
 */

import { validateBassBehaviour, validateGuitarBehaviour } from '../instrument-behaviours/behaviourValidation';
import type { BassBehaviourPlan, GuitarBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { applyOperator } from '../motif-ops/operators';
import type { Motif, OperatorId } from '../motif-ops/types';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { Articulation, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { validateRegister } from '../score-integrity/registerValidation';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';

export const E1_COMPOSER_LANGUAGE_VERSION = 'e1-checkpoint3c-1';

export const E1_COMPOSER_LANGUAGE_IDS = ['bernard_herrmann', 'ravel', 'dutilleux'] as const;

export type E1ComposerLanguageId = (typeof E1_COMPOSER_LANGUAGE_IDS)[number];

export interface E1ComposerLanguageReceipt {
  version: string;
  enabled: true;
  status: 'applied' | 'refused';
  languageId: E1ComposerLanguageId | null;
  seed: number;
  bars: number;
  tempo: number;
  motifIntervals: number[];
  operators: string[];
  development: string[];
  harmony: string[];
  preservedBars: number[];
  reason?: string;
}

export interface E1ComposerLanguageRequest {
  seed: number;
  songwriterId?: string | null;
  leadSheetLocked?: boolean;
  blendBlocked?: boolean;
  /** 1-based bars whose notes must survive. */
  protectedBars?: number[];
}

const GUITAR_LOW = 52;
const GUITAR_HIGH = 79;
const COLOUR_LOW = 48;
const COLOUR_HIGH = 76;
const BASS_LOW = 33;
const BASS_HIGH = 50;
const TEMPO = 72;
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];

interface Slot {
  d: number;
  pc: number | null;
  art?: Articulation;
  vel?: number;
  lift?: boolean;
  doubleBelow?: number;
  /** After a silence, place this note from the opening register. */
  recall?: boolean;
}

interface BarPlan {
  guitar: Slot[];
  colour: Slot[];
  bass: Slot[];
  chord: string;
}

interface LanguagePlan {
  bars: BarPlan[];
  motifIntervals: number[];
  operators: string[];
  development: string[];
  cycleShift: number;
}

function mix(seed: number, salt: number): number {
  let x = (Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul(salt >>> 0, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function pick<T>(seed: number, salt: number, items: readonly T[]): T {
  return items[mix(seed, salt) % items.length]!;
}

function chordName(root: number, suffix: string): string {
  return `${NAMES[mod12(root)]}${suffix}`;
}

function slash(root: number, suffix: string, bass: number): string {
  return `${chordName(root, suffix)}/${NAMES[mod12(bass)]}`;
}

function placePc(pc: number, low: number, high: number, prefer: number): number {
  let best = low;
  let bestD = 99;
  for (let midi = low; midi <= high; midi++) {
    if (mod12(midi) !== mod12(pc)) continue;
    const d = Math.abs(midi - prefer);
    if (d < bestD) {
      bestD = d;
      best = midi;
    }
  }
  return best;
}

function fit(pc: number, prev: number | null, low: number, high: number, lift: boolean, prefer: number): number {
  const center = lift && prev != null ? prev + 12 : (prev ?? prefer);
  let best = low;
  let bestScore = 1e9;
  for (let cand = low; cand <= high; cand++) {
    if (mod12(cand) !== mod12(pc)) continue;
    let score = Math.abs(cand - center);
    if (prev != null && Math.abs(cand - prev) > 12) score += 50;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

function eighths(spec: Array<[number, number | null]>): Slot[] {
  const slots = spec.map(([count, pc]) => ({ d: count / 2, pc }));
  const sum = spec.reduce((total, [count]) => total + count, 0);
  if (sum !== 8) throw new Error(`bar grid summed to ${sum} eighths`);
  return slots;
}

function restBar(): Slot[] {
  return eighths([[8, null]]);
}

function motif(id: string, anchor: number, steps: readonly number[], field?: readonly number[]): Motif {
  return {
    id,
    field,
    events: steps.map((step, index) => ({ onset: index, duration: 1, midi: anchor + step })),
  };
}

function pcsOf(result: Motif): number[] {
  return result.events.filter((event) => event.midi !== null).map((event) => mod12(event.midi as number));
}

function runOp(source: Motif, op: OperatorId, params: Record<string, number>, ops: string[]): number[] {
  ops.push(op);
  return pcsOf(applyOperator(source, op, params).motif);
}

function resolveLanguage(id: string | null | undefined): E1ComposerLanguageId | null {
  const key = normalizeSongwriterStyleKey(id ?? '') ?? (id ?? '').trim().toLowerCase();
  if (key === 'bernard_herrmann' || key === 'herrmann') return 'bernard_herrmann';
  if (key === 'ravel') return 'ravel';
  if (key === 'dutilleux') return 'dutilleux';
  return null;
}

function planHerrmann(seed: number): LanguagePlan {
  const tonic = pick(seed, 1, [0, 2, 3, 5, 7, 8, 10]);
  const shape = pick(seed, 2, [
    [0, 1, 4, 6],
    [0, 1, 3, 6],
    [0, 1, 6, 3],
  ] as const);
  const anchor = placePc(tonic, 60, 67, 62 + (mix(seed, 3) % 3));
  const ops: string[] = [];
  const source = motif('herrmann', anchor, shape);
  const expanded = runOp(source, 'expand-intervals', { amount: 1 }, ops);
  const fragment = runOp(source, 'fragment-head', { count: 3 }, ops);
  runOp(source, 'displace', { beats: 0.5 }, ops);
  runOp(source, 'register-lift', { octaves: 1 }, ops);
  runOp(source, 'liquidate', { n: 1, count: 2 }, ops);
  const cell = shape.map((step) => mod12(tonic + step));
  const semi = mod12(tonic + 1);
  const tri = mod12(tonic + 6);
  const pedal = tonic;
  const stab = slash(tri, 'dim7', pedal);
  const bars: BarPlan[] = [
    {
      guitar: mark(eighths([[2, cell[0]!], [1, cell[1]!], [1, cell[2]!], [1, null], [3, cell[3]!]]), 0, 'accent', 78),
      colour: restBar(),
      bass: eighths([[8, pedal]]),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: eighths([[1, null], [1, cell[0]!], [2, cell[1]!], [1, null], [1, cell[2]!], [2, cell[3]!]]),
      colour: restBar(),
      bass: eighths([[6, pedal], [2, null]]),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: eighths([[2, fragment[0]!], [1, fragment[1]!], [1, null], [2, fragment[2]!], [2, null]]),
      colour: restBar(),
      bass: eighths([[4, pedal], [1, semi], [3, pedal]]),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: restBar(),
      colour: restBar(),
      bass: eighths([[8, pedal]]),
      chord: chordName(tonic, 'm(add2)'),
    },
    {
      guitar: eighths([[1, expanded[0]!], [1, expanded[1]!], [1, expanded[2]!], [1, expanded[3]!], [1, null], [3, null]]),
      colour: mark(eighths([[1, semi], [7, null]]), 0, 'accent', 84),
      bass: eighths([[4, pedal], [1, null], [3, pedal]]),
      chord: chordName(tonic, 'dim'),
    },
    {
      guitar: eighths([[3, expanded[0]!], [1, expanded[1]!], [2, null], [2, expanded[3]!]]),
      colour: mark(eighths([[1, tri], [7, null]]), 0, 'accent', 88),
      bass: eighths([[2, semi], [2, semi], [4, pedal]]),
      chord: chordName(tonic, 'dim'),
    },
    {
      guitar: markLift(eighths([[1, cell[0]!], [1, cell[1]!], [2, cell[2]!], [1, null], [3, cell[3]!]])),
      colour: restBar(),
      bass: eighths([[8, pedal]]),
      chord: chordName(tonic, 'aug'),
    },
    {
      guitar: eighths([[4, null], [2, fragment[0]!], [2, fragment[1]!]]),
      colour: restBar(),
      bass: eighths([[2, null], [6, pedal]]),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: eighths([[1, pedal], [1, semi], [2, null], [1, pedal], [2, semi], [1, null]]),
      colour: staccato(eighths([[1, pedal], [1, semi], [1, null], [1, pedal], [1, semi], [1, pedal], [1, null], [1, semi]]), 104),
      bass: eighths([[1, pedal], [1, pedal], [1, pedal], [1, pedal], [1, pedal], [1, pedal], [2, null]]),
      chord: stab,
    },
    {
      guitar: eighths([[2, null], [1, cell[0]!], [1, cell[1]!], [2, cell[3]!], [2, null]]),
      colour: staccato(eighths([[1, null], [1, pedal], [1, semi], [1, pedal], [1, null], [1, semi], [1, pedal], [1, semi]]), 108),
      bass: eighths([[1, null], [1, pedal], [1, pedal], [1, pedal], [1, pedal], [1, pedal], [2, null]]),
      chord: stab,
    },
    {
      guitar: eighths([[2, null], [2, cell[0]!], [2, cell[2]!], [2, cell[3]!]]),
      colour: staccato(eighths([[1, pedal], [1, pedal], [1, semi], [1, null], [1, semi], [1, semi], [1, null], [1, pedal]]), 112),
      bass: eighths([[4, pedal], [4, tri]]),
      chord: stab,
    },
    {
      guitar: mark(eighths([[4, cell[3]!], [4, null]]), 0, 'accent', 96),
      colour: staccato(eighths([[2, semi], [2, null], [1, pedal], [1, null], [1, semi], [1, null]]), 96),
      bass: eighths([[2, pedal], [2, null], [4, pedal]]),
      chord: chordName(tonic, 'aug'),
    },
    {
      guitar: restBar(),
      colour: restBar(),
      bass: mark(eighths([[8, pedal]]), 0, undefined, 60),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: restBar(),
      colour: restBar(),
      bass: restBar(),
      chord: chordName(tonic, 'm'),
    },
    {
      guitar: mark(eighths([[2, cell[0]!], [1, cell[1]!], [1, cell[2]!], [1, null], [3, cell[3]!]]), 0, 'accent', 78).map((slot, index) =>
        index === 0 ? { ...slot, recall: true } : slot,
      ),
      colour: restBar(),
      bass: eighths([[8, pedal]]),
      chord: chordName(tonic, 'm(add2)'),
    },
    {
      guitar: mark(eighths([[6, cell[0]!], [2, null]]), 0, 'tenuto', 64),
      colour: restBar(),
      bass: eighths([[4, pedal], [4, null]]),
      chord: chordName(tonic, 'm'),
    },
  ];
  return {
    bars,
    motifIntervals: [...shape],
    operators: [...new Set(ops)],
    cycleShift: 1,
    development: [
      `cell [${shape.join(',')}] on ${NAMES[tonic]}, stated, then delayed by an eighth`,
      'bar 3 keeps the head; intervals widen by one semitone',
      'bar 4 melody drops out over the pedal',
      'bars 7–8 lift the cell, then break it',
      'bars 9–12 semitone ostinato accumulates; bass bar 11 leaps a tritone',
      'bars 13–14 guitar is silent and the pedal releases',
      'bar 15 states the opening cell again; bar 16 holds its first tone',
    ],
  };
}

function modeOf(suffix: string): readonly number[] {
  if (suffix.includes('sus')) return MIXO;
  if (suffix.startsWith('m') && !suffix.startsWith('maj')) return DORIAN;
  return LYDIAN;
}

function planRavel(seed: number): LanguagePlan {
  const tonic = pick(seed, 1, [0, 2, 5, 9]);
  const anchor = placePc(tonic, 60, 69, 64 + (mix(seed, 3) % 3));
  const ops: string[] = [];
  const field = LYDIAN.map((degree) => mod12(tonic + degree));
  const source = motif('ravel', anchor, [0, 2, 4, 6], field);
  const opening = [0, 2, 4, 6].map((step) => mod12(tonic + step));
  const moved = runOp(source, 'transpose-in-field', { degrees: 1 }, ops);
  const doubling = pick(seed, 5, [15, 9] as const);
  const other = doubling === 15 ? 9 : 15;
  const changes: Array<[number, string]> = [
    [0, 'maj9'],
    [0, 'maj9'],
    [4, 'maj7'],
    [4, 'maj7'],
    [5, 'maj7#11'],
    [5, 'maj9'],
    [9, 'm11'],
    [9, 'm9'],
    [7, '9sus'],
    [5, 'maj7'],
    [5, 'maj9'],
    [11, 'm9'],
    [4, 'maj7'],
    [5, 'maj7#11'],
    [0, 'maj9'],
    [0, 'maj7'],
  ];
  const colourOf = (root: number, suffix: string) => mod12(root + (suffix.includes('#11') ? 6 : 2));
  const thirdOf = (suffix: string) => (suffix.startsWith('m') && !suffix.startsWith('maj') ? 3 : suffix.includes('sus') ? 5 : 4);
  const seventhOf = (suffix: string) => (suffix.startsWith('m') && !suffix.startsWith('maj') ? 10 : suffix.includes('sus') ? 10 : 11);
  const bars: BarPlan[] = changes.map(([rel, suffix], index) => {
    const root = mod12(tonic + rel);
    const scale = modeOf(suffix).slice(0, 4).map((degree) => mod12(root + degree));
    const chord = chordName(root, suffix);
    const bar = index + 1;
    if (bar >= 9 && bar <= 12) {
      return {
        guitar: mark(eighths([[6, colourOf(root, suffix)], [2, null]]), 0, 'tenuto', 70),
        colour: restBar(),
        bass: eighths([[1, scale[0]!], [1, scale[1]!], [2, scale[2]!], [1, null], [3, scale[3]!]]),
        chord,
      };
    }
    let guitar: Slot[];
    if (bar === 1) guitar = eighths([[3, opening[0]!], [1, opening[1]!], [2, opening[2]!], [2, null]]);
    else if (bar === 2) guitar = eighths([[1, opening[3]!], [1, opening[2]!], [4, opening[1]!], [2, null]]);
    else if (bar === 3) guitar = eighths([[2, moved[0]!], [2, moved[1]!], [2, moved[2]!], [2, moved[3]!]]);
    else if (bar === 4) guitar = mark(eighths([[6, moved[3]!], [2, null]]), 0, 'tenuto', 68);
    else if (bar === 5 || bar === 13) guitar = eighths([[2, scale[0]!], [2, scale[1]!], [2, scale[2]!], [2, scale[3]!]]);
    else if (bar === 6 || bar === 14) guitar = eighths([[2, scale[0]!], [1, scale[1]!], [3, scale[2]!], [2, null]]);
    else if (bar === 7 || bar === 15) guitar = eighths([[2, scale[3]!], [2, scale[2]!], [2, scale[1]!], [2, scale[0]!]]);
    else guitar = mark(eighths([[5, scale[0]!], [3, null]]), 0, 'tenuto', 66);
    if (bar === 13) guitar = eighths([[3, moved[0]!], [1, moved[1]!], [2, moved[2]!], [2, null]]);
    if (bar === 14) guitar = eighths([[1, moved[3]!], [1, moved[2]!], [4, moved[1]!], [2, null]]);
    if (bar === 16) guitar = mark(eighths([[6, moved[0]!], [2, null]]), 0, 'tenuto', 64);
    const inner = [1, 3, 5, 7, 13, 15].includes(bar);
    const interval = [1, 5, 13].includes(bar) ? doubling : other;
    const bassPc = bar % 2 === 1 ? mod12(root + thirdOf(suffix)) : mod12(root + seventhOf(suffix));
    return {
      guitar,
      colour: inner ? eighths([[4, null], [4, null]]).map((slot, slotIndex) => (slotIndex === 0 ? { ...slot, doubleBelow: interval, vel: 58 } : slot)) : restBar(),
      bass: eighths([[4, root], [3, bassPc], [1, null]]),
      chord,
    };
  });
  return {
    bars,
    motifIntervals: [0, 2, 4, 6],
    operators: [...new Set(ops)],
    cycleShift: 2,
    development: [
      `lydian cell on ${NAMES[tonic]}, then one field degree higher`,
      'harmony moves by common tone: maj9, mediant maj7, maj7#11, minor 11, suspended 9th',
      'inner voice doubles a tenth and a sixth, and only on selected bars',
      'bars 9–12 the guitar holds one colour tone and the bass takes the moving line',
      'bars 13–16 recall the opening rhythm at the transposed field degree',
    ],
  };
}

function planDutilleux(seed: number): LanguagePlan {
  const tonic = pick(seed, 1, [0, 2, 3, 5, 7, 9]);
  const tail = pick(seed, 2, [
    [2, 3, 7],
    [3, 7, 2],
    [7, 2, 3],
  ] as const);
  const shape = [0, ...tail];
  const anchor = placePc(tonic, 60, 67, 64 + (mix(seed, 3) % 2));
  const ops: string[] = [];
  const source = motif('dutilleux', anchor, shape);
  const inverted = runOp(source, 'invert', {}, ops);
  const path = mix(seed, 4) % 2;
  const middle = path === 0 ? runOp(source, 'expand-intervals', { amount: 1 }, ops) : runOp(source, 'retrograde', {}, ops);
  const head = runOp(source, 'fragment-head', { count: 3 }, ops);
  runOp(source, 'displace', { beats: 0.5 }, ops);
  const cell = shape.map((step) => mod12(tonic + step));
  const pivot = cell[0]!;
  const changes: Array<[number, string]> = [
    [0, 'maj7'],
    [0, 'maj7'],
    [0, 'maj7#11'],
    [0, 'maj7#11'],
    [0, 'm(maj7)'],
    [0, 'm(maj7)'],
    [0, 'm9'],
    [0, 'm9'],
    [8, 'maj7'],
    [8, 'maj7'],
    [9, 'm7'],
    [9, 'm7'],
    [0, 'maj7#11'],
    [0, 'maj7#11'],
    [0, 'maj7'],
    [0, 'maj7'],
  ];
  const guitarSpecs: Array<Array<[number, number | null]>> = [
    [[2, cell[0]!], [1, cell[1]!], [1, cell[2]!], [3, cell[3]!], [1, null]],
    [[4, cell[0]!], [1, cell[1]!], [1, cell[2]!], [2, cell[3]!]],
    [[2, cell[0]!], [2, cell[2]!], [2, cell[3]!], [2, null]],
    [[6, cell[0]!], [2, null]],
    [[1, inverted[0]!], [1, inverted[1]!], [1, inverted[2]!], [5, inverted[3]!]],
    [[2, inverted[3]!], [2, inverted[2]!], [2, inverted[1]!], [2, inverted[0]!]],
    [[2, null], [2, inverted[0]!], [2, inverted[1]!], [2, inverted[2]!]],
    [[8, inverted[0]!]],
    [[1, middle[0]!], [1, middle[1]!], [1, middle[2]!], [1, middle[3]!], [4, null]],
    [[4, middle[0]!], [4, middle[3]!]],
    [[1, null], [2, middle[1]!], [2, middle[2]!], [3, middle[0]!]],
    [[2, middle[0]!], [6, null]],
    [[1, null], [2, head[0]!], [2, head[1]!], [3, head[2]!]],
    [[1, head[0]!], [1, head[1]!], [2, null], [4, head[2]!]],
    [[4, cell[0]!], [2, head[1]!], [2, head[2]!]],
    [[6, cell[0]!], [2, null]],
  ];
  const bassSpecs: Array<Array<[number, number | null]>> = [
    [[2, null], [2, cell[0]!], [2, cell[1]!], [2, cell[2]!]],
    [[2, cell[3]!], [2, cell[0]!], [4, cell[1]!]],
    [[4, cell[0]!], [2, cell[3]!], [2, null]],
    [[8, cell[0]!]],
    [[2, inverted[0]!], [2, inverted[1]!], [2, inverted[2]!], [2, inverted[3]!]],
    [[4, inverted[0]!], [4, inverted[3]!]],
    [[2, null], [6, inverted[0]!]],
    [[4, inverted[0]!], [4, null]],
    [[2, pivot], [2, middle[1]!], [2, middle[2]!], [2, middle[0]!]],
    [[4, pivot], [4, middle[3]!]],
    [[8, pivot]],
    [[2, middle[0]!], [2, pivot], [4, null]],
    [[2, head[0]!], [2, head[1]!], [2, head[2]!], [2, pivot]],
    [[4, head[0]!], [4, pivot]],
    [[2, null], [2, cell[0]!], [4, head[2]!]],
    [[4, cell[0]!], [4, null]],
  ];
  const bars: BarPlan[] = changes.map(([rel, suffix], index) => ({
    guitar: eighths(guitarSpecs[index]!),
    colour: restBar(),
    bass: eighths(bassSpecs[index]!),
    chord: chordName(mod12(tonic + rel), suffix),
  }));
  const guitar4 = bars[3]!.guitar[0]!;
  guitar4.art = 'tenuto';
  guitar4.vel = 70;
  const guitar16 = bars[15]!.guitar[0]!;
  guitar16.art = 'tenuto';
  guitar16.vel = 64;
  const guitar13 = bars[12]!.guitar;
  if (guitar13[1]) guitar13[1].art = 'tenuto';
  return {
    bars,
    motifIntervals: shape,
    operators: [...new Set(ops)],
    cycleShift: 5,
    development: [
      `cell [${shape.join(',')}] on ${NAMES[tonic]}; the first pitch is the pivot`,
      'bars 5–8 invert that cell around the pivot',
      path === 0 ? 'bars 9–12 expand each interval by one semitone and keep the pivot' : 'bars 9–12 reverse the cell and keep the pivot',
      'bars 13–16 return the first three pitches, displaced, not the whole cell',
    ],
  };
}

function mark(slots: Slot[], index: number, art: Articulation | undefined, vel: number): Slot[] {
  const next = slots.map((slot) => ({ ...slot, vel: slot.vel ?? vel }));
  if (art && next[index] && next[index].pc !== null) next[index]!.art = art;
  return next;
}

function markLift(slots: Slot[]): Slot[] {
  return slots.map((slot) => (slot.pc === null ? slot : { ...slot, lift: true, vel: 92 }));
}

function staccato(slots: Slot[], vel: number): Slot[] {
  return slots.map((slot) => (slot.pc === null ? { ...slot, vel } : { ...slot, art: 'staccato' as const, vel }));
}

function planFor(language: E1ComposerLanguageId, seed: number): LanguagePlan {
  if (language === 'bernard_herrmann') return planHerrmann(seed);
  if (language === 'ravel') return planRavel(seed);
  return planDutilleux(seed);
}

function shifted(plan: LanguagePlan, cycle: number): BarPlan[] {
  const shift = plan.cycleShift * cycle;
  if (shift === 0) return plan.bars;
  return plan.bars.map((bar) => ({
    chord: bar.chord,
    guitar: bar.guitar.map((slot) => ({ ...slot, pc: slot.pc === null ? null : mod12(slot.pc + shift) })),
    colour: bar.colour.map((slot) => ({ ...slot, pc: slot.pc === null ? null : mod12(slot.pc + shift) })),
    bass: bar.bass.map((slot) => ({ ...slot, pc: slot.pc === null ? null : mod12(slot.pc + shift) })),
  }));
}

function barAt(plan: LanguagePlan, index: number): BarPlan {
  const cycle = Math.floor(index / plan.bars.length);
  const local = shifted(plan, cycle);
  return local[index % plan.bars.length]!;
}

function lay(slots: Slot[], voice: number, low: number, high: number, prefer: number, motifRef: string, prevIn: number | null): { events: ScoreEvent[]; last: number | null } {
  let at = 0;
  let prev = prevIn;
  const events: ScoreEvent[] = [];
  for (const slot of slots) {
    const start = Math.round(at * 2) / 2;
    if (slot.pc === null || slot.doubleBelow != null) {
      events.push(createRest(start, slot.d, voice));
    } else {
      const midi = fit(slot.pc, slot.recall ? null : prev, low, high, slot.lift === true, prefer);
      const note = createNote(midi, start, slot.d, voice, motifRef, undefined, slot.vel ?? 80);
      if (slot.art) note.articulation = slot.art;
      events.push(note);
      prev = midi;
    }
    at += slot.d;
  }
  return { events, last: prev };
}

function firstMelody(events: ScoreEvent[]): number | null {
  for (const event of events) {
    if (event.kind === 'note') return event.pitch;
  }
  return null;
}

function doubleBelow(melody: number, interval: number): number | null {
  let midi = melody - interval;
  while (midi < COLOUR_LOW) midi += 12;
  if (midi >= melody || midi > COLOUR_HIGH) return null;
  if (melody - midi > 16) return null;
  return midi;
}

function layColour(slots: Slot[], guitar: ScoreEvent[], motifRef: string): ScoreEvent[] {
  const melody = firstMelody(guitar);
  let at = 0;
  const events: ScoreEvent[] = [];
  for (const slot of slots) {
    const start = Math.round(at * 2) / 2;
    let midi: number | null = null;
    if (slot.doubleBelow != null && melody != null) {
      midi = doubleBelow(melody, slot.doubleBelow) ?? doubleBelow(melody, slot.doubleBelow === 15 ? 9 : 15);
    } else if (slot.pc !== null) {
      midi = fit(slot.pc, null, COLOUR_LOW, COLOUR_HIGH, false, 55);
    }
    if (midi === null) events.push(createRest(start, slot.d, 2));
    else {
      const note = createNote(midi, start, slot.d, 2, motifRef, undefined, slot.vel ?? 60);
      if (slot.art) note.articulation = slot.art;
      events.push(note);
    }
    at += slot.d;
  }
  return events;
}

function realise(language: E1ComposerLanguageId, seed: number, barCount: number): { guitar: ScoreEvent[][]; colour: ScoreEvent[][]; bass: ScoreEvent[][]; chords: string[]; plan: LanguagePlan } {
  const plan = planFor(language, seed);
  const tag = `e1:${language}`;
  const guitar: ScoreEvent[][] = [];
  const colour: ScoreEvent[][] = [];
  const bass: ScoreEvent[][] = [];
  const chords: string[] = [];
  let guitarPrev: number | null = null;
  let bassPrev: number | null = null;
  for (let index = 0; index < barCount; index++) {
    const bar = barAt(plan, index);
    const lead = lay(bar.guitar, 1, GUITAR_LOW, GUITAR_HIGH, 64, tag, guitarPrev);
    const low = lay(bar.bass, 1, BASS_LOW, BASS_HIGH, 40, `${tag}:bass`, bassPrev);
    guitar.push(lead.events);
    colour.push(layColour(bar.colour, lead.events, `${tag}:colour`));
    bass.push(low.events);
    chords.push(bar.chord);
    guitarPrev = lead.last;
    bassPrev = low.last;
  }
  return { guitar, colour, bass, chords, plan };
}

function cloneScore(score: ScoreModel): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures.map((measure) => ({
        ...measure,
        events: measure.events.map((event) => ({ ...event })),
      })),
    })),
  };
}

function refused(seed: number, languageId: E1ComposerLanguageId | null, reason: string, bars = 0): E1ComposerLanguageReceipt {
  return {
    version: E1_COMPOSER_LANGUAGE_VERSION,
    enabled: true,
    status: 'refused',
    languageId,
    seed,
    bars,
    tempo: TEMPO,
    motifIntervals: [],
    operators: [],
    development: [],
    harmony: [],
    preservedBars: [],
    reason,
  };
}

export function composeE1ComposerLanguage(languageId: string, seed: number): { score: ScoreModel; receipt: E1ComposerLanguageReceipt } {
  const language = resolveLanguage(languageId);
  if (!language) {
    throw new Error(`unsupported E1 language ${languageId}`);
  }
  const built = realise(language, seed, 16);
  const label = language === 'bernard_herrmann' ? 'Herrmann' : language === 'ravel' ? 'Ravel' : 'Dutilleux';
  const guitar = createPart('guitar', 'Clean Electric Guitar', 'clean_electric_guitar', 27, 'treble', 16, (bar) => built.chords[bar - 1], () => undefined);
  const bass = createPart('bass', 'Acoustic Upright Bass', 'acoustic_upright_bass', 32, 'bass', 16, (bar) => built.chords[bar - 1], () => undefined);
  guitar.measures.forEach((measure, index) => {
    measure.events = [...(built.guitar[index] ?? []), ...(built.colour[index] ?? [])];
  });
  bass.measures.forEach((measure, index) => {
    measure.events = built.bass[index] ?? [];
  });
  const score = createScore(`E1 ${label} seed ${seed}`, [guitar, bass], { tempo: TEMPO });
  const math = validateStrictBarMath(score);
  if (!math.valid) {
    throw new Error(math.errors[0] ?? 'bar math failed');
  }
  return {
    score,
    receipt: {
      version: E1_COMPOSER_LANGUAGE_VERSION,
      enabled: true,
      status: 'applied',
      languageId: language,
      seed,
      bars: 16,
      tempo: TEMPO,
      motifIntervals: built.plan.motifIntervals,
      operators: built.plan.operators,
      development: built.plan.development,
      harmony: built.chords,
      preservedBars: [],
    },
  };
}

export function applyE1ComposerLanguage(
  score: ScoreModel,
  request: E1ComposerLanguageRequest,
): { score: ScoreModel; receipt: E1ComposerLanguageReceipt } {
  const language = resolveLanguage(request.songwriterId);
  if (!language) {
    return { score, receipt: refused(request.seed, null, 'songwriter is outside Herrmann, Ravel, and Dutilleux') };
  }
  if (request.leadSheetLocked) {
    return { score, receipt: refused(request.seed, language, 'source-locked lead-sheet notes') };
  }
  if (request.blendBlocked) {
    return { score, receipt: refused(request.seed, language, 'stage D blend owns the score') };
  }
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass || guitar.measures.length < 4 || guitar.measures.length !== bass.measures.length || guitar.measures.length > 64) {
    return { score, receipt: refused(request.seed, language, 'guitar and bass parts are not aligned', guitar?.measures.length ?? 0) };
  }
  if (guitar.measures.some((measure) => measureBeatSpanQuartersOf(measure) !== 4)) {
    return { score, receipt: refused(request.seed, language, 'language pass currently requires 4/4', guitar.measures.length) };
  }
  const protectedBars = [...new Set(request.protectedBars ?? [])].filter((bar) => bar >= 1 && bar <= guitar.measures.length);
  if (protectedBars.length === guitar.measures.length) {
    return { score, receipt: refused(request.seed, language, 'all selected bars are protected', guitar.measures.length) };
  }
  const built = realise(language, request.seed, guitar.measures.length);
  const next = cloneScore(score);
  const nextGuitar = next.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar')!;
  const nextBass = next.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass')!;
  const chordsBefore = nextGuitar.measures.map((measure) => measure.chord ?? '');
  nextGuitar.measures.forEach((measure, index) => {
    if (protectedBars.includes(measure.index)) return;
    measure.events = [...(built.guitar[index] ?? []), ...(built.colour[index] ?? [])];
  });
  nextBass.measures.forEach((measure, index) => {
    if (protectedBars.includes(measure.index)) return;
    measure.events = built.bass[index] ?? [];
  });
  const chordsAfter = nextGuitar.measures.map((measure) => measure.chord ?? '');
  if (chordsAfter.join('|') !== chordsBefore.join('|')) {
    return { score, receipt: refused(request.seed, language, 'language pass attempted to change harmony symbols', guitar.measures.length) };
  }
  const math = validateStrictBarMath(next);
  if (!math.valid) {
    return { score, receipt: refused(request.seed, language, math.errors[0] ?? 'bar math failed', guitar.measures.length) };
  }
  return {
    score: next,
    receipt: {
      version: E1_COMPOSER_LANGUAGE_VERSION,
      enabled: true,
      status: 'applied',
      languageId: language,
      seed: request.seed,
      bars: guitar.measures.length,
      tempo: next.tempo ?? TEMPO,
      motifIntervals: built.plan.motifIntervals,
      operators: built.plan.operators,
      development: built.plan.development,
      harmony: chordsAfter,
      preservedBars: protectedBars,
    },
  };
}

const FINAL_GUITAR_PLAN: GuitarBehaviourPlan = {
  instrumentIdentity: 'clean_electric_guitar',
  perBar: [{
    bar: 1,
    textureMix: [{ type: 'melody', weight: 1 }, { type: 'dyad', weight: 1 }],
    eventCount: 1,
    sustainRatio: 0.5,
    registerTarget: [55, 79],
  }],
};

const FINAL_BASS_PLAN: BassBehaviourPlan = {
  instrumentIdentity: 'acoustic_upright_bass',
  perBar: [{
    bar: 1,
    activity: 'anchored',
    eventCount: 1,
    harmonicAnchor: true,
    registerTarget: [40, 55],
  }],
};

/**
 * Note-level contracts that still apply after the language rewrite.
 * Behaviour gates and the integrity register check run before this pass.
 * Export integrity does not read pitch. Jazz-duo sparsity, bass-identity,
 * and phrase-authority gates are not re-applied: the three grammars use
 * silence, pedal, and shared downbeats on purpose.
 */
export function validateE1ComposerLanguageFinalOutput(
  score: ScoreModel,
  plans?: { guitarBehaviour?: GuitarBehaviourPlan; bassBehaviour?: BassBehaviourPlan },
): { valid: boolean; errors: string[] } {
  const register = validateRegister({
    instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
    pitchByInstrument: score.parts.map((part) => ({
      instrument: part.instrumentIdentity,
      pitches: part.measures.flatMap((measure) =>
        measure.events.filter((event) => event.kind === 'note').map((event) => (event as NoteEvent).pitch),
      ),
    })),
  });
  const guitar = validateGuitarBehaviour(score, plans?.guitarBehaviour ?? FINAL_GUITAR_PLAN);
  const bass = validateBassBehaviour(score, plans?.bassBehaviour ?? FINAL_BASS_PLAN);
  const errors = [...register.errors, ...guitar.errors, ...bass.errors];
  return { valid: errors.length === 0, errors };
}

export function e1LanguageNotePitches(score: ScoreModel, instrument: string, voice = 1): number[] {
  const part = score.parts.find((item) => item.instrumentIdentity === instrument);
  const pitches: number[] = [];
  for (const measure of part?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'note' && (event.voice ?? 1) === voice) pitches.push((event as NoteEvent).pitch);
    }
  }
  return pitches;
}
