/**
 * V82f - Barry Harris chord-melody eval CLI.
 * Run from package: npm run eval:barry_harris
 */

import * as path from 'path';
import { runBarryHarrisChordMelodyEvalCore } from '../core/barry-harris/chordMelodyPipeline';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function main(): void {
  const report = runBarryHarrisChordMelodyEvalCore(REPO_ROOT);
  console.log(JSON.stringify(report));
  if (!report.pass) {
    console.error('[eval:barry_harris] FAIL - see output/barry-harris-eval/');
    process.exit(1);
  }
  console.log('[eval:barry_harris] PASS - wrote ' + path.join(REPO_ROOT, 'output', 'barry-harris-eval'));
}

main();
