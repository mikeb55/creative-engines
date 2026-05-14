/**
 * Baroque dance SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  BAROQUE_DANCE_CLASS_SPECS,
  BAROQUE_DANCE_DEFAULT_POLICY,
  BAROQUE_DANCE_RHYTHM_RECEIPTS,
  mergeBaroqueDanceSqRhythmIntoMetadata,
} from '../core/rhythm/baroqueDanceRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = BAROQUE_DANCE_RHYTHM_RECEIPTS.filter((r) => r.startsWith('BD_RHYTHM_')).length;
  return n >= 30 && BAROQUE_DANCE_RHYTHM_RECEIPTS.length === n;
}

function testPolicyDanceLibrary(): boolean {
  const p = BAROQUE_DANCE_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'baroque_dance' &&
    p.antiMetric === false &&
    p.hemiolaEnabledForFrenchCourante === true &&
    p.groundBassEnabledBd9 === true &&
    p.danceClassLibrary.includes('BD9') &&
    p.danceClassLibrary.includes('pavane')
  );
}

function testClassSpecsBd1Bd9(): boolean {
  return (
    BAROQUE_DANCE_CLASS_SPECS.BD1.dance === 'Sarabande' &&
    BAROQUE_DANCE_CLASS_SPECS.BD6.pickup === 'half_bar' &&
    BAROQUE_DANCE_CLASS_SPECS.BD7.pickup === 'one_beat' &&
    BAROQUE_DANCE_CLASS_SPECS.BD9.dance.includes('Chaconne')
  );
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 't1' } as GenerationMetadata;
  const out = mergeBaroqueDanceSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'baroque_dance' &&
    out.sqRhythmEngineReceipts === BAROQUE_DANCE_RHYTHM_RECEIPTS &&
    out.generatedAt === 't1'
  );
}

export function runBaroqueDanceRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Baroque dance engine: 30+ BD_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Baroque dance engine: policy library + hemiola + ground + antiMetric false', testPolicyDanceLibrary],
    ['Baroque dance engine: BD1/BD6/BD7/BD9 class specs', testClassSpecsBd1Bd9],
    ['Baroque dance engine: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
