/**
 * SQ→BB — ScoreModel builders for SQ (SATB) and BB (section-render stub) export.
 */

import type { AbstractLineSet, LineRole } from './abstractLineSet';
import type { BigBandSectionRenderOutput } from '../composer/bigBandSectionPlanRenderer';
import { scoreModelFromSqBbSectionRender } from './sqToBbGceGates';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';

const SQ_PARTS: ReadonlyArray<{
  role: LineRole;
  id: string;
  name: string;
}> = [
  { role: 'soprano', id: 'sq_violin_1', name: 'Violin I' },
  { role: 'alto', id: 'sq_violin_2', name: 'Violin II' },
  { role: 'tenor', id: 'sq_viola', name: 'Viola' },
  { role: 'bass', id: 'sq_cello', name: 'Violoncello' },
];

function emptyMeasures(barCount: number): MeasureModel[] {
  return Array.from({ length: barCount }, (_, i) => ({ index: i + 1, events: [] }));
}

export function abstractLineSetToSqScoreModel(lines: AbstractLineSet): ScoreModel {
  const barCount = Math.max(1, Math.ceil(lines.lengthBars));
  const parts: PartModel[] = SQ_PARTS.map((spec) => {
    const measures = emptyMeasures(barCount);
    const voice = lines.voices.find((v) => v.role === spec.role);
    if (voice) {
      for (const n of voice.notes) {
        const barIndex = Math.min(barCount, Math.max(1, Math.floor(n.offsetBars) + 1));
        const beatInBar = (n.offsetBars - (barIndex - 1)) * BEATS_PER_MEASURE;
        const m = measures[barIndex - 1]!;
        m.events.push(
          createNote(
            Math.round(n.pitchMidi),
            Math.max(0, Math.min(BEATS_PER_MEASURE - 0.25, beatInBar)),
            Math.max(0.25, n.durationBars * BEATS_PER_MEASURE),
            1,
          ),
        );
      }
    }
    return {
      id: spec.id,
      name: spec.name,
      instrumentIdentity: spec.id,
      midiProgram: spec.role === 'bass' ? 42 : spec.role === 'tenor' ? 41 : 40,
      clef: spec.role === 'bass' || spec.role === 'tenor' ? 'bass' : 'treble',
      measures,
    };
  });
  return {
    title: 'SQ→BB String Quartet',
    parts,
  };
}

export function bbSectionRenderToScoreModel(
  render: BigBandSectionRenderOutput,
  lengthBars: number,
): ScoreModel {
  return scoreModelFromSqBbSectionRender(render, lengthBars);
}
