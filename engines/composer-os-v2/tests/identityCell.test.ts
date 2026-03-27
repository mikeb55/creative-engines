/**
 * ECM identity cell — ON vs OFF, determinism, validation safety.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import {
  countCellContourMatchesInGuitar,
  extractIdentityCellFromA,
} from '../core/goldenPath/identityCell';
import {
  countPartNotes,
  maxGlobalLeapBarryHarrisOrder,
  maxGuitarContourRepeatRun,
} from '../core/goldenPath/ecmShapingPass';

const ECM_BASE = {
  presetId: 'ecm_chamber' as const,
  ecmMode: 'ECM_METHENY_QUARTET' as const,
  styleStack: { primary: 'metheny' as const, weights: { primary: 1 as const } },
};

const SEED = 88_882;

function guitarPart(score: { parts: PartModel[] }): PartModel | undefined {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function testIdentityCellOnVsOffMotifCoherence(): boolean {
  const off = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: false });
  const on = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: true });
  if (!off.success || !on.success) return false;
  const gOff = guitarPart(off.score);
  const gOn = guitarPart(on.score);
  if (!gOff || !gOn) return false;
  const cell = extractIdentityCellFromA(off.score, off.context);
  if (cell.intervals.length < 2) return true;
  const mOff = countCellContourMatchesInGuitar(off.score, cell);
  const mOn = countCellContourMatchesInGuitar(on.score, cell);
  return mOn >= 2 && mOn >= mOff;
}

function testIdentityCellDeterministic(): boolean {
  const a = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: true });
  const b = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: true });
  if (!a.success || !b.success || !a.xml || !b.xml) return false;
  return a.xml === b.xml;
}

function testIdentityCellPreservesNoteCount(): boolean {
  const off = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: false });
  const on = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: true });
  if (!off.success || !on.success) return false;
  const gOff = guitarPart(off.score);
  const gOn = guitarPart(on.score);
  if (!gOff || !gOn) return false;
  return countPartNotes(gOff) === countPartNotes(gOn);
}

function testIdentityCellPassesPipeline(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, identityCellEnabled: true });
  if (!r.success) return false;
  const g = guitarPart(r.score);
  if (!g) return false;
  return (
    r.success &&
    r.integrityPassed &&
    r.behaviourGatesPassed &&
    r.strictBarMathPassed &&
    maxGlobalLeapBarryHarrisOrder(g) <= 5 &&
    maxGuitarContourRepeatRun(g) <= 2 &&
    !!r.xml
  );
}

export function runIdentityCellTests(): { name: string; ok: boolean }[] {
  return [
    ['Identity cell: motif coherence ON vs OFF', testIdentityCellOnVsOffMotifCoherence],
    ['Identity cell: deterministic XML', testIdentityCellDeterministic],
    ['Identity cell: guitar note count preserved', testIdentityCellPreservesNoteCount],
    ['Identity cell: gates + BH + anti-loop', testIdentityCellPassesPipeline],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
