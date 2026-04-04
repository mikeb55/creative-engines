/**
 * Phase 18.2B — Guitar polyphony inner voice (Wyble layer): behaviour checks only (no export).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { collectPhraseAwareActiveBarIndices } from '../core/goldenPath/guitarVoice2WybleLayer';
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

/** Phase 18.2B.3: phrase schedule (pre-strip) must have 2–3 bars per 4-bar window and breathing (max 2 consecutive). */
function testPhraseSchedule18_2B_3(): boolean {
  const tb = 32;
  const active = new Set(collectPhraseAwareActiveBarIndices(tb, WYBLE_TEST_SEED));
  const phraseCount = Math.floor(tb / 4);
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = base + 3;
    let count = 0;
    for (let bi = base; bi <= end; bi++) {
      if (active.has(bi)) count++;
    }
    if (count < 2 || count > 3) return false;
  }
  let run = 0;
  let maxRun = 0;
  for (let bi = 1; bi <= tb; bi++) {
    if (active.has(bi)) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else run = 0;
  }
  if (maxRun > 2) return false;
  const ratio = active.size / tb;
  if (ratio < 0.45 || ratio > 0.82) return false;
  return true;
}

function rhythmMirrorsVoice1(v1Attacks: Set<number>, v2Attacks: Set<number>): boolean {
  if (v1Attacks.size === 0 || v2Attacks.size === 0) return false;
  if (v1Attacks.size !== v2Attacks.size) return false;
  const a = [...v1Attacks].sort((x, y) => x - y).join(',');
  const b = [...v2Attacks].sort((x, y) => x - y).join(',');
  return a === b;
}

function testWybleGuitarPolyphony32Bars(): boolean {
  const r = runGoldenPath(WYBLE_TEST_SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    creativeControlLevel: 'balanced',
  });
  if (!r.score) return false;
  const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return false;
  let barsWithV2 = 0;
  let sustainedOverlapBars = 0;
  let mirrorBars = 0;
  const tb = guitar.measures.length;
  for (const m of guitar.measures) {
    const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (v2.length > 0) {
      barsWithV2++;
      const maxDur = Math.max(...v2.map((n) => n.duration));
      if (maxDur >= 2 - 1e-6) sustainedOverlapBars++;
    }
    if (maxSimultaneousGuitarNotes(m) > 2) return false;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;
    if (!noGuitarVoiceCrossing(v1, v2)) return false;
    if (v2.length > 0) {
      const v1Attacks = new Set(v1.map((n) => Math.round(n.startBeat * 4) / 4));
      const v2Attacks = new Set(v2.map((n) => Math.round(n.startBeat * 4) / 4));
      if (rhythmMirrorsVoice1(v1Attacks, v2Attacks)) mirrorBars++;
    }
  }
  if (barsWithV2 === 0) return false;
  if (barsWithV2 >= tb) return false;
  const ratio = barsWithV2 / tb;
  /** Phase 18.2B.3 target band on final score (later passes may strip some Voice 2 bars). */
  if (ratio < 0.35 || ratio > 0.85) return false;
  if (barsWithV2 > 0 && sustainedOverlapBars / barsWithV2 < 0.45) return false;
  if (mirrorBars > Math.max(1, Math.floor(barsWithV2 * 0.12))) return false;
  return true;
}

export function runGuitarBassDuoWybleVoice2Tests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'Phase 18.2B.3: phrase schedule (2–3 bars / phrase, breathing)',
      ok: testPhraseSchedule18_2B_3(),
    },
    {
      name: 'Guitar–Bass Duo 32: Wyble V2 sparsity, register, max 2 simultaneous notes',
      ok: testWybleGuitarPolyphony32Bars(),
    },
  ];
}
