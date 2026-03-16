/**
 * Conductor Engine — Real world test
 * Generates compositions using ii-V-I, jazz blues, rhythm changes, Beatrice, Orbit
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition } from './conductorGenerator';
import type { CompositionRequest } from './conductorTypes';

const TEMPLATES = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];

function runRealWorldTest(): boolean {
  const engineDir = __dirname;
  const outRoot = path.join(engineDir, '..', '..', 'outputs', 'conductor-realworld');
  const runDir = path.join(outRoot, `run_${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });

  let allOk = true;

  for (const template of TEMPLATES) {
    const outputDir = path.join(runDir, template);
    fs.mkdirSync(outputDir, { recursive: true });

    const request: CompositionRequest = {
      style: 'chamber_jazz',
      form: 'AABA',
      progressionTemplate: template,
      counterpointMode: 'contemporary',
      orchestrationMode: 'chamber',
      seed: Date.now(),
    };

    try {
      const result = generateComposition(request, outputDir);
      if (!result.success) {
        console.error(`FAIL ${template}: ${result.error}`);
        allOk = false;
      } else {
        const hasExports =
          !!result.compositionPlanPath &&
          !!result.architectureJsonPath &&
          !!result.scoreMusicPath;
        if (!hasExports) {
          console.error(`FAIL ${template}: missing exports`);
          allOk = false;
        } else {
          console.log(`OK ${template}`);
        }
      }
    } catch (e) {
      console.error(`FAIL ${template}: ${e instanceof Error ? e.message : String(e)}`);
      allOk = false;
    }
  }

  const report = `Real World Test: ${allOk ? 'PASSED' : 'FAILED'}\nRun: ${runDir}`;
  fs.writeFileSync(path.join(runDir, 'report.txt'), report, 'utf-8');
  console.log(report);

  return allOk;
}

if (require.main === module) {
  const passed = runRealWorldTest();
  process.exit(passed ? 0 : 1);
}

export { runRealWorldTest };
