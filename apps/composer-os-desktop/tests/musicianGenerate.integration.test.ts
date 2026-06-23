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

describe('musician progression padding', () => {
  it('cycles uneven seeds (19 -> 24)', async () => {
    const { buildPaddedLockedProgressionText } = await import('../electron/musicianIpc');
    const seed = Array.from({ length: 19 }, (_, i) => `C${i + 1}`);
    const padded = buildPaddedLockedProgressionText(seed.join(' | '), 24);
    expect(padded.ok).toBe(true);
    if (!padded.ok) return;
    expect(padded.text.split(' | ')).toHaveLength(24);
    expect(padded.text.split(' | ')[19]).toBe('C1');
  });
});

describe('musician Milestone A apiGenerate body wiring', () => {
  const composerSlug = 'wayne_shorter';
  const seed = 90217;
  let buildMusicianApiGenerateBody: (
    request: import('../electron/musicianTypes').MusicianGenerateRequest
  ) => import('../electron/musicianIpc').BuildMusicianApiGenerateBodyResult;

  beforeAll(async () => {
    ({ buildMusicianApiGenerateBody } = await import('../electron/musicianIpc'));
  });

  function bodyFor(request: {
    chordProgressionText?: string;
    totalBars?: number;
    songwriterStyleId?: string;
  }): Record<string, unknown> {
    const built = buildMusicianApiGenerateBody({ composerSlug, seed, ...request });
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error('expected valid body');
    return built.body;
  }

  it('Case 1 — empty progression keeps song_mode path frozen', () => {
    const body = bodyFor({});
    expect(body.presetId).toBe('song_mode');
    expect(body.totalBars).toBe(32);
    expect(body.chordProgressionText).toBeUndefined();
    expect(body.harmonyMode).toBeUndefined();
  });

  it('Case 2 — pasted 8 chords at totalBars 8 uses guitar_bass_duo custom_locked', () => {
    const eightChords = 'Dm9 | G13 | Cmaj9 | A7alt | Em7 | A7 | Dm7 | G7';
    const body = bodyFor({ chordProgressionText: eightChords, totalBars: 8 });
    expect(body.presetId).toBe('guitar_bass_duo');
    expect(body.harmonyMode).toBe('custom_locked');
    expect(body.bandModeEnabled).toBe(true);
    expect(body.totalBars).toBe(8);
    expect((body.chordProgressionText as string).split(' | ')).toHaveLength(8);
  });

  it('Case 3 — short 19-chord paste pads to 24 bars with longFormEnabled', () => {
    const nineteenChords = Array.from({ length: 19 }, (_, i) => `C${i + 1}`).join(' | ');
    const body = bodyFor({ chordProgressionText: nineteenChords, totalBars: 24 });
    expect(body.totalBars).toBe(24);
    expect(body.longFormEnabled).toBe(true);
    const bars = (body.chordProgressionText as string).split(' | ');
    expect(bars).toHaveLength(24);
    expect(bars[18]).toBe('C19');
    expect(bars[19]).toBe('C1');
    expect(bars[23]).toBe('C5');
  });

  it('Case 4 — defaults: barry_harris styleStack and primarySongwriterStyle === composerSlug', () => {
    const body = bodyFor({ chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt', totalBars: 8 });
    const styleStack = body.styleStack as { primary: string };
    expect(styleStack.primary).toBe('barry_harris');
    expect(body.primarySongwriterStyle).toBe('wayne_shorter');
  });
});

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

  it('pads pasted chords and writes Guitar-Bass Duos XML (custom_locked)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-musician-custom-'));
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
      {
        composerSlug: 'wayne_shorter',
        seed: 90106,
        chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt',
        totalBars: 8,
      },
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

    expect(path.basename(path.dirname(response.outputPath))).toBe('Guitar-Bass Duos');
    expect(fs.existsSync(response.outputPath)).toBe(true);

    const xml = fs.readFileSync(response.outputPath, 'utf8');
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(Buffer.byteLength(xml, 'utf8')).toBeGreaterThan(512);

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
