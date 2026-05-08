import { describe, expect, it } from 'vitest';
import { buildMingusSuiteForm } from '@composer-os/core/motif/mingusSuiteForm';

describe('mingusSuiteForm', () => {
  const ORDER = [
    'free_intro',
    'extended_blues',
    'collective_pedal',
    'gospel_shout',
    'elegy_coda',
  ] as const;

  it('buildMingusSuiteForm returns five sections in canonical suite order', () => {
    const f = buildMingusSuiteForm('charles_mingus', 42, 64);
    expect(f.sections).toHaveLength(5);
    expect(f.sections.map((s) => s.type)).toEqual([...ORDER]);
  });

  it('gospel_shout section has gospelShoutEnabled: true', () => {
    const f = buildMingusSuiteForm('charles_mingus', 1, 40);
    const g = f.sections.find((s) => s.type === 'gospel_shout');
    expect(g?.gospelShoutEnabled).toBe(true);
  });

  it('elegy_coda has cadenceType ambiguous_minor', () => {
    const f = buildMingusSuiteForm('charles_mingus', 2, 40);
    const e = f.sections.find((s) => s.type === 'elegy_coda');
    expect(e?.cadenceType).toBe('ambiguous_minor');
  });

  it('same seed yields identical form', () => {
    const a = buildMingusSuiteForm('charles_mingus', 9001, 80);
    const b = buildMingusSuiteForm('charles_mingus', 9001, 80);
    expect(a.id).toBe(b.id);
    expect(a.sections.map((s) => s.id)).toEqual(b.sections.map((s) => s.id));
    expect(a.sections.map((s) => s.durationBars)).toEqual(b.sections.map((s) => s.durationBars));
    expect(a.allowPermutation).toBe(b.allowPermutation);
  });

  it('section bar sum matches totalBars (within 10% tolerance)', () => {
    const total = 32;
    const f = buildMingusSuiteForm('charles_mingus', 123, total);
    const sum = f.sections.reduce((n, s) => n + s.durationBars, 0);
    expect(Math.abs(sum - total) / total).toBeLessThanOrEqual(0.1);
  });
});
