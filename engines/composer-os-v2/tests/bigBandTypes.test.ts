/**
 * Big Band core types (Prompt 5/7).
 */

import { BIG_BAND_FORM_PHASES } from '../core/big-band/bigBandFormPlanner';
import type { BigBandInstrumentSection } from '../core/big-band/bigBandSectionTypes';

export function runBigBandTypesTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const sections: BigBandInstrumentSection[] = ['saxes', 'trumpets', 'trombones', 'rhythm_section'];
  out.push({
    ok: sections.length === 4,
    name: 'big band instrument sections are four groups',
  });

  out.push({
    ok: BIG_BAND_FORM_PHASES.includes('shout_chorus') && BIG_BAND_FORM_PHASES.includes('ending'),
    name: 'form phase vocabulary includes shout_chorus and ending',
  });

  return out;
}
