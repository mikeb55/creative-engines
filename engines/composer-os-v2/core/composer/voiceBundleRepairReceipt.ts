/**
 * Post-generation receipt for VoiceRuleBundle.repairPolicy (Phase 2+3a).
 * Full parallel-resolution pass is Phase 3b — this only stamps metadata for manifests / QA.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';

export function applyVoiceBundleRepairReceipt(score: ScoreModel, context: CompositionContext): void {
  void score;
  const vb = context.voiceBundle;
  if (!vb?.repairPolicy.resolveParallels) return;
  context.generationMetadata = {
    ...context.generationMetadata,
    voiceBundleRepairResolveParallelsRequested: true,
    voiceBundleRepairMaxVoiceOverlap: vb.repairPolicy.maxVoiceOverlap,
  };
}
