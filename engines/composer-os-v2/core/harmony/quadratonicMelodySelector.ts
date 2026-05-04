import { type TonalityVaultChordRow, TONALITY_VAULT_DATABASE } from './tonalityVaultDatabase';

/** Pitch class 0–11 relative to chord root (root = 0). */
export type VaultPitchClass = number;

export type MelodicTriadTone = {
  /** Degree slot (1,3,5,7,9,11,13); alteration implied by chord type + Tonality Vault spelling table. */
  degree: number;
  pitchClassFromRoot: VaultPitchClass;
  melodicRole: 'resolution_target';
};

export type PrimaryTensionTone = {
  degree: number;
  pitchClassFromRoot: VaultPitchClass;
  melodicRole: 'passing_or_approach';
  /** Triad degrees preferred as resolution targets (ordered). */
  resolvesTowardTriadDegrees: number[];
};

export type QuadratonicMelodySpec = {
  chordType: string;
  displayName: string;
  melodicTriad: [MelodicTriadTone, MelodicTriadTone, MelodicTriadTone];
  primaryTension: PrimaryTensionTone;
  /** Distinct pitch classes for the quadratonic set (melodic triad ∪ tension). */
  quadratonicPitchClassesFromRoot: VaultPitchClass[];
};

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

/**
 * Maps chord-root degrees (1,3,…,13) to pitch class offset from the chord root for each
 * Tonality Vault chord type. Alterations follow the chord symbol.
 */
const DEGREE_PC_FROM_ROOT: Record<string, Partial<Record<number, VaultPitchClass>>> = {
  'Maj7#5': { 1: 0, 3: 4, 5: 8, 7: 11, 9: 2, 11: 6, 13: 9 },
  'sus-b9': { 1: 0, 4: 5, 5: 7, 7: 10, 9: 1, 11: 6, 13: 8 },
  'minMaj13#11#9': { 1: 0, 3: 3, 5: 7, 7: 11, 9: 3, 11: 6, 13: 9 },
  'Maj7#11#9': { 1: 0, 3: 4, 5: 7, 7: 11, 9: 3, 11: 6, 13: 9 },
  sus9: { 1: 0, 4: 5, 9: 2, 7: 10, 11: 6, 13: 9 },
  min9: { 1: 0, 3: 3, 5: 7, 7: 10, 9: 2, 11: 5, 13: 9 },
  Maj7: { 1: 0, 3: 4, 5: 7, 7: 11, 9: 2, 11: 6, 13: 9 },
  Maj6: { 1: 0, 3: 4, 5: 7, 6: 9, 9: 2, 11: 6, 13: 9 },
  dim7b13: { 1: 0, 3: 3, 5: 6, 7: 9, 9: 2, 11: 5, 13: 8 },
  '13#11#9': { 1: 0, 3: 4, 5: 7, 7: 10, 9: 3, 11: 6, 13: 9 },
  'Maj7#11': { 1: 0, 3: 4, 5: 7, 7: 11, 9: 2, 11: 6, 13: 9 },
  minMaj9: { 1: 0, 3: 3, 5: 7, 7: 11, 9: 2, 11: 6, 13: 9 },
  min7b5: { 1: 0, 3: 3, 5: 6, 7: 10, 9: 1, 11: 5, 13: 9 },
  '7#9#5': { 1: 0, 3: 4, 5: 8, 7: 10, 9: 3, 11: 6, 13: 9 },
  '13b9': { 1: 0, 3: 4, 5: 7, 7: 10, 9: 1, 11: 6, 13: 9 },
  Maj9: { 1: 0, 3: 4, 5: 7, 7: 11, 9: 2, 11: 6, 13: 9 },
  min11: { 1: 0, 3: 3, 5: 7, 7: 10, 9: 2, 11: 5, 13: 9 },
};

/** Chord-tone degrees for the melodic triad (Tonality Vault T-stack on the chord). */
function melodicTriadDegrees(row: TonalityVaultChordRow): [number, number, number] {
  switch (row.chordType) {
    case 'Maj7#5':
    case 'Maj7#11#9':
    case 'Maj7#11':
    case 'Maj7':
    case 'Maj9':
    case '13#11#9':
    case '7#9#5':
    case '13b9':
      return [3, 5, 7];
    case 'Maj6':
      return [3, 5, 6];
    case 'sus-b9':
      return [4, 13, 1];
    case 'sus9':
      return [4, 9, 1];
    case 'min9':
    case 'min11':
    case 'minMaj13#11#9':
    case 'minMaj9':
      return [7, 9, 11];
    case 'dim7b13':
      return [7, 1, 3];
    case 'min7b5':
      return [7, 9, 11];
    default:
      return [3, 5, 7];
  }
}

/** Pitch class (0–11) for a chord-tone degree, relative to chord root. */
export function vaultDegreeToPitchClass(row: TonalityVaultChordRow, degree: number): VaultPitchClass | undefined {
  const pc = DEGREE_PC_FROM_ROOT[row.chordType]?.[degree];
  return pc === undefined ? undefined : ((pc % 12) + 12) % 12;
}

function nearestTriadDegreesForResolution(
  row: TonalityVaultChordRow,
  triadDegrees: [number, number, number]
): number[] {
  const set = new Set(triadDegrees);
  const ordered: number[] = [];
  for (const d of row.tensionHierarchy) {
    if (set.has(d)) ordered.push(d);
  }
  for (const d of triadDegrees) {
    if (!ordered.includes(d)) ordered.push(d);
  }
  return ordered;
}

/**
 * Vault metadata + pitch-class sets for melody: three melodic triad tones (resolution targets)
 * plus primary tension (passing / approach toward triad tones).
 */
export function selectQuadratonicMelodySpec(chordTypeId: string): QuadratonicMelodySpec | null {
  const row = ROW_BY_TYPE.get(chordTypeId);
  if (!row) return null;

  const triadDegTriple = melodicTriadDegrees(row);
  const triadPcsMaybe = triadDegTriple.map((d) => vaultDegreeToPitchClass(row, d));
  if (triadPcsMaybe.some((p) => p === undefined)) return null;
  const triadPcs = triadPcsMaybe as [VaultPitchClass, VaultPitchClass, VaultPitchClass];

  const melodicTriad: [MelodicTriadTone, MelodicTriadTone, MelodicTriadTone] = [
    {
      degree: triadDegTriple[0]!,
      pitchClassFromRoot: triadPcs[0]!,
      melodicRole: 'resolution_target',
    },
    {
      degree: triadDegTriple[1]!,
      pitchClassFromRoot: triadPcs[1]!,
      melodicRole: 'resolution_target',
    },
    {
      degree: triadDegTriple[2]!,
      pitchClassFromRoot: triadPcs[2]!,
      melodicRole: 'resolution_target',
    },
  ];

  const tensionPc = vaultDegreeToPitchClass(row, row.primaryTensionNote);
  if (tensionPc === undefined) return null;

  const resolvesToward = nearestTriadDegreesForResolution(row, triadDegTriple);

  const primaryTension: PrimaryTensionTone = {
    degree: row.primaryTensionNote,
    pitchClassFromRoot: tensionPc,
    melodicRole: 'passing_or_approach',
    resolvesTowardTriadDegrees: resolvesToward,
  };

  const pcs = new Set<VaultPitchClass>([triadPcs[0]!, triadPcs[1]!, triadPcs[2]!, tensionPc]);
  const quadratonicPitchClassesFromRoot = [...pcs].sort((a, b) => a - b);

  return {
    chordType: row.chordType,
    displayName: row.displayName,
    melodicTriad,
    primaryTension,
    quadratonicPitchClassesFromRoot,
  };
}
