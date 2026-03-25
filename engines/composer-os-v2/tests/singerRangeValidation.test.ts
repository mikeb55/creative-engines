/**
 * Singer range validation (Prompt B/3).
 */

import { getSingerRangeProfile } from '../core/song-mode/singerRangeProfiles';
import { validateMelodyAgainstSingerRange } from '../core/song-mode/singerRangeValidation';
import type { LeadMelodyPlan } from '../core/song-mode/leadMelodyTypes';

function minimalPlan(notes: { measure: number; beat: number; duration: number; midi: number }[]): LeadMelodyPlan {
  return {
    phrases: [
      {
        phraseId: 'p0',
        sectionOrder: 0,
        sectionKind: 'verse',
        startMeasure: 1,
        endMeasure: Math.max(1, notes.length),
        cadenceMeasure: 1,
        contour: 'arch',
        repetitionTag: 'statement',
        phraseLengthBars: 1,
      },
    ],
    notes,
    contourArc: 'balanced',
    cadenceMeasures: [1],
  };
}

export function runSingerRangeValidationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const profile = getSingerRangeProfile('male_tenor');
  const okPlan = minimalPlan([{ measure: 1, beat: 0, duration: 4, midi: 60 }]);
  const rOk = validateMelodyAgainstSingerRange(okPlan, profile);
  out.push({
    ok: rOk.ok && rOk.peakMidi === 60 && rOk.lowMidi === 60,
    name: 'tenor-comfort pitch validates',
  });

  const [, hi] = profile.absoluteRangeMidi;
  const tooHigh = minimalPlan([{ measure: 1, beat: 0, duration: 4, midi: hi + 5 }]);
  const rBad = validateMelodyAgainstSingerRange(tooHigh, profile);
  out.push({
    ok: !rBad.ok && rBad.errors.some((e) => e.includes('outside absolute')),
    name: 'negative: unsingable range (above absolute) fails',
  });

  const emptyPlan: LeadMelodyPlan = {
    phrases: [],
    notes: [],
    contourArc: 'balanced',
    cadenceMeasures: [],
  };
  const empty = validateMelodyAgainstSingerRange(emptyPlan, profile);
  out.push({
    ok: !empty.ok && empty.errors.some((e) => e.includes('no melody notes')),
    name: 'negative: empty notes list fails singer range check',
  });

  return out;
}
