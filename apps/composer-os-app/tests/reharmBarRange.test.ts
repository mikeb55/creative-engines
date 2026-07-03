import { describe, expect, it } from 'vitest';
import { barIndexFromPlaybackBeat, clampBarToForm } from '../src/utils/reharmBarRange';

describe('reharmBarRange', () => {
  it('barIndexFromPlaybackBeat maps beat 0 to bar 1', () => {
    expect(barIndexFromPlaybackBeat(0, 4)).toBe(1);
  });

  it('barIndexFromPlaybackBeat maps beat 4 in 4/4 to bar 2', () => {
    expect(barIndexFromPlaybackBeat(4, 4)).toBe(2);
  });

  it('barIndexFromPlaybackBeat clamps invalid playback to bar 1', () => {
    expect(barIndexFromPlaybackBeat(-1, 4)).toBe(1);
    expect(barIndexFromPlaybackBeat(NaN, 4)).toBe(1);
  });

  it('clampBarToForm clamps to song form', () => {
    expect(clampBarToForm(0, 32)).toBe(1);
    expect(clampBarToForm(99, 32)).toBe(32);
    expect(clampBarToForm(8, 32)).toBe(8);
  });
});