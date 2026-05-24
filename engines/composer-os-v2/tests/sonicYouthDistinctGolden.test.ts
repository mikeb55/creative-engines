/**
 * S5 — Sonic Youth dedicated VRB distinctness vs generic (no harmonicVoice) fallback.
 * Not registered in runSmokeTests until S6.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

type SonicYouthDistinctGolden = {
  id: string;
  seed: number;
  totalBars: number;
  presetId: string;
  primarySongwriterStyle?: string;
  songModeHookFirstIdentity?: boolean;
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
  minMetricDisplacement?: number;
  maxBaselineMetricDisplacement?: number;
  requireTargetAntiMetric?: boolean;
};

const FIXTURE = path.join(__dirname, 'slonimskyUiGoldens', 'sonicYouthDistinct.json');

function loadFixture(): SonicYouthDistinctGolden {
  return JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')) as SonicYouthDistinctGolden;
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

function runDistinctGolden(fx: SonicYouthDistinctGolden): { name: string; ok: boolean } {
  const baseOpts = {
    presetId: fx.presetId as 'guitar_bass_duo' | 'song_mode',
    totalBars: fx.totalBars,
    longFormEnabled: true,
    ...(fx.primarySongwriterStyle ? { primarySongwriterStyle: fx.primarySongwriterStyle } : {}),
    ...(fx.songModeHookFirstIdentity ? { songModeHookFirstIdentity: true } : {}),
  };

  const baselineOpts =
    fx.baselineHarmonicVoice.trim() === ''
      ? baseOpts
      : { ...baseOpts, harmonicVoice: fx.baselineHarmonicVoice };

  const baseline = runGoldenPathOnce(fx.seed, baselineOpts);
  const target = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.targetHarmonicVoice,
  });

  const basePitches = guitarMidiPitches(baseline.score);
  const targetPitches = guitarMidiPitches(target.score);
  const pitchDiff = countPitchesDifferent(targetPitches, basePitches);
  const regDelta = Math.abs(registerMean(targetPitches) - registerMean(basePitches));

  const targetBundle = getVoiceRuleBundle(fx.targetHarmonicVoice);
  const baselineBundle =
    fx.baselineHarmonicVoice.trim() === ''
      ? undefined
      : getVoiceRuleBundle(fx.baselineHarmonicVoice);
  const targetRp = targetBundle.riffProfile;
  const baselineRp = baseline.context?.voiceBundle?.riffProfile ?? baselineBundle?.riffProfile;
  const receipts = targetBundle.orchestrationPolicy.fingerprintReceipts ?? [];

  const checks: Record<string, boolean> = {
    voiceBundle: target.context?.voiceBundle?.voiceId === fx.targetHarmonicVoice,
    harmonicVoice: target.context?.generationMetadata?.harmonicVoice === fx.targetHarmonicVoice,
    fingerprintReceipt: receipts.some((r) => r.includes(fx.fingerprintReceiptIncludes)),
    pitchDiff: pitchDiff >= fx.minGuitarPitchesDifferent,
    registerDelta: regDelta >= fx.minRegisterMeanDelta,
    targetHasRiffProfile: Boolean(targetRp),
    baselineNoHarmonicVoice:
      fx.baselineHarmonicVoice.trim() === '' ? !baseline.context?.generationMetadata?.harmonicVoice : true,
  };

  if (fx.requireTargetAntiMetric) {
    checks.targetAntiMetric = target.context?.generationMetadata?.voiceBundleRhythmAntiMetric === true;
    checks.baselineNotAntiMetric = baseline.context?.generationMetadata?.voiceBundleRhythmAntiMetric !== true;
  }

  if (fx.minChromaticBudget != null) {
    checks.targetChromatic = (targetRp?.chromaticBudget ?? 0) >= fx.minChromaticBudget;
  }
  if (fx.maxBaselineChromaticBudget != null) {
    checks.baselineChromatic = (baselineRp?.chromaticBudget ?? 0) <= fx.maxBaselineChromaticBudget;
  }
  if (fx.minMaxLeapSemitones != null) {
    checks.targetLeap = (targetBundle.melodicPolicy.maxLeapSemitones ?? 0) >= fx.minMaxLeapSemitones;
  }
  if (fx.maxBaselineMaxLeapSemitones != null && baselineBundle) {
    checks.baselineLeap = (baselineBundle.melodicPolicy.maxLeapSemitones ?? 99) <= fx.maxBaselineMaxLeapSemitones;
  }
  if (fx.minBarIdentityPersistence != null) {
    checks.targetLoopPersistence =
      (targetRp?.repetitionPolicy?.barIdentityPersistence ?? 0) >= fx.minBarIdentityPersistence;
  }
  if (fx.maxBaselineBarIdentityPersistence != null) {
    checks.baselineLoopPersistence =
      baselineRp == null ||
      (baselineRp.repetitionPolicy?.barIdentityPersistence ?? 1) <= fx.maxBaselineBarIdentityPersistence;
  }
  if (fx.minMetricDisplacement != null) {
    checks.targetMetricDisplacement = (targetRp?.metricDisplacement ?? 0) >= fx.minMetricDisplacement;
  }
  if (fx.maxBaselineMetricDisplacement != null) {
    checks.baselineMetricDisplacement =
      baselineRp == null || (baselineRp.metricDisplacement ?? 1) <= fx.maxBaselineMetricDisplacement;
  }

  const ok = Object.values(checks).every(Boolean);

  if (!ok && process.env.SONIC_YOUTH_DISTINCT_GOLDEN_DEBUG === '1') {
    console.log(JSON.stringify({ fx: fx.id, checks, pitchDiff, regDelta }, null, 2));
  }

  return {
    name: `${fx.targetHarmonicVoice} golden (${fx.id}): distinct from generic VRB fallback`,
    ok,
  };
}

export function runSonicYouthDistinctGoldenTests(): { name: string; ok: boolean }[] {
  return [runDistinctGolden(loadFixture())];
}

if (require.main === module) {
  const results = runSonicYouthDistinctGoldenTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  if (!results.every((r) => r.ok)) process.exit(1);
}
