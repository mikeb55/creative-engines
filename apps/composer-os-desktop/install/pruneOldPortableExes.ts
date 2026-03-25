/**
 * Remove legacy versioned portable/setup artifacts in release/ after electron-builder.
 * Stable outputs overwrite in place: Composer-OS.exe, Composer-OS-Setup.exe.
 * Never throws — packaging must not fail if cleanup fails.
 */
import * as fs from 'fs';
import * as path from 'path';

/** Legacy patterns from before stable filenames (version in filename). */
const LEGACY_PORTABLE = /^Composer-OS-Desktop-[\d.]+-portable\.exe$/i;
const LEGACY_SETUP = /^Composer-OS-Desktop-[\d.]+-Setup\.exe$/i;

export type PruneResult = { deleted: string[]; kept: string[] };

/** @deprecated keepCount ignored — legacy files are removed entirely */
export function pruneOldPortableExes(releaseDir: string, _keepCount?: number): PruneResult {
  const deleted: string[] = [];
  const kept: string[] = [];
  try {
    if (!fs.existsSync(releaseDir)) {
      return { deleted, kept };
    }
    const names = fs.readdirSync(releaseDir);
    for (const f of names) {
      if (LEGACY_PORTABLE.test(f) || LEGACY_SETUP.test(f)) {
        try {
          fs.unlinkSync(path.join(releaseDir, f));
          deleted.push(f);
        } catch {
          /* ignore locked or missing */
        }
      } else {
        kept.push(f);
      }
    }
  } catch {
    /* ignore */
  }
  return { deleted, kept };
}
