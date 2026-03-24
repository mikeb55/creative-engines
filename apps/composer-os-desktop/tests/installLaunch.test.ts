/**
 * Install launcher (unit tests; no real Windows shell).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { launchInstalledDesktopApp } from '../install/launchInstalledDesktopApp';

const installRoot = path.resolve(__dirname, '..', 'install');

describe('launchInstalledDesktopApp source', () => {
  it('does not reference dev server URLs or npm script invocations', () => {
    const src = fs.readFileSync(path.join(installRoot, 'launchInstalledDesktopApp.ts'), 'utf-8');
    const lower = src.toLowerCase();
    expect(lower).not.toMatch(/localhost|127\.0\.0\.1|:5173/);
    expect(lower).not.toContain('npm run');
  });
});

describe('launchInstalledDesktopApp', () => {
  it('returns launched:false when exe path does not exist', () => {
    const r = launchInstalledDesktopApp(path.join(os.tmpdir(), 'nonexistent-portable.exe'));
    expect(r.launched).toBe(false);
    if (!r.launched) {
      expect(r.reason).toMatch(/not found/i);
    }
  });

  it('passes resolved exe path as spawn first argument (static)', () => {
    const src = fs.readFileSync(path.join(installRoot, 'launchInstalledDesktopApp.ts'), 'utf-8');
    expect(src).toMatch(/spawn\(resolved/);
  });
});
