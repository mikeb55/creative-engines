/**
 * DEV candidate prelaunch gate. Builds a disposable bundle. Does not launch.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEV_CANDIDATE_PROVENANCE_SCHEMA,
  DEV_PRELAUNCH_CHECKS,
  assertDevCandidatePrelaunch,
  type DevCandidateProvenance,
} from '../install/devCandidatePrelaunch';
import { canonicalPath, type DevTestHints } from '../electron/devTestIsolation';

const disposables: string[] = [];
const COMMIT = 'a46514b5fd280ffaff6e176a2c0f9461c0da6740';
const MANIFEST = 'ab'.repeat(32);

function disposable(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dev-prelaunch-'));
  disposables.push(dir);
  return dir;
}

function hintsIn(parent: string): DevTestHints {
  const home = path.join(parent, 'home');
  const appData = path.join(home, 'Library', 'Application Support');
  mkdirSync(path.join(appData, 'composer-os-dev'), { recursive: true });
  mkdirSync(path.join(home, 'Documents'), { recursive: true });
  mkdirSync(path.join(home, 'Desktop'), { recursive: true });
  mkdirSync(path.join(home, 'Downloads'), { recursive: true });
  mkdirSync(path.join(home, 'Library'), { recursive: true });
  return { homeDir: home, appDataDir: appData };
}

function writeCandidate(root: string): string {
  const app = path.join(root, 'Composer OS DEV.app');
  const resources = path.join(app, 'Contents', 'Resources');
  mkdirSync(path.join(app, 'Contents', 'MacOS'), { recursive: true });
  mkdirSync(path.join(resources, 'wps-bryant'), { recursive: true });
  writeFileSync(path.join(app, 'Contents', 'MacOS', 'Composer OS DEV'), '');
  writeFileSync(
    path.join(app, 'Contents', 'Info.plist'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<plist version="1.0"><dict>',
      '<key>CFBundleIdentifier</key><string>com.mikeb55.composeros.dev</string>',
      '<key>CFBundleExecutable</key><string>Composer OS DEV</string>',
      '<key>CFBundleName</key><string>Composer OS DEV</string>',
      '</dict></plist>',
    ].join('\n')
  );
  writeFileSync(path.join(resources, 'desktop-channel.json'), '{"channel":"dev"}\n');
  writeFileSync(
    path.join(resources, 'releaseIdentity.json'),
    `${JSON.stringify({
      stable: { releaseLabel: 'V3.1', windowTitle: 'Composer OS — V3.1' },
      dev: { releaseLabel: 'V3.4', windowTitle: 'Composer OS DEV — V3.4' },
    })}\n`
  );
  writeFileSync(
    path.join(resources, 'composer-os-build-stamp.json'),
    `${JSON.stringify({
      schema: 'composer-os-build-stamp/v1',
      gitCommit: COMMIT,
      releaseIdentity: {
        dev: { releaseLabel: 'V3.4', windowTitle: 'Composer OS DEV — V3.4' },
      },
    })}\n`
  );
  writeFileSync(path.join(resources, 'api.bundle.js'), '');
  writeFileSync(path.join(resources, 'desktop-ipc.bundle.cjs'), '');
  writeFileSync(path.join(resources, 'wps-bryant', 'wps-bryant-signature.json'), '{}\n');
  writeFileSync(path.join(resources, 'wps-bryant', 'wps-bryant-preferences.md'), 'Black Aura\n');
  return app;
}

function provenanceFor(app: string, patch: Partial<DevCandidateProvenance> = {}): DevCandidateProvenance {
  return {
    schema: DEV_CANDIDATE_PROVENANCE_SCHEMA,
    baselineHead: COMMIT,
    approvedSourceCommit: COMMIT,
    sourceManifestSha256: MANIFEST,
    packagingPerformed: true,
    installationPerformed: false,
    candidateAppPath: app,
    ...patch,
  };
}

afterEach(() => {
  for (const dir of disposables.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('DEV candidate prelaunch', () => {
  it('requires the positive checks and ignores a test root by itself', () => {
    expect(DEV_PRELAUNCH_CHECKS).toEqual([
      'bundle-identifier',
      'channel-dev',
      'release-identity-v34',
      'build-stamp-commit',
      'repaired-source-provenance',
      'required-resources',
      'codesign-verify-deep-strict',
      'isolated-test-root-preflight',
    ]);
  });

  it('returns the exact executable when every check passes', () => {
    const parent = disposable();
    const hints = hintsIn(parent);
    const app = writeCandidate(disposable());
    const testRoot = path.join(disposable(), 'fresh');
    mkdirSync(testRoot);
    const result = assertDevCandidatePrelaunch({
      appPath: app,
      provenance: provenanceFor(app),
      testRoot,
      hints,
      verifySignature: () => undefined,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.launch.command).toBe(path.join(app, 'Contents', 'MacOS', 'Composer OS DEV'));
    expect(result.launch.args).toEqual([]);
    expect(path.isAbsolute(result.launch.command)).toBe(true);
    expect(result.launch.command).not.toBe('Composer OS DEV');
    expect(result.launch.env.COMPOSER_OS_DEV_TEST_ROOT).toBe(canonicalPath(testRoot));
    expect(result.launch.env.COMPOSER_OS_OUTPUT_DIR).toBe(path.join(canonicalPath(testRoot), 'exports'));
  });

  it('fails closed when only the test root is valid', () => {
    const parent = disposable();
    const hints = hintsIn(parent);
    const app = writeCandidate(disposable());
    writeFileSync(path.join(app, 'Contents', 'Resources', 'desktop-channel.json'), '{"channel":"stable"}\n');
    const testRoot = path.join(disposable(), 'fresh');
    mkdirSync(testRoot);
    const result = assertDevCandidatePrelaunch({
      appPath: app,
      provenance: provenanceFor(app),
      testRoot,
      hints,
      verifySignature: () => undefined,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((reason) => reason.includes('exactly dev'))).toBe(true);
  });

  it('fails closed on identity, stamp, provenance, resources, and containment disagreements', () => {
    const parent = disposable();
    const hints = hintsIn(parent);
    const app = writeCandidate(disposable());
    const plist = path.join(app, 'Contents', 'Info.plist');
    writeFileSync(plist, fsPlistWrong());
    writeFileSync(
      path.join(app, 'Contents', 'Resources', 'releaseIdentity.json'),
      `${JSON.stringify({ dev: { releaseLabel: 'V3.1', windowTitle: 'Composer OS — V3.1' } })}\n`
    );
    writeFileSync(
      path.join(app, 'Contents', 'Resources', 'composer-os-build-stamp.json'),
      `${JSON.stringify({ gitCommit: 'b'.repeat(40), releaseIdentity: { dev: { releaseLabel: 'V3.4', windowTitle: 'Composer OS DEV — V3.4' } } })}\n`
    );
    rmSync(path.join(app, 'Contents', 'Resources', 'wps-bryant', 'wps-bryant-signature.json'));
    const result = assertDevCandidatePrelaunch({
      appPath: app,
      provenance: provenanceFor(app, { packagingPerformed: false, approvedSourceCommit: 'c'.repeat(40) }),
      testRoot: path.join(hints.homeDir, 'Documents', 'not-isolated'),
      hints,
      verifySignature: () => {
        throw new Error('unsigned');
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const joined = result.reasons.join('\n');
    expect(joined).toContain('com.mikeb55.composeros.dev');
    expect(joined).toContain('V3.4');
    expect(joined).toContain('approved source commit');
    expect(joined).toContain('packaging has not occurred');
    expect(joined).toContain('wps-bryant-signature.json');
    expect(joined).toContain('unsigned');
    expect(joined).toContain('protected location');
  });

  it('refuses an application name and an installed Applications path', () => {
    const parent = disposable();
    const hints = hintsIn(parent);
    const named = assertDevCandidatePrelaunch({
      appPath: 'Composer OS DEV',
      provenance: provenanceFor('/tmp/unused.app'),
      testRoot: path.join(disposable(), 'fresh'),
      hints,
      verifySignature: () => undefined,
    });
    expect(named.ok).toBe(false);
    if (!named.ok) expect(named.reasons.some((reason) => reason.includes('application name'))).toBe(true);

    const installed = assertDevCandidatePrelaunch({
      appPath: '/Applications/Composer OS DEV.app',
      provenance: provenanceFor('/Applications/Composer OS DEV.app'),
      testRoot: path.join(disposable(), 'fresh'),
      hints,
      verifySignature: () => undefined,
    });
    expect(installed.ok).toBe(false);
    if (!installed.ok) expect(installed.reasons.some((reason) => reason.includes('/Applications'))).toBe(true);
  });

  it('fails closed when the real codesign verifier rejects an unsigned bundle', () => {
    const parent = disposable();
    const hints = hintsIn(parent);
    const app = writeCandidate(disposable());
    const testRoot = path.join(disposable(), 'fresh');
    mkdirSync(testRoot);
    const result = assertDevCandidatePrelaunch({
      appPath: app,
      provenance: provenanceFor(app),
      testRoot,
      hints,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((reason) => reason.includes('codesign --verify --deep --strict'))).toBe(true);
  });
});

function fsPlistWrong(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0"><dict>',
    '<key>CFBundleIdentifier</key><string>com.mikeb55.composeros.desktop</string>',
    '<key>CFBundleExecutable</key><string>Composer OS Desktop</string>',
    '<key>CFBundleName</key><string>Composer OS Desktop</string>',
    '</dict></plist>',
  ].join('\n');
}
