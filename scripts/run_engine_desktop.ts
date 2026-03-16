/**
 * Shared Desktop Runner — Invokes requested engine and generates one demo output.
 *
 * Usage: npx ts-node scripts/run_engine_desktop.ts <engine_name>
 *
 * Engine names: jimmy_wyble, ellington_orchestration, big_band_architecture, contemporary_counterpoint
 */

import { spawn } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const ENGINE_REGISTRY: Record<string, { script: string; cwd: string }> = {
  jimmy_wyble: {
    script: 'wybleDesktopGenerate.ts',
    cwd: path.join(ROOT, 'engines/jimmy-wyble-engine'),
  },
  ellington_orchestration: {
    script: 'ellingtonDesktopGenerate.ts',
    cwd: path.join(ROOT, 'engines/ellington-orchestration-engine'),
  },
  big_band_architecture: {
    script: 'architectureDesktopGenerate.ts',
    cwd: path.join(ROOT, 'engines/big-band-architecture-engine'),
  },
  contemporary_counterpoint: {
    script: 'counterpointDesktopGenerate.ts',
    cwd: path.join(ROOT, 'engines/contemporary-counterpoint-engine'),
  },
};

function run_engine(engine_name: string): Promise<void> {
  const entry = ENGINE_REGISTRY[engine_name];
  if (!entry) {
    console.error(`Unknown engine: ${engine_name}`);
    console.error(`Available: ${Object.keys(ENGINE_REGISTRY).join(', ')}`);
    process.exit(1);
  }

  const scriptPath = path.join(entry.cwd, entry.script);
  console.log(`Running ${engine_name}...`);
  console.log(`  Script: ${scriptPath}`);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ts-node', '--project', 'tsconfig.json', entry.script], {
      cwd: entry.cwd,
      shell: true,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${engine_name}: SUCCESS`);
        resolve();
      } else {
        console.error(`\n${engine_name}: FAILED (exit ${code})`);
        reject(new Error(`Engine ${engine_name} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error(`\n${engine_name}: ERROR`, err.message);
      reject(err);
    });
  });
}

const engineArg = process.argv[2] || '';
const engineName = engineArg.toLowerCase().replace(/-/g, '_');

if (!engineName) {
  console.error('Usage: npx ts-node scripts/run_engine_desktop.ts <engine_name>');
  console.error('Engines: jimmy_wyble, ellington_orchestration, big_band_architecture, contemporary_counterpoint');
  process.exit(1);
}

run_engine(engineName).catch(() => process.exit(1));
