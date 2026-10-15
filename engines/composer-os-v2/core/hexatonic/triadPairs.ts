/**
 * Hexatonic Phase H2 — resolution / tension pairs.
 * The 16 pairs are read from WPS_VAULT_TONALITIES. This file does not copy their pitch tables.
 * A pair is two triads plus the derived union. The union is not a six-note guitar chord.
 */

import { canonicalPitchSet } from '../pentatonic/pitch';
import {
  analyzeTriadPair,
  validateParentTriad,
  type ParentTriadInput,
  type RelationshipAnalysis,
  type ValidatedTriad,
} from '../wwh/wwhTriadPair';
import {
  pitchClassOf,
  spellName,
  transposeVaultTonality,
  WPS_VAULT_TONALITIES,
  type Spelled,
  type VaultTriad,
  type WpsVaultTonality,
} from '../wwh/wps/wpsTonalityVaultRecord';

export const HEXATONIC_WPS_FAMILY = 'wps-resolution-tension';

export interface HexatonicPairTriad {
  role: 'resolution' | 'tension';
  quality: VaultTriad['quality'];
  spelling: readonly [string, string, string];
  pitchClasses: readonly [number, number, number];
  input: ParentTriadInput;
  validated: ValidatedTriad;
}

export interface HexatonicWpsPair {
  id: string;
  kind: 'wps-pair';
  family: typeof HEXATONIC_WPS_FAMILY;
  volume: number;
  parentSymbol: string;
  harrisLabel: string;
  provenance: string;
  resolution: HexatonicPairTriad;
  tension: HexatonicPairTriad;
  pitchClasses: readonly number[];
  sharedPitchClasses: readonly number[];
  disjoint: boolean;
  /** Shell tones that sit outside the six-note union. Derived from the record. */
  shellOutsideUnion: readonly number[];
  /** Quadratonic grip stays on the vault record. It is not this pair. */
  primaryQuadratonicSize: number;
  analysis: RelationshipAnalysis;
}

function triadView(role: HexatonicPairTriad['role'], triad: VaultTriad, id: string): HexatonicPairTriad {
  const spelling = triad.notes.map(spellName) as [string, string, string];
  const pitchClasses = triad.notes.map(pitchClassOf) as [number, number, number];
  const input: ParentTriadInput = {
    id: `${id}:${role}`,
    rootSpelling: spellName(triad.root),
    quality: triad.quality,
    notes: spelling,
    pitchClasses,
    provenance: 'Vault',
  };
  return {
    role,
    quality: triad.quality,
    spelling,
    pitchClasses,
    input,
    validated: validateParentTriad(input),
  };
}

export function pairFromVaultRecord(row: WpsVaultTonality): HexatonicWpsPair {
  const resolution = triadView('resolution', row.resolutionTriad, row.id);
  const tension = triadView('tension', row.tensionTriad, row.id);
  const pitchClasses = canonicalPitchSet([...resolution.pitchClasses, ...tension.pitchClasses]);
  const sharedPitchClasses = resolution.pitchClasses.filter((pitchClass) => tension.pitchClasses.includes(pitchClass));
  const shell = canonicalPitchSet(row.shell.map(pitchClassOf));
  const analysis = analyzeTriadPair(resolution.input, tension.input, {
    tones: [],
    printedHarmony: [row.symbol],
  });
  return {
    id: row.id,
    kind: 'wps-pair',
    family: HEXATONIC_WPS_FAMILY,
    volume: row.volume,
    parentSymbol: row.symbol,
    harrisLabel: row.harrisLabel,
    provenance: `WPS_VAULT_TONALITIES:${row.id}`,
    resolution,
    tension,
    pitchClasses,
    sharedPitchClasses,
    disjoint: sharedPitchClasses.length === 0 && pitchClasses.length === 6,
    shellOutsideUnion: shell.filter((pitchClass) => !pitchClasses.includes(pitchClass)),
    primaryQuadratonicSize: row.primaryQuadratonic.notes.length,
    analysis,
  };
}

const PAIRS: readonly HexatonicWpsPair[] = WPS_VAULT_TONALITIES.map(pairFromVaultRecord);
const BY_ID = new Map(PAIRS.map((pair) => [pair.id, pair]));

export function listHexatonicWpsPairs(): readonly HexatonicWpsPair[] {
  return PAIRS;
}

export function getHexatonicWpsPair(id: string): HexatonicWpsPair | undefined {
  return BY_ID.get(id);
}

export function transposeHexatonicWpsPair(id: string, root: Spelled): HexatonicWpsPair {
  const row = WPS_VAULT_TONALITIES.find((item) => item.id === id);
  if (!row) throw new Error(`unknown WPS pair ${id}`);
  return pairFromVaultRecord(transposeVaultTonality(row, root));
}
