import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { MelodicNote } from './gce_melody_eval';

export function scoreModelToMelodicLine(score: ScoreModel, partId: string = 'guitar'): MelodicNote[] {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return [];
  const line: MelodicNote[] = [];
  for (const m of part.measures) {
    const events = m.events.filter((e) => e.voice === 1 || e.voice === undefined);
    for (const e of events) {
      if (e.kind === 'note') {
        line.push({
          midi: e.pitch,
          beats: e.duration,
          bar: m.index,
          beat: e.startBeat,
          rest: false,
        });
      } else if (e.kind === 'rest') {
        line.push({
          midi: 0,
          beats: e.duration,
          bar: m.index,
          beat: e.startBeat,
          rest: true,
        });
      }
    }
  }
  return line;
}
