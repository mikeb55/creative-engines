/**
 * Composer OS V2 — Song hook metadata (structural; not full melody generation).
 */

import type { HookTypeKind } from './hookPlanner';

export interface SongHook {
  id: string;
  /** Contour intent for future melody lane (e.g. ascending, arch). */
  contourHint: string;
  /** Rhythmic character hint for future rhythm lane. */
  rhythmHint: string;
  /** 0–1 — higher = more repetition / return in hook sections. */
  repetitionPriority: number;
  /** Planning: dominant hook family for this run. */
  primaryHookType?: HookTypeKind;
  /** Planning: ordered hook-type priority list. */
  hookTypePriorityOrder?: readonly HookTypeKind[];
}
