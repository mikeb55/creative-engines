/**
 * Composer OS V2 — Lock system tests
 */

import { applyLocks, createLockSnapshot, regenerateWithLocks } from '../core/control/lockManager';
import { validateLockIntegrity } from '../core/control/lockValidation';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testLockSnapshotMelody(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 2, 2));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const snap = createLockSnapshot(score, { melody: true });
  return !!snap.melody && snap.melody.pitchesByBar.get(1)?.length === 2;
}

function testApplyLocks(): boolean {
  const r = runGoldenPath(60);
  const ctx = applyLocks({ score: r.score }, { melody: true, harmony: true });
  return !!ctx.lockContext?.locks.melody && !!ctx.lockContext?.snapshot.melody;
}

function testLockIntegrityUnchanged(): boolean {
  const r = runGoldenPath(61);
  const ctx = applyLocks({ score: r.score }, { melody: true });
  if (!ctx.lockContext) return false;
  const valid = validateLockIntegrity(r.score, r.score, ctx.lockContext);
  return valid.valid;
}

function testLockIntegrityModifiedFails(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 2));
  const orig = createScore('O', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const m2 = createMeasure(1, 'Cmaj7');
  addEvent(m2, createNote(62, 0, 2));
  const modified = createScore('M', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m2],
  }]);
  const ctx = applyLocks({ score: orig }, { melody: true });
  if (!ctx.lockContext) return false;
  const result = validateLockIntegrity(orig, modified, ctx.lockContext);
  return !result.valid;
}

function testRegenerateWithLocks(): boolean {
  const r = runGoldenPath(62);
  const ctx = applyLocks({ score: r.score }, { bass: true });
  if (!ctx.lockContext) return false;
  const out = regenerateWithLocks(r.score, r.score, ctx.lockContext);
  return out === r.score;
}

export function runControlTests(): { name: string; ok: boolean }[] {
  return [
    ['Lock snapshot captures melody', testLockSnapshotMelody],
    ['Apply locks to context', testApplyLocks],
    ['Lock integrity unchanged passes', testLockIntegrityUnchanged],
    ['Lock integrity modified fails', testLockIntegrityModifiedFails],
    ['Regenerate with locks returns score', testRegenerateWithLocks],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
