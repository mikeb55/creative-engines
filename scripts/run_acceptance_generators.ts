/**
 * Run all three acceptance generators.
 * Exit 1 if any fails.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const ENGINES = [
  { name: 'wyble', script: 'wybleAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/jimmy-wyble-engine') },
  { name: 'counterpoint', script: 'counterpointAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/contemporary-counterpoint-engine') },
  { name: 'ellington', script: 'ellingtonAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/ellington-orchestration-engine') },
];

const nodeExe = process.execPath;
const tsNodeBin = path.join(ROOT, 'node_modules/ts-node/dist/bin.js');
const tsconfig = path.join(ROOT, 'tsconfig.json');

let allOk = true;
for (const eng of ENGINES) {
  const scriptPath = path.join(eng.cwd, eng.script);
  console.log(`Running ${eng.name} acceptance...`);
  const r = spawnSync(nodeExe, [tsNodeBin, '--project', tsconfig, scriptPath], {
    cwd: eng.cwd,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    allOk = false;
    console.error(`${eng.name} acceptance FAILED`);
  }
}

process.exit(allOk ? 0 : 1);
