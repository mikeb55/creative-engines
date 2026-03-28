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
import type { KeySignatureReceiptMetadata } from './harmony/keyInferenceTypes';
import type { HarmonyBarContract } from './harmony/harmonyBarContract';
import type { CoreMotif, Motif } from './motif/motifEngineTypes';

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

/** Runtime trace of which harmony layer produced data (enable with COMPOSER_OS_HARMONY_TRACE=1). */
export type HarmonyPipelineStage =
  | 'ui_input'
  | 'parse'
  | 'composition_context'
  | 'score_builder'
  | 'musicxml_export';

export interface HarmonyPipelineStageRecord {
  stage: HarmonyPipelineStage;
  detail: string;
}

/** Generation metadata. */
export interface GenerationMetadata {
  generatedAt: string;
  durationMs?: number;
  steps?: string[];
  /** Guitar–Bass Duo: built-in cycle vs user progression text */
  harmonySource?: 'builtin' | 'custom';
  /** User pasted progression: do not normalize or substitute harmony (Song Mode / locked long-form). */
  customHarmonyLocked?: boolean;
  /** Short readable summary when `harmonySource` is custom */
  customChordProgressionSummary?: string;
  /** UI / request: built-in vs custom progression mode */
  progressionMode?: 'builtin' | 'custom';
  /** Raw user `chordProgressionText` when custom mode was requested (success or parse failure) */
  chordProgressionInputRaw?: string;
  /** Parsed one chord per bar when custom harmony was applied successfully */
  parsedCustomProgressionBars?: string[];
  /** True after written MusicXML harmony blocks match `lockedHarmonyBarsRaw` bar-for-bar (release gate). */
  customHarmonyMusicXmlTruthPassed?: boolean;
  /** V3.6b — Receipt echo of `harmonySource` for clarity (chord source vs style grammar). */
  harmonySourceUsed?: 'builtin' | 'custom';
  /** V3.6b — Honest label: internal duo engine uses Barry Harris–derived rules by default; not a claim the user picked BH. */
  styleGrammarLabel?: string;
  /** V3.6b — Primary style module id driving gates (technical; often engine default `barry_harris`). */
  styleStackPrimaryModuleId?: string;
  /** V3.6b — Registry display name for primary module. */
  styleStackPrimaryDisplayName?: string;
  /** V3.6b — Human-readable active stack (primary → secondary → colour) for receipts. */
  userSelectedStyleDisplayNames?: string[];
  /** V3.6b — True when primary module is not the duo default primary (`barry_harris`). */
  userExplicitPrimaryStyle?: boolean;
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
  /** V3.4 — key signature inference / export metadata (additive). */
  keySignatureReceipt?: KeySignatureReceiptMetadata;
  /** Optional bar-by-bar contract: display + semantics for locked long-form / Song Mode. */
  harmonyPipelineTrace?: HarmonyPipelineStageRecord[];
  /** Song Mode: generate hook-first guitar identity (bar 1 statement, bar 25 return); melody layer only. */
  songModeHookFirstIdentity?: boolean;
  /** Song Mode: compact hook cell (contour dirs + variation dimension) for receipts / debugging. */
  songModeHookCellSummary?: string;
  /** Song Mode: 1–3 abstract core motifs (interval/rhythm/contour/tags). */
  songModeCoreMotifs?: CoreMotif[];
  /** Song Mode: motif count (Motif Engine v2 uses 1). */
  songModeMotifCount?: 1 | 2 | 3;
  /** Song Mode Motif v2: canonical primary motif for validation / receipts. */
  songModePrimaryMotif?: Motif;
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
  /**
   * When set (custom / locked harmony), authoritative one chord symbol per bar (1-based index = array index + 1).
   * Score chords, MusicXML harmony export, and post-write validation must use this — not a derived planner path.
   */
  lockedHarmonyBarsRaw?: string[];
  /**
   * Locked Song Mode: one contract per bar (display + structured semantics). Generation and export must agree.
   */
  lockedHarmonyBarContracts?: HarmonyBarContract[];

  generationMetadata: GenerationMetadata;
  validation: ValidationResults;
  styleOverrides?: Record<string, unknown>;
  readiness: {
    release: ReleaseReadinessResult;
    mx: MxReadinessResult;
  };
}
