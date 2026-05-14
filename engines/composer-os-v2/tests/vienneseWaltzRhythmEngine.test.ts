/**
 * Viennese Waltz SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  VIENNESE_WALTZ_DEFAULT_POLICY,
  VIENNESE_WALTZ_RHYTHM_RECEIPTS,
  mergeVienneseWaltzSqRhythmIntoMetadata,
} from '../core/rhythm/vienneseWaltzRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = VIENNESE_WALTZ_RHYTHM_RECEIPTS.filter((r) => r.startsWith('VW_RHYTHM_')).length;
  return n >= 30 && VIENNESE_WALTZ_RHYTHM_RECEIPTS.length === n;
}

function testPolicy(): boolean {
  const p = VIENNESE_WALTZ_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'viennese_waltz' &&
    p.meter === '3/4' &&
    p.antiMetric === false &&
    p.primaryAbstraction === 'one_bar_rotational_unit' &&
    p.vienneseLiltEnabled === true &&
    p.beatWeightProfile[0] === 'w1_high' &&
    p.beatWeightProfile[1] === 'w2_medium' &&
    p.beatWeightProfile[2] === 'w3_low' &&
    p.phraseLevelRubato === true &&
    p.liltTimingOffsetPercentMin === 3 &&
    p.liltTimingOffsetPercentMax === 8 &&
    p.styleProfiles.length === 4 &&
    p.styleProfiles.includes('standard') &&
    p.styleProfiles.includes('ironic_grotesque') &&
    p.contrastVsBaroqueMinuet === true
  );
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 'vw0' } as GenerationMetadata;
  const out = mergeVienneseWaltzSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'viennese_waltz' &&
    out.sqRhythmEngineReceipts === VIENNESE_WALTZ_RHYTHM_RECEIPTS &&
    out.generatedAt === 'vw0'
  );
}

export function runVienneseWaltzRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Viennese waltz: 30+ VW_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Viennese waltz: policy meter + tactus contrast', testPolicy],
    ['Viennese waltz: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
