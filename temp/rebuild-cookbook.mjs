import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'docs', 'TRITONIC_BB_COOKBOOK.md');
const tailPath = path.join(root, 'temp', 'tritonic_scenarios_21_60.md');

const original = execSync('git show c6f3eb3f:docs/TRITONIC_BB_COOKBOOK.md', {
  cwd: root,
  encoding: 'utf8',
});

const lines = original.split(/\r?\n/);
const cutIdx = lines.findIndex((l) => l.startsWith('## Scenario 21'));
const head = cutIdx >= 0 ? lines.slice(0, cutIdx).join('\n') : original;
const tail = fs.readFileSync(tailPath, 'utf8');

fs.writeFileSync(outPath, `${head}${tail}`, 'utf8');
console.log(`Rebuilt ${outPath} (${head.split('## Scenario').length - 1} + ${tail.split('## Scenario').length - 1} scenarios)`);
