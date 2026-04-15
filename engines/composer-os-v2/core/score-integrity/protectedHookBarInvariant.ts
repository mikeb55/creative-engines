/**
 * Song Mode hook bars (1, 25) — structural identity snapshots for regression guards.
 *
 * **Identity (per note, after sort):** MIDI pitch, voice id, start beat, duration — velocity and other
 * expressive fields are ignored. This is an **internal** invariant: “snapshot now vs same bars later”
 * should match when no later stage is supposed to rewrite protected hook material.
 *
 * **“Density” in `SONG_MODE_REGRESSION_FAIL_MSG`:** informal shorthand — failures include a **different
 * number of notes** in the bar (`identitiesEqual` length mismatch), not only pitch/time drift.
 *
 * **Design:** Intended to catch **unintended** regressions (e.g. a pass mutates sealed hook bars).
 * It is **not** for rejecting **legitimate** style-driven rewrites: the baseline snapshot must be taken
 * *after* any pass that is allowed to change the hook under the active style (e.g. chord-tone policy).
 * Comparing “before style-aware passes” to “after” will false-positive when style parameters change
 * chord-tone resolution but not when comparing **post-finalize** vs **post-finalize + only non-hook edits**.
 */

import type { NoteEvent, PartModel } from '../score-model/scoreModelTypes';

/** Must match duoMusicalQuality.ts practical ceiling for guitar rest ratio. */
export const SONG_MODE_GUITAR_REST_RATIO_CEILING = 0.55;

/** Fail message for baseline regression test + runtime hook invariant violations (identity / note-count). */
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

/** Compares `snapshot` to the bar’s current note rows (pitch / onset / duration / voice). */
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
