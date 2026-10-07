/**
 * Dev 7C PARENT_EXTRACTION.
 * Derives up to three five-note colour fields from a larger collection.
 * A parent that does not support a pentatonic stays NONE or INSUFFICIENT_CONTEXT.
 * Matching a registered rotation identifies that resource. Nothing new enters the registry.
 * Subset extraction from larger harmony is a research influence only, not a named system.
 */

import { fieldFromPitchClasses, measureFieldDistance, adjacentSemitoneCount, type PentatonicField } from './fieldDistance';
import { canonicalPitchSet, mod12, parseNoteToken } from './pitch';

export const PENTATONIC_PARENT_EXTRACTION_VERSION = 'pentatonic-parent-extraction-7c';

export const EXTRACTION_CANDIDATE_CAP = 3;

export type ExtractionDisposition = 'FIELDS' | 'NONE' | 'INSUFFICIENT_CONTEXT';

export interface ExtractedCandidate {
  field: PentatonicField;
  rank: 'STRONGEST' | 'CONTRASTING' | 'SPARSE';
  usefulness: number;
  registryMatch: boolean;
}

export interface ExtractionResult {
  version: typeof PENTATONIC_PARENT_EXTRACTION_VERSION;
  disposition: ExtractionDisposition;
  candidates: readonly ExtractedCandidate[];
  explanation: string;
}

export interface ExtractionRequest {
  parentPitchClasses?: readonly number[];
  parentNotes?: readonly string[];
  chordPitchClasses?: readonly number[];
  melodyPitchClasses?: readonly number[];
  bassPitchClasses?: readonly number[];
  current?: PentatonicField | null;
  home?: PentatonicField | null;
  motifPitchClasses?: readonly number[];
  centreSpelling?: string | null;
}

const PASS = 0.58;

export function extractParentField(request: ExtractionRequest): ExtractionResult {
  const parent = parentSet(request);
  if (parent.length < 5) {
    return { version: PENTATONIC_PARENT_EXTRACTION_VERSION, disposition: 'INSUFFICIENT_CONTEXT', candidates: [], explanation: 'Fewer than five notes. No pentatonic was forced.' };
  }
  if (parent.length > 8 && !(request.chordPitchClasses?.length || request.melodyPitchClasses?.length)) {
    return { version: PENTATONIC_PARENT_EXTRACTION_VERSION, disposition: 'INSUFFICIENT_CONTEXT', candidates: [], explanation: 'The collection is too wide, and no chord or melody anchors it.' };
  }
  const limited = limitParent(parent, request);
  const scored = combinations(limited, 5)
    .map((subset) => {
      const field = fieldFromPitchClasses(subset, request.centreSpelling);
      if (!field) return null;
      const usefulness = usefulnessOf(subset, limited, request);
      return { field, usefulness, registryMatch: field.kind === 'REGISTERED' };
    })
    .filter((row): row is { field: PentatonicField; usefulness: number; registryMatch: boolean } => row !== null && row.usefulness >= PASS)
    .sort((left, right) => right.usefulness - left.usefulness);

  const unique = dedupe(scored);
  if (unique.length === 0) {
    return { version: PENTATONIC_PARENT_EXTRACTION_VERSION, disposition: 'NONE', candidates: [], explanation: 'No convincing five-note subset. NONE.' };
  }
  const strongest = unique[0]!;
  const contrasting = unique.find((row) => row.field.canonicalIntervalClass !== strongest.field.canonicalIntervalClass);
  const sparse = [...unique]
    .filter((row) => row !== strongest && row !== contrasting)
    .sort((left, right) => ambiguity(right.field.intervalsFromReference) - ambiguity(left.field.intervalsFromReference) || right.usefulness - left.usefulness)
    .find((row) => ambiguity(row.field.intervalsFromReference) >= 0.5);
  const chosen: ExtractedCandidate[] = [
    { field: strongest.field, rank: 'STRONGEST', usefulness: strongest.usefulness, registryMatch: strongest.registryMatch },
  ];
  if (contrasting) chosen.push({ field: contrasting.field, rank: 'CONTRASTING', usefulness: contrasting.usefulness, registryMatch: contrasting.registryMatch });
  if (sparse) chosen.push({ field: sparse.field, rank: 'SPARSE', usefulness: sparse.usefulness, registryMatch: sparse.registryMatch });
  return {
    version: PENTATONIC_PARENT_EXTRACTION_VERSION,
    disposition: 'FIELDS',
    candidates: chosen.slice(0, EXTRACTION_CANDIDATE_CAP),
    explanation: chosen.some((row) => row.registryMatch)
      ? 'A registered colour already names the strongest useful subset.'
      : 'The subset is an extracted field. It was not added to the registry.',
  };
}

function limitParent(parent: readonly number[], request: ExtractionRequest): number[] {
  if (parent.length <= 8) return [...parent];
  const priority = canonicalPitchSet([
    ...(request.chordPitchClasses ?? []),
    ...(request.melodyPitchClasses ?? []),
    ...(request.bassPitchClasses ?? []),
  ]).filter((pc) => parent.includes(pc));
  const rest = parent.filter((pc) => !priority.includes(pc));
  return [...priority, ...rest].slice(0, 8);
}

function parentSet(request: ExtractionRequest): number[] {
  const fromNotes = (request.parentNotes ?? []).flatMap((note) => {
    const parsed = parseNoteToken(note);
    return parsed ? [parsed.pc] : [];
  });
  const explicit = canonicalPitchSet([...(request.parentPitchClasses ?? []), ...fromNotes]);
  if (explicit.length > 0) return explicit;
  return canonicalPitchSet([
    ...(request.chordPitchClasses ?? []),
    ...(request.melodyPitchClasses ?? []),
    ...(request.bassPitchClasses ?? []),
  ]);
}

function usefulnessOf(subset: readonly number[], parent: readonly number[], request: ExtractionRequest): number {
  const chord = request.chordPitchClasses ?? [];
  const melody = request.melodyPitchClasses ?? [];
  const bass = request.bassPitchClasses ?? [];
  const motif = request.motifPitchClasses ?? [];
  const chordCoverage = chord.length ? overlap(subset, chord) / chord.length : 0.45;
  const melodyCoverage = melody.length ? overlap(subset, melody) / melody.length : 0.45;
  const bassHit = bass.length ? (bass.some((pc) => subset.includes(mod12(pc))) ? 1 : 0) : 0.45;
  const continuity = request.current ? overlap(subset, request.current.pitchClasses) / 5 : 0.4;
  const homeDistance = request.home ? 1 - measureFieldDistance(request.home, fieldFromPitchClasses(subset, request.centreSpelling)!).chromaticDisplacement / 6 : 0.5;
  const guitar = subsetHasFourthOrFifth(subset) ? 1 : 0.35;
  const motifFit = motif.length ? overlap(subset, motif) / motif.length : 0.5;
  const omitted = parent.filter((pc) => !subset.includes(pc));
  const omission = bass.length && bass.every((pc) => omitted.includes(mod12(pc))) ? 0 : 0.8;
  let score =
    chordCoverage * 0.22 +
    melodyCoverage * 0.16 +
    bassHit * 0.1 +
    continuity * 0.14 +
    Math.max(0, homeDistance) * 0.06 +
    guitar * 0.12 +
    motifFit * 0.1 +
    omission * 0.1;
  if (!chord.length && !melody.length) score *= 0.75;
  if (adjacentSemitoneCount(subset) >= 3) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}

function subsetHasFourthOrFifth(subset: readonly number[]): boolean {
  for (let left = 0; left < subset.length; left += 1) {
    for (let right = left + 1; right < subset.length; right += 1) {
      const raw = Math.abs(subset[left]! - subset[right]!);
      const interval = Math.min(raw, 12 - raw);
      if (interval === 5 || interval === 7) return true;
    }
  }
  return false;
}

function ambiguity(intervals: readonly number[]): number {
  const hasMinor = intervals.includes(3);
  const hasMajor = intervals.includes(4);
  if (hasMinor && hasMajor) return 1;
  if (!hasMinor && !hasMajor) return 0.8;
  return 0.2;
}

function overlap(left: readonly number[], right: readonly number[]): number {
  const set = new Set(right.map((pc) => mod12(pc)));
  return left.filter((pc) => set.has(mod12(pc))).length;
}

function dedupe(rows: readonly { field: PentatonicField; usefulness: number; registryMatch: boolean }[]) {
  const seen = new Set<string>();
  const unique: typeof rows[number][] = [];
  for (const row of rows) {
    const id = row.field.pitchClasses.join(',');
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(row);
  }
  return unique;
}

function combinations(items: readonly number[], size: number): number[][] {
  const out: number[][] = [];
  const acc: number[] = [];
  const walk = (start: number) => {
    if (acc.length === size) {
      out.push([...acc]);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      acc.push(items[index]!);
      walk(index + 1);
      acc.pop();
    }
  };
  walk(0);
  return out;
}
