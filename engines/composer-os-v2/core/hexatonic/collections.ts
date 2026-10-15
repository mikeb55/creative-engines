/**
 * Hexatonic Phase H2 — scalar six-note collections.
 * Interval rows follow docs/HEXATONIC_PHASE_H1.md.
 * World A pitch classes are read from buildBhlWorldField. They are not a second world table.
 * Traditional Ritsu stays the five-note open_pentatonic and is not registered here.
 */

import type { BhlBassBar } from '../bhl/bhlRhythm';
import { buildBhlWorldField } from '../bhl/bhlWorlds';
import { canonicalPitchSet, mod12, parseNoteToken } from '../pentatonic/pitch';
import {
  pitchClassOf,
  spellName,
  transposeTriad,
  WPS_VAULT_C_ROOT,
  type Spelled,
  type VaultTriad,
  type VaultTriadQuality,
} from '../wwh/wps/wpsTonalityVaultRecord';

export const HEXATONIC_REGISTRY_VERSION = 'hexatonic-registry-h2.0';

export const HEXATONIC_CARDINALITY = 6;

/** Named in H1 and refused by this registry. */
export const HEXATONIC_REFUSED_IDS = [
  'ritsu_as_open_pentatonic',
  'open_pentatonic',
  'hex_minor_omit_second',
  'hex_minor_dorian_omit_second',
  'hex_blues',
] as const;

export type HexatonicSymmetry = 'none' | 'whole-tone' | 'augmented';

export interface HexatonicTriadReading {
  role: 'lower' | 'upper' | 'resolution' | 'tension';
  quality: VaultTriadQuality;
  spelling: readonly [string, string, string];
  pitchClasses: readonly [number, number, number];
}

export interface HexatonicScalarCollection {
  id: string;
  kind: 'scalar';
  symmetry: HexatonicSymmetry;
  /** Transposition that restores this pitch-class set. */
  symmetryPeriod: 2 | 4 | 12;
  referenceSpelling: readonly string[];
  pitchClasses: readonly number[];
  source: 'h1-scalar' | 'bhl-world-A';
  /** Present only where H1 states a two-triad reading of the scalar set. */
  triadReading: readonly HexatonicTriadReading[] | null;
}

interface ScalarRow {
  id: string;
  symmetry: HexatonicSymmetry;
  symmetryPeriod: 2 | 4 | 12;
  spelling: readonly string[];
}

const SCALAR_ROWS: readonly ScalarRow[] = [
  { id: 'hex_western_claim_not_ritsu', symmetry: 'none', symmetryPeriod: 12, spelling: ['C', 'Db', 'Eb', 'F', 'Ab', 'Bb'] },
  { id: 'hex_major_omit_seventh', symmetry: 'none', symmetryPeriod: 12, spelling: ['C', 'D', 'E', 'F', 'G', 'A'] },
  { id: 'hex_major_omit_fourth', symmetry: 'none', symmetryPeriod: 12, spelling: ['C', 'D', 'E', 'G', 'A', 'B'] },
  { id: 'hex_minor_primary', symmetry: 'none', symmetryPeriod: 12, spelling: ['C', 'D', 'Eb', 'F', 'G', 'Bb'] },
  { id: 'hex_whole_tone_even', symmetry: 'whole-tone', symmetryPeriod: 2, spelling: ['C', 'D', 'E', 'F#', 'G#', 'Bb'] },
  { id: 'hex_whole_tone_odd', symmetry: 'whole-tone', symmetryPeriod: 2, spelling: ['C#', 'D#', 'F', 'G', 'A', 'B'] },
  { id: 'hex_augmented_t0', symmetry: 'augmented', symmetryPeriod: 4, spelling: ['C', 'Eb', 'E', 'G', 'Ab', 'B'] },
  { id: 'hex_augmented_t1', symmetry: 'augmented', symmetryPeriod: 4, spelling: ['C', 'Db', 'E', 'F', 'G#', 'A'] },
  { id: 'hex_augmented_t2', symmetry: 'augmented', symmetryPeriod: 4, spelling: ['C#', 'D', 'F', 'F#', 'A', 'Bb'] },
  { id: 'hex_augmented_t3', symmetry: 'augmented', symmetryPeriod: 4, spelling: ['D', 'Eb', 'F#', 'G', 'Bb', 'B'] },
];

const MAJOR_OMIT_SEVENTH_LOWER: VaultTriad = {
  root: { step: 'C', alter: 0 },
  quality: 'major',
  notes: [
    { step: 'C', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'G', alter: 0 },
  ],
};

const MAJOR_OMIT_SEVENTH_UPPER: VaultTriad = {
  root: { step: 'D', alter: 0 },
  quality: 'minor',
  notes: [
    { step: 'D', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'A', alter: 0 },
  ],
};

const LYDIAN_LOWER: VaultTriad = {
  root: { step: 'C', alter: 0 },
  quality: 'major',
  notes: [
    { step: 'C', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'G', alter: 0 },
  ],
};

const LYDIAN_UPPER: VaultTriad = {
  root: { step: 'D', alter: 0 },
  quality: 'major',
  notes: [
    { step: 'D', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'A', alter: 0 },
  ],
};

function pitchClassesOfSpelling(spelling: readonly string[]): number[] {
  const pitchClasses: number[] = [];
  for (const token of spelling) {
    const parsed = parseNoteToken(token);
    if (!parsed) throw new Error(`hexatonic spelling ${token} is not a note`);
    pitchClasses.push(parsed.pc);
  }
  const canonical = canonicalPitchSet(pitchClasses);
  if (canonical.length !== spelling.length) throw new Error(`hexatonic spelling collapses ${spelling.join(' ')}`);
  return canonical;
}

function readingOf(role: HexatonicTriadReading['role'], triad: VaultTriad): HexatonicTriadReading {
  const pitchClasses = triad.notes.map(pitchClassOf) as [number, number, number];
  return {
    role,
    quality: triad.quality,
    spelling: triad.notes.map(spellName) as [string, string, string],
    pitchClasses,
  };
}

function bassAt(rootPc: number): BhlBassBar {
  return {
    bar: 1,
    quarters: 4,
    attacks: [0],
    rests: [],
    notes: [{ onset: 0, quarters: 4, midi: 48 + rootPc, pitchClass: rootPc }],
    pitchClasses: [rootPc],
    rootPc,
  };
}

export function lydianFieldAt(rootPc: number) {
  return buildBhlWorldField('A', bassAt(mod12(rootPc)), 'primary');
}

function scalarFromRow(row: ScalarRow): HexatonicScalarCollection {
  const pitchClasses = pitchClassesOfSpelling(row.spelling);
  let triadReading: readonly HexatonicTriadReading[] | null = null;
  if (row.id === 'hex_major_omit_seventh') {
    triadReading = [readingOf('lower', MAJOR_OMIT_SEVENTH_LOWER), readingOf('upper', MAJOR_OMIT_SEVENTH_UPPER)];
  }
  return {
    id: row.id,
    kind: 'scalar',
    symmetry: row.symmetry,
    symmetryPeriod: row.symmetryPeriod,
    referenceSpelling: row.spelling,
    pitchClasses,
    source: 'h1-scalar',
    triadReading,
  };
}

function lydianCollection(): HexatonicScalarCollection {
  const field = lydianFieldAt(0);
  const lower = readingOf('lower', LYDIAN_LOWER);
  const upper = readingOf('upper', LYDIAN_UPPER);
  const fromTriads = canonicalPitchSet([...lower.pitchClasses, ...upper.pitchClasses]);
  if (fromTriads.join(',') !== canonicalPitchSet(field.pitchClasses).join(',')) {
    throw new Error('lydian triad reading does not match BHL World A');
  }
  if (canonicalPitchSet(field.groups[0] ?? []).join(',') !== lower.pitchClasses.join(',')) {
    throw new Error('BHL World A lower group is not C major');
  }
  if (canonicalPitchSet(field.groups[1] ?? []).join(',') !== canonicalPitchSet(upper.pitchClasses).join(',')) {
    throw new Error('BHL World A upper group is not D major');
  }
  return {
    id: 'hex_lydian_triad_pair',
    kind: 'scalar',
    symmetry: 'none',
    symmetryPeriod: 12,
    referenceSpelling: ['C', 'D', 'E', 'F#', 'G', 'A'],
    pitchClasses: canonicalPitchSet(field.pitchClasses),
    source: 'bhl-world-A',
    triadReading: [lower, upper],
  };
}

const SCALARS: readonly HexatonicScalarCollection[] = [
  scalarFromRow(SCALAR_ROWS[0]!),
  scalarFromRow(SCALAR_ROWS[1]!),
  scalarFromRow(SCALAR_ROWS[2]!),
  lydianCollection(),
  ...SCALAR_ROWS.slice(3).map(scalarFromRow),
];

const BY_ID = new Map(SCALARS.map((row) => [row.id, row]));

export function listHexatonicScalars(): readonly HexatonicScalarCollection[] {
  return SCALARS;
}

export function getHexatonicScalar(id: string): HexatonicScalarCollection | undefined {
  return BY_ID.get(id);
}

export function transposeScalar(id: string, semitones: number): number[] {
  const row = BY_ID.get(id);
  if (!row) throw new Error(`unknown hexatonic scalar ${id}`);
  return canonicalPitchSet(row.pitchClasses.map((pitchClass) => pitchClass + semitones));
}

export function scalarTriadsAt(id: string, root: Spelled = WPS_VAULT_C_ROOT): readonly HexatonicTriadReading[] | null {
  const row = BY_ID.get(id);
  if (!row?.triadReading) return null;
  const source = id === 'hex_lydian_triad_pair'
    ? [LYDIAN_LOWER, LYDIAN_UPPER]
    : [MAJOR_OMIT_SEVENTH_LOWER, MAJOR_OMIT_SEVENTH_UPPER];
  const roles: HexatonicTriadReading['role'][] = ['lower', 'upper'];
  return source.map((triad, index) => readingOf(roles[index]!, transposeTriad(triad, WPS_VAULT_C_ROOT, root)));
}

export function rootSpelled(pitchClass: number): Spelled {
  const spellings: Spelled[] = [
    { step: 'C', alter: 0 },
    { step: 'C', alter: 1 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: -1 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: -1 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: -1 },
    { step: 'B', alter: 0 },
  ];
  return spellings[mod12(pitchClass)]!;
}
