/**
 * Harmony spine regression harness — table-driven probes vs {@link getChordForBar}.
 * @see docs/harmonySpineInventory.md
 */

import { getChordForBar } from '../core/harmony/harmonyResolution';
import { resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export interface HarmonySpineCaseRow {
  /** Primary Song Mode songwriter id (see harmonyResolution / songwriter registry). */
  songwriterId: string;
  totalBars: number;
  seed: number;
  /** 1-based bar indices to compare (e.g. 1, 8, 16). */
  probeBars: readonly number[];
  /** Expected chord symbol per probe bar (`probeBars.length` entries). */
  expectedSymbols: string[];
}

/** Pilot: Jobim + 16-bar custom_locked ii–V–I tiles — frozen symbols at probes (seed 50213). */
export const HARMONY_SPINE_CASE_TABLE: HarmonySpineCaseRow[] = [
  {
    songwriterId: 'antonio_carlos_jobim',
    totalBars: 16,
    seed: 50213,
    probeBars: [1, 8, 16],
    expectedSymbols: ['Am7', 'Gmaj7', 'Gmaj7'],
  },
];

const JOBIM_IIV_I_16 = [
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
] as const;

export function runHarmonySpineTests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];

  rows.push({
    name: 'Harmony spine pilot — Jobim probes match canonical resolver',
    ok: (() => {
      const pilot = HARMONY_SPINE_CASE_TABLE[0];
      if (!pilot || pilot.songwriterId !== 'antonio_carlos_jobim') return false;
      const locked = [...JOBIM_IIV_I_16];
      const r = runGoldenPathOnce(pilot.seed, {
        presetId: 'guitar_bass_duo',
        totalBars: pilot.totalBars,
        longFormEnabled: true,
        songModeHookFirstIdentity: true,
        primarySongwriterStyle: pilot.songwriterId,
        harmonyMode: 'custom_locked',
        chordProgressionText: locked.join('|'),
        lockedHarmonyBarsRaw: locked,
      });
      const ctx = r.context;
      if (!ctx) return false;
      for (let i = 0; i < pilot.probeBars.length; i++) {
        const bar = pilot.probeBars[i]!;
        const exp = pilot.expectedSymbols[i];
        const sym = getChordForBar(bar, ctx);
        const spine = resolveBarSymbol(ctx, bar);
        if (exp !== sym || spine.symbol !== sym) return false;
        if (spine.provenance !== 'slice' || spine.sliceId !== 'antonio_carlos_jobim') return false;
      }
      return true;
    })(),
  });

  return rows;
}
