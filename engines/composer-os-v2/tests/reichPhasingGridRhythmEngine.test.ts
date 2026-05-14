/**
 * Reich / Phasing Grid SQ rhythm engine — policy + receipt merge (metadata).
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  REICH_PHASING_GRID_DEFAULT_POLICY,
  REICH_PHASING_GRID_RHYTHM_RECEIPTS,
  mergeReichPhasingGridSqRhythmIntoMetadata,
} from '../core/rhythm/reichPhasingGridRhythmEngine';

function testReceiptCountAtLeast30(): boolean {
  const n = REICH_PHASING_GRID_RHYTHM_RECEIPTS.filter((r) => r.startsWith('RP_RHYTHM_')).length;
  return n >= 30 && REICH_PHASING_GRID_RHYTHM_RECEIPTS.length === n;
}

function testPolicyModules(): boolean {
  const p = REICH_PHASING_GRID_DEFAULT_POLICY;
  return (
    p.rhythmEngineId === 'reich_phasing_grid' &&
    p.modules.includes('true_phase_process') &&
    p.modules.includes('post_phase_pattern_music') &&
    p.phasingOperators.includes('stepped_rotation') &&
    p.antiMetric === false &&
    p.baseCycleLengthDefault === 12
  );
}

function testMergeMetadata(): boolean {
  const base = { generatedAt: 'rp0' } as GenerationMetadata;
  const out = mergeReichPhasingGridSqRhythmIntoMetadata(base);
  return (
    out.sqRhythmEngineId === 'reich_phasing_grid' &&
    out.sqRhythmEngineReceipts === REICH_PHASING_GRID_RHYTHM_RECEIPTS &&
    out.generatedAt === 'rp0'
  );
}

export function runReichPhasingGridRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Reich phasing grid: 30+ RP_RHYTHM_* receipts', testReceiptCountAtLeast30],
    ['Reich phasing grid: dual modules + operators + cycle 12 default', testPolicyModules],
    ['Reich phasing grid: merge metadata attaches sq rhythm id + receipts', testMergeMetadata],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
