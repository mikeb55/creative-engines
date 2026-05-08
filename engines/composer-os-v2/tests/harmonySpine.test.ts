/**
 * Harmony spine regression harness — table-driven probes vs {@link getChordForBar}.
 * Expected symbols: `harmonySpineCases.seed50213.json` (seed 50213, 16-bar locked ii–V–I).
 * @see docs/harmonySpineInventory.md
 */

import { getChordForBar } from '../core/harmony/harmonyResolution';
import { resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import probeSeed50213 from './harmonySpineCases.seed50213.json';

export interface HarmonySpineCaseRow {
  songwriterId: string;
  totalBars: number;
  seed: number;
  probeBars: readonly number[];
  expectedSymbols: string[];
  expectedSliceId: string;
}

const SHARED_IIV_I_16 = [
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

type ProbeVal = string[] | { error: string };

function buildCaseRows(): HarmonySpineCaseRow[] {
  const data = probeSeed50213 as Record<string, ProbeVal>;
  const rows: HarmonySpineCaseRow[] = [];
  for (const [songwriterId, val] of Object.entries(data)) {
    if (!Array.isArray(val)) continue;
    rows.push({
      songwriterId,
      totalBars: 16,
      seed: 50213,
      probeBars: [1, 8, 16],
      expectedSymbols: val,
      expectedSliceId: songwriterId,
    });
  }
  return rows.sort((a, b) => a.songwriterId.localeCompare(b.songwriterId));
}

/** Frozen cases (fela_kuti and other probe failures are omitted from JSON). */
export const HARMONY_SPINE_CASE_TABLE: HarmonySpineCaseRow[] = buildCaseRows();

function runCaseRow(pilot: HarmonySpineCaseRow): boolean {
  const locked = [...SHARED_IIV_I_16];
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
    if (spine.provenance !== 'slice' || spine.sliceId !== pilot.expectedSliceId) return false;
  }
  return true;
}

export function runHarmonySpineTests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];
  for (const pilot of HARMONY_SPINE_CASE_TABLE) {
    rows.push({
      name: `Harmony spine — ${pilot.songwriterId} probes`,
      ok: runCaseRow(pilot),
    });
  }
  return rows;
}
