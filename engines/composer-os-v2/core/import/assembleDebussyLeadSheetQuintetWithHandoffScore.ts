/**
 * Phase 3 - debussy quintet + melody hand-off (parallel path extension of Phase 2).
 */

import { assembleDebussyLeadSheetQuintetScore } from './assembleDebussyLeadSheetQuintetScore';
import {
  applyDebussyLeadSheetMelodyHandoff,
  type DebussyLeadSheetMelodyHandoffResult,
} from './applyDebussyLeadSheetMelodyHandoff';
import {
  DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN,
  type DebussyLeadSheetMelodyHandoffSegment,
} from './debussyLeadSheetMelodyHandoffPlan';
import type { MosaicImportTimeline } from './mosaicImportTimeline';

export function assembleDebussyLeadSheetQuintetWithHandoffScore(
  seed = 90104,
  plan: readonly DebussyLeadSheetMelodyHandoffSegment[] = DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN,
  importTimeline?: MosaicImportTimeline,
  composerId = 'debussy'
): DebussyLeadSheetMelodyHandoffResult {
  const base = assembleDebussyLeadSheetQuintetScore(seed, importTimeline, composerId);
  return applyDebussyLeadSheetMelodyHandoff(base, plan, seed);
}
