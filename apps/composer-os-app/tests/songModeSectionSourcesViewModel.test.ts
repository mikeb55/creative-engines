import { describe, expect, it } from 'vitest';
import { buildSongModeSectionSourceRows } from '../src/utils/songModeSectionSourcesViewModel';

describe('buildSongModeSectionSourceRows', () => {
  it('builds per-section source and tag rows from behaviour descriptors', () => {
    const rows = buildSongModeSectionSourceRows([
      {
        sliceId: 'bacharach',
        densityBiasByRole: { BRIDGE_LIFT: 0.03 },
        harmonicColourBiasByRole: { BRIDGE_LIFT: 0.08, RETURN: 0.04 },
        returnVariationType: 'harmonic_recolour',
      },
      {
        sliceId: 'style_sophisticated_pop',
        densityBiasByRole: { BRIDGE_LIFT: 0.04 },
      },
    ]);

    const bridge = rows.find((r) => r.role === 'BRIDGE_LIFT');
    const ret = rows.find((r) => r.role === 'RETURN');

    expect(bridge?.sectionLabel).toBe('B / Bridge Lift');
    expect(bridge?.sources).toEqual(['bacharach', 'style_sophisticated_pop']);
    expect(bridge?.tags).toContain('density_bias');
    expect(bridge?.tags).toContain('colour_bias');
    expect(ret?.tags).toContain('return_variation:harmonic_recolour');
  });
});
