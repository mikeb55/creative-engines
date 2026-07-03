import { describe, expect, it } from 'vitest';
import {
  emotionalDriftOptionLabel,
  sliderToTargetReharmDrift,
  VAULT_EMOTIONAL_DRIFT_OPTIONS,
} from '../src/utils/reharmDriftUi';

describe('reharmDriftUi', () => {
  it('slider endpoints map to neutral and more-cinematic', () => {
    expect(sliderToTargetReharmDrift(0)).toBe('neutral');
    expect(sliderToTargetReharmDrift(1)).toBe('more-cinematic');
  });

  it('slider 0.4 maps to brighter (step 0.1 grid)', () => {
    expect(sliderToTargetReharmDrift(0.4)).toBe('brighter');
  });

  it('emotionalDriftOptionLabel resolves known drift values', () => {
    for (const o of VAULT_EMOTIONAL_DRIFT_OPTIONS) {
      expect(emotionalDriftOptionLabel(o.value)).toBe(o.label);
    }
  });
});