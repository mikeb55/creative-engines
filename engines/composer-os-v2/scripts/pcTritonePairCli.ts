/**
 * Performance Composer — TRITONE PAIR from the command line (same code as the app button, stamped "CLI").
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/pcTritonePairCli.ts --source <file.musicxml> [--seed N] [--out <folder>]
 * Default out: ~/Desktop/TRITONE PAIR LATEST (plain-named copies, previous copies replaced).
 */
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runTritonePairSession } from '../core/performance-composer/pcTritonePairSession';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const source = arg('source');
if (!source) {
  console.error('Usage: --source <file.musicxml> [--seed N] [--out <folder>]');
  process.exit(2);
}
let commit = '';
try {
  commit = execSync('git rev-parse HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
} catch {
  commit = '';
}
const seedArg = arg('seed');
const result = runTritonePairSession({
  sourcePath: path.resolve(source),
  outRoot: path.join(os.homedir(), 'Documents', 'Composer OS Exports', 'Performance Composer', 'TRITONE PAIR'),
  build: { buildCommit: commit || 'not available', ipcBundleSha256: 'CLI', stampMatchesLiveIpc: 'CLI' },
  seed: seedArg !== undefined ? Number(seedArg) : undefined,
});
const latest = arg('out') ?? path.join(os.homedir(), 'Desktop', 'TRITONE PAIR LATEST');
mkdirSync(latest, { recursive: true });
for (const f of readdirSync(latest)) if (f.endsWith('.musicxml') || f.endsWith('.md')) unlinkSync(path.join(latest, f));
copyFileSync(result.musicXmlPath, path.join(latest, path.basename(result.musicXmlPath)));
copyFileSync(result.fieldMapPath, path.join(latest, path.basename(result.fieldMapPath)));
console.log(`${result.piece} Tritone Pair · seed ${result.seed} · build ${commit.slice(0, 12) || 'not available'} (CLI)`);
console.log(`Checks: ${JSON.stringify(result.checks)}`);
console.log(`MusicXML: ${path.join(latest, path.basename(result.musicXmlPath))}`);
console.log(`Field map: ${path.join(latest, path.basename(result.fieldMapPath))}`);
