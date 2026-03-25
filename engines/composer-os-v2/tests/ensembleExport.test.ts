/**
 * Ensemble export pipeline (Prompt C/3).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { runEnsembleExportPipeline } from '../core/export/ensembleExport';

export function runEnsembleExportTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const gp = runGoldenPath(55_555, { presetId: 'guitar_bass_duo' });
  const ex = runEnsembleExportPipeline(gp.score);
  out.push({
    ok: ex.ok && gp.success && (ex.xml?.length ?? 0) > 100,
    name: 'ensemble export pipeline accepts duo score model',
  });

  return out;
}
