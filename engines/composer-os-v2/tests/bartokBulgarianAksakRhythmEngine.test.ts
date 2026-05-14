/**
 * Bartók / Bulgarian aksak SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  BARTOK_BULGARIAN_AKSAK_CELL_SPECS,
  BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY,
  BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS,
  mergeBartokBulgarianAksakSqRhythmIntoMetadata,
} from '../core/rhythm/bartokBulgarianAksakRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS.filter((r) => r.startsWith('BG_RHYTHM_')).length;
  return n >= 30 && BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS.length === n;
}

function testDefaultPolicyB1(): boolean {
  const p = BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'bartok_bulgarian_aksak' &&
    p.subgroupVector.length === 3 &&
    p.subgroupVector[0] === 4 &&
    p.subgroupVector[1] === 2 &&
    p.subgroupVector[2] === 3 &&
    p.cellLibrary.join(',') === 'B1,B2,B3,B4,B5,B6' &&
    p.antiMetric === false
  );
}

function testCellSpecsB1ToB6(): boolean {
  const s = BARTOK_BULGARIAN_AKSAK_CELL_SPECS;
  if (s.B1.vector.join('+') !== '4+2+3' || s.B1.totalPulses !== 9) return false;
  if (s.B2.vector.join('+') !== '3+2+3' || s.B2.totalPulses !== 8) return false;
  if (s.B3.vector.join('+') !== '2+2+3' || s.B3.totalPulses !== 7) return false;
  if (s.B4.vector.join('+') !== '2+3' || s.B4.totalPulses !== 5) return false;
  if (s.B5.vector.join('+') !== '3+2' || s.B5.totalPulses !== 5) return false;
  if (s.B6.vector.join('+') !== '3+2+2+3' || s.B6.totalPulses !== 10) return false;
  return true;
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 'test' } as GenerationMetadata;
  const out = mergeBartokBulgarianAksakSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'bartok_bulgarian_aksak' &&
    out.sqRhythmEngineReceipts === BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS &&
    out.generatedAt === 'test'
  );
}

export function runBartokBulgarianAksakRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Aksak engine: 30+ BG_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Aksak engine: default policy B1 vector + cell library', testDefaultPolicyB1],
    ['Aksak engine: B1–B6 cell specs', testCellSpecsB1ToB6],
    ['Aksak engine: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
