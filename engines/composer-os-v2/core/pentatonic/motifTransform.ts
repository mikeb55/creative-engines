/**
 * Dev 4 — map an existing motif onto a registry pentatonic collection.
 * Uses BaseMotif / MotifNote. Does not generate phrases.
 */

import type { BaseMotif, MotifNote } from '../motif/motifTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { getPentatonicColourResource } from './colourRegistry';
import { getPentatonicArchetype } from './registry';
import { mod12, parseNoteToken } from './pitch';

export const GUITAR_SOUNDING_RANGE: readonly [number, number] = CLEAN_ELECTRIC_GUITAR.hardRange;

export type MotifMapMethod = 'M-DEG' | 'M-NEAR';

export type OrnamentFunction = 'chromatic-passing' | 'neighbour' | 'semitone-approach';

export interface PentatonicCollectionView {
  name: string;
  archetypeId: string;
  referenceNote: string;
  homeRelationshipLabel: string | null;
}

export interface RhythmSlot {
  kind: 'note' | 'rest';
  startBeat: number;
  duration: number;
}

export interface MappedMotifNote {
  pitch: number;
  startBeat: number;
  duration: number;
  sourcePitch: number;
  sourceDegree: number | null;
  targetDegree: number | null;
  retainedCommonTone: boolean;
  ornament: OrnamentFunction | null;
  preservedChromaticOrnament: boolean;
  collision: string | null;
  rangeAdjusted: boolean;
  repeatHeld: boolean;
}

export interface MotifMapResult {
  method: MotifMapMethod;
  source: PentatonicCollectionView;
  target: PentatonicCollectionView;
  notes: MappedMotifNote[];
  rhythm: RhythmSlot[];
  degreeAlignment: string;
  contourCollisions: string[];
  preservedOrnaments: number[];
  commonToneRetentions: number[];
  scaleRun: { sourceMax: number; targetMax: number; valid: boolean };
  rangeAdjustments: string[];
}

const EPS = 1e-6;

export function guitarRange(): readonly [number, number] {
  return GUITAR_SOUNDING_RANGE;
}

export function inGuitarRange(midi: number): boolean {
  const [low, high] = GUITAR_SOUNDING_RANGE;
  return midi >= low - EPS && midi <= high + EPS;
}

/** Beat unit in quarter-lengths. Compound x/8 uses the dotted quarter. */
export function beatUnitQuarters(beats: number, beatType: number): number {
  const compound = beatType === 8 && beats >= 6 && beats % 3 === 0;
  if (compound) return 1.5 * (8 / beatType);
  return 4 / beatType;
}

/**
 * Strong-beat onsets in quarter-lengths.
 * 6/8: both dotted-quarter beats. Other compound x/8: beats 1, 3, 5…
 * Simple metres: beat 1, plus the odd beats when the bar has at least four beats.
 */
export function strongBeatOnsets(beats: number, beatType: number): number[] {
  const unit = beatUnitQuarters(beats, beatType);
  const compound = beatType === 8 && beats >= 6 && beats % 3 === 0;
  const beatCount = compound ? beats / 3 : beats;
  const onsets: number[] = [];
  for (let index = 0; index < beatCount; index += 1) {
    const beatNumber = index + 1;
    const strong = compound
      ? beatCount === 2
        ? true
        : beatNumber % 2 === 1
      : beatNumber === 1 || (beatCount >= 4 && beatNumber % 2 === 1);
    if (strong) onsets.push(index * unit);
  }
  return onsets;
}

export function collectionPitchClasses(collection: PentatonicCollectionView): number[] {
  const reference = parseNoteToken(collection.referenceNote);
  if (!reference) {
    throw new Error(`Collection ${collection.name} has no reference pitch. Refusing to substitute another collection.`);
  }
  const archetype = getPentatonicArchetype(collection.archetypeId);
  if (archetype) {
    return archetype.intervals.map((interval) => mod12(reference.pc + interval));
  }
  const colour = getPentatonicColourResource(collection.archetypeId);
  if (!colour) {
    throw new Error(
      `Pentatonic colour "${collection.archetypeId}" is not registered. Refusing to substitute another collection.`
    );
  }
  return colour.intervals.map((interval) => mod12(reference.pc + interval));
}

export function degreeOf(pitch: number, collection: PentatonicCollectionView): number | null {
  const pcs = collectionPitchClasses(collection);
  const index = pcs.indexOf(mod12(pitch));
  return index >= 0 ? index : null;
}

function sign(value: number): number {
  if (Math.abs(value) <= EPS) return 0;
  return value > 0 ? 1 : -1;
}

function midisForPc(pc: number): number[] {
  const [low, high] = GUITAR_SOUNDING_RANGE;
  const out: number[] = [];
  for (let midi = low; midi <= high; midi += 1) {
    if (mod12(midi) === mod12(pc)) out.push(midi);
  }
  return out;
}

function targetMemberMidis(collection: PentatonicCollectionView): number[] {
  return collectionPitchClasses(collection).flatMap((pc) => midisForPc(pc));
}

interface Choice {
  midi: number;
  contourPenalty: number;
  displacement: number;
  rangeAdjusted: boolean;
}

function chooseMidi(args: {
  allowed: readonly number[];
  sourceMidi: number;
  previousSource: number | null;
  previousMapped: number | null;
}): Choice {
  const sourceInterval = args.previousSource === null ? null : args.sourceMidi - args.previousSource;
  const ranked = [...args.allowed].sort((left, right) => {
    const leftPenalty = contourPenalty(left, args.previousMapped, sourceInterval);
    const rightPenalty = contourPenalty(right, args.previousMapped, sourceInterval);
    if (leftPenalty !== rightPenalty) return leftPenalty - rightPenalty;
    const leftDistance = Math.abs(left - args.sourceMidi);
    const rightDistance = Math.abs(right - args.sourceMidi);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left - right;
  });
  const midi = ranked[0];
  if (midi === undefined) {
    throw new Error(`No guitar-range pitch for source MIDI ${args.sourceMidi}.`);
  }
  const unconstrained = unconstrainedChoice(args.sourceMidi, args.allowed, args.previousMapped, sourceInterval);
  return {
    midi,
    contourPenalty: contourPenalty(midi, args.previousMapped, sourceInterval),
    displacement: Math.abs(midi - args.sourceMidi),
    rangeAdjusted: unconstrained !== null && unconstrained !== midi && !inGuitarRange(unconstrained),
  };
}

function contourPenalty(candidate: number, previousMapped: number | null, sourceInterval: number | null): number {
  if (previousMapped === null || sourceInterval === null) return 0;
  return sign(candidate - previousMapped) === sign(sourceInterval) ? 0 : 1;
}

/** Closest candidate ignoring the guitar ceiling, so a clamp can be reported. */
function unconstrainedChoice(
  sourceMidi: number,
  allowed: readonly number[],
  previousMapped: number | null,
  sourceInterval: number | null
): number | null {
  if (allowed.length === 0) return null;
  const pcs = [...new Set(allowed.map((midi) => mod12(midi)))];
  const open: number[] = [];
  for (const pc of pcs) {
    for (let midi = sourceMidi - 48; midi <= sourceMidi + 48; midi += 1) {
      if (mod12(midi) === pc) open.push(midi);
    }
  }
  const ranked = open.sort((left, right) => {
    const leftPenalty = contourPenalty(left, previousMapped, sourceInterval);
    const rightPenalty = contourPenalty(right, previousMapped, sourceInterval);
    if (leftPenalty !== rightPenalty) return leftPenalty - rightPenalty;
    const leftDistance = Math.abs(left - sourceMidi);
    const rightDistance = Math.abs(right - sourceMidi);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left - right;
  });
  return ranked[0] ?? null;
}

function onStrongBeat(startBeat: number, beats: number, beatType: number): boolean {
  return strongBeatOnsets(beats, beatType).some((onset) => Math.abs(onset - startBeat) <= EPS);
}

export function landingIndexes(
  notes: readonly { startBeat: number; duration: number }[],
  beats: number,
  beatType: number
): number[] {
  const unit = beatUnitQuarters(beats, beatType);
  const indexes = new Set<number>();
  notes.forEach((note, index) => {
    if (note.duration + EPS >= unit && onStrongBeat(note.startBeat, beats, beatType)) indexes.add(index);
  });
  if (notes.length > 0) indexes.add(notes.length - 1);
  return [...indexes].sort((left, right) => left - right);
}

export function ornamentFunction(
  previous: number | null,
  current: number,
  next: number | null,
  collection: PentatonicCollectionView
): OrnamentFunction | null {
  if (degreeOf(current, collection) !== null) return null;
  if (previous !== null && next !== null && Math.abs(next - previous) === 2 && Math.abs(current - previous) === 1 && Math.abs(next - current) === 1) {
    return 'chromatic-passing';
  }
  if (previous !== null && next !== null && previous === next && Math.abs(current - previous) === 1) {
    return 'neighbour';
  }
  if (next !== null && Math.abs(current - next) === 1) return 'semitone-approach';
  return null;
}

function preserveOrnament(
  kind: OrnamentFunction,
  source: number,
  previousSource: number | null,
  nextSource: number | null,
  previousMapped: number | null,
  nextMapped: number | null
): number | null {
  if (kind === 'chromatic-passing') {
    if (previousMapped === null || nextMapped === null) return null;
    if (Math.abs(nextMapped - previousMapped) !== 2) return null;
    const mid = previousMapped + sign(nextMapped - previousMapped);
    return inGuitarRange(mid) ? mid : null;
  }
  if (kind === 'neighbour') {
    if (previousMapped === null || nextMapped === null || previousMapped !== nextMapped || previousSource === null) return null;
    const midi = previousMapped + sign(source - previousSource);
    return inGuitarRange(midi) ? midi : null;
  }
  if (nextMapped === null || nextSource === null) return null;
  const midi = nextMapped - sign(nextSource - source);
  if (!inGuitarRange(midi) || Math.abs(midi - nextMapped) !== 1) return null;
  return midi;
}

function circularDegreeDistance(left: number, right: number, size: number): number {
  const span = size > 1 ? size : 2;
  const gap = Math.abs(left - right);
  return Math.min(gap, span - gap);
}

export function maxAdjacentCollectionRun(pitches: readonly number[], collection: PentatonicCollectionView): number {
  const size = collectionPitchClasses(collection).length;
  let max = 0;
  let run = 0;
  for (let index = 1; index < pitches.length; index += 1) {
    const left = degreeOf(pitches[index - 1]!, collection);
    const right = degreeOf(pitches[index]!, collection);
    if (left !== null && right !== null && circularDegreeDistance(left, right, size) === 1) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

function structuralIndexes(notes: readonly MotifNote[], source: PentatonicCollectionView): {
  structural: Set<number>;
  ornaments: Map<number, OrnamentFunction>;
} {
  const structural = new Set<number>();
  const ornaments = new Map<number, OrnamentFunction>();
  notes.forEach((note, index) => {
    const previous = index > 0 ? notes[index - 1]!.pitch : null;
    const next = index + 1 < notes.length ? notes[index + 1]!.pitch : null;
    const ornament = ornamentFunction(previous, note.pitch, next, source);
    if (ornament) ornaments.set(index, ornament);
    else structural.add(index);
  });
  return { structural, ornaments };
}

function previousStructuralPitch(notes: readonly MotifNote[], mapped: readonly (number | null)[], index: number, structural: Set<number>): {
  source: number | null;
  mapped: number | null;
} {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!structural.has(cursor)) continue;
    return { source: notes[cursor]!.pitch, mapped: mapped[cursor] ?? null };
  }
  return { source: null, mapped: null };
}

function retentionHolds(
  retained: number,
  sourceMidi: number,
  previousSource: number | null,
  previousMapped: number | null
): boolean {
  if (!inGuitarRange(retained)) return false;
  if (previousSource === null || previousMapped === null) return true;
  return sign(retained - previousMapped) === sign(sourceMidi - previousSource);
}

export function mapMotifPitches(args: {
  motif: BaseMotif;
  rhythm: readonly RhythmSlot[];
  source: PentatonicCollectionView;
  target: PentatonicCollectionView;
  method: MotifMapMethod;
  meter: { beats: number; beatType: number };
}): MotifMapResult {
  const notes = args.motif.notes.map((note) => ({ ...note }));
  const { structural, ornaments } = structuralIndexes(notes, args.source);
  const landings = new Set(landingIndexes(notes, args.meter.beats, args.meter.beatType));
  const mapped: (number | null)[] = notes.map(() => null);
  const rows: MappedMotifNote[] = notes.map((note, index) => ({
    pitch: note.pitch,
    startBeat: note.startBeat,
    duration: note.duration,
    sourcePitch: note.pitch,
    sourceDegree: degreeOf(note.pitch, args.source),
    targetDegree: null,
    retainedCommonTone: false,
    ornament: ornaments.get(index) ?? null,
    preservedChromaticOrnament: false,
    collision: null,
    rangeAdjusted: false,
    repeatHeld: false,
  }));

  const targetPcs = new Set(collectionPitchClasses(args.target));
  notes.forEach((note, index) => {
    if (!structural.has(index)) return;
    const previous = previousStructuralPitch(notes, mapped, index, structural);
    const sourceDegree = degreeOf(note.pitch, args.source);
    const inTarget = targetPcs.has(mod12(note.pitch));
    if (landings.has(index) && inTarget && !ornaments.has(index)) {
      const retained = inGuitarRange(note.pitch) ? note.pitch : (midisForPc(note.pitch)[0] ?? note.pitch);
      if (retentionHolds(retained, note.pitch, previous.source, previous.mapped)) {
        mapped[index] = retained;
        rows[index]!.pitch = retained;
        rows[index]!.retainedCommonTone = true;
        rows[index]!.targetDegree = degreeOf(retained, args.target);
        rows[index]!.rangeAdjusted = retained !== note.pitch;
        return;
      }
    }
    const repeated =
      previous.source !== null &&
      previous.mapped !== null &&
      note.pitch === previous.source &&
      targetPcs.has(mod12(previous.mapped));
    if (repeated && previous.mapped !== null && inGuitarRange(previous.mapped)) {
      mapped[index] = previous.mapped;
      rows[index]!.pitch = previous.mapped;
      rows[index]!.repeatHeld = true;
      rows[index]!.targetDegree = degreeOf(previous.mapped, args.target);
      rows[index]!.sourceDegree = sourceDegree;
      return;
    }
    const targetClasses = collectionPitchClasses(args.target);
    const degreePc = sourceDegree !== null ? targetClasses[sourceDegree] : undefined;
    if (args.method === 'M-DEG' && sourceDegree !== null && degreePc === undefined) {
      throw new Error(`M-DEG degree ${sourceDegree} is outside ${args.target.archetypeId}. Refusing to substitute another collection.`);
    }
    const allowed = args.method === 'M-DEG' && degreePc !== undefined ? midisForPc(degreePc) : targetMemberMidis(args.target);
    const choice = chooseMidi({
      allowed,
      sourceMidi: note.pitch,
      previousSource: previous.source,
      previousMapped: previous.mapped,
    });
    mapped[index] = choice.midi;
    rows[index]!.pitch = choice.midi;
    rows[index]!.targetDegree = degreeOf(choice.midi, args.target);
    rows[index]!.sourceDegree = sourceDegree;
    rows[index]!.rangeAdjusted = choice.rangeAdjusted;
    if (choice.contourPenalty > 0) {
      rows[index]!.collision = `contour break at note ${index + 1}: source ${note.pitch} → ${choice.midi}`;
    }
  });

  notes.forEach((note, index) => {
    const kind = ornaments.get(index);
    if (!kind) return;
    const previousSource = index > 0 ? notes[index - 1]!.pitch : null;
    const nextSource = index + 1 < notes.length ? notes[index + 1]!.pitch : null;
    const previousMapped = index > 0 ? rows[index - 1]!.pitch : null;
    const nextMapped = index + 1 < notes.length ? rows[index + 1]!.pitch : null;
    const preserved = preserveOrnament(kind, note.pitch, previousSource, nextSource, previousMapped, nextMapped);
    if (preserved !== null) {
      rows[index]!.pitch = preserved;
      rows[index]!.preservedChromaticOrnament = true;
      rows[index]!.ornament = kind;
      rows[index]!.targetDegree = degreeOf(preserved, args.target);
      return;
    }
    const allowed = targetMemberMidis(args.target);
    const choice = chooseMidi({
      allowed,
      sourceMidi: note.pitch,
      previousSource,
      previousMapped,
    });
    rows[index]!.pitch = choice.midi;
    rows[index]!.ornament = kind;
    rows[index]!.preservedChromaticOrnament = false;
    rows[index]!.targetDegree = degreeOf(choice.midi, args.target);
    rows[index]!.rangeAdjusted = choice.rangeAdjusted;
    if (choice.contourPenalty > 0) {
      rows[index]!.collision = `ornament fallback contour break at note ${index + 1}`;
    }
  });

  const sourcePitches = notes.map((note) => note.pitch);
  const targetPitches = rows.map((row) => row.pitch);
  const sourceMax = maxAdjacentCollectionRun(sourcePitches, args.source);
  const targetMax = maxAdjacentCollectionRun(targetPitches, args.target);
  const alignment = rows
    .map((row, index) => {
      if (row.preservedChromaticOrnament) return `${index + 1}:PRESERVED_CHROMATIC_ORNAMENT`;
      if (row.retainedCommonTone) return `${index + 1}:retain ${row.sourcePitch % 12}→${row.pitch % 12}`;
      return `${index + 1}:deg ${row.sourceDegree ?? '–'}→${row.targetDegree ?? '–'}`;
    })
    .join('; ');

  return {
    method: args.method,
    source: args.source,
    target: args.target,
    notes: rows,
    rhythm: args.rhythm.map((slot) => ({ ...slot })),
    degreeAlignment: alignment,
    contourCollisions: rows.flatMap((row) => (row.collision ? [row.collision] : [])),
    preservedOrnaments: rows.flatMap((row, index) => (row.preservedChromaticOrnament ? [index] : [])),
    commonToneRetentions: rows.flatMap((row, index) => (row.retainedCommonTone ? [index] : [])),
    scaleRun: { sourceMax, targetMax, valid: targetMax <= sourceMax },
    rangeAdjustments: rows.flatMap((row, index) => (row.rangeAdjusted ? [`note ${index + 1} clamped into E2–E6`] : [])),
  };
}

export function transposeCollection(collection: PentatonicCollectionView, semitones: number): PentatonicCollectionView {
  const reference = parseNoteToken(collection.referenceNote);
  if (!reference) throw new Error(`Reference ${collection.referenceNote} is not a pitch.`);
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return {
    ...collection,
    referenceNote: names[mod12(reference.pc + semitones)]!,
    name: `${collection.name} +${semitones}`,
    homeRelationshipLabel: collection.homeRelationshipLabel,
  };
}

export function shiftMotif(motif: BaseMotif, semitones: number): BaseMotif {
  return {
    ...motif,
    notes: motif.notes.map((note) => ({ ...note, pitch: note.pitch + semitones })),
  };
}
