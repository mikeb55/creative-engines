/**
 * Big Band score realisation (Prompt C/3).
 */

import { runEnsembleExportPipeline } from '../core/export/ensembleExport';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

export function runBigBandRealisationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const r = runBigBandRealisation({ seed: 9001, title: 'BB Realise' });
  out.push({
    ok:
      r.planning.validation.ok &&
      r.score != null &&
      r.score.parts.length === 4 &&
      r.exportPipeline.ok &&
      (r.exportPipeline.xml?.includes('score-partwise') ?? false),
    name: 'runBigBandRealisation yields score + MusicXML through export pipeline',
  });

  const bad = runEnsembleExportPipeline({ title: 'bad', parts: [] } as ScoreModel);
  out.push({
    ok: !bad.ok && bad.errors.length > 0,
    name: 'negative: empty ensemble score fails export pipeline',
  });

  return out;
}
