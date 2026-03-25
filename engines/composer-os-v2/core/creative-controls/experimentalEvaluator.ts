/**
 * Flags for manifests / diagnostics when non-stable creative control is active.
 */

import type { CreativeControlLevel } from './creativeControlTypes';

export function isExperimentalCreativeLevel(level: CreativeControlLevel | undefined): boolean {
  return level === 'balanced' || level === 'surprise';
}

export function experimentalLabelForLevel(level: CreativeControlLevel | undefined): string | undefined {
  if (level == null || level === 'stable') return undefined;
  return level === 'surprise' ? 'surprise_seed_mutation' : 'balanced_seed_mutation';
}
