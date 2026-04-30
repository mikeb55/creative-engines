/**
 * Slonimsky *Thesaurus of Scales and Melodic Patterns* (1947 cumulative catalogue) —
 * section metadata and mapping from Composer OS engine pattern ids to book Pattern Nos.
 *
 * Pattern bands follow `docs/SLONIMSKY_USER_GUIDE.md`. Rows 6–8 share the multi-octave
 * block before Pattern 173; exact subsection boundaries vary by facsimile — use the book index.
 */

import type { IntervalPattern, IntervalPatternId } from './slonimskyEngine';

/** Canonical keys for the 13 major Thesaurus section families (user-guide ordering). */
export type ThesaurusSectionKey =
  | 'tritone_progression'
  | 'ditone_progression'
  | 'sesquitone_progression'
  | 'whole_tone_progression'
  | 'semitone_progression'
  | 'quadritone_progression'
  | 'sesquiquadritone'
  | 'quinquetone_diatessaron'
  | 'twelve_tone_dodecaphonic'
  | 'intervallic_mirror_permutations'
  | 'polytonal_scales'
  | 'heptatonic_scales'
  | 'pentatonic_scales';

export interface ThesaurusPatternBand {
  /** Inclusive; stable across Schirmer-line reprints when set. */
  start?: number;
  end?: number;
  /** When `start`/`end` are not a single band (e.g. rows 6–8). */
  approximateBand?: { start: number; end: number };
  /** Human-readable caveat for index-based lookup. */
  indexHint?: string;
}

export interface ThesaurusSectionRecord {
  ordinal: number;
  key: ThesaurusSectionKey;
  title: string;
  divisionScope: string;
  patternBand: ThesaurusPatternBand;
}

/**
 * One row in the Slonimsky catalogue: book filing + interval DNA. Engine runtime uses the subset
 * with {@link ThesaurusPattern.inEngine}; additional rows support lookups like {@link getPatternsBySection}.
 */
export interface ThesaurusPattern {
  id: IntervalPatternId;
  name: string;
  /** Book Pattern No. anchor (inclusive start of primary filing for this row). */
  thesaurusNo: number;
  /** Inclusive end of the book band for this filing. */
  patternEnd: number;
  section: ThesaurusSectionKey;
  /** Player / style tags — maps to engine {@link IntervalPattern.styleAffinity}. */
  playerAffinity: Array<'coltrane' | 'shorter' | 'brecker' | 'ecm'>;
  intervals: number[];
  symmetryType: 'equalDivision' | 'asymmetric';
  baseDivision?: number;
  defaultLength: number;
  tensionLevel: 1 | 2 | 3;
  /**
   * When true, this row is compiled into {@link SLONIMSKY_ENGINE_PATTERNS} and may be selected
   * by the live generator. Catalogue-only rows supply metadata without changing the shipped DNA pool.
   */
  inEngine: boolean;
}

/** All 13 sections — pattern numbers are the book’s cumulative catalogue. */
export const THESAURUS_SECTIONS: readonly ThesaurusSectionRecord[] = [
  {
    ordinal: 1,
    key: 'tritone_progression',
    title: 'Tritone Progression',
    divisionScope: '1 octave ÷ 2',
    patternBand: { start: 1, end: 26 },
  },
  {
    ordinal: 2,
    key: 'ditone_progression',
    title: 'Ditone Progression',
    divisionScope: '1 octave ÷ 3',
    patternBand: { start: 27, end: 50 },
  },
  {
    ordinal: 3,
    key: 'sesquitone_progression',
    title: 'Sesquitone Progression',
    divisionScope: '1 octave ÷ 4',
    patternBand: { start: 51, end: 73 },
  },
  {
    ordinal: 4,
    key: 'whole_tone_progression',
    title: 'Whole-Tone Progression',
    divisionScope: '1 octave ÷ 6',
    patternBand: { start: 74, end: 82 },
  },
  {
    ordinal: 5,
    key: 'semitone_progression',
    title: 'Semitone Progression',
    divisionScope: '1 octave ÷ 12',
    patternBand: { start: 83, end: 90 },
  },
  {
    ordinal: 6,
    key: 'quadritone_progression',
    title: 'Quadritone Progression',
    divisionScope: '2 octaves ÷ 3',
    patternBand: {
      approximateBand: { start: 91, end: 172 },
      indexHint: 'Locate “Quadritone” in your Pattern index — inside the multi-octave block before Pattern 173.',
    },
  },
  {
    ordinal: 7,
    key: 'sesquiquadritone',
    title: 'Sesquiquadritone',
    divisionScope: '3 octaves ÷ 4',
    patternBand: {
      approximateBand: { start: 91, end: 172 },
      indexHint: 'Locate “Sesquiquadritone” in your Pattern index — same multi-octave band as rows 6–8.',
    },
  },
  {
    ordinal: 8,
    key: 'quinquetone_diatessaron',
    title: 'Quinquetone / Diatessaron',
    divisionScope: 'Multi-octave (5ths / 4ths)',
    patternBand: {
      approximateBand: { start: 91, end: 172 },
      indexHint: 'Locate “Quinquetone” / “Diatessaron” — same band as rows 6–7.',
    },
  },
  {
    ordinal: 9,
    key: 'twelve_tone_dodecaphonic',
    title: 'Twelve-Tone / Dodecaphonic (early row fragment)',
    divisionScope: '12-note rows',
    patternBand: { start: 173, end: 175 },
  },
  {
    ordinal: 10,
    key: 'intervallic_mirror_permutations',
    title: 'Intervallic / Mirror / Permutations',
    divisionScope: 'Derived cells',
    patternBand: {
      start: 186,
      end: 188,
      indexHint: 'Expanding/contracting and permutation neighbours — verify companion rows in your index.',
    },
  },
  {
    ordinal: 11,
    key: 'polytonal_scales',
    title: 'Polytonal scales',
    divisionScope: 'Multi-key',
    patternBand: { start: 220, end: 223 },
  },
  {
    ordinal: 12,
    key: 'heptatonic_scales',
    title: 'Heptatonic scales',
    divisionScope: '7-note',
    patternBand: { start: 1034, end: 1087 },
  },
  {
    ordinal: 13,
    key: 'pentatonic_scales',
    title: 'Pentatonic scales',
    divisionScope: '5-note',
    patternBand: { start: 1142, end: 1190 },
  },
] as const;

/**
 * Authoritative pattern rows: book metadata (`thesaurusNo`, `section`, `playerAffinity`) + interval DNA.
 * {@link SLONIMSKY_ENGINE_PATTERNS} is the {@link ThesaurusPattern.inEngine} subset mapped to {@link IntervalPattern}.
 */
export const THESAURUS_REGISTRY: readonly ThesaurusPattern[] = [
  {
    id: 'p_minorThirdCycle',
    name: 'Minor 3rd Cycle Cell',
    thesaurusNo: 51,
    patternEnd: 73,
    section: 'sesquitone_progression',
    playerAffinity: ['coltrane', 'shorter'],
    intervals: [3, 3, 3],
    symmetryType: 'equalDivision',
    baseDivision: 4,
    defaultLength: 4,
    tensionLevel: 3,
    inEngine: true,
  },
  {
    id: 'p_majorThirdCycle',
    name: 'Major 3rd Cycle Cell',
    thesaurusNo: 27,
    patternEnd: 50,
    section: 'ditone_progression',
    playerAffinity: ['coltrane'],
    intervals: [4, 4],
    symmetryType: 'equalDivision',
    baseDivision: 3,
    defaultLength: 3,
    tensionLevel: 3,
    inEngine: true,
  },
  {
    id: 'p_tritonePole',
    name: 'Tritone Pole Alternation',
    thesaurusNo: 1,
    patternEnd: 26,
    section: 'tritone_progression',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [6, -6],
    symmetryType: 'equalDivision',
    baseDivision: 2,
    defaultLength: 4,
    tensionLevel: 3,
    inEngine: true,
  },
  {
    id: 'p_wholeTone',
    name: 'Whole-Tone Segment',
    thesaurusNo: 74,
    patternEnd: 82,
    section: 'whole_tone_progression',
    playerAffinity: ['ecm', 'shorter'],
    intervals: [2, 2, 2],
    symmetryType: 'equalDivision',
    baseDivision: 6,
    defaultLength: 4,
    tensionLevel: 1,
    inEngine: true,
  },
  {
    id: 'p_asymCell123',
    name: 'Asymmetric 1-2-3 Cell',
    thesaurusNo: 186,
    patternEnd: 188,
    section: 'intervallic_mirror_permutations',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 4,
    tensionLevel: 2,
    inEngine: true,
  },
  {
    id: 'p_chromaticInterp',
    name: 'Chromatic Interpolation (minor-third anchor)',
    thesaurusNo: 83,
    patternEnd: 90,
    section: 'semitone_progression',
    playerAffinity: ['brecker'],
    intervals: [1, 1, 1],
    symmetryType: 'equalDivision',
    baseDivision: 12,
    defaultLength: 4,
    tensionLevel: 2,
    inEngine: true,
  },
  {
    id: 'p_expanding',
    name: 'Expanding Interval Cell 1-2-3-4',
    thesaurusNo: 186,
    patternEnd: 188,
    section: 'intervallic_mirror_permutations',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 2, 3, 4],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 3,
    inEngine: true,
  },
  {
    id: 'p_contracting',
    name: 'Contracting Interval Cell 4-3-2-1',
    thesaurusNo: 186,
    patternEnd: 188,
    section: 'intervallic_mirror_permutations',
    playerAffinity: ['ecm', 'shorter'],
    intervals: [4, 3, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 1,
    inEngine: true,
  },
  /** Heptatonic scales (Pattern Nos. 1034–1087); pitch-class sets → step intervals; catalogue-only until V3 promotion. */
  {
    id: 'p_hept_1034',
    name: 'Heptatonic ascending whole-tone + semitone',
    thesaurusNo: 1034,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['coltrane', 'brecker'],
    intervals: [2, 2, 2, 2, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1037',
    name: 'Heptatonic mixed intervals ascending',
    thesaurusNo: 1037,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['shorter', 'ecm'],
    intervals: [1, 2, 2, 2, 2, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1042',
    name: 'Heptatonic natural minor variant',
    thesaurusNo: 1042,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['ecm', 'coltrane'],
    intervals: [2, 1, 2, 2, 1, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1048',
    name: 'Heptatonic chromatic-whole hybrid',
    thesaurusNo: 1048,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 1, 2, 2, 2, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_hept_1053',
    name: 'Heptatonic major-modal',
    thesaurusNo: 1053,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['coltrane', 'shorter'],
    intervals: [2, 2, 1, 2, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1058',
    name: 'Heptatonic diminished-whole',
    thesaurusNo: 1058,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['brecker', 'ecm'],
    intervals: [1, 2, 1, 2, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_hept_1063',
    name: 'Heptatonic lydian dominant variant',
    thesaurusNo: 1063,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['coltrane', 'brecker'],
    intervals: [2, 2, 2, 1, 2, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1068',
    name: 'Heptatonic locrian variant',
    thesaurusNo: 1068,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['shorter', 'ecm'],
    intervals: [1, 2, 2, 1, 2, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_hept_1074',
    name: 'Heptatonic harmonic minor variant',
    thesaurusNo: 1074,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['ecm', 'shorter'],
    intervals: [2, 1, 2, 1, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1079',
    name: 'Heptatonic augmented hybrid',
    thesaurusNo: 1079,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 3, 1, 3, 1, 2],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_hept_1083',
    name: 'Heptatonic harmonic major',
    thesaurusNo: 1083,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['coltrane', 'ecm'],
    intervals: [2, 2, 1, 2, 1, 3],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_hept_1087',
    name: 'Heptatonic tritone axis',
    thesaurusNo: 1087,
    patternEnd: 1087,
    section: 'heptatonic_scales',
    playerAffinity: ['shorter', 'brecker'],
    intervals: [1, 2, 3, 1, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 7,
    tensionLevel: 3,
    inEngine: false,
  },
  /** Pentatonic scales (Pattern Nos. 1142–1190); pitch-class sets → step intervals; catalogue-only until V3 promotion. */
  {
    id: 'p_pent_1142',
    name: 'Major pentatonic',
    thesaurusNo: 1142,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['coltrane', 'ecm'],
    intervals: [2, 2, 3, 2],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 1,
    inEngine: false,
  },
  {
    id: 'p_pent_1147',
    name: 'Minor pentatonic',
    thesaurusNo: 1147,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['brecker', 'shorter'],
    intervals: [3, 2, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 1,
    inEngine: false,
  },
  {
    id: 'p_pent_1152',
    name: 'Suspended pentatonic',
    thesaurusNo: 1152,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['ecm', 'coltrane'],
    intervals: [2, 3, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_pent_1158',
    name: 'Hirajoshi',
    thesaurusNo: 1158,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['shorter', 'ecm'],
    intervals: [1, 4, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_pent_1163',
    name: 'Whole-tone pentatonic',
    thesaurusNo: 1163,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['coltrane', 'brecker'],
    intervals: [2, 2, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_pent_1168',
    name: 'In scale (Japanese)',
    thesaurusNo: 1168,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['ecm', 'shorter'],
    intervals: [4, 1, 2, 4],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_pent_1174',
    name: 'Iwato',
    thesaurusNo: 1174,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 4, 1, 4],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_pent_1179',
    name: 'Augmented pentatonic',
    thesaurusNo: 1179,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['coltrane', 'ecm'],
    intervals: [3, 1, 4, 1],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 3,
    inEngine: false,
  },
  {
    id: 'p_pent_1184',
    name: 'Egyptian pentatonic',
    thesaurusNo: 1184,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['shorter', 'brecker'],
    intervals: [2, 4, 1, 2],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 2,
    inEngine: false,
  },
  {
    id: 'p_pent_1190',
    name: 'Tritone pentatonic',
    thesaurusNo: 1190,
    patternEnd: 1190,
    section: 'pentatonic_scales',
    playerAffinity: ['brecker', 'ecm'],
    intervals: [4, 2, 1, 4],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 3,
    inEngine: false,
  },
  /** Catalogue filing in Tritone Progression (Patterns 1–26); DNA placeholder until promoted to engine pool. */
  {
    id: 'p_tritoneApproachSemitone',
    name: 'Tritone approach (semitone neighbour) — catalogue ref',
    thesaurusNo: 2,
    patternEnd: 26,
    section: 'tritone_progression',
    playerAffinity: ['brecker', 'coltrane'],
    intervals: [1, 6],
    symmetryType: 'asymmetric',
    defaultLength: 4,
    tensionLevel: 3,
    inEngine: false,
  },
];

export function thesaurusPatternToIntervalPattern(p: ThesaurusPattern): IntervalPattern {
  return {
    id: p.id,
    name: p.name,
    intervals: p.intervals,
    symmetryType: p.symmetryType,
    baseDivision: p.baseDivision,
    defaultLength: p.defaultLength,
    tensionLevel: p.tensionLevel,
    styleAffinity: p.playerAffinity,
  };
}

/** Live generator interval patterns — {@link THESAURUS_REGISTRY} rows with {@link ThesaurusPattern.inEngine}. */
export const SLONIMSKY_ENGINE_PATTERNS: readonly IntervalPattern[] = THESAURUS_REGISTRY.filter((r) => r.inEngine).map(
  thesaurusPatternToIntervalPattern
);

const ENGINE_PATTERN_BY_ID: ReadonlyMap<IntervalPatternId, IntervalPattern> = new Map(
  SLONIMSKY_ENGINE_PATTERNS.map((p) => [p.id, p])
);

const THESAURUS_REGISTRY_BY_ID: ReadonlyMap<IntervalPatternId, ThesaurusPattern> = new Map(
  THESAURUS_REGISTRY.map((p) => [p.id, p])
);

const SECTION_QUERY_ALIASES: Readonly<Record<string, ThesaurusSectionKey>> = {
  tritone: 'tritone_progression',
  ditone: 'ditone_progression',
  sesquitone: 'sesquitone_progression',
  'whole-tone': 'whole_tone_progression',
  whole_tone: 'whole_tone_progression',
  semitone: 'semitone_progression',
  intervallic: 'intervallic_mirror_permutations',
  heptatonic: 'heptatonic_scales',
  pentatonic: 'pentatonic_scales',
};

/** Phrase-intent → Slonimsky pattern ids (registry — includes V3-planned ids beyond shipped {@link SLONIMSKY_ENGINE_PATTERNS}). */
export const INTENT_PATTERN_IDS: Readonly<Record<'build' | 'release' | 'float' | 'shock', readonly string[]>> = {
  shock: [
    'p_tritonePole',
    'p_tritoneApproachSemitone',
    'p_tritoneApproachWholeTone',
    'p_tritoneDescendSemitone',
    'p_tritoneMinorThirdSplit',
    'p_majorThirdCycle',
    'p_ditoneMinorThirdApproach',
    'p_ditoneSemitoneApproach',
    'p_minorThirdCycle',
    'p_sesquitoneWholeToneSemitone',
    'p_sesquitoneSemitoneWholeTone',
    'p_sesquitoneDenseChromatic',
    'p_chromaticHexachordTritone',
  ],
  build: [
    'p_expanding',
    'p_chromaticInterp',
    'p_chromaticOscillation',
    'p_wholeToneSemitoneEntry',
    'p_ditoneWholeToneApproach',
  ],
  float: [
    'p_wholeTone',
    'p_asymCell123',
    'p_wholeToneMinorThirdPivot',
    'p_chromaticDiatonicAlt',
  ],
  release: ['p_contracting'],
};

/** Patterns shipped in {@link SLONIMSKY_ENGINE_PATTERNS} for a phrase intent (INTENT ids ∩ catalogue). */
export function getEnginePatternsForIntent(
  phraseIntent: 'build' | 'release' | 'float' | 'shock'
): readonly IntervalPattern[] {
  const ids = INTENT_PATTERN_IDS[phraseIntent];
  const out: IntervalPattern[] = [];
  for (const id of ids) {
    const p = ENGINE_PATTERN_BY_ID.get(id as IntervalPatternId);
    if (p) out.push(p);
  }
  return out;
}

export function getEnginePatternById(id: IntervalPatternId): IntervalPattern | undefined {
  return ENGINE_PATTERN_BY_ID.get(id);
}

export function getThesaurusPatternById(id: IntervalPatternId): ThesaurusPattern | undefined {
  return THESAURUS_REGISTRY_BY_ID.get(id);
}

/** Patterns registered under a Thesaurus section (short alias e.g. `tritone` or full {@link ThesaurusSectionKey}). */
export function getPatternsBySection(sectionQuery: string): readonly ThesaurusPattern[] {
  const raw = sectionQuery.trim().toLowerCase();
  const key =
    SECTION_QUERY_ALIASES[raw] ??
    (THESAURUS_SECTIONS.some((s) => s.key === raw) ? (raw as ThesaurusSectionKey) : undefined);
  if (!key) return [];
  return THESAURUS_REGISTRY.filter((p) => p.section === key);
}

/** V3 target bands (documentation / planning — not emitted by the V1–V2 engine). */
export const THESAURUS_V3_TARGET_BANDS = {
  heptatonic: { start: 1034, end: 1087 },
  pentatonic: { start: 1142, end: 1190 },
  twelveToneEarly: { start: 173, end: 175 },
} as const;

function engineMapEntry(
  p: ThesaurusPattern
): readonly [IntervalPatternId, { sectionKey: ThesaurusSectionKey; patternStart: number; patternEnd: number }] {
  return [p.id, { sectionKey: p.section, patternStart: p.thesaurusNo, patternEnd: p.patternEnd }];
}

/**
 * Shipped engine pattern → primary Thesaurus section + inclusive Pattern No. band (same catalogue).
 * Derived from {@link THESAURUS_REGISTRY} rows with {@link ThesaurusPattern.inEngine}.
 */
export const ENGINE_PATTERN_THESAURUS_MAP: Readonly<
  Record<
    IntervalPatternId,
    { sectionKey: ThesaurusSectionKey; patternStart: number; patternEnd: number } | undefined
  >
> = Object.fromEntries(THESAURUS_REGISTRY.filter((r) => r.inEngine).map(engineMapEntry)) as Readonly<
  Record<
    IntervalPatternId,
    { sectionKey: ThesaurusSectionKey; patternStart: number; patternEnd: number } | undefined
  >
>;

const SECTION_BY_KEY: ReadonlyMap<ThesaurusSectionKey, ThesaurusSectionRecord> = new Map(
  THESAURUS_SECTIONS.map((s) => [s.key, s])
);

export function getThesaurusSection(key: ThesaurusSectionKey): ThesaurusSectionRecord | undefined {
  return SECTION_BY_KEY.get(key);
}

/** Returns sections whose fixed bands contain `patternNumber`, or whose approximate band contains it. */
export function thesaurusSectionsForPatternNumber(patternNumber: number): ThesaurusSectionRecord[] {
  const out: ThesaurusSectionRecord[] = [];
  for (const s of THESAURUS_SECTIONS) {
    const b = s.patternBand;
    if (b.start !== undefined && b.end !== undefined) {
      if (patternNumber >= b.start && patternNumber <= b.end) out.push(s);
    } else if (b.approximateBand) {
      const { start, end } = b.approximateBand;
      if (patternNumber >= start && patternNumber <= end) out.push(s);
    }
  }
  return out;
}

export function thesaurusLinkForEnginePattern(
  id: IntervalPatternId
): { sectionKey: ThesaurusSectionKey; patternStart: number; patternEnd: number } | undefined {
  return ENGINE_PATTERN_THESAURUS_MAP[id];
}
