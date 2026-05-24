/**
 * S4 — Allan Holdsworth + Scott Henderson GBD distinctness (same seed / chords).
 * Not registered in runSmokeTests until V63 S6.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

type HoldsworthHendersonGbdDistinctGolden = {
  id: string;
  seed: number;
  totalBars: number;
  presetId: string;
  baselineHarmonicVoice: string;
  targetHarmonicVoice: string;
  minGuitarPitchesDifferent: number;
  minRegisterMeanDelta: number;
  fingerprintReceiptIncludes: string;
  minChromaticBudget?: number;
  maxBaselineChromaticBudget?: number;
  minMaxLeapSemitones?: number;
  maxBaselineMaxLeapSemitones?: number;
  minBarIdentityPersistence?: number;
  maxBaselineBarIdentityPersistence?: number;
  minSubdivisionGrid?: number;
  maxBaselineSubdivisionGrid?: number;
};

const ALLAN_FIXTURE = path.join(__dirname, 'slonimskyUiGoldens', 'allanHoldsworthGbdDistinct.json');
const SCOTT_FIXTURE = path.join(__dirname, 'slonimskyUiGoldens', 'scottHendersonGbdDistinct.json');

function loadFixture(filePath: string): HoldsworthHendersonGbdDistinctGolden {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as HoldsworthHendersonGbdDistinctGolden;
}

function guitarMidiPitches(score: ScoreModel | undefined): number[] {
  const part = score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!part) return [];
  const out: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      out.push((e as { pitch: number }).pitch);
    }
  }
  return out;
}

function registerMean(pitches: number[]): number {
  if (!pitches.length) return 0;
  return pitches.reduce((a, p) => a + p, 0) / pitches.length;
}

function countPitchesDifferent(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let n = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) n++;
  }
  return n;
}

function runDistinctGolden(fx: HoldsworthHendersonGbdDistinctGolden): { name: string; ok: boolean } {
  const baseOpts = {
    presetId: fx.presetId as 'guitar_bass_duo',
    totalBars: fx.totalBars,
    longFormEnabled: true,
  };

  const baseline = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.baselineHarmonicVoice,
  });
  const target = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.targetHarmonicVoice,
  });

  const basePitches = guitarMidiPitches(baseline.score);
  const targetPitches = guitarMidiPitches(target.score);
  const pitchDiff = countPitchesDifferent(targetPitches, basePitches);
  const regDelta = Math.abs(registerMean(targetPitches) - registerMean(basePitches));

  const targetBundle = getVoiceRuleBundle(fx.targetHarmonicVoice);
  const baselineBundle = getVoiceRuleBundle(fx.baselineHarmonicVoice);
  const targetRp = targetBundle.riffProfile;
  const baselineRp = baselineBundle.riffProfile;
  const receipts = targetBundle.orchestrationPolicy.fingerprintReceipts ?? [];

  const checks: Record<string, boolean> = {
    voiceBundle: target.context?.voiceBundle?.voiceId === fx.targetHarmonicVoice,
    harmonicVoice: target.context?.generationMetadata?.harmonicVoice === fx.targetHarmonicVoice,
    fingerprintReceipt: receipts.some((r) => r.includes(fx.fingerprintReceiptIncludes)),
    pitchDiff: pitchDiff >= fx.minGuitarPitchesDifferent,
    registerDelta: regDelta >= fx.minRegisterMeanDelta,
    targetHasRiffProfile: Boolean(targetRp),
  };

  if (fx.minChromaticBudget != null) {
    checks.targetChromatic = (targetRp?.chromaticBudget ?? 0) >= fx.minChromaticBudget;
  }
  if (fx.maxBaselineChromaticBudget != null) {
    checks.baselineChromatic = (baselineRp?.chromaticBudget ?? 1) <= fx.maxBaselineChromaticBudget;
  }
  if (fx.minMaxLeapSemitones != null) {
    checks.targetLeap = (targetBundle.melodicPolicy.maxLeapSemitones ?? 0) >= fx.minMaxLeapSemitones;
  }
  if (fx.maxBaselineMaxLeapSemitones != null) {
    checks.baselineLeap = (baselineBundle.melodicPolicy.maxLeapSemitones ?? 99) <= fx.maxBaselineMaxLeapSemitones;
  }
  if (fx.minBarIdentityPersistence != null) {
    checks.targetLoopPersistence =
      (targetRp?.repetitionPolicy?.barIdentityPersistence ?? 0) >= fx.minBarIdentityPersistence;
  }
  if (fx.maxBaselineBarIdentityPersistence != null) {
    checks.baselineLoopPersistence =
      (baselineRp?.repetitionPolicy?.barIdentityPersistence ?? 1) <= fx.maxBaselineBarIdentityPersistence;
  }
  if (fx.minSubdivisionGrid != null) {
    checks.targetSubdivision = (targetRp?.subdivisionGrid ?? 0) >= fx.minSubdivisionGrid;
  }
  if (fx.maxBaselineSubdivisionGrid != null) {
    checks.baselineSubdivision = (baselineRp?.subdivisionGrid ?? 99) <= fx.maxBaselineSubdivisionGrid;
  }

  const ok = Object.values(checks).every(Boolean);

  if (!ok && process.env.HOLDSWORTH_HENDERSON_GBD_GOLDEN_DEBUG === '1') {
    console.log(JSON.stringify({ fx: fx.id, checks, pitchDiff, regDelta }, null, 2));
  }

  return {
    name: `${fx.targetHarmonicVoice} GBD golden (${fx.id}): distinct from ${fx.baselineHarmonicVoice}`,
    ok,
  };
}

export function runHoldsworthHendersonGbdGoldenTests(): { name: string; ok: boolean }[] {
  return [
    runDistinctGolden(loadFixture(ALLAN_FIXTURE)),
    runDistinctGolden(loadFixture(SCOTT_FIXTURE)),
  ];
}

if (require.main === module) {
  const results = runHoldsworthHendersonGbdGoldenTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
