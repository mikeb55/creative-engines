/**
 * V104p3 — Tritonic three-strand extraction tests.
 */

import { buildTritonicDictionary } from './tritonicCell';
import { realiseTritonic } from './tritonicRealisation';
import {
  extractSingableMelodyMidis,
  extractTritonicStrands,
  filterSingerSafeMidis,
  projectedStrandMidisFromCells,
} from './tritonicStrands';
import { scheduleTritonicTimeline } from './tritonicTimeline';

describe('extractTritonicStrands', () => {
  it('returns three distinct strand arrays', () => {
    const cells = buildTritonicDictionary().cells.slice(0, 5);
    const timeline = scheduleTritonicTimeline(cells, 'sq', { barCount: 9 });
    const strands = extractTritonicStrands(timeline, cells);
    expect(strands.voicingTop).toHaveLength(timeline.length);
    expect(strands.projectedStrand).toHaveLength(timeline.length);
    expect(strands.singerSafeMotif).toHaveLength(timeline.length);
  });

  it('singerSafeMotif limits leaps to ≤4 semitones', () => {
    const cells = buildTritonicDictionary().cells.slice(0, 6);
    const projected = projectedStrandMidisFromCells(cells);
    const safe = filterSingerSafeMidis(projected);
    for (let i = 1; i < safe.length; i++) {
      expect(Math.abs(safe[i]! - safe[i - 1]!)).toBeLessThanOrEqual(4);
    }
  });

  it('extractSingableMelodyMidis matches projected strand midis', () => {
    const result = realiseTritonic({
      mode: 'sq',
      cells: buildTritonicDictionary().cells,
      behaviourOptions: { oddityScore: 0.2, delayedResolution: false, melodyPriority: true },
    });
    const cells = result.phrases.flat();
    expect(extractSingableMelodyMidis(cells)).toEqual(projectedStrandMidisFromCells(cells));
  });

  it('strands carry timeline bar/beat rhythm', () => {
    const cells = buildTritonicDictionary().cells.slice(0, 3);
    const timeline = scheduleTritonicTimeline(cells, 'bb', { barCount: 3 });
    const strands = extractTritonicStrands(timeline, cells);
    expect(strands.projectedStrand[0]).toMatchObject({
      bar: timeline[0]!.bar,
      beat: timeline[0]!.beat,
      duration: timeline[0]!.duration,
    });
  });
});
