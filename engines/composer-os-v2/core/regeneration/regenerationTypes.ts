/**
 * Section-level regeneration targets (metadata).
 */

export type SectionRegenerationTarget =
  | 'chorus'
  | 'b_section'
  | 'shout_chorus'
  | 'bridge'
  | 'coda'
  | string;

export interface RegenerationLocks {
  melody?: boolean;
  harmony?: boolean;
  motif?: boolean;
  form?: boolean;
  rhythm?: boolean;
}

export interface SectionRegenerationRequest {
  target: SectionRegenerationTarget;
  sectionId?: string;
  locks?: RegenerationLocks;
}

export interface SectionRegenerationResult {
  ok: boolean;
  canRegenerate: boolean;
  reason: string;
}
