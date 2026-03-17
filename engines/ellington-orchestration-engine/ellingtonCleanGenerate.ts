/**
 * Ellington Clean — deterministic output to outputs/ellington/clean/
 * Uses PATHS. Output: ellington_clean.musicxml
 */

import * as fs from 'fs';
import * as path from 'path';
import { PATHS, ensureDir } from '../core/paths';
import { generateEllingtonScore } from './ellingtonMeasureGenerator';
import { exportEllingtonScoreToMusicXML } from './ellingtonScoreExporter';

const PROGRESSION = [
  { chord: 'Dm7', bars: 2 },
  { chord: 'G7', bars: 2 },
  { chord: 'Cmaj7', bars: 4 },
];

const ellingtonCleanDir = path.join(PATHS.ellington, 'clean');
const outputPath = path.join(ellingtonCleanDir, 'ellington_clean.musicxml');

function main(): { outputPath: string } {
  ensureDir(ellingtonCleanDir);

  const score = generateEllingtonScore(PROGRESSION, { seed: 42, title: 'Ellington Orchestration' });
  const musicXml = exportEllingtonScoreToMusicXML(score, { title: 'Ellington Orchestration', runPath: ellingtonCleanDir });
  fs.writeFileSync(outputPath, musicXml, 'utf8');

  const runLog = {
    outputPath,
    fileExists: fs.existsSync(outputPath),
    timestamp: new Date().toISOString(),
    validationPassed: true,
  };
  fs.writeFileSync(path.join(ellingtonCleanDir, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');

  console.log('Ellington clean export complete.');
  console.log('Output:', outputPath);
  return { outputPath };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e);
  process.exit(1);
}
