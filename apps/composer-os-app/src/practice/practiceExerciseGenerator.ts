/**
 * Practice exercise generator.
 * Pitches, cells, grips, colour, and rhythm come from existing engines.
 * This module chooses parameters and reports when an engine cannot run.
 * It does not write MusicXML, save a session, or mutate the source scale.
 */

import { TONALITY_VAULT_DATABASE } from '@composer-os/core/harmony/tonalityVaultDatabase';
import { selectQuadratonicMelodySpec } from '@composer-os/core/harmony/quadratonicMelodySelector';
import {
  applyHexatonicStrategy,
  positionShiftWarnings,
  resolveBhlHexatonicColour,
  type BhlHexatonicStrategy,
} from '@composer-os/core/bhl/bhlHexatonicColour';
import type { BhlGuitarEvent } from '@composer-os/core/bhl/bhlPhrase';
import {
  planPhraseOnsets,
  type BhlBassBar,
  type BhlRhythmTransform,
} from '@composer-os/core/bhl/bhlRhythm';
import { buildGuitarGripLibrary, openStringMidisForTuning } from '@composer-os/core/guitar/guitarGripLibrary';
import {
  beatUnitQuarters,
  guitarRange,
  inGuitarRange,
  type PentatonicCollectionView,
  type RhythmSlot,
} from '@composer-os/core/pentatonic/motifTransform';
import {
  sourceRhythmAfterTransform,
  transformCell,
  type CellTransform,
} from '@composer-os/core/pentatonic/phraseOperators';
import {
  generatePracticeExample,
  type PracticeDifficulty,
} from '@composer-os/core/pentatonic/practiceFacade';
import {
  PENTATONIC_NOTE_CHOICES,
  canonicalPitchSetId,
  mod12,
} from '@composer-os/core/pentatonic/pitch';
import type { ScaleExplorerEntry, ScaleRegistration } from './scaleExplorer';
import { collectionOrigin, intervalsFromRoot, practicePositionWindow, transposeCollection } from './practiceFretboard';

export const PRACTICE_EXERCISE_FAMILIES = [
  { id: 'scale-pathways', label: 'Scale pathways' },
  { id: 'melodic-cells', label: 'Melodic cells' },
  { id: 'pentatonic-studies', label: 'Pentatonic studies' },
  { id: 'triad-dyad-studies', label: 'Triad and dyad studies' },
  { id: 'bhl-colour-studies', label: 'BHL colour studies' },
  { id: 'rhythmic-studies', label: 'Rhythmic studies' },
] as const;

export type PracticeExerciseFamily = (typeof PRACTICE_EXERCISE_FAMILIES)[number]['id'];

export const PRACTICE_STUDIO_DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', practice: 'SPARSE' },
  { id: 'intermediate', label: 'Intermediate', practice: 'INTERMEDIATE' },
  { id: 'advanced', label: 'Advanced', practice: 'EXPANDED' },
] as const;

export type PracticeStudioDifficulty = (typeof PRACTICE_STUDIO_DIFFICULTIES)[number]['id'];

export const PRACTICE_EXERCISE_BAR_COUNTS = [4, 8, 16] as const;
export type PracticeExerciseBarCount = (typeof PRACTICE_EXERCISE_BAR_COUNTS)[number];

/** Metres already accepted by beatUnitQuarters and the guitar MusicXML bar span. */
export const PRACTICE_EXERCISE_METRES = [
  { id: '4/4', beats: 4, beatType: 4 },
  { id: '3/4', beats: 3, beatType: 4 },
  { id: '2/4', beats: 2, beatType: 4 },
  { id: '5/4', beats: 5, beatType: 4 },
  { id: '6/8', beats: 6, beatType: 8 },
  { id: '7/8', beats: 7, beatType: 8 },
  { id: '9/8', beats: 9, beatType: 8 },
  { id: '12/8', beats: 12, beatType: 8 },
] as const;

export type PracticeExerciseMetreId = (typeof PRACTICE_EXERCISE_METRES)[number]['id'];

const PATHWAYS = ['ascending', 'descending', 'alternating', 'intervallic'] as const;
type Pathway = (typeof PATHWAYS)[number];

const CELL_TRANSFORMS: readonly CellTransform[] = ['original', 'rotation', 'transposition', 'M-DEG', 'M-NEAR'];

export interface PracticeExerciseTuning {
  requestedId: string;
  tuningId: string;
  standardSolver: boolean;
  openMidi: readonly number[];
  limitation: string | null;
}

export interface PracticeExerciseRequest {
  entry: ScaleExplorerEntry;
  rootPc: number;
  family: PracticeExerciseFamily;
  difficulty: PracticeStudioDifficulty;
  bars: PracticeExerciseBarCount;
  metreId: PracticeExerciseMetreId;
  tempoBpm: number;
  seed: number;
  tuning: PracticeExerciseTuning;
  /** Standard-tuning position window. Ignored for every other tuning. */
  position: number | null;
}

export interface PracticeExerciseEvent {
  bar: number;
  startBeat: number;
  duration: number;
  kind: 'note' | 'rest';
  pitches: readonly number[];
  pitchClasses: readonly number[];
}

export interface PracticeExerciseScaleStamp {
  mask: number;
  pitchClassId: string;
  soundingPitchClassId: string;
  rootPc: number;
  rootSpelling: string;
  name: string;
  status: string;
  registrations: readonly {
    registry: string;
    id: string;
    displayName: string;
    status: string | null;
  }[];
}

export interface PracticeExercise {
  available: boolean;
  unavailableReason: string | null;
  title: string;
  family: PracticeExerciseFamily;
  familyLabel: string;
  detail: string;
  difficulty: PracticeStudioDifficulty;
  practiceDifficulty: PracticeDifficulty;
  bars: PracticeExerciseBarCount;
  metreId: PracticeExerciseMetreId;
  beats: number;
  beatType: number;
  tempoBpm: number;
  seed: number;
  scale: PracticeExerciseScaleStamp;
  tuningId: string;
  position: number | null;
  positionApplied: boolean;
  events: readonly PracticeExerciseEvent[];
  pitchSequence: string;
  rhythmSummary: string;
  guitarNotes: readonly string[];
  validationErrors: readonly string[];
  reused: readonly string[];
}

export function practiceDifficultyFor(difficulty: PracticeStudioDifficulty): PracticeDifficulty {
  return PRACTICE_STUDIO_DIFFICULTIES.find((row) => row.id === difficulty)?.practice ?? 'SPARSE';
}

export function nextPracticeSeed(seed: number): number {
  const current = Number.isInteger(seed) ? seed : 1;
  return (current + 1) >>> 0 || 1;
}

export function generatePracticeExercise(request: PracticeExerciseRequest): PracticeExercise {
  const family = PRACTICE_EXERCISE_FAMILIES.find((row) => row.id === request.family) ?? PRACTICE_EXERCISE_FAMILIES[0]!;
  const metre = PRACTICE_EXERCISE_METRES.find((row) => row.id === request.metreId) ?? null;
  const practiceDifficulty = practiceDifficultyFor(request.difficulty);
  const sounding = transposeCollection(request.entry.pitchClasses, request.rootPc);
  const scale = scaleStamp(request.entry, request.rootPc, sounding);
  const guitarNotes: string[] = [];
  const validationErrors: string[] = [];
  const reused: string[] = [];
  const tempo = normalTempo(request.tempoBpm, validationErrors);
  const seed = Number.isInteger(request.seed) ? request.seed : 1;
  if (!Number.isInteger(request.seed)) validationErrors.push('Seed must be an integer. 1 was used.');
  if (!metre) validationErrors.push(`Metre ${request.metreId} is not a supported metre.`);
  if (!(PRACTICE_EXERCISE_BAR_COUNTS as readonly number[]).includes(request.bars)) {
    validationErrors.push('Bar count must be 4, 8, or 16.');
  }

  const base: PracticeExercise = {
    available: false,
    unavailableReason: null,
    title: family.label,
    family: family.id,
    familyLabel: family.label,
    detail: '',
    difficulty: request.difficulty,
    practiceDifficulty,
    bars: request.bars,
    metreId: request.metreId,
    beats: metre?.beats ?? 4,
    beatType: metre?.beatType ?? 4,
    tempoBpm: tempo,
    seed,
    scale,
    tuningId: request.tuning.tuningId,
    position: request.position,
    positionApplied: false,
    events: [],
    pitchSequence: '',
    rhythmSummary: '',
    guitarNotes,
    validationErrors,
    reused,
  };

  if (request.tuning.limitation) guitarNotes.push(request.tuning.limitation);
  if (sounding.length === 0) {
    return refuse(base, 'The empty set has no pitch classes. No exercise was generated.');
  }
  if (!metre || validationErrors.some((error) => error.startsWith('Bar count'))) {
    return refuse(base, validationErrors[0] ?? 'The request is not supported.');
  }

  const position = resolvePosition(request, guitarNotes);
  base.positionApplied = position.applied;
  const context: BuildContext = {
    request: { ...request, seed, tempoBpm: tempo },
    sounding,
    scale,
    metre,
    practiceDifficulty,
    position,
    guitarNotes,
    validationErrors,
    reused,
  };

  try {
    const built = buildFamily(context);
    if (!built) return refuse(base, context.validationErrors[0] ?? 'This exercise is unavailable.');
    const checked = checkEvents(built.events, context);
    return {
      ...base,
      available: checked.validationErrors.length === 0,
      unavailableReason: null,
      title: built.title,
      detail: built.detail,
      events: checked.events,
      pitchSequence: pitchSequence(checked.events),
      rhythmSummary: rhythmSummary(metre, request.bars, checked.events),
      guitarNotes: checked.guitarNotes,
      validationErrors: checked.validationErrors,
      reused,
      positionApplied: position.applied,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return refuse(base, message);
  }
}

interface PositionUse {
  applied: boolean;
  window: { from: number; to: number } | null;
}

interface BuildContext {
  request: PracticeExerciseRequest;
  sounding: readonly number[];
  scale: PracticeExerciseScaleStamp;
  metre: (typeof PRACTICE_EXERCISE_METRES)[number];
  practiceDifficulty: PracticeDifficulty;
  position: PositionUse;
  guitarNotes: string[];
  validationErrors: string[];
  reused: string[];
}

interface BuiltExercise {
  title: string;
  detail: string;
  events: PracticeExerciseEvent[];
}

function buildFamily(context: BuildContext): BuiltExercise | null {
  switch (context.request.family) {
    case 'scale-pathways':
      return buildPathway(context);
    case 'melodic-cells':
      return buildCells(context);
    case 'pentatonic-studies':
      return buildPentatonic(context);
    case 'triad-dyad-studies':
      return buildGrips(context);
    case 'bhl-colour-studies':
      return buildColour(context);
    case 'rhythmic-studies':
      return buildRhythm(context);
    default:
      context.validationErrors.push('Unknown exercise family.');
      return null;
  }
}

function buildPathway(context: BuildContext): BuiltExercise {
  const ordered = orderedFromRoot(context.sounding, context.request.rootPc);
  const allowed = pathwaysFor(context.request.difficulty);
  const pathway = allowed[mod(context.request.seed, allowed.length)]!;
  const unit = rhythmUnit(context.metre.beats, context.metre.beatType, context.request.difficulty);
  const slots = barSlots(context.metre.beats, context.metre.beatType, unit);
  const events: PracticeExerciseEvent[] = [];
  let cursor = mod(context.request.seed, ordered.length);
  let previous: number | null = null;
  for (let bar = 1; bar <= context.request.bars; bar += 1) {
    for (const slot of slots) {
      const pitchClass = pitchClassAt(pathway, ordered, cursor);
      cursor += 1;
      const placed = placePitch(pitchClass, previous, context);
      previous = placed.midi;
      events.push(noteEvent(bar, slot.startBeat, slot.duration, [placed.midi]));
    }
  }
  const rhythm = sourceRhythmAfterTransform(events.map(slotFromEvent));
  context.reused.push('transform pathway order', 'sourceRhythmAfterTransform', 'inGuitarRange');
  if (rhythm.length !== events.length) context.validationErrors.push('Phrase rhythm operator changed the event count.');
  context.guitarNotes.push(
    'Pitches are a sequence through the selected pitch classes. Nearest in-range MIDI avoids an octave leap when a closer pitch exists. This is not a fingering.'
  );
  return {
    title: `${context.scale.name} · ${pathway} pathway`,
    detail: pathway,
    events,
  };
}

function buildCells(context: BuildContext): BuiltExercise | null {
  const size = context.request.difficulty === 'beginner' ? 3 : context.request.difficulty === 'intermediate' ? 4 : 5;
  if (context.sounding.length < size) {
    context.validationErrors.push(
      `A ${size}-note cell needs ${size} pitch classes. This collection has ${context.sounding.length}. No shorter cell was substituted.`
    );
    return null;
  }
  const ordered = orderedFromRoot(context.sounding, context.request.rootPc);
  const collection = collectionView(context.scale.name, ordered, context.scale.rootSpelling);
  const allowed = cellTransformsFor(context.request.difficulty);
  const requested = allowed[mod(context.request.seed, allowed.length)]!;
  const source = placedCell(ordered.slice(0, size), context);
  const transformed = cellInsideCollection(source, collection, requested, allowed, context);
  if (!transformed) return null;
  const unit = rhythmUnit(context.metre.beats, context.metre.beatType, context.request.difficulty);
  const slots = barSlots(context.metre.beats, context.metre.beatType, unit);
  const events: PracticeExerciseEvent[] = [];
  for (let bar = 1; bar <= context.request.bars; bar += 1) {
    const barCell =
      bar === 1 ? transformed.pitches : transformCell({ pitches: transformed.pitches, collection, transform: 'rotation' });
    slots.forEach((slot, index) => {
      const pitch = barCell[index % barCell.length]!;
      events.push(noteEvent(bar, slot.startBeat, slot.duration, [pitch]));
    });
  }
  sourceRhythmAfterTransform(events.map(slotFromEvent));
  context.reused.push('transformCell', 'sourceRhythmAfterTransform');
  context.guitarNotes.push(
    'Cell pitches come from transformCell. A rotation is the same cell, not a new scale. Physical fingering is not solved.'
  );
  return {
    title: `${context.scale.name} · ${size}-note cell · ${transformed.transform}`,
    detail: `${size}-note ${transformed.transform}`,
    events,
  };
}

function buildPentatonic(context: BuildContext): BuiltExercise | null {
  const colour = context.scale.registrations.find((registration) => registration.registry === 'pentatonic-colour');
  if (!colour) {
    context.validationErrors.push(
      'Pentatonic studies use one of the 20 colour-registry collections. This selection is not one of them.'
    );
    return null;
  }
  const category = context.request.difficulty === 'advanced' ? 'CELL_LINEAGE' : 'HOME_CONTINUITY';
  const example = generatePracticeExample({
    fieldId: colour.id,
    centre: context.scale.rootSpelling,
    difficulty: context.practiceDifficulty,
    variation: Math.abs(context.request.seed),
    category,
  });
  context.reused.push('generatePracticeExample', 'transformCell');
  const collection = collectionView(colour.displayName, orderedFromRoot(context.sounding, context.request.rootPc), context.scale.rootSpelling);
  const inside = example.pitches.filter((pitch) => context.sounding.includes(mod12(pitch)) && inGuitarRange(pitch));
  if (inside.length < 3) {
    context.validationErrors.push(
      `generatePracticeExample returned ${example.pitches.length} pitches and ${inside.length} stayed inside this colour and guitarRange(). No replacement line was written.`
    );
    return null;
  }
  const cell = inside.slice(0, context.request.difficulty === 'beginner' ? 3 : 4);
  const unit = rhythmUnit(context.metre.beats, context.metre.beatType, context.request.difficulty);
  const slots = barSlots(context.metre.beats, context.metre.beatType, unit);
  const events: PracticeExerciseEvent[] = [];
  for (let bar = 1; bar <= context.request.bars; bar += 1) {
    const transform = CELL_TRANSFORMS[mod(context.request.seed + bar, 2)]!;
    const barCell = transform === 'original' ? cell : transformCell({ pitches: cell, collection, transform: 'rotation' });
    slots.forEach((slot, index) => {
      events.push(noteEvent(bar, slot.startBeat, slot.duration, [barCell[index % barCell.length]!]));
    });
  }
  context.guitarNotes.push(
    `${colour.displayName} stays a colour-registry id (${colour.id}). Difficulty ${context.practiceDifficulty} is the practice-facade grade. The facade's own MusicXML is not exported from this page.`
  );
  if (example.fieldId !== colour.id) {
    context.validationErrors.push(`Practice example field changed from ${colour.id} to ${example.fieldId}.`);
  }
  return {
    title: `${colour.displayName} · pentatonic study`,
    detail: `${colour.id} · ${category} · ${context.practiceDifficulty}`,
    events,
  };
}

function buildGrips(context: BuildContext): BuiltExercise | null {
  const matches = vaultChordsInside(context.sounding, context.request.rootPc);
  if (matches.length === 0) {
    context.validationErrors.push(
      'No Tonality Vault melodic triad sits inside this collection. buildGuitarGripLibrary was not called with an invented chord.'
    );
    return null;
  }
  const chordType = matches[mod(context.request.seed, matches.length)]!;
  const grips = buildGuitarGripLibrary(chordType, context.request.rootPc, context.request.tuning.tuningId);
  context.reused.push('selectQuadratonicMelodySpec', 'buildGuitarGripLibrary');
  const wantDyad = context.request.difficulty !== 'intermediate';
  const wantTriad = context.request.difficulty !== 'beginner';
  let chosen = grips.filter((grip) => {
    const size = grip.frets.length;
    if (size === 2 && wantDyad) return true;
    if (size === 3 && grip.tonalRole === 'triad' && wantTriad) return true;
    return false;
  });
  chosen = chosen.filter((grip) => grip.pitchClasses.every((pitchClass) => context.sounding.includes(pitchClass)));
  chosen = chosen.filter((grip) => gripMidis(grip.strings, grip.frets, context.request.tuning.tuningId).every((midi) => inGuitarRange(midi)));
  if (context.position.applied && context.position.window) {
    const window = context.position.window;
    chosen = chosen.filter((grip) => grip.frets.every((fret) => fret >= window.from && fret <= window.to));
  }
  if (chosen.length === 0) {
    context.validationErrors.push(
      `buildGuitarGripLibrary returned no ${wantDyad && wantTriad ? 'dyad or triad' : wantDyad ? 'dyad' : 'triad'} inside this collection, guitar range, and position window for ${chordType}.`
    );
    return null;
  }
  const unit = beatUnitQuarters(context.metre.beats, context.metre.beatType);
  const total = barQuarters(context.metre.beats, context.metre.beatType);
  const events: PracticeExerciseEvent[] = [];
  for (let bar = 1; bar <= context.request.bars; bar += 1) {
    const grip = chosen[mod(context.request.seed + bar - 1, chosen.length)]!;
    const midis = gripMidis(grip.strings, grip.frets, context.request.tuning.tuningId);
    events.push(noteEvent(bar, 0, unit, midis));
    if (total - unit > 1e-6) events.push(restEvent(bar, unit, roundBeat(total - unit)));
  }
  context.guitarNotes.push(
    `Shapes are ${chordType} grips from buildGuitarGripLibrary on ${context.request.tuning.tuningId}. A library fret pattern is not a physical playability test. Four-note vault grips are omitted.`
  );
  if (!context.request.tuning.standardSolver) {
    context.guitarNotes.push('pcFretboard was not called. These frets belong to the selected open strings.');
  }
  return {
    title: `${context.scale.name} · ${chordType} grips`,
    detail: chordType,
    events,
  };
}

function buildColour(context: BuildContext): BuiltExercise | null {
  const established = context.scale.registrations.filter(
    (registration) => registration.registry === 'hexatonic-scalar' || registration.registry === 'hexatonic-wps'
  );
  if (established.length === 0) {
    context.validationErrors.push(
      'BHL colour studies use an established scalar or WPS identity. Provisional, advanced, Explorer, and mathematical rows are not promoted.'
    );
    return null;
  }
  const registration = established[mod(context.request.seed, established.length)]!;
  const catalogue = context.request.entry.registrations.find((row) => row.registry === registration.registry && row.id === registration.id);
  const origin = collectionOrigin(context.request.entry.pitchClasses);
  if (!catalogue || origin === null) {
    context.validationErrors.push('The established collection could not be read from the explorer.');
    return null;
  }
  const referencePc = mod12(context.request.rootPc - origin);
  const family = registration.registry === 'hexatonic-scalar' ? 'scalar' : 'wps';
  const colour = resolveBhlHexatonicColour({ family, id: registration.id, referencePc });
  context.reused.push('resolveBhlHexatonicColour', 'applyHexatonicStrategy');
  if (canonicalPitchSetId(colour.pitchClasses) !== context.scale.soundingPitchClassId) {
    context.validationErrors.push(
      `Resolved ${colour.id} pitch classes ${canonicalPitchSetId(colour.pitchClasses)} do not match the selected sounding set. No substitute colour was used.`
    );
    return null;
  }
  if (colour.provisional || colour.status.startsWith('PROVISIONAL') || colour.status.startsWith('ADVANCED')) {
    context.validationErrors.push(`Colour status stayed ${colour.status}. It was not used as an approved collection.`);
    return null;
  }
  const attempts = colourAttempts(context.request.difficulty, context.request.seed, Boolean(colour.left && colour.right));
  const total = barQuarters(context.metre.beats, context.metre.beatType);
  const skeleton: BhlGuitarEvent[] = Array.from({ length: context.request.bars }, (_, index) => ({
    bar: index + 1,
    regionId: 'practice-colour',
    onsetQuarters: 0,
    quarters: total,
    midis: [64],
    pitchClasses: [mod12(64)],
  }));
  let chosen: { strategy: BhlHexatonicStrategy; events: BhlGuitarEvent[]; notes: string[] } | null = null;
  for (const strategy of attempts) {
    const result = applyHexatonicStrategy(skeleton, colour, strategy, context.request.seed);
    const pitches = result.events.flatMap((event) => event.midis);
    const inside = pitches.every((pitch) => context.sounding.includes(mod12(pitch)) && inGuitarRange(pitch));
    context.guitarNotes.push(...result.notes);
    if (!inside || pitches.length === 0) {
      context.guitarNotes.push(`${strategy} did not stay inside the collection and guitarRange().`);
      continue;
    }
    chosen = { strategy, events: result.events, notes: result.notes };
    break;
  }
  if (!chosen) {
    context.validationErrors.push(`No ${colour.id} strategy stayed inside the collection. Status remains ${colour.status}.`);
    return null;
  }
  const events = fillBarGaps(
    chosen.events.map((event) => noteEvent(event.bar, event.onsetQuarters, event.quarters, event.midis)),
    context.request.bars,
    total
  );
  context.guitarNotes.push(
    `${colour.id} status: ${colour.status}. artisticApproval is false. The event list was built for this exercise. No source score was read or written.`
  );
  if (context.request.tuning.standardSolver) {
    context.reused.push('positionShiftWarnings');
    const warnings = positionShiftWarnings(chosen.events);
    if (warnings.length === 0) context.guitarNotes.push('positionShiftWarnings reported no shift. That is not a playability approval.');
    for (const warning of warnings) {
      context.guitarNotes.push(warning);
      if (warning.includes('not a feasible')) context.validationErrors.push(warning);
    }
  } else {
    context.guitarNotes.push('positionShiftWarnings was not called. It reads standard-tuning frets.');
  }
  return {
    title: `${colour.label} · ${chosen.strategy}`,
    detail: `${colour.id} · ${colour.status} · ${chosen.strategy}`,
    events,
  };
}

function buildRhythm(context: BuildContext): BuiltExercise {
  const transform = rhythmTransformFor(context.request.difficulty, context.request.seed);
  const total = barQuarters(context.metre.beats, context.metre.beatType);
  const rootMidi = placePitch(context.request.rootPc, null, context).midi;
  const bars: BhlBassBar[] = Array.from({ length: context.request.bars }, (_, index) => ({
    bar: index + 1,
    quarters: total,
    attacks: [0],
    rests: [{ onset: 0.5, quarters: roundBeat(Math.max(0.5, total - 0.5)) }],
    notes: [{ onset: 0, quarters: Math.min(0.5, total), midi: rootMidi, pitchClass: mod12(rootMidi) }],
    pitchClasses: [mod12(rootMidi)],
    rootPc: mod12(rootMidi),
  }));
  const plans = planPhraseOnsets(bars, [
    {
      id: 'practice-rhythm',
      bars: bars.map((bar) => bar.bar),
      role: 'statement',
      rhythmTransform: transform,
      displacementQuarters: 0.5,
      ostinatoOnsets: [0.5, Math.min(2, total - 0.5)],
      ostinatoJustified: transform === 'ostinato',
      density: context.request.difficulty === 'beginner' ? 'single' : 'dyad',
      dialogue: 'leave-space',
    },
  ]);
  context.reused.push('planPhraseOnsets', 'sourceRhythmAfterTransform');
  const ordered = orderedFromRoot(context.sounding, context.request.rootPc);
  const events: PracticeExerciseEvent[] = [];
  let cursor = mod(context.request.seed, ordered.length);
  let previous: number | null = rootMidi;
  plans.forEach((plan, index) => {
    const raw: RhythmSlot[] = plan.onsets.map((onset, onsetIndex) => ({
      kind: 'note',
      startBeat: onset,
      duration: plan.durations[onsetIndex] ?? 0.5,
    }));
    const slots = sourceRhythmAfterTransform(raw);
    const notes: PracticeExerciseEvent[] = [];
    for (const slot of slots) {
      const pitchClass = ordered[cursor % ordered.length]!;
      cursor += 1;
      const placed = placePitch(pitchClass, previous, context);
      previous = placed.midi;
      notes.push(noteEvent(plan.bar, slot.startBeat, slot.duration, [placed.midi]));
    }
    if (slots.length === 0) context.validationErrors.push(`Bar ${index + 1} received no onsets from ${transform}.`);
    const inBar = notes.map((event) => ({ ...event, bar: 1 }));
    events.push(...fillBarGaps(inBar, 1, total).map((event) => ({ ...event, bar: plan.bar })));
  });
  context.guitarNotes.push(
    `Rhythm transform ${transform} comes from planPhraseOnsets. The bass grid is a planner input with one root attack. It is not a composition and it is not saved.`
  );
  return {
    title: `${context.scale.name} · ${transform}`,
    detail: transform,
    events,
  };
}

function cellInsideCollection(
  source: number[],
  collection: PentatonicCollectionView,
  requested: CellTransform,
  allowed: readonly CellTransform[],
  context: BuildContext
): { pitches: number[]; transform: CellTransform } | null {
  const order = [requested, ...allowed.filter((transform) => transform !== requested)];
  for (const transform of order) {
    let pitches: number[] = [];
    try {
      pitches = transformCell({ pitches: source, collection, transform });
    } catch (error) {
      context.guitarNotes.push(`${transform} was refused: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const inside = pitches.every((pitch) => context.sounding.includes(mod12(pitch)) && inGuitarRange(pitch));
    if (!inside) {
      context.guitarNotes.push(`${transform} left the collection or guitarRange().`);
      continue;
    }
    return { pitches, transform };
  }
  context.validationErrors.push('No cell transform kept every pitch inside the collection and guitarRange().');
  return null;
}

function colourAttempts(
  difficulty: PracticeStudioDifficulty,
  seed: number,
  hasTriads: boolean
): BhlHexatonicStrategy[] {
  if (!hasTriads) return ['dialogue'];
  if (difficulty === 'beginner') return ['dialogue'];
  if (difficulty === 'intermediate') return ['liquid', 'dialogue'];
  return seed % 2 === 0 ? ['sparse', 'dialogue'] : ['liquid', 'dialogue'];
}

function fillBarGaps(events: readonly PracticeExerciseEvent[], bars: number, total: number): PracticeExerciseEvent[] {
  const filled: PracticeExerciseEvent[] = [];
  for (let bar = 1; bar <= bars; bar += 1) {
    const notes = events
      .filter((event) => event.bar === bar && event.kind === 'note')
      .sort((left, right) => left.startBeat - right.startBeat);
    let cursor = 0;
    if (notes.length === 0) {
      filled.push(restEvent(bar, 0, total));
      continue;
    }
    for (const event of notes) {
      if (event.startBeat > cursor + 1e-6) filled.push(restEvent(bar, cursor, roundBeat(event.startBeat - cursor)));
      filled.push(event);
      cursor = roundBeat(event.startBeat + event.duration);
    }
    if (cursor < total - 1e-6) filled.push(restEvent(bar, cursor, roundBeat(total - cursor)));
  }
  return filled;
}

function rhythmTransformFor(difficulty: PracticeStudioDifficulty, seed: number): BhlRhythmTransform {
  if (difficulty === 'beginner') return 'state-onsets';
  if (difficulty === 'intermediate') return seed % 2 === 0 ? 'displace' : 'augment';
  const advanced: readonly BhlRhythmTransform[] = ['diminish', 'ostinato', 'silence-window', 'metre-compress'];
  return advanced[mod(seed, advanced.length)]!;
}

function pathwaysFor(difficulty: PracticeStudioDifficulty): readonly Pathway[] {
  if (difficulty === 'beginner') return ['ascending', 'descending'];
  if (difficulty === 'intermediate') return ['ascending', 'descending', 'alternating'];
  return PATHWAYS;
}

function cellTransformsFor(difficulty: PracticeStudioDifficulty): readonly CellTransform[] {
  if (difficulty === 'beginner') return ['original', 'rotation'];
  if (difficulty === 'intermediate') return ['original', 'rotation', 'transposition', 'M-DEG'];
  return CELL_TRANSFORMS;
}

function vaultChordsInside(sounding: readonly number[], rootPc: number): string[] {
  const present = new Set(sounding);
  const matches: string[] = [];
  for (const row of TONALITY_VAULT_DATABASE) {
    const spec = selectQuadratonicMelodySpec(row.chordType);
    if (!spec) continue;
    const triad = spec.melodicTriad.map((tone) => mod12(rootPc + tone.pitchClassFromRoot));
    if (triad.every((pitchClass) => present.has(pitchClass))) matches.push(row.chordType);
  }
  return matches;
}

function gripMidis(strings: readonly number[], frets: readonly number[], tuningId: string): number[] {
  const open = openStringMidisForTuning(tuningId);
  return frets.map((fret, index) => open[strings[index]!]! + fret);
}

function placedCell(pitchClasses: readonly number[], context: BuildContext): number[] {
  let previous: number | null = null;
  return pitchClasses.map((pitchClass) => {
    const placed = placePitch(pitchClass, previous, context);
    previous = placed.midi;
    return placed.midi;
  });
}

function placePitch(pitchClass: number, previous: number | null, context: BuildContext): { midi: number } {
  const [low, high] = guitarRange();
  const target = mod12(pitchClass);
  let best: number | null = null;
  let bestDistance = 999;
  for (let midi = low; midi <= high; midi += 1) {
    if (mod12(midi) !== target || !inGuitarRange(midi)) continue;
    if (!midiInPosition(midi, context)) continue;
    const distance = previous === null ? Math.abs(midi - 64) : Math.abs(midi - previous);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = midi;
    }
  }
  if (best === null) {
    context.validationErrors.push(
      `Pitch class ${target} has no guitarRange() pitch${context.position.applied ? ' inside the position window' : ''}.`
    );
    return { midi: low };
  }
  if (previous !== null && Math.abs(best - previous) > 12) {
    context.validationErrors.push(`Leap of ${Math.abs(best - previous)} semitones exceeds an octave.`);
  }
  return { midi: best };
}

function midiInPosition(midi: number, context: BuildContext): boolean {
  if (!context.position.applied || !context.position.window) return true;
  const window = context.position.window;
  return context.request.tuning.openMidi.some((open) => {
    const fret = midi - open;
    return fret >= window.from && fret <= window.to;
  });
}

function resolvePosition(request: PracticeExerciseRequest, guitarNotes: string[]): PositionUse {
  if (request.position === null) {
    guitarNotes.push('No position window is selected. Pitches are not assigned to frets.');
    return { applied: false, window: null };
  }
  if (!request.tuning.standardSolver) {
    guitarNotes.push('Position is not applied. pcFretboard and the position window use standard open strings only.');
    return { applied: false, window: null };
  }
  const window = practicePositionWindow(request.position);
  if (!window) {
    guitarNotes.push(`Position ${request.position} is outside fret 0–${15}. It was not applied.`);
    return { applied: false, window: null };
  }
  guitarNotes.push(
    `Position window frets ${window.from}–${window.to} filters sounding MIDI on standard tuning. It is not a solved scale fingering.`
  );
  return { applied: true, window };
}

function checkEvents(events: readonly PracticeExerciseEvent[], context: BuildContext): {
  events: PracticeExerciseEvent[];
  guitarNotes: string[];
  validationErrors: string[];
} {
  const total = barQuarters(context.metre.beats, context.metre.beatType);
  const guitarNotes = context.guitarNotes;
  const validationErrors = context.validationErrors;
  const copy = events.map((event) => ({
    ...event,
    pitches: [...event.pitches],
    pitchClasses: event.pitches.map((pitch) => mod12(pitch)),
  }));
  for (let bar = 1; bar <= context.request.bars; bar += 1) {
    const barEvents = copy.filter((event) => event.bar === bar).sort((left, right) => left.startBeat - right.startBeat);
    let cursor = 0;
    let summed = 0;
    for (const event of barEvents) {
      if (event.duration <= 1e-6) validationErrors.push(`Bar ${bar} has a non-positive duration.`);
      if (event.startBeat < cursor - 1e-6) validationErrors.push(`Bar ${bar} events overlap.`);
      if (event.startBeat + event.duration > total + 1e-6) validationErrors.push(`Bar ${bar} runs past the metre.`);
      cursor = event.startBeat + event.duration;
      summed += event.duration;
      for (const pitch of event.pitches) {
        if (!inGuitarRange(pitch)) validationErrors.push(`MIDI ${pitch} is outside guitarRange().`);
        if (!context.sounding.includes(mod12(pitch))) {
          validationErrors.push(`MIDI ${pitch} pitch class ${mod12(pitch)} is outside the selected collection.`);
        }
      }
    }
    if (Math.abs(summed - total) > 1e-3) {
      validationErrors.push(`Bar ${bar} durations sum to ${summed}, not ${total}.`);
    }
  }
  guitarNotes.push('Pitch-class membership is the selected sounding set. A pitch inside that set is not a verified fingering.');
  return { events: copy, guitarNotes, validationErrors: [...new Set(validationErrors)] };
}

function orderedFromRoot(pitchClasses: readonly number[], rootPc: number): number[] {
  return intervalsFromRoot(pitchClasses, rootPc).map((interval) => mod12(rootPc + interval));
}

function pitchClassAt(pathway: Pathway, ordered: readonly number[], index: number): number {
  const size = ordered.length;
  if (pathway === 'descending') return ordered[(size - 1 - (index % size) + size) % size]!;
  if (pathway === 'alternating') {
    const cycle = size === 1 ? 1 : (size - 1) * 2;
    const step = index % cycle;
    const degree = step < size ? step : cycle - step;
    return ordered[degree]!;
  }
  if (pathway === 'intervallic') return ordered[(index * 2) % size]!;
  return ordered[index % size]!;
}

function collectionView(name: string, ordered: readonly number[], rootSpelling: string): PentatonicCollectionView {
  return {
    name,
    archetypeId: ordered.join(','),
    referenceNote: rootSpelling,
    homeRelationshipLabel: null,
    orderedPitchClasses: ordered,
  };
}

function scaleStamp(entry: ScaleExplorerEntry, rootPc: number, sounding: readonly number[]): PracticeExerciseScaleStamp {
  const registrations = entry.registrations.map((registration) => ({
    registry: registration.registry,
    id: registration.id,
    displayName: registration.displayName,
    status: registration.status,
  }));
  const named = entry.registrations[0];
  return {
    mask: entry.mask,
    pitchClassId: entry.pitchClassId,
    soundingPitchClassId: canonicalPitchSetId(sounding),
    rootPc: mod12(rootPc),
    rootSpelling: PENTATONIC_NOTE_CHOICES[mod12(rootPc)] ?? 'C',
    name: named?.displayName ?? (entry.forte ? entry.forte.forte : `Set ${entry.pitchClassId}`),
    status: statusText(entry),
    registrations,
  };
}

function statusText(entry: ScaleExplorerEntry): string {
  if (entry.registrations.length === 0) {
    return entry.forte ? `${entry.forte.status} · ${entry.forte.forte}` : 'MATHEMATICAL SET';
  }
  return entry.registrations
    .map((registration) => registrationStatus(registration))
    .join(' · ');
}

function registrationStatus(registration: ScaleRegistration): string {
  return registration.status ?? `${registration.registry} ${registration.id}`;
}

function rhythmUnit(beats: number, beatType: number, difficulty: PracticeStudioDifficulty): number {
  const beat = beatUnitQuarters(beats, beatType);
  if (difficulty === 'beginner') return beat;
  const total = barQuarters(beats, beatType);
  const eighth = 0.5;
  if (Math.abs(total / eighth - Math.round(total / eighth)) < 1e-6) return eighth;
  return beat;
}

function barQuarters(beats: number, beatType: number): number {
  return beats * (4 / beatType);
}

function barSlots(beats: number, beatType: number, unit: number): { startBeat: number; duration: number }[] {
  const total = barQuarters(beats, beatType);
  const count = Math.max(1, Math.round(total / unit));
  const slots: { startBeat: number; duration: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const startBeat = roundBeat(index * unit);
    const duration = index === count - 1 ? roundBeat(total - startBeat) : roundBeat(unit);
    slots.push({ startBeat, duration });
  }
  return slots;
}

function noteEvent(bar: number, startBeat: number, duration: number, pitches: readonly number[]): PracticeExerciseEvent {
  return {
    bar,
    startBeat: roundBeat(startBeat),
    duration: roundBeat(duration),
    kind: 'note',
    pitches: [...pitches],
    pitchClasses: pitches.map((pitch) => mod12(pitch)),
  };
}

function restEvent(bar: number, startBeat: number, duration: number): PracticeExerciseEvent {
  return {
    bar,
    startBeat: roundBeat(startBeat),
    duration: roundBeat(duration),
    kind: 'rest',
    pitches: [],
    pitchClasses: [],
  };
}

function slotFromEvent(event: PracticeExerciseEvent): RhythmSlot {
  return { kind: event.kind, startBeat: event.startBeat, duration: event.duration };
}

function pitchSequence(events: readonly PracticeExerciseEvent[]): string {
  const bars = new Map<number, string[]>();
  for (const event of events) {
    const list = bars.get(event.bar) ?? [];
    if (event.kind === 'rest') list.push('rest');
    else list.push(event.pitches.map(scientific).join('+'));
    bars.set(event.bar, list);
  }
  return [...bars.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([bar, notes]) => `${bar}: ${notes.join(' ')}`)
    .join(' | ');
}

function scientific(midi: number): string {
  const spelling = PENTATONIC_NOTE_CHOICES[mod12(midi)] ?? String(mod12(midi));
  return `${spelling}${Math.floor(midi / 12) - 1}`;
}

function rhythmSummary(
  metre: (typeof PRACTICE_EXERCISE_METRES)[number],
  bars: number,
  events: readonly PracticeExerciseEvent[]
): string {
  const notes = events.filter((event) => event.kind === 'note').length;
  const rests = events.filter((event) => event.kind === 'rest').length;
  return `${metre.id} · ${bars} bars · ${notes} notes · ${rests} rests · bar length ${barQuarters(metre.beats, metre.beatType)} quarters`;
}

function normalTempo(tempo: number, errors: string[]): number {
  if (!Number.isFinite(tempo)) {
    errors.push('Tempo must be a number. 96 was used.');
    return 96;
  }
  const rounded = Math.round(tempo);
  if (rounded < 40 || rounded > 240) {
    errors.push('Tempo is stored between 40 and 240. Playback is not part of this checkpoint.');
    return Math.min(240, Math.max(40, rounded));
  }
  return rounded;
}

function refuse(base: PracticeExercise, reason: string): PracticeExercise {
  return {
    ...base,
    available: false,
    unavailableReason: reason,
    title: `${base.familyLabel} unavailable`,
    detail: reason,
    pitchSequence: '',
    rhythmSummary: '',
    validationErrors: base.validationErrors.includes(reason) ? base.validationErrors : [...base.validationErrors, reason],
  };
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function mod(value: number, size: number): number {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
}
