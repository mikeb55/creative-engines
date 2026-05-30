/**
 * V104p3 — Tritonic timeline tests.
 */

import { buildTritonicDictionary } from './tritonicCell';
import { realiseTritonic } from './tritonicRealisation';
import {
  countCellsPerBar,
  scheduleTritonicTimeline,
  timelineBarSpan,
  timelineHasOverlap,
} from './tritonicTimeline';

function sampleCells(n: number) {
  return buildTritonicDictionary().cells.slice(0, n);
}

describe('scheduleTritonicTimeline', () => {
  it('BB mode allows multiple cells per bar', () => {
    const cells = sampleCells(4);
    const events = scheduleTritonicTimeline(cells, 'bb', { barCount: 4 });
    expect(events).toHaveLength(4);
    const perBar = countCellsPerBar(events);
    const multiBar = [...perBar.values()].some((c) => c >= 2);
    expect(multiBar).toBe(true);
  });

  it('SQ mode leaves bars with zero cells', () => {
    const cells = sampleCells(3);
    const events = scheduleTritonicTimeline(cells, 'sq', { barCount: 5 });
    expect(events).toHaveLength(3);
    const perBar = countCellsPerBar(events);
    expect(perBar.get(2)).toBeUndefined();
  });

  it('ECM mode supports overlap', () => {
    const cells = sampleCells(4);
    const events = scheduleTritonicTimeline(cells, 'ecm', { barCount: 4 });
    expect(timelineHasOverlap(events)).toBe(true);
  });

  it('realiseTritonic attaches timeline to result', () => {
    const dict = buildTritonicDictionary();
    const result = realiseTritonic({
      mode: 'bb',
      cells: dict.cells,
      behaviourOptions: { oddityScore: 0.5, delayedResolution: false, melodyPriority: false },
    });
    expect(result.timeline.length).toBe(result.phrases.flat().length);
    expect(timelineBarSpan(result.timeline)).toBeGreaterThan(0);
  });
});
