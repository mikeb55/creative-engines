/**
 * BHL Batch B adapters.
 * Calls existing motif, pentatonic, vault, liquid-harmony, and quartal functions.
 * Does not modify those engines.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { planLiquidHarmony, type LiquidHarmonyPlan } from '../harmony/liquidHarmonyPlanner';
import type { TensionState } from '../harmony/layerStateMachine';
import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import { invertMotifLite, transposeMotif } from '../motif/motifTracker';
import type { BaseMotif, MotifNote } from '../motif/motifTypes';
import { extractParentField, type ExtractionResult } from '../pentatonic/parentExtraction';
import { HOME_RELATIONSHIPS, homeRelationshipById } from '../pentatonic/homeRelationships';
import { collectionPitchClasses, mapMotifPitches, type PentatonicCollectionView } from '../pentatonic/motifTransform';
import { listPentatonicArchetypes, getPentatonicArchetype } from '../pentatonic/registry';
import { mod12, parseNoteToken } from '../pentatonic/pitch';
import { quartalSubsets } from '../pentatonic/quartalField';
import { chooseVaultChord, listBhlFieldChoices, motifIntervals, type BhlFieldChoice, type BhlGuitarEvent, type BhlPhrasePlan } from './bhlPhrase';
import type { BhlBassBar } from './bhlRhythm';
import { buildBhlWorldField, type BhlWorldId } from './bhlWorlds';
import { BHL_STYLE_PROFILES, applyBhlProfile, bhlProfileById, type BhlStyleProfile } from './bhlProfiles';
import type { BhlPhraseArc, BhlRhythmMode } from './bhlPhraseShape';
import type { BhlContinuationStrategy } from './bhlPhrase';

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type BhlMotifKind = 'import' | 'riff' | 'constraints';
export type BhlMotifPitchTransform = 'none' | 'transpose' | 'invert' | 'fragment' | 'register';

export interface BhlMotifRequest {
  kind: BhlMotifKind;
  pitches?: readonly number[];
  intervals?: readonly number[];
  riffSeed?: number;
  pitchTransform?: BhlMotifPitchTransform;
  semitones?: number;
}

export interface BhlPentatonicRequest {
  archetypeId: string;
  referenceNote: string;
  relationshipId: string;
}

export interface BhlMusicalRequest {
  profileId?: string | null;
  pentatonic?: BhlPentatonicRequest | null;
  /** Use parent extraction instead of the archetype when the parent yields a field. */
  parentPitchClasses?: readonly number[] | null;
  motif?: BhlMotifRequest | null;
  quartal?: boolean | null;
}

export interface BhlMotifResolution {
  source: string;
  pitchClasses: number[];
  intervals: number[];
  registerShift: number;
  notes: MotifNote[];
  limitations: string[];
  riffRhythm: Array<{ startBeat: number; duration: number }> | null;
}

export interface BhlPreparedMusic {
  plan: BhlPhrasePlan;
  profile: BhlStyleProfile | null;
  rhythm: BhlRhythmMode | null;
  phraseArc: BhlPhraseArc | null;
  continuation: BhlContinuationStrategy | null;
  pentatonicPcs: number[] | null;
  pentatonicLabel: string | null;
  parentExtraction: ExtractionResult | null;
  motif: BhlMotifResolution | null;
  quartal: boolean;
  limitations: string[];
}

export interface BhlResourceCatalog {
  profiles: readonly BhlStyleProfile[];
  pentatonic: Array<{ id: string; name: string; intervals: readonly number[] }>;
  relationships: Array<{ id: string; label: string; offset: number }>;
  referenceNotes: readonly string[];
  engines: {
    riff: 'generateRiffCoreMotif';
    motif: 'transposeMotif | invertMotifLite | mapMotifPitches';
    pentatonic: 'listPentatonicArchetypes | HOME_RELATIONSHIPS | extractParentField';
    vault: 'chooseVaultChord | listBhlFieldChoices';
    liquid: 'planLiquidHarmony';
    quartal: 'quartalSubsets';
  };
  /** Present in the repo only as documentation or as an engine this page does not call. */
  notWired: string[];
}

function nearest(pitchClass: number, field: readonly number[]): number {
  const target = mod12(pitchClass);
  let best = field[0] ?? target;
  let bestDistance = 99;
  for (const candidate of field) {
    const raw = Math.abs(target - candidate);
    const distance = Math.min(raw, 12 - raw);
    if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function midiNear(pitchClass: number, low: number, high: number, previous: number): number {
  const want = mod12(pitchClass);
  const candidates: number[] = [];
  for (let midi = low; midi <= high; midi++) if (mod12(midi) === want) candidates.push(midi);
  if (!candidates.length) {
    for (let midi = 52; midi <= 84; midi++) if (mod12(midi) === want) candidates.push(midi);
  }
  return candidates.sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous) || a - b)[0] ?? previous;
}

export function bhlResourceCatalog(): BhlResourceCatalog {
  return {
    profiles: BHL_STYLE_PROFILES,
    pentatonic: listPentatonicArchetypes().map((row) => ({
      id: row.id,
      name: row.displayName,
      intervals: row.intervals,
    })),
    relationships: HOME_RELATIONSHIPS.map((row) => ({ id: row.id, label: row.label, offset: row.offset })),
    referenceNotes: NOTE_NAMES,
    engines: {
      riff: 'generateRiffCoreMotif',
      motif: 'transposeMotif | invertMotifLite | mapMotifPitches',
      pentatonic: 'listPentatonicArchetypes | HOME_RELATIONSHIPS | extractParentField',
      vault: 'chooseVaultChord | listBhlFieldChoices',
      liquid: 'planLiquidHarmony',
      quartal: 'quartalSubsets',
    },
    notWired: [
      'Audio playback is not a BHL service. Export MusicXML and audition in Sibelius.',
      'Colour-registry resources beyond major and minor pentatonic are not a BHL pitch source in this batch.',
      'Artist-named style profiles are not provided.',
    ],
  };
}

export function bhlPentatonicPitchClasses(request: BhlPentatonicRequest): { pitchClasses: number[]; label: string } {
  const archetype = getPentatonicArchetype(request.archetypeId);
  if (!archetype) throw new Error(`pentatonic collection ${request.archetypeId} is not in the registry`);
  const reference = parseNoteToken(request.referenceNote);
  if (!reference) throw new Error(`reference note ${request.referenceNote} is not a pitch name`);
  const relationship = homeRelationshipById(request.relationshipId) ?? HOME_RELATIONSHIPS[0]!;
  const shifted = mod12(reference.pc + relationship.offset);
  const view: PentatonicCollectionView = {
    name: `${archetype.displayName} ${NOTE_NAMES[shifted]} ${relationship.label}`,
    archetypeId: archetype.id,
    referenceNote: NOTE_NAMES[shifted]!,
    homeRelationshipLabel: relationship.label,
  };
  return { pitchClasses: collectionPitchClasses(view).map(mod12), label: view.name };
}

export function bhlParentFields(parentPitchClasses: readonly number[]): ExtractionResult {
  return extractParentField({
    parentPitchClasses,
    centreSpelling: 'C',
  });
}

export function bhlLiquidPreview(chordType: string, rootPc: number, tension: TensionState): LiquidHarmonyPlan {
  return planLiquidHarmony(chordType, rootPc, tension);
}

export function bhlVaultChoices(field: readonly number[], rootPc: number): BhlFieldChoice[] {
  return listBhlFieldChoices(field, rootPc);
}

export function bhlVaultChoice(field: readonly number[], rootPc: number) {
  return chooseVaultChord(field, rootPc);
}

function notesFromPitches(pitches: readonly number[]): MotifNote[] {
  return pitches.map((pitch, index) => ({
    pitch,
    startBeat: index,
    duration: 1,
  }));
}

function notesFromIntervals(intervals: readonly number[], start = 64): MotifNote[] {
  const pitches = [start];
  for (const interval of intervals) pitches.push(pitches[pitches.length - 1]! + interval);
  return notesFromPitches(pitches);
}

export function resolveBhlMotif(request: BhlMotifRequest, pentatonic: BhlPentatonicRequest | null): BhlMotifResolution {
  const limitations: string[] = [];
  let source = request.kind;
  let notes: MotifNote[] = [];
  let riffRhythm: BhlMotifResolution['riffRhythm'] = null;
  if (request.kind === 'riff') {
    const riff = generateRiffCoreMotif(request.riffSeed ?? 1);
    notes = notesFromIntervals(riff.intervalPattern, 67);
    riffRhythm = riff.rhythmPattern.map((slot) => ({ startBeat: slot.startBeat, duration: slot.duration }));
    source = `riff:${riff.id}`;
    limitations.push(
      'The riff generator builds a contour from its own Cmaj7 cell. BHL keeps that contour and does not keep the Cmaj7 chord.',
    );
    limitations.push('Riff rhythm is reported. BHL onsets still come from the rhythm control, not from the riff grid.');
  } else if (request.kind === 'constraints') {
    const intervals = (request.intervals ?? []).filter((interval) => Number.isInteger(interval));
    if (!intervals.length) throw new Error('constraint motif needs at least one integer interval');
    notes = notesFromIntervals(intervals, 64);
    source = 'constraints';
  } else {
    const pitches = (request.pitches ?? []).filter((pitch) => Number.isInteger(pitch));
    if (pitches.length < 2) throw new Error('imported motif needs at least two MIDI pitches');
    notes = notesFromPitches(pitches);
    source = 'import';
  }
  const transform = request.pitchTransform ?? 'none';
  let registerShift = 0;
  if (transform === 'transpose') {
    notes = transposeMotif(notes, request.semitones ?? 0);
  } else if (transform === 'invert') {
    notes = invertMotifLite(notes);
  } else if (transform === 'fragment') {
    notes = notes.slice(0, Math.max(2, Math.ceil(notes.length / 2)));
  } else if (transform === 'register') {
    registerShift = 12;
    notes = transposeMotif(notes, 12);
  }
  if (pentatonic) {
    try {
      const target = bhlPentatonicPitchClasses(pentatonic);
      const sourceView: PentatonicCollectionView = {
        name: 'Major Pentatonic C',
        archetypeId: 'major_pentatonic',
        referenceNote: 'C',
        homeRelationshipLabel: 'HOME',
      };
      const targetView: PentatonicCollectionView = {
        name: target.label,
        archetypeId: pentatonic.archetypeId,
        referenceNote: pentatonic.referenceNote,
        homeRelationshipLabel: homeRelationshipById(pentatonic.relationshipId)?.label ?? 'HOME',
      };
      const motif: BaseMotif = { id: 'bhl-motif', notes, barCount: 1 };
      const mapped = mapMotifPitches({
        motif,
        rhythm: notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration })),
        source: sourceView,
        target: targetView,
        method: 'M-NEAR',
        meter: { beats: 4, beatType: 4 },
      });
      notes = mapped.notes.map((note) => ({ pitch: note.pitch, startBeat: note.startBeat, duration: note.duration }));
      source = `${source}→${target.label}`;
    } catch (error) {
      limitations.push(error instanceof Error ? error.message : String(error));
    }
  }
  const pitchClasses = notes.map((note) => mod12(note.pitch));
  return {
    source,
    pitchClasses,
    intervals: motifIntervals(pitchClasses),
    registerShift,
    notes,
    limitations,
    riffRhythm,
  };
}

export function prepareBhlMusic(plan: BhlPhrasePlan, request: BhlMusicalRequest | null | undefined): BhlPreparedMusic {
  const limitations: string[] = [];
  let next = plan;
  let profile: BhlStyleProfile | null = null;
  if (request?.profileId) {
    profile = bhlProfileById(request.profileId) ?? null;
    if (!profile) throw new Error(`style profile ${request.profileId} is not available`);
    next = applyBhlProfile(next, profile.id);
  }
  let pentatonicPcs: number[] | null = null;
  let pentatonicLabel: string | null = null;
  let parentExtraction: ExtractionResult | null = null;
  if (request?.parentPitchClasses && request.parentPitchClasses.length) {
    parentExtraction = bhlParentFields(request.parentPitchClasses);
    const strongest = parentExtraction.candidates[0];
    if (parentExtraction.disposition === 'FIELDS' && strongest && !request.pentatonic) {
      pentatonicPcs = [...strongest.field.pitchClasses];
      pentatonicLabel = `parent:${strongest.field.displayName}`;
    } else if (parentExtraction.disposition !== 'FIELDS') {
      limitations.push(parentExtraction.explanation);
    }
  }
  if (request?.pentatonic) {
    const built = bhlPentatonicPitchClasses(request.pentatonic);
    pentatonicPcs = built.pitchClasses;
    pentatonicLabel = built.label;
  }
  let motif: BhlMotifResolution | null = null;
  if (request?.motif) {
    motif = resolveBhlMotif(request.motif, request.pentatonic ?? null);
    limitations.push(...motif.limitations);
    next = structuredClone(next);
    next.motif = {
      ...next.motif,
      pitchClasses: motif.pitchClasses,
      intervals: motif.intervals,
    };
    if (motif.registerShift) {
      for (const region of next.regions) {
        region.registerLow = Math.min(76, region.registerLow + motif.registerShift);
        region.registerHigh = Math.min(88, region.registerHigh + motif.registerShift);
      }
    }
    if (request.motif.pitchTransform === 'fragment') {
      for (const region of next.regions) {
        if (region.role === 'continuation') region.continuation = 'fragment';
      }
    }
    if (request.motif.pitchTransform === 'invert') {
      for (const region of next.regions) {
        if (region.role === 'development' || region.role === 'transformation') region.pitchTransform = 'invert-into-field';
      }
    }
  }
  const quartal = request?.quartal === true || (request?.quartal == null && profile?.quartal === true);
  return {
    plan: next,
    profile,
    rhythm: profile?.rhythm ?? null,
    phraseArc: profile?.phraseArc ?? null,
    continuation: profile?.continuation ?? null,
    pentatonicPcs,
    pentatonicLabel,
    parentExtraction,
    motif,
    quartal,
    limitations,
  };
}

export function preferPentatonicOnEvents(
  events: BhlGuitarEvent[],
  plan: BhlPhrasePlan,
  bars: readonly BhlBassBar[],
  world: BhlWorldId,
  collection: readonly number[],
): { commonTones: number; contrasts: number } {
  const allowed = new Set(collection.map(mod12));
  let commonTones = 0;
  let contrasts = 0;
  let contrastBudget = 1;
  for (const event of events) {
    if (event.voice === '2') continue;
    const region = plan.regions.find((item) => item.id === event.regionId);
    if (!region || region.role === 'statement' || region.role === 'return') continue;
    const bar = bars.find((candidate) => candidate.bar === event.bar);
    if (!bar) continue;
    const field = buildBhlWorldField(world, bar, region.tensionState);
    const intersection = field.pitchClasses.filter((pitchClass) => allowed.has(pitchClass));
    const pool = world === 'E' ? [...allowed] : intersection.length ? intersection : field.pitchClasses;
    const top = mod12(Math.max(...event.midis));
    const inWorld = field.pitchClasses.includes(top);
    const inCollection = allowed.has(top);
    if (inWorld && inCollection) {
      commonTones += 1;
      continue;
    }
    if (inWorld && !inCollection && contrastBudget > 0 && region.role === 'development') {
      contrastBudget -= 1;
      contrasts += 1;
      continue;
    }
    const snapped = nearest(top, pool);
    const midi = midiNear(snapped, region.registerLow, region.registerHigh, Math.max(...event.midis));
    event.midis = [midi];
    event.pitchClasses = [mod12(midi)];
    if (allowed.has(mod12(midi)) && field.pitchClasses.includes(mod12(midi))) commonTones += 1;
  }
  return { commonTones, contrasts };
}

export function applyQuartalColour(
  events: BhlGuitarEvent[],
  allowed: readonly number[],
): { applied: number; note: string } {
  const subsets = quartalSubsets(allowed);
  if (!subsets.length) {
    return { applied: 0, note: 'No quartal subset in this pitch collection. Dyads were left as the world wrote them.' };
  }
  let applied = 0;
  for (const event of events) {
    if (event.voice === '2' || event.midis.length < 2) continue;
    const melody = Math.max(...event.midis);
    const lowerPc = mod12(melody - 5);
    if (!allowed.includes(lowerPc)) continue;
    const lower = melody - 5;
    if (lower < 52) continue;
    if (!assessGuitarFeasibility([lower, melody]).feasible) continue;
    event.midis = [lower, melody].sort((a, b) => a - b);
    event.pitchClasses = [mod12(lower), mod12(melody)].sort((a, b) => a - b);
    applied += 1;
  }
  if (!applied) {
    return { applied: 0, note: 'A quartal subset exists, but no dyad could take a fourth inside the guitar range and the world field.' };
  }
  return { applied, note: `${applied} dyad(s) moved to a perfect fourth from quartalSubsets.` };
}
