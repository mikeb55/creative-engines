/**
 * Builds a section-aware modulation **plan** (guide layer). V4.0 Prompt 1/8.
 */

import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { ModulationPlan, ModulationSectionPlan } from './modulationPlanTypes';
import type { ModulationType } from './modulationTypes';
import { LONG_FORM_DUO_BARS } from '../form/longFormRouteResolver';

const BASE_KEY_DEFAULT = 'D minor';

/**
 * 8-bar mode: no required modulation (compatibility stub).
 * 32-bar mode: A = home; A' = modal colour (+1 st); B = strongest contrast (+6 st); A'' = return home.
 */
export function generateModulationPlan(seed: number, totalBars: number): ModulationPlan {
  if (totalBars <= 8) {
    return {
      active: false,
      baseKey: BASE_KEY_DEFAULT,
      sections: [],
    };
  }

  if (totalBars !== LONG_FORM_DUO_BARS) {
    return {
      active: false,
      baseKey: BASE_KEY_DEFAULT,
      sections: [],
    };
  }

  const u = seededUnit(seed, 0, 9901);
  const bContrast: ModulationType = u < 0.35 ? 'chromatic' : u < 0.7 ? 'modal' : 'pivot';
  const aPrimeOffset = 1 + Math.floor(seededUnit(seed, 1, 9902) * 2);
  const bOffset = 5 + Math.floor(seededUnit(seed, 2, 9903) * 3);

  const sections: ModulationSectionPlan[] = [
    {
      sectionId: 'A',
      startBar: 1,
      endBar: 8,
      targetKey: BASE_KEY_DEFAULT,
      semitoneOffset: 0,
      modulationType: 'none',
      transitionIntent: 'hold',
      returnIntent: 'none',
    },
    {
      sectionId: "A'",
      startBar: 9,
      endBar: 16,
      targetKey: '',
      semitoneOffset: aPrimeOffset,
      modulationType: 'modal',
      transitionIntent: 'modal_mixture',
      returnIntent: 'none',
    },
    {
      sectionId: 'B',
      startBar: 17,
      endBar: 24,
      targetKey: '',
      semitoneOffset: bOffset,
      modulationType: bContrast,
      transitionIntent: bContrast === 'chromatic' ? 'chromatic_approach' : 'pivot_common_tone',
      returnIntent: 'none',
    },
    {
      sectionId: "A''",
      startBar: 25,
      endBar: 32,
      targetKey: BASE_KEY_DEFAULT,
      semitoneOffset: 0,
      modulationType: 'none',
      transitionIntent: 'dominant_prep',
      returnIntent: 'authentic',
    },
  ];

  sections[1].targetKey = `A' (+${aPrimeOffset} semitone colour)`;
  sections[2].targetKey = `B (contrast +${bOffset})`;

  return {
    active: true,
    baseKey: BASE_KEY_DEFAULT,
    sections,
  };
}
