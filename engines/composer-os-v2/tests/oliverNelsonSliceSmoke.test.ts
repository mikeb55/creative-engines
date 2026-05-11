/**
 * Smoke — Oliver Nelson pedal-modal + minor blues layer (`on:*` receipts).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runOliverNelsonSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(60442, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'oliver_nelson',
    harmonicVoice: 'oliver_nelson',
    nelsonPeriodMode: 'middle_nelson',
    nelsonBluesFormVariant: 'twelve_bar',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.oliverNelsonDiagnostics;
  const receipt = md?.oliverNelsonSliceReceipt ?? '';
  const eff = md?.oliverNelsonEffectiveHarmonyBars;
  const dev = md?.oliverNelsonDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'oliver_nelson' &&
      diag?.songwriterId === 'oliver_nelson' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      md?.nelsonPeriodModeResolved === 'middle_nelson' &&
      typeof md?.activePedal === 'number' &&
      Array.isArray(md?.upperModalChords) &&
      md.upperModalChords.length === 2 &&
      dev.some((x) => x.startsWith('on:episode@')) &&
      dev.some((x) => x.includes('on:minor_blues_cycle')) &&
      receipt.includes('Nelson'),
    name: 'Oliver Nelson slice: golden path + on:* receipts + pedal metadata',
  });

  return out;
}
