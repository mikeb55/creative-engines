/**
 * User-facing release labels are independent of the desktop package semver.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const identityPath = path.join(__dirname, '..', 'electron', 'releaseIdentity.json');

describe('Composer OS release identity', () => {
  const identity = JSON.parse(fs.readFileSync(identityPath, 'utf-8')) as {
    stable: { releaseLabel: string; windowTitle: string };
    dev: { releaseLabel: string; windowTitle: string };
  };

  it('keeps STABLE on V3.1 and DEV on V3.4', () => {
    expect(identity.stable).toEqual({
      releaseLabel: 'V3.1',
      windowTitle: 'Composer OS — V3.1',
    });
    expect(identity.dev).toEqual({
      releaseLabel: 'V3.4',
      windowTitle: 'Composer OS DEV — V3.4',
    });
  });

  it('window title is read from release identity, not the package semver', () => {
    const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.ts'), 'utf-8');
    expect(mainSrc).toContain('releaseDisplayForChannel(desktopChannel).windowTitle');
    expect(mainSrc).not.toContain('Composer OS - v${app.getVersion()}');
  });
});
