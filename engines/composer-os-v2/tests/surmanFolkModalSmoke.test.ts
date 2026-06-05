/**
 * Smoke — John Surman British folk-minimalist ECM songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countAlteredDominantsInBars,
  maxSurmanPhraseArcLength,
  minSurmanSectionSpan,
} from '../core/song-mode/johnSurmanSlice';

export function runSurmanFolkModalSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(97001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'john_surman',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.johnSurmanDiagnostics;
  const receipt = md?.johnSurmanSliceReceipt ?? '';
  const eff = md?.johnSurmanEffectiveHarmonyBars;
  const devices = md?.johnSurmanDeviceReceipts ?? [];
  const plan = md?.johnSurmanFolkPlan;
  const params = md?.johnSurmanSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'john_surman' &&
      diag?.songwriterId === 'john_surman' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('John Surman (British folk-minimalist ECM slice)') &&
      devices.some((d) => d.startsWith('js:')),
    name: 'John Surman slice: golden path + folk-minimalist ECM diagnostics receipt',
  });

  out.push({
    ok: (params?.folkModalCenter ?? 0) >= 0.72 && devices.some((d) => d.startsWith('js:folk_modal@')),
    name: 'John Surman slice: folkModalCenter fires (js:folk_modal receipts)',
  });

  out.push({
    ok: countAlteredDominantsInBars(eff) === 0,
    name: 'John Surman slice: no altered dominants in effective harmony',
  });

  out.push({
    ok: (diag?.darkReedTouches ?? 0) >= 4 && devices.some((d) => d.startsWith('js:dark_reed@')),
    name: 'John Surman slice: dark register weight present',
  });

  out.push({
    ok: maxSurmanPhraseArcLength(plan) >= 4 && maxSurmanPhraseArcLength(plan) <= 8,
    name: 'John Surman slice: phrase arcs 4–8 bars',
  });

  out.push({
    ok: minSurmanSectionSpan(plan) >= 8,
    name: 'John Surman slice: modal sections span at least 8 bars',
  });

  return out;
}
