/**
 * CLI: prune old portable exes after electron-builder (best-effort).
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
