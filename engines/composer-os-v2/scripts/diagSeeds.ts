import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  validateDuoIdentityMomentGate,
  computeDuoIdentityMomentScore,
  validateDuoPolishV33Gate,
  computeDuoGceScore,
} from '../core/score-integrity/duoLockQuality';
import { evaluateDuoLongFormQuality } from '../core/quality/duoLongFormQuality';
import { roleContrastScore } from '../core/score-integrity/duoLockQuality';

const STRESS = [...Array(24).keys()];

{
  const r = runGoldenPath(14);
  console.log('seed14 roleContrast', roleContrastScore(r.score), 'success', r.success);
}

for (const seed of STRESS) {
  const r = runGoldenPath(seed);
  if (!r.success || !r.strictBarMathPassed || !r.exportRoundTripPassed || !r.instrumentMetadataPassed) {
    console.log('gates', seed, r.success, r.errors);
  }
  const id = validateDuoIdentityMomentGate(r.score);
  if (!id.valid) console.log('V3.2', seed, id.errors, 'score', computeDuoIdentityMomentScore(r.score));
  const po = validateDuoPolishV33Gate(r.score);
  if (!po.valid) console.log('V3.3 polish', seed, po.errors);
  const gce = computeDuoGceScore(r.score);
  if (gce < 9) console.log('GCE', seed, gce);
}

const r101 = runGoldenPath(101, { totalBars: 32 });
const q = evaluateDuoLongFormQuality(r101.score, r101.context);
console.log('longform 101', r101.success, r101.errors, 'q.total', q.total);
