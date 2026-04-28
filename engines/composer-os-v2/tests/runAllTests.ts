/**
 * Composer OS V2 — unified custom test harness (`npm test` / `npm run test:full`).
 *
 * **Modes**
 * - `smoke`: **not** this file — use `npm run test:smoke` → `tests/runSmokeTests.ts` (small fixed allowlist).
 * - `full` / `fast`: this orchestrator runs **four sequential Node processes** (`runAllTestsChunk1.ts` … `Chunk4.ts`)
 *   so the heap does not load every suite module at once (OOM mitigation). Each chunk uses **--max-old-space-size=4096**.
 * - Pass `fast` as the **last argv token** (`npm run test:fast`) or set `COMPOSER_OS_TEST_MODE=fast`.
 *
 * **Optional env**
 * - `COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1` — skip **Stage Exit Gates** (retro aggregate; quarantine).
 * - `COMPOSER_OS_TEST_EXCLUDE_SUBSTR=a,b` — skip suites whose **name contains** any substring.
 *
 * Shared loop: `tests/harness/runHarnessMain.ts`
 */

import * as path from 'path';
import { spawnSync } from 'child_process';

const ENGINE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ENGINE_ROOT, '..', '..');
const TS_NODE = path.join(REPO_ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');
const TS_CONFIG = path.join(REPO_ROOT, 'tsconfig.json');

const CHUNKS = ['runAllTestsChunk1.ts', 'runAllTestsChunk2.ts', 'runAllTestsChunk3.ts', 'runAllTestsChunk4.ts'] as const;

function main(): void {
  const extraArgs = process.argv.slice(2);

  for (let i = 0; i < CHUNKS.length; i++) {
    const chunkPath = path.join(__dirname, CHUNKS[i]);
    console.log(`\n[harness] ========== Orchestrator: chunk ${i + 1}/${CHUNKS.length} (${CHUNKS[i]}) ==========\n`);

    const r = spawnSync(
      process.execPath,
      ['--max-old-space-size=4096', TS_NODE, '--project', TS_CONFIG, chunkPath, ...extraArgs],
      { stdio: 'inherit', cwd: ENGINE_ROOT, env: process.env }
    );

    if (r.error) {
      console.error(r.error);
      process.exit(1);
    }
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }

  console.log('\nCOMPOSER OS V2 TESTS (orchestrated): PASS');
}

main();
