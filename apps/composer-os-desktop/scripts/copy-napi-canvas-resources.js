/**
 * Copy rebuilt @napi-rs/canvas (+ platform optional packages) into resources so packaged
 * Electron can resolve them next to api.bundle.js / desktop-ipc.bundle.cjs (both mark canvas external).
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const srcNapiRs = path.join(repoRoot, 'node_modules', '@napi-rs');
const destNapiRs = path.join(__dirname, '..', 'resources', 'node_modules', '@napi-rs');

/** Busy-wait (sync scripts — avoids pulling async timers into callers). */
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

/** True if folder contains any `.node` native binary (recursive). */
function dirHasNodeBinary(dir) {
  if (!fs.existsSync(dir)) return false;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.name.endsWith('.node')) return true;
    }
  }
  return false;
}

function isLockOrBusyErr(e) {
  if (!e || typeof e !== 'object') return false;
  const code = e.code;
  return (
    code === 'EPERM' ||
    code === 'EBUSY' ||
    code === 'EPIPE' ||
    code === 'UNKNOWN' ||
    (typeof e.message === 'string' &&
      /cannot access the file because it is being used by another process/i.test(e.message))
  );
}

const COPY_ATTEMPTS = 15;
const RETRY_DELAY_MS = 600;

function copyOnePackage(src, dest) {
  let lastErr = null;
  for (let attempt = 1; attempt <= COPY_ATTEMPTS; attempt++) {
    try {
      try {
        fs.rmSync(dest, { recursive: true, force: true });
      } catch (e) {
        if (!isLockOrBusyErr(e)) throw e;
        if (attempt === 1) {
          console.warn(
            '[copy-napi-canvas] could not delete existing tree (native .node may be locked). Retrying:',
            dest
          );
        }
      }
      fs.cpSync(src, dest, { recursive: true, force: true });
      console.log('[copy-napi-canvas]', dest);
      return;
    } catch (e) {
      lastErr = e;
      if (!isLockOrBusyErr(e) && e.code !== 'ENOENT') {
        /* Unexpected — still retry a few times for flaky FS */
      }
      if (attempt < COPY_ATTEMPTS) {
        sleepMs(RETRY_DELAY_MS);
      }
    }
  }

  if (dirHasNodeBinary(dest)) {
    console.warn(
      '[copy-napi-canvas] copy failed after retries; keeping existing native binaries under:',
      dest,
      lastErr && lastErr.message ? `(${lastErr.message})` : ''
    );
    return;
  }

  console.error('[copy-napi-canvas] copy failed and no usable native .node under:', dest);
  throw lastErr || new Error('copy failed');
}

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
    copyOnePackage(src, dest);
  }
}

if (require.main === module) {
  copyNapiCanvasToResources();
}

module.exports = { copyNapiCanvasToResources };
