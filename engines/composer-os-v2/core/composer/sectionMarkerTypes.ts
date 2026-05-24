/**
 * Per-section VRB markers — bar-range overrides merged onto the base VoiceRuleBundle.
 */

import type { RiffProfilePatch } from './riffProfileTypes';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { SlonimskyContext } from '../slonimsky/slonimskyEngine';

/** Partial voice-bundle + riff posture overrides applied per section marker. */
export type VrbParams = {
  harmonicRhythm?: Partial<VoiceRuleBundle['harmonicRhythm']>;
  bassPolicy?: Partial<VoiceRuleBundle['bassPolicy']>;
  voicingPolicy?: Partial<VoiceRuleBundle['voicingPolicy']>;
  melodicPolicy?: Partial<VoiceRuleBundle['melodicPolicy']>;
  rhythmPolicy?: Partial<VoiceRuleBundle['rhythmPolicy']>;
  orchestrationPolicy?: Partial<VoiceRuleBundle['orchestrationPolicy']>;
  formPolicy?: Partial<VoiceRuleBundle['formPolicy']>;
  repairPolicy?: Partial<VoiceRuleBundle['repairPolicy']>;
  riffProfile?: RiffProfilePatch;
  /** Per-section Slonimsky lane (GBD / Song Mode guitar phrase authority). */
  slonimsky?: {
    /** Receipt ids elevated for this section (e.g. SY_SLON_01). */
    elevateReceiptIds?: readonly string[];
    catalogueSection?: string;
    allowedOutsideLevel?: 0 | 1 | 2;
    phraseIntent?: SlonimskyContext['phraseIntent'];
  };
};

export interface SectionMarker {
  id: string;
  label: string;
  startBar: number;
  endBar: number;
  vrbOverrides: Partial<VrbParams>;
}

export function sectionMarkerCoversBar(marker: SectionMarker, bar: number): boolean {
  return bar >= marker.startBar && bar <= marker.endBar;
}
