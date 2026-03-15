/**
 * Wyble Etude Generator — Electron Main Process
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

ipcMain.handle('generate-etudes', async (event, progressionName, practiceMode, musicXmlPath) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'jimmy-wyble-engine');
  const outDir = path.join(rootDir, 'outputs', 'wyble', 'desktop');

  fs.mkdirSync(outDir, { recursive: true });

  const prog = musicXmlPath || progressionName || 'ii_v_i';
  const mode = practiceMode || 'etude';

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ts-node', 'wybleDesktopGenerate.ts', prog, mode], {
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

ipcMain.handle('open-output-folder', async () => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const outDir = path.join(rootDir, 'outputs', 'wyble', 'desktop');
  fs.mkdirSync(outDir, { recursive: true });
  shell.openPath(outDir);
});
