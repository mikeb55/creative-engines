/**
 * Build MusicXML-ready ScoreModel from string quartet planning (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { QuartetFormPhase, QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';
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
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { ScoredNote, SectionTag } from '../ensemble-scoring/ensembleLayoutHeuristics';
import { WholeNoteDensityTracker } from '../ensemble-scoring/ensembleLayoutHeuristics';
import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { applyQuartetWybleChordToneStack } from './quartetWybleChordToneStack';
import { wybleConsumptionReceiptForQuartet } from '../wyble/wybleConsumptionReceipt';
import {
  applySlonimskyToMelodyLine,
  buildQuartetSlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyPatternService';

const CHORD_CYCLE = ['Dmin9', 'G13', 'Cmaj9', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];

const QUARTET_PART_IDS = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

/** Human-readable rehearsal mark text in exported scores (internal `phase` ids unchanged). */
const QUARTET_REHEARSAL_MARK_DISPLAY: Record<QuartetFormPhase, string> = {
  statement: 'Statement',
  development: 'Development',
  contrast: 'Contrast',
  return: 'Return',
  coda: 'Coda',
};

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
  /** If true, skips whole-note density + rhythm-split heuristics (pad / demo sketch). */
  padSketch?: boolean;
  /**
   * When set to the string-quartet Wyble map, chord tones for violin II and viola
   * are cross-assigned from the default per-part stack (see `quartetWybleChordToneStack`).
   */
  wybleVoiceLayout?: EnsembleWybleRoleMap;
}

function addStringBar(m: MeasureModel, pitch: number, useHalfHalf: boolean): void {
  if (useHalfHalf) {
    addEvent(m, createNote(pitch, 0, 2, 1));
    addEvent(m, createNote(pitch, 2, 2, 1));
  } else {
    addEvent(m, createNote(pitch, 0, 4, 1));
  }
}

/** Piano comp register (matches BB piano / treble comp band). */
function clampPianoMidiSq(midi: number): number {
  return snapMidiToRange(midi, 55, 84);
}

/** Minor / maj7 / dominant shell intervals from chord symbol (aligned with BB piano). */
function pianoShellHalfStepsFromSymbolSq(sym: string): { third: number; seventh: number } {
  const t = sym.trim();
  const low = t.toLowerCase();
  if (/^[a-g][#b]?m(?!aj)/i.test(t)) {
    return { third: 3, seventh: 10 };
  }
  if (low.includes('maj') || low.includes('Δ') || low.includes('ma7')) {
    return { third: 4, seventh: 11 };
  }
  return { third: 4, seventh: 10 };
}

function wrapBeatInBarSq(beat: number): number {
  let x = beat;
  while (x >= 4) x -= 4;
  while (x < 0) x += 4;
  return x;
}

export function buildQuartetScoreModel(input: BuildQuartetScoreModelInput): ScoreModel {
  const USE_PIANO_COMP_SQ = true;
  const USE_SLONIMSKY_SQ = true;
  const USE_RETURN_OCTAVE_LIFT = true;
  const { title, seed, formPlan, texturePlan, era, chordBars, padSketch, wybleVoiceLayout } = input;
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
    return QUARTET_REHEARSAL_MARK_DISPLAY[sl.phase];
  };

  const stringParts: PartModel[] = QUARTET_INSTRUMENTS.map((inst, idx) => {
    const partId = partIdForQuartetInstrument(inst);
    const meta = PART_META[idx];
    return createPart(
      partId,
      meta.name,
      meta.instrumentIdentity,
      meta.midiProgram,
      meta.clef,
      totalBars,
      chordForBar,
      rehearsalForBar
    );
  });

  const wholeTracker = new WholeNoteDensityTracker();
  let prevQuartetInner: { violin2?: number; viola?: number } = {};
  /** Rolling 3-bar violin I windows for {@link applySlonimskyToMelodyLine}. */
  const slonimskyV1Acc: number[] = [];

  for (let bar = 1; bar <= totalBars; bar++) {
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const texSlice = slice ? texturePlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
    const sectionTag = (slice?.phase ?? 'other') as SectionTag;
    const needSplit = !padSketch && wholeTracker.highWholeStreakAtEnd() >= 3;
    const splitIdx = (bar + seed) % 4;

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const stack = applyQuartetWybleChordToneStack(pitchesQuartetString(rpc), wybleVoiceLayout, prevQuartetInner);
    prevQuartetInner = { violin2: stack[1], viola: stack[2] };

    let melodyPitchV1 = stack[0]!;
    if (USE_RETURN_OCTAVE_LIFT && slice?.phase === 'return') {
      melodyPitchV1 = snapMidiToRange(stack[0]! + 12, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
    }
    const v1Silent = texSlice?.rolesByInstrument.violin_1 === 'silence';
    if (USE_SLONIMSKY_SQ && !v1Silent) {
      slonimskyV1Acc.push(melodyPitchV1);
      if (slonimskyV1Acc.length > 3) slonimskyV1Acc.shift();
      if (slonimskyV1Acc.length === 3) {
        const ctx = buildQuartetSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: undefined,
          totalQuarterBeats: 4,
          styleProfile: null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: QUARTET_MIDI_BOUNDS[SQ_PART_V1][0]!,
          effectiveHigh: QUARTET_MIDI_BOUNDS[SQ_PART_V1][1]!,
          catalogueSection: 'intervallic_mirror_permutations',
        });
        const mel: SlonimskyNote[] = slonimskyV1Acc.map((m, i) => ({
          midi: m,
          durationBeats: 1,
          beat: i,
          role: i === 0 || i === 2 ? 'target' : 'passing',
        }));
        const chords3 = [chordForBar(bar - 2), chordForBar(bar - 1), chordForBar(bar)];
        const out = applySlonimskyToMelodyLine(mel, chords3, ctx, seed + bar * 17);
        const sounding = out.filter((n) => n.durationBeats > 0).sort((a, b) => a.beat - b.beat);
        if (sounding.length > 0) {
          const pickMidi = sounding[Math.min(2, sounding.length - 1)]!.midi;
          melodyPitchV1 = snapMidiToRange(pickMidi, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
        }
      }
    }

    const barNotes: ScoredNote[] = [];

    for (let idx = 0; idx < 4; idx++) {
      const inst = QUARTET_INSTRUMENTS[idx]!;
      const m = stringParts[idx]!.measures[bar - 1]!;
      const role = texSlice?.rolesByInstrument[inst];
      const pid = QUARTET_PART_IDS[idx]!;
      if (role === 'silence') {
        addEvent(m, createRest(0, 4));
        continue;
      }
      const splitHere = needSplit && idx === splitIdx;
      const pitch = idx === 0 ? melodyPitchV1 : stack[idx]!;
      if (splitHere) {
        barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
        barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
      } else {
        barNotes.push({ partId: pid, midi: pitch, durationBeats: 4 });
      }
      addStringBar(m, pitch, splitHere);
    }

    wholeTracker.pushBarSlice(
      { barIndex: bar, sectionTag, barBeats: 4, notes: barNotes },
      padSketch ?? false
    );
  }

  /** GM Acoustic Grand (0); exporter emits `<midi-program>1</midi-program>` + `<midi-channel>1</midi-channel>` for `sq_piano`. */
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
    const m = pianoPart.measures[bar - 1]!;
    if (!USE_PIANO_COMP_SQ) {
      addEvent(m, createRest(0, 4));
      continue;
    }

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const pianoMidi = snapMidiToRange(60 + rpc, 55, 84);
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const sectionTag = (slice?.phase ?? 'other') as SectionTag;

    /** Theme / solo tacet: quartet `statement` ≈ theme, `development` ≈ solo. */
    if (sectionTag === 'statement' || sectionTag === 'development') {
      addEvent(m, createRest(0, 4));
      continue;
    }

    const { third: tHs, seventh: sHs } = pianoShellHalfStepsFromSymbolSq(sym);
    const rootM = clampPianoMidiSq(pianoMidi);
    const shell: number[] = [
      rootM,
      clampPianoMidiSq(pianoMidi + tHs),
      clampPianoMidiSq(pianoMidi + sHs),
    ];

    const rotateForwardOneBeat = (bar + seed) % 3 === 0;
    const rot = rotateForwardOneBeat ? 1 : 0;
    const rotHit = (b: number) => wrapBeatInBarSq(b + rot);

    let hitBeats: number[];
    if (sectionTag === 'contrast') {
      hitBeats = [0, 1.5, 3].map(rotHit);
    } else {
      hitBeats = [0, 2.5].map(rotHit);
    }

    if (bar % 4 === 0) {
      addEvent(m, createNote(rootM, 0, 4, 1));
    }
    for (const hb of hitBeats) {
      addEvent(m, createNote(rootM, hb, 0.5, 2, undefined, shell));
    }
  }

  const score = createScore(title, [...stringParts, pianoPart], { tempo: 96 });
  score.wybleConsumptionReceipt = wybleConsumptionReceiptForQuartet(wybleVoiceLayout);
  return score;
}
