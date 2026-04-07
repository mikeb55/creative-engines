/**
 * Build MusicXML-ready ScoreModel from string quartet planning (Prompt C/3).
 */

import type { QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';
import {
  QUARTET_INSTRUMENTS,
  SQ_PART_PIANO,
  partIdForQuartetInstrument,
} from './stringQuartetTypes';
import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { createNote, createPart, createRest, createScore, addEvent } from '../score-model/scoreEventBuilder';
import type { ScoreModel } from '../score-model/scoreModelTypes';

const CHORD_CYCLE = ['Dmin9', 'G13', 'Cmaj9', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];

function barChord(bar: number, seed: number): string {
  return CHORD_CYCLE[(bar + seed) % CHORD_CYCLE.length];
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
  /** When length matches `formPlan.totalBars`, overrides the internal chord cycle per bar. */
  chordBars?: string[];
}

export function buildQuartetScoreModel(input: BuildQuartetScoreModelInput): ScoreModel {
  const { title, seed, formPlan, texturePlan, chordBars } = input;
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => {
    if (chordBars && chordBars.length === totalBars) {
      return chordBars[b - 1]!;
    }
    return barChord(b, seed);
  };
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    return sl ? String(sl.phase) : undefined;
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
