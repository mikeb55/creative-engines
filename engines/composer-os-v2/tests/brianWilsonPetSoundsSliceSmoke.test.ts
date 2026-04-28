/**
 * Smoke — Brian Wilson Pet Sounds songwriter slice (chord vocabulary receipt + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBrianWilsonPetSoundsSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50031, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'brian_wilson',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.brianWilsonPetSoundsDiagnostics;
  const receipt = md?.brianWilsonPetSoundsSliceReceipt ?? '';

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'brian_wilson' &&
      diag?.songwriterId === 'brian_wilson' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      receipt.includes('Brian Wilson (Pet Sounds slice)'),
    name: 'Brian Wilson slice: golden path + Pet Sounds diagnostics receipt',
  });

  return out;
}
