/**
 * Wyble inner-line depth: keep inner voices closer across bars via octave-nearest motion.
 */

import { nearestOctavePreferContrary, nearestOctaveToPrevious } from '../core/wyble/wybleInnerLineMotion';
import { applyBigBandWybleLeadInnerSaxMidis } from '../core/big-band/bigBandWybleHornVoicing';
import { applyQuartetWybleChordToneStack } from '../core/string-quartet/quartetWybleChordToneStack';
import { WYBLE_ROLE_MAP_BIG_BAND, WYBLE_ROLE_MAP_STRING_QUARTET } from '../core/wyble/ensembleWybleRoleMaps';

type TestResult = { name: string; ok: boolean };

export function runWybleInnerLineDepthTests(): TestResult[] {
  const results: TestResult[] = [];
  const pass = (name: string) => results.push({ name, ok: true });
  const fail = (name: string) => results.push({ name, ok: false });

  try {
    const moved = nearestOctaveToPrevious(72, 59);
    if (moved !== 60) fail('nearest octave chooses connective equivalent');
    else pass('nearest octave chooses connective equivalent');
  } catch (e) {
    fail(`nearest octave chooses connective equivalent: ${e}`);
  }

  try {
    const snapped = (m: number) => m;
    const out = applyBigBandWybleLeadInnerSaxMidis(72, 69, WYBLE_ROLE_MAP_BIG_BAND, snapped, 59);
    if (Math.abs(out.tenorMidi - 59) >= Math.abs(69 - 59))
      fail('big band tenor keeps smoother adjacency under Wyble map');
    else pass('big band tenor keeps smoother adjacency under Wyble map');
  } catch (e) {
    fail(`big band tenor keeps smoother adjacency under Wyble map: ${e}`);
  }

  try {
    const stack = applyQuartetWybleChordToneStack([72, 67, 64, 48], WYBLE_ROLE_MAP_STRING_QUARTET, {
      violin2: 79,
      viola: 55,
    });
    if (Math.abs(stack[1] - 79) > Math.abs(64 - 79)) fail('quartet violin2 inner line picks nearer octave');
    else pass('quartet violin2 inner line picks nearer octave');
  } catch (e) {
    fail(`quartet violin2 inner line picks nearer octave: ${e}`);
  }

  try {
    const c = nearestOctavePreferContrary({
      targetMidi: 64,
      previousMidi: 67,
      outerDelta: 3,
    });
    if (c >= 67) fail('contrary preference nudges inner direction against outer motion when feasible');
    else pass('contrary preference nudges inner direction against outer motion when feasible');
  } catch (e) {
    fail(`contrary preference nudges inner direction against outer motion when feasible: ${e}`);
  }

  return results;
}
