/**
 * Smoke — Bob Brookmeyer pitch-module / line-first slice (golden path + brk receipts).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBobBrookmeyerSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50341, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bob_brookmeyer',
    harmonicVoice: 'bob_brookmeyer',
    brookmeyerPeriodMode: 'late_brookmeyer',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.bobBrookmeyerDiagnostics;
  const receipt = md?.bobBrookmeyerSliceReceipt ?? '';
  const eff = md?.bobBrookmeyerEffectiveHarmonyBars;
  const dev = md?.bobBrookmeyerDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'bob_brookmeyer' &&
      diag?.songwriterId === 'bob_brookmeyer' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      Array.isArray(md?.activePitchModule) &&
      md.activePitchModule.length === 3 &&
      md?.brookmeyerLineFirstHierarchy === true &&
      md?.lineFirstHierarchy === true &&
      dev.some((x) => x.startsWith('brk:pitch_module@')) &&
      dev.some((x) => x.includes('brk:episode@')) &&
      receipt.includes('Brookmeyer'),
    name: 'Bob Brookmeyer slice: golden path + brk receipts + pitch module',
  });

  return out;
}
