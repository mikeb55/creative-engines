/**
 * Composer OS V2 — Performance pass
 * Post-generation refinement: NO pitch changes.
 */

import type { ScoreModel, NoteEvent } from '../score-model/scoreModelTypes';
import type { PerformancePassOptions } from './performanceTypes';
import { DEFAULT_PERFORMANCE_OPTIONS } from './performanceTypes';

/** Apply performance pass: articulation, optional micro-shifts. Does NOT change pitches. */
export function applyPerformancePass(
  score: ScoreModel,
  options: Partial<PerformancePassOptions> = {}
): ScoreModel {
  const opts = { ...DEFAULT_PERFORMANCE_OPTIONS, ...options };
  const parts = score.parts.map((p) => ({
    ...p,
    measures: p.measures.map((m) => ({
      ...m,
      events: m.events.map((e) => {
        if (e.kind !== 'note') return e;
        const note: NoteEvent = {
          kind: 'note',
          pitch: e.pitch,
          startBeat: e.startBeat,
          duration: e.duration,
          voice: e.voice,
        };
        if (opts.applyArticulation) {
          if (note.duration <= 0.5) note.articulation = 'staccato';
          else if (note.duration >= 3) note.articulation = 'tenuto';
        }
        return note;
      }),
    })),
  }));

  return { ...score, parts };
}
