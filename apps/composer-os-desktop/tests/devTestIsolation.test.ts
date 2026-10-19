import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pentatonicExportDirectory } from '../electron/pentatonicDesktopExport';
import {
  containedJoin,
  devProfilePaths,
  getActiveDevTestLayout,
  materialiseDevTestLayout,
  pathIsInside,
  resolveContainedDocumentSave,
  setActiveDevTestLayout,
  startDesktopProcess,
  testRootWriteError,
  validateDevTestRoot,
  type DevTestHints,
  type StartupDeps,
} from '../electron/devTestIsolation';

const disposables: string[] = [];

function disposable(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'composer-os-dev-test-'));
  disposables.push(dir);
  return dir;
}

function hintsIn(parent: string): { hints: DevTestHints; home: string; appData: string } {
  const home = path.join(parent, 'home');
  const appData = path.join(home, 'Library', 'Application Support');
  mkdirSync(path.join(appData, 'composer-os-dev'), { recursive: true });
  mkdirSync(path.join(home, 'Documents'), { recursive: true });
  mkdirSync(path.join(home, 'Desktop'), { recursive: true });
  mkdirSync(path.join(home, 'Downloads'), { recursive: true });
  mkdirSync(path.join(home, 'Library'), { recursive: true });
  return { hints: { homeDir: home, appDataDir: appData }, home, appData };
}

function freshRoot(): string {
  return path.join(disposable(), 'candidate');
}

afterEach(() => {
  setActiveDevTestLayout(null);
  delete process.env.COMPOSER_OS_DEV_TEST_SESSION_ROOT;
  for (const dir of disposables.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('DEV test-root isolation', () => {
  it('accepts a fresh absolute test root and separates writable directories', () => {
    const parent = disposable();
    const { hints } = hintsIn(parent);
    const root = path.join(disposable(), 'fresh');
    mkdirSync(root);
    const result = validateDevTestRoot(root, hints, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    materialiseDevTestLayout(result.layout);
    for (const dir of [result.layout.userData, result.layout.exports, result.layout.documents, result.layout.tmp]) {
      expect(pathIsInside(result.layout.root, dir)).toBe(true);
    }
    expect(result.layout.userData).not.toBe(devProfilePaths(hints).userData);
  });

  it('rejects a relative test root', () => {
    const { hints } = hintsIn(disposable());
    const result = validateDevTestRoot('relative/dev-profile', hints, undefined);
    expect(result.ok).toBe(false);
  });

  it('rejects a symlink that escapes into a protected directory', () => {
    const parent = disposable();
    const { hints, home } = hintsIn(parent);
    const secret = path.join(home, 'Documents', 'secret');
    mkdirSync(secret, { recursive: true });
    const link = path.join(disposable(), 'link');
    symlinkSync(secret, link);
    const result = validateDevTestRoot(link, hints, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/protected/i);
  });

  it('rejects the real DEV profile and its descendants', () => {
    const home = os.homedir();
    const appData = path.join(home, 'Library', 'Application Support');
    const hints = { homeDir: home, appDataDir: appData };
    const profile = path.join(appData, 'composer-os-dev');
    expect(validateDevTestRoot(profile, hints, undefined).ok).toBe(false);
    expect(validateDevTestRoot(path.join(profile, 'Local Storage'), hints, undefined).ok).toBe(false);
    expect(validateDevTestRoot(path.join(appData, 'Composer OS Desktop'), hints, undefined).ok).toBe(false);
  });

  it('rejects a conflicting COMPOSER_OS_OUTPUT_DIR', () => {
    const parent = disposable();
    const { hints, home } = hintsIn(parent);
    const root = freshRoot();
    mkdirSync(root);
    const conflict = path.join(home, 'Documents', 'Composer OS DEV Exports');
    const result = validateDevTestRoot(root, hints, conflict);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/COMPOSER_OS_OUTPUT_DIR/);
  });

  it('fails closed before userData assignment or the singleton lock', () => {
    const events: string[] = [];
    const { hints } = hintsIn(disposable());
    const status = startDesktopProcess(deps(hints, events, { testRootEnv: 'not-absolute' }));
    expect(status).toBe('terminated');
    expect(events).toEqual(['exit:1']);
    expect(getActiveDevTestLayout()).toBeNull();
  });

  it('assigns the isolated profile before taking the singleton lock', () => {
    const events: string[] = [];
    const parent = disposable();
    const { hints } = hintsIn(parent);
    const root = freshRoot();
    mkdirSync(root);
    const status = startDesktopProcess(deps(hints, events, { testRootEnv: root }));
    expect(status).toBe('locked');
    const userDataAt = events.findIndex((event) => event.startsWith('userData:'));
    const lockAt = events.indexOf('lock');
    expect(userDataAt).toBeGreaterThanOrEqual(0);
    expect(lockAt).toBeGreaterThan(userDataAt);
    expect(events[userDataAt]).toContain(`${path.sep}userData`);
    expect(events[userDataAt]).not.toBe(`userData:${path.join(hints.appDataDir, 'composer-os-dev')}`);
    expect(events).not.toContain('exit:1');
  });

  it('keeps normal DEV on the real profile when test mode is absent', () => {
    const events: string[] = [];
    const { hints, appData } = hintsIn(disposable());
    const status = startDesktopProcess(deps(hints, events, {}));
    expect(status).toBe('locked');
    expect(events).toContain(`userData:${path.join(appData, 'composer-os-dev')}`);
    expect(events.some((event) => event.startsWith('output:'))).toBe(true);
    expect(events.indexOf('lock')).toBeGreaterThan(events.findIndex((event) => event.startsWith('userData:')));
  });

  it('leaves STABLE unchanged even if a test root is present', () => {
    const events: string[] = [];
    const { hints } = hintsIn(disposable());
    const root = freshRoot();
    mkdirSync(root);
    const status = startDesktopProcess(
      deps(hints, events, { channel: 'stable', testRootEnv: root, outputDirEnv: path.join(root, 'elsewhere') })
    );
    expect(status).toBe('locked');
    expect(events.filter((event) => event.startsWith('userData:') || event.startsWith('output:') || event.startsWith('exit:'))).toEqual([]);
    expect(events).toContain('lock');
  });

  it('keeps document saves and exports inside the test root', () => {
    const parent = disposable();
    const { hints, home } = hintsIn(parent);
    const root = freshRoot();
    mkdirSync(root);
    const result = validateDevTestRoot(root, hints, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    materialiseDevTestLayout(result.layout);
    setActiveDevTestLayout(result.layout);
    const saved = resolveContainedDocumentSave(result.layout, 'dev', ['Lead Sheets', 'tune.musicxml']);
    const exported = containedJoin(result.layout.exports, 'Guitar-Bass Duos', 'tune.musicxml');
    const pentatonic = pentatonicExportDirectory(result.layout.documents);
    expect(pathIsInside(result.layout.root, saved)).toBe(true);
    expect(pathIsInside(result.layout.root, exported)).toBe(true);
    expect(pathIsInside(result.layout.root, pentatonic)).toBe(true);
    expect(() => containedJoin(result.layout.root, '..', 'escape.musicxml')).toThrow(/escapes/);
    const outside = path.join(home, 'Documents', 'escape.musicxml');
    expect(testRootWriteError(outside)).toMatch(/outside/);
    const link = path.join(result.layout.documents, 'escape-link');
    symlinkSync(path.join(home, 'Documents'), link);
    expect(pathIsInside(result.layout.root, link)).toBe(false);
    setActiveDevTestLayout(null);
    expect(testRootWriteError(outside)).toBeNull();
  });
});

function deps(
  hints: DevTestHints,
  events: string[],
  extra: Partial<StartupDeps>
): StartupDeps {
  return {
    channel: 'dev',
    productName: 'Composer OS DEV',
    testRootEnv: undefined,
    outputDirEnv: undefined,
    homeDir: hints.homeDir,
    appDataDir: hints.appDataDir,
    setName: () => events.push('setName'),
    setPath: (key, value) => events.push(`${key}:${value}`),
    setOutputDir: (dir) => events.push(`output:${dir}`),
    requestLock: () => {
      events.push('lock');
      return true;
    },
    exit: (code) => events.push(`exit:${code}`),
    ...extra,
  };
}
