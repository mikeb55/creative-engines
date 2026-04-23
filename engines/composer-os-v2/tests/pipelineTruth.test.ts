/**
 * Pipeline truth: custom 8-bar progression end-to-end (input → score → written MusicXML).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
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
          /** Native 8-bar form; omitting `totalBars` tiles this progression to 32 and skips 8-bar pipeline truth. */
          totalBars: 8,
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
    {
      name: 'Pipeline truth: omitted vs explicit free_harmony yields identical musical output',
      ok: (() => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-truth-harmony-mode-'));
        try {
          const base = {
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 2026,
          } as const;
          const a = generateComposition(base, dir);
          const b = generateComposition({ ...base, importHarmonyMode: 'free_harmony' }, dir);
          const onlySourceDiff =
            a.runManifest?.importHarmonyMode === b.runManifest?.importHarmonyMode &&
            a.runManifest?.importHarmonyModeSource === 'defaulted' &&
            b.runManifest?.importHarmonyModeSource === 'explicit';
          return a.success === true && b.success === true && a.xml === b.xml && onlySourceDiff;
        } finally {
          try {
            fs.rmSync(dir, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        }
      })(),
    },
  ];
}
