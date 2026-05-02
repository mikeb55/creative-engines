/**
 * Per-measure beat span (quarter-note units) for mixed meters — isolated module to avoid circular imports.
 */

import type { MeasureModel } from './scoreModelTypes';
import { BEATS_PER_MEASURE } from './scoreModelTypes';

export function measureBeatSpanQuartersOf(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}
