/**
 * Musician shell IPC â€” one invoke + one status event (design gate Â§3).
 */
import { app, shell, type BrowserWindow, type IpcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDesktopIpcBundlePath } from './config';
import type {
  MusicianComposerOption,
  MusicianErrorCode,
  MusicianGenerateRequest,
  MusicianGenerateResponse,
  MusicianRegistryFile,
  MusicianStatusEvent,
} from './musicianTypes';

const SONG_FORM_BAR_OPTIONS = [8, 16, 24, 32, 40, 48, 56, 64] as const;

function isAllowedSongFormBarCount(n: number): boolean {
  return (SONG_FORM_BAR_OPTIONS as readonly number[]).includes(n);
}

function normalizeProgressionSeparators(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[,;]/g, '|')
    .replace(/\n+/g, '|')
    .trim();
}

function parseMusicianSeedBars(
  rawText: string
): { ok: true; bars: string[] } | { ok: false; error: string } {
  const trimmed = normalizeProgressionSeparators(rawText);
  if (!trimmed) {
    return { ok: false, error: 'Chord progression is empty.' };
  }
  const bars: string[] = [];
  for (const cell of trimmed.split('|')) {
    const token = cell.trim().split(/\s+/).filter(Boolean)[0]?.trim();
    if (!token) continue;
    bars.push(token);
  }
  if (bars.length === 0) {
    return { ok: false, error: 'No chords found. Separate bars with | , ; or newlines.' };
  }
  return { ok: true, bars };
}

function cyclePadBars(seedBars: readonly string[], totalBars: number): string[] {
  if (seedBars.length === 0 || totalBars < 1) return [];
  const out: string[] = [];
  for (let i = 0; i < totalBars; i++) {
    out.push(seedBars[i % seedBars.length]!);
  }
  return out;
}

export function buildPaddedLockedProgressionText(
  rawText: string,
  totalBars: number
): { ok: true; text: string; seedBarCount: number } | { ok: false; error: string } {
  if (!isAllowedSongFormBarCount(totalBars)) {
    return {
      ok: false,
      error: `totalBars must be one of: ${SONG_FORM_BAR_OPTIONS.join(', ')}.`,
    };
  }
  const parsed = parseMusicianSeedBars(rawText);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const padded = cyclePadBars(parsed.bars, totalBars);
  return { ok: true, text: padded.join(' | '), seedBarCount: parsed.bars.length };
}

type ApiGenerateFn = (
  body: Record<string, unknown>,
  composerLibraryRoot: string
) => { success: boolean; filepath?: string; filename?: string; error?: string; detail?: string };

type EnsureOutputDirectoryForPresetFn = (presetId: string, libraryRoot?: string) => string;

type BuildLabeledMusicXmlFilenameFn = (
  outputLabel: string | undefined,
  seed: number,
  autoFilename: string
) => string;

interface DesktopIpcBundle {
  apiGenerate: ApiGenerateFn;
  ensureOutputDirectoryForPreset: EnsureOutputDirectoryForPresetFn;
  buildLabeledMusicXmlFilename: BuildLabeledMusicXmlFilenameFn;
}

let cachedComposers: MusicianComposerOption[] = [];
let registryLoadError: string | null = null;
let generateInFlight = false;

let cachedBundle: DesktopIpcBundle | null = null;

function musicianDebug(): boolean {
  return process.env.COMPOSER_OS_MUSICIAN_DEBUG === '1';
}

function loadDesktopIpcBundle(): DesktopIpcBundle {
  if (cachedBundle) return cachedBundle;
  const bundlePath = resolveDesktopIpcBundlePath();
  if (!bundlePath) {
    throw new Error(
      'Composer OS desktop IPC bundle is missing (resources/desktop-ipc.bundle.cjs). Rebuild the app.'
    );
  }
  const mod = require(bundlePath) as Partial<DesktopIpcBundle>;
  if (typeof mod.apiGenerate !== 'function' || typeof mod.ensureOutputDirectoryForPreset !== 'function') {
    throw new Error('Desktop IPC bundle missing apiGenerate or ensureOutputDirectoryForPreset exports.');
  }
  cachedBundle = {
    apiGenerate: mod.apiGenerate,
    ensureOutputDirectoryForPreset: mod.ensureOutputDirectoryForPreset,
    buildLabeledMusicXmlFilename:
      typeof mod.buildLabeledMusicXmlFilename === 'function'
        ? mod.buildLabeledMusicXmlFilename
        : (outputLabel, seed, autoFilename) => {
            const slug = outputLabel?.trim().toLowerCase().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
            return slug ? `${slug}_${seed}.musicxml` : autoFilename;
          },
  };
  return cachedBundle;
}

/** Dev repo path or packaged copy under resources/registry/. */
export function resolveMusicianRegistryPath(): string {
  const packaged =
    typeof process.resourcesPath === 'string' && process.resourcesPath.length > 0
      ? path.join(process.resourcesPath, 'registry', 'premium-melody-composer-registry.json')
      : '';
  const devRepo = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'engines',
    'composer-os-v2',
    'scripts',
    'scaffold',
    'premium-melody-composer',
    'registry.json'
  );
  const devResources = path.join(__dirname, '..', 'resources', 'registry', 'premium-melody-composer-registry.json');
  if (app.isPackaged && packaged && fs.existsSync(packaged)) return packaged;
  if (fs.existsSync(devResources)) return devResources;
  if (fs.existsSync(devRepo)) return devRepo;
  if (packaged && fs.existsSync(packaged)) return packaged;
  return devRepo;
}

export function mapRegistryComposers(raw: MusicianRegistryFile['composers']): MusicianComposerOption[] {
  return raw
    .filter((c) => typeof c.slug === 'string' && typeof c.displayName === 'string' && typeof c.seed === 'number')
    .map((c) => ({
      slug: c.slug,
      displayName: c.displayName,
      defaultSeed: c.seed,
      frozen: c.frozen ?? false,
      scaffolded: c.scaffolded ?? false,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function loadMusicianRegistryAtStartup(): MusicianComposerOption[] {
  registryLoadError = null;
  try {
    const registryPath = resolveMusicianRegistryPath();
    if (!fs.existsSync(registryPath)) {
      registryLoadError = `Registry file not found: ${registryPath}`;
      cachedComposers = [];
      return cachedComposers;
    }
    const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as MusicianRegistryFile;
    if (!Array.isArray(parsed.composers) || parsed.composers.length === 0) {
      registryLoadError = 'Registry composers array is empty or missing';
      cachedComposers = [];
      return cachedComposers;
    }
    cachedComposers = mapRegistryComposers(parsed.composers);
    if (cachedComposers.length === 0) {
      registryLoadError = 'Registry contained no valid composer entries';
    }
    return cachedComposers;
  } catch (err) {
    registryLoadError = err instanceof Error ? err.message : String(err);
    cachedComposers = [];
    return cachedComposers;
  }
}

export function getCachedMusicianComposers(): MusicianComposerOption[] {
  return cachedComposers;
}

function isValidSeed(seed: unknown): seed is number {
  return typeof seed === 'number' && Number.isInteger(seed) && seed >= 1 && seed <= 999_999_999;
}

function sendStatus(win: BrowserWindow | null, event: MusicianStatusEvent): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send('composer-os-musician:status', event);
  }
}

function failure(errorCode: MusicianErrorCode, message: string, detail?: string): MusicianGenerateResponse {
  return { ok: false, errorCode, message, ...(detail ? { detail } : {}) };
}

export type BuildMusicianApiGenerateBodyResult =
  | { ok: true; body: Record<string, unknown>; presetId: 'song_mode' | 'guitar_bass_duo' }
  | { ok: false; reason: 'invalid_total_bars' }
  | { ok: false; reason: 'invalid_progression'; error: string };

/** Pure apiGenerate payload from a validated MusicianGenerateRequest (no IPC / I/O). */
export function buildMusicianApiGenerateBody(
  request: MusicianGenerateRequest
): BuildMusicianApiGenerateBodyResult {
  const composerSlug = request.composerSlug;
  const seed = request.seed;
  const rawProgression =
    typeof request.chordProgressionText === 'string' ? request.chordProgressionText.trim() : '';
  const hasCustomProgression = rawProgression.length > 0;
  const songwriterStyle =
    typeof request.songwriterStyleId === 'string' && request.songwriterStyleId.trim()
      ? request.songwriterStyleId.trim()
      : composerSlug;

  if (!hasCustomProgression) {
    return {
      ok: true,
      presetId: 'song_mode',
      body: {
        presetId: 'song_mode',
        primarySongwriterStyle: composerSlug,
        seed,
        totalBars: 32,
        creativeControlLevel: composerSlug === 'bill_evans' ? 'stable' : 'balanced',
        outputLabel: composerSlug,
        ...(composerSlug === 'bill_evans' ? { musicianPremiumMelody: true } : {}),
      },
    };
  }

  const totalBars =
    typeof request.totalBars === 'number' && isAllowedSongFormBarCount(request.totalBars)
      ? request.totalBars
      : typeof request.totalBars === 'number'
        ? null
        : 32;
  if (totalBars === null) {
    return { ok: false, reason: 'invalid_total_bars' };
  }
  const padded = buildPaddedLockedProgressionText(rawProgression, totalBars);
  if (!padded.ok) {
    return { ok: false, reason: 'invalid_progression', error: padded.error };
  }

  return {
    ok: true,
    presetId: 'guitar_bass_duo',
    body: {
      presetId: 'guitar_bass_duo',
      styleStack: {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      primarySongwriterStyle: songwriterStyle,
      seed,
      totalBars,
      longFormEnabled: totalBars > 8,
      bandModeEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: padded.text,
      creativeControlLevel: composerSlug === 'bill_evans' ? 'stable' : 'balanced',
      outputLabel: composerSlug,
      ...(composerSlug === 'bill_evans' ? { musicianPremiumMelody: true } : {}),
    },
  };
}

export async function handleMusicianGenerate(
  raw: unknown,
  libraryRoot: string,
  getWindow: () => BrowserWindow | null
): Promise<MusicianGenerateResponse> {
  const win = getWindow();

  if (generateInFlight) {
    return failure('BUSY', 'Generation already in progress.');
  }

  if (cachedComposers.length === 0) {
    return failure(
      'REGISTRY_UNAVAILABLE',
      'Composer list failed to load. Restart the app.',
      registryLoadError ?? undefined
    );
  }

  const body = raw && typeof raw === 'object' ? (raw as MusicianGenerateRequest) : null;
  const composerSlug = typeof body?.composerSlug === 'string' ? body.composerSlug.trim() : '';
  const seed = body?.seed;

  if (!composerSlug || !isValidSeed(seed)) {
    return failure('INVALID_REQUEST', 'Enter a valid seed (1-999999999).');
  }

  const composer = cachedComposers.find((c) => c.slug === composerSlug);
  if (!composer) {
    return failure('UNKNOWN_COMPOSER', 'That composer is not available.');
  }

  generateInFlight = true;
  sendStatus(win, {
    phase: 'generating',
    composerSlug,
    seed,
    message: `Generating... (${composer.displayName}, seed ${seed})`,
  });

  try {
    const { apiGenerate, ensureOutputDirectoryForPreset, buildLabeledMusicXmlFilename } =
      loadDesktopIpcBundle();

    const built = buildMusicianApiGenerateBody({
      composerSlug,
      seed,
      chordProgressionText: body?.chordProgressionText,
      totalBars: body?.totalBars,
      songwriterStyleId: body?.songwriterStyleId,
    });
    if (!built.ok) {
      if (built.reason === 'invalid_total_bars') {
        return failure(
          'INVALID_REQUEST',
          `Choose a valid length: ${SONG_FORM_BAR_OPTIONS.join(', ')} bars.`
        );
      }
      return failure('INVALID_REQUEST', 'Could not read chord progression.', built.error);
    }
    const { body: apiGenerateBody, presetId } = built;

    ensureOutputDirectoryForPreset(presetId, libraryRoot);

    const result = apiGenerate(apiGenerateBody, libraryRoot);

    if (!result || (result as { success?: boolean }).success === false) {
      const errResult = result as { error?: string; detail?: string };
      const detail = errResult.detail ?? errResult.error ?? 'Unknown generation error';
      if (musicianDebug()) console.error('[musician] generation failed', detail);
      return failure('GENERATION_FAILED', 'Generation failed. Try another seed.', detail);
    }

    const gen = result as { success: boolean; filepath?: string; filename?: string; error?: string };
    if (!gen.success) {
      const detail = gen.error ?? 'Generation returned unsuccessful result';
      if (musicianDebug()) console.error('[musician] generation failed', detail);
      return failure('GENERATION_FAILED', 'Generation failed. Try another seed.', detail);
    }

    const expectedFilename = buildLabeledMusicXmlFilename(composerSlug, seed, gen.filename ?? `${composerSlug}_${seed}.musicxml`);
    let outputPath = gen.filepath?.trim() ?? '';

    if (!outputPath || !fs.existsSync(outputPath)) {
      const presetDir = ensureOutputDirectoryForPreset(presetId, libraryRoot);
      const candidate = path.join(presetDir, expectedFilename);
      if (fs.existsSync(candidate)) {
        outputPath = candidate;
      }
    }

    if (!outputPath || !fs.existsSync(outputPath)) {
      return failure(
        'WRITE_FAILED',
        'File could not be saved. Check disk space and try again.',
        `Expected file missing: ${expectedFilename}`
      );
    }

    const presetDir = ensureOutputDirectoryForPreset(presetId, libraryRoot);
    const normalizedPath = path.join(presetDir, expectedFilename);
    if (path.resolve(outputPath) !== path.resolve(normalizedPath)) {
      fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
      fs.copyFileSync(outputPath, normalizedPath);
      outputPath = normalizedPath;
    }

    const filename = path.basename(outputPath);

    const openErr = await shell.openPath(outputPath);
    if (openErr) {
      await shell.showItemInFolder(outputPath);
      sendStatus(win, {
        phase: 'idle',
        message: `Saved: ${filename} â€” Could not open automatically â€” file highlighted in folder.`,
      });
    } else {
      sendStatus(win, {
        phase: 'idle',
        message: `Saved: ${filename}`,
      });
    }

    return {
      ok: true,
      outputPath,
      filename,
      composerSlug,
      seed,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    if (musicianDebug()) console.error('[musician] engine crash', detail);
    return failure('ENGINE_CRASH', 'Something went wrong. Restart and try again.', detail);
  } finally {
    generateInFlight = false;
    const w = getWindow();
    if (w && !w.isDestroyed()) {
      sendStatus(w, { phase: 'idle', message: 'Ready' });
    }
  }
}

export function registerMusicianIpc(
  ipcMain: IpcMain,
  libraryRoot: string,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('composer-os-musician:generate', (_event, body: unknown) =>
    handleMusicianGenerate(body, libraryRoot, getWindow)
  );
}

export function emitMusicianReadyStatus(win: BrowserWindow | null): void {
  const composers = getCachedMusicianComposers();
  const message =
    composers.length === 0 ? 'Composer list unavailable' : 'Ready';
  sendStatus(win, { phase: 'ready', composers, message });
}

/** Test-only reset for in-flight guard between cases. */
export function resetMusicianGenerateInFlightForTests(): void {
  generateInFlight = false;
}

