/**
 * Build a MusicXML-ready ScoreModel from Big Band planning output (Prompt C/3).
 * Behavioural voicing: section stacks + harmonic rhythm, not finished arranging.
 */

import type { BigBandFormPlan, BigBandSectionPlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';
import type { BigBandEraId } from './bigBandResearchTypes';
import {
  BB_PART_RHYTHM,
  BB_PART_SAXES,
  BB_PART_TROMBONES,
  BB_PART_TRUMPETS,
} from './buildBigBandOrchestrationPlan';
import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { createNote, createPart, createRest, createScore, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';

const BB_ORDER: BigBandInstrumentSection[] = [
  'saxes',
  'saxes',
  'trumpets',
  'trombones',
  'rhythm_section',
  'rhythm_section',
  'rhythm_section',
];
const BB_PART_IDS = [
  'bb_alto_sax',
  'bb_tenor_sax',
  BB_PART_TRUMPETS,
  BB_PART_TROMBONES,
  'bb_piano',
  BB_PART_RHYTHM,
  'bb_drums',
] as const;

const CHORD_CYCLE = ['Cmaj7', 'Am7', 'Dm7', 'G7'];

/**
 * Per-era lead-sheet vocabulary tokens (research-aligned). Concrete progressions below
 * are hand-ordered ii–V–I / turnaround loops that use these harmonic types.
 */
export const ERA_CHORD_POOLS: Record<BigBandEraId, readonly string[]> = {
  swing: ['maj6', '6/9', 'm7', 'm6', 'dim7', '7', '9', '7b9', 'maj7', '7sus4'],
  bebop: ['maj7', '6/9', 'm7', 'm7b5', '7b9', '7#9', '7#11', '7b13', 'dim7'],
  post_bop: ['maj7#11', 'm7', 'm7b5', 'mMaj7', '7alt', '7sus', 'quartal'],
  contemporary: ['maj7', 'maj7#11', 'm9', 'm11', '7sus', 'add9', '6/9', 'mMaj7'],
  /** Lighter extensions, more open voicings, modal hints */
  cool_jazz: ['maj7', '6/9', 'm7', 'm6', 'mMaj7', '9', '13', 'm7b5', 'add9', 'maj7#11'],
  /** Bluesy, gritty, altered dominants */
  hard_bop: ['maj7', '6/9', 'm7', 'm7b5', 'm6', '7', '9', '13', '7b9', '7#9', '7#11', '7b13', 'dim7', 'sus4'],
  /** Modal vamps, static harmony, electric feel */
  fusion: ['maj7', 'maj7#11', '6/9', 'm7', 'm9', 'm11', 'm7b5', '7sus', '7alt', 'add9'],
};

/** Deterministic cyclic progressions per era (coherent function, not uniform random). */
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
    /** Legacy index: same as pre–era-pool `CHORD_CYCLE[(bar + seed) % length]`. */
    return CHORD_CYCLE[indexMod(bar + seed, CHORD_CYCLE.length)]!;
  }
  return barChordFromCycle(bar, seed, ERA_PROGRESSION_CYCLES[era]);
}

/** GM drum kit MIDI key map (channel 10); exporter maps to unpitched staff positions. */
const DRUM_BD = 36;
const DRUM_HH = 42;

/**
 * Sibelius-style drum layer: v1 = hi-hat (F5/x) all four beats; v2 = four quarter layers (BD only or BD+SN chord).
 * Voice 2 must sum to exactly 4 beats — chord snare is encoded via motifRef on the bass-drum note (not a second event).
 */
function addBigBandDrumPattern(measure: MeasureModel): void {
  for (let b = 0; b < 4; b++) {
    addEvent(measure, createNote(DRUM_HH, b, 1, 1));
  }
  addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
  addEvent(measure, createNote(DRUM_BD, 1, 1, 2, 'bb_drum_bs'));
  addEvent(measure, createNote(DRUM_BD, 2, 1, 2));
  addEvent(measure, createNote(DRUM_BD, 3, 1, 2, 'bb_drum_bs'));
}

/** Horns + piano / bass — alto/tenor share the same sectional sax pitch. */
function pitchesForBigBandBar(rootPc: number): [number, number, number, number, number, number] {
  const r = rootPc;
  const sax = snapMidiToRange(55 + r + 4, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  const trp = snapMidiToRange(60 + r + 11, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
  const bone = snapMidiToRange(48 + r + 7, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES]);
  const piano = snapMidiToRange(60 + r, 55, 84);
  const bass = snapMidiToRange(36 + r, ...BIG_BAND_MIDI_BOUNDS[BB_PART_RHYTHM]);
  return [sax, sax, trp, bone, piano, bass];
}

const PART_META: Array<{
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
}> = [
  { name: 'Alto Saxophone', instrumentIdentity: 'big_band_alto_sax', midiProgram: 64, clef: 'treble' },
  { name: 'Tenor Saxophone', instrumentIdentity: 'big_band_tenor_sax', midiProgram: 65, clef: 'treble' },
  { name: 'Trumpet', instrumentIdentity: 'big_band_trumpets', midiProgram: 56, clef: 'treble' },
  { name: 'Trombone', instrumentIdentity: 'big_band_trombones', midiProgram: 57, clef: 'bass' },
  { name: 'Piano', instrumentIdentity: 'big_band_piano', midiProgram: 0, clef: 'treble' },
  { name: 'Rhythm Section', instrumentIdentity: 'acoustic_upright_bass', midiProgram: 32, clef: 'bass' },
  { name: 'Jazz Drums', instrumentIdentity: 'big_band_jazz_drums', midiProgram: 0, clef: 'treble' },
];

export interface BuildBigBandScoreModelInput {
  title: string;
  seed: number;
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
  /** When set, selects default progression from `ERA_PROGRESSION_CYCLES`; omitted → legacy `CHORD_CYCLE`. */
  era?: BigBandEraId;
  /** When length matches `formPlan.totalBars`, overrides era pool / `CHORD_CYCLE` entirely. */
  chordBars?: string[];
}

export function buildBigBandScoreModel(input: BuildBigBandScoreModelInput): ScoreModel {
  const { title, seed, formPlan, sectionPlan, chordBars, era } = input;
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

  const parts = BB_PART_IDS.map((partId, idx) => {
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
      if (partId === 'bb_drums') {
        const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
        const secSlice = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
        const role = secSlice?.rolesBySection['rhythm_section'];
        if (role === 'silence') {
          addEvent(m, createRest(0, 4, 1));
          addEvent(m, createRest(0, 4, 2));
        } else {
          addBigBandDrumPattern(m);
        }
        continue;
      }
      /** Piano reduction staff: chord symbols only (full-bar rest); no comping pitches. */
      if (partId === 'bb_piano') {
        addEvent(m, createRest(0, 4));
        continue;
      }
      const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
      const secSlice = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
      const inst = BB_ORDER[idx];
      const role = secSlice?.rolesBySection[inst];
      if (role === 'silence') {
        addEvent(m, createRest(0, 4));
        continue;
      }
      const sym = chordForBar(bar);
      const rpc = chordSymbolRootPc(sym) ?? 0;
      const stack = pitchesForBigBandBar(rpc);
      let pitch = stack[idx];
      /** Double bass (`bb_rhythm_section`): written one octave higher for legibility. */
      if (partId === BB_PART_RHYTHM) {
        pitch += 12;
      }
      addEvent(m, createNote(pitch, 0, 4));
    }
    return p;
  });

  return createScore(title, parts, { tempo: 140 });
}
