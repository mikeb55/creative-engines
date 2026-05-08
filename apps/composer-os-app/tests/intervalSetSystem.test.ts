import { describe, expect, it } from 'vitest';
import {
  buildThreadgillForm,
  buildThreadgillIntervalSet,
  triadAdjacentIntervalsInPool,
} from '@composer-os/core/motif/intervalSetSystem';

describe('intervalSetSystem (Threadgill)', () => {
  it('buildThreadgillIntervalSet returns six parallel transpositions of the sorted seed spine', () => {
    const is = buildThreadgillIntervalSet([60, 61, 64], [1, 3, 5]);
    expect(is.closedFamily).toHaveLength(6);
    expect(is.intervals).toEqual([1, 3, 5]);
  });

  it('each closed-family triad keeps adjacent steps drawn from the interval pool', () => {
    const pool = [1, 3, 5];
    const is = buildThreadgillIntervalSet([60, 61, 64], pool);
    for (const ch of is.closedFamily) {
      expect(triadAdjacentIntervalsInPool(ch, pool)).toBe(true);
    }
  });

  it('buildThreadgillForm yields 2–4 sections with distinct orchestrationPattern', () => {
    const f = buildThreadgillForm('henry_threadgill', 1234, 32);
    expect(f.sections.length).toBeGreaterThanOrEqual(2);
    expect(f.sections.length).toBeLessThanOrEqual(4);
    const patterns = f.sections.map((s) => s.orchestrationPattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('buildThreadgillForm is deterministic for the same seed', () => {
    const a = buildThreadgillForm('henry_threadgill', 999, 64);
    const b = buildThreadgillForm('henry_threadgill', 999, 64);
    expect(a.sections.map((s) => s.id)).toEqual(b.sections.map((s) => s.id));
    expect(a.sections.map((s) => s.orchestrationPattern)).toEqual(b.sections.map((s) => s.orchestrationPattern));
    expect(a.allowPermutation).toBe(b.allowPermutation);
  });
});
