/**
 * Motif / ThemeGenome overlays from VoiceRuleBundle (melodic leap caps).
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { MotifCell2 } from '../motif/themeGenome';

export function applyVoiceBundleMelodicPolicy(cell: MotifCell2, bundle: VoiceRuleBundle): MotifCell2 {
  const maxLeap = bundle.melodicPolicy.maxLeapSemitones;
  const intervals = cell.intervals.map((iv) => {
    const mag = Math.abs(iv);
    if (mag <= maxLeap) return iv;
    return iv >= 0 ? maxLeap : -maxLeap;
  });
  return { ...cell, intervals };
}
