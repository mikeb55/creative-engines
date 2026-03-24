/**
 * Composer OS Desktop — Electron main process
 * Starts API (in-process when packaged, spawned when dev), opens window, shuts down cleanly.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';

const PORT = 3001;
const API_READY_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;

let apiProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

function getResourcesPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources');
  }
  return process.resourcesPath;
}

function getApiBundlePath(): string {
  const resources = getResourcesPath();
  const packagedPath = path.join(resources, 'api.bundle.js');
  const devPath = path.join(app.getAppPath(), '..', '..', 'scripts', 'startComposerOsAppApi.ts');
  if (fs.existsSync(packagedPath)) return packagedPath;
  return devPath;
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
  const apiPath = getApiBundlePath();
  const uiPath = getUiPath();
  const outputDir = getOutputDir();

  fs.mkdirSync(outputDir, { recursive: true });

  process.env.COMPOSER_OS_OUTPUT_DIR = outputDir;
  if (fs.existsSync(uiPath)) process.env.COMPOSER_OS_STATIC_DIR = uiPath;
  process.env.PORT = String(PORT);

  const isTs = apiPath.endsWith('.ts');
  if (isTs) {
    return new Promise((resolve, reject) => {
      apiProcess = spawn(
        'npx',
        ['ts-node', '--project', path.join(app.getAppPath(), '..', '..', 'tsconfig.json'), apiPath],
        {
          env: process.env,
          cwd: path.join(app.getAppPath(), '..', '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      apiProcess.stdout?.on('data', (d) => console.log('[API]', d.toString().trim()));
      apiProcess.stderr?.on('data', (d) => console.error('[API]', d.toString().trim()));
      apiProcess.on('error', reject);
      apiProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) console.error('[API] exited', code);
        apiProcess = null;
      });
      waitForApi().then(resolve).catch(reject);
    });
  }

  try {
    require(apiPath);
    return waitForApi();
  } catch (err) {
    return Promise.reject(err);
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
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
  app.quit();
});

app.on('before-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
});
