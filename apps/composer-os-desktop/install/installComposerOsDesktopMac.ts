/**
 * Package-aware deploy: copy unsigned .app to /Applications, ad-hoc sign, clear quarantine, launch.
 * Invoked after `npm run desktop:package:mac` (e.g. `npm run desktop:install:mac`). macOS only.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { adhocSignMacAppInsideOut } from './signMacCandidate';

const APP_NAME = 'Composer OS Desktop.app';
const APPLICATIONS_DEST = path.join('/Applications', APP_NAME);

function desktopAppRoot(): string {
  return path.resolve(__dirname, '..');
}

function desktopReleaseDir(root: string): string {
  return path.join(root, 'release');
}

function findPackagedMacApp(releaseDir: string): string {
  const candidates = [
    path.join(releaseDir, APP_NAME),
    path.join(releaseDir, 'mac', APP_NAME),
    path.join(releaseDir, 'mac-arm64', APP_NAME),
    path.join(releaseDir, 'mac-x64', APP_NAME),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Missing ${APP_NAME} under ${releaseDir}. Run npm run desktop:package:mac first.`
  );
}

function quitRunningInstance(): void {
  try {
    execFileSync('osascript', ['-e', 'quit app "Composer OS Desktop"'], { stdio: 'ignore' });
  } catch {
    /* not running */
  }
  try {
    execFileSync('pkill', ['-f', 'Composer OS Desktop'], { stdio: 'ignore' });
  } catch {
    /* no matching process */
  }
}

function sleepMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

function main(): void {
  if (process.platform !== 'darwin') {
    console.error('installComposerOsDesktopMac: macOS only.');
    process.exit(1);
  }

  const root = desktopAppRoot();
  const releaseDir = desktopReleaseDir(root);
  const packagedApp = findPackagedMacApp(releaseDir);

  console.log('');
  console.log('========================================');
  console.log('Composer OS Desktop — macOS install');
  console.log('========================================');
  console.log('Packaged app: ', packagedApp);
  console.log('Install dest: ', APPLICATIONS_DEST);

  console.log('Quitting any running instance...');
  quitRunningInstance();
  sleepMs(800);

  if (fs.existsSync(APPLICATIONS_DEST)) {
    console.log('Replacing existing /Applications copy...');
    fs.rmSync(APPLICATIONS_DEST, { recursive: true, force: true });
  }

  console.log('Copying to /Applications...');
  // Node fs.cp rewrites framework symlinks as absolute paths back into the
  // repo. macOS then cannot load icudtl.dat and the helpers die with SIGTRAP.
  // ditto keeps Versions/Current -> A inside the bundle.
  execFileSync('ditto', [packagedApp, APPLICATIONS_DEST], { stdio: 'inherit' });

  console.log('Ad-hoc signing (inside-out; --deep fails on Electron 28 frameworks)...');
  adhocSignMacAppInsideOut(APPLICATIONS_DEST);

  console.log('Clearing quarantine...');
  try {
    execFileSync('xattr', ['-dr', 'com.apple.quarantine', APPLICATIONS_DEST], {
      stdio: 'inherit',
    });
  } catch {
    /* no quarantine xattr is fine */
  }

  console.log('Verifying signature...');
  execFileSync('codesign', ['-dv', APPLICATIONS_DEST], { stdio: 'inherit' });

  console.log('Launching...');
  execFileSync('open', ['-a', APPLICATIONS_DEST], { stdio: 'inherit' });

  console.log('');
  console.log('Installed:', APPLICATIONS_DEST);
  console.log('Launched: yes');
  console.log('========================================');
  console.log('');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
