/**
 * Contemporary Counterpoint Desktop Generator — Run by Electron app
 * Exports JSON plan, markdown summary, and simple MusicXML sketch.
 *
 * argv[2] = progression name (ii_v_i, jazz_cycle) or path to JSON
 * argv[3] = voice count (2–4)
 * argv[4] = density (0–1, optional)
 * Outputs JSON result to stdout for IPC.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateCounterpointScore } from './counterpointMeasureGenerator';
import { exportCounterpointScoreToMusicXML } from './counterpointMusicXML';

const PROGRESSIONS: Record<string, { chord: string; bars: number }[]> = {
  ii_v_i: [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
  ],
  jazz_cycle: [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 2 },
    { chord: 'Am7', bars: 2 },
    { chord: 'D7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
  ],
};

interface DesktopResult {
  outputDir: string;
  runFolder: string;
  runFolderPath: string;
  progressionName: string;
  lineCount: number;
  totalBars: number;
  error?: string;
}

function getRunFolderName(outDir: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const prefix = `${date}_${time}_run`;
  let runNum = 1;
  while (fs.existsSync(path.join(outDir, `${prefix}${String(runNum).padStart(2, '0')}`))) {
    runNum++;
  }
  return `${prefix}${String(runNum).padStart(2, '0')}`;
}

function main(): DesktopResult {
  const arg2 = process.argv[2] || 'ii_v_i';
  const lineCount = Math.min(4, Math.max(2, parseInt(process.argv[3] || '2', 10) || 2));
  const density = parseFloat(process.argv[4] || '0.5') || 0.5;

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'outputs', 'counterpoint');
  fs.mkdirSync(outDir, { recursive: true });

  let progression: { chord: string; bars: number }[];
  let progressionName: string;

  const isJsonPath = /\.json$/i.test(arg2) && fs.existsSync(arg2);
  if (isJsonPath) {
    progression = JSON.parse(fs.readFileSync(arg2, 'utf-8'));
    progressionName = path.basename(arg2);
  } else {
    progression = PROGRESSIONS[arg2] ?? PROGRESSIONS.ii_v_i;
    progressionName = arg2;
  }

  const score = generateCounterpointScore(progression, {
    lineCount,
    seed: Date.now(),
  });

  const runFolder = getRunFolderName(outDir);
  const runFolderPath = path.join(outDir, runFolder);
  fs.mkdirSync(runFolderPath, { recursive: true });

  const parts = ['Voice 1', 'Voice 2'];
  const planPath = path.join(runFolderPath, 'counterpoint_plan.json');
  fs.writeFileSync(planPath, JSON.stringify({ measures: score.measures.length, parts }, null, 2), 'utf-8');

  const summary = `# Contemporary Counterpoint Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Voice count:** ${lineCount}
- **Total bars:** ${score.measures.length}

## Output
- Measures: ${score.measures.length}
- Parts: ${parts.join(', ')}

## Files
- counterpoint_plan.json
- counterpoint_summary.md
- counterpoint_sketch.musicxml
`;
  fs.writeFileSync(path.join(runFolderPath, 'counterpoint_summary.md'), summary, 'utf-8');

  const musicXml = exportCounterpointScoreToMusicXML(score, `Contemporary Counterpoint (${progressionName})`, { runPath: runFolderPath });
  fs.writeFileSync(path.join(runFolderPath, 'counterpoint_sketch.musicxml'), musicXml, 'utf-8');

  return {
    outputDir: outDir,
    runFolder,
    runFolderPath,
    progressionName,
    lineCount,
    totalBars: score.measures.length,
  };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({
    outputDir: '',
    runFolder: '',
    runFolderPath: '',
    progressionName: '',
    lineCount: 0,
    totalBars: 0,
    error: String(e),
  }));
  process.exit(1);
}
