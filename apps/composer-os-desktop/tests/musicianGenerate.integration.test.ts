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
});
