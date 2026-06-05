/**
 * Smoke — Johnny Mandel melody-forward Studio Orchestral warmth slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countPlainTriadArrivals,
  minMandelPhraseSpan,
} from '../core/song-mode/johnnyMandelSlice';

export function runMandelLyricWarmthSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(99001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'johnny_mandel',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.johnnyMandelDiagnostics;
  const receipt = md?.johnnyMandelSliceReceipt ?? '';
  const eff = md?.johnnyMandelEffectiveHarmonyBars;
  const devices = md?.johnnyMandelDeviceReceipts ?? [];
  const plan = md?.mandelLyricWarmthPlan;
  const params = md?.johnnyMandelSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'johnny_mandel' &&
      diag?.songwriterId === 'johnny_mandel' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Johnny Mandel (melody-forward Studio Orchestral warmth slice)') &&
      devices.some((d) => d.startsWith('jmd:')),
    name: 'Johnny Mandel slice: golden path + lyric warmth diagnostics receipt',
  });

  out.push({
    ok: (params?.melodyForward ?? 0) >= 0.7 && devices.some((d) => d.startsWith('jmd:melody_on_extensions@')),
    name: 'Johnny Mandel slice: melodyForward fires (jmd:melody_on_extensions receipts)',
  });

  out.push({
    ok:
      (diag?.innerWarmthTouches ?? 0) >= 4 &&
      devices.some((d) => d.startsWith('jmd:inner_voice_semitone@')),
    name: 'Johnny Mandel slice: mechanicalWarmth inner motion present',
  });

  out.push({
    ok:
      (diag?.borrowedIvTouches ?? 0) >= 1 &&
      devices.some((d) => d.startsWith('jmd:borrowed_iv_minor@')),
    name: 'Johnny Mandel slice: borrowedMinor inflection active',
  });

  out.push({
    ok:
      (diag?.softenedCadenceTouches ?? 0) >= 2 &&
      countPlainTriadArrivals(eff, plan?.cadenceBars ?? []) === 0 &&
      devices.some((d) => d.startsWith('jmd:softened_cadence@')),
    name: 'Johnny Mandel slice: softenedCadence at phrase endings',
  });

  out.push({
    ok: minMandelPhraseSpan(plan) >= 4,
    name: 'Johnny Mandel slice: lyric phrases span at least 4 bars',
  });

  return out;
}
