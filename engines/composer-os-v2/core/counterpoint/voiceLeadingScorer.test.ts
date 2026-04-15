import {
  scoreBizziVertical,
  scoreTymoczkoHorizontal,
  scoreSpeciesLitePenalties,
  scoreThreeVoices,
} from './voiceLeadingScorer';

describe('voiceLeadingScorer', () => {
  test('1) scoreBizziVertical: semitone clash (iv=1) returns 0', () => {
    expect(scoreBizziVertical(1, 0, 7, 0)).toBe(0);
  });

  test('2) scoreBizziVertical: tritone V2-Bass, no consonant V1 returns 0', () => {
    expect(scoreBizziVertical(11, 6, 0, 0)).toBe(0);
  });

  test('3) scoreBizziVertical: all 3rds between voices returns >0.8', () => {
    const score = scoreBizziVertical(4, 0, 8, 0);
    expect(score).toBeGreaterThan(0.8);
  });

  test('4) scoreBizziVertical: unison V1=V2 returns 0', () => {
    expect(scoreBizziVertical(0, 0, 7, 0)).toBe(0);
  });

  test('5) scoreTymoczkoHorizontal: all stationary returns 1.0', () => {
    expect(scoreTymoczkoHorizontal(60, 60, 64, 64, 48, 48)).toBe(1.0);
  });

  test('6) scoreTymoczkoHorizontal: total movement >11 returns <0.5', () => {
    const score = scoreTymoczkoHorizontal(60, 72, 64, 76, 48, 60);
    expect(score).toBeLessThan(0.5);
  });

  test('7) scoreSpeciesLitePenalties: parallel 5ths returns <0.7', () => {
    const score = scoreSpeciesLitePenalties(60, 62, 67, 69, 48, 50);
    expect(score).toBeLessThan(0.7);
  });

  test('8) scoreSpeciesLitePenalties: parallel octaves returns <0.6', () => {
    const score = scoreSpeciesLitePenalties(60, 62, 72, 74, 48, 50);
    expect(score).toBeLessThan(0.6);
  });

  test('9) scoreSpeciesLitePenalties: contrary motion returns 1.0', () => {
    const score = scoreSpeciesLitePenalties(60, 62, 64, 62, 48, 49);
    expect(score).toBe(1.0);
  });

  test('10) scoreThreeVoices: vertical-only (no prev) equals bizzi score', () => {
    const bizzi = scoreBizziVertical(4, 0, 8, 0);
    const combined = scoreThreeVoices({
      pc1: 4,
      pc2: 0,
      pcBass: 8,
      keyRoot: 0,
    });
    expect(combined).toBe(bizzi);
  });
});
