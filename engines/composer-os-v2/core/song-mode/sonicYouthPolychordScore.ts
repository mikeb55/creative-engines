/**
 * Dual-electric Sonic Youth polychord score builders (no bass / 8-bar proto).
 * Guitar 1 = AAEEAA; Guitar 2 = ACCGG♯C. Grips via solveGuitarGrip({ openStrings }).
 */

import { solveGuitarGrip } from '../guitar/voicingFeasibility';
import { classifyPitchClassSet } from '../hexatonic/setClass';
import {
  commonToneCount,
  disjointTertianSplits,
  listTertianTriads,
  minVoiceLeading,
  type TertianTriad,
} from '../hexatonic/tertianTriadUniverse';
import { scoreTymoczkoHorizontal } from '../counterpoint/voiceLeadingScorer';
import { getSYDissonancePreset } from '../score-model/sonicYouthChordTypes';
import type { Transposition } from '../instruments/instrumentTypes';
import { soundingToWritten } from '../instruments/writtenPitch';
import { canonicalPitchSet } from '../pentatonic/pitch';
import {
  defaultGceWeights,
  evaluateGce,
  GCE_CATEGORY_ORDER,
  type GceCategory,
  type GceEvaluationResult,
} from '../evaluation';
import { extractScoreModelFeatures } from '../evaluation/featureExtractor';
import { scoreArrangementAndOrchestration, scoreRhythmicIdentity } from '../gce/gceAutoScorers';
import type { MelodicNote } from '../gce/gce_melody_eval';
import { scoreModelToMelodicLine } from '../gce/scoreModelToMelodicLine';
import { applyOperator, type Motif, type OperatorId, type OperatorParams } from '../motif-ops';
import { mulberry32 } from '../remix/vaultSeedMix';
import {
  floatsAgree,
  integralTicks,
  PIANO_V11_EXPORT_PPQ,
  q,
  qAdd,
  qCmp,
  qEq,
  qToNumber,
  spellStraight,
} from '../piano/pianoExactTiming';
import {
  BEATS_PER_MEASURE,
  DIVISIONS,
  type ChordEvent,
  type ExactQuarter,
  type NoteEvent,
  type PartModel,
  type PianoExactTiming,
  type RestEvent,
  type ScoreEvent,
  type ScoreModel,
} from '../score-model/scoreModelTypes';
import {
  addEvent,
  createMeasure,
  createNote,
  createRest,
  createScore,
} from '../score-model/scoreEventBuilder';
import type { SYSixStringMidi } from '../sy-tuning/syTuningTypes';
import { QUALITY_INTERVALS, type TriadQuality } from '../wwh/wwhTriadPair';

/** Guitar lead-sheet convention: written = sounding +12; MusicXML octave-change −1. */
const GUITAR_OCTAVE_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: -1 };

/** Lee AAEEAA opens — 6→1. A2 A2 E3 E3 A3 A3. */
export const SY_PROTO_LEE_AAEEAA_OPEN: SYSixStringMidi = [45, 45, 52, 52, 57, 57];

/** Thurston ACCGG♯C opens — 6→1. A2 C3 C3 G3 G♯3 C4. */
export const SY_PROTO_ACCGGSHARP_C_OPEN: SYSixStringMidi = [45, 48, 48, 55, 56, 60];

export type SyProtoTriadQuality = TriadQuality;
export type SyProtoTriadInput = {
  rootPc: number;
  quality: SyProtoTriadQuality;
};

export type SonicYouthOneBarPolychordResult = {
  score: ScoreModel;
  guitar1Pitches: number[];
  guitar2Pitches: number[];
  guitar1OpenPitches: SYSixStringMidi;
  guitar2OpenPitches: SYSixStringMidi;
};

export type SyProtoPolychordPair = {
  guitar1: SyProtoTriadInput;
  guitar2: SyProtoTriadInput;
};

/** Declared parent triad as given on the pair (root + quality + derived PCs). */
export type SyProtoPolychordParentIdentity = {
  rootPc: number;
  quality: SyProtoTriadQuality;
  pitchClasses: readonly [number, number, number];
};

/**
 * Pure combined-polychord facts from declared parents only.
 * Forte only when |union| === 6. Splits are alternate tertian readings; order not significant.
 */
export type SyProtoCombinedPolychordAnalysis = {
  guitar1: SyProtoPolychordParentIdentity;
  guitar2: SyProtoPolychordParentIdentity;
  /** Canonical PC union of both declared parents. */
  unionPitchClasses: readonly number[];
  /** PCs present in both parents. */
  sharedPitchClasses: readonly number[];
  commonToneCount: number;
  pitchClassCount: number;
  /** Set-class label only when pitchClassCount === 6. */
  forte: string | null;
  /** All disjoint tertian splits of the union; empty when |union| ≠ 6 or none exist. */
  alternativeDisjointSplits: readonly { left: TertianTriad; right: TertianTriad }[];
};

/** Optional per-guitar opens (MIDI 6→1). Omitted → AAEEAA / ACCGG#C. */
export type SonicYouthPolychordTuningOptions = {
  guitar1Tuning?: readonly number[];
  guitar2Tuning?: readonly number[];
};

/**
 * Proto1 fretboard-position preference for triad grips.
 * `auto` / omitted → existing span/lowest (then prior min-move) behaviour.
 * Preset bands use fretted frets only (open strings always allowed).
 */
export type SyProto1FretPositionPreset = 'auto' | 'low' | 'middle' | 'high';

/** Custom inclusive fret window (0–15 typical); open strings still allowed. */
export type SyProto1FretPositionCustom = {
  mode: 'custom';
  minFret: number;
  maxFret: number;
};

export type SyProto1FretPosition = SyProto1FretPositionPreset | SyProto1FretPositionCustom;

/**
 * Proto1 repeated-attack grip voice-leading.
 * Omitted → current hybrid (prefer alternate when available, else nearest).
 * `'min-movement'` → nearest playable grip (may repeat prior).
 * `'alternate'` → different playable grip when one exists.
 */
export type SyProto1VoiceLeadingMode = 'min-movement' | 'alternate';

const SY_PROTO1_FRET_BAND: Record<
  Exclude<SyProto1FretPositionPreset, 'auto'>,
  { minFret: number; maxFret: number }
> = {
  low: { minFret: 0, maxFret: 4 },
  middle: { minFret: 5, maxFret: 9 },
  high: { minFret: 10, maxFret: 15 },
};

/** Proto1 harmonic surface: A = C/F♯m all bars; B = bar 4 G2 −1 semitone (C/Fm). */
export type SyProto1HarmonicVariant = 'A' | 'B';

/** Proto1 harmony source: fixed C/F♯m (compat) or seeded adaptive polychord plan. */
export type SyProto1HarmonyMode = 'fixed' | 'adaptive';

/**
 * User melodic rhythm slot — timing only (pianoExact onsetQ/durationQ).
 * Pitches are generated into `note` slots; rests stay silent.
 */
export type SyProto1MelodicRhythmSlot = {
  kind: 'note' | 'rest';
  onsetQ: ExactQuarter;
  durationQ: ExactQuarter;
};

/**
 * Optional independent G1/G2 per-bar rhythm slots.
 * Omitted guitar → existing seeded / verified rhythm for that guitar.
 * Empty bar list entry → idle (no melodic voice), same as legacy empty bars.
 */
export type SyProto1MelodicRhythmSlots = {
  guitar1?: readonly (readonly SyProto1MelodicRhythmSlot[])[];
  guitar2?: readonly (readonly SyProto1MelodicRhythmSlot[])[];
};

/**
 * Chord-grip rhythm slot — same timing shape as melodic slots.
 * `note` → triad ChordEvent attack; `rest` → silent rest in the chord voice.
 */
export type SyProto1ChordRhythmSlot = SyProto1MelodicRhythmSlot;

/**
 * Optional independent G1/G2 per-bar chord-grip rhythms.
 * Omitted guitar → legacy whole-note triad for that guitar.
 * Empty bar list entry → keep legacy whole-note triad for that bar.
 */
export type SyProto1ChordRhythmSlots = {
  guitar1?: readonly (readonly SyProto1ChordRhythmSlot[])[];
  guitar2?: readonly (readonly SyProto1ChordRhythmSlot[])[];
};

/**
 * Proto 1 dialogue options. Tuning fields match polychord builders.
 * `seed` omitted → verified fixed motif + invert-in-field answer.
 * `harmonicVariant` omitted or `'A'` → verified Proto 1 harmony; `'B'` → bar-4 G2 transform (fixed mode only).
 * `harmonyMode` omitted or `'fixed'` → verified C/F♯m × 4; `'adaptive'` → {@link planSyProto1PolychordBars}.
 * Optional `polychordBars` → exact user-selected pairs (roots/qualities) per bar; overrides planner / fixed defaults.
 * Optional `melodicRhythmSlots` → user G1/G2 note/rest timing; pitches fill note slots without altering timing.
 * Optional `chordRhythmSlots` → user G1/G2 chord-grip note/rest timing; omit → whole-note grips.
 * Optional `guitar1FretPosition` / `guitar2FretPosition` → filter grips by fretted fret band; omit/`auto` → legacy.
 * Optional `guitar1VoiceLeading` / `guitar2VoiceLeading` → repeated-attack grip policy; omit → hybrid.
 */
export type SonicYouthProto1MelodicDialogueOptions = SonicYouthPolychordTuningOptions & {
  /** Deterministic G1 motif + G2 answer variation via motif-ops. */
  seed?: number;
  /** Harmonic A/B. Default `'A'` (unchanged C/F♯m). Research-only; ignored when `harmonyMode: 'adaptive'` or user `polychordBars`. */
  harmonicVariant?: SyProto1HarmonicVariant;
  /** Default `'fixed'`. Adaptive uses seeded polychord planner + per-bar field mapping. */
  harmonyMode?: SyProto1HarmonyMode;
  /** Adaptive bar count (default 8). Ignored in fixed mode (always 4) and when `polychordBars` is supplied. */
  barCount?: number;
  /**
   * Optional user-defined dual-guitar pairs (one per bar).
   * When non-empty, exact `rootPc` + `quality` drive grips, chord symbols, and sounding notes.
   * Omitted / empty → legacy fixed or adaptive pair source.
   */
  polychordBars?: readonly SyProtoPolychordPair[];
  /**
   * Optional user melodic rhythms (independent G1/G2).
   * Non-empty bars must cover exactly {@link BEATS_PER_MEASURE} quarters; invalid durations throw (no repair).
   */
  melodicRhythmSlots?: SyProto1MelodicRhythmSlots;
  /**
   * Optional user chord-grip rhythms (independent G1/G2).
   * Non-empty bars must cover exactly {@link BEATS_PER_MEASURE} quarters; invalid durations throw (no repair).
   */
  chordRhythmSlots?: SyProto1ChordRhythmSlots;
  /** Guitar 1 fretboard band for triad grips. Omitted / `'auto'` → existing grip selection. */
  guitar1FretPosition?: SyProto1FretPosition;
  /** Guitar 2 fretboard band for triad grips. Omitted / `'auto'` → existing grip selection. */
  guitar2FretPosition?: SyProto1FretPosition;
  /** Guitar 1 repeated-attack voice-leading. Omitted → hybrid (alternate when possible + min motion). */
  guitar1VoiceLeading?: SyProto1VoiceLeadingMode;
  /** Guitar 2 repeated-attack voice-leading. Omitted → hybrid (alternate when possible + min motion). */
  guitar2VoiceLeading?: SyProto1VoiceLeadingMode;
};

export type SonicYouthPolychordProgressionResult = {
  score: ScoreModel;
  bars: SonicYouthOneBarPolychordResult[];
  guitar1OpenPitches: SYSixStringMidi;
  guitar2OpenPitches: SYSixStringMidi;
};

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** MIDI → note+octave (e.g. 45 → A2). */
function midiToNoteOctave(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pc]!}${octave}`;
}

/** Part label from opens 6→1, e.g. "Guitar 1 (A2 A2 E3 E3 A3 A3)". */
function guitarPartNameFromOpens(
  guitarLabel: 'Guitar 1' | 'Guitar 2',
  opens: readonly number[]
): string {
  return `${guitarLabel} (${opens.map(midiToNoteOctave).join(' ')})`;
}

function chordAt(
  pitches: number[],
  startBeat: number,
  duration: number,
  voice = 1,
  chordSymbol?: string
): ChordEvent {
  return {
    kind: 'chord',
    pitches: [...pitches].sort((a, b) => a - b),
    startBeat,
    duration,
    voice,
    ...(chordSymbol !== undefined ? { chordSymbol } : {}),
  };
}

function normalizeRootPc(rootPc: number): number {
  return ((rootPc % 12) + 12) % 12;
}

/** MusicXML-compatible lead-sheet token: major bare, minor m, diminished dim, augmented aug. */
function triadChordSymbol(triad: SyProtoTriadInput): string {
  const root = PC_NAMES[normalizeRootPc(triad.rootPc)] ?? '?';
  switch (triad.quality) {
    case 'major':
      return root;
    case 'minor':
      return `${root}m`;
    case 'diminished':
      return `${root}dim`;
    case 'augmented':
      return `${root}aug`;
  }
}

function triadLabel(triad: SyProtoTriadInput): string {
  const root = PC_NAMES[normalizeRootPc(triad.rootPc)] ?? '?';
  return `${root} ${triad.quality}`;
}

function triadPitchClasses(triad: SyProtoTriadInput): [number, number, number] {
  const root = normalizeRootPc(triad.rootPc);
  const intervals = QUALITY_INTERVALS[triad.quality];
  const third = normalizeRootPc(root + intervals.third);
  const fifth = normalizeRootPc(root + intervals.fifth);
  return [root, third, fifth];
}

/**
 * Pure analysis of a declared SY polychord pair.
 * Reuses commonToneCount, classifyPitchClassSet, disjointTertianSplits; no invented chord names.
 */
export function analyzeSyProtoCombinedPolychord(pair: SyProtoPolychordPair): SyProtoCombinedPolychordAnalysis {
  const guitar1Pcs = triadPitchClasses(pair.guitar1);
  const guitar2Pcs = triadPitchClasses(pair.guitar2);
  const unionPitchClasses = canonicalPitchSet([...guitar1Pcs, ...guitar2Pcs]);
  const guitar2Set = new Set(guitar2Pcs);
  const sharedPitchClasses = canonicalPitchSet(guitar1Pcs.filter((pc) => guitar2Set.has(pc)));
  const pitchClassCount = unionPitchClasses.length;
  return {
    guitar1: {
      rootPc: normalizeRootPc(pair.guitar1.rootPc),
      quality: pair.guitar1.quality,
      pitchClasses: guitar1Pcs,
    },
    guitar2: {
      rootPc: normalizeRootPc(pair.guitar2.rootPc),
      quality: pair.guitar2.quality,
      pitchClasses: guitar2Pcs,
    },
    unionPitchClasses,
    sharedPitchClasses,
    commonToneCount: commonToneCount(guitar1Pcs, guitar2Pcs),
    pitchClassCount,
    forte: pitchClassCount === 6 ? classifyPitchClassSet(unionPitchClasses).forte : null,
    alternativeDisjointSplits: disjointTertianSplits(unionPitchClasses),
  };
}

/**
 * One bar of dual-guitar harmony facts from existing chord events only.
 * Symbols stay per-guitar (never collapsed to a slash token). No quality scores.
 */
export type SyProtoBarDualGuitarHarmony = {
  /** 1-based measure index from the score (falls back to array position + 1). */
  bar: number;
  guitar1ChordSymbol: string | null;
  guitar2ChordSymbol: string | null;
  /** Canonical PC union of Guitar 1 + Guitar 2 chord-event pitches this bar. */
  combinedPitchClasses: readonly number[];
};

function chordEventsInMeasure(
  measure: { events: readonly ScoreEvent[] } | undefined
): ChordEvent[] {
  if (!measure) return [];
  return measure.events.filter((e): e is ChordEvent => e.kind === 'chord');
}

function firstChordSymbol(events: readonly ChordEvent[]): string | null {
  for (const e of events) {
    if (e.chordSymbol === undefined) continue;
    return e.chordSymbol;
  }
  return null;
}

function pitchClassesFromChordEvents(events: readonly ChordEvent[]): number[] {
  const pcs: number[] = [];
  for (const e of events) {
    for (const midi of e.pitches) pcs.push(midi);
  }
  return canonicalPitchSet(pcs);
}

/**
 * Pure read-only helper: bar-by-bar Guitar 1 / Guitar 2 chord symbols plus
 * combined pitch-class set, taken from existing `kind: 'chord'` events.
 * Does not invent slash-chord labels, does not score quality, does not touch GCE.
 */
export function extractSyProtoDualGuitarHarmonyByBar(
  score: ScoreModel
): SyProtoBarDualGuitarHarmony[] {
  const g1 = score.parts.find((p) => p.id === 'guitar');
  const g2 = score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2) return [];

  const barCount = Math.min(g1.measures.length, g2.measures.length);
  const out: SyProtoBarDualGuitarHarmony[] = [];
  for (let i = 0; i < barCount; i++) {
    const m1 = g1.measures[i];
    const m2 = g2.measures[i];
    const c1 = chordEventsInMeasure(m1);
    const c2 = chordEventsInMeasure(m2);
    out.push({
      bar: m1?.index ?? m2?.index ?? i + 1,
      guitar1ChordSymbol: firstChordSymbol(c1),
      guitar2ChordSymbol: firstChordSymbol(c2),
      combinedPitchClasses: canonicalPitchSet([
        ...pitchClassesFromChordEvents(c1),
        ...pitchClassesFromChordEvents(c2),
      ]),
    });
  }
  return out;
}

/**
 * One bar of G1↔G2 melodic interaction (melody notes only; chord-grip events excluded).
 * Timing from ScoreModel `startBeat` / `duration` (beats → ticks via {@link DIVISIONS}).
 */
export type SyProtoBarMelodicInteraction = {
  /** 1-based measure index from the score (falls back to array position + 1). */
  bar: number;
  guitar1MelodicNoteCount: number;
  guitar2MelodicNoteCount: number;
  /** Shared melodic onset count (same start tick on both guitars). */
  simultaneousMelodicAttacks: number;
  /** Sum of pairwise melodic overlap spans, in ScoreModel ticks (`beats * DIVISIONS`). */
  overlappingMelodicDurationTicks: number;
  /** Absolute MIDI intervals (semitones) for each overlapping G1×G2 melodic note pair. */
  overlapPitchIntervalsSemitones: readonly number[];
};

type SyProtoMelodicSpan = {
  startBeat: number;
  endBeat: number;
  pitch: number;
  startTick: number;
};

/** Melodic note only — excludes sustained chord-grip `kind: 'chord'` stacks. */
function melodicNoteEventsInMeasure(
  measure: { events: readonly ScoreEvent[] } | undefined
): NoteEvent[] {
  if (!measure) return [];
  return measure.events.filter((e): e is NoteEvent => e.kind === 'note');
}

function melodicSpansFromNotes(notes: readonly NoteEvent[]): SyProtoMelodicSpan[] {
  return notes.map((n) => {
    const startBeat = n.startBeat;
    const endBeat = n.startBeat + n.duration;
    return {
      startBeat,
      endBeat,
      pitch: n.pitch,
      startTick: Math.round(startBeat * DIVISIONS),
    };
  });
}

/**
 * Pure read-only helper: per-bar G1/G2 melodic interaction from ScoreModel note timing.
 * Chord-grip events excluded. No GCE / generation / MusicXML changes.
 */
export function measureSyProtoDualGuitarMelodicInteractionByBar(
  score: ScoreModel
): SyProtoBarMelodicInteraction[] {
  const g1 = score.parts.find((p) => p.id === 'guitar');
  const g2 = score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2) return [];

  const barCount = Math.min(g1.measures.length, g2.measures.length);
  const out: SyProtoBarMelodicInteraction[] = [];
  for (let i = 0; i < barCount; i++) {
    const m1 = g1.measures[i];
    const m2 = g2.measures[i];
    const spans1 = melodicSpansFromNotes(melodicNoteEventsInMeasure(m1));
    const spans2 = melodicSpansFromNotes(melodicNoteEventsInMeasure(m2));

    const g1Onsets = new Set(spans1.map((s) => s.startTick));
    let simultaneousMelodicAttacks = 0;
    for (const s of spans2) {
      if (g1Onsets.has(s.startTick)) {
        simultaneousMelodicAttacks += 1;
        g1Onsets.delete(s.startTick);
      }
    }

    let overlappingBeats = 0;
    const overlapPitchIntervalsSemitones: number[] = [];
    for (const a of spans1) {
      for (const b of spans2) {
        const overlap = Math.min(a.endBeat, b.endBeat) - Math.max(a.startBeat, b.startBeat);
        if (overlap <= 0) continue;
        overlappingBeats += overlap;
        overlapPitchIntervalsSemitones.push(Math.abs(a.pitch - b.pitch));
      }
    }

    out.push({
      bar: m1?.index ?? m2?.index ?? i + 1,
      guitar1MelodicNoteCount: spans1.length,
      guitar2MelodicNoteCount: spans2.length,
      simultaneousMelodicAttacks,
      overlappingMelodicDurationTicks: Math.round(overlappingBeats * DIVISIONS),
      overlapPitchIntervalsSemitones,
    });
  }
  return out;
}

/** One guitar, one bar — attacks / IOIs / rhythm fingerprint (melody notes only). */
export type SyProtoGuitarBarRhythm = {
  bar: number;
  /** Attack onsets in beats within the bar (`NoteEvent.startBeat`). */
  attackBeats: readonly number[];
  /** Attack onsets in ScoreModel ticks (`beat * DIVISIONS`). */
  attackTicks: readonly number[];
  /** Successive inter-onset intervals in beats (length = attacks − 1). */
  interOnsetIntervalsBeats: readonly number[];
  /** Successive IOIs in ticks. */
  interOnsetIntervalsTicks: readonly number[];
  /** Duration sequence quantized to sixteenth units (`round(duration * 4)`). */
  durationPatternSixteenths: readonly number[];
  /** Onset grid fingerprint: quantized attack beats joined (rhythm pattern id). */
  onsetPatternId: string;
  /** Duration-grid fingerprint (rhythmic cell id). */
  durationPatternId: string;
};

export type SyProtoRhythmMotifRelationKind = 'exact_repeat' | 'retrograde' | 'rotation';

/** Repeated or transformed rhythmic motif link between two bars of one guitar. */
export type SyProtoRhythmMotifRelation = {
  kind: SyProtoRhythmMotifRelationKind;
  guitar: 'guitar1' | 'guitar2';
  fromBar: number;
  toBar: number;
  /** For `rotation` only — cyclic IOI shift amount (≥1). */
  rotationShift?: number;
};

export type SyProtoDualGuitarRhythmicAnalysis = {
  guitar1ByBar: readonly SyProtoGuitarBarRhythm[];
  guitar2ByBar: readonly SyProtoGuitarBarRhythm[];
  motifRelations: readonly SyProtoRhythmMotifRelation[];
  /** Variation of each guitar's onset patterns across the observed bars (Proto1 = 4). */
  variation: {
    barCount: number;
    guitar1UniqueOnsetPatternCount: number;
    guitar2UniqueOnsetPatternCount: number;
    guitar1OnsetPatternIds: readonly string[];
    guitar2OnsetPatternIds: readonly string[];
    /** 0 = all bars share one pattern; 1 = every bar unique (empty bars ignored in ratio denom). */
    guitar1VariationRatio: number;
    guitar2VariationRatio: number;
  };
};

function quantizeBeatSixteenth(beat: number): number {
  return Math.round(beat * 4) / 4;
}

function syProtoBarRhythmFromNotes(
  bar: number,
  notes: readonly NoteEvent[]
): SyProtoGuitarBarRhythm {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat || a.duration - b.duration);
  const attackBeats = sorted.map((n) => quantizeBeatSixteenth(n.startBeat));
  const attackTicks = attackBeats.map((b) => Math.round(b * DIVISIONS));
  const interOnsetIntervalsBeats: number[] = [];
  for (let i = 1; i < attackBeats.length; i++) {
    interOnsetIntervalsBeats.push(
      Math.round((attackBeats[i]! - attackBeats[i - 1]!) * 1000) / 1000
    );
  }
  const interOnsetIntervalsTicks = interOnsetIntervalsBeats.map((b) => Math.round(b * DIVISIONS));
  const durationPatternSixteenths = sorted.map((n) => Math.max(1, Math.round(n.duration * 4)));
  const onsetPatternId = attackBeats.length === 0 ? '∅' : attackBeats.join(',');
  const durationPatternId =
    durationPatternSixteenths.length === 0 ? '∅' : durationPatternSixteenths.join(',');
  return {
    bar,
    attackBeats,
    attackTicks,
    interOnsetIntervalsBeats,
    interOnsetIntervalsTicks,
    durationPatternSixteenths,
    onsetPatternId,
    durationPatternId,
  };
}

function ioisEqual(a: readonly number[], b: readonly number[], eps = 1e-6): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]! - b[i]!) > eps) return false;
  }
  return true;
}

function rotatedIois(iois: readonly number[], shift: number): number[] {
  if (iois.length === 0) return [];
  const n = iois.length;
  const s = ((shift % n) + n) % n;
  return [...iois.slice(s), ...iois.slice(0, s)];
}

function collectSyProtoRhythmMotifRelations(
  guitar: 'guitar1' | 'guitar2',
  bars: readonly SyProtoGuitarBarRhythm[]
): SyProtoRhythmMotifRelation[] {
  const out: SyProtoRhythmMotifRelation[] = [];
  for (let i = 0; i < bars.length; i++) {
    for (let j = i + 1; j < bars.length; j++) {
      const a = bars[i]!;
      const b = bars[j]!;
      if (a.onsetPatternId === '∅' || b.onsetPatternId === '∅') continue;

      if (a.onsetPatternId === b.onsetPatternId || a.durationPatternId === b.durationPatternId) {
        out.push({ kind: 'exact_repeat', guitar, fromBar: a.bar, toBar: b.bar });
        continue;
      }

      const aIoi = a.interOnsetIntervalsBeats;
      const bIoi = b.interOnsetIntervalsBeats;
      if (aIoi.length >= 2 && ioisEqual(aIoi, [...bIoi].reverse())) {
        out.push({ kind: 'retrograde', guitar, fromBar: a.bar, toBar: b.bar });
        continue;
      }

      if (aIoi.length >= 2 && aIoi.length === bIoi.length) {
        let foundRot = false;
        for (let shift = 1; shift < aIoi.length; shift++) {
          if (ioisEqual(rotatedIois(aIoi, shift), bIoi)) {
            out.push({
              kind: 'rotation',
              guitar,
              fromBar: a.bar,
              toBar: b.bar,
              rotationShift: shift,
            });
            foundRot = true;
            break;
          }
        }
        if (foundRot) continue;
      }
    }
  }
  return out;
}

function syProtoRhythmVariationRatio(patternIds: readonly string[]): number {
  const active = patternIds.filter((id) => id !== '∅');
  if (active.length <= 1) return 0;
  const unique = new Set(active).size;
  return (unique - 1) / (active.length - 1);
}

/**
 * Pure read-only rhythmic analysis of G1/G2 melodic events.
 * Attacks, IOIs, per-guitar patterns, repeated/transformed motifs, four-bar variation.
 * Excludes sustained chord-grip events. No GCE scoring.
 */
export function analyzeSyProtoDualGuitarRhythm(
  score: ScoreModel
): SyProtoDualGuitarRhythmicAnalysis {
  const g1 = score.parts.find((p) => p.id === 'guitar');
  const g2 = score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2) {
    return {
      guitar1ByBar: [],
      guitar2ByBar: [],
      motifRelations: [],
      variation: {
        barCount: 0,
        guitar1UniqueOnsetPatternCount: 0,
        guitar2UniqueOnsetPatternCount: 0,
        guitar1OnsetPatternIds: [],
        guitar2OnsetPatternIds: [],
        guitar1VariationRatio: 0,
        guitar2VariationRatio: 0,
      },
    };
  }

  const barCount = Math.min(g1.measures.length, g2.measures.length);
  const guitar1ByBar: SyProtoGuitarBarRhythm[] = [];
  const guitar2ByBar: SyProtoGuitarBarRhythm[] = [];
  for (let i = 0; i < barCount; i++) {
    const m1 = g1.measures[i];
    const m2 = g2.measures[i];
    const bar = m1?.index ?? m2?.index ?? i + 1;
    guitar1ByBar.push(syProtoBarRhythmFromNotes(bar, melodicNoteEventsInMeasure(m1)));
    guitar2ByBar.push(syProtoBarRhythmFromNotes(bar, melodicNoteEventsInMeasure(m2)));
  }

  const motifRelations = [
    ...collectSyProtoRhythmMotifRelations('guitar1', guitar1ByBar),
    ...collectSyProtoRhythmMotifRelations('guitar2', guitar2ByBar),
  ];

  const guitar1OnsetPatternIds = guitar1ByBar.map((b) => b.onsetPatternId);
  const guitar2OnsetPatternIds = guitar2ByBar.map((b) => b.onsetPatternId);

  return {
    guitar1ByBar,
    guitar2ByBar,
    motifRelations,
    variation: {
      barCount,
      guitar1UniqueOnsetPatternCount: new Set(guitar1OnsetPatternIds.filter((id) => id !== '∅')).size,
      guitar2UniqueOnsetPatternCount: new Set(guitar2OnsetPatternIds.filter((id) => id !== '∅')).size,
      guitar1OnsetPatternIds,
      guitar2OnsetPatternIds,
      guitar1VariationRatio: syProtoRhythmVariationRatio(guitar1OnsetPatternIds),
      guitar2VariationRatio: syProtoRhythmVariationRatio(guitar2OnsetPatternIds),
    },
  };
}

/** Fixed Proto 1 seed set for cross-seed evidence comparison. */
export const SY_PROTO1_COMPARISON_SEEDS = [1, 2, 3, 4] as const;

export type SyProto1ComparisonSeed = (typeof SY_PROTO1_COMPARISON_SEEDS)[number];

/**
 * In-memory evidence pack for one Proto 1 seed — harmony, melodic overlap, rhythm.
 * No invented quality scores or ranks. GCE harmony/arrangement stay NOT MEASURED.
 */
export type SyProto1SeedComparisonRecord = {
  seed: SyProto1ComparisonSeed;
  harmonyByBar: readonly SyProtoBarDualGuitarHarmony[];
  melodicInteractionByBar: readonly SyProtoBarMelodicInteraction[];
  rhythm: SyProtoDualGuitarRhythmicAnalysis;
  /** Preserved Proto1 GCE reporting posture (no overall / PASS-FAIL while unmeasured). */
  gceReporting: {
    harmonyAndLanguage: 'NOT MEASURED';
    arrangementAndOrchestration: 'NOT MEASURED';
    overallScore: null;
    passFail: null;
  };
};

const SY_PROTO1_COMPARISON_GCE_REPORTING: SyProto1SeedComparisonRecord['gceReporting'] = {
  harmonyAndLanguage: 'NOT MEASURED',
  arrangementAndOrchestration: 'NOT MEASURED',
  overallScore: null,
  passFail: null,
};

/**
 * Pure helper: build Proto 1 dialogues for seeds 1–4 and pack per-seed evidence
 * from {@link extractSyProtoDualGuitarHarmonyByBar},
 * {@link measureSyProtoDualGuitarMelodicInteractionByBar},
 * and {@link analyzeSyProtoDualGuitarRhythm}.
 * No quality scores or ranking. Does not modify GCE evaluation formulas.
 */
export function compareSyProto1Seeds1to4(
  options?: Omit<SonicYouthProto1MelodicDialogueOptions, 'seed'>
): readonly SyProto1SeedComparisonRecord[] {
  return SY_PROTO1_COMPARISON_SEEDS.map((seed) => {
    const dialogue = buildSonicYouthProto1MelodicDialogue({ ...options, seed });
    const score = dialogue.score;
    return {
      seed,
      harmonyByBar: extractSyProtoDualGuitarHarmonyByBar(score),
      melodicInteractionByBar: measureSyProtoDualGuitarMelodicInteractionByBar(score),
      rhythm: analyzeSyProtoDualGuitarRhythm(score),
      gceReporting: SY_PROTO1_COMPARISON_GCE_REPORTING,
    };
  });
}

/** One in-memory Proto1 seed candidate (dialogue ScoreModel retained). */
export type SyProto1SeedCandidate = {
  seed: SyProto1ComparisonSeed;
  dialogue: SyProtoProto1MelodicDialogueResult;
};

/**
 * Build all four Proto1 seed dialogues in memory (seeds 1–4).
 * Composition path unchanged — thin map over {@link buildSonicYouthProto1MelodicDialogue}.
 */
export function buildSyProto1SeedCandidates1to4(
  options?: Omit<SonicYouthProto1MelodicDialogueOptions, 'seed'>
): readonly SyProto1SeedCandidate[] {
  return SY_PROTO1_COMPARISON_SEEDS.map((seed) => ({
    seed,
    dialogue: buildSonicYouthProto1MelodicDialogue({ ...options, seed }),
  }));
}

type SyProto1SeedSelectionMetrics = {
  seed: SyProto1ComparisonSeed;
  /** Retrograde + rotation motif links (exact repeats excluded). */
  motifDevelop: number;
  rhythmVariety: number;
  overlapBars: number;
  overlapTicks: number;
  simultaneous: number;
  motifTotal: number;
  meanOverlapInterval: number;
};

function syProto1SeedSelectionMetrics(
  record: SyProto1SeedComparisonRecord
): SyProto1SeedSelectionMetrics {
  const motifDevelop = record.rhythm.motifRelations.filter(
    (m) => m.kind === 'retrograde' || m.kind === 'rotation'
  ).length;
  const motifTotal = record.rhythm.motifRelations.length;
  const rhythmVariety =
    record.rhythm.variation.guitar1VariationRatio +
    record.rhythm.variation.guitar2VariationRatio +
    record.rhythm.variation.guitar1UniqueOnsetPatternCount +
    record.rhythm.variation.guitar2UniqueOnsetPatternCount;
  let overlapTicks = 0;
  let simultaneous = 0;
  let overlapBars = 0;
  const intervals: number[] = [];
  for (const bar of record.melodicInteractionByBar) {
    overlapTicks += bar.overlappingMelodicDurationTicks;
    simultaneous += bar.simultaneousMelodicAttacks;
    if (bar.overlappingMelodicDurationTicks > 0) overlapBars += 1;
    intervals.push(...bar.overlapPitchIntervalsSemitones);
  }
  const meanOverlapInterval =
    intervals.length === 0 ? 0 : intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return {
    seed: record.seed,
    motifDevelop,
    rhythmVariety,
    overlapBars,
    overlapTicks,
    simultaneous,
    motifTotal,
    meanOverlapInterval,
  };
}

/**
 * Deterministic best-of-four from {@link compareSyProto1Seeds1to4} evidence.
 * Prefers motivic development, rhythmic variety, then guitar interaction.
 * Rejects invented GCE overall / passFail. Tie-break: lowest seed.
 * Does not alter composition or GCE formulas.
 */
export function selectSyProto1BestSeedFromComparison(
  records: readonly SyProto1SeedComparisonRecord[]
): SyProto1ComparisonSeed {
  if (records.length === 0) {
    throw new Error('selectSyProto1BestSeedFromComparison: empty comparison records');
  }
  for (const record of records) {
    if (record.gceReporting.overallScore !== null || record.gceReporting.passFail !== null) {
      throw new Error(
        `selectSyProto1BestSeedFromComparison: invalid GCE overall on seed ${record.seed}`
      );
    }
  }
  const ranked = records.map(syProto1SeedSelectionMetrics).sort((a, b) => {
    if (a.motifDevelop !== b.motifDevelop) return b.motifDevelop - a.motifDevelop;
    if (a.rhythmVariety !== b.rhythmVariety) return b.rhythmVariety - a.rhythmVariety;
    if (a.overlapBars !== b.overlapBars) return b.overlapBars - a.overlapBars;
    if (a.overlapTicks !== b.overlapTicks) return b.overlapTicks - a.overlapTicks;
    if (a.simultaneous !== b.simultaneous) return b.simultaneous - a.simultaneous;
    if (a.motifTotal !== b.motifTotal) return b.motifTotal - a.motifTotal;
    if (a.meanOverlapInterval !== b.meanOverlapInterval) {
      return b.meanOverlapInterval - a.meanOverlapInterval;
    }
    return a.seed - b.seed;
  });
  return ranked[0]!.seed;
}

export type SyProto1SelectedCandidateResult = {
  selectedSeed: SyProto1ComparisonSeed;
  dialogue: SyProtoProto1MelodicDialogueResult;
  candidates: readonly SyProto1SeedCandidate[];
  comparison: readonly SyProto1SeedComparisonRecord[];
};

/**
 * Auto-select Proto1 among seeds 1–4: keep all candidates in memory, reuse
 * {@link compareSyProto1Seeds1to4} + {@link selectSyProto1BestSeedFromComparison}.
 */
export function resolveSyProto1SelectedCandidate(
  options?: Omit<SonicYouthProto1MelodicDialogueOptions, 'seed'>
): SyProto1SelectedCandidateResult {
  const candidates = buildSyProto1SeedCandidates1to4(options);
  const comparison = compareSyProto1Seeds1to4(options);
  const selectedSeed = selectSyProto1BestSeedFromComparison(comparison);
  const selected = candidates.find((c) => c.seed === selectedSeed);
  if (!selected) {
    throw new Error(`resolveSyProto1SelectedCandidate: missing candidate for seed ${selectedSeed}`);
  }
  return {
    selectedSeed,
    dialogue: selected.dialogue,
    candidates,
    comparison,
  };
}

/** Triad member when a PC lands on a declared parent (root → third → fifth order). */
export type SyProtoTriadDegree = 'root' | 'third' | 'fifth';

/**
 * Pure Prototype 1 tone-role classification of one pitch against a declared polychord pair.
 * Accepts MIDI or pitch class; membership is by pitch class only.
 * Supports major / minor / diminished / augmented at any root via triadPitchClasses + QUALITY_INTERVALS.
 */
export type SyProtoPolychordToneRole = {
  pitchClass: number;
  /** Degree in Guitar 1's declared triad, or null if not a member. */
  guitar1Degree: SyProtoTriadDegree | null;
  /** Degree in Guitar 2's declared triad, or null if not a member. */
  guitar2Degree: SyProtoTriadDegree | null;
  /** Present in both declared parents. */
  shared: boolean;
  /** Present in neither declared parent (same as outside the combined field). */
  outsideBoth: boolean;
  /** Present in the combined PC union of both parents (≤6 notes). */
  inCombinedField: boolean;
};

const TRIAD_DEGREES: readonly SyProtoTriadDegree[] = ['root', 'third', 'fifth'];

function triadDegreeForPc(triad: SyProtoTriadInput, pc: number): SyProtoTriadDegree | null {
  const pcs = triadPitchClasses(triad);
  const target = normalizeRootPc(pc);
  for (let i = 0; i < TRIAD_DEGREES.length; i++) {
    if (pcs[i] === target) return TRIAD_DEGREES[i]!;
  }
  return null;
}

/**
 * Classify a pitch against Guitar 1 / Guitar 2 triad membership, shared vs outside, and union field.
 * Pure: no score, grip, or export side effects.
 */
export function classifySyProtoPolychordToneRole(
  pitch: number,
  pair: SyProtoPolychordPair
): SyProtoPolychordToneRole {
  const pitchClass = normalizeRootPc(pitch);
  const guitar1Degree = triadDegreeForPc(pair.guitar1, pitchClass);
  const guitar2Degree = triadDegreeForPc(pair.guitar2, pitchClass);
  const inGuitar1 = guitar1Degree !== null;
  const inGuitar2 = guitar2Degree !== null;
  const inCombinedField = inGuitar1 || inGuitar2;
  return {
    pitchClass,
    guitar1Degree,
    guitar2Degree,
    shared: inGuitar1 && inGuitar2,
    outsideBoth: !inCombinedField,
    inCombinedField,
  };
}

function midisForPcInRange(pc: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) {
    if (normalizeRootPc(m) === normalizeRootPc(pc)) out.push(m);
  }
  return out;
}

/**
 * Resolve open-string MIDI for one guitar.
 * Supplied tunings: six integers 0–127, physical order 6→1; repeats / non-ascending allowed.
 */
function resolveOpenTuning(
  raw: readonly number[] | undefined,
  fallback: SYSixStringMidi,
  guitarLabel: 'Guitar 1' | 'Guitar 2'
): SYSixStringMidi {
  if (raw === undefined) return fallback;
  if (
    !Array.isArray(raw) ||
    raw.length !== 6 ||
    !raw.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 127)
  ) {
    throw new Error(
      `${guitarLabel} tuning must contain six integer MIDI pitches in 0–127 (string order 6→1)`
    );
  }
  return [raw[0]!, raw[1]!, raw[2]!, raw[3]!, raw[4]!, raw[5]!];
}

/** Playable triad voicing on custom opens (MIDI sorted low→high). */
type PlayableTriadGrip = {
  midis: number[];
  span: number;
  lowest: number;
  /** Actual frets from {@link solveGuitarGrip} (parallel to assigned strings). */
  frets: number[];
};

function triadGripKey(midis: readonly number[]): string {
  return [...midis].sort((a, b) => a - b).join(',');
}

/** Register-ordered absolute motion between two 3-note grips. */
function triadGripMotionCost(prior: readonly number[], next: readonly number[]): number {
  const p = [...prior].sort((a, b) => a - b);
  const n = [...next].sort((a, b) => a - b);
  const len = Math.min(p.length, n.length);
  let cost = 0;
  for (let i = 0; i < len; i++) cost += Math.abs(p[i]! - n[i]!);
  return cost;
}

function classicTriadGripRank(a: PlayableTriadGrip, b: PlayableTriadGrip): number {
  if (a.span !== b.span) return a.span - b.span;
  if (a.lowest !== b.lowest) return a.lowest - b.lowest;
  for (let i = 0; i < a.midis.length; i++) {
    const d = a.midis[i]! - b.midis[i]!;
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Resolve optional fret-position preference to an inclusive fretted-fret window.
 * `undefined` / `'auto'` / invalid custom → null (no filter = legacy behaviour).
 */
function resolveSyProto1FretPositionRange(
  position: SyProto1FretPosition | undefined
): { minFret: number; maxFret: number } | null {
  if (position == null || position === 'auto') return null;
  if (position === 'low' || position === 'middle' || position === 'high') {
    return SY_PROTO1_FRET_BAND[position];
  }
  if (typeof position === 'object' && position.mode === 'custom') {
    const minFret = Math.floor(Number(position.minFret));
    const maxFret = Math.floor(Number(position.maxFret));
    if (
      !Number.isFinite(minFret) ||
      !Number.isFinite(maxFret) ||
      minFret < 0 ||
      maxFret < minFret
    ) {
      return null;
    }
    return { minFret, maxFret };
  }
  return null;
}

/**
 * True when every fretted (non-open) fret lies in [minFret, maxFret].
 * Open strings (fret 0) always allowed.
 */
function gripMatchesFretPositionRange(
  grip: PlayableTriadGrip,
  range: { minFret: number; maxFret: number }
): boolean {
  for (const fret of grip.frets) {
    if (fret <= 0) continue;
    if (fret < range.minFret || fret > range.maxFret) return false;
  }
  return true;
}

/**
 * Enumerate distinct playable 3-note grips for triad PCs on custom opens.
 * Reuses {@link solveGuitarGrip}; frets must cover all three midis.
 */
function enumeratePlayableTriadGrips(
  opens: readonly number[],
  pcs: readonly number[]
): PlayableTriadGrip[] {
  const uniquePcs = [...new Set(pcs.map(normalizeRootPc))];
  if (uniquePcs.length !== 3) return [];
  const lo = Math.min(...opens);
  const hi = Math.max(...opens) + 15;
  const pools = uniquePcs.map((pc) => midisForPcInRange(pc, lo, hi));
  const seen = new Set<string>();
  const out: PlayableTriadGrip[] = [];
  for (const a of pools[0]!) {
    for (const b of pools[1]!) {
      for (const c of pools[2]!) {
        const midis = [a, b, c];
        if (new Set(midis).size !== 3) continue;
        const solved = solveGuitarGrip(midis, { openStrings: opens });
        if (!solved.feasible || solved.frets.length !== 3) continue;
        const sorted = midis.slice().sort((x, y) => x - y);
        const key = sorted.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          midis: sorted,
          span: solved.fretSpan,
          lowest: solved.lowestFret,
          frets: solved.frets.map((f) => f.fret),
        });
      }
    }
  }
  return out;
}

function pickClassicTriadGrip(candidates: readonly PlayableTriadGrip[]): PlayableTriadGrip {
  // Existing fallback: first minimal (span, lowest) in enumeration order.
  let best: PlayableTriadGrip | null = null;
  for (const c of candidates) {
    if (
      !best ||
      c.span < best.span ||
      (c.span === best.span && c.lowest < best.lowest)
    ) {
      best = c;
    }
  }
  return best!;
}

function rankByMinMovementFromPrior(
  pool: readonly PlayableTriadGrip[],
  priorMidis: readonly number[]
): PlayableTriadGrip {
  const ranked = [...pool].sort((a, b) => {
    const ca = triadGripMotionCost(priorMidis, a.midis);
    const cb = triadGripMotionCost(priorMidis, b.midis);
    if (ca !== cb) return ca - cb;
    return classicTriadGripRank(a, b);
  });
  return ranked[0]!;
}

/**
 * Pick playable triad grip. No prior → classic span/lowest fallback.
 * With prior + omitted voiceLeading → hybrid: prefer alternate when available, else nearest.
 * `'min-movement'` → nearest playable (may repeat prior).
 * `'alternate'` → different grip when one exists; else sole grip.
 * Optional fret position filters by actual fretted frets; empty band → classic fallback.
 */
function pickPlayableTriadGrip(
  opens: readonly number[],
  pcs: readonly number[],
  guitarLabel: 'Guitar 1' | 'Guitar 2',
  priorMidis?: readonly number[] | null,
  fretPosition?: SyProto1FretPosition | null,
  voiceLeading?: SyProto1VoiceLeadingMode | null
): number[] {
  const candidates = enumeratePlayableTriadGrips(opens, pcs);
  if (candidates.length === 0) {
    throw new Error(`${guitarLabel} grip unavailable`);
  }
  const range = resolveSyProto1FretPositionRange(fretPosition ?? undefined);
  const inBand =
    range == null ? candidates : candidates.filter((c) => gripMatchesFretPositionRange(c, range));
  // Empty band → existing unfiltered fallback (never emit an invalid/empty pick).
  const poolBase = inBand.length > 0 ? inBand : candidates;

  if (priorMidis == null || priorMidis.length === 0) {
    return pickClassicTriadGrip(poolBase).midis.slice();
  }
  const priorKey = triadGripKey(priorMidis);
  const alts = poolBase.filter((c) => c.midis.join(',') !== priorKey);
  const mode = voiceLeading === 'min-movement' || voiceLeading === 'alternate' ? voiceLeading : null;
  // null = hybrid (same pool rule as alternate); min-movement keeps prior eligible.
  const pool =
    mode === 'min-movement' ? poolBase : alts.length > 0 ? alts : poolBase;
  return rankByMinMovementFromPrior(pool, priorMidis).midis.slice();
}

function solveTriadGripOnOpens(
  opens: readonly number[],
  triad: SyProtoTriadInput,
  guitarLabel: 'Guitar 1' | 'Guitar 2',
  priorMidis?: readonly number[] | null,
  fretPosition?: SyProto1FretPosition | null,
  voiceLeading?: SyProto1VoiceLeadingMode | null
): number[] {
  const pcs = triadPitchClasses(triad);
  if (new Set(pcs).size !== 3) {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)} (degenerate triad)`);
  }
  try {
    return pickPlayableTriadGrip(opens, pcs, guitarLabel, priorMidis, fretPosition, voiceLeading);
  } catch {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)}`);
  }
}

function electricGuitarTriadPart(
  id: 'guitar' | 'guitar_2',
  name: string,
  pitches: number[],
  triad: SyProtoTriadInput
): PartModel {
  const m = createMeasure(1, undefined);
  addEvent(m, chordAt(pitches, 0, 4, 1, triadChordSymbol(triad)));
  return {
    id,
    name,
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
}

/**
 * Combined polychord label for MusicXML `<direction><words>` above Guitar 1.
 * Spelling from declared parents (via analyzeSyProtoCombinedPolychord); stack vs overlap from grip MIDI.
 * Stacked (disjoint ranges): higher chord "over" lower. Overlapping: "G1 + G2".
 * No Forte / analysis details; not a slash-chord harmony element.
 */
export function syProtoCombinedPolychordNotationLabel(
  pair: SyProtoPolychordPair,
  guitar1Pitches: readonly number[],
  guitar2Pitches: readonly number[]
): string {
  const analysis = analyzeSyProtoCombinedPolychord(pair);
  const g1Sym = triadChordSymbol({
    rootPc: analysis.guitar1.rootPc,
    quality: analysis.guitar1.quality,
  });
  const g2Sym = triadChordSymbol({
    rootPc: analysis.guitar2.rootPc,
    quality: analysis.guitar2.quality,
  });
  const g1Min = Math.min(...guitar1Pitches);
  const g1Max = Math.max(...guitar1Pitches);
  const g2Min = Math.min(...guitar2Pitches);
  const g2Max = Math.max(...guitar2Pitches);
  if (g2Min > g1Max) return `${g2Sym} over ${g1Sym}`;
  if (g1Min > g2Max) return `${g1Sym} over ${g2Sym}`;
  return `${g1Sym} + ${g2Sym}`;
}

/** Optional priors / fret bands / voice-leading for progression + repeated attacks. */
export type SonicYouthPolychordGripOptions = SonicYouthPolychordTuningOptions & {
  guitar1PriorPitches?: readonly number[];
  guitar2PriorPitches?: readonly number[];
  guitar1FretPosition?: SyProto1FretPosition;
  guitar2FretPosition?: SyProto1FretPosition;
  guitar1VoiceLeading?: SyProto1VoiceLeadingMode;
  guitar2VoiceLeading?: SyProto1VoiceLeadingMode;
};

/**
 * One-bar dual-electric polychord (no bass).
 * Reference pair: D major (G1) + E major (G2).
 * Optional tunings → solveGuitarGrip({ openStrings }); default AAEEAA / ACCGG#C.
 * Optional prior grips → voice-leading policy (omit = hybrid alternate + min motion).
 * Optional fret positions → filter by fretted frets; empty band falls back to classic pick.
 */
export function buildSonicYouthOneBarPolychordScore(
  guitar1Triad: SyProtoTriadInput,
  guitar2Triad: SyProtoTriadInput,
  options?: SonicYouthPolychordGripOptions
): SonicYouthOneBarPolychordResult {
  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const guitar1Pitches = solveTriadGripOnOpens(
    g1Open,
    guitar1Triad,
    'Guitar 1',
    options?.guitar1PriorPitches,
    options?.guitar1FretPosition,
    options?.guitar1VoiceLeading
  );
  const guitar2Pitches = solveTriadGripOnOpens(
    g2Open,
    guitar2Triad,
    'Guitar 2',
    options?.guitar2PriorPitches,
    options?.guitar2FretPosition,
    options?.guitar2VoiceLeading
  );
  if (new Set(guitar1Pitches).size !== 3) {
    throw new Error(`Guitar 1 grip unavailable for ${triadLabel(guitar1Triad)}`);
  }
  if (new Set(guitar2Pitches).size !== 3) {
    throw new Error(`Guitar 2 grip unavailable for ${triadLabel(guitar2Triad)}`);
  }

  const guitar1 = electricGuitarTriadPart(
    'guitar',
    guitarPartNameFromOpens('Guitar 1', g1Open),
    guitar1Pitches,
    guitar1Triad
  );
  const guitar2 = electricGuitarTriadPart(
    'guitar_2',
    guitarPartNameFromOpens('Guitar 2', g2Open),
    guitar2Pitches,
    guitar2Triad
  );
  const combinedLabel = syProtoCombinedPolychordNotationLabel(
    { guitar1: guitar1Triad, guitar2: guitar2Triad },
    guitar1Pitches,
    guitar2Pitches
  );
  const score = createScore('Sonic Youth one-bar polychord prototype', [guitar1, guitar2], {
    tempo: 96,
  });
  score.partMeasureWordsMarkings = { guitar: { 1: combinedLabel } };

  return {
    score,
    guitar1Pitches,
    guitar2Pitches,
    guitar1OpenPitches: g1Open,
    guitar2OpenPitches: g2Open,
  };
}

/**
 * Multi-bar dual-electric polychord progression (no bass).
 * Grip failure reports bar, guitar, and chord.
 * Optional tunings validated once (guitar-labelled); defaults AAEEAA / ACCGG#C.
 * Adjacent bars reuse prior grips → alternate playable voicings with minimal pitch motion.
 */
export function buildSonicYouthPolychordProgressionScore(
  pairs: readonly SyProtoPolychordPair[],
  options?: SonicYouthPolychordGripOptions
): SonicYouthPolychordProgressionResult {
  if (pairs.length === 0) {
    throw new Error('polychord progression requires at least one { guitar1, guitar2 } pair');
  }

  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const tuningOpts: SonicYouthPolychordGripOptions = {
    guitar1Tuning: g1Open,
    guitar2Tuning: g2Open,
    ...(options?.guitar1FretPosition != null
      ? { guitar1FretPosition: options.guitar1FretPosition }
      : {}),
    ...(options?.guitar2FretPosition != null
      ? { guitar2FretPosition: options.guitar2FretPosition }
      : {}),
    ...(options?.guitar1VoiceLeading != null
      ? { guitar1VoiceLeading: options.guitar1VoiceLeading }
      : {}),
    ...(options?.guitar2VoiceLeading != null
      ? { guitar2VoiceLeading: options.guitar2VoiceLeading }
      : {}),
  };

  const bars: SonicYouthOneBarPolychordResult[] = [];
  const g1Measures = [];
  const g2Measures = [];
  const combinedWordsByBar: Record<number, string> = {};
  let g1Prior: readonly number[] | undefined;
  let g2Prior: readonly number[] | undefined;

  for (let i = 0; i < pairs.length; i++) {
    const bar = i + 1;
    const pair = pairs[i]!;
    let oneBar: SonicYouthOneBarPolychordResult;
    try {
      oneBar = buildSonicYouthOneBarPolychordScore(pair.guitar1, pair.guitar2, {
        ...tuningOpts,
        ...(g1Prior != null ? { guitar1PriorPitches: g1Prior } : {}),
        ...(g2Prior != null ? { guitar2PriorPitches: g2Prior } : {}),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`bar ${bar}: ${detail}`);
    }
    g1Prior = oneBar.guitar1Pitches;
    g2Prior = oneBar.guitar2Pitches;
    bars.push(oneBar);
    combinedWordsByBar[bar] = syProtoCombinedPolychordNotationLabel(
      pair,
      oneBar.guitar1Pitches,
      oneBar.guitar2Pitches
    );

    const srcG1 = oneBar.score.parts.find((p) => p.id === 'guitar');
    const srcG2 = oneBar.score.parts.find((p) => p.id === 'guitar_2');
    if (!srcG1?.measures[0] || !srcG2?.measures[0]) {
      throw new Error(`bar ${bar}: one-bar score missing guitar parts`);
    }
    const m1 = createMeasure(bar, srcG1.measures[0].chord);
    for (const e of srcG1.measures[0].events) addEvent(m1, e);
    const m2 = createMeasure(bar, srcG2.measures[0].chord);
    for (const e of srcG2.measures[0].events) addEvent(m2, e);
    g1Measures.push(m1);
    g2Measures.push(m2);
  }

  const guitar1: PartModel = {
    id: 'guitar',
    name: guitarPartNameFromOpens('Guitar 1', g1Open),
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: g1Measures,
  };
  const guitar2: PartModel = {
    id: 'guitar_2',
    name: guitarPartNameFromOpens('Guitar 2', g2Open),
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: g2Measures,
  };

  const score = createScore('Sonic Youth polychord progression prototype', [guitar1, guitar2], {
    tempo: 96,
  });
  score.partMeasureWordsMarkings = { guitar: combinedWordsByBar };

  return {
    score,
    bars,
    guitar1OpenPitches: g1Open,
    guitar2OpenPitches: g2Open,
  };
}

/** Prototype 1 fixed polychord: Guitar 1 C major, Guitar 2 F♯ minor. */
export const SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR: SyProtoPolychordPair = {
  guitar1: { rootPc: 0, quality: 'major' },
  guitar2: { rootPc: 6, quality: 'minor' },
};

const SY_PROTO1_TRIAD_QUALITIES: readonly SyProtoTriadQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
];

/**
 * Normalize optional user `polychordBars`.
 * `null` = omit (legacy pair source). Throws on malformed entries.
 */
export function normalizeSyProto1UserPolychordBars(
  bars: readonly SyProtoPolychordPair[] | undefined | null
): SyProtoPolychordPair[] | null {
  if (bars == null) return null;
  if (!Array.isArray(bars) || bars.length === 0) return null;
  const allowed = new Set<string>(SY_PROTO1_TRIAD_QUALITIES);
  const out: SyProtoPolychordPair[] = [];
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar == null || typeof bar !== 'object') {
      throw new Error(`polychordBars[${i}]: expected { guitar1, guitar2 }`);
    }
    for (const g of ['guitar1', 'guitar2'] as const) {
      const triad = bar[g];
      if (triad == null || typeof triad !== 'object') {
        throw new Error(`polychordBars[${i}].${g}: expected { rootPc, quality }`);
      }
      if (typeof triad.rootPc !== 'number' || !Number.isFinite(triad.rootPc)) {
        throw new Error(`polychordBars[${i}].${g}.rootPc must be a finite number`);
      }
      if (!allowed.has(String(triad.quality))) {
        throw new Error(
          `polychordBars[${i}].${g}.quality must be major|minor|diminished|augmented`
        );
      }
    }
    out.push({
      guitar1: {
        rootPc: normalizeRootPc(bar.guitar1.rootPc),
        quality: bar.guitar1.quality,
      },
      guitar2: {
        rootPc: normalizeRootPc(bar.guitar2.rootPc),
        quality: bar.guitar2.quality,
      },
    });
  }
  return out;
}

/** Qualities preferred for Proto1 polychord planning (SY rock colour). */
const SY_PROTO1_PLAN_QUALITIES: readonly SyProtoTriadQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
];

function syProto1PairKey(pair: SyProtoPolychordPair): string {
  return `${normalizeRootPc(pair.guitar1.rootPc)}:${pair.guitar1.quality}|${normalizeRootPc(
    pair.guitar2.rootPc
  )}:${pair.guitar2.quality}`;
}

function syProto1TriadPcsEqual(a: SyProtoTriadInput, b: SyProtoTriadInput): boolean {
  const pa = triadPitchClasses(a);
  const pb = triadPitchClasses(b);
  return pa[0] === pb[0] && pa[1] === pb[1] && pa[2] === pb[2];
}

/**
 * Cross-guitar friction 0–1 from declared parent PCs (m2 / M2 / TT / unison tallies).
 * Feeds {@link getSYDissonancePreset}; does not mutate score events.
 */
function syProto1InterGuitarFriction(pair: SyProtoPolychordPair): number {
  const g1 = triadPitchClasses(pair.guitar1);
  const g2 = triadPitchClasses(pair.guitar2);
  let minor2 = 0;
  let major2 = 0;
  let tritone = 0;
  let unison = 0;
  for (const a of g1) {
    for (const b of g2) {
      const iv = Math.min((a - b + 12) % 12, (b - a + 12) % 12);
      if (iv === 0) unison += 1;
      else if (iv === 1) minor2 += 1;
      else if (iv === 2) major2 += 1;
      else if (iv === 6) tritone += 1;
    }
  }
  const raw = (minor2 * 1.0 + major2 * 0.45 + tritone * 0.75 - unison * 0.15) / 9;
  return Math.max(0, Math.min(1, raw));
}

/** Tension target 0–1 across bars: establish → peak → release (not fixed bar-4 −1). */
function syProto1BarTensionTarget(barIndex: number, barCount: number): number {
  if (barCount <= 1) return 0.4;
  const t = barIndex / (barCount - 1);
  if (t <= 0.35) return 0.32 + t * 0.4;
  if (t <= 0.7) return 0.55 + (t - 0.35) * 0.9;
  return Math.max(0.22, 0.85 - (t - 0.7) * 1.6);
}

function syProto1RootProxy(triad: SyProtoTriadInput): number {
  return normalizeRootPc(triad.rootPc);
}

function syProto1ThirdProxy(triad: SyProtoTriadInput): number {
  return triadPitchClasses(triad)[1]!;
}

/** Horizontal VL proxy between consecutive polychord pairs (Tymoczko 3-voice). */
function syProto1PairVoiceLeadingScore(
  prev: SyProtoPolychordPair,
  curr: SyProtoPolychordPair
): number {
  return scoreTymoczkoHorizontal(
    syProto1RootProxy(prev.guitar1),
    syProto1RootProxy(curr.guitar1),
    syProto1RootProxy(prev.guitar2),
    syProto1RootProxy(curr.guitar2),
    syProto1ThirdProxy(prev.guitar1),
    syProto1ThirdProxy(curr.guitar1)
  );
}

/** Per-guitar tertian VL cost (lower sum = smoother). */
function syProto1PairMinVoiceLeadingCost(
  prev: SyProtoPolychordPair,
  curr: SyProtoPolychordPair
): number {
  return (
    minVoiceLeading(triadPitchClasses(prev.guitar1), triadPitchClasses(curr.guitar1)) +
    minVoiceLeading(triadPitchClasses(prev.guitar2), triadPitchClasses(curr.guitar2))
  );
}

let syProto1PlannerCandidateCache: SyProtoPolychordPair[] | null = null;

/**
 * Valid Proto1 polychord candidates: distinct parents, union 4–6 pcs,
 * major/minor preferred; dim/aug kept for tension colour.
 */
function syProto1PlannerCandidates(): readonly SyProtoPolychordPair[] {
  if (syProto1PlannerCandidateCache) return syProto1PlannerCandidateCache;
  const triads = listTertianTriads().filter((t) =>
    (SY_PROTO1_PLAN_QUALITIES as readonly string[]).includes(t.quality)
  );
  const out: SyProtoPolychordPair[] = [];
  const seen = new Set<string>();
  for (const g1 of triads) {
    for (const g2 of triads) {
      const pair: SyProtoPolychordPair = {
        guitar1: { rootPc: g1.rootPc, quality: g1.quality as SyProtoTriadQuality },
        guitar2: { rootPc: g2.rootPc, quality: g2.quality as SyProtoTriadQuality },
      };
      if (syProto1TriadPcsEqual(pair.guitar1, pair.guitar2)) continue;
      const analysis = analyzeSyProtoCombinedPolychord(pair);
      if (analysis.pitchClassCount < 4 || analysis.pitchClassCount > 6) continue;
      // Prefer true dual-colour: at least one non-shared tone each side.
      if (analysis.commonToneCount >= 3) continue;
      const key = syProto1PairKey(pair);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pair);
    }
  }
  // Always keep verified Proto1 anchor in the pool.
  const anchorKey = syProto1PairKey(SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR);
  if (!seen.has(anchorKey)) out.unshift(SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR);
  syProto1PlannerCandidateCache = out;
  return out;
}

function syProto1ScorePlannedPair(
  pair: SyProtoPolychordPair,
  prev: SyProtoPolychordPair | null,
  tensionTarget: number
): number {
  const analysis = analyzeSyProtoCombinedPolychord(pair);
  const friction = syProto1InterGuitarFriction(pair);
  const preset = getSYDissonancePreset(friction);
  const tensionFit = 1 - Math.abs(friction - tensionTarget);

  let colour = 0.35;
  if (analysis.pitchClassCount === 6) colour += 0.25;
  else if (analysis.pitchClassCount === 5) colour += 0.15;
  if (analysis.forte) colour += 0.1;
  if (analysis.alternativeDisjointSplits.length > 0) colour += 0.05;
  // Prefer major/minor parents for SY rock; soft-penalise dim/aug except at high tension.
  const rockParents =
    (pair.guitar1.quality === 'major' || pair.guitar1.quality === 'minor' ? 0.08 : 0) +
    (pair.guitar2.quality === 'major' || pair.guitar2.quality === 'minor' ? 0.08 : 0);
  colour += rockParents;
  if (
    tensionTarget < 0.55 &&
    (pair.guitar1.quality === 'diminished' ||
      pair.guitar1.quality === 'augmented' ||
      pair.guitar2.quality === 'diminished' ||
      pair.guitar2.quality === 'augmented')
  ) {
    colour -= 0.12;
  }
  if (preset === 'high_friction' && tensionTarget >= 0.6) colour += 0.08;
  if (preset === 'low_friction' && tensionTarget <= 0.4) colour += 0.08;

  let continuity = 0.55;
  if (prev) {
    const vl = syProto1PairVoiceLeadingScore(prev, pair);
    const vlCost = syProto1PairMinVoiceLeadingCost(prev, pair);
    continuity = 0.45 * vl + 0.55 * (1 - Math.min(1, vlCost / 12));
    if (syProto1PairKey(prev) === syProto1PairKey(pair)) continuity *= 0.35; // discourage stuck repeats
  }

  return 0.4 * tensionFit + 0.3 * colour + 0.3 * continuity;
}

/**
 * Seeded Proto1 polychord planner — returns one {@link SyProtoPolychordPair} per bar.
 * Uses {@link analyzeSyProtoCombinedPolychord}, {@link minVoiceLeading},
 * {@link scoreTymoczkoHorizontal}, and {@link getSYDissonancePreset}.
 * Deterministic for (seed, barCount). Does not alter fixed Proto1 generation or tunings.
 */
export function planSyProto1PolychordBars(
  seed: number,
  barCount: number
): SyProtoPolychordPair[] {
  if (!Number.isFinite(barCount) || barCount < 1) {
    throw new Error(`planSyProto1PolychordBars: barCount must be >= 1, got ${barCount}`);
  }
  const n = Math.floor(barCount);
  const rng = mulberry32((seed >>> 0) || 1);
  const candidates = syProto1PlannerCandidates();
  if (candidates.length === 0) {
    throw new Error('planSyProto1PolychordBars: empty candidate pool');
  }

  const out: SyProtoPolychordPair[] = [];
  let prev: SyProtoPolychordPair | null = null;
  for (let i = 0; i < n; i++) {
    const tensionTarget = syProto1BarTensionTarget(i, n);
    const ranked = candidates
      .map((pair) => ({ pair, score: syProto1ScorePlannedPair(pair, prev, tensionTarget) }))
      .sort((a, b) => b.score - a.score || syProto1PairKey(a.pair).localeCompare(syProto1PairKey(b.pair)));
    const topK = ranked.slice(0, Math.min(5, ranked.length));
    const pick = topK[Math.floor(rng() * topK.length)]!;
    out.push({
      guitar1: { ...pick.pair.guitar1 },
      guitar2: { ...pick.pair.guitar2 },
    });
    prev = pick.pair;
  }
  return out;
}

/** Design cell G4–F♯4–C♯5–C5 (cross-triad semitones + C–F♯ tritone frame). */
export const SY_PROTO1_MOTIF_MIDI: readonly number[] = [67, 66, 73, 72];

export type SyProtoProto1MelodicEvent = NoteEvent | RestEvent;

export type SyProtoProto1ToneRoleReceipt = {
  midi: number;
  guitar: 'guitar1' | 'guitar2';
  bar: number;
  role: SyProtoPolychordToneRole;
};

export type SyProtoProto1MelodicDialogueResult = {
  pair: SyProtoPolychordPair;
  /** Per-bar polychord pairs (fixed = repeated C/F♯m; adaptive = planner output). */
  pairs: readonly SyProtoPolychordPair[];
  combinedField: readonly number[];
  motifMidi: readonly number[];
  answerMidi: readonly number[];
  /** Per-bar melody/rest events for Guitar 1 (voice 1 when active); length = score bars. */
  guitar1MelodicEventsByBar: readonly (readonly SyProtoProto1MelodicEvent[])[];
  /** Per-bar melody/rest events for Guitar 2 (voice 1 when active); length = score bars. */
  guitar2MelodicEventsByBar: readonly (readonly SyProtoProto1MelodicEvent[])[];
  toneRoleReceipts: readonly SyProtoProto1ToneRoleReceipt[];
  /**
   * Prototype 1 score: upper melody = voice 1 (stems up); lower triad = voice 2 (stems down)
   * in active bars. Melody-free bars keep the triad as the sole voice (voice 1).
   */
  score: ScoreModel;
  chordBars: SonicYouthPolychordProgressionResult;
  /** Harmonic surface applied to {@link score} (`B` = G2 bar 4 −1 / C/Fm; fixed mode only). */
  harmonicVariant: SyProto1HarmonicVariant;
  /** Harmony source used for this build. */
  harmonyMode: SyProto1HarmonyMode;
};

/** Upper melody layer — odd voice → exporter stem up. */
const PROTO1_MELODY_VOICE = 1;
/** Lower sustained triad under active melody — even voice → exporter stem down. */
const PROTO1_CHORD_VOICE = 2;

/** Sounding melody band for Proto 1 (fretted, above open-string floor). */
const PROTO1_MELODY_MIDI_MIN = 60;
const PROTO1_MELODY_MIDI_MAX = 84;
/** Max melodic leap (semitones) for user-rhythm continuity picks — keeps guitar lines playable. */
const PROTO1_USER_RHYTHM_MAX_LEAP = 12;

type Proto1PitchOp = { op: OperatorId; params?: OperatorParams };

/** Field-safe ops that keep a 4-note cell (no fragment / rhythm / liquidate). */
const PROTO1_SEEDED_MOTIF_OPS: readonly Proto1PitchOp[] = [
  { op: 'transpose-in-field', params: { degrees: 1 } },
  { op: 'transpose-in-field', params: { degrees: 2 } },
  { op: 'transpose-in-field', params: { degrees: 3 } },
  { op: 'transpose-in-field', params: { degrees: -1 } },
  { op: 'transpose-in-field', params: { degrees: -2 } },
  { op: 'retrograde' },
  { op: 'invert-in-field' },
];

/** Answer transforms applied to the (possibly varied) G1 motif. */
const PROTO1_SEEDED_ANSWER_OPS: readonly Proto1PitchOp[] = [
  { op: 'invert-in-field' },
  { op: 'retrograde' },
  { op: 'transpose-in-field', params: { degrees: 1 } },
  { op: 'transpose-in-field', params: { degrees: -1 } },
  { op: 'transpose-in-field', params: { degrees: 2 } },
  { op: 'transpose-in-field', params: { degrees: -2 } },
];

function proto1CombinedField(pair: SyProtoPolychordPair): readonly number[] {
  return analyzeSyProtoCombinedPolychord(pair).unionPitchClasses;
}

function assertPitchInCombinedField(midi: number, pair: SyProtoPolychordPair, label: string): void {
  const role = classifySyProtoPolychordToneRole(midi, pair);
  if (!role.inCombinedField) {
    throw new Error(`${label}: MIDI ${midi} (pc ${role.pitchClass}) outside combined polychord field`);
  }
}

function proto1MotifFromMidi(
  motifMidi: readonly number[],
  field: readonly number[],
  id: string
): Motif {
  return {
    id,
    field: [...field],
    events: motifMidi.map((midi, i) => ({
      onset: i,
      duration: 1,
      midi,
    })),
  };
}

function proto1ExtractSoundingMidi(motif: Motif, expectedCount: number, label: string): number[] {
  const midis: number[] = [];
  for (const event of motif.events) {
    if (event.midi === null) continue;
    midis.push(event.midi);
  }
  if (midis.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} pitches, got ${midis.length}`);
  }
  return midis;
}

/** Octave-shift whole cell into playable guitar melody band; PCs unchanged. */
function proto1ClampMelodyRegister(midis: readonly number[]): number[] {
  let out = [...midis];
  for (let guard = 0; guard < 4; guard++) {
    const lo = Math.min(...out);
    const hi = Math.max(...out);
    if (lo < PROTO1_MELODY_MIDI_MIN) out = out.map((m) => m + 12);
    else if (hi > PROTO1_MELODY_MIDI_MAX) out = out.map((m) => m - 12);
    else break;
  }
  return out;
}

function proto1ApplyPitchOp(
  motifMidi: readonly number[],
  field: readonly number[],
  sourceId: string,
  pitchOp: Proto1PitchOp,
  label: string
): { midi: number[]; motifId: string } {
  const source = proto1MotifFromMidi(motifMidi, field, sourceId);
  const { motif, warnings } = applyOperator(source, pitchOp.op, pitchOp.params);
  if (warnings.some((w) => w.includes('pitch left field'))) {
    throw new Error(`${label}: ${pitchOp.op} left combined field`);
  }
  const midi = proto1ClampMelodyRegister(proto1ExtractSoundingMidi(motif, motifMidi.length, label));
  return { midi, motifId: motif.id };
}

/**
 * Invert Prototype 1 motif inside the combined six-note field (motif-ops invert-in-field).
 * Axis = first sounding pitch (G4). Verified path — no register clamp.
 */
function proto1AnswerMidiFromMotif(
  motifMidi: readonly number[],
  field: readonly number[]
): { answerMidi: number[]; motifId: string } {
  const motif = proto1MotifFromMidi(motifMidi, field, 'sy_proto1_m1');
  const { motif: inverted } = applyOperator(motif, 'invert-in-field');
  const answerMidi = proto1ExtractSoundingMidi(
    inverted,
    motifMidi.length,
    'Prototype 1 answer'
  );
  return { answerMidi, motifId: inverted.id };
}

/** Seeded answer: applyOperator on G1 motif, then clamp into playable band. */
function proto1SeededAnswerMidiFromMotif(
  motifMidi: readonly number[],
  field: readonly number[],
  sourceMotifId: string,
  answerOp: Proto1PitchOp
): { answerMidi: number[]; motifId: string } {
  const { midi: answerMidi, motifId } = proto1ApplyPitchOp(
    motifMidi,
    field,
    sourceMotifId,
    answerOp,
    `Prototype 1 seeded answer (${answerOp.op})`
  );
  return { answerMidi, motifId };
}

/**
 * Seed → G1 motif MIDI via field-safe applyOperator; falls back to base cell on failure.
 * Index is seed modulo table length (not hashed) so adjacent seeds pick distinct ops —
 * seeds 1–4 map to four different pitch sequences.
 */
function proto1SeededMotifMidi(
  baseMidi: readonly number[],
  field: readonly number[],
  seed: number
): { motifMidi: number[]; motifId: string } {
  const n = PROTO1_SEEDED_MOTIF_OPS.length;
  const idx = ((seed % n) + n) % n;
  const pick = PROTO1_SEEDED_MOTIF_OPS[idx]!;
  try {
    const varied = proto1ApplyPitchOp(baseMidi, field, 'sy_proto1_m1', pick, `Prototype 1 seeded motif (${pick.op})`);
    return { motifMidi: varied.midi, motifId: varied.motifId };
  } catch {
    return { motifMidi: [...baseMidi], motifId: 'sy_proto1_m1' };
  }
}

/** Seed → answer operator (still derived from motif via applyOperator). */
function proto1SeededAnswerOp(seed: number): Proto1PitchOp {
  const rng = mulberry32((seed ^ 0x595002) >>> 0 || 1);
  return PROTO1_SEEDED_ANSWER_OPS[Math.floor(rng() * PROTO1_SEEDED_ANSWER_OPS.length)]!;
}

/**
 * Bars 1–2 G1 statement: distinctive 4-note cell with rests + rhythmic variation.
 * Bars 3–4: no melody events (idle triad keeps a single chord voice only).
 * Verified no-seed rhythm — do not alter.
 */
function proto1Guitar1MelodicBars(
  motifMidi: readonly number[],
  motifId: string = 'sy_proto1_m1'
): SyProtoProto1MelodicEvent[][] {
  const [n0, n1, n2, n3] = motifMidi;
  return [
    // Bar 1: G4 q · rest ⅛ · F♯4 ⅛ · rest q · C♯5 q — first three motif notes
    [
      createNote(n0!, 0, 1, PROTO1_MELODY_VOICE, motifId),
      createRest(1, 0.5, PROTO1_MELODY_VOICE),
      createNote(n1!, 1.5, 0.5, PROTO1_MELODY_VOICE, motifId),
      createRest(2, 1, PROTO1_MELODY_VOICE),
      createNote(n2!, 3, 1, PROTO1_MELODY_VOICE, motifId),
    ],
    // Bar 2: rest ½ · C5 ½ — fourth motif note; delayed entry
    [
      createRest(0, 2, PROTO1_MELODY_VOICE),
      createNote(n3!, 2, 2, PROTO1_MELODY_VOICE, motifId),
    ],
    [],
    [],
  ];
}

/**
 * Bar 1: idle (G1 alone). Bar 2: enter under G1’s delayed C5 — genuine overlap.
 * Bars 3–4: continue invert-in-field answer with different rhythm.
 * Verified no-seed rhythm — do not alter.
 */
function proto1Guitar2MelodicBars(
  answerMidi: readonly number[],
  answerMotifId: string
): SyProtoProto1MelodicEvent[][] {
  const [a0, a1, a2, a3] = answerMidi;
  return [
    [],
    // Bar 2: rest q · a0 q · a1 ½ — enters beat 1; overlaps G1 C5 (beats 2–4)
    [
      createRest(0, 1, PROTO1_MELODY_VOICE),
      createNote(a0!, 1, 1, PROTO1_MELODY_VOICE, answerMotifId),
      createNote(a1!, 2, 2, PROTO1_MELODY_VOICE, answerMotifId),
    ],
    // Bar 3: rest ⅛ · a2 ⅛ · rest ⅛ · a3 q · rest ⅛ · a2 q
    [
      createRest(0, 0.5, PROTO1_MELODY_VOICE),
      createNote(a2!, 0.5, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
      createRest(1, 0.5, PROTO1_MELODY_VOICE),
      createNote(a3!, 1.5, 1, PROTO1_MELODY_VOICE, answerMotifId),
      createRest(2.5, 0.5, PROTO1_MELODY_VOICE),
      createNote(a2!, 3, 1, PROTO1_MELODY_VOICE, answerMotifId),
    ],
    // Bar 4: rest q · a3 dotted-half
    [
      createRest(0, 1, PROTO1_MELODY_VOICE),
      createNote(a3!, 1, 3, PROTO1_MELODY_VOICE, answerMotifId),
    ],
  ];
}

/** Seed → one of four fixed Proto1 rhythm profiles (seeds 1–4 are pairwise distinct). */
function proto1SeededRhythmProfileIndex(seed: number): 0 | 1 | 2 | 3 {
  return ((((seed - 1) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

/**
 * Seeded G1 rhythm: same 4 motif pitches, varied attacks/durations.
 * Bars 3–4 stay empty. Each profile keeps a bar-2 sustain for G2 overlap.
 */
function proto1Guitar1MelodicBarsSeeded(
  motifMidi: readonly number[],
  motifId: string,
  seed: number
): SyProtoProto1MelodicEvent[][] {
  const [n0, n1, n2, n3] = motifMidi;
  const profile = proto1SeededRhythmProfileIndex(seed);
  switch (profile) {
    case 0:
      // Seed 1: pickup → offbeat cell; n3 from beat 1
      return [
        [
          createRest(0, 0.5, PROTO1_MELODY_VOICE),
          createNote(n0!, 0.5, 1, PROTO1_MELODY_VOICE, motifId),
          createRest(1.5, 0.5, PROTO1_MELODY_VOICE),
          createNote(n1!, 2, 0.5, PROTO1_MELODY_VOICE, motifId),
          createNote(n2!, 2.5, 1.5, PROTO1_MELODY_VOICE, motifId),
        ],
        [
          createRest(0, 1, PROTO1_MELODY_VOICE),
          createNote(n3!, 1, 3, PROTO1_MELODY_VOICE, motifId),
        ],
        [],
        [],
      ];
    case 1:
      // Seed 2: compressed front, gap, late n2; n3 early in bar 2
      return [
        [
          createNote(n0!, 0, 0.5, PROTO1_MELODY_VOICE, motifId),
          createNote(n1!, 0.5, 1.5, PROTO1_MELODY_VOICE, motifId),
          createRest(2, 1, PROTO1_MELODY_VOICE),
          createNote(n2!, 3, 1, PROTO1_MELODY_VOICE, motifId),
        ],
        [
          createRest(0, 0.5, PROTO1_MELODY_VOICE),
          createNote(n3!, 0.5, 2, PROTO1_MELODY_VOICE, motifId),
          createRest(2.5, 1.5, PROTO1_MELODY_VOICE),
        ],
        [],
        [],
      ];
    case 2:
      // Seed 3: long–short–short; late n3 under G2
      return [
        [
          createNote(n0!, 0, 2, PROTO1_MELODY_VOICE, motifId),
          createRest(2, 0.5, PROTO1_MELODY_VOICE),
          createNote(n1!, 2.5, 0.5, PROTO1_MELODY_VOICE, motifId),
          createNote(n2!, 3, 1, PROTO1_MELODY_VOICE, motifId),
        ],
        [
          createRest(0, 2.5, PROTO1_MELODY_VOICE),
          createNote(n3!, 2.5, 1.5, PROTO1_MELODY_VOICE, motifId),
        ],
        [],
        [],
      ];
    case 3:
      // Seed 4: even quarters; n3 occupies first half of bar 2
      return [
        [
          createNote(n0!, 0, 1, PROTO1_MELODY_VOICE, motifId),
          createRest(1, 1, PROTO1_MELODY_VOICE),
          createNote(n1!, 2, 1, PROTO1_MELODY_VOICE, motifId),
          createNote(n2!, 3, 1, PROTO1_MELODY_VOICE, motifId),
        ],
        [
          createNote(n3!, 0, 2, PROTO1_MELODY_VOICE, motifId),
          createRest(2, 2, PROTO1_MELODY_VOICE),
        ],
        [],
        [],
      ];
  }
}

/**
 * Seeded G2 rhythm: same answer pitches / note count; varied entry + durations.
 * Bar 1 idle; bar 2 always overlaps G1's bar-2 melody.
 */
function proto1Guitar2MelodicBarsSeeded(
  answerMidi: readonly number[],
  answerMotifId: string,
  seed: number
): SyProtoProto1MelodicEvent[][] {
  const [a0, a1, a2, a3] = answerMidi;
  const profile = proto1SeededRhythmProfileIndex(seed);
  switch (profile) {
    case 0:
      // Seed 1: enter beat 0.5
      return [
        [],
        [
          createRest(0, 0.5, PROTO1_MELODY_VOICE),
          createNote(a0!, 0.5, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a1!, 1, 3, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createNote(a2!, 0, 1, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(1, 0.5, PROTO1_MELODY_VOICE),
          createNote(a3!, 1.5, 1.5, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(3, 0.5, PROTO1_MELODY_VOICE),
          createNote(a2!, 3.5, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createRest(0, 2, PROTO1_MELODY_VOICE),
          createNote(a3!, 2, 2, PROTO1_MELODY_VOICE, answerMotifId),
        ],
      ];
    case 1:
      // Seed 2: enter on downbeat
      return [
        [],
        [
          createNote(a0!, 0, 1.5, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a1!, 1.5, 2.5, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createRest(0, 1, PROTO1_MELODY_VOICE),
          createNote(a2!, 1, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a3!, 1.5, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(2, 0.5, PROTO1_MELODY_VOICE),
          createNote(a2!, 2.5, 1.5, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createRest(0, 0.5, PROTO1_MELODY_VOICE),
          createNote(a3!, 0.5, 3.5, PROTO1_MELODY_VOICE, answerMotifId),
        ],
      ];
    case 2:
      // Seed 3: late entry (beat 2) under delayed G1 n3
      return [
        [],
        [
          createRest(0, 2, PROTO1_MELODY_VOICE),
          createNote(a0!, 2, 1, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a1!, 3, 1, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createNote(a2!, 0, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(0.5, 1, PROTO1_MELODY_VOICE),
          createNote(a3!, 1.5, 1, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(2.5, 0.5, PROTO1_MELODY_VOICE),
          createNote(a2!, 3, 1, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createRest(0, 1.5, PROTO1_MELODY_VOICE),
          createNote(a3!, 1.5, 2.5, PROTO1_MELODY_VOICE, answerMotifId),
        ],
      ];
    case 3:
      // Seed 4: enter beat 1 against early G1 n3
      return [
        [],
        [
          createRest(0, 1, PROTO1_MELODY_VOICE),
          createNote(a0!, 1, 1, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a1!, 2, 2, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createRest(0, 0.5, PROTO1_MELODY_VOICE),
          createNote(a2!, 0.5, 1.5, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a3!, 2, 1, PROTO1_MELODY_VOICE, answerMotifId),
          createNote(a2!, 3, 1, PROTO1_MELODY_VOICE, answerMotifId),
        ],
        [
          createNote(a3!, 0, 3, PROTO1_MELODY_VOICE, answerMotifId),
          createRest(3, 1, PROTO1_MELODY_VOICE),
        ],
      ];
  }
}

function collectToneRoleReceipts(
  pairs: readonly SyProtoPolychordPair[],
  guitar1Bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  guitar2Bars: readonly (readonly SyProtoProto1MelodicEvent[])[]
): SyProtoProto1ToneRoleReceipt[] {
  const out: SyProtoProto1ToneRoleReceipt[] = [];
  const pushBar = (
    bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
    guitar: 'guitar1' | 'guitar2'
  ) => {
    bars.forEach((events, i) => {
      const pair = pairs[i] ?? pairs[pairs.length - 1]!;
      const bar = i + 1;
      for (const event of events) {
        if (event.kind !== 'note') continue;
        const role = classifySyProtoPolychordToneRole(event.pitch, pair);
        out.push({ midi: event.pitch, guitar, bar, role });
      }
    });
  };
  pushBar(guitar1Bars, 'guitar1');
  pushBar(guitar2Bars, 'guitar2');
  return out;
}

/** Nearest combined-field MIDI to `midi` (PC snap + nearby octave in melody band). */
function proto1SnapMidiToField(midi: number, field: readonly number[]): number {
  if (field.length === 0) return midi;
  const pc = normalizeRootPc(midi);
  let bestPc = normalizeRootPc(field[0]!);
  let bestDist = 99;
  for (const f of field) {
    const fPc = normalizeRootPc(f);
    const d = Math.min((pc - fPc + 12) % 12, (fPc - pc + 12) % 12);
    if (d < bestDist) {
      bestDist = d;
      bestPc = fPc;
    }
  }
  let best = bestPc;
  let bestAbs = Infinity;
  for (let m = bestPc; m <= 127; m += 12) {
    if (m < 0) continue;
    const abs = Math.abs(m - midi);
    if (abs < bestAbs) {
      bestAbs = abs;
      best = m;
    }
  }
  const clamped = proto1ClampMelodyRegister([best]);
  return clamped[0]!;
}

function proto1MapMidiSequenceIntoField(
  midis: readonly number[],
  field: readonly number[]
): number[] {
  return midis.map((m) => proto1SnapMidiToField(m, field));
}

function proto1CloneMelodicEvent(event: SyProtoProto1MelodicEvent): SyProtoProto1MelodicEvent {
  if (event.kind === 'note') {
    return { ...event };
  }
  return { ...event };
}

/** Tile the verified 4-bar call/response rhythm to `barCount` (preserves onsets/durations). */
function proto1TileMelodicBars(
  cycle: readonly (readonly SyProtoProto1MelodicEvent[])[],
  barCount: number
): SyProtoProto1MelodicEvent[][] {
  const out: SyProtoProto1MelodicEvent[][] = [];
  for (let i = 0; i < barCount; i++) {
    const src = cycle[i % cycle.length] ?? [];
    out.push(src.map(proto1CloneMelodicEvent));
  }
  return out;
}

/** Remap sounding note pitches into each bar's polychord field; rests/rhythms unchanged. */
function proto1MapMelodicBarsIntoPairs(
  bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  pairs: readonly SyProtoPolychordPair[]
): SyProtoProto1MelodicEvent[][] {
  return bars.map((events, i) => {
    const pair = pairs[i] ?? pairs[pairs.length - 1]!;
    const field = proto1CombinedField(pair);
    return events.map((event) => {
      if (event.kind !== 'note') return proto1CloneMelodicEvent(event);
      return { ...event, pitch: proto1SnapMidiToField(event.pitch, field) };
    });
  });
}

/**
 * User-rhythm-only field remap: snap into each bar's combined field while
 * preferring MIDI near the previous sounding note (voice continuity).
 * Onsets/durations/rests unchanged. Legacy no-slots path keeps {@link proto1MapMelodicBarsIntoPairs}.
 */
function proto1MapMelodicBarsIntoPairsContinuity(
  bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  pairs: readonly SyProtoPolychordPair[],
  seed: number | undefined
): SyProtoProto1MelodicEvent[][] {
  let prevMidi: number | null = null;
  let noteIndex = 0;
  return bars.map((events, i) => {
    const pair = pairs[i] ?? pairs[pairs.length - 1]!;
    const field = proto1CombinedField(pair);
    const candidates = proto1UserRhythmFieldMidiCandidates(field);
    return events.map((event) => {
      if (event.kind !== 'note') return proto1CloneMelodicEvent(event);
      const pitch =
        candidates.length === 0
          ? proto1SnapMidiToField(event.pitch, field)
          : proto1PickUserRhythmContinuityPitch(
              candidates,
              prevMidi,
              noteIndex,
              seed,
              event.pitch
            );
      noteIndex += 1;
      prevMidi = pitch;
      return { ...event, pitch };
    });
  });
}

/** Melody-band MIDI for every PC in `field` (or motif pitches). */
function proto1UserRhythmFieldMidiCandidates(field: readonly number[]): number[] {
  const pcs = new Set<number>();
  for (const m of field) pcs.add(normalizeRootPc(m));
  const out: number[] = [];
  for (let m = PROTO1_MELODY_MIDI_MIN; m <= PROTO1_MELODY_MIDI_MAX; m++) {
    if (pcs.has(normalizeRootPc(m))) out.push(m);
  }
  return out;
}

/**
 * Pick next user-rhythm pitch: prefer small motion from `prevMidi` within candidates;
 * ~20% seed-driven leaps capped at {@link PROTO1_USER_RHYTHM_MAX_LEAP}; avoid stale unisons.
 * `hintMidi` biases first note / ties toward motif intent.
 */
function proto1PickUserRhythmContinuityPitch(
  candidates: readonly number[],
  prevMidi: number | null,
  noteIndex: number,
  seed: number | undefined,
  hintMidi?: number
): number {
  if (candidates.length === 0) {
    throw new Error('proto1PickUserRhythmContinuityPitch: empty candidates');
  }
  if (prevMidi == null) {
    if (hintMidi != null) {
      let best = candidates[0]!;
      let bestAbs = Math.abs(best - hintMidi);
      for (const c of candidates) {
        const abs = Math.abs(c - hintMidi);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = c;
        }
      }
      return best;
    }
    if (seed === undefined) return candidates[0]!;
    return candidates[((seed % candidates.length) + candidates.length) % candidates.length]!;
  }

  const withinLeap = candidates.filter(
    (c) => Math.abs(c - prevMidi) <= PROTO1_USER_RHYTHM_MAX_LEAP
  );
  // Always have a pick: if field forces a larger jump, take absolute nearest.
  const pool = withinLeap.length > 0 ? withinLeap : candidates;

  const ranked = [...pool].sort((a, b) => {
    const da = Math.abs(a - prevMidi);
    const db = Math.abs(b - prevMidi);
    if (da !== db) return da - db;
    if (hintMidi != null) {
      const ha = Math.abs(a - hintMidi);
      const hb = Math.abs(b - hintMidi);
      if (ha !== hb) return ha - hb;
    }
    return a - b;
  });

  const rng = mulberry32((((seed ?? 0) >>> 0) + noteIndex * 9973 + 0x51eed) >>> 0);
  // Occasional leap (~20%) among farther tones still inside the playable leap cap.
  if (rng() < 0.2) {
    const leapPool = ranked.filter((p) => {
      const d = Math.abs(p - prevMidi);
      return d >= 5 && d <= PROTO1_USER_RHYTHM_MAX_LEAP;
    });
    if (leapPool.length > 0) {
      return leapPool[Math.floor(rng() * leapPool.length) % leapPool.length]!;
    }
  }

  if (ranked[0] === prevMidi) {
    const step = ranked.find((p) => p !== prevMidi && Math.abs(p - prevMidi) <= 7);
    if (step != null) return step;
    if (ranked.length > 1) return ranked[1]!;
  }
  return ranked[0]!;
}

/**
 * Realize one bar of chord-grip rhythm slots into ChordEvent / RestEvent.
 * Note → playable triad grip (same PCs); repeated attacks prefer alternate min-move voicings.
 * Rest → silence. Contiguous full-bar coverage required. Onsets/durations unchanged.
 * Voice stays {@link PROTO1_CHORD_VOICE}-ready default (voice 1); overlay remaps under melody.
 */
function proto1ChordGripEventsFromRhythmSlots(
  slots: readonly SyProto1ChordRhythmSlot[],
  opens: readonly number[],
  legacyPitches: readonly number[],
  chordSymbol: string | undefined,
  barLabel: string,
  guitarLabel: 'Guitar 1' | 'Guitar 2',
  priorMidis: readonly number[] | null,
  voice = 1,
  fretPosition?: SyProto1FretPosition | null,
  voiceLeading?: SyProto1VoiceLeadingMode | null
): { events: ScoreEvent[]; lastPitches: number[] | null } {
  if (slots.length === 0) return { events: [], lastPitches: priorMidis?.slice() ?? null };
  if (legacyPitches.length === 0) {
    throw new Error(`${barLabel}: cannot fill chord note slots without grip pitches`);
  }
  const pcs = [...new Set(legacyPitches.map(normalizeRootPc))];
  let cursor = q(0, 1);
  const events: ScoreEvent[] = [];
  let prior: readonly number[] | null = priorMidis;
  let lastPitches: number[] | null = priorMidis?.slice() ?? null;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    const slotLabel = `${barLabel} slot ${i + 1}`;
    if (slot.kind !== 'note' && slot.kind !== 'rest') {
      throw new Error(`${slotLabel}: kind must be 'note' or 'rest'`);
    }
    const exact = proto1PianoExactFromSlot(
      slot.onsetQ,
      slot.durationQ,
      `sy_proto1_chord_${barLabel.replace(/\s+/g, '_')}_s${i + 1}`,
      slotLabel
    );
    if (!qEq(exact.onsetQ, cursor)) {
      throw new Error(
        `${slotLabel}: onset ${exact.onsetQ.n}/${exact.onsetQ.d} != cursor ${cursor.n}/${cursor.d} (no gap/overlap repair)`
      );
    }
    const startBeat = qToNumber(exact.onsetQ);
    const duration = qToNumber(exact.durationQ);
    if (!floatsAgree(startBeat, exact.onsetQ) || !floatsAgree(duration, exact.durationQ)) {
      throw new Error(`${slotLabel}: float timing drifted from exact rationals`);
    }
    if (slot.kind === 'rest') {
      events.push({
        kind: 'rest',
        startBeat,
        duration,
        voice,
        pianoExact: exact,
      });
    } else {
      // First attack with no prior → legacy progression grip (existing fallback).
      // Later / cross-bar attacks → voice-leading policy (omit = hybrid).
      const pitches =
        prior == null
          ? [...legacyPitches].sort((a, b) => a - b)
          : pickPlayableTriadGrip(opens, pcs, guitarLabel, prior, fretPosition, voiceLeading);
      events.push(chordAt(pitches, startBeat, duration, voice, chordSymbol));
      prior = pitches;
      lastPitches = pitches;
    }
    cursor = qAdd(cursor, exact.durationQ);
  }
  if (!qEq(cursor, PROTO1_BAR_SPAN_Q)) {
    throw new Error(
      `${barLabel}: duration sum ${cursor.n}/${cursor.d} != ${PROTO1_BAR_SPAN_Q.n}/${PROTO1_BAR_SPAN_Q.d} (no silent repair)`
    );
  }
  return { events, lastPitches };
}

/**
 * Apply optional user chord-grip rhythms to a progression score.
 * Omitted guitar / empty bar → leave legacy whole-note triad events untouched.
 * Repeated note attacks (and across bars) pick alternate playable voicings with min pitch motion.
 */
function applyProto1ChordRhythmSlotsToProgression(
  progression: SonicYouthPolychordProgressionResult,
  chordRhythm: SyProto1ChordRhythmSlots | undefined,
  gripPolicy?: {
    guitar1FretPosition?: SyProto1FretPosition;
    guitar2FretPosition?: SyProto1FretPosition;
    guitar1VoiceLeading?: SyProto1VoiceLeadingMode;
    guitar2VoiceLeading?: SyProto1VoiceLeadingMode;
  }
): SonicYouthPolychordProgressionResult {
  if (chordRhythm == null) return progression;
  const barCount = progression.bars.length;
  const applyGuitar = (
    partId: 'guitar' | 'guitar_2',
    opens: readonly number[],
    slotsByBar: readonly (readonly SyProto1ChordRhythmSlot[])[] | undefined,
    label: string,
    guitarLabel: 'Guitar 1' | 'Guitar 2',
    fretPosition?: SyProto1FretPosition,
    voiceLeading?: SyProto1VoiceLeadingMode
  ): PartModel | null => {
    if (slotsByBar == null) return null;
    if (slotsByBar.length !== barCount) {
      throw new Error(
        `Prototype 1 chordRhythmSlots.${label} length ${slotsByBar.length} != bar count ${barCount}`
      );
    }
    const part = progression.score.parts.find((p) => p.id === partId);
    if (!part || part.measures.length !== barCount) {
      throw new Error(`Prototype 1 chord rhythm: missing ${partId} measures`);
    }
    let prior: readonly number[] | null = null;
    return {
      ...part,
      measures: part.measures.map((measure, i) => {
        const slots = slotsByBar[i] ?? [];
        const legacyChord = measure.events.find((e): e is ChordEvent => e.kind === 'chord');
        if (slots.length === 0) {
          // Empty bar entry → preserve legacy whole-note grip; still carry prior across bars.
          if (legacyChord != null && legacyChord.pitches.length > 0) {
            prior = [...legacyChord.pitches];
          }
          const m = createMeasure(measure.index, measure.chord, measure.rehearsalMark);
          for (const e of measure.events) addEvent(m, e);
          return m;
        }
        const pitches = legacyChord?.pitches ?? [];
        const chordSymbol =
          legacyChord?.chordSymbol === null ? undefined : legacyChord?.chordSymbol ?? undefined;
        const realized = proto1ChordGripEventsFromRhythmSlots(
          slots,
          opens,
          pitches,
          chordSymbol,
          `${label} bar ${i + 1}`,
          guitarLabel,
          prior,
          legacyChord?.voice ?? 1,
          fretPosition,
          voiceLeading
        );
        prior = realized.lastPitches;
        const m = createMeasure(measure.index, measure.chord, measure.rehearsalMark);
        for (const e of realized.events) addEvent(m, e);
        return m;
      }),
    };
  };

  const g1 = applyGuitar(
    'guitar',
    progression.guitar1OpenPitches,
    chordRhythm.guitar1,
    'guitar1',
    'Guitar 1',
    gripPolicy?.guitar1FretPosition,
    gripPolicy?.guitar1VoiceLeading
  );
  const g2 = applyGuitar(
    'guitar_2',
    progression.guitar2OpenPitches,
    chordRhythm.guitar2,
    'guitar2',
    'Guitar 2',
    gripPolicy?.guitar2FretPosition,
    gripPolicy?.guitar2VoiceLeading
  );
  if (g1 == null && g2 == null) return progression;

  const parts = progression.score.parts.map((p) => {
    if (p.id === 'guitar' && g1 != null) return g1;
    if (p.id === 'guitar_2' && g2 != null) return g2;
    return p;
  });
  const score = createScore(progression.score.title, parts, {
    tempo: progression.score.tempo ?? 96,
  });
  if (progression.score.partMeasureWordsMarkings) {
    score.partMeasureWordsMarkings = progression.score.partMeasureWordsMarkings;
  }
  if (progression.score.exportStaffTuningByPartId) {
    score.exportStaffTuningByPartId = progression.score.exportStaffTuningByPartId;
  }
  return { ...progression, score };
}

function overlayMelodyOnChordScore(
  chordBars: SonicYouthPolychordProgressionResult,
  guitar1Bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  guitar2Bars: readonly (readonly SyProtoProto1MelodicEvent[])[]
): ScoreModel {
  const g1 = chordBars.score.parts.find((p) => p.id === 'guitar');
  const g2 = chordBars.score.parts.find((p) => p.id === 'guitar_2');
  const barCount = chordBars.bars.length;
  if (
    !g1 ||
    !g2 ||
    g1.measures.length !== barCount ||
    g2.measures.length !== barCount ||
    guitar1Bars.length !== barCount ||
    guitar2Bars.length !== barCount
  ) {
    throw new Error(
      `Prototype 1 expects matching dual-guitar chord + melody bar counts (got chords=${barCount}, g1m=${g1?.measures.length}, g2m=${g2?.measures.length}, mel1=${guitar1Bars.length}, mel2=${guitar2Bars.length})`
    );
  }

  const overlay = (part: PartModel, melodicBars: readonly (readonly SyProtoProto1MelodicEvent[])[]): PartModel => ({
    ...part,
    measures: part.measures.map((measure, i) => {
      const melody = melodicBars[i] ?? [];
      const hasMelody = melody.length > 0;
      const m = createMeasure(measure.index, measure.chord, measure.rehearsalMark);
      for (const event of measure.events) {
        if (
          hasMelody &&
          (event.kind === 'note' || event.kind === 'rest' || event.kind === 'chord')
        ) {
          addEvent(m, { ...event, voice: PROTO1_CHORD_VOICE });
        } else {
          addEvent(m, event);
        }
      }
      for (const event of melody) addEvent(m, event as ScoreEvent);
      return m;
    }),
  });

  const score = createScore('Sonic Youth Prototype 1 polychord melodic dialogue', [
    overlay(g1, guitar1Bars),
    overlay(g2, guitar2Bars),
  ], {
    tempo: chordBars.score.tempo ?? 96,
  });
  if (chordBars.score.partMeasureWordsMarkings) {
    score.partMeasureWordsMarkings = chordBars.score.partMeasureWordsMarkings;
  }
  if (chordBars.score.exportStaffTuningByPartId) {
    score.exportStaffTuningByPartId = chordBars.score.exportStaffTuningByPartId;
  }
  return applyGuitarWrittenOctaveNotation(score);
}

/**
 * Store written MIDI (sounding +12) on guitar note/chord events and attach
 * exporter `exportPartTranspose` octave-change −1 so concert pitch is unchanged.
 * Durations, voices, part names, and tuning metadata stay intact.
 */
function applyGuitarWrittenOctaveNotation(score: ScoreModel): ScoreModel {
  const t = GUITAR_OCTAVE_TRANSPOSITION;
  const shiftEvent = (event: ScoreEvent): ScoreEvent => {
    if (event.kind === 'note') {
      const written = soundingToWritten(event.pitch, t);
      return {
        ...event,
        pitch: written.midi,
        spelling: { step: written.step, alter: written.alter },
      };
    }
    if (event.kind === 'chord') {
      return {
        ...event,
        pitches: event.pitches.map((midi) => soundingToWritten(midi, t).midi),
      };
    }
    return event;
  };

  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures.map((measure) => ({
        ...measure,
        events: measure.events.map(shiftEvent),
      })),
    })),
    exportPartTranspose: {
      ...score.exportPartTranspose,
      guitar: t,
      guitar_2: t,
    },
  };
}

const PROTO1_BAR_SPAN_Q: ExactQuarter = q(BEATS_PER_MEASURE, 1);

function proto1NormalizeExactQuarter(value: ExactQuarter, label: string): ExactQuarter {
  if (!Number.isInteger(value.n) || !Number.isInteger(value.d) || value.d === 0) {
    throw new Error(`${label}: invalid ExactQuarter ${value.n}/${value.d}`);
  }
  return q(value.n, value.d);
}

function proto1PianoExactFromSlot(
  onsetQ: ExactQuarter,
  durationQ: ExactQuarter,
  logicalEventId: string,
  label: string
): PianoExactTiming {
  const onset = proto1NormalizeExactQuarter(onsetQ, `${label} onset`);
  const duration = proto1NormalizeExactQuarter(durationQ, `${label} duration`);
  if (qCmp(onset, q(0, 1)) < 0) {
    throw new Error(`${label}: onset must be >= 0 (got ${onset.n}/${onset.d})`);
  }
  if (qCmp(duration, q(0, 1)) <= 0) {
    throw new Error(`${label}: duration must be > 0 (got ${duration.n}/${duration.d})`);
  }
  if (integralTicks(onset, PIANO_V11_EXPORT_PPQ) === null) {
    throw new Error(`${label}: onset ${onset.n}/${onset.d} not integral at PPQ ${PIANO_V11_EXPORT_PPQ}`);
  }
  if (integralTicks(duration, PIANO_V11_EXPORT_PPQ) === null) {
    throw new Error(`${label}: duration ${duration.n}/${duration.d} not integral at PPQ ${PIANO_V11_EXPORT_PPQ}`);
  }
  const spelled = spellStraight(duration);
  if (spelled.length !== 1) {
    throw new Error(
      `${label}: duration ${duration.n}/${duration.d} is not a single written value (no silent tie-split repair)`
    );
  }
  const written = spelled[0]!;
  return {
    onsetQ: onset,
    durationQ: duration,
    writtenType: written.type,
    dots: written.dots,
    logicalEventId,
  };
}

/**
 * Realize user rhythm slots into melodic events.
 * Note slots pick chord-field pitches with voice continuity across bars
 * (near previous note; occasional seed-driven leaps); rests keep timing only.
 * Non-empty bars must cover exactly one 4/4 bar with contiguous onsets — no gap/overlap/pad repair.
 */
function proto1MelodicBarsFromRhythmSlots(
  slotsByBar: readonly (readonly SyProto1MelodicRhythmSlot[])[],
  pitches: readonly number[],
  motifId: string,
  label: string,
  seed?: number
): SyProtoProto1MelodicEvent[][] {
  if (pitches.length === 0) {
    throw new Error(`${label}: cannot fill note slots without pitches`);
  }
  const candidates = proto1UserRhythmFieldMidiCandidates(pitches);
  if (candidates.length === 0) {
    throw new Error(`${label}: no melody-band candidates from pitch pool`);
  }
  let prevMidi: number | null = null;
  let noteIndex = 0;
  let motifHintIndex = 0;
  return slotsByBar.map((slots, barIndex) => {
    const barLabel = `${label} bar ${barIndex + 1}`;
    if (slots.length === 0) return [];

    let cursor = q(0, 1);
    const events: SyProtoProto1MelodicEvent[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      const slotLabel = `${barLabel} slot ${i + 1}`;
      if (slot.kind !== 'note' && slot.kind !== 'rest') {
        throw new Error(`${slotLabel}: kind must be 'note' or 'rest'`);
      }
      const exact = proto1PianoExactFromSlot(
        slot.onsetQ,
        slot.durationQ,
        `sy_proto1_${label}_b${barIndex + 1}_s${i + 1}`,
        slotLabel
      );
      if (!qEq(exact.onsetQ, cursor)) {
        throw new Error(
          `${slotLabel}: onset ${exact.onsetQ.n}/${exact.onsetQ.d} != cursor ${cursor.n}/${cursor.d} (no gap/overlap repair)`
        );
      }
      const startBeat = qToNumber(exact.onsetQ);
      const duration = qToNumber(exact.durationQ);
      if (!floatsAgree(startBeat, exact.onsetQ) || !floatsAgree(duration, exact.durationQ)) {
        throw new Error(`${slotLabel}: float timing drifted from exact rationals`);
      }
      if (slot.kind === 'rest') {
        events.push({
          kind: 'rest',
          startBeat,
          duration,
          voice: PROTO1_MELODY_VOICE,
          pianoExact: exact,
        });
      } else {
        const hint = pitches[motifHintIndex % pitches.length]!;
        motifHintIndex += 1;
        const pitch = proto1PickUserRhythmContinuityPitch(
          candidates,
          prevMidi,
          noteIndex,
          seed,
          hint
        );
        noteIndex += 1;
        prevMidi = pitch;
        events.push({
          kind: 'note',
          pitch,
          startBeat,
          duration,
          voice: PROTO1_MELODY_VOICE,
          motifRef: motifId,
          pianoExact: exact,
        });
      }
      cursor = qAdd(cursor, exact.durationQ);
    }
    if (!qEq(cursor, PROTO1_BAR_SPAN_Q)) {
      throw new Error(
        `${barLabel}: duration sum ${cursor.n}/${cursor.d} != ${PROTO1_BAR_SPAN_Q.n}/${PROTO1_BAR_SPAN_Q.d} (no silent repair)`
      );
    }
    return events;
  });
}

/**
 * Prototype 1 — call/response melodic dialogue over dual-guitar polychords.
 * Default `harmonyMode: 'fixed'` = verified 4-bar C + F♯m (compat).
 * `harmonyMode: 'adaptive'` = seeded {@link planSyProto1PolychordBars} (default 8 bars),
 * motif/answer mapped into each bar's combined field; rhythms tiled from Proto1 cycle.
 * Optional `polychordBars` = exact user pairs (overrides planner / fixed defaults); maps melody into those fields.
 * Optional `melodicRhythmSlots` = user G1/G2 note/rest timing (pitches fill note slots; invalid bar durations throw).
 * Optional `chordRhythmSlots` = user G1/G2 chord-grip note/rest timing (omit → whole-note grips; invalid bars throw).
 * Chord grips via {@link buildSonicYouthPolychordProgressionScore}; custom tunings pass through.
 * Optional `harmonicVariant: 'B'` remains fixed-mode research only (ignored when user pairs supplied).
 */
export function buildSonicYouthProto1MelodicDialogue(
  options?: SonicYouthProto1MelodicDialogueOptions
): SyProtoProto1MelodicDialogueResult {
  const harmonyMode: SyProto1HarmonyMode =
    options?.harmonyMode === 'adaptive' ? 'adaptive' : 'fixed';
  const seed = options?.seed;
  const userPairs = normalizeSyProto1UserPolychordBars(options?.polychordBars ?? null);
  const mapIntoBarFields = userPairs != null || harmonyMode === 'adaptive';
  const harmonicVariant: SyProto1HarmonicVariant =
    userPairs == null && harmonyMode === 'fixed' && options?.harmonicVariant === 'B' ? 'B' : 'A';

  const gripOpts: SonicYouthPolychordGripOptions | undefined =
    options == null
      ? undefined
      : {
          ...(options.guitar1Tuning != null ? { guitar1Tuning: options.guitar1Tuning } : {}),
          ...(options.guitar2Tuning != null ? { guitar2Tuning: options.guitar2Tuning } : {}),
          ...(options.guitar1FretPosition != null
            ? { guitar1FretPosition: options.guitar1FretPosition }
            : {}),
          ...(options.guitar2FretPosition != null
            ? { guitar2FretPosition: options.guitar2FretPosition }
            : {}),
          ...(options.guitar1VoiceLeading != null
            ? { guitar1VoiceLeading: options.guitar1VoiceLeading }
            : {}),
          ...(options.guitar2VoiceLeading != null
            ? { guitar2VoiceLeading: options.guitar2VoiceLeading }
            : {}),
        };
  const tuningForProgression =
    gripOpts &&
    (gripOpts.guitar1Tuning != null ||
      gripOpts.guitar2Tuning != null ||
      gripOpts.guitar1FretPosition != null ||
      gripOpts.guitar2FretPosition != null ||
      gripOpts.guitar1VoiceLeading != null ||
      gripOpts.guitar2VoiceLeading != null)
      ? gripOpts
      : undefined;

  const pairs: SyProtoPolychordPair[] =
    userPairs != null
      ? userPairs
      : harmonyMode === 'adaptive'
        ? planSyProto1PolychordBars(
            seed === undefined ? 1 : seed,
            options?.barCount !== undefined && Number.isFinite(options.barCount)
              ? Math.max(1, Math.floor(options.barCount))
              : 8
          )
        : [
            SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
            SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
            SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
            SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
          ];

  const pair = pairs[0]!;
  const combinedField = proto1CombinedField(pair);
  if (!mapIntoBarFields && combinedField.length !== 6) {
    throw new Error(`Prototype 1 expected 6-note combined field, got ${combinedField.length}`);
  }
  // User polychordBars may declare identical / same-set parents (3-PC union).
  // Adaptive planner path keeps the 4-PC floor (syProto1PlannerCandidates).
  if (mapIntoBarFields) {
    const minCombinedPcs = userPairs != null ? 3 : 4;
    if (combinedField.length < minCombinedPcs) {
      throw new Error(
        userPairs != null
          ? `Prototype 1 user polychord expected combined field of at least 3 pcs, got ${combinedField.length}`
          : `Prototype 1 adaptive expected combined field of at least 4 pcs, got ${combinedField.length}`
      );
    }
  }

  let motifMidi: number[];
  let motifId: string;
  let answerMidi: number[];
  let answerMotifId: string;

  if (seed === undefined) {
    motifMidi = mapIntoBarFields
      ? proto1MapMidiSequenceIntoField(SY_PROTO1_MOTIF_MIDI, combinedField)
      : [...SY_PROTO1_MOTIF_MIDI];
    motifId = 'sy_proto1_m1';
    const answer = proto1AnswerMidiFromMotif(motifMidi, combinedField);
    answerMidi = mapIntoBarFields
      ? proto1MapMidiSequenceIntoField(answer.answerMidi, combinedField)
      : answer.answerMidi;
    answerMotifId = answer.motifId;
  } else {
    const seedBaseMidi = mapIntoBarFields
      ? proto1MapMidiSequenceIntoField(SY_PROTO1_MOTIF_MIDI, combinedField)
      : [...SY_PROTO1_MOTIF_MIDI];
    const seededMotif = proto1SeededMotifMidi(seedBaseMidi, combinedField, seed);
    motifMidi = mapIntoBarFields
      ? proto1MapMidiSequenceIntoField(seededMotif.motifMidi, combinedField)
      : seededMotif.motifMidi;
    motifId = seededMotif.motifId;
    try {
      const answer = proto1SeededAnswerMidiFromMotif(
        motifMidi,
        combinedField,
        motifId,
        proto1SeededAnswerOp(seed)
      );
      answerMidi = mapIntoBarFields
        ? proto1MapMidiSequenceIntoField(answer.answerMidi, combinedField)
        : answer.answerMidi;
      answerMotifId = answer.motifId;
    } catch {
      const answer = proto1AnswerMidiFromMotif(motifMidi, combinedField);
      answerMidi = mapIntoBarFields
        ? proto1MapMidiSequenceIntoField(answer.answerMidi, combinedField)
        : answer.answerMidi;
      answerMotifId = answer.motifId;
    }
  }

  for (const midi of motifMidi) {
    assertPitchInCombinedField(midi, pair, 'Prototype 1 motif');
  }
  for (const midi of answerMidi) {
    assertPitchInCombinedField(midi, pair, 'Prototype 1 answer');
  }

  const userRhythm = options?.melodicRhythmSlots;
  const userG1Slots = userRhythm?.guitar1;
  const userG2Slots = userRhythm?.guitar2;

  let guitar1MelodicEventsByBar: SyProtoProto1MelodicEvent[][];
  if (userG1Slots != null) {
    if (userG1Slots.length !== pairs.length) {
      throw new Error(
        `Prototype 1 melodicRhythmSlots.guitar1 length ${userG1Slots.length} != bar count ${pairs.length}`
      );
    }
    guitar1MelodicEventsByBar = proto1MelodicBarsFromRhythmSlots(
      userG1Slots,
      motifMidi,
      motifId,
      'guitar1',
      seed
    );
  } else {
    const cycleG1 =
      seed === undefined
        ? proto1Guitar1MelodicBars(motifMidi, motifId)
        : proto1Guitar1MelodicBarsSeeded(motifMidi, motifId, seed);
    guitar1MelodicEventsByBar = proto1TileMelodicBars(cycleG1, pairs.length);
  }

  let guitar2MelodicEventsByBar: SyProtoProto1MelodicEvent[][];
  if (userG2Slots != null) {
    if (userG2Slots.length !== pairs.length) {
      throw new Error(
        `Prototype 1 melodicRhythmSlots.guitar2 length ${userG2Slots.length} != bar count ${pairs.length}`
      );
    }
    guitar2MelodicEventsByBar = proto1MelodicBarsFromRhythmSlots(
      userG2Slots,
      answerMidi,
      answerMotifId,
      'guitar2',
      seed
    );
  } else {
    const cycleG2 =
      seed === undefined
        ? proto1Guitar2MelodicBars(answerMidi, answerMotifId)
        : proto1Guitar2MelodicBarsSeeded(answerMidi, answerMotifId, seed);
    guitar2MelodicEventsByBar = proto1TileMelodicBars(cycleG2, pairs.length);
  }

  if (mapIntoBarFields) {
    // User-rhythm voices: continuity snap. No-slots legacy: exact prior PC snap.
    guitar1MelodicEventsByBar =
      userG1Slots != null
        ? proto1MapMelodicBarsIntoPairsContinuity(guitar1MelodicEventsByBar, pairs, seed)
        : proto1MapMelodicBarsIntoPairs(guitar1MelodicEventsByBar, pairs);
    guitar2MelodicEventsByBar =
      userG2Slots != null
        ? proto1MapMelodicBarsIntoPairsContinuity(guitar2MelodicEventsByBar, pairs, seed)
        : proto1MapMelodicBarsIntoPairs(guitar2MelodicEventsByBar, pairs);
  }

  const toneRoleReceipts = collectToneRoleReceipts(
    pairs,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar
  );

  const chordBarsRaw = buildSonicYouthPolychordProgressionScore(pairs, tuningForProgression);
  const chordBars = applyProto1ChordRhythmSlotsToProgression(
    chordBarsRaw,
    options?.chordRhythmSlots,
    {
      ...(options?.guitar1FretPosition != null
        ? { guitar1FretPosition: options.guitar1FretPosition }
        : {}),
      ...(options?.guitar2FretPosition != null
        ? { guitar2FretPosition: options.guitar2FretPosition }
        : {}),
      ...(options?.guitar1VoiceLeading != null
        ? { guitar1VoiceLeading: options.guitar1VoiceLeading }
        : {}),
      ...(options?.guitar2VoiceLeading != null
        ? { guitar2VoiceLeading: options.guitar2VoiceLeading }
        : {}),
    }
  );
  const score = overlayMelodyOnChordScore(
    chordBars,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar
  );

  const base: SyProtoProto1MelodicDialogueResult = {
    pair,
    pairs,
    combinedField,
    motifMidi,
    answerMidi,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar,
    toneRoleReceipts,
    score,
    chordBars,
    harmonicVariant: 'A',
    harmonyMode,
  };

  if (harmonicVariant === 'B') {
    return {
      ...base,
      score: deriveSonicYouthProto1HarmonicVariantB(base),
      harmonicVariant: 'B',
    };
  }
  return base;
}

/** G2 bar-4 harmonic A/B: F♯ minor → F minor (−1 semitone). */
export const SY_PROTO1_AB_G2_BAR4_TRIAD: SyProtoTriadInput = {
  rootPc: 5,
  quality: 'minor',
};

function shiftScoreEventSemitones(event: ScoreEvent, semitones: number): ScoreEvent {
  if (event.kind === 'note') {
    const { spelling: _spelling, ...rest } = event;
    return { ...rest, pitch: event.pitch + semitones };
  }
  if (event.kind === 'chord') {
    const nextSymbol =
      event.chordSymbol === triadChordSymbol(SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR.guitar2)
        ? triadChordSymbol(SY_PROTO1_AB_G2_BAR4_TRIAD)
        : event.chordSymbol;
    return {
      ...event,
      pitches: event.pitches.map((p) => p + semitones),
      ...(nextSymbol !== undefined ? { chordSymbol: nextSymbol } : {}),
    };
  }
  return event;
}

function chordPitchesFromMeasure(measure: { events: readonly ScoreEvent[] }): number[] {
  for (const e of measure.events) {
    if (e.kind === 'chord' && e.pitches.length > 0) return [...e.pitches];
  }
  return [];
}

/**
 * Proto1 harmonic variant B score transform.
 * Identical to A except Guitar 2 bar 4 transposed −1 semitone (F♯m → Fm).
 * Used by {@link buildSonicYouthProto1MelodicDialogue} when `harmonicVariant: 'B'`.
 */
export function deriveSonicYouthProto1HarmonicVariantB(
  dialogue: SyProtoProto1MelodicDialogueResult
): ScoreModel {
  const score = dialogue.score;
  const g1 = score.parts.find((p) => p.id === 'guitar');
  const g2 = score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2 || g1.measures.length !== 4 || g2.measures.length !== 4) {
    throw new Error('Proto1 A/B variant B expects 4-bar guitar + guitar_2 score');
  }

  const g2Bar4Index = 3;
  const g2Measures = g2.measures.map((measure, i) => {
    if (i !== g2Bar4Index) return measure;
    const m = createMeasure(measure.index, measure.chord, measure.rehearsalMark);
    for (const event of measure.events) {
      addEvent(m, shiftScoreEventSemitones(event, -1));
    }
    return m;
  });

  const g1Bar4Pitches = chordPitchesFromMeasure(g1.measures[g2Bar4Index]!);
  const g2Bar4Pitches = chordPitchesFromMeasure(g2Measures[g2Bar4Index]!);
  const bar4Label = syProtoCombinedPolychordNotationLabel(
    {
      guitar1: SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR.guitar1,
      guitar2: SY_PROTO1_AB_G2_BAR4_TRIAD,
    },
    g1Bar4Pitches,
    g2Bar4Pitches
  );

  const words = { ...(score.partMeasureWordsMarkings?.guitar ?? {}) };
  words[4] = bar4Label;

  return {
    ...score,
    parts: [
      g1,
      {
        ...g2,
        measures: g2Measures,
      },
    ],
    partMeasureWordsMarkings: {
      ...score.partMeasureWordsMarkings,
      guitar: words,
    },
  };
}

/**
 * Four-bar Proto 1 is short-form: these GCE categories are structurally limited
 * (not craft failure by score alone). Numeric formulas/weights unchanged.
 */
export const SY_PROTO1_STRUCTURALLY_LIMITED_GCE_CATEGORIES: readonly GceCategory[] = [
  'thematicRecallPotential',
  'structureAndForm',
  'phraseGrammar',
] as const;

export type SyProto1GceStructuralLimitation = {
  category: GceCategory;
  structurallyLimited: true;
  reason: string;
};

/** Categories existing GCE scorers cannot interpret on two-guitar polychord Proto 1. */
export const SY_PROTO1_NOT_MEASURED_GCE_CATEGORIES: readonly GceCategory[] = [
  'harmonyAndLanguage',
  'arrangementAndOrchestration',
] as const;

export type SyProto1GceNotMeasured = {
  category: GceCategory;
  status: 'NOT MEASURED';
  reason: string;
};

/** Per-category report: numeric measurement or explicit NOT MEASURED. */
export type SyProto1GceCategoryReport = number | 'NOT MEASURED';

export type SyProto1MelodicDialogueGceResult = {
  /** Echo of options.seed when provided; undefined for verified no-seed Proto 1. */
  seed?: number;
  /**
   * Ten GCE V2 category slots. Harmony + Arrangement are `'NOT MEASURED'`;
   * other categories retain actual measured scores (unchanged formulas).
   */
  categoryScores: Record<GceCategory, SyProto1GceCategoryReport>;
  /** Measured categories only (excludes NOT MEASURED slots). */
  measuredCategoryScores: Partial<Record<GceCategory, number>>;
  /** Explicit NOT MEASURED receipts for polychord-uninterpretable categories. */
  notMeasuredCategories: readonly SyProto1GceNotMeasured[];
  /**
   * Weighted overall — suppressed (`null`) while any required category is NOT MEASURED.
   * Canonical weights/formulas unchanged; overall simply not reported incomplete.
   */
  overallScore: number | null;
  /**
   * PASS/FAIL — suppressed (`null`) while any required category is NOT MEASURED.
   * Nested `gce.pass` / `gce.finalScore` are diagnostic only in that case.
   */
  passFail: 'PASS' | 'FAIL' | null;
  /** Explicit short-form / four-bar caveats — measured scores still reported. */
  structurallyLimitedCategories: readonly SyProto1GceStructuralLimitation[];
  /** Full evaluator receipt (diagnostic; overall/pass not authoritative when unmeasured). */
  gce: GceEvaluationResult;
  dialogue: SyProtoProto1MelodicDialogueResult;
};

const PROTO1_SHORT_FORM_LIMIT_REASON =
  'Four-bar Proto 1 fragment: category is structurally limited on short-form material; interpret with caution (not automatic craft failure).';

const PROTO1_NOT_MEASURED_REASON =
  'Existing GCE scorers cannot interpret the two-guitar polychord representation.';

/**
 * Proto1 GCE chord strip: declared parents as slash polychord tokens (G1/G2).
 * Evaluation-only — does not mutate generated ScoreModel / MusicXML.
 */
export function syProto1GceChordStrip(
  pair: SyProtoPolychordPair = SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
  barCount = 4
): string[] {
  const token = `${triadChordSymbol(pair.guitar1)}/${triadChordSymbol(pair.guitar2)}`;
  return Array.from({ length: Math.max(1, barCount) }, () => token);
}

/**
 * Shallow measure.chord annotation for {@link chordsPerBarFromScore} / evaluateGce.
 * Notes, grips, voices, and part structure are unchanged (eval clone only).
 */
function scoreModelWithProto1GceChordStrip(
  score: ScoreModel,
  strip: readonly string[]
): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures.map((measure, i) => ({
        ...measure,
        chord: strip[i] ?? strip[strip.length - 1] ?? measure.chord,
      })),
    })),
  };
}

/**
 * Proto1-only Arr eval: reuse {@link scoreArrangementAndOrchestration} formula by
 * pointing the second-voice slot at real `guitar_2` notes (eval clone; no bass invented,
 * generated ScoreModel / MusicXML untouched).
 */
function scoreProto1DualGuitarArrangement(score: ScoreModel): {
  score: number;
  justification: string;
} {
  const g1 = score.parts.find((p) => p.id === 'guitar');
  const g2 = score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2) {
    return { score: 4, justification: 'Proto1 dual-guitar: missing guitar or guitar_2' };
  }
  const aliased: ScoreModel = {
    ...score,
    parts: score.parts.map((p) => (p.id === 'guitar_2' ? { ...p, id: 'bass' } : p)),
  };
  const raw = scoreArrangementAndOrchestration(aliased);
  return {
    score: raw.score,
    justification: `Proto1 dual-guitar (guitar vs guitar_2): ${raw.justification}`,
  };
}

/** Replace one GCE pillar; recompute weighted overall with unchanged defaultGceWeights. */
function applyProto1CategoryOverride(
  gce: GceEvaluationResult,
  category: GceCategory,
  score: number
): GceEvaluationResult {
  const w = defaultGceWeights[category];
  const categories = { ...gce.categories };
  categories[category] = {
    category,
    score,
    weight: w,
    weightedScore: score * w,
  };

  let finalScore = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let weakestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;
  let strongestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;
  for (const cat of GCE_CATEGORY_ORDER) {
    const row = categories[cat]!;
    finalScore += row.weightedScore;
    if (row.score <= minScore) {
      minScore = row.score;
      weakestCategory = cat;
    }
    if (row.score >= maxScore) {
      maxScore = row.score;
      strongestCategory = cat;
    }
  }
  finalScore = Math.round(finalScore * 10) / 10;

  return {
    ...gce,
    categories,
    finalScore,
    weakestCategory,
    strongestCategory,
    pass: finalScore >= gce.threshold,
  };
}

function proto1MelodicOnsetKey(n: MelodicNote): string {
  return `${n.bar}@${Math.round(n.beat * 1000)}`;
}

/**
 * Merge G1+G2 melodic lines chronologically. Same bar/beat collapses to one event
 * (sounding wins over rest; longer duration wins if both sound) — avoids double-onset artefacts.
 */
function mergeProto1MelodicLinesForRhythm(
  lineA: readonly MelodicNote[],
  lineB: readonly MelodicNote[]
): MelodicNote[] {
  const sorted = [...lineA, ...lineB].sort((x, y) => {
    if (x.bar !== y.bar) return x.bar - y.bar;
    if (x.beat !== y.beat) return x.beat - y.beat;
    if (x.rest !== y.rest) return x.rest ? 1 : -1;
    return y.beats - x.beats;
  });
  const out: MelodicNote[] = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (prev && proto1MelodicOnsetKey(prev) === proto1MelodicOnsetKey(n)) {
      if (prev.rest && !n.rest) {
        out[out.length - 1] = n;
      } else if (!prev.rest && !n.rest && n.beats > prev.beats) {
        out[out.length - 1] = n;
      }
      continue;
    }
    out.push(n);
  }
  return out;
}

/** Proto1-only RI: both guitars via scoreModelToMelodicLine → merge → scoreRhythmicIdentity. */
function scoreProto1DualGuitarRhythmicIdentity(score: ScoreModel): {
  score: number;
  justification: string;
} {
  const g1 = scoreModelToMelodicLine(score, 'guitar');
  const g2 = scoreModelToMelodicLine(score, 'guitar_2');
  if (g1.length === 0 && g2.length === 0) {
    return { score: 0, justification: 'Proto1 dual-guitar rhythm: no melodic notes' };
  }
  const merged = mergeProto1MelodicLinesForRhythm(g1, g2);
  const raw = scoreRhythmicIdentity(merged);
  return {
    score: raw.score,
    justification: `Proto1 dual-guitar merged rhythm: ${raw.justification}`,
  };
}

/**
 * Pure in-memory GCE V2 evaluation of one Proto 1 dialogue (optional seed).
 * Builds via {@link buildSonicYouthProto1MelodicDialogue}.
 * Reporting: harmonyAndLanguage + arrangementAndOrchestration are NOT MEASURED
 * (polychord unscorable by current GCE scorers); overall + PASS/FAIL suppressed
 * while those slots are unmeasured. Other categories retain actual measurements;
 * four-bar structural limits remain explicit. RI still dual-guitar merged.
 */
export function evaluateSonicYouthProto1MelodicDialogueGce(
  options?: SonicYouthProto1MelodicDialogueOptions
): SyProto1MelodicDialogueGceResult {
  const dialogue = buildSonicYouthProto1MelodicDialogue(options);
  const chordStrip = syProto1GceChordStrip(
    dialogue.pair,
    dialogue.chordBars.bars.length || 4
  );
  const scoreForGce = scoreModelWithProto1GceChordStrip(dialogue.score, chordStrip);
  const features = extractScoreModelFeatures(dialogue.score);
  const gceBase = evaluateGce({
    output: scoreForGce,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: 'sonic_youth' },
  });

  const ri = scoreProto1DualGuitarRhythmicIdentity(dialogue.score);
  const gce = applyProto1CategoryOverride(gceBase, 'rhythmicIdentity', ri.score);

  const notMeasuredSet = new Set<GceCategory>(SY_PROTO1_NOT_MEASURED_GCE_CATEGORIES);
  const categoryScores = {} as Record<GceCategory, SyProto1GceCategoryReport>;
  const measuredCategoryScores: Partial<Record<GceCategory, number>> = {};
  for (const cat of GCE_CATEGORY_ORDER) {
    if (notMeasuredSet.has(cat)) {
      categoryScores[cat] = 'NOT MEASURED';
      continue;
    }
    const score = gce.categories[cat].score;
    categoryScores[cat] = score;
    measuredCategoryScores[cat] = score;
  }

  const notMeasuredCategories: SyProto1GceNotMeasured[] =
    SY_PROTO1_NOT_MEASURED_GCE_CATEGORIES.map((category) => ({
      category,
      status: 'NOT MEASURED' as const,
      reason: PROTO1_NOT_MEASURED_REASON,
    }));

  const hasUnmeasuredRequired = notMeasuredCategories.length > 0;
  const overallScore = hasUnmeasuredRequired ? null : gce.finalScore;
  const passFail: 'PASS' | 'FAIL' | null = hasUnmeasuredRequired
    ? null
    : gce.pass
      ? 'PASS'
      : 'FAIL';

  const structurallyLimitedCategories: SyProto1GceStructuralLimitation[] =
    SY_PROTO1_STRUCTURALLY_LIMITED_GCE_CATEGORIES.map((category) => ({
      category,
      structurallyLimited: true as const,
      reason: PROTO1_SHORT_FORM_LIMIT_REASON,
    }));

  return {
    ...(options?.seed !== undefined ? { seed: options.seed } : {}),
    categoryScores,
    measuredCategoryScores,
    notMeasuredCategories,
    overallScore,
    passFail,
    structurallyLimitedCategories,
    gce,
    dialogue,
  };
}
