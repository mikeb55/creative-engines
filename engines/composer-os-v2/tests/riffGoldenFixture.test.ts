/**
 * Riff golden fixtures — seed 42 / 8 bars / medium density vs checked-in JSON truth.
 */

import {
  RIFF_GENERATOR_VRB_IDS,
  type RiffGeneratorVrbId,
} from '../core/riff-generator/riffVrbRegistry';
import {
  buildRiffGoldenFixture,
  fingerprintMaxDelta,
  formatGoldenDiff,
  loadRiffGoldenFixture,
  RIFF_GOLDEN_BARS,
  RIFF_GOLDEN_SEED,
} from './riffGoldenFixture';

const FP_TOL = 0.05;
const NOTE_COUNT_REL_TOL = 0.1;
const OFFBEAT_TOL = 0.1;
const REGISTER_TOL = 3;

export function runRiffGoldenFixtureTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const golden = loadRiffGoldenFixture(vrbId);
    const built = buildRiffGoldenFixture(vrbId);
    if ('error' in built) {
      out.push({
        ok: false,
        name: `${vrbId}: runRiffGenerator seed ${RIFF_GOLDEN_SEED} failed: ${built.error}`,
      });
      continue;
    }

    const failures: string[] = [];
    if (golden.seed !== RIFF_GOLDEN_SEED || golden.bars !== RIFF_GOLDEN_BARS) {
      failures.push(formatGoldenDiff(vrbId, 'seed/bars', golden, { seed: built.seed, bars: built.bars }));
    }
    const fpDelta = fingerprintMaxDelta(golden.rhythmFingerprint, built.rhythmFingerprint);
    if (fpDelta > FP_TOL) {
      failures.push(
        formatGoldenDiff(vrbId, 'rhythmFingerprint', golden.rhythmFingerprint, built.rhythmFingerprint) +
          ` (maxDelta=${fpDelta.toFixed(4)} > ${FP_TOL})`
      );
    }
    const noteLo = golden.noteCount * (1 - NOTE_COUNT_REL_TOL);
    const noteHi = golden.noteCount * (1 + NOTE_COUNT_REL_TOL);
    if (built.noteCount < noteLo || built.noteCount > noteHi) {
      failures.push(
        formatGoldenDiff(vrbId, 'noteCount', golden.noteCount, built.noteCount) +
          ` (±${NOTE_COUNT_REL_TOL * 100}%)`
      );
    }
    if (Math.abs(built.offbeatRatio - golden.offbeatRatio) > OFFBEAT_TOL) {
      failures.push(formatGoldenDiff(vrbId, 'offbeatRatio', golden.offbeatRatio, built.offbeatRatio));
    }
    if (Math.abs(built.registerMean - golden.registerMean) > REGISTER_TOL) {
      failures.push(formatGoldenDiff(vrbId, 'registerMean', golden.registerMean, built.registerMean));
    }
    if (Math.abs(built.bassRegisterMean - golden.bassRegisterMean) > REGISTER_TOL) {
      failures.push(
        formatGoldenDiff(vrbId, 'bassRegisterMean', golden.bassRegisterMean, built.bassRegisterMean)
      );
    }

    out.push({
      ok: failures.length === 0,
      name:
        failures.length === 0
          ? `${vrbId}: golden fixture matches seed ${RIFF_GOLDEN_SEED} (${RIFF_GOLDEN_BARS} bars)`
          : `${vrbId}: golden fixture diverged — ${failures.join(' | ')}`,
    });
  }

  return out;
}
