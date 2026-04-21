import { describe, expect, it } from 'vitest';
import { buildSongModeCompareInsights } from '../src/utils/songModeCompareViewModel';

describe('songModeCompareViewModel', () => {
  it('builds deterministic compare insights for stronger contrast and source mix', () => {
    const lines = buildSongModeCompareInsights(
      {
        label: 'Run A',
        shape: { densityDeltaBMinusA: 0.08, openingVsReturnDelta: 0.12, returnVariationType: 'lighter_texture' },
        profile: { behaviourSourceIds: ['a1'] },
      },
      {
        label: 'Run B',
        shape: { densityDeltaBMinusA: 0.22, openingVsReturnDelta: 0.35, returnVariationType: 'harmonic_recolour' },
        profile: { behaviourSourceIds: ['a1', 'a2', 'a3'] },
      }
    );
    expect(lines.join(' | ')).toContain('Run B shows stronger B-vs-A density contrast.');
    expect(lines.join(' | ')).toContain('Run B shows clearer opening-vs-return separation.');
    expect(lines.join(' | ')).toContain('Run B uses a broader behaviour-source mix.');
  });
});
