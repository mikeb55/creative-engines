/**
 * Remove legacy versioned portable/setup artifacts in release/ after electron-builder.
 * Stable outputs overwrite in place: Composer-OS.exe, Composer-OS-Setup.exe.
 * Never throws — packaging must not fail if cleanup fails.
 */
import * as fs from 'fs';
import * as path from 'path';
import { VERSIONED_PORTABLE_FILE_RE } from './installRules';

/** Legacy patterns from before stable filenames (version in filename). */
const LEGACY_SETUP = /^Composer-OS-Desktop-[\d.]+-Setup\.exe$/i;

export type PruneResult = { deleted: string[]; kept: string[] };

export type PruneKeepResult = { deleted: string[]; kept: string[] };

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
      if (VERSIONED_PORTABLE_FILE_RE.test(f) || LEGACY_SETUP.test(f)) {
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

/**
 * Deletes older `Composer-OS-Desktop-*-portable.exe` files, keeping the `keepCount` newest by mtime.
 * Does not touch `Composer-OS.exe`, installers, or other artifacts.
 */
export function pruneVersionedPortablesKeepLast(releaseDir: string, keepCount: number): PruneKeepResult {
  const deleted: string[] = [];
  const kept: string[] = [];
  try {
    if (!fs.existsSync(releaseDir) || keepCount < 1) {
      return { deleted, kept };
    }
    const names = fs.readdirSync(releaseDir).filter((f) => VERSIONED_PORTABLE_FILE_RE.test(f));
    if (names.length <= keepCount) {
      return { deleted, kept: names };
    }
    const withMtime = names.map((f) => {
      const p = path.join(releaseDir, f);
      return { f, m: fs.statSync(p).mtimeMs };
    });
    withMtime.sort((a, b) => b.m - a.m);
    const survivors = new Set(withMtime.slice(0, keepCount).map((x) => x.f));
    for (const x of withMtime) {
      if (survivors.has(x.f)) {
        kept.push(x.f);
        continue;
      }
      try {
        fs.unlinkSync(path.join(releaseDir, x.f));
        deleted.push(x.f);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return { deleted, kept };
}
