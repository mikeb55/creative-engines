/**
 * Composer OS V2 — Register map planner
 */

import type { InstrumentRegisterMap, SectionRegisterPlan } from './registerMapTypes';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';

export function planGuitarRegisterMap(sections: SectionWithRole[]): InstrumentRegisterMap {
  const [melLow, melHigh] = CLEAN_ELECTRIC_GUITAR.preferredMelodicZone;
  const [dangerLow] = CLEAN_ELECTRIC_GUITAR.highDangerZone;
  const plans: SectionRegisterPlan[] = sections.map((s) => {
    const lift = s.role === 'contrast';
    return {
      sectionLabel: s.label,
      preferredZone: lift ? [melLow + 3, melHigh] : [melLow, melHigh - 3],
      dangerZone: [dangerLow, melHigh + 12],
      ceilingTendency: lift ? melHigh - 2 : melHigh - 4,
      floorTendency: melLow,
      contour: 'stable',
    };
  });
  return { instrumentIdentity: 'clean_electric_guitar', sections: plans };
}

export function planBassRegisterMap(sections: SectionWithRole[]): InstrumentRegisterMap {
  const [walkLow, walkHigh] = ACOUSTIC_UPRIGHT_BASS.preferredWalkingZone;
  const [upperDanger] = ACOUSTIC_UPRIGHT_BASS.upperDangerZone;
  const plans: SectionRegisterPlan[] = sections.map((s) => ({
    sectionLabel: s.label,
    preferredZone: [walkLow, walkHigh],
    dangerZone: [upperDanger, upperDanger + 12],
    ceilingTendency: walkHigh - 2,
    floorTendency: walkLow,
    contour: 'stable',
  }));
  return { instrumentIdentity: 'acoustic_upright_bass', sections: plans };
}
