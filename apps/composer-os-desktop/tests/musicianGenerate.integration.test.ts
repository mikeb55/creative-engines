import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const shellOpenPath = vi.fn(async () => '');
const shellShowItemInFolder = vi.fn(async () => undefined);

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => path.resolve(__dirname, '..'),
  },
  shell: {
    openPath: shellOpenPath,
    showItemInFolder: shellShowItemInFolder,
  },
}));

describe('musician generate integration', () => {
  const desktopRoot = path.resolve(__dirname, '..');
  const ipcBundlePath = path.join(desktopRoot, 'resources', 'desktop-ipc.bundle.cjs');
  const tempRoots: string[] = [];
  let prevOutputDir: string | undefined;
  let prevRepoRoot: string | undefined;
  let prevDesktopIpc: string | undefined;

  beforeAll(() => {
    if (!fs.existsSync(ipcBundlePath)) {
      throw new Error(
        `Missing ${ipcBundlePath}. Run npm run build:desktop-ipc from apps/composer-os-desktop first.`
      );
    }
  });

  afterEach(() => {
    shellOpenPath.mockClear();
    shellShowItemInFolder.mockClear();
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes song mode XML via handleMusicianGenerate (wayne_shorter seed 90217)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-musician-'));
    tempRoots.push(tmpRoot);

    prevOutputDir = process.env.COMPOSER_OS_OUTPUT_DIR;
    prevRepoRoot = process.env.COMPOSER_OS_REPO_ROOT;
    prevDesktopIpc = process.env.COMPOSER_OS_DESKTOP_IPC;
    process.env.COMPOSER_OS_OUTPUT_DIR = tmpRoot;
    process.env.COMPOSER_OS_REPO_ROOT = path.resolve(desktopRoot, '..', '..');
    process.env.COMPOSER_OS_DESKTOP_IPC = '1';

    const {
      loadMusicianRegistryAtStartup,
      handleMusicianGenerate,
      resetMusicianGenerateInFlightForTests,
    } = await import('../electron/musicianIpc');

    loadMusicianRegistryAtStartup();

    const response = await handleMusicianGenerate(
      { composerSlug: 'wayne_shorter', seed: 90217 },
      tmpRoot,
      () => null
    );

    if (prevOutputDir === undefined) delete process.env.COMPOSER_OS_OUTPUT_DIR;
    else process.env.COMPOSER_OS_OUTPUT_DIR = prevOutputDir;
    if (prevRepoRoot === undefined) delete process.env.COMPOSER_OS_REPO_ROOT;
    else process.env.COMPOSER_OS_REPO_ROOT = prevRepoRoot;
    if (prevDesktopIpc === undefined) delete process.env.COMPOSER_OS_DESKTOP_IPC;
    else process.env.COMPOSER_OS_DESKTOP_IPC = prevDesktopIpc;

    expect(response.ok).toBe(true);
    if (!response.ok) {
      throw new Error(`Expected success: ${response.message}${response.detail ? ` (${response.detail})` : ''}`);
    }

    expect(path.basename(path.dirname(response.outputPath))).toBe('Song Mode');
    expect(fs.existsSync(response.outputPath)).toBe(true);

    const xml = fs.readFileSync(response.outputPath, 'utf8');
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(Buffer.byteLength(xml, 'utf8')).toBeGreaterThan(1024);

    resetMusicianGenerateInFlightForTests();
  }, 120_000);

  it('Evans Musician bridge loads benchmark fixture from IPC bundle resources (bill_evans seed 90301)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-musician-evans-'));
    tempRoots.push(tmpRoot);

    const beFixture = path.join(desktopRoot, 'resources', 'test-fixtures', 'BE_Benchmark_LyricalBallad.musicxml');
    const ipcDir = path.dirname(ipcBundlePath);
    expect(fs.existsSync(beFixture)).toBe(true);
    expect(path.resolve(beFixture)).toBe(
      path.resolve(ipcDir, 'test-fixtures', 'BE_Benchmark_LyricalBallad.musicxml')
    );

    prevOutputDir = process.env.COMPOSER_OS_OUTPUT_DIR;
    prevRepoRoot = process.env.COMPOSER_OS_REPO_ROOT;
    prevDesktopIpc = process.env.COMPOSER_OS_DESKTOP_IPC;
    process.env.COMPOSER_OS_OUTPUT_DIR = tmpRoot;
    process.env.COMPOSER_OS_REPO_ROOT = path.resolve(desktopRoot, '..', '..');
    process.env.COMPOSER_OS_DESKTOP_IPC = '1';

    const { apiGenerate } = require(ipcBundlePath) as {
      apiGenerate: (
        body: Record<string, unknown>,
        libraryRoot: string
      ) => { success: boolean; error?: string; detail?: string; filepath?: string };
    };

    const premiumResult = apiGenerate(
      {
        presetId: 'song_mode',
        primarySongwriterStyle: 'bill_evans',
        seed: 90301,
        totalBars: 32,
        creativeControlLevel: 'stable',
        musicianPremiumMelody: true,
        outputLabel: 'bill_evans_premium',
      },
      tmpRoot
    );

    const premiumDetail = `${premiumResult.error ?? ''} ${premiumResult.detail ?? ''}`;
    expect(premiumDetail).not.toMatch(/benchmark fixture missing/i);
    expect(premiumResult.success || /Phrase authority/i.test(premiumDetail)).toBe(true);

    const genericResult = apiGenerate(
      {
        presetId: 'song_mode',
        primarySongwriterStyle: 'bill_evans',
        seed: 90301,
        totalBars: 32,
        creativeControlLevel: 'stable',
        outputLabel: 'bill_evans_generic',
      },
      tmpRoot
    );
    expect(genericResult.success).toBe(true);
    expect(genericResult.filepath).toBeTruthy();
    const genericXml = fs.readFileSync(genericResult.filepath as string, 'utf8');
    expect(genericXml.startsWith('<?xml')).toBe(true);

    if (prevOutputDir === undefined) delete process.env.COMPOSER_OS_OUTPUT_DIR;
    else process.env.COMPOSER_OS_OUTPUT_DIR = prevOutputDir;
    if (prevRepoRoot === undefined) delete process.env.COMPOSER_OS_REPO_ROOT;
    else process.env.COMPOSER_OS_REPO_ROOT = prevRepoRoot;
    if (prevDesktopIpc === undefined) delete process.env.COMPOSER_OS_DESKTOP_IPC;
    else process.env.COMPOSER_OS_DESKTOP_IPC = prevDesktopIpc;
  }, 180_000);
});
