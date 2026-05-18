/**
 * Builds a section-aware modulation **plan** (guide layer). V4.0 Prompt 1/8.
 */

import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { ModulationPlan, ModulationSectionPlan } from './modulationPlanTypes';
import type { ModulationType } from './modulationTypes';

const BASE_KEY_DEFAULT = 'D minor';

const LONG_FORM_SECTION_IDS = ['A', "A'", 'B', "A''"] as const;

/**
 * 8-bar / 16-bar: no required modulation (compatibility stub).
 * 32–64-bar: four equal sections; A = home; A' = modal colour; B = contrast; A'' = return home.
 */
export function generateModulationPlan(seed: number, totalBars: number): ModulationPlan {
  if (totalBars <= 8) {
    return {
      active: false,
      baseKey: BASE_KEY_DEFAULT,
      sections: [],
    };
  }

  if (totalBars < 32 || totalBars > 64 || totalBars % 8 !== 0) {
    return {
      active: false,
      baseKey: BASE_KEY_DEFAULT,
      sections: [],
    };
  }

  const sectionLen = totalBars / 4;
  const u = seededUnit(seed, 0, 9901);
  const bContrast: ModulationType = u < 0.35 ? 'chromatic' : u < 0.7 ? 'modal' : 'pivot';
  const aPrimeOffset = 1 + Math.floor(seededUnit(seed, 1, 9902) * 2);
  const bOffset = 5 + Math.floor(seededUnit(seed, 2, 9903) * 3);

  const sections: ModulationSectionPlan[] = LONG_FORM_SECTION_IDS.map((sectionId, i) => {
    const startBar = 1 + i * sectionLen;
    const endBar = startBar + sectionLen - 1;
    if (sectionId === 'A') {
      return {
        sectionId,
        startBar,
        endBar,
        targetKey: BASE_KEY_DEFAULT,
        semitoneOffset: 0,
        modulationType: 'none' as const,
        transitionIntent: 'hold' as const,
        returnIntent: 'none' as const,
      };
    }
    if (sectionId === "A'") {
      return {
        sectionId,
        startBar,
        endBar,
        targetKey: `A' (+${aPrimeOffset} semitone colour)`,
        semitoneOffset: aPrimeOffset,
        modulationType: 'modal' as const,
        transitionIntent: 'modal_mixture' as const,
        returnIntent: 'none' as const,
      };
    }
    if (sectionId === 'B') {
      return {
        sectionId,
        startBar,
        endBar,
        targetKey: `B (contrast +${bOffset})`,
        semitoneOffset: bOffset,
        modulationType: bContrast,
        transitionIntent: bContrast === 'chromatic' ? 'chromatic_approach' : 'pivot_common_tone',
        returnIntent: 'none' as const,
      };
    }
    return {
      sectionId,
      startBar,
      endBar,
      targetKey: BASE_KEY_DEFAULT,
      semitoneOffset: 0,
      modulationType: 'none' as const,
      transitionIntent: 'dominant_prep' as const,
      returnIntent: 'authentic' as const,
    };
  });

  return {
    active: true,
    baseKey: BASE_KEY_DEFAULT,
    sections,
  };
}
