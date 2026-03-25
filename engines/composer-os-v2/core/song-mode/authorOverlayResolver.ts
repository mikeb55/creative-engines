/**
 * Author / meta-rule overlays — shape engine behaviour without replacing songwriter style.
 */

import type { AuthorRuleId } from './songwritingResearchTypes';

export interface AuthorOverlayBehaviour {
  authorId: AuthorRuleId;
  melodyHarmonicCraftEmphasis: number;
  prosodyStructureEmphasis: number;
  technicalMelodyHarmonyRhythmEmphasis: number;
}

const BASE: Record<AuthorRuleId, AuthorOverlayBehaviour> = {
  jimmy_webb: {
    authorId: 'jimmy_webb',
    melodyHarmonicCraftEmphasis: 0.85,
    prosodyStructureEmphasis: 0.45,
    technicalMelodyHarmonyRhythmEmphasis: 0.55,
  },
  pat_pattison: {
    authorId: 'pat_pattison',
    melodyHarmonicCraftEmphasis: 0.45,
    prosodyStructureEmphasis: 0.92,
    technicalMelodyHarmonyRhythmEmphasis: 0.5,
  },
  jack_perricone: {
    authorId: 'jack_perricone',
    melodyHarmonicCraftEmphasis: 0.55,
    prosodyStructureEmphasis: 0.5,
    technicalMelodyHarmonyRhythmEmphasis: 0.9,
  },
};

export function resolveAuthorOverlay(id: AuthorRuleId | undefined | null): AuthorOverlayBehaviour | null {
  if (id == null) return null;
  return BASE[id] ?? null;
}
