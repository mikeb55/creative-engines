/**
 * Ensemble (Big Band / String Quartet) export through the same score-model → MusicXML path (Prompt C/3).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { validateScoreModel } from '../score-model/scoreModelValidation';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import type { MusicXmlExportOptions } from './exportTypes';
import { exportScoreModelToMusicXml } from './musicxmlExporter';
import { validateMusicXmlSchema } from './musicxmlValidation';
import { validateExportedMusicXmlBarMath } from './validateMusicXmlBarMath';
import { validateWrittenMusicXmlComplete } from './validateMusicXmlWrittenStrict';

export interface EnsembleExportPipelineResult {
  ok: boolean;
  xml?: string;
  errors: string[];
}

/** Run score-model validation, strict bar math, export, schema + post-export bar math (same gates as duo path). */
export function runEnsembleExportPipeline(score: ScoreModel, exportOptions?: MusicXmlExportOptions): EnsembleExportPipelineResult {
  const errors: string[] = [];

  const v1 = validateScoreModel(score);
  if (!v1.valid) errors.push(...v1.errors);

  const v2 = validateStrictBarMath(score);
  if (!v2.valid) errors.push(...v2.errors);

  const barMeterMap = exportOptions?.barMeterMap ?? score.barMeterMap;
  const ex = exportScoreModelToMusicXml(
    score,
    barMeterMap ? { ...exportOptions, barMeterMap } : exportOptions
  );
  if (!ex.success || !ex.xml) {
    errors.push(...(ex.errors.length ? ex.errors : ['MusicXML export failed']));
    return { ok: false, errors };
  }

  const schema = validateMusicXmlSchema(ex.xml);
  if (!schema.valid) errors.push(...schema.errors);

  const rt = validateExportedMusicXmlBarMath(ex.xml, barMeterMap);
  if (!rt.valid) errors.push(...rt.errors);

  const written = validateWrittenMusicXmlComplete(score, ex.xml, barMeterMap);
  if (!written.valid) errors.push(...written.errors);

  return { ok: errors.length === 0, xml: ex.xml, errors };
}
