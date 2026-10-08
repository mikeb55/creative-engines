/**
 * V8A Tonality Vault reading.
 * Resolves the pentatonic field used by the guitar improvisation.
 * Does not invent an LH/RH parent-triad pair.
 */

import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import { homeRelationshipById } from '../pentatonic/homeRelationships';
import { collectionPitchClasses, transposeCollection, type PentatonicCollectionView } from '../pentatonic/motifTransform';
import { canonicalPitchSet } from '../pentatonic/pitch';

export const V8A_PENTATONIC_REFERENCES = [
  'engines/composer-os-v2/core/pentatonic/registry.ts — minor_pentatonic intervals [0, 3, 5, 7, 10]',
  'engines/composer-os-v2/core/pentatonic/homeRelationships.ts — MAJOR offset −3',
  'engines/composer-os-v2/core/pentatonic/motifTransform.ts — mapMotifPitches method M-NEAR',
  'engines/composer-os-v2/core/pentatonic/registry.ts provenance — minor-pentatonic HOME transposed by −3 is the MAJOR relationship',
] as const;

export const V8B_TRIAD_REFERENCES = [
  'engines/composer-os-v2/core/harmony/tonalityVaultDatabase.ts — leftHandShell plus melodicTriadRoot label',
  'engines/composer-os-v2/core/harmony/quadratonicMelodySelector.ts — one melodic triad plus one primary tension, not a second triad',
  'engines/composer-os-v2/core/harmony/liquidHarmonyPlanner.ts — planLiquidHarmony splits that quadratonic; it does not name two parent triads',
  'docs/BHL_COMPOSITION_RULES.md §5–§6 — resolution triad + tension triad is a Klemons source idea; the implementation is not that pair',
  'palettes/triad_pairs.md — example pairings without an LH/RH parent assignment or Vault pitch resolution',
] as const;

/** Chord degrees 1–3–5. A sixth or seventh shell is not a parent triad. */
const TRIAD_SHELLS = new Set(['1,3,5']);

export interface V8aPentatonicField {
  method: 'M-NEAR';
  homeRelationshipId: 'major';
  offset: number;
  source: PentatonicCollectionView;
  target: PentatonicCollectionView;
  sourcePitchClasses: number[];
  targetPitchClasses: number[];
}

export interface V8bTriadFinding {
  status: 'BLOCKED';
  reason: string;
  rowsInspected: number;
  shellIsTriadCount: number;
  rhTriadResolvedCount: number;
  tensionTriadResolvedCount: number;
}

function isThreeNoteTriadShell(shell: readonly number[]): boolean {
  if (shell.length !== 3) return false;
  return TRIAD_SHELLS.has([...shell].join(','));
}

/** F minor pentatonic HOME, then the documented MAJOR offset (−3) → D minor pentatonic. */
export function resolveV8aPentatonicField(): V8aPentatonicField {
  const major = homeRelationshipById('major');
  if (!major || major.offset !== -3) {
    throw new Error('MAJOR home relationship is missing or is not offset −3.');
  }
  const source: PentatonicCollectionView = {
    name: 'F minor pentatonic',
    archetypeId: 'minor_pentatonic',
    referenceNote: 'F',
    homeRelationshipLabel: 'HOME',
  };
  const target = transposeCollection(source, major.offset);
  target.name = 'D minor pentatonic';
  target.homeRelationshipLabel = major.label;
  return {
    method: 'M-NEAR',
    homeRelationshipId: 'major',
    offset: major.offset,
    source,
    target,
    sourcePitchClasses: canonicalPitchSet(collectionPitchClasses(source)),
    targetPitchClasses: canonicalPitchSet(collectionPitchClasses(target)),
  };
}

/**
 * V8B needs one LH parent triad and one RH parent triad with resolved pitches.
 * Vault rows expose a left-hand shell and one melodic triad. The shell is not that triad.
 * Primary tension is one note. No second parent triad is resolved.
 */
export function inspectV8bParentTriad(): V8bTriadFinding {
  let shellIsTriadCount = 0;
  let rhTriadResolvedCount = 0;
  for (const row of TONALITY_VAULT_DATABASE) {
    if (isThreeNoteTriadShell(row.leftHandShell)) shellIsTriadCount += 1;
    const spec = selectQuadratonicMelodySpec(row.chordType);
    if (spec && spec.melodicTriad.length === 3) rhTriadResolvedCount += 1;
  }
  return {
    status: 'BLOCKED',
    reason:
      'No Vault row resolves an LH parent triad against an RH parent triad. leftHandShell values are seventh shells or four-note shells. selectQuadratonicMelodySpec returns one melodic triad plus one primary tension note. A tension triad is not in the implementation.',
    rowsInspected: TONALITY_VAULT_DATABASE.length,
    shellIsTriadCount,
    rhTriadResolvedCount,
    tensionTriadResolvedCount: 0,
  };
}
