/**
 * CLI: remove legacy versioned portable/setup filenames from release/ after electron-builder.
 * Stable outputs are Composer-OS.exe and Composer-OS-Setup.exe (overwritten each build).
 */
import * as path from 'path';
import { pruneOldPortableExes } from './pruneOldPortableExes';

function main(): void {
  try {
    const root = path.resolve(__dirname, '..');
    const releaseDir = path.join(root, 'release');
    const r = pruneOldPortableExes(releaseDir);
    if (r.deleted.length > 0) {
      console.log('[prune] removed', r.deleted.join(', '));
    }
  } catch (e) {
    console.warn('[prune] skipped:', e instanceof Error ? e.message : String(e));
  }
}

main();
