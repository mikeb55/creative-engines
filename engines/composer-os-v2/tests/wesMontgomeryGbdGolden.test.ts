/**
 * S2 — Wes Montgomery GBD distinctness vs Nile Rodgers (same seed / chords).
 * Not registered in runSmokeTests until V63 S6.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

type WesMontgomeryGbdDistinctGolden = {
  id: string;
  seed: number;
  totalBars: number;
  presetId: string;
  baselineHarmonicVoice: string;
  targetHarmonicVoice: string;
  minGuitarPitchesDifferent: number;
  minRegisterMeanDelta: number;
  minOctaveDisplacementTolerance: number;
  maxBaselineOctaveDisplacementTolerance: number;
  fingerprintReceiptIncludes: string;
};

const FIXTURE_PATH = path.join(__dirname, 'slonimskyUiGoldens', 'wesMontgomeryGbdDistinct.json');

function loadFixture(): WesMontgomeryGbdDistinctGolden {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8')) as WesMontgomeryGbdDistinctGolden;
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

export function runWesMontgomeryGbdGoldenTests(): { name: string; ok: boolean }[] {
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
  const wes = runGoldenPathOnce(fx.seed, {
    ...baseOpts,
    harmonicVoice: fx.targetHarmonicVoice,
  });

  const basePitches = guitarMidiPitches(baseline.score);
  const wesPitches = guitarMidiPitches(wes.score);
  const pitchDiff = countPitchesDifferent(wesPitches, basePitches);
  const regDelta = Math.abs(registerMean(wesPitches) - registerMean(basePitches));

  const wesBundle = getVoiceRuleBundle('wes_montgomery');
  const nileBundle = getVoiceRuleBundle('nile_rodgers');
  const wesOct = wesBundle.riffProfile?.octaveDisplacementTolerance ?? 0;
  const nileOct = nileBundle.riffProfile?.octaveDisplacementTolerance ?? 0;
  const wmReceipts = wesBundle.orchestrationPolicy.fingerprintReceipts ?? [];

  const checks = {
    voiceBundle: wes.context?.voiceBundle?.voiceId === 'wes_montgomery',
    harmonicVoice: wes.context?.generationMetadata?.harmonicVoice === 'wes_montgomery',
    fingerprintReceipt: wmReceipts.some((r) => r.includes(fx.fingerprintReceiptIncludes)),
    pitchDiff: pitchDiff >= fx.minGuitarPitchesDifferent,
    registerDelta: regDelta >= fx.minRegisterMeanDelta,
    wesOctavePolicy: wesOct >= fx.minOctaveDisplacementTolerance,
    nileOctavePolicy: nileOct <= fx.maxBaselineOctaveDisplacementTolerance,
    wesHasRiffProfile: Boolean(wesBundle.riffProfile),
  };

  const ok = Object.values(checks).every(Boolean);

  if (!ok && process.env.WES_MONTGOMERY_GBD_GOLDEN_DEBUG === '1') {
    console.log(
      JSON.stringify(
        {
          checks,
          pitchDiff,
          regDelta,
          wesOct,
          nileOct,
          receipt,
          baseLen: basePitches.length,
          wesLen: wesPitches.length,
        },
        null,
        2
      )
    );
  }

  return [
    {
      name: `wes_montgomery GBD golden (${fx.id}): distinct from ${fx.baselineHarmonicVoice}`,
      ok,
    },
  ];
}

if (require.main === module) {
  const results = runWesMontgomeryGbdGoldenTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
