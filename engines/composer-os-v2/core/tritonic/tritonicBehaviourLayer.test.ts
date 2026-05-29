/**
 * V99 — Wayne behaviour layer for tritonic voice-leading.
 */

import { buildTritonicCell, buildTritonicDictionary } from './tritonicCell';
import { applyWayneBehaviour } from './tritonicBehaviourLayer';
import { getVoiceLeadingCandidates } from './tritonicVoiceLeading';

function defaultOptions(overrides: Partial<Parameters<typeof applyWayneBehaviour>[1]> = {}) {
  return {
    oddityScore: 0,
    delayedResolution: false,
    melodyPriority: false,
    ...overrides,
  };
}

describe('applyWayneBehaviour oddityScore (V99)', () => {
  it('high oddityScore promotes higher-tension cells to the front', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const candidates = getVoiceLeadingCandidates(from, dict.cells);
    expect(candidates.length).toBeGreaterThan(1);

    const smoothFirst = applyWayneBehaviour(candidates, defaultOptions({ oddityScore: 0 }));
    const oddFirst = applyWayneBehaviour(candidates, defaultOptions({ oddityScore: 1 }));

    expect(oddFirst[0]!.to.tension).toBeGreaterThanOrEqual(smoothFirst[0]!.to.tension);
    if (candidates.some((c) => c.smoothness < smoothFirst[0]!.smoothness)) {
      expect(oddFirst[0]!.smoothness).toBeLessThanOrEqual(smoothFirst[0]!.smoothness);
    }
  });
});

describe('applyWayneBehaviour delayedResolution (V99)', () => {
  it('removes candidates whose target cell tension is below 0.5', () => {
    const low = buildTritonicCell([0, 5, 10], 'quartal');
    const high = buildTritonicCell([0, 1, 6], 'cluster');
    expect(low.tension).toBeLessThan(0.5);
    expect(high.tension).toBeGreaterThanOrEqual(0.5);

    const from = low;
    const candidates = getVoiceLeadingCandidates(from, [low, high]);
    const filtered = applyWayneBehaviour(
      candidates,
      defaultOptions({ delayedResolution: true, oddityScore: 0 }),
    );

    expect(filtered.every((c) => c.to.tension >= 0.5)).toBe(true);
    expect(filtered.some((c) => c.to === high)).toBe(true);
    expect(filtered.every((c) => c.to !== low)).toBe(true);
  });
});

describe('applyWayneBehaviour melodyPriority stub (V99)', () => {
  it('accepts melodyPriority without changing output order', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.suspended[0]!;
    const candidates = getVoiceLeadingCandidates(from, dict.cells);

    const without = applyWayneBehaviour(candidates, defaultOptions({ melodyPriority: false }));
    const withPriority = applyWayneBehaviour(candidates, defaultOptions({ melodyPriority: true }));

    expect(withPriority).toEqual(without);
  });
});

describe('applyWayneBehaviour non-empty guarantee (V99)', () => {
  it('never returns empty when input is non-empty', () => {
    const low = buildTritonicCell([0, 5, 10], 'quartal');
    const candidates = getVoiceLeadingCandidates(low, [low]);
    expect(candidates.length).toBeGreaterThan(0);

    const result = applyWayneBehaviour(
      candidates,
      defaultOptions({ delayedResolution: true, oddityScore: 1, melodyPriority: true }),
    );
    expect(result.length).toBeGreaterThan(0);
  });
});
