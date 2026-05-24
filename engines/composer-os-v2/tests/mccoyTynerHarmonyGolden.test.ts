/**
 * S1 — McCoy Tyner harmony distinctness vs generic fallback (pat_metheny baseline).
 * Not registered in runSmokeTests until V63 S6.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

type MccoyTynerHarmonyDistinctGolden = {
  id: string;
  seed: number;
  totalBars: number;
  presetId: string;
  baselineWriter: string;
  targetWriter: string;
  minBarsDifferentFromBaseline: number;
  minQuartalTouches: number;
  minIvQuartalDeviceReceipts: number;
  minPentatonicTouches: number;
  sliceReceiptIncludes: string;
};

const FIXTURE_PATH = path.join(__dirname, 'slonimskyUiGoldens', 'mccoyTynerHarmonyDistinct.json');

function loadFixture(): MccoyTynerHarmonyDistinctGolden {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as MccoyTynerHarmonyDistinctGolden;
}

function countBarsDifferent(a: string[], b: string[]): number {
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if ((a[i] ?? '').trim() !== (b[i] ?? '').trim()) n++;
  }
  return n;
}

export function runMccoyTynerHarmonyGoldenTests(): { name: string; ok: boolean }[] {
  const fx = loadFixture();
  const baseOpts = {
    presetId: fx.presetId as 'guitar_bass_duo',
    totalBars: fx.totalBars,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
  };

  const baseline = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    primarySongwriterStyle: fx.baselineWriter,
  });
  const mccoy = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    primarySongwriterStyle: fx.targetWriter,
  });

  const baseEff = baseline.context?.generationMetadata?.patMethenyEffectiveHarmonyBars;
  const mtEff = mccoy.context?.generationMetadata?.mccoyTynerEffectiveHarmonyBars;
  const diag = mccoy.context?.generationMetadata?.mccoyTynerDiagnostics;
  const receipt = mccoy.context?.generationMetadata?.mccoyTynerSliceReceipt ?? '';
  const devices = mccoy.context?.generationMetadata?.mccoyTynerDeviceReceipts ?? [];
  const ivReceipts = devices.filter((r) => r.includes('mt:iv_quartal')).length;
  const barsDiff =
    Array.isArray(baseEff) && Array.isArray(mtEff)
      ? countBarsDifferent(mtEff, baseEff)
      : 0;

  const checks = {
    songwriterStyleId: mccoy.context?.generationMetadata?.songwriterStyleId === 'mccoy_tyner',
    diagSongwriterId: diag?.songwriterId === 'mccoy_tyner',
    effBars: Array.isArray(mtEff) && mtEff.length === fx.totalBars,
    receipt: receipt.includes(fx.sliceReceiptIncludes),
    quartalTouches: (diag?.quartalTouches ?? 0) >= fx.minQuartalTouches,
    pentatonicTouches: (diag?.pentatonicTouches ?? 0) >= fx.minPentatonicTouches,
    ivQuartalReceipts:
      ivReceipts >= fx.minIvQuartalDeviceReceipts ||
      (diag?.ivQuartalTouches ?? 0) >= fx.minIvQuartalDeviceReceipts,
    barsDifferent: barsDiff >= fx.minBarsDifferentFromBaseline,
    hasBaselineEff: Array.isArray(baseEff),
  };

  const ok = Object.values(checks).every(Boolean);

  if (!ok && process.env.MCCOY_TYNER_GOLDEN_DEBUG === '1') {
    console.log(
      JSON.stringify(
        {
          checks,
          barsDiff,
          ivReceipts,
          quartalTouches: diag?.quartalTouches,
          pentatonicTouches: diag?.pentatonicTouches,
          receipt,
          mtEffSample: mtEff?.slice(0, 4),
          baseEffSample: baseEff?.slice(0, 4),
        },
        null,
        2
      )
    );
  }

  return [
    {
      name: `mccoy_tyner harmony golden (${fx.id}): distinct from ${fx.baselineWriter}`,
      ok,
    },
  ];
}

if (require.main === module) {
  const results = runMccoyTynerHarmonyGoldenTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
