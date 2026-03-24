/**
 * Composer OS Desktop — Electron main process
 * Single window, single instance, no browser spawn, API in-process.
 *
 * Quarantine: only Composer OS UI (composer-os-app → resources/ui). No legacy app paths or script runtimes.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { resolveComposerOsPort } from './utils/portUtils';
import type { StartupState } from './startupState';
import {
  DESKTOP_PRODUCT_NAME,
  resolveApiBundlePath,
  resolveDefaultOutputDir,
  resolveUiPath,
  getWindowIconPath,
} from './config';

const API_READY_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 200;

let mainWindow: BrowserWindow | null = null;
let resolvedPort = 3001;
let startupState: StartupState = 'booting';

function setStartupState(next: StartupState): void {
  startupState = next;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('composer-os:startup-state', next);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

ipcMain.handle('composer-os:get-startup-state', (): StartupState => startupState);

ipcMain.handle('composer-os:get-desktop-meta', () => ({
  packaged: app.isPackaged,
  version: app.getVersion(),
  productName: DESKTOP_PRODUCT_NAME,
}));

ipcMain.on(
  'composer-os:generation-phase',
  (_event, phase: 'running' | 'succeeded' | 'failed' | 'idle') => {
    if (startupState === 'fatal_error') return;
    if (phase === 'running') setStartupState('generate_running');
    else if (phase === 'succeeded') setStartupState('generate_succeeded');
    else if (phase === 'failed') setStartupState('generate_failed');
    else setStartupState('ready');
  }
);

function httpGet(url: string): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      resolve({ ok: res.statusCode === 200 });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

function waitForApiReady(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = async () => {
      const health = await httpGet(`http://127.0.0.1:${port}/health`);
      if (health.ok) {
        resolve();
        return;
      }
      const presets = await httpGet(`http://127.0.0.1:${port}/api/presets`);
      if (presets.ok) {
        resolve();
        return;
      }
      if (Date.now() - start > API_READY_TIMEOUT_MS) {
        reject(
          new Error(
            `Composer OS did not respond in time (${API_READY_TIMEOUT_MS / 1000}s). The API may be stuck starting. Try closing other apps using this port, then restart Composer OS.`
          )
        );
        return;
      }
      setTimeout(tryOnce, POLL_INTERVAL_MS);
    };
    setTimeout(tryOnce, POLL_INTERVAL_MS);
  });
}

async function startApi(): Promise<void> {
  const bundlePath = resolveApiBundlePath();
  const uiPath = resolveUiPath();
  const outputDir = resolveDefaultOutputDir();

  if (!bundlePath) {
    return Promise.reject(
      new Error(
        'The Composer OS engine bundle is missing (resources/api.bundle.js). Reinstall the app or run a full desktop build from the developer environment.'
      )
    );
  }

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    return Promise.reject(
      new Error(
        'Composer OS cannot use the output folder (missing or not writable). Check disk space and folder permissions.'
      )
    );
  }

  process.env.COMPOSER_OS_OUTPUT_DIR = outputDir;
  if (fs.existsSync(uiPath)) process.env.COMPOSER_OS_STATIC_DIR = uiPath;

  setStartupState('resolving_port');
  const { port, reuseExisting } = await resolveComposerOsPort();
  resolvedPort = port;
  process.env.PORT = String(port);

  if (reuseExisting) {
    setStartupState('waiting_for_backend');
    await waitForApiReady(port);
    return;
  }

  setStartupState('starting_backend');
  require(bundlePath);
  setStartupState('waiting_for_backend');
  await waitForApiReady(port);
}

function createWindowShell(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = getWindowIconPath();
  const win = new BrowserWindow({
    title: DESKTOP_PRODUCT_NAME,
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#0f0f12',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
    },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        const h = u.hostname;
        if (h !== '127.0.0.1' && h !== 'localhost') {
          event.preventDefault();
        }
      }
    } catch {
      /* ignore malformed */
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadErrorPage(win: BrowserWindow, message: string): void {
  const safe = escapeHtml(message);
  win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${DESKTOP_PRODUCT_NAME}</title>
      <style>body{font-family:system-ui;background:#1a1a1a;color:#e4e4e7;padding:2rem;margin:0;max-width:42rem;}
      h1{color:#f87171;font-size:1.25rem;}p{line-height:1.5;}code{background:#27272a;padding:2px 6px;border-radius:4px;word-break:break-word;display:block;margin-top:0.75rem;}</style></head>
      <body>
        <h1>${DESKTOP_PRODUCT_NAME} could not start</h1>
        <p>Something went wrong while starting the app. You can try again after closing other copies of Composer OS.</p>
        <p><code>${safe}</code></p>
      </body></html>
    `)}`
  );
}

function loadLoadingPage(win: BrowserWindow): void {
  win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${DESKTOP_PRODUCT_NAME}</title>
      <style>body{font-family:system-ui;background:#0f0f12;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
      p{color:#a1a1aa;}</style></head>
      <body><p>Starting ${DESKTOP_PRODUCT_NAME}…</p></body></html>
    `)}`
  );
}

async function launchApp(): Promise<void> {
  setStartupState('booting');
  mainWindow = createWindowShell();
  const win = mainWindow;
  loadLoadingPage(win);

  try {
    await startApi();
    const url = `http://127.0.0.1:${resolvedPort}`;
    setStartupState('loading_ui');
    await win.loadURL(url);
    setStartupState('ready');
    win.once('ready-to-show', () => win.show());
  } catch (err) {
    setStartupState('fatal_error');
    const msg = err instanceof Error ? err.message : String(err);
    loadErrorPage(win, msg);
    win.once('ready-to-show', () => win.show());
  }
}

if (gotLock) {
  app.whenReady().then(() => {
    app.setName(DESKTOP_PRODUCT_NAME);
    launchApp().catch((err) => {
      console.error(err);
      setStartupState('fatal_error');
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
