/**
 * Jewish / Klezmer SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  JEWISH_KLEZMER_DEFAULT_POLICY,
  JEWISH_KLEZMER_RHYTHM_RECEIPTS,
  mergeJewishKlezmerSqRhythmIntoMetadata,
} from '../core/rhythm/jewishKlezmerRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = JEWISH_KLEZMER_RHYTHM_RECEIPTS.filter((r) => r.startsWith('KL_RHYTHM_')).length;
  return n >= 30 && JEWISH_KLEZMER_RHYTHM_RECEIPTS.length === n;
}

function testPolicy(): boolean {
  const p = JEWISH_KLEZMER_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'jewish_klezmer' &&
    p.antiMetric === false &&
    p.doinaAntiMetric === true &&
    p.primaryAbstraction === 'dance_gait_family' &&
    p.gaitLibrary.length === 6 &&
    p.gaitLibrary.includes('KL1') &&
    p.gaitLibrary.includes('KL6') &&
    p.feltSubdivisionLayer === true &&
    p.shostakovichVariant === true &&
    p.portamentoStructural === true &&
    p.modalCoupling.includes('freygish')
  );
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 'kl0' } as GenerationMetadata;
  const out = mergeJewishKlezmerSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'jewish_klezmer' &&
    out.sqRhythmEngineReceipts === JEWISH_KLEZMER_RHYTHM_RECEIPTS &&
    out.generatedAt === 'kl0'
  );
}

export function runJewishKlezmerRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Jewish / Klezmer: 30+ KL_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Jewish / Klezmer: policy gait library + doina antiMetric', testPolicy],
    ['Jewish / Klezmer: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
