/**
 * Print Wayne Shorter slice d1–d5 receipt counts + eligibility stats per seed (inspect-only).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { countWayneShorterDeviceFiresFromReceipts } from '../core/song-mode/wayneShorterSlice';

const SEEDS = [50200, 77123, 90444] as const;

function main(): void {
  for (const seed of SEEDS) {
    const r = runGoldenPathOnce(seed, {
      presetId: 'guitar_bass_duo',
      totalBars: 32,
      longFormEnabled: true,
      songModeHookFirstIdentity: true,
      primarySongwriterStyle: 'wayne_shorter',
    });
    const md = r.context?.generationMetadata;
    const receipts = md?.wayneShorterDeviceReceipts ?? [];
    const fires = countWayneShorterDeviceFiresFromReceipts(receipts);
    const st = md?.wayneShorterEligibilityStats;
    console.log(
      JSON.stringify({
        seed,
        success: r.success,
        errors: r.success ? undefined : (r.errors ?? []).slice(0, 3),
        fires,
        eligible: st
          ? {
              d1: st.d1EligibleBars,
              d2: st.d2EligibleBars,
              d3: st.d3EligibleBars,
              d4: st.d4EligibleBars,
              d5: st.d5EligibleBars,
            }
          : null,
        ratesVsEligible:
          st && st.totalBars > 0
            ? {
                d1: fires.d1 / Math.max(1, st.d1EligibleBars),
                d2: fires.d2 / Math.max(1, st.d2EligibleBars),
                d3: fires.d3 / Math.max(1, st.d3EligibleBars),
                d4: fires.d4 / Math.max(1, st.d4EligibleBars),
                d5: fires.d5 / Math.max(1, st.d5EligibleBars),
              }
            : null,
      })
    );
  }
}

main();
