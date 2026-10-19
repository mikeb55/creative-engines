/**
 * Explicit DEV test-root isolation.
 *
 * Active only when the packaged channel is dev AND COMPOSER_OS_DEV_TEST_ROOT is set.
 * Validation finishes before userData assignment and before the singleton lock.
 * Failure exits. There is no fallback onto the real DEV profile.
 *
 * Safeguards:
 * 1. Absolute test root, DEV channel only.
 * 2. Canonical paths (symlinks resolved) before containment checks.
 * 3. Fail closed. Never fall back to the real DEV profile.
 * 4. Reject real DEV/STABLE profiles, protected user directories, and their descendants.
 * 5. Reject a COMPOSER_OS_OUTPUT_DIR that is not the isolated export directory.
 * 6. Document saves, exports, and other writable helpers must stay inside the test root.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEV_DOCUMENTS_EXPORT_ROOT,
  DEV_USER_DATA_DIR_NAME,
  documentsSaveBase,
  type DesktopChannel,
} from './desktopChannel';

export const DEV_TEST_ROOT_ENV = 'COMPOSER_OS_DEV_TEST_ROOT';

export interface DevTestHints {
  homeDir: string;
  appDataDir: string;
}

export interface DevTestLayout {
  root: string;
  userData: string;
  exports: string;
  documents: string;
  tmp: string;
}

export type IsolationFailure = { ok: false; reason: string };
export type IsolationSuccess = { ok: true; layout: DevTestLayout };
export type IsolationResult = IsolationSuccess | IsolationFailure;

const EXACT_UNSAFE = new Set([
  '/',
  '/tmp',
  '/private/tmp',
  '/var',
  '/private',
  '/private/var',
  '/Users',
  '/home',
  '/Volumes',
  '/Applications',
  '/System',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/Library',
]);

export function canonicalPath(input: string): string {
  const resolved = path.resolve(input);
  const missing: string[] = [];
  let cursor = resolved;
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    missing.push(path.basename(cursor));
    cursor = parent;
  }
  let real = cursor;
  try {
    real = fs.realpathSync(cursor);
  } catch {
    real = path.resolve(cursor);
  }
  return missing.length === 0 ? real : path.join(real, ...missing.reverse());
}

export function pathIsInside(parent: string, child: string): boolean {
  const root = canonicalPath(parent);
  const target = canonicalPath(child);
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function sameOrInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function protectedTrees(hints: DevTestHints): string[] {
  const home = canonicalPath(hints.homeDir);
  const appData = canonicalPath(hints.appDataDir);
  const documents = path.join(home, 'Documents');
  const raw = [
    home,
    documents,
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    path.join(home, 'Library'),
    appData,
    path.join(appData, DEV_USER_DATA_DIR_NAME),
    path.join(appData, 'Composer OS Desktop'),
    path.join(appData, 'composer-os-desktop'),
    path.join(documents, DEV_DOCUMENTS_EXPORT_ROOT),
    path.join(documents, 'Mike Composer Files'),
    path.join(documents, 'Composer OS Exports'),
    '/Applications',
    '/System',
    '/usr',
    '/bin',
    '/sbin',
    '/etc',
    '/private/etc',
    '/Library',
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const canon = canonicalPath(entry);
    if (seen.has(canon)) continue;
    seen.add(canon);
    out.push(canon);
  }
  return out;
}

function fail(reason: string): IsolationFailure {
  return { ok: false, reason };
}

export function validateDevTestRoot(
  rawRoot: string,
  hints: DevTestHints,
  outputDirEnv: string | undefined
): IsolationResult {
  const raw = rawRoot.trim();
  if (!raw || raw.includes('\0')) return fail('DEV test root is empty or unsafe.');
  if (!path.isAbsolute(raw)) return fail('DEV test root must be an absolute path.');

  const root = canonicalPath(raw);
  if (!path.isAbsolute(root)) return fail('DEV test root did not resolve to an absolute path.');
  if (EXACT_UNSAFE.has(root) || EXACT_UNSAFE.has(path.resolve(raw))) {
    return fail(`DEV test root is an unsafe root: ${root}`);
  }
  const tmpExact = canonicalPath(os.tmpdir());
  if (root === tmpExact) return fail('DEV test root must be a fresh directory, not the system temp root.');

  const trees = protectedTrees(hints);
  for (const tree of trees) {
    if (sameOrInside(tree, root)) {
      return fail(`DEV test root is inside a protected location: ${tree}`);
    }
    if (root !== tree && sameOrInside(root, tree)) {
      return fail(`DEV test root contains a protected location: ${tree}`);
    }
  }

  const layout: DevTestLayout = {
    root,
    userData: path.join(root, 'userData'),
    exports: path.join(root, 'exports'),
    documents: path.join(root, 'documents'),
    tmp: path.join(root, 'tmp'),
  };

  const outputRaw = outputDirEnv?.trim();
  if (outputRaw) {
    if (outputRaw.includes('\0') || !path.isAbsolute(outputRaw)) {
      return fail('COMPOSER_OS_OUTPUT_DIR conflicts with the DEV test root.');
    }
    const output = canonicalPath(outputRaw);
    if (output !== layout.exports) {
      return fail('COMPOSER_OS_OUTPUT_DIR conflicts with the isolated export directory.');
    }
  }

  for (const dir of [layout.userData, layout.exports, layout.documents, layout.tmp]) {
    if (!pathIsInside(layout.root, dir)) return fail('Isolated subdirectory escapes the DEV test root.');
  }
  return { ok: true, layout };
}

export function materialiseDevTestLayout(layout: DevTestLayout, mkdir: (dir: string) => void = defaultMkdir): void {
  const extras = [
    path.join(layout.documents, 'desktop-mirrors'),
    path.join(layout.userData, 'logs'),
    path.join(layout.userData, 'crashDumps'),
  ];
  for (const dir of [layout.root, layout.userData, layout.exports, layout.documents, layout.tmp, ...extras]) {
    mkdir(dir);
    if (!pathIsInside(layout.root, dir)) {
      throw new Error(`Refusing to create ${dir} outside the DEV test root.`);
    }
  }
}

function defaultMkdir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export interface StartupDeps {
  channel: DesktopChannel;
  productName: string;
  testRootEnv: string | undefined;
  outputDirEnv: string | undefined;
  homeDir: string;
  appDataDir: string;
  setName: (name: string) => void;
  setPath: (key: string, value: string) => void;
  setOutputDir: (dir: string) => void;
  requestLock: () => boolean;
  exit: (code: number) => void;
  mkdir?: (dir: string) => void;
}

let activeLayout: DevTestLayout | null = null;

export function setActiveDevTestLayout(layout: DevTestLayout | null): void {
  activeLayout = layout;
}

export function getActiveDevTestLayout(): DevTestLayout | null {
  return activeLayout;
}

/** No-op when test mode is off, so normal DEV and STABLE writes stay unchanged. */
export function testRootWriteError(candidate: string): string | null {
  if (!activeLayout) return null;
  if (!candidate || candidate.includes('\0')) return 'refusing write outside the DEV test root';
  try {
    if (!pathIsInside(activeLayout.root, candidate)) return 'refusing write outside the DEV test root';
  } catch (error) {
    return error instanceof Error ? error.message : 'refusing write outside the DEV test root';
  }
  return null;
}

export function containedJoin(root: string, ...parts: string[]): string {
  if (parts.some((part) => part === '..' || part.includes('\0'))) {
    throw new Error('path escapes test root');
  }
  const full = path.resolve(root, ...parts);
  if (!pathIsInside(root, full)) throw new Error('path escapes test root');
  return canonicalPath(full);
}

export function resolveContainedDocumentSave(
  layout: DevTestLayout,
  channel: DesktopChannel,
  relativeParts: string[]
): string {
  const base = documentsSaveBase(layout.documents, channel);
  return containedJoin(layout.root, path.relative(layout.root, base), ...relativeParts);
}

export function devProfilePaths(hints: DevTestHints): { userData: string; exports: string } {
  return {
    userData: path.join(path.resolve(hints.appDataDir), DEV_USER_DATA_DIR_NAME),
    exports: path.join(path.resolve(hints.homeDir), 'Documents', DEV_DOCUMENTS_EXPORT_ROOT),
  };
}

/**
 * Validate, assign profile paths, then acquire the singleton lock.
 * A failed test configuration never assigns userData and never takes the lock.
 */
export function startDesktopProcess(deps: StartupDeps): 'terminated' | 'locked' | 'lock-lost' {
  const testRequested =
    deps.channel === 'dev' && typeof deps.testRootEnv === 'string' && deps.testRootEnv.trim().length > 0;

  if (testRequested) {
    const result = validateDevTestRoot(deps.testRootEnv ?? '', {
      homeDir: deps.homeDir,
      appDataDir: deps.appDataDir,
    }, deps.outputDirEnv);
    if (!result.ok) {
      console.error('[dev-test-isolation]', result.reason);
      setActiveDevTestLayout(null);
      deps.exit(1);
      return 'terminated';
    }
    try {
      materialiseDevTestLayout(result.layout, deps.mkdir);
      setActiveDevTestLayout(result.layout);
      deps.setName(deps.productName);
      deps.setPath('userData', result.layout.userData);
      deps.setPath('sessionData', result.layout.userData);
      deps.setPath('documents', result.layout.documents);
      deps.setPath('desktop', path.join(result.layout.documents, 'desktop-mirrors'));
      deps.setPath('temp', result.layout.tmp);
      deps.setPath('logs', path.join(result.layout.userData, 'logs'));
      deps.setPath('crashDumps', path.join(result.layout.userData, 'crashDumps'));
      deps.setOutputDir(result.layout.exports);
      process.env.COMPOSER_OS_DEV_TEST_SESSION_ROOT = path.join(result.layout.documents, 'wwh-sessions');
    } catch (error) {
      console.error('[dev-test-isolation]', error instanceof Error ? error.message : error);
      setActiveDevTestLayout(null);
      deps.exit(1);
      return 'terminated';
    }
  } else if (deps.channel === 'dev') {
    const profile = devProfilePaths({ homeDir: deps.homeDir, appDataDir: deps.appDataDir });
    deps.setName(deps.productName);
    deps.setPath('userData', profile.userData);
    if (!deps.outputDirEnv?.trim()) deps.setOutputDir(profile.exports);
  }

  return deps.requestLock() ? 'locked' : 'lock-lost';
}
