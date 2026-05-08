/**
 * Phase 6+7 — string quartet instrument definitions + range / doubling policy (concert pitch).
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';

export type StringInstrumentId = 'violin_I' | 'violin_II' | 'viola' | 'cello';

export interface StringInstrument {
  id: StringInstrumentId;
  midiChannel: number;
  rangeMin: number;
  rangeMax: number;
  clef: 'treble' | 'alto' | 'bass';
  defaultBowing: 'arco' | 'pizzicato';
  transposition: 0;
}

export const STRING_INSTRUMENTS: Record<StringInstrumentId, StringInstrument> = {
  violin_I: {
    id: 'violin_I',
    midiChannel: 1,
    rangeMin: 55,
    rangeMax: 103,
    clef: 'treble',
    defaultBowing: 'arco',
    transposition: 0,
  },
  violin_II: {
    id: 'violin_II',
    midiChannel: 2,
    rangeMin: 55,
    rangeMax: 98,
    clef: 'treble',
    defaultBowing: 'arco',
    transposition: 0,
  },
  viola: {
    id: 'viola',
    midiChannel: 3,
    rangeMin: 48,
    rangeMax: 91,
    clef: 'alto',
    defaultBowing: 'arco',
    transposition: 0,
  },
  cello: {
    id: 'cello',
    midiChannel: 4,
    rangeMin: 36,
    rangeMax: 76,
    clef: 'bass',
    defaultBowing: 'arco',
    transposition: 0,
  },
};

export function pitchInStringInstrumentRange(inst: StringInstrument, midi: number): boolean {
  return midi >= inst.rangeMin && midi <= inst.rangeMax;
}

/** MusicXML C clef on line 3 = alto (viola). */
export function violaClefAttributesSnippet(): string {
  return '<clef><sign>C</sign><line>3</line></clef>';
}

export type SectionRoleHint = 'intro' | 'outro' | 'shout-chorus' | string;

export function defaultBowingForSectionRole(role: SectionRoleHint, antiMetric: boolean): 'arco' | 'pizzicato' {
  if (role === 'intro' || role === 'outro') return 'pizzicato';
  if (antiMetric) return 'arco';
  return 'arco';
}

export function useColLegnoNotehead(antiMetric: boolean): boolean {
  return antiMetric;
}

/**
 * Schneider: penalise octave doubling outside shout-chorus; Mingus: cello doubles bass (informational score).
 */
export function schneiderOctaveDoublingPenalty(
  bundle: VoiceRuleBundle | undefined,
  sectionRole: SectionRoleHint,
  hasOctaveDouble: boolean
): number {
  if (bundle?.voiceId !== 'maria_schneider') return 0;
  if (!hasOctaveDouble) return 0;
  if (sectionRole === 'shout-chorus') return 0;
  return 55;
}

export function validateViolinFirstPitchOrReject(midi: number): { ok: true } | { ok: false; reason: string } {
  const v = STRING_INSTRUMENTS.violin_I;
  if (!pitchInStringInstrumentRange(v, midi)) {
    return { ok: false, reason: `violin_I out of range ${v.rangeMin}-${v.rangeMax}` };
  }
  return { ok: true };
}
