/**
 * Free / proportional SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  FREE_PROPORTIONAL_DEFAULT_POLICY,
  FREE_PROPORTIONAL_RHYTHM_RECEIPTS,
  mergeFreeProportionalSqRhythmIntoMetadata,
} from '../core/rhythm/freeProportionalRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = FREE_PROPORTIONAL_RHYTHM_RECEIPTS.filter((r) => r.startsWith('FP_RHYTHM_')).length;
  return n >= 30 && FREE_PROPORTIONAL_RHYTHM_RECEIPTS.length === n;
}

function testPolicyAntiMetricTimeField(): boolean {
  const p = FREE_PROPORTIONAL_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'free_proportional' &&
    p.primaryAbstraction === 'time_field' &&
    p.antiMetric === true &&
    p.dynamicDensityDecoupled === true &&
    p.composerProfiles.join(',') === 'dutilleux,ligeti,crumb,lachenmann'
  );
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 't0' } as GenerationMetadata;
  const out = mergeFreeProportionalSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'free_proportional' &&
    out.sqRhythmEngineReceipts === FREE_PROPORTIONAL_RHYTHM_RECEIPTS &&
    out.generatedAt === 't0'
  );
}

export function runFreeProportionalRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Free/proportional engine: 30+ FP_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Free/proportional engine: time_field policy + antiMetric + profiles', testPolicyAntiMetricTimeField],
    ['Free/proportional engine: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
