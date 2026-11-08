/**
 * Dual-electric Sonic Youth polychord score builders (no bass / 8-bar proto).
 * Guitar 1 = AAEEAA; Guitar 2 = ACCGG♯C. Grips via solveGuitarGrip({ openStrings }).
 */

import { solveGuitarGrip } from '../guitar/voicingFeasibility';
import { classifyPitchClassSet } from '../hexatonic/setClass';
import {
  commonToneCount,
  disjointTertianSplits,
  type TertianTriad,
} from '../hexatonic/tertianTriadUniverse';
import type { Transposition } from '../instruments/instrumentTypes';
import { soundingToWritten } from '../instruments/writtenPitch';
import { canonicalPitchSet } from '../pentatonic/pitch';
import { applyOperator, type Motif } from '../motif-ops';
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
  combinedField: readonly number[];
  motifMidi: readonly number[];
  answerMidi: readonly number[];
  /** Per-bar melody/rest events for Guitar 1 (voice 1 when active); length 4. */
  guitar1MelodicEventsByBar: readonly (readonly SyProtoProto1MelodicEvent[])[];
  /** Per-bar melody/rest events for Guitar 2 (voice 1 when active); length 4. */
  guitar2MelodicEventsByBar: readonly (readonly SyProtoProto1MelodicEvent[])[];
  toneRoleReceipts: readonly SyProtoProto1ToneRoleReceipt[];
  /**
   * Prototype 1 score: upper melody = voice 1 (stems up); lower triad = voice 2 (stems down)
   * in active bars. Melody-free bars keep the triad as the sole voice (voice 1).
   */
  score: ScoreModel;
  chordBars: SonicYouthPolychordProgressionResult;
};

/** Upper melody layer — odd voice → exporter stem up. */
const PROTO1_MELODY_VOICE = 1;
/** Lower sustained triad under active melody — even voice → exporter stem down. */
const PROTO1_CHORD_VOICE = 2;

function proto1CombinedField(pair: SyProtoPolychordPair): readonly number[] {
  return analyzeSyProtoCombinedPolychord(pair).unionPitchClasses;
}

function assertPitchInCombinedField(midi: number, pair: SyProtoPolychordPair, label: string): void {
  const role = classifySyProtoPolychordToneRole(midi, pair);
  if (!role.inCombinedField) {
    throw new Error(`${label}: MIDI ${midi} (pc ${role.pitchClass}) outside combined polychord field`);
  }
}

/**
 * Invert Prototype 1 motif inside the combined six-note field (motif-ops invert-in-field).
 * Axis = first sounding pitch (G4).
 */
function proto1AnswerMidiFromMotif(
  motifMidi: readonly number[],
  field: readonly number[]
): { answerMidi: number[]; motifId: string } {
  const motif: Motif = {
    id: 'sy_proto1_m1',
    field: [...field],
    events: motifMidi.map((midi, i) => ({
      onset: i,
      duration: 1,
      midi,
    })),
  };
  const { motif: inverted } = applyOperator(motif, 'invert-in-field');
  const answerMidi: number[] = [];
  for (const event of inverted.events) {
    if (event.midi === null) continue;
    answerMidi.push(event.midi);
  }
  if (answerMidi.length !== motifMidi.length) {
    throw new Error('Prototype 1 answer lost motif pitch count after invert-in-field');
  }
  return { answerMidi, motifId: inverted.id };
}

/**
 * Bars 1–2 G1 statement: distinctive 4-note cell with rests + rhythmic variation.
 * Bars 3–4: no melody events (idle triad keeps a single chord voice only).
 */
function proto1Guitar1MelodicBars(
  motifMidi: readonly number[]
): SyProtoProto1MelodicEvent[][] {
  const [n0, n1, n2, n3] = motifMidi;
  return [
    // Bar 1: G4 q · rest ⅛ · F♯4 ⅛ · rest q · C♯5 q — first three motif notes
    [
      createNote(n0!, 0, 1, PROTO1_MELODY_VOICE, 'sy_proto1_m1'),
      createRest(1, 0.5, PROTO1_MELODY_VOICE),
      createNote(n1!, 1.5, 0.5, PROTO1_MELODY_VOICE, 'sy_proto1_m1'),
      createRest(2, 1, PROTO1_MELODY_VOICE),
      createNote(n2!, 3, 1, PROTO1_MELODY_VOICE, 'sy_proto1_m1'),
    ],
    // Bar 2: rest ½ · C5 ½ — fourth motif note; delayed entry
    [
      createRest(0, 2, PROTO1_MELODY_VOICE),
      createNote(n3!, 2, 2, PROTO1_MELODY_VOICE, 'sy_proto1_m1'),
    ],
    [],
    [],
  ];
}

/**
 * Bars 1–2: no melody events (G2 idle while G1 states — single chord voice).
 * Bars 3–4: answer with invert-in-field pitches, different rhythm.
 */
function proto1Guitar2MelodicBars(
  answerMidi: readonly number[],
  answerMotifId: string
): SyProtoProto1MelodicEvent[][] {
  const [a0, a1, a2, a3] = answerMidi;
  return [
    [],
    [],
    // Bar 3: rest ⅛ · answer0 ⅛ · rest ⅛ · answer1 q · rest ⅛ · answer2 q
    [
      createRest(0, 0.5, PROTO1_MELODY_VOICE),
      createNote(a0!, 0.5, 0.5, PROTO1_MELODY_VOICE, answerMotifId),
      createRest(1, 0.5, PROTO1_MELODY_VOICE),
      createNote(a1!, 1.5, 1, PROTO1_MELODY_VOICE, answerMotifId),
      createRest(2.5, 0.5, PROTO1_MELODY_VOICE),
      createNote(a2!, 3, 1, PROTO1_MELODY_VOICE, answerMotifId),
    ],
    // Bar 4: rest q · answer3 dotted-half
    [
      createRest(0, 1, PROTO1_MELODY_VOICE),
      createNote(a3!, 1, 3, PROTO1_MELODY_VOICE, answerMotifId),
    ],
  ];
}

function collectToneRoleReceipts(
  pair: SyProtoPolychordPair,
  guitar1Bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  guitar2Bars: readonly (readonly SyProtoProto1MelodicEvent[])[]
): SyProtoProto1ToneRoleReceipt[] {
  const out: SyProtoProto1ToneRoleReceipt[] = [];
  const pushBar = (
    bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
    guitar: 'guitar1' | 'guitar2'
  ) => {
    bars.forEach((events, i) => {
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

function overlayMelodyOnChordScore(
  chordBars: SonicYouthPolychordProgressionResult,
  guitar1Bars: readonly (readonly SyProtoProto1MelodicEvent[])[],
  guitar2Bars: readonly (readonly SyProtoProto1MelodicEvent[])[]
): ScoreModel {
  const g1 = chordBars.score.parts.find((p) => p.id === 'guitar');
  const g2 = chordBars.score.parts.find((p) => p.id === 'guitar_2');
  if (!g1 || !g2 || g1.measures.length !== 4 || g2.measures.length !== 4) {
    throw new Error('Prototype 1 expects a 4-bar dual-guitar chord score from existing builder');
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
 * Prototype 1 — four-bar call/response melodic dialogue over fixed C + F♯m.
 * Chord grips from existing progression builder. Active bars: melody voice 1, triad voice 2.
 * Idle bars: triad alone as voice 1 (no invented second layer).
 */
export function buildSonicYouthProto1MelodicDialogue(
  options?: SonicYouthPolychordTuningOptions
): SyProtoProto1MelodicDialogueResult {
  const pair = SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR;
  const combinedField = proto1CombinedField(pair);
  if (combinedField.length !== 6) {
    throw new Error(`Prototype 1 expected 6-note combined field, got ${combinedField.length}`);
  }

  const motifMidi = [...SY_PROTO1_MOTIF_MIDI];
  for (const midi of motifMidi) {
    assertPitchInCombinedField(midi, pair, 'Prototype 1 motif');
  }

  const { answerMidi, motifId: answerMotifId } = proto1AnswerMidiFromMotif(motifMidi, combinedField);
  for (const midi of answerMidi) {
    assertPitchInCombinedField(midi, pair, 'Prototype 1 answer');
  }

  const guitar1MelodicEventsByBar = proto1Guitar1MelodicBars(motifMidi);
  const guitar2MelodicEventsByBar = proto1Guitar2MelodicBars(answerMidi, answerMotifId);
  const toneRoleReceipts = collectToneRoleReceipts(
    pair,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar
  );

  const chordBars = buildSonicYouthPolychordProgressionScore(
    [pair, pair, pair, pair],
    options
  );
  const score = overlayMelodyOnChordScore(
    chordBars,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar
  );

  return {
    pair,
    combinedField,
    motifMidi,
    answerMidi,
    guitar1MelodicEventsByBar,
    guitar2MelodicEventsByBar,
    toneRoleReceipts,
    score,
    chordBars,
  };
}
