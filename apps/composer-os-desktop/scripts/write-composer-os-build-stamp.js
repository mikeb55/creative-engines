/**
 * After api + desktop-ipc bundles are built, write a stamp JSON with SHA-256 of each
 * so packaged vs dev runs can prove which engine code is on disk.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const resourcesDir = path.join(desktopRoot, 'resources');
const outFile = path.join(resourcesDir, 'composer-os-build-stamp.json');
const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function gitCommit() {
  try {
    const repoRoot = path.resolve(desktopRoot, '..', '..');
    return execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

const ipcPath = path.join(resourcesDir, 'desktop-ipc.bundle.cjs');
const apiPath = path.join(resourcesDir, 'api.bundle.js');

for (const p of [ipcPath, apiPath]) {
  if (!fs.existsSync(p)) {
    console.error('[composer-os-build-stamp] missing bundle:', p);
    process.exit(1);
  }
}

const stamp = {
  schema: 'composer-os-build-stamp/v1',
  desktopPackageVersion: pkg.version,
  generatedAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  ipcBundle: {
    filename: 'desktop-ipc.bundle.cjs',
    sha256: sha256File(ipcPath),
    bytes: fs.statSync(ipcPath).size,
  },
  apiBundle: {
    filename: 'api.bundle.js',
    sha256: sha256File(apiPath),
    bytes: fs.statSync(apiPath).size,
  },
};

fs.mkdirSync(resourcesDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(stamp, null, 2), 'utf-8');
console.log('[composer-os-build-stamp] wrote', outFile);
