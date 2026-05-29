/**
 * V97 — Tritonic cell dictionary.
 */

import {
  buildTritonicCell,
  buildTritonicDictionary,
  computeIntervalProfile,
  computeTensionFromIntervalProfile,
} from './tritonicCell';

const FAMILIES = ['quartal', 'cluster', 'suspended', 'shorter_floating', 'bergonzi'] as const;

describe('buildTritonicDictionary (V97)', () => {
  it('1: returns all 5 families in byFamily', () => {
    const dict = buildTritonicDictionary();
    for (const family of FAMILIES) {
      expect(dict.byFamily[family]).toBeDefined();
      expect(Array.isArray(dict.byFamily[family])).toBe(true);
    }
    expect(Object.keys(dict.byFamily)).toHaveLength(5);
  });

  it('2: each family has at least 2 cells', () => {
    const dict = buildTritonicDictionary();
    for (const family of FAMILIES) {
      expect(dict.byFamily[family].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('3: intervalProfile length equals notes.length - 1 for every cell', () => {
    const dict = buildTritonicDictionary();
    for (const cell of dict.cells) {
      expect(cell.notes).toHaveLength(3);
      expect(cell.intervalProfile).toHaveLength(cell.notes.length - 1);
      expect(cell.intervalProfile).toEqual(computeIntervalProfile(cell.notes));
    }
  });

  it('4: tension is 0–1 for all cells', () => {
    const dict = buildTritonicDictionary();
    for (const cell of dict.cells) {
      expect(cell.tension).toBeGreaterThanOrEqual(0);
      expect(cell.tension).toBeLessThanOrEqual(1);
      expect(cell.tension).toBeCloseTo(
        computeTensionFromIntervalProfile(cell.intervalProfile),
        10,
      );
    }
  });

  it('5: byFamily lookup matches cells array', () => {
    const dict = buildTritonicDictionary();
    const fromLookup = FAMILIES.flatMap((family) => dict.byFamily[family]);
    expect(fromLookup).toHaveLength(dict.cells.length);
    expect(fromLookup).toEqual(dict.cells);
  });
});

describe('buildTritonicCell tension weighting', () => {
  it('cluster semitone+tritone scores higher than quartal stacked fourths', () => {
    const cluster = buildTritonicCell([0, 1, 6], 'cluster');
    const quartal = buildTritonicCell([0, 5, 10], 'quartal');
    expect(cluster.tension).toBeGreaterThan(quartal.tension);
  });
});
