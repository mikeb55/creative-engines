/**
 * Ad-hoc inside-out signing for an unsigned Mac candidate bundle.
 * Does not install, quit, replace, or launch. Ad-hoc signing is not notarisation
 * and is not Gatekeeper acceptance.
 *
 * Required order for a later authorised candidate. Signing is last.
 * After verify, the bundle must not be modified.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const MAC_CANDIDATE_SEQUENCE = [
  'complete-application-build',
  'add-resources',
  'write-dev-channel-metadata',
  'finalise-icons',
  'finalise-build-stamps',
  'sign-inside-out',
  'verify-codesign-deep-strict',
  'freeze-bundle',
] as const;

function codesignAdhoc(target: string): void {
  execFileSync('codesign', ['--force', '--sign', '-', target], { stdio: 'inherit' });
}

/**
 * Electron 28 rejects `codesign --deep` on Mantle / Electron Framework
 * ("unsealed contents present in the root directory of an embedded framework").
 * Sign versioned frameworks and helpers first, then the .app bundle.
 */
export function adhocSignMacAppInsideOut(appPath: string): void {
  const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
  if (fs.existsSync(frameworksDir)) {
    for (const name of fs.readdirSync(frameworksDir)) {
      const full = path.join(frameworksDir, name);
      if (name.endsWith('.framework')) {
        const versionA = path.join(full, 'Versions', 'A');
        if (fs.existsSync(versionA)) codesignAdhoc(versionA);
      } else if (name.endsWith('.app')) {
        codesignAdhoc(full);
      }
    }
  }
  codesignAdhoc(appPath);
}

export function assertCandidateAppIsSignable(appPath: string): void {
  if (!appPath || appPath.includes('\0')) throw new Error('Missing candidate app path.');
  const resolved = path.resolve(appPath);
  const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if (real === '/Applications' || real.startsWith('/Applications/')) {
    throw new Error('Refusing to sign or modify an application under /Applications.');
  }
  if (!resolved.endsWith('.app')) throw new Error('Candidate path is not an .app bundle.');
  if (!fs.existsSync(path.join(resolved, 'Contents'))) {
    throw new Error(`Candidate app is missing Contents: ${resolved}`);
  }
}

/** Sign, then verify. Caller must not modify the bundle after this returns. */
export function signMacCandidate(appPath: string): void {
  assertCandidateAppIsSignable(appPath);
  const resolved = path.resolve(appPath);
  adhocSignMacAppInsideOut(resolved);
  execFileSync('codesign', ['--verify', '--deep', '--strict', resolved], { stdio: 'inherit' });
}
