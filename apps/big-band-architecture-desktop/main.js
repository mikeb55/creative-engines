/**
 * Big Band Architecture Generator — Electron Main Process
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

ipcMain.handle('generate-architecture', async (event, progressionId, style) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'big-band-architecture-engine');
  const prog = progressionId || 'ii_V_I_major';
  const styleArg = style || 'standard_swing';

  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['ts-node', '--project', 'tsconfig.json', 'architectureDesktopGenerate.ts', prog, styleArg],
      { cwd: engineDir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

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
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error('Invalid output: ' + stdout));
      }
    });
    child.on('error', reject);
  });
});

ipcMain.handle('generate-score-skeleton', async (event, progressionId, style) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'big-band-architecture-engine');
  const prog = progressionId || 'ii_V_I_major';
  const styleArg = style || 'standard_swing';

  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['ts-node', '--project', 'tsconfig.json', 'scoreDesktopGenerate.ts', prog, styleArg],
      { cwd: engineDir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Score export failed'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error('Invalid output: ' + stdout));
      }
    });
    child.on('error', reject);
  });
});

ipcMain.handle('generate-arranger-assist', async (event, progressionId, style) => {
  const appDir = __dirname;
  const rootDir = path.join(appDir, '..', '..');
  const engineDir = path.join(rootDir, 'engines', 'arranger-assist-engine');
  const prog = progressionId || 'ii_V_I_major';
  const styleArg = style || 'standard_swing';

  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['ts-node', '--project', 'tsconfig.json', 'arrangerAssistDesktopGenerate.ts', prog, styleArg],
      { cwd: engineDir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Arranger-assist export failed'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error('Invalid output: ' + stdout));
      }
    });
    child.on('error', reject);
  });
});

ipcMain.handle('open-output-folder', async (event, folderPath) => {
  const appDir = __dirname;
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return;
  }
  const archDir = path.join(appDir, 'outputs', 'architecture');
  const scoreDir = path.join(appDir, 'outputs', 'score');
  const assistDir = path.join(appDir, 'outputs', 'arranger-assist');
  fs.mkdirSync(archDir, { recursive: true });
  fs.mkdirSync(scoreDir, { recursive: true });
  fs.mkdirSync(assistDir, { recursive: true });

  const collectRunFolders = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d+_run\d+$/.test(e.name))
      .map((e) => ({ name: e.name, path: path.join(dir, e.name), mtime: fs.statSync(path.join(dir, e.name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  };

  const archRuns = collectRunFolders(archDir);
  const scoreRuns = collectRunFolders(scoreDir);
  const assistRuns = collectRunFolders(assistDir);
  const all = [...archRuns, ...scoreRuns, ...assistRuns].sort((a, b) => b.mtime - a.mtime);
  const target = all.length > 0 ? all[0].path : assistRuns.length > 0 ? assistDir : scoreRuns.length > 0 ? scoreDir : archDir;
  shell.openPath(target);
});
