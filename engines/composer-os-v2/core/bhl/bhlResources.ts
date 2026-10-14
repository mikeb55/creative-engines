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
import { fieldFromResource } from '../pentatonic/fieldDistance';
import { extractParentField, type ExtractionResult } from '../pentatonic/parentExtraction';
import { HOME_RELATIONSHIPS, homeRelationshipById } from '../pentatonic/homeRelationships';
import { listPentatonicColourResources, getPentatonicColourResource } from '../pentatonic/colourRegistry';
import { collectionPitchClasses, mapMotifPitches, type PentatonicCollectionView } from '../pentatonic/motifTransform';
import { listPentatonicArchetypes, getPentatonicArchetype } from '../pentatonic/registry';
import { mod12, parseNoteToken } from '../pentatonic/pitch';
import { quartalSubsets } from '../pentatonic/quartalField';
import type { BhlRiffRequest } from './bhlRiffRhythm';
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
  /** Second colour registry id. Empty means no contrast. */
  contrastId?: string | null;
}

export interface BhlMusicalRequest {
  profileId?: string | null;
  riff?: BhlRiffRequest | null;
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
  contrastPcs: number[] | null;
  contrastLabel: string | null;
  colourConstraint: string | null;
  parentExtraction: ExtractionResult | null;
  motif: BhlMotifResolution | null;
  quartal: boolean;
  limitations: string[];
}

export interface BhlResourceCatalog {
  profiles: readonly BhlStyleProfile[];
  pentatonic: Array<{ id: string; name: string; intervals: readonly number[] }>;
  colours: Array<{
    id: string;
    name: string;
    intervals: readonly number[];
    family: string;
    role: string;
    pathArchetypeId: string | null;
  }>;
  relationships: Array<{ id: string; label: string; offset: number }>;
  referenceNotes: readonly string[];
  engines: {
    riff: 'generateRiffCoreMotif';
    riffRhythm: 'generateRiffCoreMotif.rhythmPattern | buildMultiBarRhythm | hasSyncopation';
    motif: 'transposeMotif | invertMotifLite | mapMotifPitches';
    pentatonic: 'listPentatonicColourResources | listPentatonicArchetypes | HOME_RELATIONSHIPS | extractParentField | fieldFromResource';
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
    colours: listPentatonicColourResources().map((row) => ({
      id: row.id,
      name: row.displayName,
      intervals: row.intervals,
      family: row.family,
      role: row.role,
      pathArchetypeId: row.pathArchetypeId,
    })),
    relationships: HOME_RELATIONSHIPS.map((row) => ({ id: row.id, label: row.label, offset: row.offset })),
    referenceNotes: NOTE_NAMES,
    engines: {
      riff: 'generateRiffCoreMotif',
      riffRhythm: 'generateRiffCoreMotif.rhythmPattern | buildMultiBarRhythm | hasSyncopation',
      motif: 'transposeMotif | invertMotifLite | mapMotifPitches',
      pentatonic: 'listPentatonicColourResources | listPentatonicArchetypes | HOME_RELATIONSHIPS | extractParentField | fieldFromResource',
      vault: 'chooseVaultChord | listBhlFieldChoices',
      liquid: 'planLiquidHarmony',
      quartal: 'quartalSubsets',
    },
    notWired: [
      'Audio playback is not a BHL service. Export MusicXML and audition in Sibelius.',
      'Pentatonic path search still accepts only major and minor pentatonic. Other colour-registry collections stay inside BHL.',
      'Performance Composer does not take a BHL object. Hand it the exported MusicXML through Respond.',
      'The Riff Engine does not import BHL MusicXML. Pitch and rhythm move from the riff into BHL.',
      'Artist-named style profiles are not provided.',
    ],
  };
}

export function bhlPentatonicPitchClasses(request: BhlPentatonicRequest): { pitchClasses: number[]; label: string; pathArchetype: boolean } {
  const colour = getPentatonicColourResource(request.archetypeId);
  const archetype = getPentatonicArchetype(request.archetypeId);
  if (!colour && !archetype) {
    throw new Error(`pentatonic collection ${request.archetypeId} is not in the colour registry or the path registry`);
  }
  const reference = parseNoteToken(request.referenceNote);
  if (!reference) throw new Error(`reference note ${request.referenceNote} is not a pitch name`);
  const relationship = homeRelationshipById(request.relationshipId) ?? HOME_RELATIONSHIPS[0]!;
  const shifted = NOTE_NAMES[mod12(reference.pc + relationship.offset)]!;
  if (!colour) {
    const view: PentatonicCollectionView = {
      name: `${archetype!.displayName} ${shifted} ${relationship.label}`,
      archetypeId: archetype!.id,
      referenceNote: shifted,
      homeRelationshipLabel: relationship.label,
    };
    return { pitchClasses: collectionPitchClasses(view).map(mod12), label: view.name, pathArchetype: true };
  }
  const field = fieldFromResource(colour.id, shifted);
  if (!field) throw new Error(`colour ${colour.id} did not build a field on ${shifted}`);
  return {
    pitchClasses: [...field.pitchClasses],
    label: `${field.displayName} · ${relationship.label}`,
    pathArchetype: colour.pathArchetypeId != null,
  };
}

export function bhlColourRelations(archetypeId: string, referenceNote: string, relationshipId: string): {
  pitchClasses: number[];
  label: string;
  compatible: Array<{ id: string; name: string; shared: number[] }>;
  contrasting: Array<{ id: string; name: string; shared: number[] }>;
} {
  const mine = bhlPentatonicPitchClasses({ archetypeId, referenceNote, relationshipId });
  const mineSet = new Set(mine.pitchClasses);
  const shifted = mine.label.split(' ')[0] || referenceNote;
  const compatible: Array<{ id: string; name: string; shared: number[] }> = [];
  const contrasting: Array<{ id: string; name: string; shared: number[] }> = [];
  for (const row of listPentatonicColourResources()) {
    if (row.id === archetypeId) continue;
    const field = fieldFromResource(row.id, shifted);
    if (!field) continue;
    const shared = field.pitchClasses.filter((pitchClass) => mineSet.has(pitchClass));
    const item = { id: row.id, name: row.displayName, shared: [...shared] };
    if (shared.length >= 3) compatible.push(item);
    else if (shared.length <= 1) contrasting.push(item);
  }
  return { pitchClasses: mine.pitchClasses, label: mine.label, compatible, contrasting };
}

export function describeBhlColourConstraint(
  world: BhlWorldId,
  label: string,
  collection: readonly number[],
  bars: readonly BhlBassBar[],
  plan: BhlPhrasePlan,
): string {
  const names = collection.map((pitchClass) => NOTE_NAMES[mod12(pitchClass)]).join(' ');
  if (world === 'E') {
    return `World E uses ${label} as its pitch source (${names}).`;
  }
  const worldPcs = new Set<number>();
  for (const bar of bars) {
    const region = plan.regions.find((item) => item.bars.includes(bar.bar));
    const field = buildBhlWorldField(world, bar, region?.tensionState ?? 'primary');
    for (const pitchClass of field.pitchClasses) worldPcs.add(pitchClass);
  }
  const shared = collection.filter((pitchClass) => worldPcs.has(mod12(pitchClass)));
  const leftOut = collection.filter((pitchClass) => !worldPcs.has(mod12(pitchClass)));
  if (!shared.length) {
    return `World ${world} shares no pitch with ${label}. The guitar stays on the world field. This colour was not rewritten as major or minor pentatonic.`;
  }
  const sharedNames = shared.map((pitchClass) => NOTE_NAMES[mod12(pitchClass)]).join(' ');
  const leftNames = leftOut.map((pitchClass) => NOTE_NAMES[mod12(pitchClass)]).join(' ');
  return `World ${world} keeps its harmonic field. ${label} can sound ${sharedNames}. ${leftNames || 'No pitch'} stays outside that field.`;
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
    limitations.push(
      'Riff rhythm is recorded on this motif. BHL places those attacks only when the rhythm source is a riff. A BHL rhythm source leaves this grid unused.',
    );
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
    const target = bhlPentatonicPitchClasses(pentatonic);
    if (getPentatonicArchetype(pentatonic.archetypeId)) {
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
      const kept = mapped.notes.filter((note) => note.retainedCommonTone).length;
      notes = mapped.notes.map((note) => ({ pitch: note.pitch, startBeat: note.startBeat, duration: note.duration }));
      limitations.push(`${kept} motif tone(s) stayed as common tones on ${target.label}.`);
      source = `${source}→${target.label}`;
    } else {
      let kept = 0;
      notes = notes.map((note) => {
        const pc = mod12(note.pitch);
        if (target.pitchClasses.includes(pc)) {
          kept += 1;
          return note;
        }
        const snapped = nearest(pc, target.pitchClasses);
        return { ...note, pitch: midiNear(snapped, 52, 84, note.pitch) };
      });
      limitations.push(`${kept} common tone(s) stayed. The other motif notes moved onto ${target.label}. They were not rewritten as major or minor pentatonic.`);
      source = `${source}→${target.label}`;
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
  let contrastPcs: number[] | null = null;
  let contrastLabel: string | null = null;
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
    if (request.pentatonic.contrastId) {
      const contrast = getPentatonicColourResource(request.pentatonic.contrastId);
      if (!contrast) {
        throw new Error(`contrast collection ${request.pentatonic.contrastId} is not in the colour registry`);
      }
      const builtContrast = bhlPentatonicPitchClasses({
        archetypeId: contrast.id,
        referenceNote: request.pentatonic.referenceNote,
        relationshipId: request.pentatonic.relationshipId,
      });
      contrastPcs = builtContrast.pitchClasses;
      contrastLabel = builtContrast.label;
      const shared = contrastPcs.filter((pitchClass) => pentatonicPcs!.includes(pitchClass));
      limitations.push(`Common tones between ${built.label} and ${builtContrast.label}: ${shared.map((pitchClass) => NOTE_NAMES[pitchClass]).join(' ') || 'none'}.`);
    }
  }
  let motif: BhlMotifResolution | null = null;
  const motifRequest: BhlMotifRequest | null = request?.riff?.pitchSource === 'riff'
    ? {
        kind: 'riff',
        riffSeed: request.riff.pitchSeed ?? request.motif?.riffSeed ?? 1,
        pitchTransform: request.motif?.pitchTransform ?? 'none',
        semitones: request.motif?.semitones,
        pitches: request.motif?.pitches,
        intervals: request.motif?.intervals,
      }
    : request?.motif ?? null;
  if (motifRequest) {
    motif = resolveBhlMotif(motifRequest, request?.pentatonic ?? null);
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
    if (motifRequest.pitchTransform === 'fragment') {
      for (const region of next.regions) {
        if (region.role === 'continuation') region.continuation = 'fragment';
      }
    }
    if (motifRequest.pitchTransform === 'invert') {
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
    contrastPcs,
    contrastLabel,
    colourConstraint: null,
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
  contrast: readonly number[] | null = null,
): { commonTones: number; contrasts: number; transferNote: string | null } {
  const allowed = new Set(collection.map(mod12));
  const contrastSet = contrast ? new Set(contrast.map(mod12)) : null;
  let commonTones = 0;
  let contrasts = 0;
  let transferMiss = 0;
  const develop = plan.regions.some((region) => region.role === 'development' || region.role === 'transformation');
  for (const event of events) {
    if (event.voice === '2') continue;
    const region = plan.regions.find((item) => item.id === event.regionId);
    if (!region) continue;
    const contrastingRole = region.role === 'development' || region.role === 'transformation';
    if (world !== 'E' && (region.role === 'statement' || region.role === 'return')) continue;
    const bar = bars.find((candidate) => candidate.bar === event.bar);
    if (!bar) continue;
    const field = buildBhlWorldField(world, bar, region.tensionState);
    const target = contrastSet && contrastingRole ? contrastSet : allowed;
    const intersection = field.pitchClasses.filter((pitchClass) => target.has(pitchClass));
    if (world !== 'E' && !intersection.length) {
      transferMiss += 1;
      continue;
    }
    const pool = world === 'E' ? [...target] : intersection;
    const top = mod12(Math.max(...event.midis));
    const outsiders = [...new Set(event.pitchClasses.map(mod12))].filter((pitchClass) => !pool.includes(pitchClass));
    if (world === 'E' && region.outsideColour === true && outsiders.length === 1) continue;
    if (pool.includes(top) && (world === 'E' || field.pitchClasses.includes(top))) {
      if (allowed.has(top) && target === contrastSet) commonTones += 1;
      else if (allowed.has(top)) commonTones += 1;
      continue;
    }
    const snapped = nearest(top, pool);
    const midi = midiNear(snapped, region.registerLow, region.registerHigh, Math.max(...event.midis));
    event.midis = [midi];
    event.pitchClasses = [mod12(midi)];
    if (allowed.has(mod12(midi)) && target === contrastSet) commonTones += 1;
    if (contrastSet && contrastingRole && contrastSet.has(mod12(midi))) contrasts += 1;
  }
  let transferNote: string | null = null;
  if (contrastSet && !develop) transferNote = 'This phrase has no development region, so the contrasting collection was not applied.';
  else if (transferMiss && world !== 'E') {
    transferNote = `On ${transferMiss} attack(s) the selected colour shares nothing with the world field, so those notes stayed put.`;
  }
  return { commonTones, contrasts, transferNote };
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
