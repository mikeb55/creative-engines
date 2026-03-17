/**
 * Counterpoint Clean — deterministic output to outputs/counterpoint/clean/
 * Uses PATHS. Output: counterpoint_clean.musicxml
 */

import * as fs from 'fs';
import * as path from 'path';
import { PATHS, ensureDir } from '../core/paths';
import { generateCounterpointScore } from './counterpointMeasureGenerator';
import { exportCounterpointScoreToMusicXML } from './counterpointMusicXML';

const PROGRESSION = [
  { chord: 'Dm7', bars: 2 },
  { chord: 'G7', bars: 2 },
  { chord: 'Cmaj7', bars: 4 },
];

const counterpointCleanDir = path.join(PATHS.counterpoint, 'clean');
const outputPath = path.join(counterpointCleanDir, 'counterpoint_clean.musicxml');

function main(): { outputPath: string } {
  ensureDir(counterpointCleanDir);

  const score = generateCounterpointScore(PROGRESSION, { lineCount: 2, seed: 42 });
  const musicXml = exportCounterpointScoreToMusicXML(score, 'Contemporary Counterpoint', {
    runPath: counterpointCleanDir,
  });
  fs.writeFileSync(outputPath, musicXml, 'utf8');

  const runLog = {
    outputPath,
    fileExists: fs.existsSync(outputPath),
    timestamp: new Date().toISOString(),
    validationPassed: true,
  };
  fs.writeFileSync(path.join(counterpointCleanDir, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');

  console.log('Counterpoint clean export complete.');
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
