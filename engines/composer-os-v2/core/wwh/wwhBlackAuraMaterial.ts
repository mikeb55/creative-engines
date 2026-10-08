/**
 * Black Aura V7 performance, guitar-study, and bass-partner material.
 * Pitches come from the duo leadsheet cells (M1 C–Ab–G, bass fifth-leap, M5 A–Bb, ending Eb).
 * New bars are written out. They are not copies of the 39 source bars.
 * Harmony stays nonfunctional: no ii–V–I and no automatic cadence.
 */

import {
  assertWwhBar,
  wwhDyad,
  wwhNote,
  wwhRest,
  type WwhAtom,
  type WwhFreedom,
  type WwhHarmonySpec,
} from './wwhPerformanceTypes';

const n = wwhNote;
const r = wwhRest;
const dy = wwhDyad;
const T = 1024;

function g(label: string, atoms: WwhAtom[]): WwhAtom[] {
  assertWwhBar(atoms, T, label);
  return atoms;
}

export interface WwhSourceSlice {
  kind: 'source';
  id: string;
  from: number;
  to: number;
  guitarRole: string;
  bassRole: string;
  cue: string | null;
  freedom: WwhFreedom;
}

export interface WwhGuitarOverBass {
  kind: 'guitar-over-bass';
  id: string;
  rehearsal: string;
  cue: string;
  guitarRole: string;
  bassRole: string;
  freedom: WwhFreedom;
  /** 1-based source bars whose bass notes are kept. */
  bassMeasures: number[];
  guitar: WwhAtom[][];
  words: string[];
}

export interface WwhComposedBar {
  guitar: WwhAtom[];
  bass: WwhAtom[];
  harmony?: WwhHarmonySpec;
  words?: string[];
}

export interface WwhComposedSlice {
  kind: 'composed';
  id: string;
  rehearsal: string;
  cue: string;
  guitarRole: string;
  bassRole: string;
  freedom: WwhFreedom;
  bars: WwhComposedBar[];
  words: string[];
}

export type WwhPerfSlice = WwhSourceSlice | WwhGuitarOverBass | WwhComposedSlice;

const N_GUITAR: WwhAtom[][] = [
  g('N1', [r('half'), n('C', 5, 'quarter'), n('A', 4, 'eighth', -1), n('G', 4, 'eighth')]),
  g('N2', [r('quarter'), n('B', 4, 'eighth', -1), n('C', 5, 'eighth'), n('E', 5, 'quarter', -1), r('quarter')]),
  g('N3', [r('half'), n('B', 4, 'quarter'), n('D', 5, 'eighth'), r('eighth')]),
  g('N4', [r('whole')]),
  g('N5', [n('A', 4, 'quarter'), n('F', 4, 'quarter', 1), n('E', 4, 'half')]),
];

const O_BARS: WwhComposedBar[] = [
  { guitar: g('O1g', [r('whole')]), bass: g('O1b', [n('F', 3, 'quarter'), n('C', 4, 'quarter'), r('half')]) },
  { guitar: g('O2g', [r('whole')]), bass: g('O2b', [n('A', 3, 'quarter', -1), n('E', 4, 'quarter', -1), r('half')]) },
  { guitar: g('O3g', [r('whole')]), bass: g('O3b', [n('E', 3, 'half'), r('half')]) },
  { guitar: g('O4g', [r('whole')]), bass: g('O4b', [n('D', 3, 'quarter'), n('A', 3, 'quarter'), r('half')]) },
  {
    guitar: g('O5g', [r('half'), ...dy(['F', 4, 0], ['C', 5, 0], 'quarter'), r('quarter')]),
    bass: g('O5b', [n('B', 3, 'half', -1), r('half')]),
  },
  { guitar: g('O6g', [r('whole')]), bass: g('O6b', [n('F', 3, 'quarter', 1), n('E', 3, 'quarter'), r('half')]) },
  { guitar: g('O7g', [r('whole')]), bass: g('O7b', [r('whole')]) },
];

const P_BARS: WwhComposedBar[] = [
  { guitar: g('P1g', [n('C', 5, 'whole')]), bass: g('P1b', [n('B', 2, 'whole', -1)]) },
  { guitar: g('P2g', [n('C', 5, 'whole')]), bass: g('P2b', [n('F', 2, 'half', 1), r('half')]) },
  { guitar: g('P3g', [n('C', 5, 'half'), n('G', 4, 'half')]), bass: g('P3b', [n('E', 3, 'half'), r('half')]) },
  { guitar: g('P4g', [n('C', 5, 'half'), n('A', 4, 'half', -1)]), bass: g('P4b', [n('C', 3, 'whole')]) },
  { guitar: g('P5g', [r('half'), n('E', 4, 'half')]), bass: g('P5b', [n('A', 2, 'half', -1), r('half')]) },
  { guitar: g('P6g', [r('whole')]), bass: g('P6b', [r('whole')]) },
];

const Q_BARS: WwhComposedBar[] = [
  {
    guitar: g('Q1g', [r('half'), ...dy(['C', 4, 0], ['E', 4, -1], 'quarter'), r('quarter')]),
    bass: g('Q1b', [n('C', 3, 'half'), r('half')]),
    harmony: { root: 'C', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q2g', [n('G', 4, 'quarter'), n('B', 4, 'quarter'), r('half')]),
    bass: g('Q2b', [n('E', 3, 'half'), r('half')]),
    harmony: { root: 'C', kind: 'augmented', text: 'aug', bass: 'E' },
  },
  {
    guitar: g('Q3g', [r('whole')]),
    bass: g('Q3b', [n('A', 2, 'half'), r('half')]),
    harmony: { root: 'A', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q4g', [n('C', 5, 'half'), r('half')]),
    bass: g('Q4b', [n('C', 3, 'half'), n('G', 3, 'quarter'), r('quarter')]),
    harmony: { root: 'C', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q5g', [r('quarter'), n('D', 5, 'quarter'), n('B', 4, 'half')]),
    bass: g('Q5b', [n('G', 2, 'whole')]),
    harmony: { root: 'G', kind: 'major', text: '' },
  },
  {
    guitar: g('Q6g', [n('F', 4, 'quarter'), n('A', 4, 'quarter', -1), r('half')]),
    bass: g('Q6b', [n('F', 2, 'half'), r('half')]),
    harmony: { root: 'F', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q7g', [n('D', 4, 'quarter'), n('A', 4, 'quarter', -1), r('half')]),
    bass: g('Q7b', [n('D', 3, 'half'), r('half')]),
    harmony: { root: 'D', kind: 'diminished', text: 'dim' },
  },
  {
    guitar: g('Q8g', [r('whole')]),
    bass: g('Q8b', [n('F', 2, 'whole')]),
    harmony: { root: 'D', kind: 'diminished', text: 'dim', bass: 'F' },
  },
];

const T_BARS: WwhComposedBar[] = [
  { guitar: g('T1g', [n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), r('half')]), bass: g('T1b', [r('whole')]) },
  { guitar: g('T2g', [n('A', 4, 'quarter'), n('E', 5, 'quarter'), r('half')]), bass: g('T2b', [n('A', 3, 'eighth'), n('B', 3, 'eighth', -1), n('A', 3, 'eighth'), n('B', 3, 'eighth', -1), r('half')]) },
  { guitar: g('T3g', [r('half'), n('D', 5, 'quarter'), n('C', 5, 'quarter')]), bass: g('T3b', [n('A', 3, 'quarter'), n('E', 4, 'quarter'), r('half')]) },
  { guitar: g('T4g', [n('A', 4, 'half', -1), r('half')]), bass: g('T4b', [r('half'), n('D', 4, 'quarter'), n('C', 4, 'quarter')]) },
  { guitar: g('T5g', [r('whole')]), bass: g('T5b', [n('A', 3, 'half', -1), r('half')]) },
  { guitar: g('T6g', [r('whole')]), bass: g('T6b', [n('F', 3, 'quarter'), n('C', 4, 'quarter'), r('half')]) },
  { guitar: g('T7g', [r('half'), n('C', 5, 'quarter'), n('A', 4, 'quarter', -1)]), bass: g('T7b', [n('A', 3, 'quarter', -1), n('E', 4, 'quarter', -1), r('half')]) },
  { guitar: g('T8g', [n('G', 4, 'half'), r('half')]), bass: g('T8b', [r('whole')]) },
  { guitar: g('T9g', [r('whole')]), bass: g('T9b', [n('E', 3, 'half'), r('half')]) },
  { guitar: g('T10g', [r('half'), n('B', 4, 'quarter', -1), n('C', 5, 'quarter')]), bass: g('T10b', [n('D', 3, 'quarter'), n('A', 3, 'quarter'), n('B', 3, 'half', -1)]) },
  { guitar: g('T11g', [r('whole')]), bass: g('T11b', [r('whole')]) },
  { guitar: g('T12g', [n('E', 4, 'half'), r('half')]), bass: g('T12b', [r('whole')]) },
  { guitar: g('T13g', [r('whole')]), bass: g('T13b', [n('F', 3, 'quarter', 1), n('E', 3, 'quarter'), r('half')]) },
  { guitar: g('T14g', [n('C', 5, 'quarter'), r('half'), r('quarter')]), bass: g('T14b', [r('whole')]) },
  { guitar: g('T15g', [r('whole')]), bass: g('T15b', [r('whole')]) },
];

const R_BARS: WwhComposedBar[] = [
  { guitar: g('R1g', [n('G', 5, 'quarter'), n('E', 5, 'quarter'), r('half')]), bass: g('R1b', [r('whole')]) },
  { guitar: g('R2g', [n('D', 5, 'half'), r('half')]), bass: g('R2b', [n('D', 3, 'half'), r('half')]) },
  { guitar: g('R3g', [n('B', 4, 'quarter'), r('half.'), ]), bass: g('R3b', [n('A', 3, 'half'), r('half')]) },
  { guitar: g('R4g', [r('whole')]), bass: g('R4b', [n('F', 3, 'half'), r('half')]) },
  { guitar: g('R5g', [n('A', 4, 'quarter'), r('half.'), ]), bass: g('R5b', [r('whole')]) },
];

const S_BARS: WwhComposedBar[] = [
  {
    guitar: g('S1g', [n('C', 5, 'quarter'), n('C', 5, 'quarter'), n('A', 4, 'quarter', -1), n('G', 4, 'quarter')]),
    bass: g('S1b', [n('E', 3, 'whole', -1)]),
  },
  { guitar: g('S2g', [n('G', 4, 'whole')]), bass: g('S2b', [n('E', 3, 'whole', -1)]) },
  { guitar: g('S3g', [r('half'), n('G', 4, 'half')]), bass: g('S3b', [r('whole')]) },
  { guitar: g('S4g', [r('whole')]), bass: g('S4b', [n('E', 3, 'half', -1), r('half')]) },
  { guitar: g('S5g', [n('C', 5, 'half'), r('half')]), bass: g('S5b', [r('whole')]) },
  { guitar: g('S6g', [r('whole')]), bass: g('S6b', [r('whole')]) },
  {
    guitar: g('S7g', [n('G', 4, 'whole', 0, true)]),
    bass: g('S7b', [n('E', 3, 'whole', -1, true)]),
  },
];

export const BLACK_AURA_PERFORMANCE: WwhPerfSlice[] = [
  {
    kind: 'source',
    id: 'src-m1',
    from: 1,
    to: 8,
    guitarRole: 'theme',
    bassRole: 'motif',
    cue: null,
    freedom: 'locked',
  },
  {
    kind: 'guitar-over-bass',
    id: 'n-guitar-answer',
    rehearsal: 'N',
    cue: 'Guitar answers M1 — 5 bars; bass maintains motif',
    guitarRole: 'answer',
    bassRole: 'motif',
    freedom: 'lyrical',
    bassMeasures: [1, 2, 3, 4, 1],
    guitar: N_GUITAR,
    words: ['Guitar answers M1 — 5 bars', 'Bass maintains motif', 'Leave the empty bar empty'],
  },
  {
    kind: 'source',
    id: 'src-m2',
    from: 9,
    to: 16,
    guitarRole: 'counterline',
    bassRole: 'motif',
    cue: null,
    freedom: 'locked',
  },
  {
    kind: 'composed',
    id: 'o-bass-leads',
    rehearsal: 'O',
    cue: 'Bass leads — 7 bars; guitar listens, one dyad, then silence',
    guitarRole: 'listen',
    bassRole: 'initiation',
    freedom: 'lyrical',
    bars: O_BARS,
    words: ['Bass leads', 'Guitar: one dyad, then silence'],
  },
  {
    kind: 'source',
    id: 'src-threshold-m3',
    from: 17,
    to: 23,
    guitarRole: 'theme',
    bassRole: 'space',
    cue: null,
    freedom: 'locked',
  },
  {
    kind: 'composed',
    id: 'p-liquid',
    rehearsal: 'P',
    cue: 'Liquid hold — common tone C, bass changes context, no cadence',
    guitarRole: 'held-tone',
    bassRole: 'contradiction',
    freedom: 'minimal',
    bars: P_BARS,
    words: ['Common tone C', 'Bass moves. Do not resolve'],
  },
  {
    kind: 'source',
    id: 'src-m4-feature',
    from: 24,
    to: 29,
    guitarRole: 'theme',
    bassRole: 'feature',
    cue: null,
    freedom: 'locked',
  },
  {
    kind: 'composed',
    id: 'q-h-open',
    rehearsal: 'Q',
    cue: 'H open sounded — 8 colours, sparse dyads, guitar drops out',
    guitarRole: 'dyads',
    bassRole: 'colour-bass',
    freedom: 'minimal',
    bars: Q_BARS,
    words: ['H OPEN sounded', 'Cm  Caug/E  Am  Cm  G  Fm  Ddim  Ddim/F', 'Not a cadence'],
  },
  {
    kind: 'composed',
    id: 't-conversation',
    rehearsal: 'T',
    cue: 'Conversation — 15 bars; M5 neighbour, bass imitates late, then contradicts',
    guitarRole: 'lead-then-answer',
    bassRole: 'imitation',
    freedom: 'adventurous',
    bars: T_BARS,
    words: ['A–Bb neighbour', 'Bass copies a bar late', 'F# contradicts. No V–I'],
  },
  {
    kind: 'composed',
    id: 'r-decompress',
    rehearsal: 'R',
    cue: 'Decompression — 5 bars down to A, then the written climax',
    guitarRole: 'descent',
    bassRole: 'space',
    freedom: 'lyrical',
    bars: R_BARS,
    words: ['Thin out before M5'],
  },
  {
    kind: 'source',
    id: 'src-m5-ending',
    from: 30,
    to: 39,
    guitarRole: 'theme',
    bassRole: 'ending-pedal',
    cue: null,
    freedom: 'locked',
  },
  {
    kind: 'composed',
    id: 's-coda',
    rehearsal: 'S',
    cue: 'Quiet memory — M1 head once, Eb remains, last bar is a held G over Eb',
    guitarRole: 'memory',
    bassRole: 'pedal',
    freedom: 'minimal',
    bars: S_BARS,
    words: ['M1 head, then only G', 'Bass stays on the ending Eb', 'Fermata. Not a cadence'],
  },
];

export const BLACK_AURA_LEADSHEET_CUES: Array<{ sourceBar: number; performanceSectionId: string; text: string }> = [
  { sourceBar: 8, performanceSectionId: 'n-guitar-answer', text: 'After A: perf N — guitar answers 5 bars; bass keeps motif' },
  { sourceBar: 16, performanceSectionId: 'o-bass-leads', text: 'After B: perf O — bass leads 7 bars; guitar listens' },
  { sourceBar: 23, performanceSectionId: 'p-liquid', text: 'After D: perf P — hold C, 6 bars, no cadence' },
  { sourceBar: 29, performanceSectionId: 'q-h-open', text: 'H OPEN is perf Q — 8 colours sounded, sparse, then T conversation' },
  { sourceBar: 39, performanceSectionId: 's-coda', text: 'After the duo ending: perf S — quiet memory, Eb remains' },
];

export interface WwhStudyBlock {
  id: string;
  rehearsal: string;
  freedom: WwhFreedom;
  cue: string;
  guitarRole: string;
  bassRole: string;
  /** 1-based. Length must match guitar bars. Use 0 for a composed bass bar. */
  bassMeasures: number[];
  guitarMeasures: number[];
  guitar: WwhAtom[][];
  bass?: WwhAtom[][];
  words: string[];
}

function block(spec: WwhStudyBlock): WwhStudyBlock {
  spec.guitar.forEach((atoms, index) => {
    if (atoms.length) assertWwhBar(atoms, T, `${spec.id}-g${index + 1}`);
  });
  spec.bass?.forEach((atoms, index) => {
    if (atoms.length) assertWwhBar(atoms, T, `${spec.id}-b${index + 1}`);
  });
  if (spec.guitarMeasures.length !== spec.guitar.length || spec.bassMeasures.length !== spec.guitar.length) {
    throw new Error(`${spec.id} bar count`);
  }
  return spec;
}

export const BLACK_AURA_GUITAR_STUDY: WwhStudyBlock[] = [
  block({
    id: 'g-m1-min',
    rehearsal: 'M1-min',
    freedom: 'minimal',
    cue: 'M1 minimal — one dyad, then listen to the bass motif',
    guitarRole: 'dyad',
    bassRole: 'motif',
    bassMeasures: [1, 2, 3, 4],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('m1min1', [r('half'), ...dy(['C', 5, 0], ['A', 4, -1], 'quarter'), r('quarter')]),
      g('m1min2', [r('whole')]),
      g('m1min3', [n('G', 4, 'quarter'), r('half.'), ]),
      g('m1min4', [r('whole')]),
    ],
    words: ['Minimal', 'One dyad. Then listen to the bass'],
  }),
  block({
    id: 'g-m1-lyr',
    rehearsal: 'M1-lyr',
    freedom: 'lyrical',
    cue: 'M1 lyrical — sing C–Ab–G–Bb–Eb, leave a bar of air',
    guitarRole: 'singing-line',
    bassRole: 'motif',
    bassMeasures: [1, 2, 3, 4],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('m1lyr1', [n('C', 5, 'quarter'), n('A', 4, 'quarter', -1), n('G', 4, 'half')]),
      g('m1lyr2', [r('quarter'), n('B', 4, 'quarter', -1), n('C', 5, 'half')]),
      g('m1lyr3', [n('E', 5, 'half', -1), r('half')]),
      g('m1lyr4', [n('G', 4, 'whole')]),
    ],
    words: ['Lyrical', 'Sing the cell. Do not comp'],
  }),
  block({
    id: 'g-m1-adv',
    rehearsal: 'M1-adv',
    freedom: 'adventurous',
    cue: 'M1 adventurous — enter late, one leap, then stop',
    guitarRole: 'leap',
    bassRole: 'motif',
    bassMeasures: [1, 2, 3, 4, 1],
    guitarMeasures: [0, 0, 0, 0, 0],
    guitar: [
      g('m1adv1', [r('whole')]),
      g('m1adv2', [n('C', 5, 'quarter'), n('G', 5, 'quarter'), r('half')]),
      g('m1adv3', [n('A', 4, 'half', -1), r('half')]),
      g('m1adv4', [r('quarter'), n('E', 5, 'quarter', -1), n('B', 4, 'half', -1)]),
      g('m1adv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Listen first. One leap. Last bar silent'],
  }),
  block({
    id: 'g-feat-min',
    rehearsal: 'BF-min',
    freedom: 'minimal',
    cue: 'Bass feature — guitar waits, answers A–C–D once',
    guitarRole: 'answer',
    bassRole: 'feature',
    bassMeasures: [28, 29, 28, 29],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('bfmin1', [r('whole')]),
      g('bfmin2', [r('whole')]),
      g('bfmin3', [n('A', 4, 'quarter'), n('C', 5, 'quarter'), n('D', 5, 'half')]),
      g('bfmin4', [r('whole')]),
    ],
    words: ['Minimal', 'Listen through the bass feature. Answer once'],
  }),
  block({
    id: 'g-feat-lyr',
    rehearsal: 'BF-lyr',
    freedom: 'lyrical',
    cue: 'Bass feature lyrical — long tones on A–C–D, then hold A',
    guitarRole: 'held-tone',
    bassRole: 'feature',
    bassMeasures: [28, 29, 28, 29],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('bflyr1', [r('half'), n('A', 4, 'half')]),
      g('bflyr2', [n('C', 5, 'half'), n('D', 5, 'half')]),
      g('bflyr3', [r('whole')]),
      g('bflyr4', [n('A', 4, 'whole')]),
    ],
    words: ['Lyrical', 'Long tones. Leave a whole bar'],
  }),
  block({
    id: 'g-feat-adv',
    rehearsal: 'BF-adv',
    freedom: 'adventurous',
    cue: 'After the feature — A–Bb neighbour, a leap, then the low F# memory',
    guitarRole: 'neighbour',
    bassRole: 'feature',
    bassMeasures: [28, 29, 30, 31, 28],
    guitarMeasures: [0, 0, 0, 0, 0],
    guitar: [
      g('bfadv1', [n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), n('A', 4, 'eighth'), r('eighth'), r('half')]),
      g('bfadv2', [n('E', 5, 'quarter'), r('half.'), ]),
      g('bfadv3', [r('whole')]),
      g('bfadv4', [n('F', 4, 'quarter', 1), r('half.'), ]),
      g('bfadv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Neighbour, leap, silence, one low F#'],
  }),
  block({
    id: 'g-m5-min',
    rehearsal: 'M5-min',
    freedom: 'minimal',
    cue: 'M5 minimal — two single notes, far apart',
    guitarRole: 'single-notes',
    bassRole: 'climax-bass',
    bassMeasures: [30, 31, 30, 31],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('m5min1', [n('A', 4, 'quarter'), r('half.'), ]),
      g('m5min2', [r('whole')]),
      g('m5min3', [n('B', 4, 'quarter', -1), r('half.'), ]),
      g('m5min4', [r('whole')]),
    ],
    words: ['Minimal', 'Two notes. Listen between them'],
  }),
  block({
    id: 'g-m5-lyr',
    rehearsal: 'M5-lyr',
    freedom: 'lyrical',
    cue: 'M5 lyrical — neighbour, then the M1 fall C–Ab–G',
    guitarRole: 'singing-line',
    bassRole: 'climax-bass',
    bassMeasures: [30, 31, 32, 33],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('m5lyr1', [n('A', 4, 'quarter'), n('B', 4, 'quarter', -1), n('A', 4, 'half')]),
      g('m5lyr2', [n('E', 5, 'half'), n('D', 5, 'half')]),
      g('m5lyr3', [r('quarter'), n('C', 5, 'quarter'), n('A', 4, 'half', -1)]),
      g('m5lyr4', [n('G', 4, 'whole')]),
    ],
    words: ['Lyrical', 'Neighbour, then the M1 fall'],
  }),
  block({
    id: 'g-m5-adv',
    rehearsal: 'M5-adv',
    freedom: 'adventurous',
    cue: 'M5 adventurous — wait, oscillate, leap, stop before the peak',
    guitarRole: 'leap',
    bassRole: 'climax-bass',
    bassMeasures: [30, 31, 34, 35, 36],
    guitarMeasures: [0, 0, 0, 0, 0],
    guitar: [
      g('m5adv1', [r('whole')]),
      g('m5adv2', [n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), r('half')]),
      g('m5adv3', [n('E', 5, 'quarter'), n('B', 4, 'quarter', -1), r('half')]),
      g('m5adv4', [n('D', 5, 'half'), r('half')]),
      g('m5adv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Do not play the written peak. Leave it'],
  }),
  block({
    id: 'g-end-min',
    rehearsal: 'END-min',
    freedom: 'minimal',
    cue: 'Re-entry minimal — Eb is already the bass. Touch G once',
    guitarRole: 'single-notes',
    bassRole: 'ending-pedal',
    bassMeasures: [37, 38, 39, 39],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('endmin1', [r('whole')]),
      g('endmin2', [r('whole')]),
      g('endmin3', [n('C', 5, 'quarter'), n('G', 4, 'quarter'), r('half')]),
      g('endmin4', [r('whole')]),
    ],
    words: ['Minimal', 'Ending colour is Eb under G. Do not cadence'],
  }),
  block({
    id: 'g-end-lyr',
    rehearsal: 'END-lyr',
    freedom: 'lyrical',
    cue: 'Re-entry lyrical — M1 head in quarters, hold G, one later C',
    guitarRole: 'memory',
    bassRole: 'ending-pedal',
    bassMeasures: [37, 38, 39, 39],
    guitarMeasures: [0, 0, 0, 0],
    guitar: [
      g('endlyr1', [n('C', 5, 'quarter'), n('C', 5, 'quarter'), n('A', 4, 'quarter', -1), n('G', 4, 'quarter')]),
      g('endlyr2', [n('G', 4, 'whole')]),
      g('endlyr3', [r('half'), n('C', 5, 'half')]),
      g('endlyr4', [r('whole')]),
    ],
    words: ['Lyrical', 'Head once. Then air'],
  }),
  block({
    id: 'g-end-adv',
    rehearsal: 'END-adv',
    freedom: 'adventurous',
    cue: 'Re-entry adventurous — enter late above the cluster, then stop',
    guitarRole: 'leap',
    bassRole: 'ending-pedal',
    bassMeasures: [37, 38, 39, 37, 39],
    guitarMeasures: [0, 0, 0, 0, 0],
    guitar: [
      g('endadv1', [r('whole')]),
      g('endadv2', [n('E', 5, 'quarter', -1), n('C', 5, 'quarter'), r('half')]),
      g('endadv3', [n('A', 4, 'half', -1), r('half')]),
      g('endadv4', [n('G', 4, 'quarter'), r('half.'), ]),
      g('endadv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Re-enter late. Last bar silent'],
  }),
];

export const BLACK_AURA_BASS_PARTNER: WwhStudyBlock[] = [
  block({
    id: 'b-m1-min',
    rehearsal: 'BP-min',
    freedom: 'minimal',
    cue: 'Bass minimal under M1 — root on beat 1, then rest',
    guitarRole: 'theme',
    bassRole: 'roots',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [1, 2, 3, 4],
    guitar: [[], [], [], []],
    bass: [
      g('bpmin1', [n('F', 3, 'half'), r('half')]),
      g('bpmin2', [n('A', 3, 'half', -1), r('half')]),
      g('bpmin3', [n('E', 3, 'half'), r('half')]),
      g('bpmin4', [n('D', 3, 'half'), r('half')]),
    ],
    words: ['Minimal', 'Beat 1 only. Then listen'],
  }),
  block({
    id: 'b-m1-lyr',
    rehearsal: 'BP-lyr',
    freedom: 'lyrical',
    cue: 'Bass lyrical under M1 — sing between F, Ab, E, D. No walking cadence',
    guitarRole: 'theme',
    bassRole: 'counterline',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [1, 2, 3, 4],
    guitar: [[], [], [], []],
    bass: [
      g('bplyr1', [n('F', 3, 'quarter'), n('G', 3, 'quarter'), n('A', 3, 'half', -1)]),
      g('bplyr2', [n('A', 3, 'quarter', -1), n('G', 3, 'quarter'), n('E', 3, 'half')]),
      g('bplyr3', [n('E', 3, 'quarter'), n('D', 3, 'quarter'), n('C', 3, 'half')]),
      g('bplyr4', [n('D', 3, 'half'), r('half')]),
    ],
    words: ['Lyrical', 'Step between the roots. Do not walk to F'],
  }),
  block({
    id: 'b-m1-adv',
    rehearsal: 'BP-adv',
    freedom: 'adventurous',
    cue: 'Bass starts alone, contradicts with F#, guitar enters late',
    guitarRole: 'late-theme',
    bassRole: 'initiation',
    bassMeasures: [0, 0, 0, 0, 0],
    guitarMeasures: [0, 1, 2, 3, 0],
    guitar: [
      g('bpadvg1', [r('whole')]),
      [],
      [],
      [],
      g('bpadvg5', [r('whole')]),
    ],
    bass: [
      g('bpadv1', [n('F', 3, 'eighth'), n('C', 4, 'eighth'), n('F', 3, 'eighth'), n('B', 3, 'quarter', -1), r('quarter'), r('eighth')]),
      g('bpadv2', [n('A', 3, 'half', -1), n('E', 4, 'quarter', -1), r('quarter')]),
      g('bpadv3', [n('F', 3, 'half', 1), r('half')]),
      g('bpadv4', [n('E', 3, 'quarter'), r('half.'), ]),
      g('bpadv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Bass starts. F# contradicts. Last bar silence'],
  }),
  block({
    id: 'b-feat-min',
    rehearsal: 'BFB-min',
    freedom: 'minimal',
    cue: 'Bass feature, fewer notes, then two empty bars',
    guitarRole: 'space',
    bassRole: 'feature',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [28, 29, 0, 0],
    guitar: [[], [], g('bfbming3', [r('whole')]), g('bfbming4', [r('whole')])],
    bass: [
      g('bfbmin1', [n('A', 3, 'quarter'), n('C', 4, 'quarter'), n('D', 4, 'half')]),
      g('bfbmin2', [n('A', 3, 'quarter'), n('F', 3, 'half'), r('quarter')]),
      g('bfbmin3', [r('whole')]),
      g('bfbmin4', [r('whole')]),
    ],
    words: ['Minimal', 'State the feature. Stop'],
  }),
  block({
    id: 'b-feat-lyr',
    rehearsal: 'BFB-lyr',
    freedom: 'lyrical',
    cue: 'Longer feature tones. Guitar answers A–C–D once',
    guitarRole: 'answer',
    bassRole: 'feature',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [28, 29, 24, 0],
    guitar: [[], [], [], g('bfblyrg4', [r('whole')])],
    bass: [
      g('bfblyr1', [n('A', 3, 'half'), n('C', 4, 'half')]),
      g('bfblyr2', [n('D', 4, 'whole')]),
      g('bfblyr3', [n('F', 3, 'half'), n('E', 3, 'half')]),
      g('bfblyr4', [r('whole')]),
    ],
    words: ['Lyrical', 'Sustain. Guitar answers once'],
  }),
  block({
    id: 'b-feat-adv',
    rehearsal: 'BFB-adv',
    freedom: 'adventurous',
    cue: 'Bass leaps off the feature, F# contradicts, guitar answers late',
    guitarRole: 'late-answer',
    bassRole: 'contradiction',
    bassMeasures: [0, 0, 0, 0, 0],
    guitarMeasures: [28, 0, 24, 25, 0],
    guitar: [[], g('bfbadvg2', [r('whole')]), [], [], g('bfbadvg5', [r('whole')])],
    bass: [
      g('bfbadv1', [n('A', 3, 'eighth'), n('C', 4, 'eighth'), n('D', 4, 'eighth'), n('F', 4, 'quarter'), r('quarter'), r('eighth')]),
      g('bfbadv2', [n('F', 3, 'half', 1), r('half')]),
      g('bfbadv3', [n('D', 3, 'half'), n('B', 3, 'quarter', -1), r('quarter')]),
      g('bfbadv4', [r('whole')]),
      g('bfbadv5', [n('A', 3, 'whole', 0, true)]),
    ],
    words: ['Adventurous', 'Leap, contradict, leave the guitar the answer'],
  }),
  block({
    id: 'b-m5-min',
    rehearsal: 'B5-min',
    freedom: 'minimal',
    cue: 'Under M5 — one bass note a bar',
    guitarRole: 'theme',
    bassRole: 'roots',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [30, 31, 32, 33],
    guitar: [[], [], [], []],
    bass: [
      g('b5min1', [n('A', 3, 'half'), r('half')]),
      g('b5min2', [n('D', 3, 'half'), r('half')]),
      g('b5min3', [n('F', 3, 'half'), r('half')]),
      g('b5min4', [n('F', 3, 'half'), r('half')]),
    ],
    words: ['Minimal', 'One note. Let the guitar line finish'],
  }),
  block({
    id: 'b-m5-lyr',
    rehearsal: 'B5-lyr',
    freedom: 'lyrical',
    cue: 'Step under the climax. Do not push to a root cadence',
    guitarRole: 'theme',
    bassRole: 'counterline',
    bassMeasures: [0, 0, 0, 0],
    guitarMeasures: [30, 31, 32, 33],
    guitar: [[], [], [], []],
    bass: [
      g('b5lyr1', [n('A', 3, 'quarter'), n('B', 3, 'quarter'), n('C', 4, 'half')]),
      g('b5lyr2', [n('D', 4, 'half'), n('C', 4, 'half')]),
      g('b5lyr3', [n('F', 3, 'whole')]),
      g('b5lyr4', [r('half'), n('E', 3, 'half', -1)]),
    ],
    words: ['Lyrical', 'Arrive on Eb, the ending colour, not a V–I'],
  }),
  block({
    id: 'b-m5-adv',
    rehearsal: 'B5-adv',
    freedom: 'adventurous',
    cue: 'Bass interrupts the climax, then gets out of the way',
    guitarRole: 'theme-with-space',
    bassRole: 'interruption',
    bassMeasures: [0, 0, 0, 0, 0],
    guitarMeasures: [30, 31, 0, 36, 0],
    guitar: [[], [], g('b5advg3', [r('whole')]), [], g('b5advg5', [r('whole')])],
    bass: [
      g('b5adv1', [r('half'), n('A', 3, 'quarter'), n('E', 4, 'quarter')]),
      g('b5adv2', [n('F', 3, 'quarter', 1), n('E', 3, 'quarter'), r('half')]),
      g('b5adv3', [n('B', 2, 'half', -1), r('half')]),
      g('b5adv4', [r('whole')]),
      g('b5adv5', [r('whole')]),
    ],
    words: ['Adventurous', 'Interrupt once. Then silence through the peak'],
  }),
];

export function applySeedToGuitarAtoms(bars: WwhAtom[][], seed: number): WwhAtom[][] {
  const mode = ((seed % 3) + 3) % 3;
  if (mode === 0) return bars;
  if (mode === 1) {
    return bars.map((atoms) => {
      if (atoms[0]?.rest && !atoms[0].chord) return [...atoms.slice(1), atoms[0]];
      return atoms;
    });
  }
  return bars.map((atoms) => {
    const pitched = atoms.filter((atom) => !atom.rest && !atom.chord);
    if (pitched.length < 2) return atoms;
    let seen = 0;
    const out: WwhAtom[] = [];
    let dropChords = false;
    for (const atom of atoms) {
      if (dropChords && atom.chord) continue;
      dropChords = false;
      if (atom.rest || atom.chord) {
        out.push(atom);
        continue;
      }
      seen += 1;
      if (seen === pitched.length) {
        out.push({ rest: true, divisions: atom.divisions, type: atom.type, dots: atom.dots });
        dropChords = true;
        continue;
      }
      out.push(atom);
    }
    return out;
  });
}
