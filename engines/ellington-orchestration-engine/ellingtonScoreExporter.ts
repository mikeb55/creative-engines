/**
 * Ellington Score Export — serializes core Score. No measure packing.
 */

import type { Score } from '../core/timing';
import { validateScore } from '../../scripts/validateScore';
import { scoreToMusicXMLMultiPart } from '../core/scoreToMusicXML';
import { INSTRUMENTS } from './ellingtonMeasureGenerator';
import * as fs from 'fs';
import * as path from 'path';

/** Export Ellington Score to MusicXML. */
export function exportEllingtonScoreToMusicXML(
  score: Score,
  options?: { title?: string; runPath?: string }
): string {
  const title = options?.title ?? 'Ellington Orchestration';

  validateScore(score);

  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({ valid: true, errors: [] }, null, 2),
      'utf-8'
    );
  }

  const partSpecs = INSTRUMENTS.map((i) => ({
    id: i.id,
    name: i.name,
    clef: i.clef,
    transposition: i.transposition,
  }));

  return scoreToMusicXMLMultiPart(score, partSpecs, { title });
}
