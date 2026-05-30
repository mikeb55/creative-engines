/**
 * V104p5 — Tritonic behaviour biases (0..1 floats).
 */

import { buildTritonicCell, buildTritonicDictionary } from './tritonicCell';
import {
  applyTritonicBehaviourBiases,
  biasSteeredResolutionEligibility,
  biasSteeredStartCellSort,
  isNeutralTritonicBehaviourBiases,
  neutralTritonicBehaviourBiases,
  nudgeTimelineForBehaviourBiases,
  resolveTritonicBehaviourBiases,
} from './tritonicBehaviourBiases';
import { realiseTritonic } from './tritonicRealisation';
import { scheduleTritonicTimeline } from './tritonicTimeline';
import { getVoiceLeadingCandidates } from './tritonicVoiceLeading';
import { createTritonicStateMachine } from './tritonicStateMachine';

describe('TritonicBehaviourBiases defaults (V104p5)', () => {
  it('neutral profile is all 0.5', () => {
    const biases = neutralTritonicBehaviourBiases();
    expect(biases.tension).toBe(0.5);
    expect(biases.resolutionDelay).toBe(0.5);
    expect(biases.density).toBe(0.5);
    expect(biases.registralSpread).toBe(0.5);
    expect(biases.contourBias).toBe(0.5);
    expect(biases.cadenceAvoidance).toBe(0.5);
    expect(biases.rhythmicDisplacement).toBe(0.5);
    expect(biases.anchorAdhesion).toBe(0.5);
    expect(biases.motifSingability).toBe(0.5);
    expect(isNeutralTritonicBehaviourBiases(biases)).toBe(true);
  });

  it('resolveTritonicBehaviourBiases clamps partial overrides to 0..1', () => {
    const resolved = resolveTritonicBehaviourBiases({ tension: 1.5, density: -0.2 });
    expect(resolved.tension).toBe(1);
    expect(resolved.density).toBe(0);
    expect(resolved.contourBias).toBe(0.5);
  });
});

describe('applyTritonicBehaviourBiases (V104p5)', () => {
  it('neutral biases preserve Wayne ranking order', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const candidates = getVoiceLeadingCandidates(from, dict.cells);
    const neutral = neutralTritonicBehaviourBiases();
    const ranked = applyTritonicBehaviourBiases(candidates, neutral);
    expect(ranked.map((c) => c.to.notes.join(','))).toEqual(candidates.map((c) => c.to.notes.join(',')));
  });

  it('high tension bias promotes higher-tension targets', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const candidates = getVoiceLeadingCandidates(from, dict.cells);
    expect(candidates.length).toBeGreaterThan(1);

    const neutral = applyTritonicBehaviourBiases(candidates, neutralTritonicBehaviourBiases());
    const tense = applyTritonicBehaviourBiases(candidates, {
      ...neutralTritonicBehaviourBiases(),
      tension: 1,
    }, createTritonicStateMachine());

    expect(tense[0]!.to.tension).toBeGreaterThanOrEqual(neutral[0]!.to.tension);
  });
});

describe('bias steering hooks (V104p5)', () => {
  it('high tension start-cell sort prefers higher tension in BB mode', () => {
    const dict = buildTritonicDictionary();
    const modeSort = (a: { tension: number }, b: { tension: number }) => b.tension - a.tension;
    const neutralStart = biasSteeredStartCellSort(dict.cells, modeSort, neutralTritonicBehaviourBiases())[0]!;
    const tenseStart = biasSteeredStartCellSort(dict.cells, modeSort, {
      ...neutralTritonicBehaviourBiases(),
      tension: 1,
    })[0]!;
    expect(tenseStart.tension).toBeGreaterThanOrEqual(neutralStart.tension);
  });

  it('cadenceAvoidance lowers resolution eligibility on low-tension cells', () => {
    const base = biasSteeredResolutionEligibility(0.8, 0.2, neutralTritonicBehaviourBiases());
    const avoid = biasSteeredResolutionEligibility(0.8, 0.2, {
      ...neutralTritonicBehaviourBiases(),
      cadenceAvoidance: 1,
    });
    expect(avoid).toBeLessThan(base);
  });

  it('neutral timeline nudge is identity', () => {
    const cells = [buildTritonicCell([0, 5, 10], 'quartal'), buildTritonicCell([0, 1, 6], 'cluster')];
    const base = scheduleTritonicTimeline(cells, 'bb');
    const nudged = nudgeTimelineForBehaviourBiases(base, neutralTritonicBehaviourBiases());
    expect(nudged).toEqual(base);
  });
});

describe('realiseTritonic with behaviourBiases (V104p5)', () => {
  it('neutral biases match default realisation checksum', () => {
    const dict = buildTritonicDictionary();
    const baseCtx = {
      mode: 'bb' as const,
      cells: dict.cells,
      behaviourOptions: { oddityScore: 0.5, delayedResolution: false, melodyPriority: false },
    };
    const defaultResult = realiseTritonic(baseCtx);
    const explicitNeutral = realiseTritonic({
      ...baseCtx,
      behaviourBiases: neutralTritonicBehaviourBiases(),
    });
    expect(explicitNeutral.checksum).toBe(defaultResult.checksum);
    expect(explicitNeutral.phrases.flat().map((c) => c.notes.join(','))).toEqual(
      defaultResult.phrases.flat().map((c) => c.notes.join(',')),
    );
  });
});
