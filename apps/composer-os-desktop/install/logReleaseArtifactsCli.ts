/**
 * After electron-builder: print stable paths so the portable/installer location is obvious.
 * Safe on CI/non-Windows (missing files logged as missing).
 */
import * as fs from 'fs';
import * as path from 'path';
import { STABLE_PORTABLE_FILE_NAME, STABLE_SETUP_FILE_NAME } from './installRules';

export function logReleaseArtifacts(desktopAppRoot: string): void {
  const releaseDir = path.join(desktopAppRoot, 'release');
  const portable = path.join(releaseDir, STABLE_PORTABLE_FILE_NAME);
  const setup = path.join(releaseDir, STABLE_SETUP_FILE_NAME);
  const portableOk = fs.existsSync(portable);
  const setupOk = fs.existsSync(setup);

  console.log('');
  console.log('========================================');
  console.log('Composer OS Desktop — build output paths');
  console.log('========================================');
  console.log('Release folder:     ', path.resolve(releaseDir));
  console.log('Portable (stable): ', path.resolve(portable), portableOk ? 'OK' : '(not found yet)');
  console.log('NSIS installer:     ', path.resolve(setup), setupOk ? 'OK' : '(not found yet)');
  console.log('Use for shortcuts:  ', path.resolve(portable));
  console.log('(Version lives in app metadata only — filenames stay fixed each build.)');
  console.log('========================================');
  console.log('');
}

function main(): void {
  const root = path.resolve(__dirname, '..');
  logReleaseArtifacts(root);
}

if (require.main === module) {
  main();
}
