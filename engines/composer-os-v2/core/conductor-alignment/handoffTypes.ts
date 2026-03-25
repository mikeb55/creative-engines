/**
 * Declarative handoff contract tags for future module categories.
 * No runtime wiring — aligns with module-invocation categories.
 */

export type HandoffModuleCategory =
  | 'melody'
  | 'harmony'
  | 'rhythm'
  | 'counterpoint'
  | 'orchestration'
  | 'songwriting'
  | 'bridge/export';

/** Placeholder for melody lane payloads (future). */
export interface MelodyHandoffContract {
  readonly channel: 'melody';
}

/** Placeholder for harmony lane payloads (future). */
export interface HarmonyHandoffContract {
  readonly channel: 'harmony';
}

/** Placeholder for rhythm lane payloads (future). */
export interface RhythmHandoffContract {
  readonly channel: 'rhythm';
}

/** Placeholder for counterpoint lane payloads (future). */
export interface CounterpointHandoffContract {
  readonly channel: 'counterpoint';
}

/** Placeholder for orchestration lane payloads (future). */
export interface OrchestrationHandoffContract {
  readonly channel: 'orchestration';
}

/** Placeholder for songwriting lane payloads (future). */
export interface SongwritingHandoffContract {
  readonly channel: 'songwriting';
}

/** Placeholder for bridge/export lane payloads (future). */
export interface BridgeExportHandoffContract {
  readonly channel: 'bridge/export';
}

export type HandoffContractUnion =
  | MelodyHandoffContract
  | HarmonyHandoffContract
  | RhythmHandoffContract
  | CounterpointHandoffContract
  | OrchestrationHandoffContract
  | SongwritingHandoffContract
  | BridgeExportHandoffContract;
