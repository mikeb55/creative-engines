/**
 * Composer OS - Electron dev: Vite on strictPort 5173 + Electron shell (no browser).
 * Sets COMPOSER_OS_DEV_UI_URL for main process; IPC via desktop-ipc bundle.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devUiUrl = (process.env.COMPOSER_OS_DEV_UI_URL || 'http://127.0.0.1:5173').replace(/\/$/, '') + '/';
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      shell: isWin,
      stdio: 'inherit',
      ...opts,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

function waitForHttp(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for Vite at ${url}`));
        return;
      }
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => setTimeout(tick, 500));
      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(tick, 500);
      });
    };
    tick();
  });
}

function probeHttp(url, timeoutMs = 2000) {
  return waitForHttp(url, timeoutMs).then(() => true).catch(() => false);
}

const children = [];

function killAll() {
  for (const c of children) {
    if (!c.killed) {
      try {
        if (isWin) spawn('taskkill', ['/pid', String(c.pid), '/f', '/t'], { shell: true });
        else c.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
}

process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});
process.on('SIGTERM', () => {
  killAll();
  process.exit(0);
});

console.log('\nComposer OS - Electron dev');
console.log(`Repository: ${repoRoot}`);
console.log(`Vite UI:    ${devUiUrl}`);
console.log('IPC:        desktop-ipc.bundle.cjs (Electron main)');
console.log('');

try {
  console.log('[1/3] Preparing Electron desktop bundles (IPC + main)...');
  await run(npmCmd, ['run', 'desktop:prep:dev', '--prefix', 'apps/composer-os-desktop']);

  const viteAlreadyUp = await probeHttp(devUiUrl);
  let vite = null;
  if (viteAlreadyUp) {
    console.log(`[2/3] Reusing existing Vite at ${devUiUrl}`);
  } else {
    console.log('[2/3] Starting Vite dev server (strictPort 5173)...');
    vite = spawn(npmCmd, ['run', 'dev:vite', '--prefix', 'apps/composer-os-app'], {
      cwd: repoRoot,
      shell: isWin,
      stdio: 'inherit',
      env: process.env,
    });
    children.push(vite);
    await waitForHttp(devUiUrl);
    console.log(`[2/3] Vite ready at ${devUiUrl}`);
  }

  console.log('[3/3] Launching Electron window...');
  const electron = spawn(npmCmd, ['run', 'desktop:dev:electron', '--prefix', 'apps/composer-os-desktop'], {
    cwd: repoRoot,
    shell: isWin,
    stdio: 'inherit',
    env: { ...process.env, COMPOSER_OS_DEV_UI_URL: devUiUrl },
  });
  children.push(electron);

  electron.on('exit', (code) => {
    killAll();
    process.exit(code ?? 0);
  });
  if (vite) {
    vite.on('exit', (code) => {
      if (code && code !== 0) {
        killAll();
        process.exit(code);
      }
    });
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  killAll();
  process.exit(1);
}