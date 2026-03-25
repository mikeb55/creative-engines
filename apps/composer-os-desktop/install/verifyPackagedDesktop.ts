/**
 * Hard verification that electron-builder produced a real Windows portable executable.
 *
 * Output convention (electron-builder, `win.target` includes `portable`):
 *   <apps/composer-os-desktop>/release/Composer-OS.exe
 *   (stable filename; `desktop:package` still bumps package.json patch for in-app version only.)
 *
 * Other artifacts (not used by deploy scripts): `release/win-unpacked/Composer OS Desktop.exe`,
 * NSIS `release/*Setup*.exe`. Loose JS under `dist/` is not a packaged app.
 */
import * as fs from 'fs';
import * as path from 'path';
import { findCanonicalPortableExe } from './installRules';

export type VerifiedPortableExe = {
  /** Resolved absolute path to the portable .exe */
  absolutePath: string;
  fileName: string;
};

export function desktopReleaseDir(desktopAppRoot: string): string {
  return path.join(desktopAppRoot, 'release');
}

/**
 * Locates `Composer-OS.exe` in `release/` (or legacy `Composer-OS-Desktop-*-portable.exe`), asserts it exists on disk
 * and is a non-trivial `.exe` file. Prints the path when run as CLI.
 */
function verifyPortableExeStats(absolutePath: string, fileName: string): VerifiedPortableExe {
  let st: fs.Stats;
  try {
    st = fs.statSync(absolutePath);
  } catch {
    throw new Error(`Cannot stat packaged exe: ${absolutePath}`);
  }
  if (!st.isFile()) {
    throw new Error(`Packaged path is not a file: ${absolutePath}`);
  }
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext !== '.exe') {
    throw new Error(`Expected .exe extension, got "${ext}": ${absolutePath}`);
  }
  if (st.size < 4096) {
    throw new Error(`Packaged exe is too small (${st.size} bytes) to be valid: ${absolutePath}`);
  }
  return { absolutePath, fileName };
}

export function verifyPackagedPortableExe(releaseDir: string): VerifiedPortableExe {
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory does not exist: ${releaseDir}`);
  }
  const fileName = findCanonicalPortableExe(releaseDir);
  if (!fileName) {
    throw new Error(
      `No packaged portable exe in ${releaseDir}. Expected Composer-OS.exe (or legacy Composer-OS-Desktop-*-portable.exe). Run npm run desktop:package (electron-builder --win).`
    );
  }
  const absolutePath = path.resolve(releaseDir, fileName);
  return verifyPortableExeStats(absolutePath, fileName);
}

/** Same size/existence checks as {@link verifyPackagedPortableExe} for a known filename in `releaseDir`. */
export function verifyPortableExeByName(releaseDir: string, fileName: string): VerifiedPortableExe {
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory does not exist: ${releaseDir}`);
  }
  const absolutePath = path.resolve(releaseDir, fileName);
  return verifyPortableExeStats(absolutePath, fileName);
}

function cli(): void {
  const root = path.resolve(__dirname, '..');
  const r = verifyPackagedPortableExe(desktopReleaseDir(root));
  console.log('Verified packaged exe:', r.absolutePath);
}

if (require.main === module) {
  try {
    cli();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
