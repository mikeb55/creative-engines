/**
 * Last content writes before signing: DEV icon and build stamp inside the candidate.
 * Refuses /Applications. Does not sign, install, or launch.
 *
 * Usage: node scripts/finalizeMacCandidateResources.js <Candidate.app>
 */
const fs = require('fs');
const path = require('path');

function resourcesDir(appPath) {
  return path.join(appPath, 'Contents', 'Resources');
}

function assertCandidate(appPath) {
  const resolved = path.resolve(appPath);
  const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if (real === '/Applications' || real.startsWith(`${path.resolve('/Applications')}${path.sep}`)) {
    throw new Error('Refusing to modify an application under /Applications.');
  }
  if (!resolved.endsWith('.app')) throw new Error('Candidate path is not an .app bundle.');
  const dest = resourcesDir(resolved);
  if (!fs.existsSync(dest)) throw new Error(`Missing Resources: ${dest}`);
  return { resolved, dest };
}

function copyIfPresent(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.copyFileSync(from, to);
  return true;
}

function finalizeMacCandidateResources(appPath) {
  const { dest } = assertCandidate(appPath);
  const desktopRoot = path.join(__dirname, '..');
  const stamp = path.join(desktopRoot, 'resources', 'composer-os-build-stamp.json');
  if (!fs.existsSync(stamp)) throw new Error(`Missing build stamp: ${stamp}`);
  fs.copyFileSync(stamp, path.join(dest, 'composer-os-build-stamp.json'));
  copyIfPresent(path.join(desktopRoot, 'resources', 'icon-dev.icns'), path.join(dest, 'icon-dev.icns'));
  copyIfPresent(path.join(desktopRoot, 'resources', 'icon.icns'), path.join(dest, 'icon.icns'));
  copyIfPresent(path.join(desktopRoot, 'resources', 'icon-dev.png'), path.join(dest, 'icon-dev.png'));
  const bryant = path.join(desktopRoot, 'resources', 'wps-bryant');
  if (!fs.existsSync(path.join(bryant, 'wps-bryant-signature.json'))) {
    throw new Error(`Missing packaged WPS Bryant resources: ${bryant}`);
  }
  fs.cpSync(bryant, path.join(dest, 'wps-bryant'), { recursive: true });
  console.log('[finalize-mac-candidate] resources updated', dest);
}

module.exports = { finalizeMacCandidateResources };

if (require.main === module) {
  const appPath = process.argv[2];
  if (!appPath) {
    console.error('usage: node scripts/finalizeMacCandidateResources.js <Candidate.app>');
    process.exit(1);
  }
  try {
    finalizeMacCandidateResources(appPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
