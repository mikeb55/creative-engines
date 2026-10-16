/**
 * Desktop package semver is the installer number. The window title follows releaseIdentity.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const desktopRoot = path.resolve(__dirname, '..');

describe('Composer OS Desktop versioning', () => {
  it('package.json version is semver', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      version: string;
    };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('electron-builder uses stable portable and setup filenames (no version in name)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build: { portable: { artifactName: string }; nsis: { artifactName?: string } };
    };
    expect(pkg.build.portable.artifactName).toBe('Composer-OS.exe');
    expect(pkg.build.nsis.artifactName).toBe('Composer-OS-Setup.exe');
  });

  it('BrowserWindow title uses the release identity, not the package semver', () => {
    const mainSrc = fs.readFileSync(path.join(desktopRoot, 'electron', 'main.ts'), 'utf-8');
    expect(mainSrc).toContain('releaseDisplayForChannel(desktopChannel).windowTitle');
    expect(mainSrc).not.toContain('Composer OS - v${app.getVersion()}');
  });

  it('web shell header shows the desktop release title', () => {
    const appSrc = fs.readFileSync(
      path.join(desktopRoot, '..', 'composer-os-app', 'src', 'App.tsx'),
      'utf-8'
    );
    expect(appSrc).toContain('document.title = m.displayTitle');
    expect(appSrc).toContain('desktopDisplayTitle');
    expect(appSrc).not.toContain('Composer OS - v${desktopVersion}');
  });
});
