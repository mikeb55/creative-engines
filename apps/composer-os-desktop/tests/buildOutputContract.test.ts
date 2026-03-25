/**
 * Stable Windows build output: fixed filenames under release/, version only in app metadata.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { STABLE_PORTABLE_FILE_NAME, STABLE_SETUP_FILE_NAME } from '../install/installRules';

const desktopRoot = path.resolve(__dirname, '..');

describe('Stable desktop build output (Prompt 4/5)', () => {
  it('electron-builder output directory is a single stable release folder', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build: { directories?: { output?: string } };
    };
    expect(pkg.build.directories?.output).toBe('release');
  });

  it('portable and NSIS artifact names have no version token and match installRules constants', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build: { portable: { artifactName: string }; nsis: { artifactName?: string } };
    };
    expect(pkg.build.portable.artifactName).toBe(STABLE_PORTABLE_FILE_NAME);
    expect(pkg.build.nsis.artifactName).toBe(STABLE_SETUP_FILE_NAME);
    expect(pkg.build.portable.artifactName).not.toMatch(/\$\{|\d+\.\d+/);
    expect(pkg.build.nsis.artifactName).not.toMatch(/\$\{|\d+\.\d+/);
  });

  it('post-build logger references stable portable path for shortcuts', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'logReleaseArtifactsCli.ts'), 'utf-8');
    expect(src).toContain('STABLE_PORTABLE_FILE_NAME');
    expect(src).toContain('Use for shortcuts');
  });

  it('versioned portable filename is optional fallback only (legacy migration)', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'installRules.ts'), 'utf-8');
    expect(src).toContain('Composer-OS-Desktop-');
    expect(src).toContain('findCanonicalPortableExe');
  });
});
