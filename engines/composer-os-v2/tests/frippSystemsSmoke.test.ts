/**
 * Smoke — Robert Fripp era-dependent process systems songwriter slice.
 * Receipt prefix **`rf:*`** — distinct from Fripp/KC **`fk:*`**.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countTritoneM2Receipts,
  hasAsymmetricGroupingReceipts,
  hasInterlockReceipts,
} from '../core/song-mode/frippSystemsSlice';
import { evaluateFrippHardFails } from '../core/evaluation/frippStyleProfile';

export function runFrippSystemsSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(11001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'fripp',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.frippDiagnostics;
  const receipt = md?.frippSliceReceipt ?? '';
  const eff = md?.frippEffectiveHarmonyBars;
  const devices = md?.frippDeviceReceipts ?? [];
  const plan = md?.frippSystemsPlan;
  const params = md?.frippSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'fripp' &&
      diag?.songwriterId === 'fripp' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Robert Fripp (era-dependent process systems slice)') &&
      devices.some((d) => d.startsWith('rf:')),
    name: 'Fripp slice: golden path + process systems diagnostics receipt',
  });

  out.push({
    ok:
      (params?.intervalFieldPriority ?? 0) >= 0.82 &&
      devices.some((d) => d.startsWith('rf:interval_field@')) &&
      (diag?.intervalFieldHarmony ?? 0) >= 0.75,
    name: 'Fripp slice: intervalFieldHarmony — interval-field not chord-function',
  });

  out.push({
    ok:
      hasInterlockReceipts(devices) &&
      devices.some((d) => d.startsWith('rf:composite_pulse@') || d.startsWith('rf:interlock_guitar_')) &&
      (diag?.interlockPattern ?? 0) >= 0.72,
    name: 'Fripp slice: interlockPattern — shared pulse, independent grouping',
  });

  out.push({
    ok:
      countTritoneM2Receipts(devices) >= 1 ||
      (params?.eraSystemMode !== 'red' && (diag?.dissonanceManagement ?? 0) >= 0.7),
    name: 'Fripp slice: dissonanceManagement — tritone/m2 retention in Red mode',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('rf:melodic_cell@')) &&
      (diag?.melodicIntervalCell ?? 0) >= 0.68,
    name: 'Fripp slice: melodicIntervalCell — P4/P5/tritone structural events',
  });

  out.push({
    ok:
      hasAsymmetricGroupingReceipts(devices) &&
      (diag?.asymmetricGrouping ?? 0) >= 0.65,
    name: 'Fripp slice: asymmetricGrouping — cross-accent, non-barline-aligned phrase starts',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('rf:process_audible@')) &&
      (diag?.processAudibility ?? 0) >= 0.68,
    name: 'Fripp slice: processAudibility — system behavior inferrable from output',
  });

  out.push({
    ok: !devices.filter((d) => d.startsWith('rf:neg_holdsworth@')).length || (diag?.melodicIntervalCell ?? 0) >= 0.65,
    name: 'Fripp slice: no Holdsworth scalar ribbon dominant',
  });

  out.push({
    ok: !devices.filter((d) => d.startsWith('rf:neg_verlaine@')).length || (diag?.intervalFieldHarmony ?? 0) >= 0.72,
    name: 'Fripp slice: no Verlaine suspended-field dominant',
  });

  out.push({
    ok: !devices.filter((d) => d.startsWith('rf:neg_marr@')).length || (diag?.melodicIntervalCell ?? 0) >= 0.65,
    name: 'Fripp slice: no Marr open-string shimmer dominant',
  });

  const hardFails = evaluateFrippHardFails({}, diag ?? undefined);
  out.push({
    ok:
      (diag?.intervalFieldHarmony ?? 0) >= 0.75 &&
      (diag?.interlockPattern ?? 0) >= 0.72 &&
      (diag?.dissonanceManagement ?? 0) >= 0.7 &&
      (diag?.melodicIntervalCell ?? 0) >= 0.68 &&
      (diag?.asymmetricGrouping ?? 0) >= 0.65 &&
      (diag?.processAudibility ?? 0) >= 0.68 &&
      !hardFails.includes('holdsworth_bleed'),
    name: 'Fripp slice: style profile PASS thresholds',
  });

  out.push({
    ok: (plan?.sections.length ?? 0) >= 2,
    name: 'Fripp slice: multiple era sections span form',
  });

  return out;
}

if (require.main === module) {
  const results = runFrippSystemsSmokeTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
