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
  applyLeadSheetAccompanimentRhythmAntiLoopPass,
  type LeadSheetAccompanimentRhythmAntiLoopDiagnostics,
} from './leadSheetAccompanimentRhythmAntiLoopPass';
import {
  applyLeadSheetIdentityCellEchoPass,
  type LeadSheetIdentityCellEchoDiagnostics,
} from './leadSheetIdentityCellEchoPass';
import {
  applyLeadSheetQuintetSixteenthGridClampPass,
  type LeadSheetQuintetSixteenthGridClampDiagnostics,
} from './leadSheetQuintetSixteenthGridClampPass';
import {
  applyLeadSheetPhase7StringRealization,
  type LeadSheetPhase7Diagnostics,
} from './leadSheetStringRealizationPass';
import {
  applyLeadSheetBartokContrastArcPass,
  type LeadSheetBartokContrastArcDiagnostics,
} from './leadSheetBartokContrastArcPass';
import {
  applyLeadSheetDebussyContrastArcPass,
  type LeadSheetDebussyContrastArcDiagnostics,
} from './leadSheetDebussyContrastArcPass';
import {
  applyLeadSheetKennyWheelerContrastArcPass,
  type LeadSheetKennyWheelerContrastArcDiagnostics,
} from './leadSheetKennyWheelerContrastArcPass';

export type DebussyLeadSheetQuintetWithHandoffResult = DebussyLeadSheetMelodyHandoffResult & {
  phase7?: LeadSheetPhase7Diagnostics;
  rhythmAntiLoop?: LeadSheetAccompanimentRhythmAntiLoopDiagnostics;
  identityCellEcho?: LeadSheetIdentityCellEchoDiagnostics;
  bartokContrastArc?: LeadSheetBartokContrastArcDiagnostics;
  debussyContrastArc?: LeadSheetDebussyContrastArcDiagnostics;
  kennyWheelerContrastArc?: LeadSheetKennyWheelerContrastArcDiagnostics;
  sixteenthGridClamp?: LeadSheetQuintetSixteenthGridClampDiagnostics;
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
  const rhythmAntiLoop = applyLeadSheetAccompanimentRhythmAntiLoopPass({
    score: phase7.score,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    seed,
    composerId,
  });
  const identityCellEcho = applyLeadSheetIdentityCellEchoPass({
    score: rhythmAntiLoop.score,
    melodyLine: handoff.spine.importTimeline.melodyLine,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    seed,
  });
  let scoreBeforeClamp = identityCellEcho.score;
  let bartokContrastArc: LeadSheetBartokContrastArcDiagnostics | undefined;
  let debussyContrastArc: LeadSheetDebussyContrastArcDiagnostics | undefined;
  let kennyWheelerContrastArc: LeadSheetKennyWheelerContrastArcDiagnostics | undefined;
  if (composerId === 'bartok') {
    const contrastArc = applyLeadSheetBartokContrastArcPass({
      score: identityCellEcho.score,
      appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
      perBarMelodyOwnership: handoff.perBarMelodyOwnership,
      seed,
    });
    scoreBeforeClamp = contrastArc.score;
    bartokContrastArc = contrastArc.diagnostics;
  } else if (composerId === 'debussy') {
    const contrastArc = applyLeadSheetDebussyContrastArcPass({
      score: identityCellEcho.score,
      appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
      perBarMelodyOwnership: handoff.perBarMelodyOwnership,
      seed,
    });
    scoreBeforeClamp = contrastArc.score;
    debussyContrastArc = contrastArc.diagnostics;
  } else if (composerId === 'kenny_wheeler') {
    const contrastArc = applyLeadSheetKennyWheelerContrastArcPass({
      score: identityCellEcho.score,
      appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
      perBarMelodyOwnership: handoff.perBarMelodyOwnership,
      seed,
    });
    scoreBeforeClamp = contrastArc.score;
    kennyWheelerContrastArc = contrastArc.diagnostics;
  }
  const sixteenthGridClamp = applyLeadSheetQuintetSixteenthGridClampPass(scoreBeforeClamp);
  return {
    ...handoff,
    score: sixteenthGridClamp.score,
    phase7: phase7.diagnostics,
    rhythmAntiLoop: rhythmAntiLoop.diagnostics,
    identityCellEcho: identityCellEcho.diagnostics,
    bartokContrastArc,
    debussyContrastArc,
    kennyWheelerContrastArc,
    sixteenthGridClamp: sixteenthGridClamp.diagnostics,
  };
}
