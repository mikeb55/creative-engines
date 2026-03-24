/**
 * Prune old portable exes (temp dirs; no real packaging).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { pruneOldPortableExes } from '../install/pruneOldPortableExes';

describe('pruneOldPortableExes', () => {
  it('keeps all when count <= keep', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-prune-'));
    const f1 = path.join(dir, 'Composer-OS-Desktop-1.0.1-portable.exe');
    fs.writeFileSync(f1, 'x');
    const r = pruneOldPortableExes(dir, 3);
    expect(r.deleted.length).toBe(0);
    expect(fs.existsSync(f1)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('removes older files beyond keep count', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-prune-'));
    const names = ['1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5'].map(
      (v) => `Composer-OS-Desktop-${v}-portable.exe`
    );
    for (let i = 0; i < names.length; i++) {
      const p = path.join(dir, names[i]);
      fs.writeFileSync(p, 'x');
      const t = new Date(2000 + i, 0, 1);
      fs.utimesSync(p, t, t);
    }
    const r = pruneOldPortableExes(dir, 3);
    expect(r.deleted.length).toBe(2);
    expect(fs.existsSync(path.join(dir, 'Composer-OS-Desktop-1.0.5-portable.exe'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'Composer-OS-Desktop-1.0.4-portable.exe'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'Composer-OS-Desktop-1.0.3-portable.exe'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'Composer-OS-Desktop-1.0.1-portable.exe'))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty for missing release dir', () => {
    const dir = path.join(os.tmpdir(), `cos-missing-prune-${Date.now()}`);
    const r = pruneOldPortableExes(dir, 3);
    expect(r.deleted.length).toBe(0);
  });
});
