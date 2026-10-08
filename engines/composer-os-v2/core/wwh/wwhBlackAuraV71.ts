/**
 * Black Aura V7.1 musical refinement.
 * V7.0 arrays stay in wwhBlackAuraMaterial.ts and are not rewritten.
 * Same section lengths. Locked source slices unchanged.
 * Guitar uses dyads, triads, inner-voice motion, and short chord-melody.
 * Liquid Harmony moves one voice at a time across triads. No ii–V–I.
 */

import {
  assertWwhBar,
  wwhDyad,
  wwhNote,
  wwhRest,
  wwhTriad,
  type WwhAtom,
  type WwhStudyBlock,
} from './wwhPerformanceTypes';
import {
  BLACK_AURA_BASS_PARTNER,
  BLACK_AURA_GUITAR_STUDY,
  BLACK_AURA_PERFORMANCE,
  type WwhComposedBar,
  type WwhPerfSlice,
} from './wwhBlackAuraMaterial';

const n = wwhNote;
const r = wwhRest;
const dy = wwhDyad;
const tr = wwhTriad;
const T = 1024;

function g(label: string, atoms: WwhAtom[]): WwhAtom[] {
  assertWwhBar(atoms, T, label);
  return atoms;
}

const N_GUITAR: WwhAtom[][] = [
  g('N1', [r('half'), ...dy(['G', 4, 0], ['C', 5, 0], 'quarter'), n('A', 4, 'eighth', -1), r('eighth')]),
  g('N2', [r('quarter'), ...dy(['B', 4, -1], ['E', 5, -1], 'quarter'), n('C', 5, 'eighth'), r('eighth'), r('quarter')]),
  g('N3', [r('half'), ...dy(['B', 4, 0], ['D', 5, 0], 'quarter'), r('quarter')]),
  g('N4', [r('whole')]),
  g('N5', [...dy(['A', 4, 0], ['E', 4, 0], 'quarter'), n('F', 4, 'quarter', 1), n('E', 4, 'half')]),
];

const O_BARS: WwhComposedBar[] = [
  { guitar: g('O1g', [r('whole')]), bass: g('O1b', [n('F', 3, 'quarter'), n('C', 4, 'quarter'), r('half')]) },
  { guitar: g('O2g', [r('whole')]), bass: g('O2b', [n('A', 3, 'quarter', -1), n('E', 4, 'quarter', -1), r('half')]) },
  {
    guitar: g('O3g', [...dy(['E', 4, 0], ['B', 4, 0], 'half'), r('half')]),
    bass: g('O3b', [n('E', 3, 'half'), r('half')]),
  },
  { guitar: g('O4g', [r('whole')]), bass: g('O4b', [n('D', 3, 'quarter'), n('A', 3, 'quarter'), r('half')]) },
  {
    guitar: g('O5g', [...tr(['F', 4, 0], ['A', 4, -1], ['C', 5, 0], 'quarter'), r('half.')]),
    bass: g('O5b', [n('B', 3, 'half', -1), r('half')]),
  },
  {
    guitar: g('O6g', [n('A', 4, 'half', -1), n('G', 4, 'half')]),
    bass: g('O6b', [n('F', 3, 'quarter', 1), n('E', 3, 'quarter'), r('half')]),
  },
  { guitar: g('O7g', [r('whole')]), bass: g('O7b', [r('whole')]) },
];

/** Fm → inner Ab–G, then C/E/G over F#, then Edim, then Ab. One voice moves. No cadence. */
const P_BARS: WwhComposedBar[] = [
  {
    guitar: g('P1g', [
      ...tr(['F', 4, 0], ['A', 4, -1], ['C', 5, 0], 'half'),
      ...tr(['F', 4, 0], ['G', 4, 0], ['C', 5, 0], 'half'),
    ]),
    bass: g('P1b', [n('B', 2, 'whole', -1)]),
    harmony: { root: 'F', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('P2g', [...tr(['E', 4, 0], ['G', 4, 0], ['C', 5, 0], 'half'), r('half')]),
    bass: g('P2b', [n('F', 3, 'half', 1), r('half')]),
    harmony: { root: 'C', kind: 'major', text: '', bass: 'F', bassAlter: 1 },
  },
  {
    guitar: g('P3g', [...tr(['E', 4, 0], ['G', 4, 0], ['B', 4, -1], 'half'), r('half')]),
    bass: g('P3b', [n('E', 3, 'half'), r('half')]),
    harmony: { root: 'E', kind: 'diminished', text: 'dim' },
  },
  {
    guitar: g('P4g', [...tr(['A', 4, -1], ['C', 5, 0], ['E', 5, -1], 'half'), r('half')]),
    bass: g('P4b', [n('C', 3, 'half'), n('A', 3, 'quarter', -1), r('quarter')]),
    harmony: { root: 'A', alter: -1, kind: 'major', text: '' },
  },
  {
    guitar: g('P5g', [n('C', 5, 'half'), n('A', 4, 'half', -1)]),
    bass: g('P5b', [n('A', 2, 'half', -1), r('half')]),
  },
  { guitar: g('P6g', [r('whole')]), bass: g('P6b', [r('whole')]) },
];

const Q_BARS: WwhComposedBar[] = [
  {
    guitar: g('Q1g', [r('half'), ...tr(['C', 4, 0], ['E', 4, -1], ['G', 4, 0], 'quarter'), r('quarter')]),
    bass: g('Q1b', [n('C', 3, 'half'), r('half')]),
    harmony: { root: 'C', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q2g', [r('quarter'), ...tr(['E', 4, 0], ['G', 4, 0], ['B', 4, 0], 'quarter'), r('half')]),
    bass: g('Q2b', [n('E', 3, 'half'), r('half')]),
    harmony: { root: 'C', kind: 'augmented', text: 'aug', bass: 'E' },
  },
  {
    guitar: g('Q3g', [r('whole')]),
    bass: g('Q3b', [n('A', 2, 'half'), r('half')]),
    harmony: { root: 'A', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q4g', [...tr(['G', 4, 0], ['C', 5, 0], ['E', 5, -1], 'half'), r('half')]),
    bass: g('Q4b', [n('C', 3, 'half'), n('G', 3, 'quarter'), r('quarter')]),
    harmony: { root: 'C', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q5g', [r('quarter'), ...tr(['G', 4, 0], ['B', 4, 0], ['D', 5, 0], 'quarter'), r('half')]),
    bass: g('Q5b', [n('G', 2, 'whole')]),
    harmony: { root: 'G', kind: 'major', text: '' },
  },
  {
    guitar: g('Q6g', [...dy(['F', 4, 0], ['A', 4, -1], 'half'), n('C', 5, 'quarter'), r('quarter')]),
    bass: g('Q6b', [n('F', 2, 'half'), r('half')]),
    harmony: { root: 'F', kind: 'minor', text: 'm' },
  },
  {
    guitar: g('Q7g', [...tr(['D', 4, 0], ['F', 4, 0], ['A', 4, -1], 'quarter'), r('half.')]),
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
  { guitar: g('T1g', [n('A', 4, 'quarter'), n('C', 5, 'quarter'), n('D', 5, 'half')]), bass: g('T1b', [r('whole')]) },
  { guitar: g('T2g', [r('whole')]), bass: g('T2b', [n('A', 3, 'quarter'), n('C', 4, 'quarter'), n('D', 4, 'half')]) },
  {
    guitar: g('T3g', [r('half'), ...dy(['A', 4, -1], ['C', 5, 0], 'quarter'), n('G', 4, 'quarter')]),
    bass: g('T3b', [r('half'), n('D', 3, 'quarter'), r('quarter')]),
  },
  { guitar: g('T4g', [r('whole')]), bass: g('T4b', [n('F', 3, 'half', 1), r('half')]) },
  { guitar: g('T5g', [n('E', 4, 'half'), r('half')]), bass: g('T5b', [r('whole')]) },
  {
    guitar: g('T6g', [...dy(['F', 4, 0], ['C', 5, 0], 'quarter'), r('half.')]),
    bass: g('T6b', [n('F', 3, 'quarter'), n('C', 4, 'quarter'), r('half')]),
  },
  { guitar: g('T7g', [r('whole')]), bass: g('T7b', [n('A', 3, 'quarter', -1), n('E', 4, 'quarter', -1), r('half')]) },
  { guitar: g('T8g', [n('B', 4, 'quarter', -1), n('C', 5, 'quarter'), n('E', 5, 'half', -1)]), bass: g('T8b', [r('whole')]) },
  { guitar: g('T9g', [r('whole')]), bass: g('T9b', [n('E', 3, 'half'), n('B', 3, 'quarter'), r('quarter')]) },
  {
    guitar: g('T10g', [...dy(['B', 4, 0], ['D', 5, 0], 'quarter'), r('quarter'), n('F', 4, 'quarter', 1), r('quarter')]),
    bass: g('T10b', [r('half'), n('B', 3, 'half', -1)]),
  },
  { guitar: g('T11g', [r('whole')]), bass: g('T11b', [r('whole')]) },
  { guitar: g('T12g', [n('G', 4, 'half'), r('half')]), bass: g('T12b', [n('E', 3, 'half', -1), r('half')]) },
  { guitar: g('T13g', [r('whole')]), bass: g('T13b', [n('F', 3, 'quarter', 1), n('E', 3, 'quarter'), r('half')]) },
  { guitar: g('T14g', [n('C', 5, 'quarter'), r('half'), r('quarter')]), bass: g('T14b', [r('whole')]) },
  { guitar: g('T15g', [r('whole')]), bass: g('T15b', [r('whole')]) },
];

const R_BARS: WwhComposedBar[] = [
  { guitar: g('R1g', [...dy(['E', 5, 0], ['G', 5, 0], 'quarter'), r('half.')]), bass: g('R1b', [r('whole')]) },
  { guitar: g('R2g', [...dy(['B', 4, 0], ['D', 5, 0], 'half'), r('half')]), bass: g('R2b', [n('D', 3, 'half'), r('half')]) },
  { guitar: g('R3g', [r('whole')]), bass: g('R3b', [n('A', 3, 'half'), r('half')]) },
  { guitar: g('R4g', [...dy(['G', 4, 0], ['B', 4, 0], 'quarter'), r('half.')]), bass: g('R4b', [r('whole')]) },
  { guitar: g('R5g', [n('A', 4, 'quarter'), r('half.')]), bass: g('R5b', [r('whole')]) },
];

const S_BARS: WwhComposedBar[] = [
  {
    guitar: g('S1g', [
      ...dy(['G', 4, 0], ['C', 5, 0], 'quarter'),
      n('C', 5, 'quarter'),
      ...dy(['A', 4, -1], ['C', 5, 0], 'quarter'),
      n('G', 4, 'quarter'),
    ]),
    bass: g('S1b', [n('E', 3, 'whole', -1)]),
  },
  { guitar: g('S2g', [...dy(['G', 4, 0], ['C', 5, 0], 'half'), r('half')]), bass: g('S2b', [n('E', 3, 'whole', -1)]) },
  { guitar: g('S3g', [r('half'), n('A', 4, 'half', -1)]), bass: g('S3b', [r('whole')]) },
  { guitar: g('S4g', [r('whole')]), bass: g('S4b', [n('E', 3, 'half', -1), r('half')]) },
  { guitar: g('S5g', [...dy(['F', 4, 0], ['A', 4, -1], 'half'), r('half')]), bass: g('S5b', [r('whole')]) },
  { guitar: g('S6g', [r('whole')]), bass: g('S6b', [r('whole')]) },
  {
    guitar: g('S7g', [...dy(['G', 4, 0], ['C', 5, 0], 'whole')].map((atom, index) => (index === 0 ? { ...atom, fermata: true } : atom))),
    bass: g('S7b', [n('E', 3, 'whole', -1, true)]),
  },
];

function replaceComposed(base: WwhPerfSlice[], id: string, bars: WwhComposedBar[], cue: string, words: string[]): WwhPerfSlice {
  const slice = base.find((item) => item.id === id);
  if (!slice || slice.kind !== 'composed') throw new Error(`missing composed slice ${id}`);
  return { ...slice, bars, cue, words };
}

export const BLACK_AURA_V71_PERFORMANCE: WwhPerfSlice[] = BLACK_AURA_PERFORMANCE.map((slice) => {
  if (slice.kind === 'guitar-over-bass' && slice.id === 'n-guitar-answer') {
    return {
      ...slice,
      guitar: N_GUITAR,
      cue: 'Guitar answers M1 in dyads — 5 bars; bass maintains motif; one bar empty',
      words: ['Chord-melody answer', 'Bass keeps the motif', 'Bar 4 is silence'],
    };
  }
  if (slice.id === 'o-bass-leads') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      'o-bass-leads',
      O_BARS,
      'Bass leads. Guitar answers with a fifth, one Fm triad, then the Ab–G fall',
      ['Bass speaks first', 'Guitar: fifth, triad, inner voice', 'Last bar empty']
    );
  }
  if (slice.id === 'p-liquid') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      'p-liquid',
      P_BARS,
      'Liquid triads — Fm inner voice, C over F#, Edim, Ab. No cadence',
      ['One voice moves', 'Fm, then C/F#, Edim, Ab', 'Last bar silence']
    );
  }
  if (slice.id === 'q-h-open') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      'q-h-open',
      Q_BARS,
      'H open as voice-led triads. Guitar drops out on Am and on the last bass F',
      ['Cm to Caug keeps G', 'Guitar silent while bass takes Am', 'Ddim, then silence']
    );
  }
  if (slice.id === 't-conversation') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      't-conversation',
      T_BARS,
      'Statement, imitation, answer, contradiction. Not a repeated cell',
      ['Guitar states A–C–D', 'Bass copies it next bar', 'Then they stop copying']
    );
  }
  if (slice.id === 'r-decompress') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      'r-decompress',
      R_BARS,
      'Dyads thin out. Bass finishes one descent alone',
      ['Two dyads, then bass alone', 'Guitar returns once', 'Land on A']
    );
  }
  if (slice.id === 's-coda') {
    return replaceComposed(
      BLACK_AURA_PERFORMANCE,
      's-coda',
      S_BARS,
      'Chord-melody memory of M1 over the ending Eb. Fermata on G–C, not a cadence',
      ['M1 as chord-melody', 'Bass stays on Eb', 'Fermata. No V–I']
    );
  }
  return slice;
});

function withGuitar(block: WwhStudyBlock, guitar: WwhAtom[][], cue: string, words: string[]): WwhStudyBlock {
  if (guitar.length !== block.guitar.length) throw new Error(`${block.id} length`);
  guitar.forEach((atoms, index) => {
    if (atoms.length) assertWwhBar(atoms, T, `${block.id}-v71-${index + 1}`);
  });
  return { ...block, guitar, cue, words };
}

const STUDY: Record<string, { guitar: WwhAtom[][]; cue: string; words: string[] }> = {
  'g-m1-min': {
    cue: 'Minimal — one dyad, then silence',
    words: ['Minimal', 'One dyad. Then listen'],
    guitar: [
      g('v71m1min1', [r('half'), ...dy(['G', 4, 0], ['C', 5, 0], 'quarter'), r('quarter')]),
      g('v71m1min2', [r('whole')]),
      g('v71m1min3', [r('whole')]),
      g('v71m1min4', [r('whole')]),
    ],
  },
  'g-m1-lyr': {
    cue: 'Lyrical chord-melody — C, then Ab under C, then G. A triad, then silence',
    words: ['Lyrical', 'Melody with an inner voice', 'Last bar empty'],
    guitar: [
      g('v71m1lyr1', [n('C', 5, 'quarter'), ...dy(['A', 4, -1], ['C', 5, 0], 'quarter'), n('G', 4, 'half')]),
      g('v71m1lyr2', [r('quarter'), ...dy(['B', 4, -1], ['E', 5, -1], 'quarter'), n('C', 5, 'half')]),
      g('v71m1lyr3', [...tr(['G', 4, 0], ['C', 5, 0], ['E', 5, -1], 'half'), r('half')]),
      g('v71m1lyr4', [r('whole')]),
    ],
  },
  'g-m1-adv': {
    cue: 'Adventurous — wait, leap, Fm triad, inner Ab to G, stop',
    words: ['Adventurous', 'Leap, then a triad', 'Last bar silent'],
    guitar: [
      g('v71m1adv1', [r('whole')]),
      g('v71m1adv2', [n('C', 5, 'quarter'), n('G', 5, 'quarter'), r('half')]),
      g('v71m1adv3', [...tr(['F', 4, 0], ['A', 4, -1], ['C', 5, 0], 'half'), r('half')]),
      g('v71m1adv4', [n('A', 4, 'quarter', -1), n('G', 4, 'half'), r('quarter')]),
      g('v71m1adv5', [r('whole')]),
    ],
  },
  'g-feat-min': {
    cue: 'Minimal — wait, answer the feature with one fifth',
    words: ['Minimal', 'Listen. One fifth. Stop'],
    guitar: [
      g('v71bfmin1', [r('whole')]),
      g('v71bfmin2', [r('whole')]),
      g('v71bfmin3', [...dy(['A', 4, 0], ['D', 5, 0], 'half'), r('half')]),
      g('v71bfmin4', [r('whole')]),
    ],
  },
  'g-feat-lyr': {
    cue: 'Lyrical — A–C dyad, then D with A kept underneath',
    words: ['Lyrical', 'Inner voice stays on A', 'Then silence'],
    guitar: [
      g('v71bflyr1', [r('half'), ...dy(['A', 4, 0], ['C', 5, 0], 'half')]),
      g('v71bflyr2', [...dy(['A', 4, 0], ['D', 5, 0], 'half'), r('half')]),
      g('v71bflyr3', [r('whole')]),
      g('v71bflyr4', [...dy(['A', 4, 0], ['C', 5, 0], 'whole')]),
    ],
  },
  'g-feat-adv': {
    cue: 'Adventurous — neighbour, a fifth, silence, F#–C as a contradiction',
    words: ['Adventurous', 'Fifth, then a tritone dyad', 'Last bar silent'],
    guitar: [
      g('v71bfadv1', [n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), r('quarter'), r('half')]),
      g('v71bfadv2', [...dy(['B', 4, 0], ['E', 5, 0], 'quarter'), r('half.')]),
      g('v71bfadv3', [r('whole')]),
      g('v71bfadv4', [...dy(['F', 4, 1], ['C', 5, 0], 'quarter'), r('half.')]),
      g('v71bfadv5', [r('whole')]),
    ],
  },
  'g-m5-min': {
    cue: 'Minimal — two attacks. The second is a dyad',
    words: ['Minimal', 'One note, silence, one dyad'],
    guitar: [
      g('v71m5min1', [n('A', 4, 'quarter'), r('half.')]),
      g('v71m5min2', [r('whole')]),
      g('v71m5min3', [...dy(['B', 4, -1], ['E', 5, 0], 'quarter'), r('half.')]),
      g('v71m5min4', [r('whole')]),
    ],
  },
  'g-m5-lyr': {
    cue: 'Lyrical — neighbour opens into a fifth, then C–Ab–G as chord-melody',
    words: ['Lyrical', 'Inner voice under the neighbour', 'Last bar empty'],
    guitar: [
      g('v71m5lyr1', [n('A', 4, 'quarter'), n('B', 4, 'quarter', -1), ...dy(['A', 4, 0], ['E', 5, 0], 'half')]),
      g('v71m5lyr2', [...dy(['G', 4, 0], ['D', 5, 0], 'half'), r('half')]),
      g('v71m5lyr3', [r('quarter'), ...dy(['A', 4, -1], ['C', 5, 0], 'quarter'), n('G', 4, 'half')]),
      g('v71m5lyr4', [r('whole')]),
    ],
  },
  'g-m5-adv': {
    cue: 'Adventurous — wait, a short neighbour, fifth dyad, stop before the peak',
    words: ['Adventurous', 'Do not play the written peak'],
    guitar: [
      g('v71m5adv1', [r('whole')]),
      g('v71m5adv2', [n('A', 4, 'eighth'), n('B', 4, 'eighth', -1), r('half'), r('quarter')]),
      g('v71m5adv3', [...dy(['B', 4, -1], ['E', 5, 0], 'quarter'), r('half.')]),
      g('v71m5adv4', [...dy(['A', 4, 0], ['D', 5, 0], 'half'), r('half')]),
      g('v71m5adv5', [r('whole')]),
    ],
  },
  'g-end-min': {
    cue: 'Minimal — Eb is the bass. One G–C dyad, then nothing',
    words: ['Minimal', 'One dyad over Eb. No cadence'],
    guitar: [
      g('v71endmin1', [r('whole')]),
      g('v71endmin2', [r('whole')]),
      g('v71endmin3', [...dy(['G', 4, 0], ['C', 5, 0], 'quarter'), r('half.')]),
      g('v71endmin4', [r('whole')]),
    ],
  },
  'g-end-lyr': {
    cue: 'Lyrical chord-melody of the M1 head, then air',
    words: ['Lyrical', 'Head as chord-melody', 'Then silence'],
    guitar: [
      g('v71endlyr1', [
        ...dy(['G', 4, 0], ['C', 5, 0], 'quarter'),
        n('C', 5, 'quarter'),
        ...dy(['A', 4, -1], ['C', 5, 0], 'quarter'),
        n('G', 4, 'quarter'),
      ]),
      g('v71endlyr2', [...dy(['G', 4, 0], ['C', 5, 0], 'half'), r('half')]),
      g('v71endlyr3', [r('whole')]),
      g('v71endlyr4', [r('whole')]),
    ],
  },
  'g-end-adv': {
    cue: 'Adventurous — enter late with Eb–G, then Ab–C, then stop',
    words: ['Adventurous', 'Late dyads. Last bar silent'],
    guitar: [
      g('v71endadv1', [r('whole')]),
      g('v71endadv2', [...dy(['G', 4, 0], ['E', 5, -1], 'quarter'), n('C', 5, 'quarter'), r('half')]),
      g('v71endadv3', [...dy(['A', 4, -1], ['C', 5, 0], 'half'), r('half')]),
      g('v71endadv4', [n('G', 4, 'quarter'), r('half.')]),
      g('v71endadv5', [r('whole')]),
    ],
  },
};

export const BLACK_AURA_V71_GUITAR_STUDY: WwhStudyBlock[] = BLACK_AURA_GUITAR_STUDY.map((block) => {
  const next = STUDY[block.id];
  if (!next) throw new Error(`missing V7.1 study ${block.id}`);
  return withGuitar(block, next.guitar, next.cue, next.words);
});

export const BLACK_AURA_V71_BASS_PARTNER: WwhStudyBlock[] = BLACK_AURA_BASS_PARTNER;

export const BLACK_AURA_V71_CUES = [
  { sourceBar: 8, performanceSectionId: 'n-guitar-answer', text: '→ N' },
  { sourceBar: 16, performanceSectionId: 'o-bass-leads', text: '→ O' },
  { sourceBar: 23, performanceSectionId: 'p-liquid', text: '→ P' },
  { sourceBar: 29, performanceSectionId: 'q-h-open', text: '→ Q' },
  { sourceBar: 39, performanceSectionId: 's-coda', text: '→ S' },
];
