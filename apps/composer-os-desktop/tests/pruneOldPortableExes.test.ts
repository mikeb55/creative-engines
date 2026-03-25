/**
 * Prune legacy release artifacts (temp dirs; no real packaging).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { pruneOldPortableExes } from '../install/pruneOldPortableExes';

describe('pruneOldPortableExes', () => {
  it('removes legacy versioned portable and setup names; keeps stable outputs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-prune-'));
    const legacyP = path.join(dir, 'Composer-OS-Desktop-1.0.1-portable.exe');
    const legacyS = path.join(dir, 'Composer-OS-Desktop-1.0.1-Setup.exe');
    const stable = path.join(dir, 'Composer-OS.exe');
    const stableSetup = path.join(dir, 'Composer-OS-Setup.exe');
    fs.writeFileSync(legacyP, 'x');
    fs.writeFileSync(legacyS, 'x');
    fs.writeFileSync(stable, 'x');
    fs.writeFileSync(stableSetup, 'x');
    const r = pruneOldPortableExes(dir);
    expect(r.deleted).toContain('Composer-OS-Desktop-1.0.1-portable.exe');
    expect(r.deleted).toContain('Composer-OS-Desktop-1.0.1-Setup.exe');
    expect(fs.existsSync(stable)).toBe(true);
    expect(fs.existsSync(stableSetup)).toBe(true);
    expect(fs.existsSync(legacyP)).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty for missing release dir', () => {
    const dir = path.join(os.tmpdir(), `cos-missing-prune-${Date.now()}`);
    const r = pruneOldPortableExes(dir);
    expect(r.deleted.length).toBe(0);
  });
});
