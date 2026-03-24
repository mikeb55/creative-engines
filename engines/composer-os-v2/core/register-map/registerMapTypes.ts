/**
 * Composer OS V2 — Register map types (section-aware)
 */

import type { MidiPitch } from '../primitives/primitiveTypes';

export type RegisterZone = [MidiPitch, MidiPitch];

export type ContourDirection = 'stable' | 'rise' | 'fall' | 'arching';

export interface SectionRegisterPlan {
  sectionLabel: string;
  preferredZone: RegisterZone;
  dangerZone: RegisterZone;
  ceilingTendency: MidiPitch;
  floorTendency: MidiPitch;
  contour: ContourDirection;
}

export interface InstrumentRegisterMap {
  instrumentIdentity: string;
  sections: SectionRegisterPlan[];
}
