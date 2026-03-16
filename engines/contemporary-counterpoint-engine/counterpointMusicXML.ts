/**
 * Contemporary Counterpoint — MusicXML export. Serializes core Score. No forward/backup inference.
 */

import type { Score } from '../core/timing';
import { validateScore } from '../../scripts/validateScore';
import { scoreToMusicXMLMultiPart } from '../core/scoreToMusicXML';
import * as fs from 'fs';
import * as path from 'path';

/** Export Score to MusicXML. Throws if validation fails. */
export function exportCounterpointScoreToMusicXML(
  score: Score,
  title = 'Contemporary Counterpoint',
  options?: { runPath?: string }
): string {
  validateScore(score);

  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({ valid: true, errors: [] }, null, 2),
      'utf-8'
    );
  }

  return scoreToMusicXMLMultiPart(score, [
    { id: 'P1', name: 'Voice 1' },
    { id: 'P2', name: 'Voice 2' },
  ], { title });
}
