/**
 * Build a MusicXML-ready ScoreModel from Big Band planning output (Prompt C/3).
 * Behavioural voicing: section stacks + harmonic rhythm, not finished arranging.
 */

import type { BigBandFormPhase, BigBandFormPlan, BigBandSectionPlan } from './bigBandPlanTypes';
import type { HornCloningBarInput, ScoredNote, SectionTag } from '../ensemble-scoring/ensembleLayoutHeuristics';
import {
  WholeNoteDensityTracker,
  advanceHornCloneStreaks,
  initialHornCloneStreakState,
  mitigateBigBandHornMidis,
} from '../ensemble-scoring/ensembleLayoutHeuristics';
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
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { applyBigBandWybleLeadInnerSaxMidis } from './bigBandWybleHornVoicing';
import { wybleConsumptionReceiptForBigBand } from '../wyble/wybleConsumptionReceipt';
import {
  BB_V1_5_SOLI_MOTIF,
  blendSoliMotifWithHeadTheme,
  generateBrassPunches,
  generateSaxSoliPhrase,
  generateShoutChorus,
} from '../arranging/bigBandPatterns';
import {
  applySlonimskyToMelodyLine,
  buildBigBandSlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyPatternService';

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

/**
 * Designated sax soli (bars 17–24 when `totalBars >= 24`): brass tacet; V2 blends head lead + bars 1–8
 * harmonic contour into the soli motif (see `blendSoliMotifWithHeadTheme`).
 */
const BB_DESIGNATED_SAX_SOLI_START = 17;
const BB_DESIGNATED_SAX_SOLI_END = 24;

function inDesignatedSaxSoliWindow(bar: number, totalBars: number): boolean {
  return (
    totalBars >= BB_DESIGNATED_SAX_SOLI_END &&
    bar >= BB_DESIGNATED_SAX_SOLI_START &&
    bar <= BB_DESIGNATED_SAX_SOLI_END
  );
}

const CHORD_CYCLE = ['Cmaj7', 'Am7', 'Dm7', 'G7'];

function bigBandPhaseToSectionTag(phase: BigBandFormPhase | undefined): SectionTag {
  switch (phase) {
    case 'intro':
      return 'head';
    case 'melody_head':
      return 'melody';
    case 'solo_section':
      return 'solo';
    case 'background_figures':
      return 'other';
    case 'shout_chorus':
      return 'shout';
    case 'ending':
      return 'out';
    default:
      return 'other';
  }
}

/** Human-readable rehearsal mark text in exported scores (internal `phase` ids unchanged). */
const BIG_BAND_REHEARSAL_MARK_DISPLAY: Record<BigBandFormPhase, string> = {
  intro: 'Intro',
  melody_head: 'Melody Head',
  solo_section: 'Solo Section',
  background_figures: 'Soli Chorus',
  shout_chorus: 'Shout Chorus',
  ending: 'Rideout',
};

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
 * Sibelius-style drum layer: v1 = hi-hat (F5/x) all four beats; v2 = BD layer (composite snare via `bb_drum_bs` on hits).
 * Voice 2 must sum to exactly 4 beats — chord snare is encoded via motifRef on the bass-drum note (not a second event).
 *
 * V2: non–ensemble-hit bars keep time with HH + downbeat BD only; punch/shout bars use fuller kicks aligned with horns.
 */
function addBigBandDrumPattern(measure: MeasureModel, opts?: { ensembleHit?: boolean }): void {
  const ensembleHit = opts?.ensembleHit === true;
  for (let b = 0; b < 4; b++) {
    addEvent(measure, createNote(DRUM_HH, b, 1, 1));
  }
  if (!ensembleHit) {
    addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
    addEvent(measure, createRest(1, 3, 2));
    return;
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

/**
 * Bars 1–8 only: simulated head lead vs nominal sax anchor (55+rpc+4), after Wyble + horn mitigation.
 * Used for V2 theme-anchored soli / shout when `totalBars >= 24`.
 */
/** Exported for `scripts/bigBandChartEval.ts` (metrics only). */
export function computeBigBandHeadLeadOffsets(params: {
  chordSequence: string[];
  formPlan: BigBandFormPlan;
  wybleVoiceLayout?: EnsembleWybleRoleMap;
}): number[] {
  const { chordSequence, formPlan, wybleVoiceLayout } = params;
  let hornStreak = initialHornCloneStreakState();
  let prevTenorMidi: number | undefined;
  let prevAltoMidi: number | undefined;
  const out: number[] = [];

  for (let bar = 1; bar <= 8; bar++) {
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const sectionTag = bigBandPhaseToSectionTag(slice?.phase);

    const sym = chordSequence[bar - 1] ?? 'Cmaj7';
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const stack = pitchesForBigBandBar(rpc);
    let altoMidi = stack[0];
    let tenorMidi = stack[1];
    let trumpetMidi = stack[2];

    const snappedSax = (m: number) => snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
    const snappedTrp = (m: number) => snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);

    const wybleSaxes = applyBigBandWybleLeadInnerSaxMidis(
      altoMidi,
      tenorMidi,
      wybleVoiceLayout,
      snappedSax,
      prevTenorMidi
      ,
      prevAltoMidi
    );
    altoMidi = wybleSaxes.altoMidi;
    tenorMidi = wybleSaxes.tenorMidi;
    prevTenorMidi = tenorMidi;
    prevAltoMidi = altoMidi;

    const mit = mitigateBigBandHornMidis(
      hornStreak,
      altoMidi,
      tenorMidi,
      trumpetMidi,
      sectionTag,
      snappedSax,
      snappedTrp
    );
    altoMidi = mit.altoMidi;
    tenorMidi = mit.tenorMidi;
    trumpetMidi = mit.trumpetMidi;

    hornStreak = advanceHornCloneStreaks(hornStreak, {
      altoMidi,
      tenorMidi,
      trumpetMidi,
      sectionTag,
    });

    const nominalLead = snapMidiToRange(55 + rpc + 4, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
    const delta = Math.round(altoMidi - nominalLead);
    out.push(Math.max(-12, Math.min(12, delta)));
  }

  return out;
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
  /** `midiProgram` 0 = GM Acoustic Grand; MusicXML export fixes `<midi-program>1</midi-program>` + ch. 1 for `bb_piano`. */
  { name: 'Piano', instrumentIdentity: 'big_band_piano', midiProgram: 0, clef: 'treble' },
  { name: 'Double Bass', instrumentIdentity: 'acoustic_upright_bass', midiProgram: 32, clef: 'bass' },
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
  /** If true, skips whole-note density + rhythm-split heuristics (pad / demo sketch). */
  padSketch?: boolean;
  /**
   * When set to the big-band Wyble map, tenor sax is voiced below the alto lead tone
   * in sax register (`bigBandWybleHornVoicing`) before horn-clone mitigation.
   */
  wybleVoiceLayout?: EnsembleWybleRoleMap;
}

function addWindOrBassNotes(
  measure: MeasureModel,
  pitch: number,
  useHalfHalf: boolean
): void {
  if (useHalfHalf) {
    addEvent(measure, createNote(pitch, 0, 2, 1));
    addEvent(measure, createNote(pitch, 2, 2, 1));
  } else {
    addEvent(measure, createNote(pitch, 0, 4, 1));
  }
}

function addPunchPattern(measure: MeasureModel, pitch: number, beats: number[], voice: number): void {
  if (beats.length === 0) {
    addEvent(measure, createRest(0, 4, voice));
    return;
  }
  const ordered = [...beats].sort((a, b) => a - b);
  let cursor = 0;
  for (const b of ordered) {
    if (b > cursor) addEvent(measure, createRest(cursor, b - cursor, voice));
    addEvent(measure, createNote(pitch, b, 0.5, voice));
    cursor = b + 0.5;
  }
  if (cursor < 4) addEvent(measure, createRest(cursor, 4 - cursor, voice));
}

/** Piano comp register — matches {@link pitchesForBigBandBar} piano snap range. */
function clampPianoMidi(midi: number): number {
  return snapMidiToRange(midi, 55, 84);
}

/** Simple maj7 / minor7 / dominant shell intervals from chord symbol text. */
function pianoShellHalfStepsFromSymbol(sym: string): { third: number; seventh: number } {
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

function wrapBeatInBar(beat: number): number {
  let x = beat;
  while (x >= 4) x -= 4;
  while (x < 0) x += 4;
  return x;
}

/** Nudge comp hits off brass punch beats (same grid as {@link addPunchPattern}). */
function nudgePianoHitsOffBrass(hits: number[], brassBeats: readonly number[]): number[] {
  return hits.map((hb) => {
    let h = hb;
    for (let iter = 0; iter < 8; iter++) {
      const clash = brassBeats.some((bb) => Math.abs(bb - h) < 0.45);
      if (!clash) break;
      h = wrapBeatInBar(h + 0.5);
    }
    return h;
  });
}

export function buildBigBandScoreModel(input: BuildBigBandScoreModelInput): ScoreModel {
  const USE_PIANO_COMP = true;
  const USE_SLONIMSKY_BB = true;
  const { title, seed, formPlan, sectionPlan, chordBars, era, padSketch, wybleVoiceLayout } = input;
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => {
    if (chordBars && chordBars.length === totalBars) {
      return chordBars[b - 1]!;
    }
    return barChord(b, seed, era);
  };
  const chordSequence = Array.from({ length: totalBars }, (_, i) => chordForBar(i + 1));
  const headLeadOffsets =
    totalBars >= BB_DESIGNATED_SAX_SOLI_END
      ? computeBigBandHeadLeadOffsets({
          chordSequence,
          formPlan,
          wybleVoiceLayout,
        })
      : [];
  const themeAvg =
    headLeadOffsets.length === 8 ? Math.round(headLeadOffsets.reduce((a, b) => a + b, 0) / 8) : 0;
  const headChordRootPcs = chordSequence.slice(0, 8).map((s) => chordSymbolRootPc(s) ?? 0);
  const soliMotif =
    totalBars >= BB_DESIGNATED_SAX_SOLI_END && headLeadOffsets.length === 8
      ? blendSoliMotifWithHeadTheme(BB_V1_5_SOLI_MOTIF, headLeadOffsets, headChordRootPcs)
      : [...BB_V1_5_SOLI_MOTIF];
  const saxSoli = generateSaxSoliPhrase(chordSequence, soliMotif, {
    startBar: Math.min(17, totalBars),
    endBar: Math.min(24, totalBars),
  });
  const brassPunches = generateBrassPunches(chordSequence, [0, 2]);
  const shoutFragment = generateShoutChorus(chordSequence);
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    if (!sl) return undefined;
    return BIG_BAND_REHEARSAL_MARK_DISPLAY[sl.phase];
  };

  const parts: PartModel[] = BB_PART_IDS.map((partId, idx) => {
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
  let hornStreak = initialHornCloneStreakState();
  /** Rolling 3-bar alto lead windows for {@link applySlonimskyToMelodyLine} (needs ≥3 notes). */
  const slonimskyAltoAcc: number[] = [];

  for (let bar = 1; bar <= totalBars; bar++) {
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const secSlice = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
    const sectionTag = bigBandPhaseToSectionTag(slice?.phase);

    const needRhythmSplit = !padSketch && wholeTracker.highWholeStreakAtEnd() >= 3;
    const splitWindSlot = (bar + seed) % 4;

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const stack = pitchesForBigBandBar(rpc);
    let altoMidi = stack[0];
    let tenorMidi = stack[1];
    let trumpetMidi = stack[2];
    const boneMidi = stack[3];
    const bassMidi = stack[5];

    const snappedSax = (m: number) => snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
    const snappedTrp = (m: number) => snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);

    const wybleSaxes = applyBigBandWybleLeadInnerSaxMidis(altoMidi, tenorMidi, wybleVoiceLayout, snappedSax);
    altoMidi = wybleSaxes.altoMidi;
    tenorMidi = wybleSaxes.tenorMidi;

    const mit = mitigateBigBandHornMidis(
      hornStreak,
      altoMidi,
      tenorMidi,
      trumpetMidi,
      sectionTag,
      snappedSax,
      snappedTrp
    );
    altoMidi = mit.altoMidi;
    tenorMidi = mit.tenorMidi;
    trumpetMidi = mit.trumpetMidi;

    let melodyPitchAlto = altoMidi;
    if (USE_SLONIMSKY_BB && !inDesignatedSaxSoliWindow(bar, totalBars)) {
      slonimskyAltoAcc.push(altoMidi);
      if (slonimskyAltoAcc.length > 3) slonimskyAltoAcc.shift();
      if (slonimskyAltoAcc.length === 3) {
        const ctx = buildBigBandSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: undefined,
          totalQuarterBeats: 4,
          styleProfile: null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][0]!,
          effectiveHigh: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][1]!,
          catalogueSection: 'intervallic_mirror_permutations',
        });
        const mel: SlonimskyNote[] = slonimskyAltoAcc.map((m, i) => ({
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
          melodyPitchAlto = snapMidiToRange(pickMidi, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
        }
      }
    }

    const hornIn: HornCloningBarInput = {
      altoMidi,
      tenorMidi,
      trumpetMidi,
      sectionTag,
    };
    hornStreak = advanceHornCloneStreaks(hornStreak, hornIn);

    const barNotes: ScoredNote[] = [];

    for (let idx = 0; idx < BB_PART_IDS.length; idx++) {
      const partId = BB_PART_IDS[idx];
      const m = parts[idx]!.measures[bar - 1]!;

      if (partId === 'bb_drums') {
        const secSliceDr = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
        const roleDr = secSliceDr?.rolesBySection['rhythm_section'];
        if (roleDr === 'silence') {
          addEvent(m, createRest(0, 4, 1));
          addEvent(m, createRest(0, 4, 2));
        } else {
          const ensembleHitBar =
            (brassPunches.get(bar)?.length ?? 0) > 0 || (shoutFragment.get(bar)?.length ?? 0) > 0;
          addBigBandDrumPattern(m, { ensembleHit: ensembleHitBar });
        }
        continue;
      }
      if (partId === 'bb_piano') {
        if (
          !USE_PIANO_COMP ||
          sectionTag === 'shout' ||
          sectionTag === 'solo' ||
          inDesignatedSaxSoliWindow(bar, totalBars)
        ) {
          addEvent(m, createRest(0, 4));
          continue;
        }

        const pianoMidi = stack[4]!;
        const brassHitBeats = brassPunches.get(bar) ?? [];
        const { third: tHs, seventh: sHs } = pianoShellHalfStepsFromSymbol(sym);
        const rootM = clampPianoMidi(pianoMidi);
        const shell: number[] = [
          rootM,
          clampPianoMidi(pianoMidi + tHs),
          clampPianoMidi(pianoMidi + sHs),
        ];

        const rotateForwardOneBeat = (bar + seed) % 3 === 0;
        const rot = rotateForwardOneBeat ? 1 : 0;
        const rotHit = (b: number) => wrapBeatInBar(b + rot);

        let hitBeats: number[];
        if (sectionTag === 'melody') {
          hitBeats = [0, 1.5, 3].map(rotHit);
        } else {
          hitBeats = [0, 2.5].map(rotHit);
        }
        hitBeats = nudgePianoHitsOffBrass(hitBeats, brassHitBeats);

        if (needRhythmSplit) {
          addEvent(m, createNote(rootM, 0, 4, 1));
        }
        for (const hb of hitBeats) {
          addEvent(m, createNote(rootM, hb, 0.5, 2, undefined, shell));
        }
        continue;
      }

      const inst = BB_ORDER[idx];
      const role = secSlice?.rolesBySection[inst];
      const designatedSaxSoli = inDesignatedSaxSoliWindow(bar, totalBars);

      // Deterministic sax soli (bars 17–24): ignore section-plan silence for saxes; brass tacet.
      if (designatedSaxSoli && idx <= 3) {
        if (idx === 0 || idx === 1) {
          const soliPattern = saxSoli.get(bar) ?? { leadOffsetSemitones: 0 };
          const pid = BB_PART_IDS[idx];
          const lead = snapMidiToRange(
            altoMidi + soliPattern.leadOffsetSemitones,
            ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]
          );
          const pitch = idx === 0 ? lead : snapMidiToRange(lead - 3, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
          addEvent(m, createNote(pitch, 0, 2, 1));
          addEvent(m, createNote(pitch, 2, 2, 1));
          barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
          barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
          continue;
        }
        if (idx === 2 || idx === 3) {
          addEvent(m, createRest(0, 4));
          continue;
        }
      }

      if (role === 'silence') {
        addEvent(m, createRest(0, 4));
        continue;
      }

      const splitHere = needRhythmSplit && idx === splitWindSlot && idx >= 0 && idx <= 3;
      const brassBeats = brassPunches.get(bar);
      const shoutBeats = shoutFragment.get(bar);

      if (idx === 0 || idx === 1 || idx === 2 || idx === 3) {
        let pitch =
          idx === 0 ? melodyPitchAlto : idx === 1 ? tenorMidi : idx === 2 ? trumpetMidi : boneMidi;
        const pid = BB_PART_IDS[idx];
        if ((idx === 2 || idx === 3) && shoutBeats && shoutBeats.length > 0) {
          /** V2: trumpet lift biased by bars 1–8 head theme average (deterministic). */
          const shoutLift =
            idx === 2 ? 5 + indexMod(themeAvg + seed, 5) - 2 : 0;
          const shoutPitch =
            idx === 2 ? snapMidiToRange(pitch + shoutLift, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]) : pitch;
          addPunchPattern(m, shoutPitch, shoutBeats, 1);
          for (const _ of shoutBeats) barNotes.push({ partId: pid, midi: shoutPitch, durationBeats: 0.5 });
          continue;
        }
        if ((idx === 2 || idx === 3) && brassBeats && brassBeats.length > 0) {
          // V1 brass punches on cadential bars.
          addPunchPattern(m, pitch, brassBeats, 1);
          for (const _ of brassBeats) barNotes.push({ partId: pid, midi: pitch, durationBeats: 0.5 });
          continue;
        }
        if (splitHere) {
          barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
          barNotes.push({ partId: pid, midi: pitch, durationBeats: 2 });
        } else {
          barNotes.push({ partId: pid, midi: pitch, durationBeats: 4 });
        }
        addWindOrBassNotes(m, pitch, splitHere);
        continue;
      }
      /** Upright bass (`bb_rhythm_section`) */
      const pitch = bassMidi + 12;
      barNotes.push({ partId: BB_PART_RHYTHM, midi: pitch, durationBeats: 4 });
      addWindOrBassNotes(m, pitch, false);
    }

    wholeTracker.pushBarSlice(
      { barIndex: bar, sectionTag, barBeats: 4, notes: barNotes },
      padSketch ?? false
    );
  }

  const score = createScore(title, parts, { tempo: 140 });
  score.wybleConsumptionReceipt = wybleConsumptionReceiptForBigBand(wybleVoiceLayout);
  return score;
}
