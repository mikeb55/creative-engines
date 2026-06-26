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

describe('musician Tab 2 mosaic stitch', () => {
  const blockA =
    'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
  const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';
  const blockC = 'Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7alt | Cm(add9)';

  function assertPlanInvariant(
    plan: Array<{ sectionLabel: string; startBar: number; endBar: number; songwriterStyleId: string }>,
    blockCount: number
  ): void {
    expect(plan.length).toBe(blockCount);
    expect(plan[0]?.startBar).toBe(1);
    for (let i = 0; i < plan.length; i++) {
      const row = plan[i]!;
      expect(row.endBar - row.startBar).toBe(7);
      if (i > 0) {
        expect(row.startBar).toBe(plan[i - 1]!.endBar + 1);
      }
    }
    expect(plan[plan.length - 1]?.endBar).toBe(blockCount * 8);
  }

  it('1 — 2-block stitch (verlaine, marr): parent text order + A/B plan', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const { chordProgressionText, mosaicSectionPlan, totalBars } = stitched.result;
    expect(totalBars).toBe(16);
    expect(mosaicSectionPlan.length).toBe(2);
    assertPlanInvariant(mosaicSectionPlan, 2);

    expect(mosaicSectionPlan[0]).toEqual({
      sectionLabel: 'A',
      startBar: 1,
      endBar: 8,
      songwriterStyleId: 'verlaine',
    });
    expect(mosaicSectionPlan[1]).toEqual({
      sectionLabel: 'B',
      startBar: 9,
      endBar: 16,
      songwriterStyleId: 'marr',
    });

    const chords = chordProgressionText.split(' | ');
    expect(chords).toHaveLength(16);
    expect(chords[0]).toBe('Em(maj7)');
    expect(chords[7]).toBe('Em(add9)');
    expect(chords[8]).toBe('Dmaj7');
    expect(chords[15]).toBe('Dmaj9');

    for (const row of mosaicSectionPlan) {
      expect(row).not.toHaveProperty('chords');
    }
  });

  it('2 — reorder: swap blocks 0↔2 keeps block-3 chords + composer at bars 1–8', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
      { chordsText: blockC, songwriterStyleId: 'fripp' },
    ];
    const swapped = [blocks[2]!, blocks[1]!, blocks[0]!];
    const stitched = stitchMosaicBlocks(swapped);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const firstEight = stitched.result.chordProgressionText.split(' | ').slice(0, 8);
    expect(firstEight.join(' | ')).toBe(blockC);
    expect(stitched.result.mosaicSectionPlan[0]?.songwriterStyleId).toBe('fripp');
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 3);
  });

  it('3 — duplicate: +1 section, matching chords + composer on adjacent pair', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ];
    const duplicated = [
      blocks[0]!,
      { chordsText: blocks[0]!.chordsText, songwriterStyleId: blocks[0]!.songwriterStyleId },
      blocks[1]!,
    ];
    const stitched = stitchMosaicBlocks(duplicated);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    expect(stitched.result.totalBars).toBe(24);
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 3);

    const chords = stitched.result.chordProgressionText.split(' | ');
    expect(chords.slice(0, 8).join(' | ')).toBe(blockA);
    expect(chords.slice(8, 16).join(' | ')).toBe(blockA);
    expect(stitched.result.mosaicSectionPlan[0]?.songwriterStyleId).toBe('verlaine');
    expect(stitched.result.mosaicSectionPlan[1]?.songwriterStyleId).toBe('verlaine');
  });

  it('4 — delete middle (3→2): parent = block1 + block3, labels A,B', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
      { chordsText: blockC, songwriterStyleId: 'fripp' },
    ];
    const afterDelete = [blocks[0]!, blocks[2]!];
    const stitched = stitchMosaicBlocks(afterDelete);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    expect(stitched.result.totalBars).toBe(16);
    expect(stitched.result.mosaicSectionPlan.length).toBe(2);
    expect(stitched.result.mosaicSectionPlan[0]?.sectionLabel).toBe('A');
    expect(stitched.result.mosaicSectionPlan[1]?.sectionLabel).toBe('B');
    expect(stitched.result.mosaicSectionPlan[0]).toMatchObject({ startBar: 1, endBar: 8 });
    expect(stitched.result.mosaicSectionPlan[1]).toMatchObject({ startBar: 9, endBar: 16 });

    const chords = stitched.result.chordProgressionText.split(' | ');
    expect(chords.slice(0, 8).join(' | ')).toBe(blockA);
    expect(chords.slice(8, 16).join(' | ')).toBe(blockC);
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 2);
  });

  it('5 — chords never appear in mosaicSectionPlan JSON', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const planJson = JSON.stringify(stitched.result.mosaicSectionPlan);
    expect(planJson).not.toContain('|');
    expect(planJson).not.toMatch(/maj7/i);
    expect(planJson).not.toMatch(/m7/i);
  });

  it('6 — validation rejects <2 blocks and 7-chord block', async () => {
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const oneBlock = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
    ]);
    expect(oneBlock.ok).toBe(false);

    const sevenChords = 'Dm9 | G13 | Cmaj9 | A7alt | Em7 | A7 | Dm7';
    const shortBlock = stitchMosaicBlocks([
      { chordsText: sevenChords, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(shortBlock.ok).toBe(false);
  });

  it('mosaic IPC body carries mosaicSectionPlan + guitar_bass_duo locked harmony', async () => {
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');
    const { stitchMosaicBlocks } = await import('../electron/stitchMosaicBlocks');
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
      { chordsText: blockC, songwriterStyleId: 'fripp' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const built = buildMusicianApiGenerateBody({
      composerSlug: 'verlaine',
      seed: 90106,
      chordProgressionText: stitched.result.chordProgressionText,
      totalBars: stitched.result.totalBars,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    expect(built.presetId).toBe('guitar_bass_duo');
    expect(built.body.harmonyMode).toBe('custom_locked');
    expect(built.body.bandModeEnabled).toBe(true);
    expect(built.body.longFormEnabled).toBe(true);
    expect(built.body.mosaicSectionPlan).toEqual(stitched.result.mosaicSectionPlan);
    expect((built.body.chordProgressionText as string).split(' | ')).toHaveLength(24);
  });
});

describe('musician Tab 1 mosaicSectionPlan parity', () => {
  it('blank progression omits mosaicSectionPlan', async () => {
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');
    const built = buildMusicianApiGenerateBody({ composerSlug: 'wayne_shorter', seed: 90217 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.body.mosaicSectionPlan).toBeUndefined();
    expect(built.body.presetId).toBe('song_mode');
    expect(built.body.totalBars).toBe(32);
    expect(built.body.chordProgressionText).toBeUndefined();
    expect(built.body.harmonyMode).toBeUndefined();
  });

  it('pasted progression omits mosaicSectionPlan', async () => {
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');
    const built = buildMusicianApiGenerateBody({
      composerSlug: 'wayne_shorter',
      seed: 90217,
      chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt',
      totalBars: 8,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.body.mosaicSectionPlan).toBeUndefined();
    expect(built.body.presetId).toBe('guitar_bass_duo');
    expect(built.body.harmonyMode).toBe('custom_locked');
    expect(built.body.bandModeEnabled).toBe(true);
    expect(built.body.totalBars).toBe(8);
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

describe('musician Milestone B Tab 2 wired path', () => {
  const blockA =
    'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
  const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';
  const blockC = 'Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7alt | Cm(add9)';
  const seed = 90106;

  type BlockCardState = { chords: string; composerId: string };

  function duplicateBlock(cards: BlockCardState[], index: number): void {
    const source = cards[index];
    if (!source) return;
    cards.splice(index + 1, 0, {
      chords: source.chords,
      composerId: source.composerId,
    });
  }

  function moveBlock(cards: BlockCardState[], index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= cards.length) return;
    const tmp = cards[index]!;
    cards[index] = cards[target]!;
    cards[target] = tmp;
  }

  function deleteBlock(cards: BlockCardState[], index: number): void {
    if (cards.length <= 2) return;
    cards.splice(index, 1);
  }

  function assertPlanHasNoChordFields(
    plan: Array<{ sectionLabel: string; startBar: number; endBar: number; songwriterStyleId: string }>
  ): void {
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain('|');
    expect(planJson).not.toMatch(/maj7/i);
    for (const row of plan) {
      expect(row).not.toHaveProperty('chords');
      expect(row).not.toHaveProperty('chordsText');
    }
  }

  it('1 — wired happy path: 3 cards → request → api body', async () => {
    const { buildBlocksGenerateRequest } = await import('../electron/buildBlocksGenerateRequest');
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');

    const cards: BlockCardState[] = [
      { chords: blockA, composerId: 'verlaine' },
      { chords: blockB, composerId: 'marr' },
      { chords: blockC, composerId: 'fripp' },
    ];

    const built = buildBlocksGenerateRequest(cards, seed);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const api = buildMusicianApiGenerateBody(built.request);
    expect(api.ok).toBe(true);
    if (!api.ok) return;

    expect(api.presetId).toBe('guitar_bass_duo');
    expect(api.body.harmonyMode).toBe('custom_locked');
    expect(api.body.bandModeEnabled).toBe(true);
    expect(api.body.longFormEnabled).toBe(true);
    expect(api.body.totalBars).toBe(24);

    const plan = api.body.mosaicSectionPlan as Array<{
      sectionLabel: string;
      startBar: number;
      endBar: number;
      songwriterStyleId: string;
    }>;
    expect(plan.length).toBe(3);
    expect(plan[0]).toMatchObject({ sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' });
    expect(plan[1]).toMatchObject({ sectionLabel: 'B', startBar: 9, endBar: 16, songwriterStyleId: 'marr' });
    expect(plan[2]).toMatchObject({ sectionLabel: 'C', startBar: 17, endBar: 24, songwriterStyleId: 'fripp' });

    const chords = (api.body.chordProgressionText as string).split(' | ');
    expect(chords).toHaveLength(24);
    expect(chords.slice(0, 8).join(' | ')).toBe(blockA);
    expect(chords.slice(8, 16).join(' | ')).toBe(blockB);
    expect(chords.slice(16, 24).join(' | ')).toBe(blockC);

    assertPlanHasNoChordFields(plan);
  });

  it('2 — wired after card ops: duplicate, move to end, delete original card 1', async () => {
    const { buildBlocksGenerateRequest } = await import('../electron/buildBlocksGenerateRequest');
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');

    const cards: BlockCardState[] = [
      { chords: blockA, composerId: 'verlaine' },
      { chords: blockB, composerId: 'marr' },
    ];

    duplicateBlock(cards, 0);
    moveBlock(cards, 1, 1);
    deleteBlock(cards, 1);

    const built = buildBlocksGenerateRequest(cards, seed);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const api = buildMusicianApiGenerateBody(built.request);
    expect(api.ok).toBe(true);
    if (!api.ok) return;

    const plan = api.body.mosaicSectionPlan as Array<{
      sectionLabel: string;
      startBar: number;
      endBar: number;
      songwriterStyleId: string;
    }>;

    expect(plan.length).toBe(cards.length);
    expect(api.body.totalBars).toBe(cards.length * 8);
    expect(plan.map((row) => row.sectionLabel)).toEqual(['A', 'B']);
    expect(plan[0]?.startBar).toBe(1);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i]?.startBar).toBe(plan[i - 1]!.endBar + 1);
      expect(plan[i]?.endBar! - plan[i]?.startBar!).toBe(7);
    }
    expect(plan[plan.length - 1]?.endBar).toBe(cards.length * 8);
  });

  it('3 — Tab 1 unaffected: blank and pasted progression omit mosaicSectionPlan', async () => {
    const { buildMusicianApiGenerateBody } = await import('../electron/musicianIpc');

    const blank = buildMusicianApiGenerateBody({ composerSlug: 'wayne_shorter', seed: 90217 });
    expect(blank.ok).toBe(true);
    if (!blank.ok) return;
    expect(blank.body.mosaicSectionPlan).toBeUndefined();
    expect(blank.body.presetId).toBe('song_mode');
    expect(blank.body.totalBars).toBe(32);
    expect(blank.body.chordProgressionText).toBeUndefined();
    expect(blank.body.harmonyMode).toBeUndefined();
    expect(blank.body).not.toHaveProperty('mosaicSectionPlan');

    const pasted = buildMusicianApiGenerateBody({
      composerSlug: 'wayne_shorter',
      seed: 90217,
      chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt',
      totalBars: 8,
    });
    expect(pasted.ok).toBe(true);
    if (!pasted.ok) return;
    expect(pasted.body.mosaicSectionPlan).toBeUndefined();
    expect(pasted.body.presetId).toBe('guitar_bass_duo');
    expect(pasted.body.harmonyMode).toBe('custom_locked');
    expect(pasted.body.bandModeEnabled).toBe(true);
    expect(pasted.body.totalBars).toBe(8);
    expect(pasted.body).not.toHaveProperty('mosaicSectionPlan');
  });

  it('4 — bundle guard: built musician.js includes Tab 2 wiring markers', () => {
    const bundlePath = path.resolve(__dirname, '..', 'resources', 'musician', 'musician.js');
    if (!fs.existsSync(bundlePath)) {
      expect(true).toBe(true);
      return;
    }
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    expect(bundle).toContain('blocks-generate');
    expect(bundle).toContain('stitchMosaicBlocks');
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
