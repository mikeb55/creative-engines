/**
 * S3 — Joe Pass GBD distinctness vs Larry Carlton (same seed / chords).
 * Not registered in runSmokeTests until V63 S6.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

type JoePassGbdDistinctGolden = {
  id: string;
  seed: number;
  totalBars: number;
  presetId: string;
  baselineHarmonicVoice: string;
  targetHarmonicVoice: string;
  minGuitarPitchesDifferent: number;
  minRegisterMeanDelta: number;
  minChromaticBudget: number;
  maxBaselineChromaticBudget: number;
  fingerprintReceiptIncludes: string;
};

const FIXTURE_PATH = path.join(__dirname, 'slonimskyUiGoldens', 'joePassGbdDistinct.json');

function loadFixture(): JoePassGbdDistinctGolden {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8')) as JoePassGbdDistinctGolden;
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

export function runJoePassGbdGoldenTests(): { name: string; ok: boolean }[] {
  const fx = loadFixture();
  const baseOpts = {
    presetId: fx.presetId as 'guitar_bass_duo',
    totalBars: fx.totalBars,
    longFormEnabled: true,
  };

  const baseline = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.baselineHarmonicVoice,
  });
  const joe = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.targetHarmonicVoice,
  });

  const basePitches = guitarMidiPitches(baseline.score);
  const joePitches = guitarMidiPitches(joe.score);
  const pitchDiff = countPitchesDifferent(joePitches, basePitches);
  const regDelta = Math.abs(registerMean(joePitches) - registerMean(basePitches));

  const joeBundle = getVoiceRuleBundle('joe_pass');
  const larryBundle = getVoiceRuleBundle('larry_carlton');
  const joeChrom = joeBundle.riffProfile?.chromaticBudget ?? 0;
  const larryChrom = larryBundle.riffProfile?.chromaticBudget ?? 0;
  const jpReceipts = joeBundle.orchestrationPolicy.fingerprintReceipts ?? [];

  const checks = {
    voiceBundle: joe.context?.voiceBundle?.voiceId === 'joe_pass',
    harmonicVoice: joe.context?.generationMetadata?.harmonicVoice === 'joe_pass',
    fingerprintReceipt: jpReceipts.some((r) => r.includes(fx.fingerprintReceiptIncludes)),
    pitchDiff: pitchDiff >= fx.minGuitarPitchesDifferent,
    registerDelta: regDelta >= fx.minRegisterMeanDelta,
    joeChromaticPolicy: joeChrom >= fx.minChromaticBudget,
    larryChromaticPolicy: larryChrom <= fx.maxBaselineChromaticBudget,
    joeHasRiffProfile: Boolean(joeBundle.riffProfile),
  };

  const ok = Object.values(checks).every(Boolean);

  if (!ok && process.env.JOE_PASS_GBD_GOLDEN_DEBUG === '1') {
    console.log(
      JSON.stringify(
        {
          checks,
          pitchDiff,
          regDelta,
          joeChrom,
          larryChrom,
          baseLen: basePitches.length,
          joeLen: joePitches.length,
        },
        null,
        2
      )
    );
  }

  return [
    {
      name: `joe_pass GBD golden (${fx.id}): distinct from ${fx.baselineHarmonicVoice}`,
      ok,
    },
  ];
}

if (require.main === module) {
  const results = runJoePassGbdGoldenTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
