/**
 * Composer OS V2 — Upright bass behaviour
 */

import type { BassBehaviourPlan } from './behaviourTypes';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { DensityLevel } from '../density/densityCurveTypes';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';

export function planBassBehaviour(
  sections: SectionWithRole[],
  densityPlan: { segments: Array<{ startBar: number; length: number; level: DensityLevel }>; totalBars: number },
  registerMap: InstrumentRegisterMap
): BassBehaviourPlan {
  const perBar: BassBehaviourPlan['perBar'] = [];
  const regBySection = new Map(registerMap.sections.map((s) => [s.sectionLabel, s]));
  const sectionForBar = (bar: number) => sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);

  for (let bar = 1; bar <= densityPlan.totalBars; bar++) {
    const section = sectionForBar(bar);
    const density = getDensityForBar(densityPlan, bar);
    const regSection = section ? regBySection.get(section.label) : registerMap.sections[0];
    const [low, high] = regSection?.preferredZone ?? [36, 55];

    const activity = density === 'sparse' ? 'sparse' : density === 'medium' ? 'walking' : 'walking';
    const eventCount = density === 'sparse' ? 2 : 4;
    const harmonicAnchor = true;

    perBar.push({ bar, activity, eventCount, harmonicAnchor, registerTarget: [low, high] });
  }

  return { instrumentIdentity: 'acoustic_upright_bass', perBar };
}
