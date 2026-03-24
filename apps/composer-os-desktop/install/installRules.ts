/**
 * Pure rules for legacy / stale Composer-related shortcuts (unit-tested).
 */
import * as fs from 'fs';
import * as path from 'path';

export const LEGACY_NAME_SUBSTRINGS = [
  'composer studio',
  'composer-studio',
  'composer-studio-app',
] as const;

export function normalizeFsPath(p: string): string {
  return path.normalize(p).replace(/\//g, '\\').toLowerCase();
}

/** True if the shortcut file name suggests legacy Composer Studio / old app naming. */
export function isLegacyProductShortcutName(fileName: string): boolean {
  const n = fileName.toLowerCase();
  for (const s of LEGACY_NAME_SUBSTRINGS) {
    if (n.includes(s)) return true;
  }
  return false;
}

/** True if target path looks like a legacy Studio / wrong-app payload. */
export function isLegacyOrForbiddenTarget(targetPath: string): boolean {
  if (!targetPath.trim()) return false;
  const t = targetPath.toLowerCase().replace(/\//g, '\\');
  if (t.includes('composer-studio')) return true;
  if (t.includes('composer_studio')) return true;
  if (t.includes('composer-studio-app')) return true;
  if (t.includes('\\composer studio\\')) return true;
  return false;
}

/** Heuristic: packaged Composer OS desktop portable or installer exe. */
export function looksLikeComposerOsPackagedExe(targetPath: string): boolean {
  if (!targetPath.trim()) return false;
  const t = targetPath.toLowerCase().replace(/\//g, '\\');
  if (t.includes('composer-os-') && t.endsWith('-portable.exe')) return true;
  if (t.includes('composer os setup') && t.endsWith('.exe')) return true;
  if (t.includes('composer-os-desktop') && t.endsWith('.exe')) return true;
  if (t.endsWith('composer os.exe')) return true;
  return false;
}

/** User-facing shortcuts for this product line (clean-room + legacy exact names). */
export function isCleanDesktopShortcutName(fileName: string): boolean {
  const base = fileName.replace(/\.lnk$/i, '').trim().toLowerCase();
  return base === 'composer os' || base === 'composer os desktop';
}

/**
 * Whether to remove/quarantine a .lnk in search locations.
 * Legacy Studio / forbidden targets always; exact "Composer OS" / "Composer OS Desktop" shortcut only if target !== current portable exe.
 */
export function shouldQuarantineShortcut(
  shortcutFileName: string,
  targetPath: string,
  canonicalPortableExe: string
): boolean {
  if (isLegacyProductShortcutName(shortcutFileName)) return true;
  if (isLegacyOrForbiddenTarget(targetPath)) return true;

  const canon = normalizeFsPath(canonicalPortableExe);
  const tgt = targetPath.trim() ? normalizeFsPath(targetPath) : '';

  if (isCleanDesktopShortcutName(shortcutFileName)) {
    if (!tgt || tgt !== canon) return true;
    return false;
  }

  return false;
}

/** Resolve newest Composer-OS-Desktop-*-portable.exe in release dir by mtime. */
export function findCanonicalPortableExe(releaseDir: string): string | null {
  if (!fs.existsSync(releaseDir)) return null;
  let names: string[];
  try {
    names = fs.readdirSync(releaseDir);
  } catch {
    return null;
  }
  const portable = names.filter((f) => /^Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(f));
  if (portable.length === 0) return null;
  const withMtime = portable.map((f) => {
    const p = path.join(releaseDir, f);
    return { f, m: fs.statSync(p).mtimeMs };
  });
  withMtime.sort((a, b) => b.m - a.m);
  return withMtime[0].f;
}
