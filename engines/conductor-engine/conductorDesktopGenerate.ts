/**
 * Conductor Desktop Generator — Run by Electron app
 * Generates composition, exports plan, architecture, MusicXML.
 * Outputs JSON result to stdout for IPC.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition } from './conductorGenerator';
import type { CompositionRequest } from './conductorTypes';

const STYLES: CompositionRequest['style'][] = ['chamber_jazz', 'big_band', 'guitar_duo'];
const TEMPLATES = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];

interface DesktopResult {
  outputDir: string;
  runFolder: string;
  runFolderPath: string;
  style: string;
  template: string;
  success: boolean;
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
  const styleArg = (process.argv[2] || 'chamber_jazz') as CompositionRequest['style'];
  const templateArg = process.argv[3] || 'ii_V_I_major';

  const style = STYLES.includes(styleArg) ? styleArg : 'chamber_jazz';
  const template = TEMPLATES.includes(templateArg) ? templateArg : 'ii_V_I_major';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'conductor-composer-desktop', 'outputs');
  fs.mkdirSync(outDir, { recursive: true });

  const runFolder = getRunFolderName(outDir);
  const runFolderPath = path.join(outDir, runFolder);
  const outputDir = path.join(runFolderPath, 'composition');
  fs.mkdirSync(outputDir, { recursive: true });

  const request: CompositionRequest = {
    style,
    form: 'AABA',
    progressionTemplate: template,
    counterpointMode: style === 'guitar_duo' ? 'wyble' : 'contemporary',
    orchestrationMode: style === 'big_band' ? 'ellington' : 'chamber',
    seed: Date.now(),
  };

  try {
    const result = generateComposition(request, outputDir);
    return {
      outputDir,
      runFolder,
      runFolderPath,
      style,
      template,
      success: result.success,
      error: result.error,
    };
  } catch (e) {
    return {
      outputDir,
      runFolder,
      runFolderPath,
      style,
      template,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const result = main();
console.log(JSON.stringify(result));
