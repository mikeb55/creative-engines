/**
 * Deterministic seed offsets — never touches form, bar math, or structural planners.
 * Only the numeric seed changes; all mutations are bounded integers.
 */

import type { CreativeControlLevel } from './creativeControlTypes';

const BALANCED_MASK = 0x1f;
const SURPRISE_MASK = 0xff;

function toPositive31(n: number): number {
  return (n >>> 0) & 0x7fffffff;
}

/**
 * XOR-based nudge — same inputs → same output (reproducible).
 */
export function applyCreativeSeedMutation(baseSeed: number, level: CreativeControlLevel): number {
  if (level === 'stable') return baseSeed;
  const b = toPositive31(baseSeed);
  if (level === 'balanced') {
    const salt = (b * 0x9e37) & BALANCED_MASK;
    return toPositive31(b ^ (salt + 0x1357));
  }
  const salt = (b * 0x85ebca6b) & SURPRISE_MASK;
  return toPositive31(b ^ (salt + 0x2468ace));
}
