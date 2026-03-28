/**
 * Packaged desktop must ship `composer-os-build-stamp.json` whose SHA-256 entries match
 * `resources/desktop-ipc.bundle.cjs` and `resources/api.bundle.js` (detects stale IPC/engine bundles).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';

const desktopRoot = path.resolve(__dirname, '..');

function sha256File(p: string): string {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

describe('composer-os-build-stamp vs bundle artifacts', () => {
  it('stamp exists and ipc + api hashes match files on disk', () => {
    const stampPath = path.join(desktopRoot, 'resources', 'composer-os-build-stamp.json');
    const ipcPath = path.join(desktopRoot, 'resources', 'desktop-ipc.bundle.cjs');
    const apiPath = path.join(desktopRoot, 'resources', 'api.bundle.js');
    expect(fs.existsSync(stampPath), `missing ${stampPath} — run npm run build:stamp`).toBe(true);
    expect(fs.existsSync(ipcPath)).toBe(true);
    expect(fs.existsSync(apiPath)).toBe(true);
    const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf-8')) as {
      ipcBundle: { sha256: string };
      apiBundle: { sha256: string };
    };
    expect(sha256File(ipcPath)).toBe(stamp.ipcBundle.sha256);
    expect(sha256File(apiPath)).toBe(stamp.apiBundle.sha256);
  });
});
