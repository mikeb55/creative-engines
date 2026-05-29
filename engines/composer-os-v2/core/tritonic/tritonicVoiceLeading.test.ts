/**
 * V98 — Tritonic cell voice-leading engine.
 */

import { buildTritonicCell, buildTritonicDictionary } from './tritonicCell';
import {
  getBestVoiceLeading,
  getVoiceLeadingCandidates,
  pitchClassMovement,
} from './tritonicVoiceLeading';

describe('getVoiceLeadingCandidates (V98)', () => {
  it('returns results sorted by smoothness descending', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const pool = dict.cells;
    const results = getVoiceLeadingCandidates(from, pool);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.smoothness).toBeGreaterThanOrEqual(results[i]!.smoothness);
    }
  });

  it('never assigns voice movement beyond 6 semitones per voice', () => {
    const dict = buildTritonicDictionary();
    const from = buildTritonicCell([0, 5, 10], 'quartal');
    const pool = dict.cells;
    const results = getVoiceLeadingCandidates(from, pool);
    for (const r of results) {
      expect(r.voiceMovement).toHaveLength(3);
      for (const m of r.voiceMovement) {
        expect(Math.abs(m)).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('getBestVoiceLeading (V98)', () => {
  it('returns the candidate with highest smoothness', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const pool = dict.cells;
    const candidates = getVoiceLeadingCandidates(from, pool);
    const best = getBestVoiceLeading(from, pool);
    expect(best.valid).toBe(true);
    expect(best.smoothness).toBe(candidates[0]!.smoothness);
    expect(best.to).toBe(candidates[0]!.to);
  });
});

describe('quartal → quartal smoke (V98)', () => {
  it('produces valid voice-leading results within quartal family', () => {
    const dict = buildTritonicDictionary();
    const from = dict.byFamily.quartal[0]!;
    const quartalPool = dict.byFamily.quartal;
    const results = getVoiceLeadingCandidates(from, quartalPool);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.valid).toBe(true);
      expect(r.from.family).toBe('quartal');
      expect(r.to.family).toBe('quartal');
      expect(r.smoothness).toBeGreaterThanOrEqual(0);
      expect(r.smoothness).toBeLessThanOrEqual(1);
    }
    const best = getBestVoiceLeading(from, quartalPool);
    expect(best.valid).toBe(true);
    expect(best.smoothness).toBe(results[0]!.smoothness);
  });
});

describe('pitchClassMovement', () => {
  it('wraps at octave boundary within ±6', () => {
    expect(pitchClassMovement(11, 0)).toBe(1);
    expect(pitchClassMovement(0, 11)).toBe(-1);
    expect(Math.abs(pitchClassMovement(0, 6))).toBe(6);
  });
});
