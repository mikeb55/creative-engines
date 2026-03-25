/**
 * One command: build UI + package Windows portable, resolve latest portable exe, update Desktop shortcut.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { resolveRefreshDesktopExe } from './installRules';
import { desktopReleaseDir, verifyPortableExeByName } from './verifyPackagedDesktop';
import { installComposerOsDesktopIcon } from './installDesktopIcon';
import { pruneVersionedPortablesKeepLast } from './pruneOldPortableExes';
import { isWindows } from './shortcutUtils';

export type RefreshDesktopResult =
  | { ok: true; exePath: string; shortcutPath: string; launched: boolean }
  | { ok: false; message: string };

export type RefreshDesktopOptions = {
  desktopRoot: string;
  /** When true, do not start the app after updating the shortcut (default). */
  skipLaunch?: boolean;
  /** When true, skip pruning older `Composer-OS-Desktop-*-portable.exe` files. */
  skipPrune?: boolean;
  /** How many newest versioned portables to keep when pruning (default 3). */
  keepCount?: number;
};

function runNpmScript(root: string, script: string): { ok: boolean; detail?: string } {
  const r = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    return { ok: false, detail: `npm run ${script} exited with code ${r.status ?? 'null'}` };
  }
  return { ok: true };
}

export function runRefreshDesktop(opts: RefreshDesktopOptions): RefreshDesktopResult {
  const { desktopRoot, skipLaunch = true, skipPrune = false, keepCount = 3 } = opts;

  if (!isWindows()) {
    return {
      ok: false,
      message: 'FAIL: refresh:desktop requires Windows (electron-builder --win and shortcut update).',
    };
  }

  const pack = runNpmScript(desktopRoot, 'desktop:package-no-bump');
  if (!pack.ok) {
    return { ok: false, message: `FAIL: ${pack.detail ?? 'Package step failed.'}` };
  }

  const releaseDir = desktopReleaseDir(desktopRoot);

  if (!skipPrune) {
    const pr = pruneVersionedPortablesKeepLast(releaseDir, keepCount);
    if (pr.deleted.length > 0) {
      console.log('[refresh:desktop] pruned old versioned portables:', pr.deleted.join(', '));
    }
  }

  const fileName = resolveRefreshDesktopExe(releaseDir);
  if (!fileName) {
    return {
      ok: false,
      message: `FAIL: No portable exe in ${releaseDir}. Expected Composer-OS.exe or Composer-OS-Desktop-*-portable.exe.`,
    };
  }

  let verified;
  try {
    verified = verifyPortableExeByName(releaseDir, fileName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `FAIL: ${msg}` };
  }

  try {
    const r = installComposerOsDesktopIcon(desktopRoot, {
      portableExe: verified.absolutePath,
      skipLaunch,
    });
    return {
      ok: true,
      exePath: verified.absolutePath,
      shortcutPath: r.shortcutPath,
      launched: r.launched,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `FAIL: ${msg}` };
  }
}
