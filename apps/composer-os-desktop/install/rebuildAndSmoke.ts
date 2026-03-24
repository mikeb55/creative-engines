/**
 * One-shot: close stale portable → package → verify exe + UI stamp → launch → smoke checks.
 * Windows-focused (packaging uses electron-builder --win).
 * `desktop:package` bumps semver patch first, so the verified exe is always the newest `Composer-OS-Desktop-*-portable.exe` by mtime.
 */
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { closeStaleComposerOsDesktopProcesses } from './closeComposerOsDesktop';
import { formatSmokeReport, type SmokeResult } from './smokeOutput';
import { verifyUiBundleAtPath } from '../electron/uiBundleVerify';
import { verifyPackagedPortableExe, desktopReleaseDir } from './verifyPackagedDesktop';
import { launchInstalledDesktopApp } from './launchInstalledDesktopApp';

const LAST_STAMP_FILE = '.last-smoke-ui-timestamp.txt';

function desktopRoot(): string {
  return path.resolve(__dirname, '..');
}

function readPackageVersion(root: string): string {
  const p = path.join(root, 'package.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf-8')) as { version?: string };
  return typeof j.version === 'string' ? j.version : 'unknown';
}

function readPreviousUiTimestamp(root: string): string | null {
  const f = path.join(root, LAST_STAMP_FILE);
  if (!fs.existsSync(f)) return null;
  try {
    return fs.readFileSync(f, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function writeLastUiTimestamp(root: string, ts: string): void {
  fs.writeFileSync(path.join(root, LAST_STAMP_FILE), `${ts}\n`, 'utf-8');
}

function isProcessRunningWindows(pid: number): boolean {
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

function runDesktopPackage(root: string): { ok: boolean; detail?: string } {
  const r = spawnSync('npm', ['run', 'desktop:package'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    return { ok: false, detail: `npm run desktop:package exited with code ${r.status ?? 'null'}` };
  }
  return { ok: true };
}

export function runRebuildAndSmoke(): SmokeResult {
  if (process.platform !== 'win32') {
    return {
      ok: false,
      blockingStep: 'platform',
      detail: 'desktop:rebuild-and-smoke is supported on Windows only (electron-builder --win).',
    };
  }

  const root = desktopRoot();
  const prevTs = readPreviousUiTimestamp(root);

  const closed = closeStaleComposerOsDesktopProcesses();
  if (closed.warning) {
    console.error(`close stale processes: ${closed.warning}`);
  }

  const pack = runDesktopPackage(root);
  if (!pack.ok) {
    return { ok: false, blockingStep: 'desktop:package', detail: pack.detail };
  }

  const releaseDir = desktopReleaseDir(root);
  let verified: { absolutePath: string };
  try {
    verified = verifyPackagedPortableExe(releaseDir);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, blockingStep: 'verify-packaged-exe', detail: msg };
  }

  const uiDir = path.join(root, 'resources', 'ui');
  const uiVerify = verifyUiBundleAtPath(uiDir);
  if (!uiVerify.ok) {
    return {
      ok: false,
      blockingStep: 'ui-bundle-stamp',
      detail: uiVerify.reason,
    };
  }

  const uiTs = uiVerify.stamp.buildTimestamp;
  if (prevTs && uiTs <= prevTs) {
    return {
      ok: false,
      blockingStep: 'ui-timestamp-not-newer',
      detail: `Expected UI buildTimestamp after previous smoke (${prevTs}), got ${uiTs}.`,
    };
  }

  const launch = launchInstalledDesktopApp(verified.absolutePath);
  if (!launch.launched) {
    return { ok: false, blockingStep: 'launch', detail: launch.reason };
  }

  try {
    execSync(`powershell.exe -NoProfile -Command "Start-Sleep -Milliseconds 2500"`, {
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch {
    /* still check pid */
  }

  const stillRunning = isProcessRunningWindows(launch.pid);
  if (!stillRunning) {
    return {
      ok: false,
      blockingStep: 'process-exit',
      detail: `Process ${launch.pid} did not stay running after launch (check AV or crash).`,
    };
  }

  writeLastUiTimestamp(root, uiTs);

  return {
    ok: true,
    packagedExePath: verified.absolutePath,
    launched: true,
    buildVersion: readPackageVersion(root),
    uiBuildTimestamp: uiTs,
  };
}

function main(): void {
  const r = runRebuildAndSmoke();
  console.log(formatSmokeReport(r));
  process.exit(r.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}
