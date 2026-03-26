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
import type { EcmChamberMode, EcmGenerationMetrics } from './ecm/ecmChamberTypes';

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
  /** Guitar–Bass Duo: built-in cycle vs user progression text */
  harmonySource?: 'builtin' | 'custom';
  /** Short readable summary when `harmonySource` is custom */
  customChordProgressionSummary?: string;
  /** UI / request: built-in vs custom progression mode */
  progressionMode?: 'builtin' | 'custom';
  /** Raw user `chordProgressionText` when custom mode was requested (success or parse failure) */
  chordProgressionInputRaw?: string;
  /** Parsed one chord per bar when custom harmony was applied successfully */
  parsedCustomProgressionBars?: string[];
  /** True if user requested custom but parsing failed — no score was produced with that harmony */
  chordProgressionParseFailed?: boolean;
  /** True only if built-in harmony was used despite a valid custom request (must stay false) */
  builtInHarmonyFallbackOccurred?: boolean;
  /** ECM Chamber preset only */
  ecmMode?: EcmChamberMode;
  ecmMetrics?: EcmGenerationMetrics;
  /** Guitar–Bass Duo: opt-in 32-bar long-form route (V4.0) */
  longFormDuo?: boolean;
  modulationPlanActive?: boolean;
  /** Explicit bar count when long-form or extended forms are used */
  totalBars?: number;
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
  styleOverrides?: Record<string, unknown>;
  readiness: {
    release: ReleaseReadinessResult;
    mx: MxReadinessResult;
  };
}
