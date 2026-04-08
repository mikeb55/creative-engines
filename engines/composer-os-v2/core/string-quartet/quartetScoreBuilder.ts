/**
 * Build MusicXML-ready ScoreModel from string quartet planning (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';
import {
  QUARTET_INSTRUMENTS,
  SQ_PART_PIANO,
  SQ_PART_V1,
  SQ_PART_V2,
  SQ_PART_VA,
  SQ_PART_VC,
  partIdForQuartetInstrument,
} from './stringQuartetTypes';
import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { createNote, createPart, createRest, createScore, addEvent } from '../score-model/scoreEventBuilder';
import type { ScoreModel } from '../score-model/scoreModelTypes';

const CHORD_CYCLE = ['Dmin9', 'G13', 'Cmaj9', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];

/**
 * Per-era lead-sheet vocabulary tokens (research-aligned). Progressions below
 * are hand-ordered loops that use these harmonic types (mirrors Big Band score builder behaviour).
 */
export const ERA_CHORD_POOLS: Record<BigBandEraId, readonly string[]> = {
  swing: ['maj6', '6/9', 'm7', 'm6', 'dim7', '7', '9', '7b9', 'maj7', '7sus4'],
  bebop: ['maj7', '6/9', 'm7', 'm7b5', '7b9', '7#9', '7#11', '7b13', 'dim7'],
  post_bop: ['maj7#11', 'm7', 'm7b5', 'mMaj7', '7alt', '7sus', 'quartal'],
  contemporary: ['maj7', 'maj7#11', 'm9', 'm11', '7sus', 'add9', '6/9', 'mMaj7'],
  cool_jazz: ['maj7', '6/9', 'm7', 'm6', 'mMaj7', '9', '13', 'm7b5', 'add9', 'maj7#11'],
  hard_bop: ['maj7', '6/9', 'm7', 'm7b5', 'm6', '7', '9', '13', '7b9', '7#9', '7#11', '7b13', 'dim7', 'sus4'],
  fusion: ['maj7', 'maj7#11', '6/9', 'm7', 'm9', 'm11', 'm7b5', '7sus', '7alt', 'add9'],
};

const ERA_PROGRESSION_CYCLES: Record<BigBandEraId, readonly string[]> = {
  swing: [
    'Dm7',
    'G7',
    'Cmaj6',
    'C6/9',
    'Am7',
    'D7b9',
    'G9',
    'G7sus4',
    'Cmaj7',
    'Fm6',
    'Bbdim7',
    'Eb9',
    'Am6',
    'Bb7',
    'Ebmaj6',
    'A7',
  ],
  bebop: [
    'Cm7',
    'F7b9',
    'Bbmaj7',
    'Bb6/9',
    'Em7b5',
    'A7b9',
    'Dm7',
    'G7#9',
    'Cmaj7',
    'Ab7#11',
    'Dm7b5',
    'G7b13',
    'Bdim7',
    'E7#9',
    'Am7',
    'D7b9',
  ],
  post_bop: [
    'Fmaj7#11',
    'Bm7b5',
    'E7alt',
    'Am7',
    'D7sus',
    'Gmaj7#11',
    'Gm7',
    'C7alt',
    'FmMaj7',
    'Bbm7b5',
    'Eb7alt',
    'Ab7sus',
    'Dbmaj7#11',
    'Dm7b5',
    'G7alt',
    'Cm7b5',
  ],
  contemporary: [
    'Cmaj7#11',
    'Dm9',
    'G7sus',
    'C6/9',
    'Am11',
    'D7sus',
    'Gmaj7add9',
    'Em9',
    'AmMaj7',
    'Bm7b5',
    'E7sus',
    'Amaj7#11',
    'Fmaj7',
    'Gm11',
    'C7sus',
    'Fm9',
  ],
  cool_jazz: [
    'Cmaj7',
    'Dm7',
    'G13',
    'C6/9',
    'Am7',
    'Fmaj7',
    'Bm7b5',
    'E9',
    'Am6',
    'Dm7',
    'G7',
    'Cadd9',
    'Fmaj7#11',
    'Bm7b5',
    'E7',
    'AmMaj7',
  ],
  hard_bop: [
    'Fm7',
    'Bb7b9',
    'Ebmaj7',
    'Eb6/9',
    'Am7b5',
    'D7b9',
    'Gm7',
    'C7#9',
    'Fm7',
    'Bb7sus4',
    'Eb9',
    'Ab7#11',
    'Ddim7',
    'G7#9',
    'Cm7',
    'F7b9',
  ],
  fusion: [
    'Cmaj7#11',
    'Dm9',
    'G7sus',
    'Am11',
    'Bm7b5',
    'E7alt',
    'Amaj7',
    'Dm9',
    'G7sus',
    'Cmaj7add9',
    'Fm11',
    'Bb7alt',
    'Ebmaj7',
    'Gm11',
    'C7sus',
    'Fm9',
  ],
};

function indexMod(n: number, len: number): number {
  return ((n % len) + len) % len;
}

function barChordFromCycle(bar: number, seed: number, cycle: readonly string[]): string {
  const L = cycle.length;
  return cycle[indexMod(bar - 1 + seed, L)]!;
}

function barChord(bar: number, seed: number, era?: BigBandEraId): string {
  if (era == null) {
    return CHORD_CYCLE[indexMod(bar + seed, CHORD_CYCLE.length)]!;
  }
  return barChordFromCycle(bar, seed, ERA_PROGRESSION_CYCLES[era]);
}

/** Order: v1, v2, va, vc (same as QUARTET_INSTRUMENTS). */
function pitchesQuartetString(rootPc: number): [number, number, number, number] {
  const r = rootPc;
  const vc = snapMidiToRange(48 + r, ...QUARTET_MIDI_BOUNDS[SQ_PART_VC]);
  const va = snapMidiToRange(60 + r + 3, ...QUARTET_MIDI_BOUNDS[SQ_PART_VA]);
  const v2 = snapMidiToRange(67 + r + 4, ...QUARTET_MIDI_BOUNDS[SQ_PART_V2]);
  const v1 = snapMidiToRange(72 + r + 7, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
  return [v1, v2, va, vc];
}

const PART_META: Array<{
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
}> = [
  { name: 'Violin I', instrumentIdentity: 'violin_1', midiProgram: 40, clef: 'treble' },
  { name: 'Violin II', instrumentIdentity: 'violin_2', midiProgram: 40, clef: 'treble' },
  { name: 'Viola', instrumentIdentity: 'viola', midiProgram: 41, clef: 'treble' },
  { name: 'Violoncello', instrumentIdentity: 'cello', midiProgram: 42, clef: 'bass' },
];

export interface BuildQuartetScoreModelInput {
  title: string;
  seed: number;
  formPlan: QuartetFormPlan;
  texturePlan: QuartetTexturePlan;
  /** When set, selects default progression from `ERA_PROGRESSION_CYCLES`; omitted → legacy `CHORD_CYCLE`. */
  era?: BigBandEraId;
  /** When length matches `formPlan.totalBars`, overrides era pool / `CHORD_CYCLE` entirely. */
  chordBars?: string[];
}

export function buildQuartetScoreModel(input: BuildQuartetScoreModelInput): ScoreModel {
  const { title, seed, formPlan, texturePlan, era, chordBars } = input;
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => {
    if (chordBars && chordBars.length === totalBars) {
      return chordBars[b - 1]!;
    }
    return barChord(b, seed, era);
  };
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    if (!sl) return undefined;
    const raw = String(sl.phase).replace(/_/g, ' ').trim();
    if (!raw) return undefined;
    return raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const parts = QUARTET_INSTRUMENTS.map((inst, idx) => {
    const partId = partIdForQuartetInstrument(inst);
    const meta = PART_META[idx];
    const p = createPart(
      partId,
      meta.name,
      meta.instrumentIdentity,
      meta.midiProgram,
      meta.clef,
      totalBars,
      chordForBar,
      rehearsalForBar
    );

    for (let bar = 1; bar <= totalBars; bar++) {
      const m = p.measures[bar - 1];
      const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
      const texSlice = slice ? texturePlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
      const role = texSlice?.rolesByInstrument[inst];
      if (role === 'silence') {
        addEvent(m, createRest(0, 4));
        continue;
      }
      const sym = chordForBar(bar);
      const rpc = chordSymbolRootPc(sym) ?? 0;
      const stack = pitchesQuartetString(rpc);
      addEvent(m, createNote(stack[idx], 0, 4));
    }
    return p;
  });

  const pianoPart = createPart(
    SQ_PART_PIANO,
    'Piano',
    'string_quartet_piano',
    0,
    'treble',
    totalBars,
    chordForBar,
    rehearsalForBar
  );
  for (let bar = 1; bar <= totalBars; bar++) {
    const m = pianoPart.measures[bar - 1];
    addEvent(m, createRest(0, 4));
  }

  return createScore(title, [...parts, pianoPart], { tempo: 96 });
}
