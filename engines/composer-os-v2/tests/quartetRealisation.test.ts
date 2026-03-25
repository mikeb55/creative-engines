/**
 * String Quartet score realisation (Prompt C/3).
 */

import { runEnsembleExportPipeline } from '../core/export/ensembleExport';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

export function runQuartetRealisationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const r = runQuartetRealisation({ seed: 8002, title: 'SQ Realise', totalBars: 24 });
  out.push({
    ok:
      r.planning.validation.ok &&
      r.score != null &&
      r.score.parts.length === 4 &&
      r.exportPipeline.ok &&
      (r.exportPipeline.xml?.includes('Violin') ?? false),
    name: 'runQuartetRealisation yields quartet score + MusicXML',
  });

  const bad = runEnsembleExportPipeline({ title: 'bad', parts: [] } as ScoreModel);
  out.push({
    ok: !bad.ok,
    name: 'negative: malformed empty score rejected by ensemble export',
  });

  return out;
}
