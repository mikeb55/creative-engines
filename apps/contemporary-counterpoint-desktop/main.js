/**
 * Contemporary Counterpoint Generator — Electron Main Process
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 360,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('generate-counterpoint', async (event, progressionName, voiceCount, density) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'contemporary-counterpoint-engine');
  const outDir = path.join(appDir, 'outputs', 'counterpoint');

  fs.mkdirSync(outDir, { recursive: true });

  const prog = progressionName || 'ii_v_i';
  const voices = Math.min(4, Math.max(2, voiceCount || 2));
  const dens = typeof density === 'number' ? density : 0.5;

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ts-node', '--project', 'tsconfig.json', 'counterpointDesktopGenerate.ts', prog, String(voices), String(dens)], {
      cwd: engineDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Generation failed'));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        reject(new Error('Invalid output: ' + stdout));
      }
    });

    child.on('error', reject);
  });
});

ipcMain.handle('open-output-folder', async (event, folderPath) => {
  const appDir = __dirname;
  const outDir = path.join(appDir, 'outputs', 'counterpoint');
  fs.mkdirSync(outDir, { recursive: true });
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  } else {
    const entries = fs.readdirSync(outDir, { withFileTypes: true });
    const runFolders = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d+_run\d+$/.test(e.name))
      .map((e) => ({ name: e.name, path: path.join(outDir, e.name) }))
      .sort((a, b) => b.name.localeCompare(a.name));
    const target = runFolders.length > 0 ? runFolders[0].path : outDir;
    shell.openPath(target);
  }
});
