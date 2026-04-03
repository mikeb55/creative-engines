/**
 * Wyble MusicXML Exporter — serializes core Score. No timeline packing.
 */

import type { Score } from '../core/timing';
import { validateScore } from '../../scripts/validateScore';
import { scoreToMusicXML } from '../core/scoreToMusicXML';
import * as fs from 'fs';
import * as path from 'path';

/** Export Score to MusicXML. Throws if validation fails. */
export function exportScoreToMusicXML(
  score: Score,
  options?: { title?: string; runPath?: string }
): string {
  const title = options?.title ?? 'Wyble Etude';

  validateScore(score);

  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({ valid: true, errors: [] }, null, 2),
      'utf-8'
    );
  }

  /** Single staff + two voices matches wybleBypassGenerator; avoids per-staff duplicate chord display. */
  return scoreToMusicXML(score, {
    title,
    partName: 'Guitar',
    staves: 1,
  });
}
