/**
 * Test-only output root for Piano V1.1 suites.
 * Production persist still uses the Composer OS library folders.
 * Archived acceptance directories are never write targets.
 */

import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const REPO = resolve(__dirname, '../../..');

const ARCHIVED_ROOTS = [
  resolve(REPO, '.tmp-piano-v1.1-stage-a'),
  resolve(REPO, '.tmp-piano-v1.1-stage-b'),
  resolve(REPO, '.tmp-piano-v1.1-musical-acceptance'),
  resolve(REPO, '.tmp-piano-v1'),
];

function insideArchived(path: string): boolean {
  const resolved = resolve(path);
  return ARCHIVED_ROOTS.some((root) => resolved === root || resolved.startsWith(`${root}${sep}`));
}

/** Unique directory unless PIANO_V11_TEST_OUTPUT_ROOT names a safe parent. */
export function pianoV11IsolatedOutput(label: string): string {
  const override = process.env.PIANO_V11_TEST_OUTPUT_ROOT?.trim();
  if (override) {
    const root = resolve(override);
    const dir = join(root, label);
    if (insideArchived(root) || insideArchived(dir)) {
      throw new Error(`PIANO_V11_TEST_OUTPUT_ROOT refuses archived acceptance: ${dir}`);
    }
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  return mkdtempSync(join(tmpdir(), `piano-v11-${label}-`));
}
