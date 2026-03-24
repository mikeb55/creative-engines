/**
 * Composer OS Desktop — Electron main process
 * Starts API (in-process when packaged, spawned when dev), opens window, shuts down cleanly.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const PORT = 3001;
const API_READY_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;
let mainWindow: BrowserWindow | null = null;

function getResourcesPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources');
  }
  return process.resourcesPath;
}

/**
 * Resolve api.bundle.js. Never fall back to npx/ts-node — packaged users have no Node on PATH.
 */
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

function waitForApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${PORT}/api/presets`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (Date.now() - start > API_READY_TIMEOUT_MS) reject(new Error('API failed to start'));
        else setTimeout(check, POLL_INTERVAL_MS);
      });
      req.on('error', () => {
        if (Date.now() - start > API_READY_TIMEOUT_MS) reject(new Error('API failed to start'));
        else setTimeout(check, POLL_INTERVAL_MS);
      });
    };
    setTimeout(check, POLL_INTERVAL_MS);
  });
}

function startApi(): Promise<void> {
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
  process.env.PORT = String(PORT);

  try {
    require(bundlePath);
    return waitForApi();
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
    },
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
  });

  const url = `http://localhost:${PORT}`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function onApiReady(): void {
  createWindow();
}

function onApiError(err: Error): void {
  console.error('API failed:', err);
  mainWindow = new BrowserWindow({
    width: 500,
    height: 300,
    title: 'Composer OS - Error',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  mainWindow.loadURL(
    `data:text/html,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Composer OS - Error</title>
      <style>body{font-family:system-ui;background:#1a1a1a;color:#e4e4e7;padding:2rem;margin:0;}
      h1{color:#ef4444;}code{background:#27272a;padding:2px 6px;border-radius:4px;}</style></head>
      <body>
        <h1>Failed to start Composer OS</h1>
        <p>The API backend could not be started.</p>
        <p><code>${err.message}</code></p>
        <p>Please check your installation and try again.</p>
      </body></html>
    `)}`
  );
}

app.whenReady().then(() => {
  startApi().then(onApiReady).catch(onApiError);
});

app.on('window-all-closed', () => {
  app.quit();
});
