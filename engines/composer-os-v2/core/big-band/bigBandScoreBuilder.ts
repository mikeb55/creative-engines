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
import type { ScoreModel } from '../score-model/scoreModelTypes';

const BB_ORDER: BigBandInstrumentSection[] = ['saxes', 'trumpets', 'trombones', 'rhythm_section'];
const BB_PART_IDS = [BB_PART_SAXES, BB_PART_TRUMPETS, BB_PART_TROMBONES, BB_PART_RHYTHM] as const;

const CHORD_CYCLE = ['Cmaj7', 'Am7', 'Dm7', 'G7'];

function barChord(bar: number, seed: number): string {
  return CHORD_CYCLE[(bar + seed) % CHORD_CYCLE.length];
}

/** Four-part open stack: [saxes, trumpets, trombones, rhythm bass]. */
function pitchesForBigBandBar(rootPc: number): [number, number, number, number] {
  const r = rootPc;
  const sax = snapMidiToRange(55 + r + 4, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  const trp = snapMidiToRange(60 + r + 11, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
  const bone = snapMidiToRange(48 + r + 7, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES]);
  const bass = snapMidiToRange(36 + r, ...BIG_BAND_MIDI_BOUNDS[BB_PART_RHYTHM]);
  return [sax, trp, bone, bass];
}

const PART_META: Array<{
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
}> = [
  { name: 'Alto Saxophones', instrumentIdentity: 'big_band_saxes', midiProgram: 64, clef: 'treble' },
  { name: 'Trumpets', instrumentIdentity: 'big_band_trumpets', midiProgram: 56, clef: 'treble' },
  { name: 'Trombones', instrumentIdentity: 'big_band_trombones', midiProgram: 57, clef: 'bass' },
  { name: 'Rhythm Section', instrumentIdentity: 'acoustic_upright_bass', midiProgram: 32, clef: 'bass' },
];

export interface BuildBigBandScoreModelInput {
  title: string;
  seed: number;
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
}

export function buildBigBandScoreModel(input: BuildBigBandScoreModelInput): ScoreModel {
  const { title, seed, formPlan, sectionPlan } = input;
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => barChord(b, seed);
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    return sl ? String(sl.phase).replace(/_/g, ' ') : undefined;
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
