/**
 * Phase 3 - debussy quintet + melody hand-off (parallel path extension of Phase 2).
 */

import { assembleDebussyLeadSheetQuintetScore } from './assembleDebussyLeadSheetQuintetScore';
import {
  applyDebussyLeadSheetMelodyHandoff,
  type DebussyLeadSheetMelodyHandoffResult,
} from './applyDebussyLeadSheetMelodyHandoff';
import {
  buildLeadSheetMelodyHandoffPlan,
  type DebussyLeadSheetMelodyHandoffSegment,
} from './debussyLeadSheetMelodyHandoffPlan';
import type { MosaicImportTimeline } from './mosaicImportTimeline';
import {
  applyLeadSheetPhase7StringRealization,
  type LeadSheetPhase7Diagnostics,
} from './leadSheetStringRealizationPass';

export type DebussyLeadSheetQuintetWithHandoffResult = DebussyLeadSheetMelodyHandoffResult & {
  phase7?: LeadSheetPhase7Diagnostics;
};

export function assembleDebussyLeadSheetQuintetWithHandoffScore(
  seed = 90104,
  plan?: readonly DebussyLeadSheetMelodyHandoffSegment[],
  importTimeline?: MosaicImportTimeline,
  composerId = 'debussy',
): DebussyLeadSheetQuintetWithHandoffResult {
  const base = assembleDebussyLeadSheetQuintetScore(seed, importTimeline, composerId);
  const effectivePlan =
    plan ?? buildLeadSheetMelodyHandoffPlan(base.spine.appliedHarmonyBars.length);
  const handoff = applyDebussyLeadSheetMelodyHandoff(base, effectivePlan, seed);
  const phase7 = applyLeadSheetPhase7StringRealization({
    score: handoff.score,
    melody: handoff.spine.importTimeline.melodyLine,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    seed,
  });
  return {
    ...handoff,
    score: phase7.score,
    phase7: phase7.diagnostics,
  };
}
