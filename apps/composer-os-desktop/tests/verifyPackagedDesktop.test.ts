/**
 * verifyPackagedDesktop rules (temp dirs; no electron-builder).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { verifyPackagedPortableExe } from '../install/verifyPackagedDesktop';

describe('verifyPackagedPortableExe', () => {
  it('throws when release dir is missing', () => {
    const d = path.join(os.tmpdir(), `cos-missing-${Date.now()}`);
    expect(() => verifyPackagedPortableExe(d)).toThrow(/does not exist/i);
  });

  it('throws when no portable exe in release dir', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-empty-rel-'));
    expect(() => verifyPackagedPortableExe(dir)).toThrow(/No packaged portable exe/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('throws when exe is too small', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-tiny-'));
    const p = path.join(dir, 'Composer-OS-Desktop-1.0.1-portable.exe');
    fs.writeFileSync(p, Buffer.alloc(100));
    expect(() => verifyPackagedPortableExe(dir)).toThrow(/too small/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns absolute path for stable Composer-OS.exe', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-ok-'));
    const p = path.join(dir, 'Composer-OS.exe');
    fs.writeFileSync(p, Buffer.alloc(5000));
    const r = verifyPackagedPortableExe(dir);
    expect(r.absolutePath).toBe(path.resolve(p));
    expect(r.fileName).toBe('Composer-OS.exe');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('prefers Composer-OS.exe over legacy portables when both exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-prefer-'));
    const stable = path.join(dir, 'Composer-OS.exe');
    const legacy = path.join(dir, 'Composer-OS-Desktop-9.9.9-portable.exe');
    fs.writeFileSync(stable, Buffer.alloc(5000));
    fs.writeFileSync(legacy, Buffer.alloc(5000));
    const r = verifyPackagedPortableExe(dir);
    expect(r.fileName).toBe('Composer-OS.exe');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('picks newest portable exe by mtime when multiple exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-multi-'));
    const older = path.join(dir, 'Composer-OS-Desktop-1.0.0-portable.exe');
    const newer = path.join(dir, 'Composer-OS-Desktop-2.0.0-portable.exe');
    fs.writeFileSync(older, Buffer.alloc(5000));
    fs.utimesSync(older, new Date(2000, 0, 1), new Date(2000, 0, 1));
    fs.writeFileSync(newer, Buffer.alloc(5000));
    fs.utimesSync(newer, new Date(2025, 0, 1), new Date(2025, 0, 1));
    const r = verifyPackagedPortableExe(dir);
    expect(r.fileName).toBe('Composer-OS-Desktop-2.0.0-portable.exe');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
