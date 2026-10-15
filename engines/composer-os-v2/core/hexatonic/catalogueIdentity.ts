/**
 * Hexatonic H6-A — identity views over the frozen H2 catalogue.
 * A collection, a construction, and a context stay different objects.
 */

import { parseNoteList, sharpName, uniquePitchClasses } from '../pentatonic/pitch';
import { getHexatonicScalar, listHexatonicScalars } from './collections';
import { classifyPitchClassSet, normalForm, rootedModes, type PitchClassSetClass } from './setClass';
import { listHexatonicWpsPairs } from './triadPairs';
import {
  commonToneCount,
  minVoiceLeading,
  relationClassId,
  triadsInterleave,
  triadAt,
  type TertianTriad,
} from './tertianTriadUniverse';

export type AliasStatus = 'established' | 'catalogue-usage' | 'disputed' | 'internal';

export interface HexatonicAlias {
  name: string;
  /** Tn normal form this name points at. */
  normalForm: readonly number[];
  provenance: string;
  status: AliasStatus;
}

export interface HexatonicCollectionView {
  normalForm: readonly number[];
  setClass: PitchClassSetClass;
  catalogueIds: readonly string[];
}

export interface HexatonicConstructionView {
  id: string;
  normalForm: readonly number[];
  forte: string;
  left: TertianTriad;
  right: TertianTriad;
  commonTones: number;
  interleaves: boolean;
  minVoiceLeading: number;
  contextIds: readonly string[];
}

export interface HexatonicContextView {
  id: string;
  kind: 'scalar' | 'wps-pair';
  provenance: string;
  pitchClasses: readonly number[];
  normalForm: readonly number[];
  forte: string;
  constructionId: string | null;
  roles: readonly string[];
}

export interface SpellingReading {
  tokens: readonly string[];
  pitchClasses: readonly number[];
  normalForm: readonly number[];
  collapsed: boolean;
}

/** C Db Eb F Ab Bb. Same Tn class as several H2 rows. Not a traditional Ritsu scale. */
export const WESTERN_SIX_NOTE_PITCH_CLASSES = [0, 1, 3, 5, 8, 10] as const;

export const HEXATONIC_ALIASES: readonly HexatonicAlias[] = [
  {
    name: 'Ritsu',
    normalForm: normalForm(WESTERN_SIX_NOTE_PITCH_CLASSES),
    provenance: 'Western catalogue usage of a gagaku name. Traditional Ritsu stays the five-note open_pentatonic.',
    status: 'disputed',
  },
  {
    name: 'diatonic hexachord',
    normalForm: normalForm([0, 2, 4, 5, 7, 9]),
    provenance: 'computed Forte 6-32 prime',
    status: 'catalogue-usage',
  },
];

export function readSpelling(tokens: readonly string[]): SpellingReading {
  const parsed = parseNoteList(tokens);
  if (!parsed.ok) throw new Error(parsed.error);
  const pitchClasses = uniquePitchClasses(parsed.notes);
  return {
    tokens,
    pitchClasses,
    normalForm: normalForm(pitchClasses),
    collapsed: pitchClasses.length !== tokens.length,
  };
}

export function alternateSharpSpelling(pitchClasses: readonly number[]): string[] {
  return pitchClasses.map((pitchClass) => sharpName(pitchClass));
}

export function listCatalogueCollections(): readonly HexatonicCollectionView[] {
  const groups = new Map<string, { normalForm: number[]; ids: string[] }>();
  const add = (id: string, pitchClasses: readonly number[]) => {
    const form = normalForm(pitchClasses);
    const key = form.join(',');
    const group = groups.get(key) ?? { normalForm: form, ids: [] };
    group.ids.push(id);
    groups.set(key, group);
  };
  for (const scalar of listHexatonicScalars()) add(scalar.id, scalar.pitchClasses);
  for (const pair of listHexatonicWpsPairs()) add(pair.id, pair.pitchClasses);
  return [...groups.values()]
    .sort((left, right) => left.normalForm.join(',').localeCompare(right.normalForm.join(',')))
    .map((group) => ({
      normalForm: group.normalForm,
      setClass: classifyPitchClassSet(group.normalForm),
      catalogueIds: group.ids,
    }));
}

function constructionFromTriads(left: TertianTriad, right: TertianTriad, contextId: string): HexatonicConstructionView {
  const union = [...new Set([...left.pitchClasses, ...right.pitchClasses])].sort((a, b) => a - b);
  const setClass = classifyPitchClassSet(union);
  return {
    id: relationClassId(left.pitchClasses, right.pitchClasses),
    normalForm: setClass.normalForm,
    forte: setClass.forte,
    left,
    right,
    commonTones: commonToneCount(left.pitchClasses, right.pitchClasses),
    interleaves: triadsInterleave(left.pitchClasses, right.pitchClasses),
    minVoiceLeading: minVoiceLeading(left.pitchClasses, right.pitchClasses),
    contextIds: [contextId],
  };
}

export function listCatalogueConstructions(): readonly HexatonicConstructionView[] {
  const byId = new Map<string, HexatonicConstructionView>();
  const add = (view: HexatonicConstructionView) => {
    const existing = byId.get(view.id);
    if (!existing) {
      byId.set(view.id, view);
      return;
    }
    existing.contextIds = [...existing.contextIds, ...view.contextIds];
  };
  for (const scalar of listHexatonicScalars()) {
    if (!scalar.triadReading || scalar.triadReading.length < 2) continue;
    const [lower, upper] = scalar.triadReading;
    if (!lower || !upper) continue;
    add(
      constructionFromTriads(
        triadAt(lower.quality, lower.pitchClasses[0]!),
        triadAt(upper.quality, upper.pitchClasses[0]!),
        scalar.id,
      ),
    );
  }
  for (const pair of listHexatonicWpsPairs()) {
    add(
      constructionFromTriads(
        triadAt(pair.resolution.quality, pair.resolution.pitchClasses[0]!),
        triadAt(pair.tension.quality, pair.tension.pitchClasses[0]!),
        pair.id,
      ),
    );
  }
  return [...byId.values()];
}

export function listCatalogueContexts(): readonly HexatonicContextView[] {
  const constructions = new Map(listCatalogueConstructions().flatMap((row) => row.contextIds.map((id) => [id, row.id] as const)));
  const contexts: HexatonicContextView[] = [];
  for (const scalar of listHexatonicScalars()) {
    const setClass = classifyPitchClassSet(scalar.pitchClasses);
    contexts.push({
      id: scalar.id,
      kind: 'scalar',
      provenance: scalar.source,
      pitchClasses: scalar.pitchClasses,
      normalForm: setClass.normalForm,
      forte: setClass.forte,
      constructionId: constructions.get(scalar.id) ?? null,
      roles: scalar.triadReading?.map((triad) => triad.role) ?? [],
    });
  }
  for (const pair of listHexatonicWpsPairs()) {
    const setClass = classifyPitchClassSet(pair.pitchClasses);
    contexts.push({
      id: pair.id,
      kind: 'wps-pair',
      provenance: pair.provenance,
      pitchClasses: pair.pitchClasses,
      normalForm: setClass.normalForm,
      forte: setClass.forte,
      constructionId: constructions.get(pair.id) ?? null,
      roles: ['resolution', 'tension'],
    });
  }
  return contexts;
}

export function aliasesForNormalForm(form: readonly number[]): readonly HexatonicAlias[] {
  const key = form.join(',');
  return HEXATONIC_ALIASES.filter((alias) => alias.normalForm.join(',') === key);
}

export function westernSixNoteClaim() {
  const setClass = classifyPitchClassSet(WESTERN_SIX_NOTE_PITCH_CLASSES);
  const stored = getHexatonicScalar('hex_western_claim_not_ritsu');
  return {
    id: 'hex_western_claim_not_ritsu' as const,
    storedPitchClasses: stored?.pitchClasses ?? [],
    setClass,
    modes: rootedModes(WESTERN_SIX_NOTE_PITCH_CLASSES),
    aliases: aliasesForNormalForm(setClass.normalForm),
    traditionalRitsuId: 'open_pentatonic' as const,
  };
}
