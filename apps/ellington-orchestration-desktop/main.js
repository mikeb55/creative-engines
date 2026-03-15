/**
 * Ellington Orchestration Generator — Electron Main Process
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
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

ipcMain.handle('show-musicxml-picker', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select MusicXML file',
    filters: [{ name: 'MusicXML', extensions: ['xml', 'musicxml'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('generate-orchestration', async (event, progressionName, musicXmlPath, arrangementMode) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'ellington-orchestration-engine');
  const outDir = path.join(appDir, 'outputs', 'ellington');

  fs.mkdirSync(outDir, { recursive: true });

  const prog = musicXmlPath || progressionName || 'ii_V_I_major';
  const mode = arrangementMode || 'classic';

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ts-node', '--project', 'tsconfig.json', 'ellingtonDesktopGenerate.ts', prog, mode], {
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
  const ellingtonOutDir = path.join(appDir, 'outputs', 'ellington');
  fs.mkdirSync(ellingtonOutDir, { recursive: true });
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  } else {
    const entries = fs.readdirSync(ellingtonOutDir, { withFileTypes: true });
    const runFolders = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d+_run\d+$/.test(e.name))
      .map((e) => ({ name: e.name, path: path.join(ellingtonOutDir, e.name) }))
      .sort((a, b) => b.name.localeCompare(a.name));
    const target = runFolders.length > 0 ? runFolders[0].path : ellingtonOutDir;
    shell.openPath(target);
  }
});
