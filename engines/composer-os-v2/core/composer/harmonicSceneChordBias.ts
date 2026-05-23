/**
 * Phase 3b — tension-weighted chord-symbol nudges (conservative; LOCK harmony stays authoritative).
 */

import type { CompositionContext } from '../compositionContext';
import { activeSceneForBar, tensionLevelForBar } from './harmonicScene';
import { resolveZappaStyleMode } from '../song-mode/frankZappaSlice';

export function applyHarmonicSceneChordBias(barIndex: number, symbol: string, context: CompositionContext): string {
  const vb = context.voiceBundle;
  const scenes = context.harmonicScenes;
  if (!vb || !scenes?.length) return symbol;
  const sched = context.generationMetadata.scheduledTensionByBar;
  const t = tensionLevelForBar(barIndex, vb, scenes, sched);
  let s = symbol.trim();

  if (
    context.generationMetadata.songwriterStyleId === 'frank_zappa' &&
    resolveZappaStyleMode(context) === 'compositional'
  ) {
    const scene = activeSceneForBar(barIndex, scenes);
    const color = scene?.dominantVoicingColor;
    if (color === 'tritone-sus' && /maj7$/i.test(s) && !/b5|#11|alt/i.test(s)) {
      s = s.replace(/maj7/i, 'maj7#11');
    } else if (color === 'altered' && /^(C|D|E|F|G|A|B)[#b]?m7$/i.test(s)) {
      s = s.replace(/m7$/i, 'm7b5');
    } else if (color === 'modal' && /maj$/i.test(s) && !/maj7/i.test(s)) {
      s = s.replace(/maj$/i, 'maj7');
    }
  }

  if (vb.voiceId === 'pat_metheny' && vb.voicingPolicy.lydianMaj7Sharp11Default && /maj7$/i.test(s) && t > 0.45 && !/#11/i.test(s)) {
    return s.replace(/maj7/i, 'maj7#11');
  }
  return s;
}
