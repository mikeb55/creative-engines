/**
 * Copy rebuilt @napi-rs/canvas (+ platform optional packages) into resources so packaged
 * Electron can resolve them next to api.bundle.js / desktop-ipc.bundle.cjs (both mark canvas external).
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const srcNapiRs = path.join(repoRoot, 'node_modules', '@napi-rs');
const destNapiRs = path.join(__dirname, '..', 'resources', 'node_modules', '@napi-rs');

function copyNapiCanvasToResources() {
  if (!fs.existsSync(srcNapiRs)) {
    console.error('[copy-napi-canvas] missing directory:', srcNapiRs);
    process.exit(1);
  }
  const names = fs
    .readdirSync(srcNapiRs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (d.name === 'canvas' || d.name.startsWith('canvas-')))
    .map((d) => d.name);

  if (names.length === 0) {
    console.error('[copy-napi-canvas] no @napi-rs/canvas packages found under', srcNapiRs);
    process.exit(1);
  }

  fs.mkdirSync(destNapiRs, { recursive: true });
  for (const name of names) {
    const src = path.join(srcNapiRs, name);
    const dest = path.join(destNapiRs, name);
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch (e) {
      const code = e && typeof e === 'object' ? e.code : '';
      if (code === 'EPERM' || code === 'EBUSY') {
        console.warn(
          '[copy-napi-canvas] could not delete existing tree (native .node may be locked — close Composer OS / Electron). Merging copy over:',
          dest
        );
      } else {
        throw e;
      }
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log('[copy-napi-canvas]', dest);
  }
}

if (require.main === module) {
  copyNapiCanvasToResources();
}

module.exports = { copyNapiCanvasToResources };
