/**
 * Candidate generation. Suitability is not decided here.
 * Pools: registry transpositions allowed by depth, HOME relationship transpositions,
 * the current collection, and pinned collections. Equivalent absolute pitch sets merge.
 */

import { HOME_RELATIONSHIPS } from './homeRelationships';
import { getPentatonicArchetype, listPentatonicArchetypes, type PentatonicArchetype } from './registry';
import {
  canonicalPitchSet,
  canonicalPitchSetId,
  mod12,
  parseNoteList,
  parseNoteToken,
  spellFromReference,
  uniquePitchClasses,
  type ParsedNote,
} from './pitch';
import type { PentatonicCollectionSpec, PentatonicDepth, PentatonicInterpretation } from './types';

export interface GeneratedCandidate {
  canonicalPitchSet: number[];
  canonicalId: string;
  interpretations: PentatonicInterpretation[];
  isCurrent: boolean;
  isPinned: boolean;
  outsideExplorationDepth: boolean;
  collectionKind: 'registry' | 'custom_non_registry';
}

interface MutableCandidate {
  canonicalPitchSet: number[];
  canonicalId: string;
  interpretations: PentatonicInterpretation[];
  isCurrent: boolean;
  isPinned: boolean;
  fromDepthPolicy: boolean;
  hasRegistryArchetype: boolean;
}

export type CandidateBuildResult =
  | { ok: true; candidates: GeneratedCandidate[]; currentIncludedOutsideDepth: boolean }
  | { ok: false; errors: string[] };

function spellingForPitchClass(pc: number, biasSpelling: string): string {
  const flat = biasSpelling.includes('b');
  const sharp = biasSpelling.includes('#');
  if (flat && !sharp) {
    return ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][mod12(pc)]!;
  }
  if (sharp) {
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][mod12(pc)]!;
  }
  return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][mod12(pc)]!;
}

function makeInterpretation(args: {
  archetype: PentatonicArchetype | null;
  referenceNote: string;
  referencePc: number;
  displaySpelling: readonly string[];
  relationship?: { id: string; label: string; offset: number };
  source: PentatonicInterpretation['source'];
  customName?: string;
}): PentatonicInterpretation {
  const archetypeName = args.archetype?.displayName ?? 'Unregistered pentatonic';
  return {
    archetypeId: args.archetype?.id ?? 'unregistered',
    archetypeDisplayName: archetypeName,
    referenceNote: args.referenceNote,
    referencePc: args.referencePc,
    transposedName: args.customName ?? `${args.referenceNote} ${archetypeName}`,
    displaySpelling: args.displaySpelling,
    homeRelationshipId: args.relationship?.id ?? null,
    homeRelationshipLabel: args.relationship?.label ?? null,
    homeOffset: args.relationship?.offset ?? null,
    aliases: args.archetype?.aliases ?? [],
    source: args.source,
  };
}

function archetypeInstance(
  archetype: PentatonicArchetype,
  referencePc: number,
  referenceSpelling: string,
  source: PentatonicInterpretation['source'],
  relationship?: { id: string; label: string; offset: number }
): { pcs: number[]; interpretation: PentatonicInterpretation } {
  const pcs = archetype.intervals.map((interval) => mod12(referencePc + interval));
  return {
    pcs,
    interpretation: makeInterpretation({
      archetype,
      referenceNote: referenceSpelling,
      referencePc,
      displaySpelling: spellFromReference(referenceSpelling, archetype.intervals, archetype.letterSteps),
      relationship,
      source,
    }),
  };
}

function matchingArchetypes(pcs: readonly number[]): { archetype: PentatonicArchetype; referencePc: number }[] {
  const id = canonicalPitchSetId(pcs);
  const found: { archetype: PentatonicArchetype; referencePc: number }[] = [];
  for (const archetype of listPentatonicArchetypes()) {
    for (let referencePc = 0; referencePc < 12; referencePc++) {
      const transposed = canonicalPitchSetId(archetype.intervals.map((interval) => mod12(referencePc + interval)));
      if (transposed === id) found.push({ archetype, referencePc });
    }
  }
  return found;
}

function put(
  bucket: Map<string, MutableCandidate>,
  pcs: readonly number[],
  interpretation: PentatonicInterpretation,
  flags: { fromDepthPolicy: boolean; isCurrent: boolean; isPinned: boolean }
): void {
  const canonical = canonicalPitchSet(pcs);
  const id = canonicalPitchSetId(canonical);
  const current = bucket.get(id) ?? {
    canonicalPitchSet: canonical,
    canonicalId: id,
    interpretations: [],
    isCurrent: false,
    isPinned: false,
    fromDepthPolicy: false,
    hasRegistryArchetype: false,
  };
  const duplicate = current.interpretations.some(
    (item) =>
      item.archetypeId === interpretation.archetypeId &&
      item.referencePc === interpretation.referencePc &&
      item.homeRelationshipId === interpretation.homeRelationshipId &&
      item.source === interpretation.source
  );
  if (!duplicate) current.interpretations.push(interpretation);
  current.isCurrent = current.isCurrent || flags.isCurrent;
  current.isPinned = current.isPinned || flags.isPinned;
  current.fromDepthPolicy = current.fromDepthPolicy || flags.fromDepthPolicy;
  if (interpretation.archetypeId !== 'unregistered') current.hasRegistryArchetype = true;
  bucket.set(id, current);
}

function resolveSpec(
  spec: PentatonicCollectionSpec,
  label: string
):
  | { ok: true; pcs: number[]; notes: ParsedNote[]; archetype: PentatonicArchetype | null; referenceNote: string }
  | { ok: false; error: string } {
  if (spec.notes && spec.notes.length > 0) {
    const parsed = parseNoteList(spec.notes);
    if (!parsed.ok) return parsed;
    const pcs = uniquePitchClasses(parsed.notes);
    if (parsed.notes.length !== pcs.length) return { ok: false, error: `${label} repeats a pitch class.` };
    if (pcs.length !== 5) return { ok: false, error: `${label} must contain exactly five unique notes.` };
    return { ok: true, pcs, notes: parsed.notes, archetype: null, referenceNote: parsed.notes[0]!.spelling };
  }
  if (!spec.archetypeId || !spec.referenceNote) {
    return { ok: false, error: `${label} needs an archetype and a reference note, or five notes.` };
  }
  const archetype = getPentatonicArchetype(spec.archetypeId);
  if (!archetype) return { ok: false, error: `${label} archetype "${spec.archetypeId}" is not in the registry.` };
  const reference = parseNoteToken(spec.referenceNote);
  if (!reference) return { ok: false, error: `${label} reference note is malformed.` };
  return {
    ok: true,
    pcs: canonicalPitchSet(archetype.intervals.map((interval) => mod12(reference.pc + interval))),
    notes: [reference],
    archetype,
    referenceNote: reference.spelling,
  };
}

export function generatePentatonicCandidates(args: {
  depth: PentatonicDepth;
  tonalCentrePc: number;
  tonalCentreSpelling: string;
  home: PentatonicCollectionSpec | null;
  current: PentatonicCollectionSpec | null;
  pinned: readonly PentatonicCollectionSpec[];
}): CandidateBuildResult {
  const errors: string[] = [];
  const bucket = new Map<string, MutableCandidate>();

  const addArchetype = (
    archetype: PentatonicArchetype,
    referencePc: number,
    referenceSpelling: string,
    source: PentatonicInterpretation['source'],
    fromDepthPolicy: boolean,
    relationship?: { id: string; label: string; offset: number },
    flags?: { isCurrent: boolean; isPinned: boolean }
  ) => {
    const built = archetypeInstance(archetype, referencePc, referenceSpelling, source, relationship);
    put(bucket, built.pcs, built.interpretation, {
      fromDepthPolicy,
      isCurrent: flags?.isCurrent ?? false,
      isPinned: flags?.isPinned ?? source === 'pinned',
    });
  };

  if (args.depth === 'chromatic') {
    for (const archetype of listPentatonicArchetypes()) {
      for (let pc = 0; pc < 12; pc++) {
        addArchetype(archetype, pc, spellingForPitchClass(pc, args.tonalCentreSpelling), 'registry', true);
      }
    }
  } else if (args.depth === 'near') {
    for (const archetype of listPentatonicArchetypes()) {
      addArchetype(archetype, args.tonalCentrePc, args.tonalCentreSpelling, 'registry', true);
    }
  }

  if (args.home) {
    const home = resolveSpec(args.home, 'HOME collection');
    if (!home.ok) errors.push(home.error);
    else if (!home.archetype) errors.push('HOME collection must use a registry archetype and a reference note.');
    else {
      for (const relationship of HOME_RELATIONSHIPS) {
        const referencePc = mod12(home.notes[0]!.pc + relationship.offset);
        addArchetype(
          home.archetype,
          referencePc,
          spellingForPitchClass(referencePc, home.referenceNote),
          'home',
          true,
          relationship
        );
      }
    }
  }

  const addSupplemental = (spec: PentatonicCollectionSpec, source: 'current' | 'pinned', label: string) => {
    const resolved = resolveSpec(spec, label);
    if (!resolved.ok) {
      errors.push(resolved.error);
      return;
    }
    const flags = { isCurrent: source === 'current', isPinned: source === 'pinned' };
    if (resolved.archetype) {
      addArchetype(resolved.archetype, resolved.notes[0]!.pc, resolved.referenceNote, source, false, undefined, flags);
      return;
    }
    const matches = matchingArchetypes(resolved.pcs);
    if (matches.length === 0) {
      put(
        bucket,
        resolved.pcs,
        makeInterpretation({
          archetype: null,
          referenceNote: resolved.referenceNote,
          referencePc: resolved.notes[0]!.pc,
          displaySpelling: resolved.notes.map((note) => note.spelling),
          source,
          customName:
            source === 'current'
              ? 'Custom non-registry current collection'
              : 'Custom non-registry pinned collection',
        }),
        { fromDepthPolicy: false, ...flags }
      );
      return;
    }
    for (const match of matches) {
      const referenceSpelling = spellingForPitchClass(match.referencePc, resolved.referenceNote);
      const built = archetypeInstance(match.archetype, match.referencePc, referenceSpelling, source);
      const preferUserSpelling = match.referencePc === resolved.notes[0]!.pc;
      put(
        bucket,
        resolved.pcs,
        preferUserSpelling ? { ...built.interpretation, displaySpelling: resolved.notes.map((note) => note.spelling) } : built.interpretation,
        { fromDepthPolicy: false, ...flags }
      );
    }
  };

  if (args.current) addSupplemental(args.current, 'current', 'Current collection');
  args.pinned.forEach((spec, index) => addSupplemental(spec, 'pinned', `Pinned candidate ${index + 1}`));

  if (errors.length > 0) return { ok: false, errors };

  const candidates: GeneratedCandidate[] = [...bucket.values()]
    .map((candidate) => ({
      canonicalPitchSet: candidate.canonicalPitchSet,
      canonicalId: candidate.canonicalId,
      interpretations: candidate.interpretations,
      isCurrent: candidate.isCurrent,
      isPinned: candidate.isPinned,
      outsideExplorationDepth: (candidate.isCurrent || candidate.isPinned) && !candidate.fromDepthPolicy,
      collectionKind: candidate.hasRegistryArchetype ? 'registry' : 'custom_non_registry',
    }))
    .sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

  return {
    ok: true,
    candidates,
    currentIncludedOutsideDepth: candidates.some((candidate) => candidate.isCurrent && candidate.outsideExplorationDepth),
  };
}
