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
import type {
  ChordEvent,
  NoteEvent,
  PartModel,
  RestEvent,
  ScoreEvent,
  ScoreModel,
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

/** Proto1 harmonic surface: A = C/F♯m all bars; B = bar 4 G2 −1 semitone (C/Fm). */
export type SyProto1HarmonicVariant = 'A' | 'B';

/** Proto1 harmony source: fixed C/F♯m (compat) or seeded adaptive polychord plan. */
export type SyProto1HarmonyMode = 'fixed' | 'adaptive';

/**
 * Proto 1 dialogue options. Tuning fields match polychord builders.
 * `seed` omitted → verified fixed motif + invert-in-field answer.
 * `harmonicVariant` omitted or `'A'` → verified Proto 1 harmony; `'B'` → bar-4 G2 transform (fixed mode only).
 * `harmonyMode` omitted or `'fixed'` → verified C/F♯m × 4; `'adaptive'` → {@link planSyProto1PolychordBars}.
 */
export type SonicYouthProto1MelodicDialogueOptions = SonicYouthPolychordTuningOptions & {
  /** Deterministic G1 motif + G2 answer variation via motif-ops. */
  seed?: number;
  /** Harmonic A/B. Default `'A'` (unchanged C/F♯m). Research-only; ignored when `harmonyMode: 'adaptive'`. */
  harmonicVariant?: SyProto1HarmonicVariant;
  /** Default `'fixed'`. Adaptive uses seeded polychord planner + per-bar field mapping. */
  harmonyMode?: SyProto1HarmonyMode;
  /** Adaptive bar count (default 8). Ignored in fixed mode (always 4). */
  barCount?: number;
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

function solveTriadGripOnOpens(
  opens: readonly number[],
  triad: SyProtoTriadInput,
  guitarLabel: 'Guitar 1' | 'Guitar 2'
): number[] {
  const pcs = triadPitchClasses(triad);
  if (new Set(pcs).size !== 3) {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)} (degenerate triad)`);
  }
  const lo = Math.min(...opens);
  const hi = Math.max(...opens) + 15;
  const pools = pcs.map((pc) => midisForPcInRange(pc, lo, hi));
  let best: { midis: number[]; span: number; lowest: number } | null = null;
  for (const a of pools[0]!) {
    for (const b of pools[1]!) {
      for (const c of pools[2]!) {
        const midis = [a, b, c];
        if (new Set(midis).size !== 3) continue;
        const solved = solveGuitarGrip(midis, { openStrings: opens });
        if (!solved.feasible || solved.frets.length !== 3) continue;
        const candidate = { midis, span: solved.fretSpan, lowest: solved.lowestFret };
        if (
          !best ||
          candidate.span < best.span ||
          (candidate.span === best.span && candidate.lowest < best.lowest)
        ) {
          best = candidate;
        }
      }
    }
  }
  if (!best) {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)}`);
  }
  return best.midis.slice().sort((x, y) => x - y);
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

/**
 * One-bar dual-electric polychord (no bass).
 * Reference pair: D major (G1) + E major (G2).
 * Optional tunings → solveGuitarGrip({ openStrings }); default AAEEAA / ACCGG#C.
 */
export function buildSonicYouthOneBarPolychordScore(
  guitar1Triad: SyProtoTriadInput,
  guitar2Triad: SyProtoTriadInput,
  options?: SonicYouthPolychordTuningOptions
): SonicYouthOneBarPolychordResult {
  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const guitar1Pitches = solveTriadGripOnOpens(g1Open, guitar1Triad, 'Guitar 1');
  const guitar2Pitches = solveTriadGripOnOpens(g2Open, guitar2Triad, 'Guitar 2');
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
 */
export function buildSonicYouthPolychordProgressionScore(
  pairs: readonly SyProtoPolychordPair[],
  options?: SonicYouthPolychordTuningOptions
): SonicYouthPolychordProgressionResult {
  if (pairs.length === 0) {
    throw new Error('polychord progression requires at least one { guitar1, guitar2 } pair');
  }

  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const tuningOpts: SonicYouthPolychordTuningOptions = {
    guitar1Tuning: g1Open,
    guitar2Tuning: g2Open,
  };

  const bars: SonicYouthOneBarPolychordResult[] = [];
  const g1Measures = [];
  const g2Measures = [];
  const combinedWordsByBar: Record<number, string> = {};

  for (let i = 0; i < pairs.length; i++) {
    const bar = i + 1;
    const pair = pairs[i]!;
    let oneBar: SonicYouthOneBarPolychordResult;
    try {
      oneBar = buildSonicYouthOneBarPolychordScore(pair.guitar1, pair.guitar2, tuningOpts);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`bar ${bar}: ${detail}`);
    }
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

/**
 * Prototype 1 — call/response melodic dialogue over dual-guitar polychords.
 * Default `harmonyMode: 'fixed'` = verified 4-bar C + F♯m (compat).
 * `harmonyMode: 'adaptive'` = seeded {@link planSyProto1PolychordBars} (default 8 bars),
 * motif/answer mapped into each bar's combined field; rhythms tiled from Proto1 cycle.
 * Chord grips via {@link buildSonicYouthPolychordProgressionScore}; custom tunings pass through.
 * Optional `harmonicVariant: 'B'` remains fixed-mode research only (unchanged helper).
 */
export function buildSonicYouthProto1MelodicDialogue(
  options?: SonicYouthProto1MelodicDialogueOptions
): SyProtoProto1MelodicDialogueResult {
  const harmonyMode: SyProto1HarmonyMode =
    options?.harmonyMode === 'adaptive' ? 'adaptive' : 'fixed';
  const seed = options?.seed;
  const harmonicVariant: SyProto1HarmonicVariant =
    harmonyMode === 'fixed' && options?.harmonicVariant === 'B' ? 'B' : 'A';

  const tuningOpts: SonicYouthPolychordTuningOptions | undefined =
    options == null
      ? undefined
      : {
          ...(options.guitar1Tuning != null ? { guitar1Tuning: options.guitar1Tuning } : {}),
          ...(options.guitar2Tuning != null ? { guitar2Tuning: options.guitar2Tuning } : {}),
        };
  const tuningForProgression =
    tuningOpts && (tuningOpts.guitar1Tuning != null || tuningOpts.guitar2Tuning != null)
      ? tuningOpts
      : undefined;

  const pairs: SyProtoPolychordPair[] =
    harmonyMode === 'adaptive'
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
  if (harmonyMode === 'fixed' && combinedField.length !== 6) {
    throw new Error(`Prototype 1 expected 6-note combined field, got ${combinedField.length}`);
  }
  if (harmonyMode === 'adaptive' && combinedField.length < 4) {
    throw new Error(
      `Prototype 1 adaptive expected combined field of at least 4 pcs, got ${combinedField.length}`
    );
  }

  let motifMidi: number[];
  let motifId: string;
  let answerMidi: number[];
  let answerMotifId: string;

  if (seed === undefined) {
    motifMidi =
      harmonyMode === 'adaptive'
        ? proto1MapMidiSequenceIntoField(SY_PROTO1_MOTIF_MIDI, combinedField)
        : [...SY_PROTO1_MOTIF_MIDI];
    motifId = 'sy_proto1_m1';
    const answer = proto1AnswerMidiFromMotif(motifMidi, combinedField);
    answerMidi =
      harmonyMode === 'adaptive'
        ? proto1MapMidiSequenceIntoField(answer.answerMidi, combinedField)
        : answer.answerMidi;
    answerMotifId = answer.motifId;
  } else {
    const seedBaseMidi =
      harmonyMode === 'adaptive'
        ? proto1MapMidiSequenceIntoField(SY_PROTO1_MOTIF_MIDI, combinedField)
        : [...SY_PROTO1_MOTIF_MIDI];
    const seededMotif = proto1SeededMotifMidi(seedBaseMidi, combinedField, seed);
    motifMidi =
      harmonyMode === 'adaptive'
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
      answerMidi =
        harmonyMode === 'adaptive'
          ? proto1MapMidiSequenceIntoField(answer.answerMidi, combinedField)
          : answer.answerMidi;
      answerMotifId = answer.motifId;
    } catch {
      const answer = proto1AnswerMidiFromMotif(motifMidi, combinedField);
      answerMidi =
        harmonyMode === 'adaptive'
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

  const cycleG1 = proto1Guitar1MelodicBars(motifMidi, motifId);
  const cycleG2 = proto1Guitar2MelodicBars(answerMidi, answerMotifId);
  let guitar1MelodicEventsByBar = proto1TileMelodicBars(cycleG1, pairs.length);
  let guitar2MelodicEventsByBar = proto1TileMelodicBars(cycleG2, pairs.length);
  if (harmonyMode === 'adaptive') {
    guitar1MelodicEventsByBar = proto1MapMelodicBarsIntoPairs(guitar1MelodicEventsByBar, pairs);
    guitar2MelodicEventsByBar = proto1MapMelodicBarsIntoPairs(guitar2MelodicEventsByBar, pairs);
  }

  const toneRoleReceipts = collectToneRoleReceipts(
    pairs,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar
  );

  const chordBars = buildSonicYouthPolychordProgressionScore(pairs, tuningForProgression);
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

export type SyProto1MelodicDialogueGceResult = {
  /** Echo of options.seed when provided; undefined for verified no-seed Proto 1. */
  seed?: number;
  /** Ten GCE V2 category scores (0–10), unchanged formulas. */
  categoryScores: Record<GceCategory, number>;
  /** Weighted overall from evaluateGce (unchanged weights). */
  overallScore: number;
  /** Explicit short-form / four-bar caveats — scores still reported. */
  structurallyLimitedCategories: readonly SyProto1GceStructuralLimitation[];
  /** Full evaluator receipt (pass/threshold/weakest/etc.). */
  gce: GceEvaluationResult;
  dialogue: SyProtoProto1MelodicDialogueResult;
};

const PROTO1_SHORT_FORM_LIMIT_REASON =
  'Four-bar Proto 1 fragment: category is structurally limited on short-form material; interpret with caution (not automatic craft failure).';

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
 * Builds via {@link buildSonicYouthProto1MelodicDialogue}; harmony strip adapted
 * to C/F♯m; Arr/RI overridden for guitar + guitar_2 using shared scorers.
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

  const arr = scoreProto1DualGuitarArrangement(dialogue.score);
  const ri = scoreProto1DualGuitarRhythmicIdentity(dialogue.score);
  let gce = applyProto1CategoryOverride(gceBase, 'arrangementAndOrchestration', arr.score);
  gce = applyProto1CategoryOverride(gce, 'rhythmicIdentity', ri.score);

  const categoryScores = {} as Record<GceCategory, number>;
  for (const cat of GCE_CATEGORY_ORDER) {
    categoryScores[cat] = gce.categories[cat].score;
  }

  const structurallyLimitedCategories: SyProto1GceStructuralLimitation[] =
    SY_PROTO1_STRUCTURALLY_LIMITED_GCE_CATEGORIES.map((category) => ({
      category,
      structurallyLimited: true as const,
      reason: PROTO1_SHORT_FORM_LIMIT_REASON,
    }));

  return {
    ...(options?.seed !== undefined ? { seed: options.seed } : {}),
    categoryScores,
    overallScore: gce.finalScore,
    structurallyLimitedCategories,
    gce,
    dialogue,
  };
}
