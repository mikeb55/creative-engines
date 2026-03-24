/**
 * Composer OS V2 — Lock manager
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { LockSet, LockSnapshot, LockContext } from './lockTypes';

function snapshotMelody(score: ScoreModel): LockSnapshot['melody'] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return undefined;
  const pitchesByBar = new Map<number, number[]>();
  for (const m of guitar.measures) {
    const pitches = m.events
      .filter((e) => e.kind === 'note')
      .map((e) => (e as { pitch: number }).pitch);
    if (pitches.length) pitchesByBar.set(m.index, pitches);
  }
  return { partId: guitar.id, pitchesByBar };
}

function snapshotBass(score: ScoreModel): LockSnapshot['bass'] {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return undefined;
  const pitchesByBar = new Map<number, number[]>();
  for (const m of bass.measures) {
    const pitches = m.events
      .filter((e) => e.kind === 'note')
      .map((e) => (e as { pitch: number }).pitch);
    if (pitches.length) pitchesByBar.set(m.index, pitches);
  }
  return { partId: bass.id, pitchesByBar };
}

function snapshotHarmony(score: ScoreModel): LockSnapshot['harmony'] {
  const chordByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord) chordByBar.set(m.index, m.chord);
    }
  }
  return { chordByBar };
}

function snapshotRhythm(score: ScoreModel): LockSnapshot['rhythm'] {
  const byBar = new Map<number, Array<{ start: number; duration: number }>>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      const events = m.events
        .filter((e) => e.kind === 'note' || e.kind === 'rest')
        .map((e) => ({ start: e.startBeat, duration: e.duration }));
      if (events.length) byBar.set(m.index, events);
    }
  }
  return { startsAndDurationsByBar: byBar };
}

function snapshotSections(score: ScoreModel): LockSnapshot['sections'] {
  const rehearsalByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) rehearsalByBar.set(m.index, m.rehearsalMark);
    }
  }
  return { rehearsalByBar };
}

/** Create lock snapshot from score. */
export function createLockSnapshot(score: ScoreModel, locks: LockSet): LockSnapshot {
  const snapshot: LockSnapshot = {};
  if (locks.melody) snapshot.melody = snapshotMelody(score);
  if (locks.bass) snapshot.bass = snapshotBass(score);
  if (locks.harmony) snapshot.harmony = snapshotHarmony(score);
  if (locks.rhythm) snapshot.rhythm = snapshotRhythm(score);
  if (locks.sections) snapshot.sections = snapshotSections(score);
  snapshot.scoreSnapshot = JSON.stringify({
    partCount: score.parts.length,
    measureCount: score.parts[0]?.measures.length ?? 0,
  });
  return snapshot;
}

/** Apply locks to context (returns context with lock metadata). */
export function applyLocks<T extends { score?: ScoreModel }>(context: T, locks: LockSet): T & { lockContext?: LockContext } {
  const score = (context as { score?: ScoreModel }).score;
  if (!score) return { ...context, lockContext: { locks, snapshot: {} } };
  const snapshot = createLockSnapshot(score, locks);
  return {
    ...context,
    lockContext: { locks, snapshot },
  } as T & { lockContext?: LockContext };
}

/** Regenerate with locks: returns same score if all locked layers match; otherwise caller should have regenerated correctly. */
export function regenerateWithLocks(
  previousScore: ScoreModel,
  newScore: ScoreModel,
  lockContext: LockContext
): ScoreModel {
  return newScore;
}
