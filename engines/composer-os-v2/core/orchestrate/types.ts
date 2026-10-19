/**
 * Composer OS V3.4 Stage C — Orchestrate request and receipt.
 * The transformer runs only when `enabled` is true.
 */

import type { Technique } from '../instruments/instrumentTypes';
import type { E2PerformRequest } from './e2Perform';

export type EnsembleTemplateId = 'string_quartet' | 'pierrot' | 'wind_quintet' | 'chamber_orchestra';

export type LayerRole = 'melody' | 'countermelody' | 'bass' | 'harmony_inner' | 'pedal' | 'rhythm_ostinato' | 'colour';

export type OrchestrateDensity = 'sparse' | 'medium' | 'dense' | 'very_dense';

export type HarmonySource = 'source' | 'bhl_world' | 'pentatonic' | 'hexatonic' | 'sq_vrb';

export type SegmentalDevice = 'none' | 'timbral_shift' | 'timbral_echo' | 'antiphonal' | 'sectional_boundary';

export interface SectionColourPlan {
  section: string;
  startBar: number;
  endBar: number;
  density: OrchestrateDensity;
  registerCentre: number;
  melodyCarriers: string[];
  doubling: 'none' | 'unison' | 'octave' | 'octave_and_unison';
  maxDoublingBars: number;
  counterlineFrom?: { motifId: string; chain: string[]; offsetBeats?: number };
  harmonySource: HarmonySource;
  harmonyParam?: string;
  segmentalDevice?: SegmentalDevice;
  techniques?: Partial<Record<string, Technique>>;
  roles?: Partial<Record<string, LayerRole>>;
  /** Inference. Defaults are co-onset 0.5 and parallel-perfect run length 2. */
  independence?: { maxCoOnsetRate: number; maxParallelPerfectRun: number };
}

export type PianoChamberRole =
  | 'melody'
  | 'bass'
  | 'countermelody'
  | 'harmonic_support'
  | 'rhythmic_figure'
  | 'unassigned';

export type PianoChamberMode = 'faithful' | 'developing';

/** Musician corrections. Inferred roles stay proposals until `reviewConfirmed`. */
export interface PianoChamberCorrection {
  mode?: PianoChamberMode;
  tempoBpm?: number;
  partIds?: string[];
  roles?: Record<string, PianoChamberRole>;
  /** Extra event ids that must survive. */
  locks?: string[];
  /** Removes a default lock. The omission is then intentional. */
  unlocks?: string[];
  phrases?: Array<{ id: string; startBar: number; endBar: number }>;
  reviewConfirmed?: boolean;
  /** Musician asked to leave these source events out. Locked ids are refused. */
  omitEventIds?: string[];
}

export interface PianoChamberCommand {
  action: 'propose' | 'realise';
  sourceMusicXml: string;
  correction?: PianoChamberCorrection;
}

export interface OrchestrateRequest {
  /** Required. false or omitted does not build a score. */
  enabled: boolean;
  sourceMusicXml: string;
  template: EnsembleTemplateId;
  plan: SectionColourPlan[];
  seed: number;
  preserveMelody: true;
  /** Opt-in E2 realisation. When set, legacy source reduction does not run. */
  e2?: E2PerformRequest;
  /** V3.5 Phase 1 piano-to-chamber. When set, legacy reduction and E2 do not run. */
  pianoChamber?: PianoChamberCommand;
}

export interface OrchestrateFlag {
  bar: number;
  beat: number;
  partId: string;
  kind: 'outside_hard_range' | 'outside_comfort' | 'too_many_notes' | 'technique_not_allowed';
  detail: string;
}

export interface DerivedLineEvent {
  sounding: number;
  duration: number;
  /** Quarter onset from the start of the score. Beat 2 is onset 1. */
  onset: number;
}

export interface OrchestrateReceipt {
  version: 'orchestrate-1';
  inputSha256: string;
  params: OrchestrateRequest;
  layerAssignments: Array<{ bar: number; role: LayerRole; partId: string; sourcePart: string; octaveShift: number }>;
  derivedLines: Array<{ partId: string; lineageId: string; ops: string[]; events: DerivedLineEvent[] }>;
  omittedLines: Array<{ partId: string; lineageId: string; reason: string }>;
  flagged: OrchestrateFlag[];
  omissions: Array<{ partId: string; instrumentId: string; detail: string }>;
  doublingRuns: Array<{ parts: [string, string]; interval: 'unison' | 'octave'; startBar: number; bars: number }>;
  provenance: Array<{
    source: HarmonySource;
    param: string;
    invoked: boolean;
    influenced: boolean;
    pitchClasses: number[];
    detail: string;
  }>;
  planners: {
    family: string;
    density: Array<{ bar: number; requested: OrchestrateDensity; planner: string }>;
    register: Array<{ partId: string; requested: string; assigned: string }>;
    guitarZone: [number, number] | null;
    bassZone: [number, number] | null;
    ownershipEntries: number;
  };
  parallelMotionReported: boolean | null;
  independence: Array<{ pair: [string, string]; coOnsetRate: number; longestParallelPerfect: number }>;
  voiceLeadingScores: number[];
  musicalQualityScore: null;
  musicallyApproved: false;
}
