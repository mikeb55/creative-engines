/**
 * Composer OS Desktop — Electron main process
 * Packaged UI loads from disk (no localhost). API via IPC + shared engine (no HTTP for desktop).
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { StartupState } from './startupState';
import * as crypto from 'crypto';
import {
  DESKTOP_APP_ID,
  DESKTOP_PRODUCT_NAME,
  resolveDefaultOutputDir,
  resolveUiPath,
  getWindowIconPath,
  resolveDesktopIpcBundlePath,
  resolveBuildStampPath,
} from './config';
import {
  verifyUiBundleAtPath,
  type ComposerOsUiStamp,
  type UiBundleVerifyFail,
} from './uiBundleVerify';
import { registerOpenOutputFolderIpc } from './openFolderMain';

let mainWindow: BrowserWindow | null = null;
let startupState: StartupState = 'booting';
let cachedUiStamp: ComposerOsUiStamp | null = null;
let cachedUiPath = '';

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
  appId: DESKTOP_APP_ID,
  exePath: app.getPath('exe'),
  integration: 'ipc' as const,
}));

ipcMain.handle('composer-os:get-ui-provenance', () => ({
  verified: cachedUiStamp !== null,
  productName: DESKTOP_PRODUCT_NAME,
  appId: DESKTOP_APP_ID,
  desktopVersion: app.getVersion(),
  uiBundlePath: cachedUiPath,
  uiProductId: cachedUiStamp?.productId ?? null,
  uiBuildTimestamp: cachedUiStamp?.buildTimestamp ?? null,
  uiGitCommit: cachedUiStamp?.gitCommit ?? null,
  uiAppShellVersion: cachedUiStamp?.appShellVersion ?? null,
  outputDirectory: process.env.COMPOSER_OS_OUTPUT_DIR ?? '',
  desktopMode: 'ipc' as const,
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

function injectComposerOsDesktopRuntime(bundlePath: string): void {
  process.env.COMPOSER_OS_DESKTOP_IPC = '1';
  const ipcBuf = fs.readFileSync(bundlePath);
  const liveHash = crypto.createHash('sha256').update(ipcBuf).digest('hex');
  process.env.COMPOSER_OS_IPC_BUNDLE_PATH = bundlePath;
  process.env.COMPOSER_OS_IPC_BUNDLE_SHA256 = liveHash;

  const stampPath = resolveBuildStampPath();
  if (stampPath) {
    try {
      const raw = fs.readFileSync(stampPath, 'utf-8');
      process.env.COMPOSER_OS_BUILD_STAMP_JSON = raw;
      const stamp = JSON.parse(raw) as {
        ipcBundle?: { sha256?: string };
        apiBundle?: { sha256?: string };
        generatedAt?: string;
        desktopPackageVersion?: string;
        gitCommit?: string | null;
      };
      const stampIpc = stamp.ipcBundle?.sha256;
      process.env.COMPOSER_OS_STAMP_IPC_SHA256 = stampIpc ?? '';
      process.env.COMPOSER_OS_API_BUNDLE_SHA256 = stamp.apiBundle?.sha256 ?? '';
      process.env.COMPOSER_OS_STAMP_IPC_MATCH =
        stampIpc && stampIpc === liveHash ? '1' : stampIpc ? '0' : 'unknown';
    } catch {
      process.env.COMPOSER_OS_STAMP_IPC_MATCH = 'unknown';
    }
  } else {
    process.env.COMPOSER_OS_STAMP_IPC_MATCH = 'unknown';
  }
}

function registerDesktopIpc(outputDir: string): void {
  const bundlePath = resolveDesktopIpcBundlePath();
  if (!bundlePath) {
    throw new Error(
      'Composer OS desktop IPC bundle is missing (resources/desktop-ipc.bundle.cjs). Rebuild the app.'
    );
  }
  if (!process.env.COMPOSER_OS_REPO_ROOT) {
    process.env.COMPOSER_OS_REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
  }
  process.env.COMPOSER_OS_OUTPUT_DIR = outputDir;
  process.env.COMPOSER_OS_DESKTOP_APP_VERSION = app.getVersion();
  injectComposerOsDesktopRuntime(bundlePath);
  const { registerComposerOsIpc } = require(bundlePath) as {
    registerComposerOsIpc: (im: typeof ipcMain, dir: string) => void;
  };
  registerComposerOsIpc(ipcMain, outputDir);
  registerOpenOutputFolderIpc(ipcMain, outputDir);

  const stampMatch = process.env.COMPOSER_OS_STAMP_IPC_MATCH;
  console.log(
    '[Composer OS Desktop] runtime',
    JSON.stringify(
      {
        appVersion: app.getVersion(),
        ipcBundlePath: bundlePath,
        ipcBundleSha256: process.env.COMPOSER_OS_IPC_BUNDLE_SHA256,
        apiBundleSha256FromStamp: process.env.COMPOSER_OS_API_BUNDLE_SHA256,
        stampIpcSha256: process.env.COMPOSER_OS_STAMP_IPC_SHA256,
        stampMatchesLiveIpc: stampMatch,
        truthDump: process.env.COMPOSER_OS_TRUTH_DUMP === '1',
      },
      null,
      2
    )
  );
  if (stampMatch === '0') {
    console.warn(
      '[Composer OS Desktop] IPC bundle SHA-256 does not match composer-os-build-stamp.json — stale or unpackaged resources? Re-run npm run desktop:build.'
    );
  }
}

function createWindowShell(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = getWindowIconPath();
  const win = new BrowserWindow({
    title: `Composer OS - v${app.getVersion()}`,
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
        event.preventDefault();
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
        <p>Something went wrong while starting the app. You can try again after closing other copies.</p>
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

function loadWrongBundleUiPage(win: BrowserWindow, vr: UiBundleVerifyFail): void {
  const safePath = escapeHtml(vr.resolvedPath);
  const safeReason = escapeHtml(vr.reason);
  const safePid = escapeHtml(vr.foundProductId ?? '(none)');
  win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${DESKTOP_PRODUCT_NAME}</title>
      <style>body{font-family:system-ui;background:#1a1a1a;color:#e4e4e7;padding:2rem;margin:0;max-width:44rem;}
      h1{color:#f87171;font-size:1.25rem;}p{line-height:1.5;}code{background:#27272a;padding:2px 6px;border-radius:4px;word-break:break-word;display:block;margin-top:0.75rem;}</style></head>
      <body>
        <h1>Wrong or stale UI bundle</h1>
        <p>${DESKTOP_PRODUCT_NAME} refused to load the UI because the bundle identity check failed. Rebuild the desktop app or reinstall.</p>
        <p><strong>Reason:</strong> ${safeReason}</p>
        <p><strong>Resolved UI path:</strong> <code>${safePath}</code></p>
        <p><strong>productId found:</strong> <code>${safePid}</code></p>
      </body></html>
    `)}`
  );
}

async function launchApp(): Promise<void> {
  setStartupState('booting');
  mainWindow = createWindowShell();
  const win = mainWindow;
  loadLoadingPage(win);

  const uiPath = resolveUiPath();
  const vr = verifyUiBundleAtPath(uiPath);
  if (!vr.ok) {
    cachedUiStamp = null;
    cachedUiPath = vr.resolvedPath;
    setStartupState('fatal_error');
    loadWrongBundleUiPage(win, vr);
    win.once('ready-to-show', () => win.show());
    return;
  }
  cachedUiStamp = vr.stamp;
  cachedUiPath = vr.resolvedPath;
  console.log(
    '[Composer OS Desktop] UI bundle',
    JSON.stringify(
      {
        path: cachedUiPath,
        uiBuildTimestamp: cachedUiStamp.buildTimestamp,
        uiGitCommit: cachedUiStamp.gitCommit,
        uiAppShellVersion: cachedUiStamp.appShellVersion,
        uiProductId: cachedUiStamp.productId,
      },
      null,
      2
    )
  );

  const outputDir = resolveDefaultOutputDir();
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    setStartupState('fatal_error');
    loadErrorPage(
      win,
      'Composer OS cannot use the output folder (missing or not writable). Check disk space and folder permissions.'
    );
    win.once('ready-to-show', () => win.show());
    return;
  }

  try {
    setStartupState('starting_backend');
    registerDesktopIpc(outputDir);
    const indexHtml = path.join(uiPath, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`UI index missing: ${indexHtml}`);
    }
    setStartupState('loading_ui');
    await win.loadFile(indexHtml);
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
    if (process.platform === 'win32') {
      app.setAppUserModelId(DESKTOP_APP_ID);
    }
    launchApp().catch((err) => {
      console.error(err);
      setStartupState('fatal_error');
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
