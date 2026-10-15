/**
 * BMEF-100 V2.0 catalogue.
 * Criteria, gates, and evidence levels are copied from that document.
 * This module does not rate them and does not total them.
 */

export const BMEF_VERSION = '2.0' as const;

export interface BmefCriterion {
  id: string;
  name: string;
  weight: number;
  layer: 'core' | 'module';
}

export interface BmefGate {
  id: 'G1' | 'G2' | 'G3' | 'G4';
  name: string;
  points: 0;
}

export const BMEF_GATES: readonly BmefGate[] = [
  { id: 'G1', name: 'Intent brief filed before scoring', points: 0 },
  { id: 'G2', name: 'Feasibility for the target performers', points: 0 },
  { id: 'G3', name: 'Notational / realisation integrity', points: 0 },
  { id: 'G4', name: 'Identity preservation (revisions only)', points: 0 },
];

export const BMEF_CORE: readonly BmefCriterion[] = [
  { id: 'U1', name: 'Identity and character', weight: 15, layer: 'core' },
  { id: 'U2', name: 'Expressive impact', weight: 15, layer: 'core' },
  { id: 'U3', name: 'Coherence, form and pacing', weight: 15, layer: 'core' },
  { id: 'U4', name: 'Effective originality', weight: 10, layer: 'core' },
  { id: 'U5', name: 'Economy and necessity', weight: 10, layer: 'core' },
  { id: 'U6', name: 'Sonic realisation', weight: 5, layer: 'core' },
];

export const BMEF_MODULE_J: readonly BmefCriterion[] = [
  { id: 'J1', name: 'Harmonic language effectiveness', weight: 8, layer: 'module' },
  { id: 'J2', name: 'Line and voice-leading', weight: 7, layer: 'module' },
  { id: 'J3', name: 'Interaction and space', weight: 7, layer: 'module' },
  { id: 'J4', name: 'Idiomatic writing and expressive playability', weight: 4, layer: 'module' },
  { id: 'J5', name: 'Improvisational affordance', weight: 4, layer: 'module' },
];

/** Dimension names and weights from BMEF-100 V2.0 section 3.2. No extra codes. */
export const BMEF_OTHER_MODULES: readonly { id: string; name: string; dimensions: readonly { name: string; weight: number }[] }[] = [
  {
    id: 'C',
    name: 'Contemporary chamber',
    dimensions: [
      { name: 'Pitch/harmonic organisation', weight: 8 },
      { name: 'Textural and contrapuntal design', weight: 7 },
      { name: 'Ensemble writing and role distribution', weight: 7 },
      { name: 'Idiomatic and extended technique', weight: 5 },
      { name: 'Notational clarity for performers', weight: 3 },
    ],
  },
  {
    id: 'O',
    name: 'Orchestral',
    dimensions: [
      { name: 'Orchestration and balance', weight: 9 },
      { name: 'Harmonic/pitch organisation', weight: 6 },
      { name: 'Large-scale textural architecture', weight: 7 },
      { name: 'Idiomatic part-writing across sections', weight: 5 },
      { name: 'Rehearsal efficiency and notation', weight: 3 },
    ],
  },
  {
    id: 'F',
    name: 'Film/media',
    dimensions: [
      { name: 'Dramatic fit and timing to picture/brief', weight: 10 },
      { name: 'Thematic adaptability across cues', weight: 7 },
      { name: 'Clarity under dialogue/sound effects', weight: 6 },
      { name: 'Production/orchestration for the medium', weight: 4 },
      { name: 'Delivery practicality', weight: 3 },
    ],
  },
  {
    id: 'E',
    name: 'Electronic/experimental',
    dimensions: [
      { name: 'Sound design and timbral invention', weight: 9 },
      { name: 'Spatial and dynamic shaping', weight: 6 },
      { name: 'Process or system integrity', weight: 7 },
      { name: 'Gesture and event density control', weight: 5 },
      { name: 'Realisation and reproducibility', weight: 3 },
    ],
  },
  {
    id: 'S',
    name: 'Solo instrumental',
    dimensions: [
      { name: 'Idiomatic exploitation of the instrument', weight: 8 },
      { name: 'Polyphonic/registral illusion and voicing', weight: 7 },
      { name: 'Harmonic language effectiveness', weight: 7 },
      { name: 'Expressive latitude for the performer', weight: 5 },
      { name: 'Learnability and memorability', weight: 3 },
    ],
  },
  {
    id: 'P',
    name: 'Performance edition / improvisation study',
    dimensions: [
      { name: 'Pedagogical or performance purpose fulfilled', weight: 8 },
      { name: 'Fidelity to source', weight: 7 },
      { name: 'Contrast between choruses/roles', weight: 6 },
      { name: 'Playability at target level', weight: 5 },
      { name: 'Improvisational affordance', weight: 4 },
    ],
  },
];

export const BMEF_EVIDENCE_LEVELS = [
  { id: 'E1', name: 'Score analysis' },
  { id: 'E2', name: 'Audition' },
  { id: 'E3', name: 'Performance' },
  { id: 'A', name: 'Assumption' },
] as const;

export const BMEF_DECISIONS = ['ACCEPT', 'REFINE', 'REJECT', 'FORK'] as const;

export interface HumanScorecard {
  bmef_version: typeof BMEF_VERSION;
  module: string | null;
  gates: Record<'G1' | 'G2' | 'G3' | 'G4', null>;
  ratings: Array<{ criterion: string; weight: number; K: null; R: null; evidence: null; confidence: null; bars: null; reason: null }>;
  decision: null;
  coreTotal: null;
  moduleTotal: null;
  combinedTotal: null;
}

/** Blank human scorecard. Every rating stays null. */
export function emptyHumanScorecard(module: string | null = 'J'): HumanScorecard {
  const moduleRows = module === 'J'
    ? BMEF_MODULE_J.map((criterion) => ({ criterion: criterion.id, weight: criterion.weight }))
    : [];
  return {
    bmef_version: BMEF_VERSION,
    module,
    gates: { G1: null, G2: null, G3: null, G4: null },
    ratings: [...BMEF_CORE, ...moduleRows].map((row) => ({
      criterion: 'id' in row ? row.id : row.criterion,
      weight: row.weight,
      K: null,
      R: null,
      evidence: null,
      confidence: null,
      bars: null,
      reason: null,
    })),
    decision: null,
    coreTotal: null,
    moduleTotal: null,
    combinedTotal: null,
  };
}
