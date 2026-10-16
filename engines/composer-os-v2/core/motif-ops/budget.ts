/**
 * Opt-in bridge from MotifCell2TransformBudget to the shared operators.
 * Callers pass enabled=true. The default remains off.
 */

import type { MotifCell2 } from '../motif/themeGenome';
import { applyOperator } from './operators';
import type { Motif } from './types';

export interface MotifOpsFlag {
  enabled?: boolean;
}

export function motifOpsEnabled(flag: boolean | MotifOpsFlag | null | undefined): boolean {
  if (flag === true) return true;
  return Boolean(flag && typeof flag === 'object' && flag.enabled === true);
}

function cellToMotif(cell: MotifCell2): Motif {
  let midi = 60;
  let onset = 0;
  const events = cell.durations.map((duration, index) => {
    const event = { onset, duration, midi };
    onset += duration;
    midi += cell.intervals[index] ?? 0;
    return event;
  });
  return { id: cell.id || 'm1', events };
}

function motifToCell(cell: MotifCell2, motif: Motif): MotifCell2 {
  const sounding = motif.events.filter((event) => event.midi !== null);
  if (sounding.length < 2) return cell;
  const intervals: number[] = [];
  for (let i = 1; i < sounding.length; i += 1) intervals.push(sounding[i]!.midi! - sounding[i - 1]!.midi!);
  return {
    ...cell,
    intervals,
    durations: sounding.map((event) => event.duration),
    contour: intervals.map((interval) => (interval > 0 ? 'up' : interval < 0 ? 'down' : 'same')),
  };
}

export function applyBudgetOperators(cell: MotifCell2, enabled: boolean): MotifCell2 {
  if (!enabled) return cell;
  let motif = cellToMotif(cell);
  if (cell.transformBudget.retrograde) {
    motif = applyOperator(motif, 'retrograde').motif;
  }
  if (cell.transformBudget.sequence) {
    motif = applyOperator(motif, 'sequence-real', { steps: 2, count: 1 }).motif;
  }
  return motifToCell(cell, motif);
}
