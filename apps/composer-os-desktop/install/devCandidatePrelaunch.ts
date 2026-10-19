/**
 * Positive identity gate for a future DEV candidate launch.
 * Does not spawn, install, sign, or package.
 *
 * COMPOSER_OS_DEV_TEST_ROOT is not permission to launch.
 * Every check below must pass. Any disagreement fails closed.
 *
 * A launcher must spawn the returned executable path with the returned env.
 * It must not launch by application name, Spotlight, Launch Services, or a shortcut.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_APP_ID, DEV_PRODUCT_NAME } from '../electron/desktopChannel';
import { validateDevTestRoot, type DevTestHints, type DevTestLayout } from '../electron/devTestIsolation';

export const DEV_CANDIDATE_CHANNEL = 'dev';
export const DEV_CANDIDATE_RELEASE_LABEL = 'V3.4';
export const DEV_CANDIDATE_WINDOW_TITLE = 'Composer OS DEV — V3.4';
export const DEV_CANDIDATE_PROVENANCE_SCHEMA = 'composer-os-dev-candidate-provenance/v1';

export const DEV_PRELAUNCH_CHECKS = [
  'bundle-identifier',
  'channel-dev',
  'release-identity-v34',
  'build-stamp-commit',
  'repaired-source-provenance',
  'required-resources',
  'codesign-verify-deep-strict',
  'isolated-test-root-preflight',
] as const;

const REQUIRED_RESOURCES = [
  'desktop-channel.json',
  'releaseIdentity.json',
  'composer-os-build-stamp.json',
  'api.bundle.js',
  'desktop-ipc.bundle.cjs',
  'wps-bryant/wps-bryant-signature.json',
  'wps-bryant/wps-bryant-preferences.md',
] as const;

export interface DevCandidateProvenance {
  schema: typeof DEV_CANDIDATE_PROVENANCE_SCHEMA;
  baselineHead: string;
  approvedSourceCommit: string;
  sourceManifestSha256: string;
  packagingPerformed: boolean;
  installationPerformed: boolean;
  candidateAppPath: string;
}

export interface DevCandidateLaunchSpec {
  /** Absolute path inside the approved .app. Never an application name. */
  command: string;
  args: readonly [];
  env: {
    COMPOSER_OS_DEV_TEST_ROOT: string;
    COMPOSER_OS_OUTPUT_DIR: string;
  };
  layout: DevTestLayout;
}

export type DevCandidatePrelaunchResult =
  | { ok: true; launch: DevCandidateLaunchSpec }
  | { ok: false; reasons: string[] };

export interface DevCandidatePrelaunchInput {
  appPath: string;
  provenance: DevCandidateProvenance;
  testRoot: string;
  hints: DevTestHints;
  outputDirEnv?: string;
  /** Test double. Production uses codesign --verify --deep --strict. */
  verifySignature?: (appPath: string) => void;
}

function plistString(xml: string, key: string): string | null {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`);
  const match = xml.match(pattern);
  return match?.[1]?.trim() || null;
}

function readPlist(appPath: string): { id: string | null; executable: string | null; name: string | null; raw: string | null } {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  if (!fs.existsSync(plistPath)) return { id: null, executable: null, name: null, raw: null };
  const raw = fs.readFileSync(plistPath, 'utf8');
  return {
    id: plistString(raw, 'CFBundleIdentifier'),
    executable: plistString(raw, 'CFBundleExecutable'),
    name: plistString(raw, 'CFBundleName'),
    raw,
  };
}

function verifyCodesign(appPath: string): void {
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'pipe' });
}

function samePath(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  try {
    if (fs.existsSync(a) && fs.existsSync(b)) return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
  return a === b;
}

export function assertDevCandidatePrelaunch(input: DevCandidatePrelaunchInput): DevCandidatePrelaunchResult {
  const reasons: string[] = [];
  const appPath = input.appPath?.trim() ?? '';
  if (!appPath || appPath.includes('\0') || !path.isAbsolute(appPath) || !appPath.endsWith('.app')) {
    reasons.push('Candidate path must be an absolute .app bundle. Refusing launch by application name.');
  }
  const resolved = appPath ? path.resolve(appPath) : '';
  const real = resolved && fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if (real === '/Applications' || real.startsWith(`${path.resolve('/Applications')}${path.sep}`)) {
    reasons.push('Refusing to launch an application under /Applications.');
  }

  const plist = appPath.endsWith('.app') && path.isAbsolute(appPath) ? readPlist(resolved) : { id: null, executable: null, name: null, raw: null };
  if (plist.id !== DEV_APP_ID) {
    reasons.push(`Bundle identifier must be ${DEV_APP_ID}.`);
  }
  if (plist.name !== DEV_PRODUCT_NAME) {
    reasons.push(`Bundle name must be ${DEV_PRODUCT_NAME}.`);
  }

  const resources = resolved ? path.join(resolved, 'Contents', 'Resources') : '';
  const channelPath = resources ? path.join(resources, 'desktop-channel.json') : '';
  let channel: unknown = null;
  if (!channelPath || !fs.existsSync(channelPath)) {
    reasons.push('Packaged channel metadata is missing.');
  } else {
    try {
      channel = (JSON.parse(fs.readFileSync(channelPath, 'utf8')) as { channel?: unknown }).channel;
    } catch {
      channel = null;
    }
    if (channel !== DEV_CANDIDATE_CHANNEL) {
      reasons.push('Packaged channel metadata must be exactly dev.');
    }
  }

  const identityPath = resources ? path.join(resources, 'releaseIdentity.json') : '';
  if (!identityPath || !fs.existsSync(identityPath)) {
    reasons.push('Packaged release identity is missing.');
  } else {
    try {
      const identity = JSON.parse(fs.readFileSync(identityPath, 'utf8')) as {
        dev?: { releaseLabel?: unknown; windowTitle?: unknown };
      };
      if (identity.dev?.releaseLabel !== DEV_CANDIDATE_RELEASE_LABEL || identity.dev?.windowTitle !== DEV_CANDIDATE_WINDOW_TITLE) {
        reasons.push('Packaged release identity must be V3.4 DEV.');
      }
    } catch {
      reasons.push('Packaged release identity is unreadable.');
    }
  }

  const provenance = input.provenance;
  const provenanceShapeOk = provenance
    && provenance.schema === DEV_CANDIDATE_PROVENANCE_SCHEMA
    && /^[0-9a-f]{40}$/.test(provenance.baselineHead)
    && /^[0-9a-f]{40}$/.test(provenance.approvedSourceCommit)
    && /^[0-9a-f]{64}$/.test(provenance.sourceManifestSha256)
    && typeof provenance.packagingPerformed === 'boolean'
    && typeof provenance.installationPerformed === 'boolean'
    && typeof provenance.candidateAppPath === 'string';
  if (!provenanceShapeOk) {
    reasons.push('Repaired-source provenance is missing or malformed.');
  } else if (!provenance.packagingPerformed) {
    reasons.push('Repaired-source provenance says packaging has not occurred.');
  } else if (!samePath(provenance.candidateAppPath, resolved)) {
    reasons.push('Repaired-source provenance does not match this candidate path.');
  }

  const stampPath = resources ? path.join(resources, 'composer-os-build-stamp.json') : '';
  if (!stampPath || !fs.existsSync(stampPath)) {
    reasons.push('Build stamp is missing.');
  } else if (provenanceShapeOk) {
    try {
      const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8')) as {
        gitCommit?: unknown;
        releaseIdentity?: { dev?: { releaseLabel?: unknown; windowTitle?: unknown } };
      };
      if (stamp.gitCommit !== provenance.approvedSourceCommit) {
        reasons.push('Build stamp does not match the approved source commit.');
      }
      const dev = stamp.releaseIdentity?.dev;
      if (dev?.releaseLabel !== DEV_CANDIDATE_RELEASE_LABEL || dev?.windowTitle !== DEV_CANDIDATE_WINDOW_TITLE) {
        reasons.push('Build stamp release identity is not V3.4 DEV.');
      }
    } catch {
      reasons.push('Build stamp is unreadable.');
    }
  }

  if (resolved) {
    for (const relative of REQUIRED_RESOURCES) {
      if (!fs.existsSync(path.join(resources, relative))) reasons.push(`Missing bundle resource: ${relative}`);
    }
  }

  const executableName = plist.executable;
  const executablePath = executableName && resolved
    ? path.join(resolved, 'Contents', 'MacOS', executableName)
    : '';
  if (!executableName || !executablePath || !fs.existsSync(executablePath) || !path.isAbsolute(executablePath)) {
    reasons.push('Candidate executable path is missing.');
  }

  const verify = input.verifySignature ?? verifyCodesign;
  if (resolved && resolved.endsWith('.app') && fs.existsSync(resolved)) {
    try {
      verify(resolved);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      reasons.push(`Code signature failed codesign --verify --deep --strict. ${detail}`.trim());
    }
  } else if (resolved) {
    reasons.push('Code signature was not verified because the candidate bundle is absent.');
  }

  const isolation = validateDevTestRoot(input.testRoot ?? '', input.hints, input.outputDirEnv);
  if (!isolation.ok) reasons.push(isolation.reason);

  if (reasons.length > 0 || !isolation.ok || !executablePath) {
    return { ok: false, reasons: reasons.length > 0 ? reasons : ['DEV candidate prelaunch failed closed.'] };
  }

  return {
    ok: true,
    launch: {
      command: executablePath,
      args: [],
      env: {
        COMPOSER_OS_DEV_TEST_ROOT: isolation.layout.root,
        COMPOSER_OS_OUTPUT_DIR: isolation.layout.exports,
      },
      layout: isolation.layout,
    },
  };
}
