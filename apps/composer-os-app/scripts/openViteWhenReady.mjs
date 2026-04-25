/**
 * Waits for the Vite dev server, then opens the default Windows browser to the app URL.
 * Vite's `server.open` is unreliable from IDE-integrated shells (e.g. Cursor) on Windows,
 * so the web dev workflow runs this as an explicit, observable "open" step.
 * Set VITE_OPEN_BROWSER=0 to skip.
 */
import { execFile } from 'node:child_process';
import { request } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const c = {
  /** bold */
  b: '\x1b[1m',
  gr: '\x1b[32m',
  rd: '\x1b[31m',
  yl: '\x1b[33m',
  x: '\x1b[0m',
};

function isoStamp() {
  return new Date().toISOString();
}

const host = '127.0.0.1';
const port = Number(process.env.VITE_DEV_PORT ?? 5173);
const urlPath = '/';
const url = `http://${host}:${port}${urlPath}`;
const maxWaitMs = Number(process.env.VITE_OPEN_WAIT_MS ?? 120_000);
const pollMs = 500;

function tryOnce() {
  return new Promise((resolve) => {
    const req = request(
      { host, port, path: urlPath, method: 'GET', timeout: 2000 },
      (res) => {
        res.resume();
        resolve(true);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function openInBrowser(targetUrl) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile(
        'cmd',
        ['/d', '/c', 'start', '', targetUrl],
        { windowsHide: false },
        (err) => (err ? resolve(false) : resolve(true))
      );
      return;
    }
    if (process.platform === 'darwin') {
      execFile('open', [targetUrl], (err) => (err ? resolve(false) : resolve(true)));
      return;
    }
    /* linux / other: xdg-open */
    execFile('xdg-open', [targetUrl], (err) => (err ? resolve(false) : resolve(true)));
  });
}

async function main() {
  if (process.env.VITE_OPEN_BROWSER === '0') {
    console.log(
      `${c.yl}[Composer OS]${c.x} VITE_OPEN_BROWSER=0 — skipping openViteWhenReady; ` +
        `open http://127.0.0.1:5173/ when ready. ${c.yl}(${isoStamp()})${c.x}`
    );
    return;
  }

  const t0 = Date.now();
  let ok = false;
  while (Date.now() - t0 < maxWaitMs) {
    if (await tryOnce()) {
      ok = true;
      break;
    }
    await delay(pollMs);
  }

  if (!ok) {
    const stamp = isoStamp();
    const msg = `${c.b}[Composer OS]${c.x} ${c.rd}status=fail${c.x} ${c.rd}[Composer OS] Timed out${c.x} ` +
      `waiting for Vite at ${c.b}${url}${c.x} (${maxWaitMs}ms). ` +
      `Open ${c.b}http://127.0.0.1:5173/${c.x} manually when Vite is ready. ` +
      `${c.yl}(${stamp})${c.x}`;
    console.error(msg);
    process.exit(0);
    return;
  }

  const opened = await openInBrowser(url);
  const stamp = isoStamp();

  if (opened) {
    // Exact, grep-friendly success line (spec default URL); custom port appends the real target.
    if (port === 5173) {
      console.log('[Composer OS] Opened default browser: http://127.0.0.1:5173/');
    } else {
      console.log(`[Composer OS] Opened default browser: ${url}`);
    }
    console.log(
      `${c.b}[Composer OS]${c.x} ${c.gr}status=ok${c.x} ${c.yl}(${stamp})${c.x} (browser open command dispatched via cmd /c start on Windows)`
    );
  } else {
    console.error(
      `${c.b}[Composer OS]${c.x} ${c.rd}status=fail${c.x} ${c.rd}(${stamp})${c.x} ` +
        `browser did not start; open: ${c.b}http://127.0.0.1:5173/${c.x} or ${c.b}${url}${c.rd}${c.x}`
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(
    `${c.b}[Composer OS]${c.x} ${c.rd}status=fail${c.x} ${c.rd}openViteWhenReady failed: ${err}${c.x} ` +
      `(${isoStamp()})`
  );
  process.exit(0);
});
