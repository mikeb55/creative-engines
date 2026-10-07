import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fieldFromResource } from '../../../engines/composer-os-v2/core/pentatonic/fieldDistance';
import { planGradedOut } from '../../../engines/composer-os-v2/core/pentatonic/gradedOut';
import {
  AUTO_COLOR_LABELS,
  analyseManualContext,
  analyseScoreXml,
  comparePracticeExample,
  exportPracticeSheet,
  generatePracticeExample,
  inspectCustomCollection,
  legacyColourWheel,
  listPracticeFields,
  museScoreOpenCommand,
  nextPracticeExample,
  connectFields,
  deriveField,
  layerField,
  moveOut,
  planPracticeAutoColor,
  revealInFinderCommand,
  sha256Text,
  transformPracticeCell,
  type PracticeExample,
  type PracticeRequest,
} from '../../../engines/composer-os-v2/core/pentatonic/practiceFacade';

let loadedScoreXml: string | null = null;
let loadedScorePath: string | null = null;

function exportDir(): string {
  const dir = path.join(app.getPath('music'), 'Pentatonic Options V2');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeXml(name: string, xml: string): string {
  const file = path.join(exportDir(), name);
  fs.writeFileSync(file, xml, 'utf8');
  return file;
}

function runCommand(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0]!, args.slice(1), { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code}`))));
  });
}

function registerIpc(): void {
  ipcMain.handle('practice:generate', (_event, request: PracticeRequest) => generatePracticeExample(request ?? {}));
  ipcMain.handle('practice:next', (_event, request: PracticeRequest) => nextPracticeExample(request ?? {}));
  ipcMain.handle('practice:analyse', (_event, request: PracticeRequest) => {
    if (loadedScoreXml) {
      const before = sha256Text(loadedScoreXml);
      const analysed = analyseScoreXml(loadedScoreXml);
      if (sha256Text(loadedScoreXml) !== before) throw new Error('Source MusicXML changed.');
      return { source: 'score', path: loadedScorePath, ...analysed };
    }
    return { source: 'manual', ...analyseManualContext(request ?? {}) };
  });
  ipcMain.handle('practice:analyseScore', async () => {
    const picked = await dialog.showOpenDialog({
      title: 'Open MusicXML',
      filters: [{ name: 'MusicXML', extensions: ['musicxml', 'xml'] }],
      properties: ['openFile'],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    loadedScorePath = picked.filePaths[0];
    loadedScoreXml = fs.readFileSync(loadedScorePath, 'utf8');
    const sha = sha256Text(loadedScoreXml);
    const analysed = analyseScoreXml(loadedScoreXml);
    if (sha256Text(fs.readFileSync(loadedScorePath, 'utf8')) !== sha) throw new Error('Source MusicXML changed.');
    return { path: loadedScorePath, ...analysed };
  });
  ipcMain.handle('practice:autoColor', (_event, request: PracticeRequest) => planPracticeAutoColor(request ?? {}));
  ipcMain.handle('practice:compare', (_event, example: PracticeExample) => comparePracticeExample(example));
  ipcMain.handle('practice:fields', (_event, centre: string) => listPracticeFields(centre));
  ipcMain.handle('practice:wheel', (_event, centre: string) => legacyColourWheel(centre));
  ipcMain.handle('practice:custom', (_event, notes: string, centre: string) => inspectCustomCollection(notes, centre));
  ipcMain.handle('practice:motif', (_event, payload: { pitches: number[]; centre?: string; fieldId?: string; transform?: 'original' | 'rotation' | 'transposition' | 'M-DEG' | 'M-NEAR' }) =>
    transformPracticeCell(payload)
  );
  ipcMain.handle('practice:export', (_event, example: PracticeExample) => {
    const file = writeXml(`practice-${Date.now()}.musicxml`, example.musicXml);
    return file;
  });
  ipcMain.handle('practice:sheet', (_event, examples: PracticeExample[]) => {
    const xml = exportPracticeSheet(examples);
    return writeXml(`practice-sheet-${Date.now()}.musicxml`, xml);
  });
  ipcMain.handle('practice:open', async (_event, filePath: string) => {
    await runCommand(museScoreOpenCommand(filePath));
    return true;
  });
  ipcMain.handle('practice:reveal', async (_event, filePath: string) => {
    await runCommand(revealInFinderCommand(filePath));
    return true;
  });
  ipcMain.handle('practice:intentions', () => AUTO_COLOR_LABELS);
  ipcMain.handle('practice:moveOut', (_event, request: PracticeRequest, outness: 'SUBTLE' | 'MODERATE' | 'STRONG' | 'REMOTE') => moveOut(request ?? {}, outness || 'MODERATE'));
  ipcMain.handle('practice:pivot', (_event, request: PracticeRequest) => connectFields(request ?? {}));
  ipcMain.handle('practice:extract', (_event, request: PracticeRequest) => deriveField(request ?? {}));
  ipcMain.handle('practice:layered', (_event, request: PracticeRequest) => layerField(request ?? {}));
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    title: 'Pentatonic Options',
    backgroundColor: '#16181d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.setMenuBarVisibility(false);
  window.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

const selfTest = process.argv.includes('--self-test');

app.whenReady().then(() => {
  registerIpc();
  if (selfTest) {
    const example = generatePracticeExample({});
    const source = fieldFromResource('minor_pentatonic', 'C');
    const graded = source ? planGradedOut({ source, outness: 'SUBTLE' }) : null;
    if (!example.musicXml.includes('<score-partwise') || !graded) {
      console.error('SELF_TEST_FAIL export');
      app.exit(1);
      return;
    }
    console.log(`SELF_TEST_OK ${example.category} ${example.operator} ${example.notes}`);
    app.exit(0);
    return;
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
