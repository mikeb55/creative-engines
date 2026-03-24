/**
 * Desktop semver is the product version source; window title and artifacts follow it.
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

  it('electron-builder portable exe name uses ${version}', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build: { portable: { artifactName: string }; nsis: { artifactName?: string } };
    };
    expect(pkg.build.portable.artifactName).toBe('Composer-OS-Desktop-${version}-portable.exe');
    expect(pkg.build.nsis.artifactName).toBe('Composer-OS-Desktop-${version}-Setup.exe');
  });

  it('BrowserWindow title uses Composer OS - v{version} pattern', () => {
    const mainSrc = fs.readFileSync(path.join(desktopRoot, 'electron', 'main.ts'), 'utf-8');
    expect(mainSrc).toContain('Composer OS - v${app.getVersion()}');
  });
});
