/**
 * Song Mode — Donald Fagen slice v2: C1 early-phrase syncopation factor (gated to donald_fagen only).
 */

import { fagenSliceV2SyncopationBiasForPhrase } from '../core/goldenPath/songModeRhythmOverlayC1';

describe('fagenSliceV2SyncopationBiasForPhrase', () => {
  it('raises sync bias for phrases 0–2 only when primary is donald_fagen', () => {
    expect(fagenSliceV2SyncopationBiasForPhrase('donald_fagen', 0, 0.5)).toBeCloseTo(0.57, 5);
    expect(fagenSliceV2SyncopationBiasForPhrase('donald_fagen', 2, 0.6)).toBeCloseTo(0.67, 5);
    expect(fagenSliceV2SyncopationBiasForPhrase('donald_fagen', 3, 0.5)).toBe(0.5);
  });

  it('does not change other songwriters', () => {
    expect(fagenSliceV2SyncopationBiasForPhrase('beatles', 0, 0.55)).toBe(0.55);
    expect(fagenSliceV2SyncopationBiasForPhrase(undefined, 0, 0.55)).toBe(0.55);
  });

  it('clamps base input to 0–1 before adding', () => {
    expect(fagenSliceV2SyncopationBiasForPhrase('donald_fagen', 0, 0.96)).toBe(1);
  });
});
