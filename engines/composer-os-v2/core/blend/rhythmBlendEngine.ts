/**
 * Rhythm blend helpers — LCM merge + blend receipt keys (V43).
 */

import { lcm } from '../rhythm/rhythmPulseGrid';
export { mergeRhythmLayers } from '../rhythm/rhythmLayerMerge';
export type {
  ConflictStrategy,
  MergeLayerInput,
  MergedLayerOutput,
  MergedPulseEvent,
} from '../rhythm/rhythmLayerMerge';

import type { RhythmEngineId } from './rhythmBlendTypes';

/** Representative context-key tokens per catalog engine (prefix-aligned). */
const CONTEXT_KEYS_BY_ENGINE: Record<RhythmEngineId, readonly string[]> = {
  felaKuti: ['fk:straight', 'fk:swing', 'fk:afrobeat', 'fk:d1_static_vamp'],
  greekRebetiko: ['gr:zeibekiko', 'gr:hasapiko', 'gr:rebetiko_grid'],
  brazilian: ['br:bossa-nova', 'br:samba', 'br:anticipation'],
  secondLine: ['sl:second-line', 'sl:big-four', 'sl:subdivisionWarp'],
  cuban: ['cu:son', 'cu:rumba', 'cu:clave'],
};

export function resolveBlendContextKeys(engineA: RhythmEngineId, engineB: RhythmEngineId): string[] {
  return [...CONTEXT_KEYS_BY_ENGINE[engineA], ...CONTEXT_KEYS_BY_ENGINE[engineB]];
}

export function lcmGridStepsForPair(gridStepsA: number, gridStepsB: number): number {
  return lcm(gridStepsA, gridStepsB);
}
