/**
 * Phase 18.2B — Guitar polyphony inner voice (Wyble layer): behaviour checks only (no export).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { MeasureModel, NoteEvent } from '../core/score-model/scoreModelTypes';

function maxSimultaneousGuitarNotes(m: MeasureModel): number {
  const noteSpans = m.events
    .filter((e) => e.kind === 'note' && ((e.voice ?? 1) === 1 || (e.voice ?? 1) === 2))
    .map((e) => ({ t0: e.startBeat, t1: e.startBeat + e.duration }));
  if (noteSpans.length === 0) return 0;
  const times = new Set<number>();
  for (const s of noteSpans) {
    times.add(s.t0);
    times.add(s.t1);
    times.add(s.t0 + (s.t1 - s.t0) * 0.5);
  }
  let maxN = 0;
  for (const t of times) {
    const n = noteSpans.filter((s) => t >= s.t0 && t < s.t1 - 1e-9).length;
    maxN = Math.max(maxN, n);
  }
  return maxN;
}

function noGuitarVoiceCrossing(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const t0 = v2n.startBeat;
    const t1 = t0 + v2n.duration;
    for (const v1n of v1) {
      const u1 = v1n.startBeat + v1n.duration;
      if (v1n.startBeat < t1 - 1e-6 && t0 < u1 - 1e-6 && v2n.pitch >= v1n.pitch) return false;
    }
  }
  return true;
}

/** Fixed seed used for regression of Wyble injection + golden path. */
const WYBLE_TEST_SEED = 51_000;

function testWybleGuitarPolyphony32Bars(): boolean {
  const r = runGoldenPath(WYBLE_TEST_SEED, { presetId: 'guitar_bass_duo', totalBars: 32 });
  if (!r.score) return false;
  const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return false;
  let barsWithV2 = 0;
  const tb = guitar.measures.length;
  for (const m of guitar.measures) {
    const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (v2.length > 0) barsWithV2++;
    if (maxSimultaneousGuitarNotes(m) > 2) return false;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;
    if (!noGuitarVoiceCrossing(v1, v2)) return false;
  }
  if (barsWithV2 === 0) return false;
  if (barsWithV2 >= tb) return false;
  const ratio = barsWithV2 / tb;
  if (ratio < 0.22 || ratio > 0.5) return false;
  return true;
}

export function runGuitarBassDuoWybleVoice2Tests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'Guitar–Bass Duo 32: Wyble V2 sparsity, register, max 2 simultaneous notes',
      ok: testWybleGuitarPolyphony32Bars(),
    },
  ];
}
