/**
 * Clean-room desktop: IPC bundle, file-based UI load, new product identity (static).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('Desktop IPC clean-room (static)', () => {
  it('package.json uses clean app id and Composer OS Desktop product name', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.build.appId).toBe('com.mikeb55.composeros.desktop');
    expect(pkg.build.productName).toBe('Composer OS Desktop');
    expect(pkg.build.portable.artifactName).toBe('Composer-OS.exe');
  });

  it('main loads UI from file path, not localhost URL', () => {
    const main = fs.readFileSync(path.join(desktopRoot, 'electron', 'main.ts'), 'utf-8');
    expect(main).toContain('loadFile');
    expect(main).not.toMatch(/loadURL\s*\(\s*`http:/);
    expect(main).not.toContain('127.0.0.1');
  });

  it('preload exposes IPC invoke bridge', () => {
    const pre = fs.readFileSync(path.join(desktopRoot, 'electron', 'preload.ts'), 'utf-8');
    expect(pre).toContain('invokeApi');
    expect(pre).toContain('getRuntimeBuildInfo');
    expect(pre).toContain('integration');
    expect(pre).toContain("'ipc'");
  });

  it('ipc entry registers runtime build info handler', () => {
    const ipc = fs.readFileSync(path.join(desktopRoot, 'electron', 'ipcEntry.ts'), 'utf-8');
    expect(ipc).toContain('composer-os-api:get-runtime-build-info');
    expect(ipc).toContain('getComposerOsRuntimeBuildInfo');
  });

  it('renderer api uses IPC when integration is ipc', () => {
    const api = fs.readFileSync(
      path.join(desktopRoot, '..', 'composer-os-app', 'src', 'services', 'api.ts'),
      'utf-8'
    );
    expect(api).toContain('isDesktopIpc');
    expect(api).toContain('composer-os-api:get-presets');
  });

  it('desktop IPC bundle exists after build', () => {
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'desktop-ipc.bundle.cjs'))).toBe(true);
  });
});
