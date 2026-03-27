/**
 * Pipeline truth: custom 8-bar progression end-to-end (input → score → written MusicXML).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { pipelineTruthAllPassed } from '../core/score-integrity/pipelineTruthGates';

const REGRESSION_PROGRESSION =
  'Bm9 | D13 | Gmaj9 | C#7alt | F#m9 | A13 | Dmaj9 | G#7alt';

export function runPipelineTruthTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'Pipeline truth: regression progression (Bm9…G#7alt)',
      ok: (() => {
        const r = runGoldenPath(2026, {
          presetId: 'guitar_bass_duo',
          harmonyMode: 'custom',
          chordProgressionText: REGRESSION_PROGRESSION,
        });
        return (
          r.success &&
          !!r.truthReport &&
          pipelineTruthAllPassed(r.truthReport) &&
          r.truthReport.inputStage === 'pass' &&
          r.truthReport.scoreStage === 'pass' &&
          r.truthReport.exportStage === 'pass'
        );
      })(),
    },
    {
      name: 'Pipeline truth: builtin duo cycle passes all stages',
      ok: (() => {
        const r = runGoldenPath(42, { presetId: 'guitar_bass_duo', harmonyMode: 'builtin' });
        return (
          r.success &&
          !!r.truthReport &&
          pipelineTruthAllPassed(r.truthReport) &&
          r.truthReport.inputStage === 'pass' &&
          r.truthReport.scoreStage === 'pass' &&
          r.truthReport.exportStage === 'pass'
        );
      })(),
    },
  ];
}
