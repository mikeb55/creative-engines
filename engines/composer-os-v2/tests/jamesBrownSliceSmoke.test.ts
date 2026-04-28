/**
 * Smoke — James Brown songwriter slice (dominant-centre harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runJamesBrownSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'james_brown',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.jamesBrownDiagnostics;
  const receipt = md?.jamesBrownSliceReceipt ?? '';
  const eff = md?.jamesBrownEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'james_brown' &&
      diag?.songwriterId === 'james_brown' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('James Brown'),
    name: 'James Brown slice: golden path + dominant-centre diagnostics receipt',
  });

  /**
   * Known debt (smoke): `songModeJamesBrownFunkOverlay` + primary `james_brown` can trip
   * `jamesBrownFunkOverlay.ts` bar-span preservation on some seeds — C3 overlay/rhythm path, not this harmony slice.
   * Regression for overlay × slice belongs in `tests/jamesBrownFunkOverlayRegression.test.ts` / targeted seeds.
   */

  return out;
}
