/**
 * Build a MusicXML-ready ScoreModel from Big Band planning output (Prompt C/3).
 * Behavioural voicing: section stacks + harmonic rhythm, not finished arranging.
 */

import type {
  BigBandEnhancedPlanning,
  BigBandFormPhase,
  BigBandFormPlan,
  BigBandSectionPlan,
} from './bigBandPlanTypes';
import type { DrumArticulationMode, DrumIntensity, DrumPolicy } from './bigBandDrumIntensity';
import {
  applyDrumArticulationToPolicy,
  drumDeterministicUnit,
  getDrumPolicy,
  mapBigBandFormPhaseToPolicyPhase,
  resolveBigBandDrumIntensityForBar,
} from './bigBandDrumIntensity';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
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
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { applyBigBandWybleLeadInnerSaxMidis } from './bigBandWybleHornVoicing';
import { wybleConsumptionReceiptForBigBand } from '../wyble/wybleConsumptionReceipt';
import {
  applyFigureResponseToPunchMaps,
  BB_V1_5_SOLI_MOTIF,
  blendSoliMotifWithHeadTheme,
  generateBrassPunches,
  generateSaxSoliPhrase,
  generateShoutChorus,
  type FigureResponseLevel,
} from '../arranging/bigBandPatterns';
import {
  applySlonimskyToMelodyLine,
  buildBigBandSlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyPatternService';
import { pushEnsembleSlonimskyCellReceipt } from '../slonimsky/slonimskyEnsembleReceipt';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import {
  orbitBbV2BassAnchor,
  orbitBbV2BloomAdjustPitch,
  orbitBbV2BrassTacet,
  orbitBbV2DynamicsMarkings,
  orbitBbV2ForceDrumTransition,
  orbitBbV2MergeBrassBeats,
  orbitBbV2PianoDropout,
  orbitBbV2PreferWholeBarSustain,
  orbitBbV2SaxTacet,
  orbitBbV2WindDropout,
  orbitBbV2WindVelocity,
} from './orbitBbV2Arrangement';
import {
  addLockedLeadAltoMeasure,
  leadBarHasPitchedNotes,
  leadAttacksDownbeat,
  orbitMelodyEventsForBar,
  orbitV3AltoLeadVelocity,
  orbitV3MelodyProtectBrassBeats,
  orbitV3TenorPadVelocity,
} from './orbitBbV3MelodyAuthority';

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
const DRUM_RIDE = 51;
const DRUM_OHH = 46;
/** GM brush / electric snare — Big Band `timeTexture: brush`. */
const DRUM_BRUSH = 40;

/** Section-style drum cell for Big Band (maps form slices + phases — not literal rehearsal letters). */
export function bigBandDrumFeelClass(
  phase: BigBandFormPhase | undefined,
  sliceIndex: number
): 'A' | 'B' | 'C' {
  if (phase === 'solo_section') return 'C';
  if (phase === 'shout_chorus' || phase === 'background_figures') return 'B';
  const k = ((sliceIndex % 3) + 3) % 3;
  if (k === 0) return 'A';
  if (k === 1) return 'B';
  return 'C';
}

function cymbalMidiFromTexture(texture: DrumPolicy['timeTexture'], quarterIndex0to3: number): number {
  switch (texture) {
    case 'ride':
      return DRUM_RIDE;
    case 'hihat':
      return DRUM_HH;
    case 'brush':
      return DRUM_BRUSH;
    case 'broken':
      return quarterIndex0to3 % 2 === 0 ? DRUM_RIDE : DRUM_HH;
    default:
      return DRUM_HH;
  }
}

function finalizeBigBandDrumVelocities(measure: MeasureModel, policy: DrumPolicy): void {
  for (const e of measure.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    let v = Math.max(1, Math.min(127, Math.round(127 * policy.dynamicCeiling)));
    if (n.motifRef === 'bb_drum_bs') {
      v = Math.max(1, Math.min(127, Math.round(v * policy.setupStrength)));
    }
    n.velocity = v;
  }
}

function addDrumPatternA(measure: MeasureModel, barLen: number, texture: DrumPolicy['timeTexture']): void {
  const q = barLen / 4;
  for (let b = 0; b < 4; b++) {
    addEvent(measure, createNote(cymbalMidiFromTexture(texture, b), b * q, q, 1));
  }
  addEvent(measure, createNote(DRUM_BD, 0, q, 2));
  addEvent(measure, createRest(q, barLen - q, 2));
}

function addDrumPatternB(measure: MeasureModel, barLen: number, texture: DrumPolicy['timeTexture']): void {
  const q = barLen / 4;
  const eighth = barLen / 8;
  for (let i = 0; i < 8; i++) {
    let top: number;
    if (texture === 'ride') {
      top = i % 2 === 0 ? DRUM_RIDE : DRUM_OHH;
    } else if (texture === 'brush') {
      top = i % 2 === 0 ? DRUM_BRUSH : DRUM_OHH;
    } else if (texture === 'broken') {
      top = i % 2 === 0 ? DRUM_RIDE : DRUM_HH;
    } else {
      top = i % 2 === 0 ? DRUM_HH : DRUM_OHH;
    }
    addEvent(measure, createNote(top, i * eighth, eighth, 1));
  }
  addEvent(measure, createNote(DRUM_BD, 0, q, 2));
  addEvent(measure, createNote(DRUM_BD, q, q, 2, 'bb_drum_bs'));
  addEvent(measure, createNote(DRUM_BD, 2 * q, q, 2));
  addEvent(measure, createNote(DRUM_BD, 3 * q, q, 2, 'bb_drum_bs'));
}

function addDrumPatternC(measure: MeasureModel, barLen: number, texture: DrumPolicy['timeTexture']): void {
  const q = barLen / 4;
  addEvent(measure, createNote(cymbalMidiFromTexture(texture, 0), 0, q, 1));
  addEvent(measure, createRest(q, q, 1));
  addEvent(measure, createNote(cymbalMidiFromTexture(texture, 2), 2 * q, q, 1));
  addEvent(measure, createRest(3 * q, q, 1));
  addEvent(measure, createNote(DRUM_BD, 0, q, 2));
  addEvent(measure, createRest(q, barLen - q, 2));
}

function addDrumTransitionFill(
  measure: MeasureModel,
  barLen: number,
  policy: DrumPolicy,
  texture: DrumPolicy['timeTexture']
): void {
  const q = barLen / 4;
  const eighth = barLen / 8;
  const half = barLen / 2;
  const maxFillBeats = Math.min(half, Math.max(0, policy.fillLengthCeiling));
  const numFillNotes = Math.min(4, Math.max(1, Math.floor(maxFillBeats * 2)));

  addEvent(measure, createNote(cymbalMidiFromTexture(texture, 0), 0, q, 1));
  addEvent(measure, createNote(cymbalMidiFromTexture(texture, 1), q, q, 1));

  let t1 = 2 * q;
  for (let i = 0; i < numFillNotes; i++) {
    addEvent(measure, createNote(DRUM_HH, t1, eighth, 1));
    t1 += eighth;
  }
  if (t1 < barLen) {
    addEvent(measure, createRest(t1, barLen - t1, 1));
  }

  addEvent(measure, createRest(0, 2 * q, 2));
  let t2 = 2 * q;
  for (let i = 0; i < numFillNotes; i++) {
    addEvent(measure, createNote(DRUM_BD, t2, eighth, 2, 'bb_drum_bs'));
    t2 += eighth;
  }
  if (t2 < barLen) {
    addEvent(measure, createRest(t2, barLen - t2, 2));
  }
}

/**
 * Sibelius-style drum layer + intensity policy (velocities, cue selectivity, fill cap, time texture).
 */
function addBigBandDrumPattern(
  measure: MeasureModel,
  opts?: {
    ensembleHit?: boolean;
    sectionTag?: SectionTag;
    formPhase?: BigBandFormPhase;
    useDrumVariation?: boolean;
    /** Measure length in quarter-note beat units (defaults to 4). */
    barBeats?: number;
    transitionFill?: boolean;
    drumFeelClass?: 'A' | 'B' | 'C';
    drumIntensity?: DrumIntensity;
    drumArticulation?: DrumArticulationMode;
    feelMode?: 'in2' | 'in4';
    seed?: number;
    barIndex?: number;
  }
): void {
  const barLen = opts?.barBeats ?? 4;
  const q = barLen / 4;
  const ensembleHit = opts?.ensembleHit === true;
  const useV = opts?.useDrumVariation === true;
  const st = opts?.sectionTag;
  const phase = opts?.formPhase;
  const transitionFill = opts?.transitionFill === true;
  const feel = opts?.drumFeelClass ?? 'A';
  const intensity = opts?.drumIntensity ?? 'standard';
  const seed = opts?.seed ?? 0;
  const barIndex = opts?.barIndex ?? 1;

  const policyPhase = mapBigBandFormPhaseToPolicyPhase(phase);
  let policy = getDrumPolicy(policyPhase, intensity);
  policy = applyDrumArticulationToPolicy(policy, opts?.drumArticulation);
  const tex = policy.timeTexture;

  const baseFeel = feel;
  let feelUse = baseFeel;
  if (
    opts?.feelMode === 'in2' &&
    (phase === 'melody_head' || phase === 'background_figures' || phase === 'solo_section')
  ) {
    feelUse = 'C';
  } else if (
    opts?.feelMode === 'in4' &&
    (phase === 'melody_head' || phase === 'background_figures' || phase === 'solo_section')
  ) {
    feelUse = baseFeel === 'C' ? 'B' : baseFeel === 'A' ? 'B' : baseFeel;
  }

  let effectiveEnsembleHit = ensembleHit;
  if (useV && ensembleHit) {
    effectiveEnsembleHit = drumDeterministicUnit(seed, barIndex, 90210) < policy.cueSelectivity;
  }

  const legacyFullEnsemble = () => {
    for (let b = 0; b < 4; b++) {
      addEvent(measure, createNote(cymbalMidiFromTexture(tex, b), b * q, q, 1));
    }
    addEvent(measure, createNote(DRUM_BD, 0, q, 2));
    addEvent(measure, createNote(DRUM_BD, q, q, 2, 'bb_drum_bs'));
    addEvent(measure, createNote(DRUM_BD, 2 * q, q, 2));
    addEvent(measure, createNote(DRUM_BD, 3 * q, q, 2, 'bb_drum_bs'));
  };

  const legacySimple = () => {
    addDrumPatternA(measure, barLen, tex);
  };

  try {
    if (!useV) {
      if (!ensembleHit) {
        legacySimple();
      } else {
        legacyFullEnsemble();
      }
      return;
    }

    if (effectiveEnsembleHit) {
      legacyFullEnsemble();
      return;
    }

    if (transitionFill) {
      addDrumTransitionFill(measure, barLen, policy, tex);
      return;
    }

    if (phase === 'intro' || phase === 'ending') {
      addEvent(measure, createNote(cymbalMidiFromTexture(tex, 0), 0, q, 1));
      addEvent(measure, createRest(q, q, 1));
      addEvent(measure, createNote(cymbalMidiFromTexture(tex, 2), 2 * q, q, 1));
      addEvent(measure, createRest(3 * q, q, 1));
      addEvent(measure, createNote(DRUM_BD, 0, q, 2));
      addEvent(measure, createRest(q, q, 2));
      addEvent(measure, createNote(DRUM_BD, 2 * q, q, 2));
      addEvent(measure, createRest(3 * q, q, 2));
      return;
    }

    if (phase === 'shout_chorus' || st === 'shout') {
      addDrumPatternB(measure, barLen, tex);
      return;
    }

    switch (feelUse) {
      case 'A':
        addDrumPatternA(measure, barLen, tex);
        break;
      case 'B':
        addDrumPatternB(measure, barLen, tex);
        break;
      case 'C':
        addDrumPatternC(measure, barLen, tex);
        break;
      default:
        addDrumPatternA(measure, barLen, tex);
    }
  } finally {
    finalizeBigBandDrumVelocities(measure, policy);
  }
}

const USE_CHORD_QUALITY_VOICING_BB = true;

/** Big Band upright bass written pitches (GM 32); walking lines must stay in bass register (≈E1–G3). */
const BB_UPRIGHT_BASS_MIDI_MIN = 28;
const BB_UPRIGHT_BASS_MIDI_MAX = 55;

/** Minor / diminished surface matcher (exclude maj-bearing symbols via `maj` guard in caller). */
const BB_MINOR_DIM_CHORD_RE = /m|min|dim|ø|°/;

function pitchesForBigBandBar(rootPc: number, sym: string): [number, number, number, number, number, number] {
  const r = rootPc;
  let saxThirdOff = 4;
  let trpSeventhOff = 11;
  if (USE_CHORD_QUALITY_VOICING_BB) {
    const hasMajQuality = /maj|Δ|ma7/i.test(sym);
    const minorOrDim = BB_MINOR_DIM_CHORD_RE.test(sym) && !hasMajQuality;
    if (minorOrDim) {
      saxThirdOff = 3;
    }
    if (
      !hasMajQuality &&
      !minorOrDim &&
      /(?:[a-g][#b]?(?:7|9|11|13)\b|7alt|7sus|7b9|7#9|7#11|7b13)/i.test(sym.trim())
    ) {
      trpSeventhOff = 10;
    }
  }
  const sax = snapMidiToRange(55 + r + saxThirdOff, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  const trp = snapMidiToRange(60 + r + trpSeventhOff, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
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
    const stack = pitchesForBigBandBar(rpc, sym);
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
  /** Optional planning handoff (e.g. from `runBigBandMode`); behaviour slices live on {@link enhancedPlanning}. */
  orchestrationPlan?: OrchestrationPlan;
  /** When set, per-slice behaviour such as `spaceEmphasis` can shape wind rhythm (see `USE_SPACE_EMPHASIS`). */
  enhancedPlanning?: BigBandEnhancedPlanning;
  /** When set (from Generate request), biases Slonimsky ensemble catalogue via `SLONIMSKY_STYLE_PROFILE_MAP`. */
  songwriterStyleId?: string;
  /** Z10 — mutable sink for Slonimsky cell selection receipts (merged to generation metadata upstream). */
  slonimskyEnsembleCellReceipts?: string[];
  /** User Chromatic Strength cap — `Math.min` with profile allowance in Slonimsky contexts. */
  allowedOutsideOverride?: 0 | 1 | 2;
  /** Optional per-bar meter — drives measure span and rhythmic scaling (defaults to 4 quarter-note beats). */
  barMeterMap?: BarMeterMap;
  /** Drum playback intensity (`GenerateRequest.drumIntensity`). Default `standard`. */
  drumIntensity?: DrumIntensity;
  sectionIntensityOverrides?: Partial<Record<BigBandFormPhase, DrumIntensity>>;
  figureResponse?: FigureResponseLevel;
  feelMode?: 'in2' | 'in4';
  drumArticulation?: DrumArticulationMode;
  /** Per-bar drum stick/brush profile (shout chorus sticks override, etc.). */
  drumArticulationBarOverrides?: Partial<Record<number, DrumArticulationMode>>;
  /** Skip built-in bars 17–24 sax soli window (Orbit and similar). */
  suppressDesignatedSaxSoli?: boolean;
  /**
   * Orbit BB — `orbit_v2` pacing / bloom; `orbit_v3_melody_authority` adds locked lead + defer backgrounds.
   */
  bigBandArrangementProfile?:
    | 'default'
    | 'orbit_v2'
    | 'orbit_v3_melody_authority'
    | 'orbit_v4_64'
    | 'orbit_v5_64'
    | 'orbit_v6_64'
    | 'orbit_steely_v1_64'
    | 'orbit_steely_v1_1_64'
    | 'orbit_steely_v1_2_64'
    | 'orbit_steely_v1_3_64'
    | 'orbit_steely_v1_4_64'
    | 'orbit_steely_v1_5_64'
    | 'orbit_steely_v1_7_64';
  /** 1-based bar → drum tier (overrides phase/slice for that measure only). */
  barDrumIntensityOverrides?: Partial<Record<number, DrumIntensity>>;
  /** Imported lead (`runBigBandRealisation` handoff) — alto melody lock when profile is `orbit_v3_melody_authority`. */
  leadSheetMelodyLock?: LeadSheet;
}

function addWindOrBassNotes(
  measure: MeasureModel,
  pitch: number,
  useHalfHalf: boolean,
  barLenBeats: number,
  velocity?: number
): void {
  if (useHalfHalf) {
    const h = barLenBeats / 2;
    addEvent(measure, createNote(pitch, 0, h, 1, undefined, undefined, velocity));
    addEvent(measure, createNote(pitch, h, h, 1, undefined, undefined, velocity));
  } else {
    addEvent(measure, createNote(pitch, 0, barLenBeats, 1, undefined, undefined, velocity));
  }
}

/** Trombone metric displacement (Frank Zappa BB): downbeat rest then sustained tail. */
function addTromboneZappaDisplacementWind(
  measure: MeasureModel,
  pitch: number,
  barLenBeats: number
): void {
  const shift = (barLenBeats / 4) * 0.5;
  addEvent(measure, createRest(0, shift, 1));
  addEvent(measure, createNote(pitch, shift, barLenBeats - shift, 1));
}

function addPunchPattern(
  measure: MeasureModel,
  pitch: number,
  beats: number[],
  voice: number,
  barLenBeats: number,
  velocity?: number
): void {
  if (beats.length === 0) {
    addEvent(measure, createRest(0, barLenBeats, voice));
    return;
  }
  const scale = barLenBeats / 4;
  const ordered = [...beats].sort((a, b) => a - b).map((x) => x * scale);
  let cursor = 0;
  for (const b of ordered) {
    if (b > cursor) addEvent(measure, createRest(cursor, b - cursor, voice));
    addEvent(measure, createNote(pitch, b, 0.5 * scale, voice, undefined, undefined, velocity));
    cursor = b + 0.5 * scale;
  }
  if (cursor < barLenBeats) addEvent(measure, createRest(cursor, barLenBeats - cursor, voice));
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

function wrapBeatInBar(beat: number, span = 4): number {
  let x = beat;
  while (x >= span) x -= span;
  while (x < 0) x += span;
  return x;
}

/** Nudge comp hits off brass punch beats (same grid as {@link addPunchPattern}). */
function nudgePianoHitsOffBrass(
  hits: number[],
  brassBeats: readonly number[],
  spanBeats: number
): number[] {
  const step = spanBeats / 4;
  return hits.map((hb) => {
    let h = hb;
    for (let iter = 0; iter < 8; iter++) {
      const clash = brassBeats.some((bb) => Math.abs(bb * step - h) < 0.45 * step);
      if (!clash) break;
      h = wrapBeatInBar(h + 0.5 * step, spanBeats);
    }
    return h;
  });
}

function addBigBandWalkingBass(
  measure: MeasureModel,
  rootWalk: number,
  fifthWalk: number,
  effectiveBeats: number,
  feelMode: 'in2' | 'in4' | undefined,
  barNotes: ScoredNote[]
): void {
  const fm = feelMode ?? 'in4';
  if (effectiveBeats === 4) {
    if (fm === 'in2') {
      const half = 2;
      addEvent(measure, createNote(rootWalk, 0, half, 1));
      addEvent(measure, createNote(fifthWalk, half, half, 1));
      barNotes.push(
        { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: half },
        { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: half }
      );
      return;
    }
    const q = 1;
    addEvent(measure, createNote(rootWalk, 0, q, 1));
    addEvent(measure, createNote(fifthWalk, q, q, 1));
    addEvent(measure, createNote(rootWalk, 2 * q, q, 1));
    addEvent(measure, createNote(fifthWalk, 3 * q, q, 1));
    barNotes.push(
      { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: q },
      { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: q },
      { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: q },
      { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: q }
    );
    return;
  }
  if (effectiveBeats === 3) {
    if (fm === 'in2') {
      addEvent(measure, createNote(rootWalk, 0, 3, 1));
      barNotes.push({ partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: 3 });
      return;
    }
    addEvent(measure, createNote(rootWalk, 0, 1, 1));
    addEvent(measure, createNote(fifthWalk, 1, 1, 1));
    addEvent(measure, createNote(rootWalk, 2, 1, 1));
    barNotes.push(
      { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: 1 },
      { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: 1 },
      { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: 1 }
    );
    return;
  }
  const qBass = effectiveBeats / 4;
  addEvent(measure, createNote(rootWalk, 0, qBass, 1));
  addEvent(measure, createNote(fifthWalk, qBass, qBass, 1));
  addEvent(measure, createNote(rootWalk, 2 * qBass, qBass, 1));
  addEvent(measure, createNote(fifthWalk, 3 * qBass, qBass, 1));
  barNotes.push(
    { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: qBass },
    { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: qBass },
    { partId: BB_PART_RHYTHM, midi: rootWalk, durationBeats: qBass },
    { partId: BB_PART_RHYTHM, midi: fifthWalk, durationBeats: qBass }
  );
}

export function buildBigBandScoreModel(input: BuildBigBandScoreModelInput): ScoreModel {
  const USE_BASS_WALK = true;
  const USE_BRASS_SAX_SPLIT = true;
  const USE_DRUM_VARIATION = true;
  const USE_PIANO_COMP = true;
  const USE_SLONIMSKY_BB = true;
  const USE_SPACE_EMPHASIS = true;
  const USE_SHOUT_REGISTER_LIFT = true;
  const {
    title,
    seed,
    formPlan,
    sectionPlan,
    chordBars,
    era,
    padSketch,
    wybleVoiceLayout,
    enhancedPlanning,
    songwriterStyleId,
    allowedOutsideOverride,
    barMeterMap,
    drumIntensity = 'standard',
    sectionIntensityOverrides,
    feelMode,
    drumArticulation,
    drumArticulationBarOverrides,
    suppressDesignatedSaxSoli = false,
    barDrumIntensityOverrides,
    bigBandArrangementProfile,
    leadSheetMelodyLock,
  } = input;
  const totalBars = formPlan.totalBars;
  const orbitOrchestration =
    bigBandArrangementProfile === 'orbit_v2' ||
    bigBandArrangementProfile === 'orbit_v3_melody_authority' ||
    bigBandArrangementProfile === 'orbit_v4_64' ||
    bigBandArrangementProfile === 'orbit_v5_64' ||
    bigBandArrangementProfile === 'orbit_v6_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_3_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_4_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_5_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_7_64';
  const orbitV464 = bigBandArrangementProfile === 'orbit_v4_64';
  const orbitV564 = bigBandArrangementProfile === 'orbit_v5_64';
  const orbitV664 =
    bigBandArrangementProfile === 'orbit_v6_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_3_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_4_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_5_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_7_64';
  const orbitLeadLocked =
    bigBandArrangementProfile === 'orbit_v3_melody_authority' ||
    bigBandArrangementProfile === 'orbit_v4_64' ||
    bigBandArrangementProfile === 'orbit_v5_64' ||
    bigBandArrangementProfile === 'orbit_v6_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_3_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_4_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_5_64' ||
    bigBandArrangementProfile === 'orbit_steely_v1_7_64';
  const zappaBbActive = songwriterStyleId?.trim().toLowerCase() === 'frank_zappa';

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
  const brassPunchesRaw = generateBrassPunches(chordSequence, [0, 2]);
  const shoutFragmentRaw = generateShoutChorus(chordSequence);
  const figMaps = applyFigureResponseToPunchMaps(brassPunchesRaw, shoutFragmentRaw, totalBars, {
    figureResponse: input.figureResponse,
    seed,
  });
  const brassPunches = figMaps.brass;
  const shoutFragment = figMaps.shout;
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    if (!sl) return undefined;
    return BIG_BAND_REHEARSAL_MARK_DISPLAY[sl.phase];
  };

  const sliceStartBarSet = new Set(formPlan.slices.map((s) => s.startBar));

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
  /** Rolling 3-bar tenor inner-line windows for {@link applySlonimskyToMelodyLine} (needs ≥3 notes). */
  const slonimskyTenorAcc: number[] = [];

  for (let bar = 1; bar <= totalBars; bar++) {
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const secSlice = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
    const sectionTag = bigBandPhaseToSectionTag(slice?.phase);

    const effectiveBeats = barMeterMap ? resolveMeasureBeatSpanQuarters(bar, barMeterMap) : 4;
    for (const part of parts) {
      part.measures[bar - 1]!.measureBeatSpanQuarters = effectiveBeats;
    }

    let spaceEmphasisThisBar = false;
    if (USE_SPACE_EMPHASIS && slice && enhancedPlanning?.behaviourSlices?.length) {
      const beh = enhancedPlanning.behaviourSlices.find((b) => b.formSliceIndex === slice.index);
      spaceEmphasisThisBar = beh?.spaceEmphasis === true;
    }

    const needRhythmSplit = !padSketch && wholeTracker.highWholeStreakAtEnd() >= 3;
    const splitWindSlot = (bar + seed) % 4;

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const stack = pitchesForBigBandBar(rpc, sym);
    let altoMidi = stack[0];
    let tenorMidi = stack[1];
    let trumpetMidi = stack[2];
    let boneMidi = stack[3];
    const bassMidi = stack[5];
    const bassMidiEff = orbitOrchestration ? orbitBbV2BassAnchor(bar, bassMidi) : bassMidi;

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

    if (orbitOrchestration) {
      trumpetMidi = orbitBbV2BloomAdjustPitch(bar, 2, trumpetMidi);
      boneMidi = orbitBbV2BloomAdjustPitch(bar, 3, boneMidi);
    }

    let melodyPitchAlto = altoMidi;
    if (
      USE_SLONIMSKY_BB &&
      !orbitOrchestration &&
      (suppressDesignatedSaxSoli || !inDesignatedSaxSoliWindow(bar, totalBars))
    ) {
      slonimskyAltoAcc.push(altoMidi);
      if (slonimskyAltoAcc.length > 3) slonimskyAltoAcc.shift();
      if (slonimskyAltoAcc.length === 3) {
        const ctx = buildBigBandSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: songwriterStyleId,
          ...(allowedOutsideOverride !== undefined ? { allowedOutsideOverride } : {}),
          styleProfile: songwriterStyleId ?? null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][0]!,
          effectiveHigh: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][1]!,
          catalogueSection: zappaBbActive ? 'tritone_progression' : 'intervallic_mirror_permutations',
          transpositionInterval: bar % 12,
          totalQuarterBeats: effectiveBeats,
        });
        pushEnsembleSlonimskyCellReceipt(input.slonimskyEnsembleCellReceipts, 'bb', bar, ctx, seed);
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

    if (orbitOrchestration && !orbitLeadLocked && [8, 14, 19].includes(bar)) {
      melodyPitchAlto = snapMidiToRange(
        melodyPitchAlto - 4,
        ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]
      );
    }

    let melodyPitchTenor = tenorMidi;
    if (
      USE_SLONIMSKY_BB &&
      !orbitOrchestration &&
      (suppressDesignatedSaxSoli || !inDesignatedSaxSoliWindow(bar, totalBars))
    ) {
      slonimskyTenorAcc.push(tenorMidi);
      if (slonimskyTenorAcc.length > 3) slonimskyTenorAcc.shift();
      if (slonimskyTenorAcc.length === 3) {
        const ctx = buildBigBandSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: songwriterStyleId,
          ...(allowedOutsideOverride !== undefined ? { allowedOutsideOverride } : {}),
          totalQuarterBeats: effectiveBeats,
          styleProfile: songwriterStyleId ?? null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][0]!,
          effectiveHigh: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES][1]!,
          catalogueSection: 'tritone_progression',
        });
        pushEnsembleSlonimskyCellReceipt(input.slonimskyEnsembleCellReceipts, 'bb', bar, ctx, seed);
        const mel: SlonimskyNote[] = slonimskyTenorAcc.map((m, i) => ({
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
          melodyPitchTenor = snapMidiToRange(pickMidi, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
        }
      }
    }

    if (orbitOrchestration && !orbitLeadLocked && bar >= 21 && bar <= 28) {
      melodyPitchTenor = snapMidiToRange(
        melodyPitchTenor - 6,
        ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]
      );
    }

    const hornIn: HornCloningBarInput = {
      altoMidi,
      tenorMidi,
      trumpetMidi,
      sectionTag,
    };
    hornStreak = advanceHornCloneStreaks(hornStreak, hornIn);

    let brassBeatsThisBar = orbitOrchestration
      ? orbitBbV2MergeBrassBeats(bar, brassPunches.get(bar))
      : brassPunches.get(bar);
    if (orbitLeadLocked && leadSheetMelodyLock) {
      const prot = leadAttacksDownbeat(leadSheetMelodyLock, bar);
      brassBeatsThisBar = orbitV3MelodyProtectBrassBeats(brassBeatsThisBar, prot);
    }
    const shoutBeatsRaw = shoutFragment.get(bar);
    const shoutBeatsThisBar =
      orbitLeadLocked && leadSheetMelodyLock
        ? orbitV3MelodyProtectBrassBeats(shoutBeatsRaw, leadAttacksDownbeat(leadSheetMelodyLock, bar))
        : shoutBeatsRaw;
    const hasBrassHitWindow =
      (brassBeatsThisBar?.length ?? 0) > 0 || (shoutBeatsThisBar?.length ?? 0) > 0;

    const barNotes: ScoredNote[] = [];

    for (let idx = 0; idx < BB_PART_IDS.length; idx++) {
      const partId = BB_PART_IDS[idx];
      const m = parts[idx]!.measures[bar - 1]!;

      if (partId === 'bb_drums') {
        const secSliceDr = slice ? sectionPlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
        const roleDr = secSliceDr?.rolesBySection['rhythm_section'];
        if (roleDr === 'silence') {
          addEvent(m, createRest(0, effectiveBeats, 1));
          addEvent(m, createRest(0, effectiveBeats, 2));
        } else {
          const ensembleHitBar =
            (brassBeatsThisBar?.length ?? 0) > 0 || (shoutBeatsThisBar?.length ?? 0) > 0;
          const transitionFill =
            (bar < totalBars &&
              sliceStartBarSet.has(bar + 1) &&
              !sliceStartBarSet.has(bar)) ||
            (orbitOrchestration && orbitBbV2ForceDrumTransition(bar));
          addBigBandDrumPattern(m, {
            ensembleHit: ensembleHitBar,
            sectionTag,
            formPhase: slice?.phase,
            useDrumVariation: USE_DRUM_VARIATION,
            barBeats: effectiveBeats,
            transitionFill,
            drumFeelClass: bigBandDrumFeelClass(slice?.phase, slice?.index ?? 0),
            drumIntensity: resolveBigBandDrumIntensityForBar(
              drumIntensity,
              slice?.phase,
              sectionIntensityOverrides,
              barDrumIntensityOverrides,
              bar
            ),
            drumArticulation:
              drumArticulationBarOverrides?.[bar] ?? drumArticulation,
            feelMode,
            seed,
            barIndex: bar,
          });
        }
        continue;
      }
      if (partId === 'bb_piano') {
        if (
          !USE_PIANO_COMP ||
          sectionTag === 'shout' ||
          sectionTag === 'solo' ||
          !suppressDesignatedSaxSoli && inDesignatedSaxSoliWindow(bar, totalBars)
        ) {
          addEvent(m, createRest(0, effectiveBeats));
          continue;
        }

        if (orbitOrchestration && orbitBbV2PianoDropout(bar)) {
          addEvent(m, createRest(0, effectiveBeats));
          continue;
        }

        const pianoMidi = stack[4]!;
        const brassHitBeats = brassBeatsThisBar ?? [];
        const { third: tHs, seventh: sHs } = pianoShellHalfStepsFromSymbol(sym);
        const rootM = clampPianoMidi(pianoMidi);
        const shell: number[] = [
          rootM,
          clampPianoMidi(pianoMidi + tHs),
          clampPianoMidi(pianoMidi + sHs),
          ...(orbitOrchestration && bar >= 21 && bar <= 28 ? [clampPianoMidi(rootM - 12)] : []),
        ];

        const rotateForwardOneBeat = (bar + seed) % 3 === 0;
        const rot = rotateForwardOneBeat ? 1 : 0;
        const beatScale = effectiveBeats / 4;
        const rotHit = (b: number) => wrapBeatInBar((b + rot) * beatScale, effectiveBeats);

        const figResp = input.figureResponse ?? 'medium';
        let hitBeats: number[];
        if (orbitOrchestration) {
          if (sectionTag === 'melody') {
            hitBeats = [0].map(rotHit);
          } else if (bar >= 21 && bar <= 28) {
            hitBeats = [0, 1.5].map(rotHit).filter((x) => x < effectiveBeats);
          } else {
            hitBeats = [0, 2].map(rotHit).filter((x) => x < effectiveBeats);
          }
        } else if (figResp === 'low' && sectionTag === 'melody') {
          hitBeats = [0].map(rotHit);
        } else if (sectionTag === 'melody') {
          hitBeats = [0, 1.5, 3].map(rotHit);
        } else {
          hitBeats = [0, 2.5].map(rotHit);
        }
        if (orbitLeadLocked && leadSheetMelodyLock) {
          const nMel = orbitMelodyEventsForBar(leadSheetMelodyLock, bar).length;
          if (nMel >= 3) {
            hitBeats = [effectiveBeats / 2].map(rotHit);
          } else if (nMel >= 1) {
            hitBeats = [Math.min(1.5, effectiveBeats / 2)].map(rotHit);
          }
        }
        hitBeats = nudgePianoHitsOffBrass(hitBeats, brassHitBeats, effectiveBeats);

        if (needRhythmSplit) {
          addEvent(m, createNote(rootM, 0, effectiveBeats, 1));
        }
        const compDur = 0.5 * beatScale;
        const orderedHits = [...hitBeats].sort((a, b) => a - b);
        let compCursor = 0;
        for (const hb of orderedHits) {
          if (hb > compCursor) {
            addEvent(m, createRest(compCursor, hb - compCursor, 2));
          }
          addEvent(m, createNote(rootM, hb, compDur, 2, undefined, shell));
          compCursor = hb + compDur;
        }
        if (compCursor < effectiveBeats) {
          addEvent(m, createRest(compCursor, effectiveBeats - compCursor, 2));
        }
        continue;
      }

      const inst = BB_ORDER[idx];
      const role = secSlice?.rolesBySection[inst];
      const designatedSaxSoli =
        !suppressDesignatedSaxSoli && inDesignatedSaxSoliWindow(bar, totalBars);

      // Deterministic sax soli (bars 17–24): ignore section-plan silence for saxes; brass tacet.
      if (designatedSaxSoli && idx <= 3) {
        if (idx === 0 || idx === 1) {
          const pid = BB_PART_IDS[idx];
          if (zappaBbActive) {
            const qScale = effectiveBeats / 4;
            const beatStarts = [0, 1, 2.5, 3].map((x) => x * qScale);
            const tet = [0, 1, 3, 7];
            const anchor = snapMidiToRange(59 + rpc, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
            const altoLine = tet.map((s) => snapMidiToRange(anchor + s, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]));
            const tenorLine = [...tet]
              .reverse()
              .map((s) => snapMidiToRange(anchor + s - 3, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]));
            const seq = idx === 0 ? altoLine : tenorLine;
            /** Four attack points on a 4/4 grid; each note sustains to the next attack (or bar end) so voice 1 sums to `effectiveBeats`. */
            for (let ki = 0; ki < 4; ki++) {
              const st = beatStarts[ki]!;
              const end = ki < 3 ? beatStarts[ki + 1]! : effectiveBeats;
              const dur = Math.max(1 / 64, end - st);
              addEvent(m, createNote(seq[ki]!, st, dur, 1));
              barNotes.push({ partId: pid, midi: seq[ki]!, durationBeats: dur });
            }
          } else {
            const soliPattern = saxSoli.get(bar) ?? { leadOffsetSemitones: 0 };
            const lead = snapMidiToRange(
              altoMidi + soliPattern.leadOffsetSemitones,
              ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]
            );
            const pitch = idx === 0 ? lead : snapMidiToRange(lead - 3, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
            const half = effectiveBeats / 2;
            addEvent(m, createNote(pitch, 0, half, 1));
            addEvent(m, createNote(pitch, half, half, 1));
            barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
            barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
          }
          continue;
        }
        if (idx === 2 || idx === 3) {
          addEvent(m, createRest(0, effectiveBeats));
          continue;
        }
      }

      if (role === 'silence') {
        addEvent(m, createRest(0, effectiveBeats));
        continue;
      }

      const splitHere = needRhythmSplit && idx === splitWindSlot && idx >= 0 && idx <= 3;
      let useHalfHalfWind =
        (USE_SPACE_EMPHASIS && spaceEmphasisThisBar) || splitHere;
      if (orbitOrchestration && idx >= 0 && idx <= 3 && orbitBbV2PreferWholeBarSustain(bar, idx)) {
        useHalfHalfWind = false;
      }

      if (idx === 0 || idx === 1 || idx === 2 || idx === 3) {
        if (orbitOrchestration) {
          const melodyProtectSax =
            orbitLeadLocked &&
            leadSheetMelodyLock &&
            leadBarHasPitchedNotes(leadSheetMelodyLock, bar) &&
            (idx === 0 || idx === 1);
          if (orbitBbV2WindDropout(bar, idx) && !melodyProtectSax) {
            addEvent(m, createRest(0, effectiveBeats));
            continue;
          }
          if (idx >= 2 && orbitBbV2BrassTacet(bar)) {
            addEvent(m, createRest(0, effectiveBeats));
            continue;
          }
          if (idx <= 1 && orbitBbV2SaxTacet(bar) && !melodyProtectSax) {
            addEvent(m, createRest(0, effectiveBeats));
            continue;
          }
        }

        const vWind = orbitOrchestration
          ? orbitBbV2WindVelocity(bar, idx as 0 | 1 | 2 | 3)
          : undefined;

        const pid = BB_PART_IDS[idx];

        if (
          orbitLeadLocked &&
          leadSheetMelodyLock &&
          idx === 0 &&
          !((orbitV464 || orbitV564 || orbitV664) && bar <= 4)
        ) {
          const barLead = orbitMelodyEventsForBar(leadSheetMelodyLock, bar);
          if (barLead.length > 0) {
            addLockedLeadAltoMeasure(m, barLead, effectiveBeats, orbitV3AltoLeadVelocity(bar));
            for (const ev of barLead) {
              barNotes.push({ partId: pid, midi: ev.midi, durationBeats: ev.durationBeats });
            }
            continue;
          }
          addEvent(m, createRest(0, effectiveBeats));
          continue;
        }

        if (
          orbitLeadLocked &&
          leadSheetMelodyLock &&
          idx === 1 &&
          !((orbitV464 || orbitV564 || orbitV664) && bar <= 4)
        ) {
          const barLead = orbitMelodyEventsForBar(leadSheetMelodyLock, bar);
          if (barLead.length > 0) {
            const leadMin = Math.min(...barLead.map((e) => e.midi));
            let pad = Math.min(tenorMidi, leadMin - 5);
            pad = snapMidiToRange(pad, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
            addWindOrBassNotes(m, pad, false, effectiveBeats, orbitV3TenorPadVelocity(bar));
            barNotes.push({ partId: pid, midi: pad, durationBeats: effectiveBeats });
            continue;
          }
          addEvent(m, createRest(0, effectiveBeats));
          continue;
        }

        let pitch =
          idx === 0 ? melodyPitchAlto : idx === 1 ? melodyPitchTenor : idx === 2 ? trumpetMidi : boneMidi;
        if (
          USE_SHOUT_REGISTER_LIFT &&
          idx === 2 &&
          sectionTag === 'shout' &&
          !(shoutBeatsThisBar && shoutBeatsThisBar.length > 0)
        ) {
          pitch = snapMidiToRange(pitch + 5, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
        }
        if ((idx === 2 || idx === 3) && shoutBeatsThisBar && shoutBeatsThisBar.length > 0) {
          /** V2: trumpet lift biased by bars 1–8 head theme average (deterministic). */
          const shoutLift =
            idx === 2 ? 5 + indexMod(themeAvg + seed, 5) - 2 : 0;
          const shoutPitch =
            idx === 2 ? snapMidiToRange(pitch + shoutLift, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]) : pitch;
          addPunchPattern(m, shoutPitch, shoutBeatsThisBar, 1, effectiveBeats, vWind);
          for (const _ of shoutBeatsThisBar) barNotes.push({ partId: pid, midi: shoutPitch, durationBeats: 0.5 });
          continue;
        }
        if ((idx === 2 || idx === 3) && brassBeatsThisBar && brassBeatsThisBar.length > 0) {
          // V1 brass punches on cadential bars.
          addPunchPattern(m, pitch, brassBeatsThisBar, 1, effectiveBeats, vWind);
          for (const _ of brassBeatsThisBar) barNotes.push({ partId: pid, midi: pitch, durationBeats: 0.5 });
          continue;
        }

        if (idx === 2 && zappaBbActive && !hasBrassHitWindow) {
          pitch = snapMidiToRange(pitch + 6, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
        }

        const brassSaxSoloTexture =
          USE_BRASS_SAX_SPLIT &&
          (sectionTag === 'solo' || sectionTag === 'melody') &&
          !(brassBeatsThisBar && brassBeatsThisBar.length > 0) &&
          !(shoutBeatsThisBar && shoutBeatsThisBar.length > 0);
        if (brassSaxSoloTexture) {
          const half = effectiveBeats / 2;
          if (idx === 0 || idx === 1) {
            const hh = USE_SPACE_EMPHASIS && spaceEmphasisThisBar;
            if (hh) {
              barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
              barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
            } else {
              barNotes.push({ partId: pid, midi: pitch, durationBeats: effectiveBeats });
            }
            addWindOrBassNotes(m, pitch, hh, effectiveBeats, vWind);
          } else {
            barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
            barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
            addWindOrBassNotes(m, pitch, true, effectiveBeats, vWind);
          }
          continue;
        }

        if (idx === 3 && zappaBbActive && !hasBrassHitWindow) {
          addTromboneZappaDisplacementWind(m, pitch, effectiveBeats);
          barNotes.push({ partId: pid, midi: pitch, durationBeats: effectiveBeats - (effectiveBeats / 4) * 0.5 });
          continue;
        }

        if (useHalfHalfWind) {
          barNotes.push({ partId: pid, midi: pitch, durationBeats: effectiveBeats / 2 });
          barNotes.push({ partId: pid, midi: pitch, durationBeats: effectiveBeats / 2 });
        } else {
          barNotes.push({ partId: pid, midi: pitch, durationBeats: effectiveBeats });
        }
        addWindOrBassNotes(m, pitch, useHalfHalfWind, effectiveBeats, vWind);
        continue;
      }
      /** Upright bass (`bb_rhythm_section`) — root/fifth from stacked bass anchor (no +12 “lead bass” lift). */
      const rootWalk = snapMidiToRange(bassMidiEff, BB_UPRIGHT_BASS_MIDI_MIN, BB_UPRIGHT_BASS_MIDI_MAX);
      const fifthWalk = snapMidiToRange(
        bassMidiEff + 7,
        BB_UPRIGHT_BASS_MIDI_MIN,
        BB_UPRIGHT_BASS_MIDI_MAX
      );
      if (USE_BASS_WALK) {
        addBigBandWalkingBass(m, rootWalk, fifthWalk, effectiveBeats, feelMode, barNotes);
      } else {
        const pitch = snapMidiToRange(bassMidiEff, BB_UPRIGHT_BASS_MIDI_MIN, BB_UPRIGHT_BASS_MIDI_MAX);
        barNotes.push({ partId: BB_PART_RHYTHM, midi: pitch, durationBeats: effectiveBeats });
        addWindOrBassNotes(m, pitch, false, effectiveBeats);
      }
    }

    wholeTracker.pushBarSlice(
      { barIndex: bar, sectionTag, barBeats: effectiveBeats, notes: barNotes },
      padSketch ?? false
    );
  }

  const score = createScore(title, parts, { tempo: 140 });
  score.wybleConsumptionReceipt = wybleConsumptionReceiptForBigBand(wybleVoiceLayout);
  if (barMeterMap && Object.keys(barMeterMap).length > 0) {
    score.barMeterMap = barMeterMap;
  }
  if (orbitOrchestration) {
    score.measureDynamicsMarkings = orbitBbV2DynamicsMarkings();
  }
  return score;
}
