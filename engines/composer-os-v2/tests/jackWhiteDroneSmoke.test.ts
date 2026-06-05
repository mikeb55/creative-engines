/**
 * Smoke — Jack White drone-centered riff songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  dyadFifthDominanceRate,
  fullTriadRate,
  minJackWhiteSectionSpan,
} from '../core/song-mode/jackWhiteDroneSlice';
import { evaluateJackWhiteHardFails } from '../core/evaluation/jackWhiteStyleProfile';

export function runJackWhiteDroneSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(33001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'jack_white',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.jackWhiteDiagnostics;
  const receipt = md?.jackWhiteSliceReceipt ?? '';
  const eff = md?.jackWhiteEffectiveHarmonyBars;
  const devices = md?.jackWhiteDeviceReceipts ?? [];
  const plan = md?.jackWhiteDronePlan;
  const params = md?.jackWhiteSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'jack_white' &&
      diag?.songwriterId === 'jack_white' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Jack White (drone-centered riff slice)') &&
      devices.some((d) => d.startsWith('jw:')),
    name: 'Jack White slice: golden path + drone-riff diagnostics receipt',
  });

  out.push({
    ok:
      (params?.tonicPersistenceRate ?? 0) >= 0.8 &&
      devices.some((d) => d.startsWith('jw:tonic_persist@')) &&
      (diag?.tonicPersistence ?? 0) >= 0.75,
    name: 'Jack White slice: tonicPersistence fires (jw:tonic_persist receipts)',
  });

  out.push({
    ok:
      (params?.droneLogicMode ?? 0) >= 0.82 &&
      devices.some(
        (d) =>
          d.startsWith('jw:drone_sim@') || d.startsWith('jw:drone_alt@') || d.startsWith('jw:drone_layer@')
      ) &&
      (diag?.droneLogic ?? 0) >= 0.7,
    name: 'Jack White slice: droneLogic active (simultaneous/alternating/layered receipts)',
  });

  out.push({
    ok:
      dyadFifthDominanceRate(eff ?? []) >= 0.55 &&
      fullTriadRate(eff ?? []) <= 0.35 &&
      devices.some((d) => d.startsWith('jw:implied_harm@')),
    name: 'Jack White slice: harmonyByImplication — dyads/fifths dominant, full triads rare',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('jw:cell_repeat@') || d.startsWith('jw:riff_cell@')) &&
      (diag?.riffCellEconomy ?? 0) >= 0.68,
    name: 'Jack White slice: riffCellEconomy — 1–2 bar cell repetition before variation',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('jw:incomplete@')) &&
      devices.some((d) => d.startsWith('jw:tonic_anchor@')) &&
      (diag?.tonicPersistence ?? 0) >= 0.75,
    name: 'Jack White slice: controlledIncompleteness — unresolved surface, tonal center held',
  });

  out.push({
    ok: !devices.some((d) => d.startsWith('jw:neg_hendrix@')) || (diag?.hendrixBleedTouches ?? 0) <= 4,
    name: 'Jack White slice: no Hendrix modal embellishment dominant',
  });

  out.push({
    ok: !devices.some((d) => d.includes('legato')) && (diag?.fusedPartTouches ?? 0) >= 4,
    name: 'Jack White slice: no Gilmour legato arc dominant (fused attack phrasing present)',
  });

  const hardFails = evaluateJackWhiteHardFails({}, diag ?? undefined);
  out.push({
    ok:
      (diag?.tonicPersistence ?? 0) >= 0.75 &&
      (diag?.droneLogic ?? 0) >= 0.7 &&
      (diag?.harmonyByImplication ?? 0) >= 0.72 &&
      (diag?.riffCellEconomy ?? 0) >= 0.68 &&
      (diag?.controlledIncompleteness ?? 0) >= 0.65 &&
      (diag?.leadRhythmFusion ?? 0) >= 0.62 &&
      !hardFails.includes('generic_garage_fail'),
    name: 'Jack White slice: style profile PASS thresholds',
  });

  out.push({
    ok: minJackWhiteSectionSpan(plan) >= 2,
    name: 'Jack White slice: riff sections span at least 2 bars',
  });

  return out;
}

if (require.main === module) {
  const results = runJackWhiteDroneSmokeTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
