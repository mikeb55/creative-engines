/**
 * Post-build: confirm stable Composer-OS.exe exists and launches (Windows).
 * Non-Windows: file presence only.
 */
import { execSync } from 'child_process';
import * as path from 'path';
import { desktopReleaseDir, verifyPackagedPortableExe } from './verifyPackagedDesktop';
import { launchInstalledDesktopApp } from './launchInstalledDesktopApp';

function pidRunning(pid: number): boolean {
  if (process.platform !== 'win32') return true;
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
      encoding: 'utf-8',
      windowsHide: true,
    });
    return out.includes(String(pid));
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function verifyStableBuildOutput(): Promise<void> {
  const root = path.resolve(__dirname, '..');
  const r = verifyPackagedPortableExe(desktopReleaseDir(root));
  if (process.platform !== 'win32') {
    console.log('[verify-stable] OK:', r.absolutePath, '(launch check skipped on non-Windows)');
    return;
  }
  if (!/^Composer-OS\.exe$/i.test(r.fileName)) {
    console.warn('[verify-stable] Using legacy portable name:', r.fileName);
  }
  const launch = launchInstalledDesktopApp(r.absolutePath);
  if (!launch.launched) {
    throw new Error(`Launch failed: ${launch.reason}`);
  }
  await sleep(2000);
  if (!pidRunning(launch.pid)) {
    throw new Error('Composer-OS.exe did not stay running after launch (smoke check failed).');
  }
  try {
    execSync(`taskkill /PID ${launch.pid} /T /F`, { stdio: 'ignore', windowsHide: true });
  } catch {
    /* best-effort */
  }
  console.log('[verify-stable] OK: launched and exited cleanly:', r.absolutePath);
}

async function main(): Promise<void> {
  await verifyStableBuildOutput();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
