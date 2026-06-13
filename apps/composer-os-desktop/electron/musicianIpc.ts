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

    ensureOutputDirectoryForPreset('song_mode', libraryRoot);

    const result = apiGenerate(
      {
        presetId: 'song_mode',
        primarySongwriterStyle: composerSlug,
        seed,
        totalBars: 32,
        creativeControlLevel: composerSlug === 'bill_evans' ? 'stable' : 'balanced',
        outputLabel: composerSlug,
        ...(composerSlug === 'bill_evans' ? { musicianPremiumMelody: true } : {}),
      },
      libraryRoot
    );

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
      const songModeDir = ensureOutputDirectoryForPreset('song_mode', libraryRoot);
      const candidate = path.join(songModeDir, expectedFilename);
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

    const songModeDir = ensureOutputDirectoryForPreset('song_mode', libraryRoot);
    const normalizedPath = path.join(songModeDir, expectedFilename);
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

