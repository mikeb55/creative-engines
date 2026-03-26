/**
 * Modulation plan — section-aware tonal journey for long-form Duo.
 */

import type { ModulationType, ReturnIntent, TransitionIntent } from './modulationTypes';

export type DuoLongFormSectionId = 'A' | "A'" | 'B' | "A''";

export interface ModulationSectionPlan {
  sectionId: DuoLongFormSectionId;
  startBar: number;
  endBar: number;
  /** Tonal centre label (e.g. D minor, Bb major). */
  targetKey: string;
  /** Semitones relative to `baseKey` root PC for harmonic colour (guide only). */
  semitoneOffset: number;
  modulationType: ModulationType;
  transitionIntent: TransitionIntent;
  returnIntent: ReturnIntent;
}

export interface ModulationPlan {
  active: boolean;
  baseKey: string;
  /** When inactive (8-bar mode), sections may be empty. */
  sections: ModulationSectionPlan[];
}
