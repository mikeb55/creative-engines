/**
 * Harmony spine LOCK harness — asserts {@link assertHarmonySpineMatchesScore} fires on drift.
 */

import { assertHarmonySpineMatchesScore, resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

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

function spineLockHarness(): boolean {
  try {
    const locked = [...SHARED_IIV_I_16];
    const r = runGoldenPathOnce(50213, {
      presetId: 'guitar_bass_duo',
      totalBars: 16,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join('|'),
      lockedHarmonyBarsRaw: locked,
    });
    if (!r.score || !r.context) return false;
    const routing = {
      harmonyMode: 'custom_locked' as const,
      lockedHarmonyBarsRaw: locked,
      parsedChordBars: locked,
    };
    const scoreClone = JSON.parse(JSON.stringify(r.score)) as ScoreModel;
    const g = scoreClone.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (!g) return false;
    const m = g.measures.find((x) => x.index === 1) ?? g.measures[0];
    if (!m) return false;
    const spine1 = resolveBarSymbol(r.context, 1).symbol;
    m.chord = spine1.toLowerCase().startsWith('b') ? 'Cmaj7' : 'Bmaj7';
    let threw = false;
    try {
      assertHarmonySpineMatchesScore(scoreClone, routing, r.context, 'harmonySpineLock.smoke-mismatch');
    } catch (e) {
      threw = String(e).includes('HARMONY_SPINE_LOCK');
    }
    return threw;
  } catch {
    return false;
  }
}

export function runHarmonySpineLockSmokeTests(): { name: string; ok: boolean }[] {
  return [{ name: 'Harmony spine LOCK harness (mismatch throws)', ok: spineLockHarness() }];
}
