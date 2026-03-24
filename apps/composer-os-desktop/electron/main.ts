/**
 * Composer OS Desktop — Electron main process
 * Single window, single instance, no browser spawn, API in-process.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { resolveComposerOsPort } from './utils/portUtils';

const API_READY_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 200;

let mainWindow: BrowserWindow | null = null;
let resolvedPort = 3001;

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

function getResourcesPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources');
  }
  return process.resourcesPath;
}

function getApiBundlePath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'api.bundle.js'),
    path.join(__dirname, '..', 'resources', 'api.bundle.js'),
    path.join(app.getAppPath(), 'resources', 'api.bundle.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getUiPath(): string {
  const resources = getResourcesPath();
  const packagedUi = path.join(resources, 'ui');
  const devUi = path.join(app.getAppPath(), '..', 'composer-os-app', 'dist');
  if (fs.existsSync(packagedUi)) return packagedUi;
  return devUi;
}

function getOutputDir(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), '..', '..', 'outputs', 'composer-os-v2');
  }
  return path.join(app.getPath('userData'), 'outputs', 'composer-os-v2');
}

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
        reject(new Error(`API did not become ready on port ${port}`));
        return;
      }
      setTimeout(tryOnce, POLL_INTERVAL_MS);
    };
    setTimeout(tryOnce, POLL_INTERVAL_MS);
  });
}

async function startApi(): Promise<void> {
  const bundlePath = getApiBundlePath();
  const uiPath = getUiPath();
  const outputDir = getOutputDir();

  if (!bundlePath) {
    return Promise.reject(
      new Error(
        'API bundle missing (resources/api.bundle.js). Run: npm run build:api in apps/composer-os-desktop, then npm run desktop:dev.'
      )
    );
  }

  fs.mkdirSync(outputDir, { recursive: true });

  process.env.COMPOSER_OS_OUTPUT_DIR = outputDir;
  if (fs.existsSync(uiPath)) process.env.COMPOSER_OS_STATIC_DIR = uiPath;

  const { port, reuseExisting } = await resolveComposerOsPort();
  resolvedPort = port;
  process.env.PORT = String(port);

  if (reuseExisting) {
    await waitForApiReady(port);
    return;
  }

  require(bundlePath);
  await waitForApiReady(port);
}

function createWindowShell(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');
  const win = new BrowserWindow({
    title: 'Composer OS',
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
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

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
      <html><head><meta charset="utf-8"><title>Composer OS</title>
      <style>body{font-family:system-ui;background:#1a1a1a;color:#e4e4e7;padding:2rem;margin:0;}
      h1{color:#ef4444;font-size:1.25rem;}code{background:#27272a;padding:2px 6px;border-radius:4px;word-break:break-all;}</style></head>
      <body>
        <h1>Composer OS could not start</h1>
        <p>The API backend could not be started.</p>
        <p><code>${safe}</code></p>
      </body></html>
    `)}`
  );
}

function loadLoadingPage(win: BrowserWindow): void {
  win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Composer OS</title>
      <style>body{font-family:system-ui;background:#0f0f12;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
      p{color:#a1a1aa;}</style></head>
      <body><p>Starting Composer OS…</p></body></html>
    `)}`
  );
}

async function launchApp(): Promise<void> {
  mainWindow = createWindowShell();
  const win = mainWindow;
  loadLoadingPage(win);

  try {
    await startApi();
    const url = `http://127.0.0.1:${resolvedPort}`;
    await win.loadURL(url);
    win.once('ready-to-show', () => win.show());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    loadErrorPage(win, msg);
    win.once('ready-to-show', () => win.show());
  }
}

if (gotLock) {
  app.whenReady().then(() => {
    launchApp().catch((err) => {
      console.error(err);
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
