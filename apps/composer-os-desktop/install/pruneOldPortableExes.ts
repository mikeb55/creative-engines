/**
 * Remove older Composer-OS-Desktop-*-portable.exe files in release/ (keep newest N by mtime).
 * Never throws — packaging must not fail if cleanup fails.
 */
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_KEEP = 3;

export type PruneResult = { deleted: string[]; kept: string[] };

export function pruneOldPortableExes(releaseDir: string, keepCount = DEFAULT_KEEP): PruneResult {
  const deleted: string[] = [];
  const kept: string[] = [];
  try {
    if (!fs.existsSync(releaseDir)) {
      return { deleted, kept };
    }
    const names = fs.readdirSync(releaseDir);
    const portable = names.filter((f) => /^Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(f));
    if (portable.length <= keepCount) {
      return { deleted, kept: portable };
    }
    const withMtime = portable.map((f) => {
      const p = path.join(releaseDir, f);
      return { f, m: fs.statSync(p).mtimeMs };
    });
    withMtime.sort((a, b) => b.m - a.m);
    const keep = withMtime.slice(0, keepCount);
    const remove = withMtime.slice(keepCount);
    kept.push(...keep.map((x) => x.f));
    for (const { f } of remove) {
      try {
        fs.unlinkSync(path.join(releaseDir, f));
        deleted.push(f);
      } catch {
        /* ignore locked or missing */
      }
    }
  } catch {
    /* ignore */
  }
  return { deleted, kept };
}
