/**
 * Packaged-safe open-folder helper bundle (no engines/ path at runtime).
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const desktopRoot = path.resolve(__dirname, '..');

describe('open-folder-helpers.cjs (packaged IPC)', () => {
  it('exists after build and resolves folders without missing-module errors', () => {
    const bundlePath = path.join(desktopRoot, 'resources', 'open-folder-helpers.cjs');
    expect(fs.existsSync(bundlePath)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(bundlePath) as {
      resolveOpenFolderTarget: (
        root: string,
        body?: { path?: string }
      ) => { ok: true; target: string } | { ok: false; message: string };
      ensureFolderForOpen: (dir: string) => { ok: true; path: string } | { ok: false; message: string };
    };
    const fakeRoot = path.join(desktopRoot, 'resources');
    const r = mod.resolveOpenFolderTarget(fakeRoot, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(path.resolve(r.target)).toBe(path.resolve(fakeRoot));
    }
  });
});
