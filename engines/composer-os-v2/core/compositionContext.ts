/**
 * Composer OS V2 — CompositionContext
 * Non-negotiable shared contract for all core systems and future style modules.
 */

import type { MotifState } from './primitives/motifTypes';
import type { PhrasePlan } from './primitives/phraseTypes';
import type { HarmonyPlan } from './primitives/harmonyTypes';
import type { RegisterMap } from './primitives/registerTypes';
import type { DensityCurve } from './primitives/densityTypes';
import type { FeelConfig } from './rhythm-engine/rhythmTypes';
import type { InstrumentProfile } from './instrument-profiles/instrumentProfileTypes';
import type { ReleaseReadinessResult } from './readiness/readinessTypes';
import type { MxReadinessResult } from './readiness/mxReadinessScorer';
import type { ValidationResults } from './conductor/conductorTypes';

/** Form map: section labels and bar ranges. */
export interface FormMap {
  sections: Array<{ label: string; startBar: number; length: number }>;
  totalBars: number;
}

/** Chord symbol plan: chord symbols per bar/segment. */
export interface ChordSymbolPlan {
  segments: Array<{ chord: string; startBar: number; bars: number }>;
  totalBars: number;
}

/** Rehearsal mark plan. */
export interface RehearsalMarkPlan {
  marks: Array<{ label: string; bar: number }>;
}

/** Generation metadata. */
export interface GenerationMetadata {
  generatedAt: string;
  durationMs?: number;
  steps?: string[];
}

/** Shared CompositionContext — required by every core system and style module. */
export interface CompositionContext {
  systemVersion: string;
  presetId: string;
  seed: number;

  form: FormMap;
  feel: FeelConfig;
  harmony: HarmonyPlan;
  motif: MotifState;
  phrase: PhrasePlan;
  register: RegisterMap;
  density: DensityCurve;

  instrumentProfiles: InstrumentProfile[];
  chordSymbolPlan: ChordSymbolPlan;
  rehearsalMarkPlan: RehearsalMarkPlan;

  generationMetadata: GenerationMetadata;
  validation: ValidationResults;
  readiness: {
    release: ReleaseReadinessResult;
    mx: MxReadinessResult;
  };
}
