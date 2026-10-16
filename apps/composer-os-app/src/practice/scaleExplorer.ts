/**
 * Read-only pitch-class explorer for Practice & Scales Studio.
 * One row per 12-bit mask. Names come only from registries that already exist.
 */

import { CORE_CANDIDATES, CORE_LABORATORY_STATUS } from '@composer-os/core/hexatonic/coreLaboratory';
import { listHexatonicScalars } from '@composer-os/core/hexatonic/collections';
import {
  ADVANCED_STATUS,
  EXPLORER_STATUS,
  listAdvancedColours,
  listExplorerCatalogue,
} from '@composer-os/core/hexatonic/advancedCollections';
import { classifyPitchClassSet } from '@composer-os/core/hexatonic/setClass';
import { HEXATONIC_WPS_FAMILY, listHexatonicWpsPairs } from '@composer-os/core/hexatonic/triadPairs';
import { PENTATONIC_COLOUR_REGISTRY_VERSION, listPentatonicColourResources } from '@composer-os/core/pentatonic/colourRegistry';
import {
  PENTATONIC_NOTE_CHOICES,
  canonicalPitchSet,
  canonicalPitchSetId,
  parseNoteToken,
} from '@composer-os/core/pentatonic/pitch';
import { PENTATONIC_REGISTRY_VERSION, listPentatonicArchetypes } from '@composer-os/core/pentatonic/registry';
import { parseSpelledPitch } from '@composer-os/core/wwh/wwhTriadPair';
import {
  assertGlossaryLicence,
  computePitchClassSetMath,
  glossaryNameMatches,
  glossaryNameRecords,
  normaliseScaleName,
  parseScaleSearch,
  type PitchClassSetMath,
} from './scaleGlossary';

export const CHROMATIC_MASK_COUNT = 4096;
export const TONIC_FIXED_MASK_COUNT = 2048;
export const EMPTY_SET_MASK = 0;
export const CHROMATIC_SET_MASK = 4095;
export const SCALE_EXPLORER_PAGE_SIZE = 64;

export const MATHEMATICAL_SET_STATUS = 'MATHEMATICAL SET';

export type ScaleExplorerView = 'all' | 'tonic-fixed';

export type ScaleRegistryId =
  | 'pentatonic-path'
  | 'pentatonic-colour'
  | 'hexatonic-scalar'
  | 'hexatonic-wps'
  | 'hexatonic-provisional'
  | 'hexatonic-advanced'
  | 'glossary-named';

export interface ScaleRegistration {
  registry: ScaleRegistryId;
  id: string;
  displayName: string;
  family: string;
  /** Copied from the registry row. Null when that row has no status field. */
  status: string | null;
  provenance: string;
  /** Existing page that implements this registry. Null for a glossary name, which has no page of its own. */
  pageHash: '#/pentatonic' | '#/hexatonic' | null;
}

export interface ForteClassLabel {
  forte: string;
  tier: string;
  status: string;
}

export interface IntervalFromC {
  semitones: number;
  spelling: string;
}

export interface ScaleExplorerEntry {
  mask: number;
  pitchClasses: readonly number[];
  cardinality: number;
  tonicFixed: boolean;
  pitchClassId: string;
  registrations: readonly ScaleRegistration[];
  /** Set only for a six-note set, via the existing hexachord table. */
  forte: ForteClassLabel | null;
  intervalsFromC: readonly IntervalFromC[];
  /** Computed for every cardinality. Separate from the hexachord catalogue label above. */
  math: PitchClassSetMath;
}

export interface ScaleExplorerQuery {
  view: ScaleExplorerView;
  cardinality: number | null;
  family: string | null;
  status: string | null;
  search: string;
}

const REGISTRATIONS_BY_MASK = new Map<number, ScaleRegistration[]>();
const ENTRIES: ScaleExplorerEntry[] = [];
let built = false;

function maskFromPitchClasses(pitchClasses: readonly number[]): number {
  let mask = 0;
  for (const pitchClass of canonicalPitchSet(pitchClasses)) mask |= 1 << pitchClass;
  return mask;
}

export function pitchClassesFromMask(mask: number): number[] {
  if (!Number.isInteger(mask) || mask < 0 || mask > CHROMATIC_SET_MASK) {
    throw new Error(`pitch-class mask out of range: ${mask}`);
  }
  const pitchClasses: number[] = [];
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    if ((mask & (1 << pitchClass)) !== 0) pitchClasses.push(pitchClass);
  }
  return pitchClasses;
}

function addRegistration(pitchClasses: readonly number[], registration: ScaleRegistration): void {
  const mask = maskFromPitchClasses(pitchClasses);
  const group = REGISTRATIONS_BY_MASK.get(mask) ?? [];
  group.push(registration);
  REGISTRATIONS_BY_MASK.set(mask, group);
}

function spelledPitchClasses(tokens: readonly string[]): number[] {
  return canonicalPitchSet(tokens.map((token) => parseSpelledPitch(token).pc));
}

let forteById: Map<string, ForteClassLabel> | null = null;

function explorerByForte(): Map<string, ForteClassLabel> {
  if (forteById) return forteById;
  forteById = new Map();
  for (const row of listExplorerCatalogue()) {
    forteById.set(row.forte, { forte: row.forte, tier: row.tier, status: row.status });
  }
  return forteById;
}

/** Forte label for a six-note set. Other cardinalities do not call the classifier. */
export function forteClassForExplorer(pitchClasses: readonly number[]): ForteClassLabel | null {
  if (pitchClasses.length !== 6) return null;
  const forte = classifyPitchClassSet(pitchClasses).forte;
  const row = explorerByForte().get(forte);
  if (!row) throw new Error(`hexachord ${forte} is missing from the explorer catalogue`);
  return row;
}

function intervalsFromC(pitchClasses: readonly number[]): IntervalFromC[] {
  return pitchClasses.map((semitones) => ({
    semitones,
    spelling: PENTATONIC_NOTE_CHOICES[semitones] ?? String(semitones),
  }));
}

function buildIndex(): void {
  if (built) return;

  for (const archetype of listPentatonicArchetypes()) {
    addRegistration(archetype.intervals, {
      registry: 'pentatonic-path',
      id: archetype.id,
      displayName: archetype.displayName,
      family: archetype.family,
      status: archetype.verificationStatus,
      provenance: `${PENTATONIC_REGISTRY_VERSION}. ${archetype.provenance}`,
      pageHash: '#/pentatonic',
    });
  }

  for (const colour of listPentatonicColourResources()) {
    addRegistration(colour.intervals, {
      registry: 'pentatonic-colour',
      id: colour.id,
      displayName: colour.displayName,
      family: colour.family,
      status: null,
      provenance: PENTATONIC_COLOUR_REGISTRY_VERSION,
      pageHash: '#/pentatonic',
    });
  }

  for (const scalar of listHexatonicScalars()) {
    addRegistration(scalar.pitchClasses, {
      registry: 'hexatonic-scalar',
      id: scalar.id,
      displayName: scalar.id,
      family: 'scalar',
      status: 'catalogue',
      provenance: scalar.source,
      pageHash: '#/hexatonic',
    });
  }

  for (const pair of listHexatonicWpsPairs()) {
    addRegistration(pair.pitchClasses, {
      registry: 'hexatonic-wps',
      id: pair.id,
      displayName: `${pair.parentSymbol} · ${pair.harrisLabel}`,
      family: HEXATONIC_WPS_FAMILY,
      status: 'catalogue',
      provenance: pair.provenance,
      pageHash: '#/hexatonic',
    });
  }

  for (const candidate of CORE_CANDIDATES) {
    addRegistration(spelledPitchClasses([...candidate.leftSpelling, ...candidate.rightSpelling]), {
      registry: 'hexatonic-provisional',
      id: candidate.id,
      displayName: candidate.label,
      family: 'provisional',
      status: CORE_LABORATORY_STATUS,
      provenance: candidate.provenance,
      pageHash: '#/hexatonic',
    });
  }

  for (const colour of listAdvancedColours()) {
    addRegistration(colour.pitchClasses, {
      registry: 'hexatonic-advanced',
      id: colour.id,
      displayName: colour.label,
      family: 'advanced',
      status: ADVANCED_STATUS,
      provenance: colour.provenance,
      pageHash: '#/hexatonic',
    });
  }

  assertGlossaryLicence();
  for (const record of glossaryNameRecords()) {
    addRegistration(record.pitchClasses, {
      registry: 'glossary-named',
      id: normaliseScaleName(record.primaryName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      displayName: record.primaryName,
      family: 'glossary',
      status: null,
      provenance: `${record.sourceId} ${record.licenceBasis}. ${record.sourceUrl} Retrieved ${record.retrievedOn}. Kind ${record.kind}. Not a musical approval.`,
      pageHash: null,
    });
  }

  for (let mask = 0; mask < CHROMATIC_MASK_COUNT; mask += 1) {
    const pitchClasses = pitchClassesFromMask(mask);
    ENTRIES.push({
      mask,
      pitchClasses,
      cardinality: pitchClasses.length,
      tonicFixed: (mask & 1) === 1,
      pitchClassId: canonicalPitchSetId(pitchClasses),
      registrations: REGISTRATIONS_BY_MASK.get(mask) ?? [],
      forte: forteClassForExplorer(pitchClasses),
      intervalsFromC: intervalsFromC(pitchClasses),
      math: computePitchClassSetMath(mask),
    });
  }

  built = true;
}

export function listScaleExplorerEntries(): readonly ScaleExplorerEntry[] {
  buildIndex();
  return ENTRIES;
}

export function getScaleExplorerEntry(mask: number): ScaleExplorerEntry {
  buildIndex();
  const entry = ENTRIES[mask];
  if (!entry || entry.mask !== mask) throw new Error(`missing explorer mask ${mask}`);
  return entry;
}

export function scaleExplorerFamilies(): readonly string[] {
  const families = new Set<string>();
  for (const entry of listScaleExplorerEntries()) {
    for (const registration of entry.registrations) families.add(registration.family);
  }
  return [...families].sort();
}

export function scaleExplorerStatuses(): readonly string[] {
  return [
    'verified',
    'catalogue',
    CORE_LABORATORY_STATUS,
    ADVANCED_STATUS,
    EXPLORER_STATUS,
    MATHEMATICAL_SET_STATUS,
  ];
}

function registrationMatchesFamily(entry: ScaleExplorerEntry, family: string): boolean {
  return entry.registrations.some((registration) => registration.family === family);
}

function entryMatchesStatus(entry: ScaleExplorerEntry, status: string): boolean {
  if (status === MATHEMATICAL_SET_STATUS) return entry.registrations.length === 0;
  if (status === EXPLORER_STATUS) {
    return entry.registrations.length === 0 && entry.forte?.status === EXPLORER_STATUS;
  }
  return entry.registrations.some((registration) => registration.status === status);
}

function pitchClassQuery(raw: string): number[] | null {
  const tokens = raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  const pitchClasses: number[] = [];
  for (const token of tokens) {
    const note = parseNoteToken(token);
    if (note) {
      pitchClasses.push(note.pc);
      continue;
    }
    if (/^\d+$/.test(token)) {
      const pitchClass = Number(token);
      if (pitchClass >= 0 && pitchClass <= 11 && tokens.length > 1) {
        pitchClasses.push(pitchClass);
        continue;
      }
    }
    return null;
  }
  return canonicalPitchSet(pitchClasses);
}

function textMatches(entry: ScaleExplorerEntry, query: string): boolean {
  const parsed = parseScaleSearch(query);
  if (parsed.kind === 'none') return false;
  if (parsed.kind === 'mask') return entry.mask === parsed.mask;
  if (parsed.kind === 'exact') {
    const pitchClasses = pitchClassQuery(parsed.body);
    if (!pitchClasses) return false;
    return entry.pitchClassId === canonicalPitchSetId(pitchClasses);
  }
  const needle = parsed.needle;
  if (!needle) return true;
  const pitchClasses = pitchClassQuery(query);
  if (pitchClasses) {
    return pitchClasses.every((pitchClass) => entry.pitchClasses.includes(pitchClass));
  }
  if (/^\d+$/.test(needle)) return entry.mask === Number(needle);
  if (entry.pitchClassId.toLowerCase() === needle) return true;
  if (entry.forte?.forte.toLowerCase() === needle) return true;
  if (entry.math.computedForte.number.toLowerCase() === needle) return true;
  if (glossaryNameMatches(entry.mask, needle)) return true;
  return entry.registrations.some((registration) => {
    return (
      normaliseScaleName(registration.id).includes(needle) ||
      normaliseScaleName(registration.displayName).includes(needle)
    );
  });
}

export function filterScaleExplorer(query: ScaleExplorerQuery): ScaleExplorerEntry[] {
  return listScaleExplorerEntries().filter((entry) => {
    if (query.view === 'tonic-fixed' && !entry.tonicFixed) return false;
    if (query.cardinality !== null && entry.cardinality !== query.cardinality) return false;
    if (query.family && !registrationMatchesFamily(entry, query.family)) return false;
    if (query.status && !entryMatchesStatus(entry, query.status)) return false;
    return textMatches(entry, query.search);
  });
}

export function pageScaleExplorer(
  entries: readonly ScaleExplorerEntry[],
  page: number
): { page: number; pageCount: number; rows: ScaleExplorerEntry[] } {
  const pageCount = Math.max(1, Math.ceil(entries.length / SCALE_EXPLORER_PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * SCALE_EXPLORER_PAGE_SIZE;
  return {
    page: safePage,
    pageCount,
    rows: entries.slice(start, start + SCALE_EXPLORER_PAGE_SIZE),
  };
}

export function explorerRowLabel(entry: ScaleExplorerEntry): string {
  if (entry.registrations.length === 0) {
    const spelling = entry.intervalsFromC.map((interval) => interval.spelling).join(' ');
    return spelling.length > 0 ? spelling : 'Empty set';
  }
  return entry.registrations.map((registration) => registration.displayName).join(' · ');
}
