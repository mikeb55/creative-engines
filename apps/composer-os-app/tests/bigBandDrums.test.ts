import { describe, expect, it } from 'vitest';
import {
  BIG_BAND_DRUM_STYLES,
  bigBandDrumStylesForBand,
} from '@engine/bigBandDrums.js';

describe('BIG_BAND_DRUM_STYLES', () => {
  it('has at least 10 patterns with two per band style', () => {
    expect(BIG_BAND_DRUM_STYLES.length).toBeGreaterThanOrEqual(10);
    for (const band of ['basie', 'ellington', 'kenton', 'rich', 'thad'] as const) {
      expect(bigBandDrumStylesForBand(band).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses 16th-step hit index lanes', () => {
    for (const entry of BIG_BAND_DRUM_STYLES) {
      for (const lane of ['kicks', 'snares', 'hats', 'ride'] as const) {
        const hits = entry.patterns[lane];
        expect(hits.length).toBeGreaterThan(0);
        for (const h of hits) {
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThan(16);
        }
      }
    }
  });
});
