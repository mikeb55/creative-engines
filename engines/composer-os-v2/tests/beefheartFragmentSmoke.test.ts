/**
 * Smoke — Captain Beefheart blues-fragment polyphony songwriter slice.
 * Receipt prefix **`cbf:*`** — Count Basie owns **`cb:*`**.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countWrongNoteRecurrencePairs,
  hasAsymmetricModuleReceipts,
} from '../core/song-mode/beefheartFragmentSlice';
import { evaluateBeefheartHardFails } from '../core/evaluation/beefheartStyleProfile';

export function runBeefheartFragmentSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(66001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'beefheart',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.beefheartDiagnostics;
  const receipt = md?.beefheartSliceReceipt ?? '';
  const eff = md?.beefheartEffectiveHarmonyBars;
  const devices = md?.beefheartDeviceReceipts ?? [];
  const plan = md?.beefheartFragmentPlan;
  const params = md?.beefheartSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'beefheart' &&
      diag?.songwriterId === 'beefheart' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Captain Beefheart (blues-fragment polyphony slice)') &&
      devices.some((d) => d.startsWith('cbf:')),
    name: 'Beefheart slice: golden path + fragment polyphony diagnostics receipt',
  });

  out.push({
    ok:
      (params?.bluesTransformationRate ?? 0) >= 0.82 &&
      devices.some((d) => d.startsWith('cbf:blues_transform@') || d.startsWith('cbf:blues_center@')) &&
      (diag?.bluesTransformation ?? 0) >= 0.75,
    name: 'Beefheart slice: bluesTransformation — center detectable, functional progression absent',
  });

  out.push({
    ok:
      (params?.independentPartPeriodicity ?? 0) >= 0.88 &&
      devices.some((d) => d.startsWith('cbf:part_cycle@')) &&
      (diag?.independentPartPeriodicity ?? 0) >= 0.78,
    name: 'Beefheart slice: independentPartPeriodicity — mismatched part cell lengths',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('cbf:wrong_note@')) &&
      devices.some((d) => d.startsWith('cbf:wrong_repeat@')) &&
      countWrongNoteRecurrencePairs(devices) >= 1 &&
      (diag?.wrongNoteRecurrence ?? 0) >= 0.72 &&
      !devices.includes('cbf:neg_noise@schema_fail'),
    name: 'Beefheart slice: wrongNoteRecurrence — dissonant intervals recur in same slot (CRITICAL)',
  });

  out.push({
    ok:
      hasAsymmetricModuleReceipts(devices) &&
      (diag?.asymmetricPhraseModule ?? 0) >= 0.7,
    name: 'Beefheart slice: asymmetricPhraseModule — 3/5/7/9 beat cells present',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('cbf:resist_resolution@') || d.startsWith('cbf:suppress_cadence@')) &&
      (diag?.resolutionSuppression ?? 0) >= 0.8,
    name: 'Beefheart slice: resolutionSuppression — no V–I or turnaround closure',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('cbf:dense_line@')) &&
      devices.some((d) => d.startsWith('cbf:guitar_counter@')) &&
      (diag?.denseSeparatedTexture ?? 0) >= 0.68,
    name: 'Beefheart slice: denseSeparatedTexture — multiple independent lines legible',
  });

  out.push({
    ok: !devices.some((d) => d.startsWith('cbf:neg_12bar@')) || (diag?.bluesTransformation ?? 0) >= 0.75,
    name: 'Beefheart slice: no 12-bar resolution dominant',
  });

  out.push({
    ok: !devices.some((d) => d.startsWith('cbf:strip_rock_jazz@')) || (diag?.independentPartPeriodicity ?? 0) >= 0.78,
    name: 'Beefheart slice: no jazz swing feel dominant',
  });

  const hardFails = evaluateBeefheartHardFails({}, diag ?? undefined);
  out.push({
    ok:
      (diag?.bluesTransformation ?? 0) >= 0.75 &&
      (diag?.independentPartPeriodicity ?? 0) >= 0.78 &&
      (diag?.wrongNoteRecurrence ?? 0) >= 0.72 &&
      (diag?.asymmetricPhraseModule ?? 0) >= 0.7 &&
      (diag?.resolutionSuppression ?? 0) >= 0.8 &&
      (diag?.denseSeparatedTexture ?? 0) >= 0.68 &&
      !hardFails.includes('random_noise_fail'),
    name: 'Beefheart slice: style profile PASS thresholds',
  });

  out.push({
    ok: (plan?.sections.length ?? 0) >= 2,
    name: 'Beefheart slice: multiple fragment sections span form',
  });

  return out;
}

if (require.main === module) {
  const results = runBeefheartFragmentSmokeTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
