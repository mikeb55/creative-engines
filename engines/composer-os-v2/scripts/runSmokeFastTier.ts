/**
 * Fast smoke tier — spawn dedicated child (env set before runSmokeTests loads).
 * Avoids ESM import hoisting skipping COMPOSER_OS_SMOKE_TIER and Windows `node -e` hangs.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(engineRoot, '../..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const tsconfig = path.join(repoRoot, 'tsconfig.json');
const smokeEntry = path.join(engineRoot, 'tests', 'runSmokeTests.ts');

const env = { ...process.env, COMPOSER_OS_SMOKE_TIER: 'fast' };
const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=4096', tsxCli, '--tsconfig', tsconfig, smokeEntry],
  { stdio: 'inherit', env, cwd: engineRoot }
);
process.exit(result.status ?? 1);
