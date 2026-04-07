/**
 * Build a MusicXML-ready ScoreModel from Big Band planning output (Prompt C/3).
 * Behavioural voicing: section stacks + harmonic rhythm, not finished arranging.
 */

import type { BigBandFormPlan, BigBandSectionPlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';
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

function barChord(bar: number, seed: number): string {
  return CHORD_CYCLE[(bar + seed) % CHORD_CYCLE.length];
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
  /** When length matches `formPlan.totalBars`, overrides the internal chord cycle per bar. */
  chordBars?: string[];
}

export function buildBigBandScoreModel(input: BuildBigBandScoreModelInput): ScoreModel {
  const { title, seed, formPlan, sectionPlan, chordBars } = input;
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => {
    if (chordBars && chordBars.length === totalBars) {
      return chordBars[b - 1]!;
    }
    return barChord(b, seed);
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
      addEvent(m, createNote(stack[idx], 0, 4));
    }
    return p;
  });

  return createScore(title, parts, { tempo: 140 });
}
