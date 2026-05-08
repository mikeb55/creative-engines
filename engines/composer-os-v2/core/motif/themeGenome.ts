/**
 * ThemeGenome — Motif Authority Layer V2 structural identity per piece.
 */

export type MotifCellRole = 'primary' | 'secondary' | 'cadential' | 'bridge';

export interface MotifCell2HarmonicMask {
  chordTonesBias: number;
  tensionBias: number;
  avoidStrongLT?: boolean;
  pedalFriendly?: boolean;
  pentatonicOnly?: boolean;
}

export interface MotifCell2TransformBudget {
  transpose: boolean;
  invert: boolean;
  retrograde: boolean;
  augment: boolean;
  diminish: boolean;
  fragment: boolean;
  sequence: boolean;
  embedInnerVoice: boolean;
}

export interface MotifCell2 {
  id: string;
  role: MotifCellRole;
  /** Semitone intervals between consecutive notes (length notes.length - 1). */
  intervals: number[];
  durations: number[];
  contour: ('up' | 'down' | 'same')[];
  accents: number[];
  registerBand: [number, number];
  harmonicMask: MotifCell2HarmonicMask;
  transformBudget: MotifCell2TransformBudget;
  recallWeight: number;
  /** Motif seeder: prefer blues/march micro-cell before interval transforms (Threadgill). */
  bluesMarchSeed?: boolean;
  /** Section builder hint: gospel shout climax density (Mingus). */
  gospelShoutEnabled?: boolean;
}

export interface SectionRecallContract {
  A: { presentWithin: number; transformations: number };
  B: { minTransformations: number; transformDimensions: string[] };
  coda: { recoverBy: 'interval_spine' | 'rhythm_spine' | 'both' };
}

export interface ThemeGenome {
  id: string;
  generationId: string;
  primaryCell: MotifCell2;
  secondaryCell?: MotifCell2;
  cadentialTail?: MotifCell2;
  bridgeCell?: MotifCell2;
  /** Canonical songwriter id — matches `SongwriterRuleId` string form. */
  voiceId: string;
  recallQuota: number;
  sectionContracts: SectionRecallContract;
}
