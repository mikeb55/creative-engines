/**
 * Continue / develop — planning metadata (no unrelated generation).
 */

import type { BaseAppPresetId } from '../presets-plus/namedPresetTypes';

export type ContinuationIntent = 'continue_piece' | 'next_section' | 'extend_form' | 'developed_variation';

export interface ContinuationRequest {
  presetId: BaseAppPresetId;
  seed: number;
  title?: string;
  intent: ContinuationIntent;
  /** Last known section label or bar window (opaque). */
  fromSectionLabel?: string;
  fromBar?: number;
  continuationSourceRef?: string;
}

export interface ContinuationPlan {
  ok: boolean;
  presetId: BaseAppPresetId;
  seed: number;
  suggestedAction: string;
  /** Guardrails for callers — stay in same mode context. */
  mustPreserveMode: true;
  errors?: string[];
}
