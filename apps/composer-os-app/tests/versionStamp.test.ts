/**
 * UI stamp semver follows Composer OS Desktop package.json in the monorepo.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { resolveAppShellVersion } from '../vite/composerOsUiStampPlugin';

const appRoot = path.resolve(__dirname, '..');

describe('resolveAppShellVersion', () => {
  it('matches apps/composer-os-desktop/package.json when present', () => {
    const desktopPkgPath = path.join(appRoot, '..', 'composer-os-desktop', 'package.json');
    expect(fs.existsSync(desktopPkgPath)).toBe(true);
    const desktop = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8')) as { version: string };
    expect(resolveAppShellVersion(appRoot)).toBe(desktop.version);
  });
});
