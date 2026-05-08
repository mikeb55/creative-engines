/**
 * Phase 3b — tension-weighted chord-symbol nudges (conservative; LOCK harmony stays authoritative).
 */

import type { CompositionContext } from '../compositionContext';
import { tensionLevelForBar } from './harmonicScene';

export function applyHarmonicSceneChordBias(barIndex: number, symbol: string, context: CompositionContext): string {
  const vb = context.voiceBundle;
  const scenes = context.harmonicScenes;
  if (!vb || !scenes?.length) return symbol;
  const sched = context.generationMetadata.scheduledTensionByBar;
  const t = tensionLevelForBar(barIndex, vb, scenes, sched);
  const s = symbol.trim();
  if (vb.voiceId === 'pat_metheny' && vb.voicingPolicy.lydianMaj7Sharp11Default && /maj7$/i.test(s) && t > 0.45 && !/#11/i.test(s)) {
    return s.replace(/maj7/i, 'maj7#11');
  }
  return s;
}
