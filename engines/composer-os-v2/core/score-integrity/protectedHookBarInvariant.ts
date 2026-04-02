/**
 * Song Mode hook bars (1, 25) — structural identity snapshots for regression guards.
 * Compares pitch + onset + duration + voice (no velocity). Throws if downstream stages mutate protected material.
 */

import type { NoteEvent, PartModel } from '../score-model/scoreModelTypes';

/** Must match duoMusicalQuality.ts practical ceiling for guitar rest ratio. */
export const SONG_MODE_GUITAR_REST_RATIO_CEILING = 0.55;

/** Fail message for baseline regression test + runtime hook invariant violations. */
export const SONG_MODE_REGRESSION_FAIL_MSG = 'Song Mode regression: identity or density broken';

export interface HookBarNoteIdentity {
  pitch: number;
  startBeat: number;
  duration: number;
  voice: number;
}

function noteIdentitySorted(guitar: PartModel, barIndex: number): HookBarNoteIdentity[] {
  const m = guitar.measures.find((x) => x.index === barIndex);
  if (!m) return [];
  return m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as NoteEvent)
    .sort((a, b) => a.startBeat - b.startBeat || (a.voice ?? 1) - (b.voice ?? 1))
    .map((n) => ({
      pitch: n.pitch,
      startBeat: n.startBeat,
      duration: n.duration,
      voice: n.voice ?? 1,
    }));
}

export function snapshotGuitarHookBarIdentity(guitar: PartModel, barIndex: number): HookBarNoteIdentity[] {
  return noteIdentitySorted(guitar, barIndex);
}

export function snapshotGuitarHookBars(
  guitar: PartModel,
  barIndices: readonly number[]
): Map<number, HookBarNoteIdentity[]> {
  const out = new Map<number, HookBarNoteIdentity[]>();
  for (const b of barIndices) {
    out.set(b, noteIdentitySorted(guitar, b));
  }
  return out;
}

function identitiesEqual(a: HookBarNoteIdentity[], b: HookBarNoteIdentity[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x.pitch !== y.pitch || x.voice !== y.voice) return false;
    if (Math.abs(x.startBeat - y.startBeat) > 1e-3) return false;
    if (Math.abs(x.duration - y.duration) > 1e-3) return false;
  }
  return true;
}

export function assertHookBarIdentityUnchanged(
  snapshot: HookBarNoteIdentity[],
  guitar: PartModel,
  barIndex: number,
  message: string = SONG_MODE_REGRESSION_FAIL_MSG
): void {
  const now = noteIdentitySorted(guitar, barIndex);
  if (!identitiesEqual(snapshot, now)) {
    throw new Error(message);
  }
}

export function assertHookBarsUnchangedSinceSnapshot(
  snapshot: Map<number, HookBarNoteIdentity[]>,
  guitar: PartModel,
  message: string = SONG_MODE_REGRESSION_FAIL_MSG
): void {
  for (const [bar, notes] of snapshot) {
    assertHookBarIdentityUnchanged(notes, guitar, bar, message);
  }
}
