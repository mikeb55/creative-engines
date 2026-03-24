/**
 * Scan known locations and quarantine legacy / stale Composer-related shortcuts.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  collectLnkFiles,
  defaultQuarantineDir,
  getShortcutSearchRoots,
  isWindows,
  moveToQuarantine,
  readShortcutTarget,
} from './shortcutUtils';
import { shouldQuarantineShortcut } from './installRules';

export type CleanupResult = {
  quarantineDir: string;
  quarantined: string[];
  scanned: number;
};

export function cleanupLegacyShortcuts(canonicalPortableExe: string, quarantineDir = defaultQuarantineDir()): CleanupResult {
  const quarantined: string[] = [];
  if (!isWindows()) {
    return { quarantineDir, quarantined, scanned: 0 };
  }

  const roots = getShortcutSearchRoots();
  const seen = new Set<string>();
  let scanned = 0;

  for (const root of roots) {
    const lnks = collectLnkFiles(root, 5);
    for (const lnk of lnks) {
      const key = path.resolve(lnk).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      scanned += 1;
      let target = '';
      try {
        target = readShortcutTarget(lnk);
      } catch {
        target = '';
      }
      const base = path.basename(lnk);
      if (shouldQuarantineShortcut(base, target, canonicalPortableExe)) {
        try {
          const to = moveToQuarantine(lnk, quarantineDir);
          quarantined.push(`${lnk} -> ${to}`);
        } catch (e) {
          console.warn(`Could not quarantine ${lnk}:`, e);
        }
      }
    }
  }

  return { quarantineDir, quarantined, scanned };
}
