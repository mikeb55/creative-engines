/**
 * Bundled separately (esbuild) — registers Composer OS API IPC; no HTTP server.
 */
import { app, shell, type IpcMain } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'path';
import type { GenerateRequest } from '../../../engines/composer-os-v2/app-api/appApiTypes';
import {
  apiGetPresets,
  apiGetStyleModules,
  apiGenerate,
  apiListOutputs,
  apiGetOutputDirectory,
  apiGetDiagnostics,
  apiOpenOutputFolder,
  apiSystemCheck,
  apiPdfGenerateFromPdf,
  apiMelodicVariationPack,
  apiAnalyse,
  apiExportPdf,
  apiExportGuitarPro,
  type PdfGenerateFromPdfRequest,
  getComposerOsRuntimeBuildInfo,
} from '../../../engines/composer-os-v2/app-api/composerOsApiCore';
import {
  hydrateAnthropicKeyFromAllSources,
  saveAnthropicApiKeyToSecretStore,
} from './anthropicKeyHydration';
import { getOutputDir } from '../../composer-os-app/src/lib/outputPaths';
import { loadSessionFile, saveSessionFile } from '../../../engines/composer-os-v2/core/sessions/sessionStore';
import type { ComposerSessionV1 } from '../../../engines/composer-os-v2/core/sessions/sessionTypes';

function resolveEnginesRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'engines')
    : path.join(__dirname, '..', '..', 'engines');
}

export function registerComposerOsIpc(ipcMain: IpcMain, outputDir: string): void {
  ipcMain.handle(
    'composer-os:save-export-file',
    async (_e, body: unknown): Promise<{ ok: boolean; fullPath?: string; error?: string }> => {
      const b = body && typeof body === 'object' ? (body as { relativePath?: unknown; contents?: unknown }) : {};
      const relRaw = typeof b.relativePath === 'string' ? b.relativePath : '';
      const contents = typeof b.contents === 'string' ? b.contents : '';
      if (!relRaw.trim() || !contents) {
        return { ok: false, error: 'missing relativePath or contents' };
      }
      const normalized = relRaw.replace(/\\/g, '/').split('/').filter((seg) => seg.length > 0);
      if (normalized.some((seg) => seg === '..')) {
        return { ok: false, error: 'invalid path' };
      }
      const base = app.getPath('documents');
      const full = path.resolve(path.join(base, ...normalized));
      const docResolved = path.resolve(base);
      const relToDoc = path.relative(docResolved, full);
      if (relToDoc.startsWith('..') || path.isAbsolute(relToDoc)) {
        return { ok: false, error: 'path outside Documents' };
      }
      try {
        const { mkdir, writeFile } = await import('fs/promises');
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, contents, 'utf8');
        return { ok: true, fullPath: full };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
      }
    }
  );

  ipcMain.handle('composer-os:open-export-folder', async (_e, body: unknown) => {
    const eng =
      body && typeof body === 'object' && typeof (body as { engine?: unknown }).engine === 'string'
        ? (body as { engine: string }).engine
        : '';
    if (
      eng !== 'fela-kuti' &&
      eng !== 'greek' &&
      eng !== 'blended' &&
      eng !== 'brazilian' &&
      eng !== 'second-line' &&
      eng !== 'cuban'
    ) {
      return;
    }
    const relDir = getOutputDir(eng);
    const target = path.join(app.getPath('documents'), ...relDir.split(/[/\\]/));
    try {
      const fs = await import('fs/promises');
      await fs.mkdir(target, { recursive: true });
    } catch {
      /* still try to open */
    }
    await shell.openPath(target);
  });

  ipcMain.handle('composer-os-api:get-presets', () => apiGetPresets());
  ipcMain.handle('composer-os-api:get-style-modules', () => apiGetStyleModules());
  ipcMain.handle('composer-os-api:get-runtime-build-info', () => getComposerOsRuntimeBuildInfo());
  ipcMain.handle('composer-os:pick-audio-file', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'aiff', 'flac'] }],
    });
    if (result.canceled || !result.filePaths?.[0]) return { path: null };
    return { path: result.filePaths[0] };
  });

  ipcMain.handle('composer-os-api:pick-session-save-path', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'Composer Session', extensions: ['json'] }],
      defaultPath: 'martino-session.json',
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }
    let filepath = result.filePath;
    if (!filepath.toLowerCase().endsWith('.json')) {
      filepath = `${filepath}.json`;
    }
    return { ok: true, filepath };
  });

  ipcMain.handle('composer-os-api:pick-session-load-path', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Composer Session', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths?.[0]) {
      return { ok: false, canceled: true };
    }
    return { ok: true, filepath: result.filePaths[0] };
  });

  ipcMain.handle('composer-os-api:save-session', (_event, body: unknown) => {
    const b =
      body && typeof body === 'object'
        ? (body as { filepath?: unknown; session?: unknown })
        : {};
    const filepath = typeof b.filepath === 'string' ? b.filepath.trim() : '';
    const session = b.session as ComposerSessionV1 | undefined;
    if (!filepath || !session) {
      return { ok: false, error: 'missing filepath or session' };
    }
    return saveSessionFile(filepath, session);
  });

  ipcMain.handle('composer-os-api:load-session', (_event, body: unknown) => {
    const filepath =
      body && typeof body === 'object' && typeof (body as { filepath?: unknown }).filepath === 'string'
        ? (body as { filepath: string }).filepath.trim()
        : '';
    if (!filepath) {
      return { ok: false, errors: ['missing filepath'] };
    }
    return loadSessionFile(filepath);
  });

  ipcMain.handle('composer-os-api:read-file', async (_event, body: unknown) => {
    const pathRaw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path
        : '';
    if (!pathRaw.trim()) {
      throw new Error('composer-os-api:read-file: missing path');
    }
    return readFile(pathRaw, 'utf-8');
  });
  ipcMain.handle('composer-os-api:melodic-variation-pack', (_e, body: unknown) =>
    Promise.resolve(apiMelodicVariationPack(body as Parameters<typeof apiMelodicVariationPack>[0]))
  );
  ipcMain.handle('composer-os-api:generate', (_e, body: unknown) => {
    const prevIpc = process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON;
    try {
      const rec = body as Record<string, unknown>;
      if (typeof rec.__generateCorrelationId === 'string') {
        console.log('[GEN-CORR] ipc composer-os-api:generate received', {
          corr: rec.__generateCorrelationId,
          alternateGuitarTuning: rec.alternateGuitarTuning,
        });
      }
      if (process.env.COMPOSER_OS_TRUTH_DUMP === '1') {
        process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON = JSON.stringify(body);
        console.log('[composer-os truth] ipc generate payload', JSON.stringify(body, null, 2));
      }
      return Promise.resolve(apiGenerate(body as Partial<GenerateRequest>, outputDir));
    } finally {
      if (prevIpc !== undefined) process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON = prevIpc;
      else delete process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON;
    }
  });
  ipcMain.handle('composer-os-api:get-outputs', () => apiListOutputs(outputDir));
  ipcMain.handle('composer-os-api:get-output-directory', () => apiGetOutputDirectory(outputDir));
  ipcMain.handle('composer-os-api:get-diagnostics', () => apiGetDiagnostics(outputDir, 0));
  ipcMain.handle('composer-os-api:run-system-check', () => apiSystemCheck());
  ipcMain.handle('composer-os-api:pdf-generate-from-pdf', (_e, body: unknown) => {
    hydrateAnthropicKeyFromAllSources();
    return apiPdfGenerateFromPdf(body as PdfGenerateFromPdfRequest);
  });
  ipcMain.handle('composer-os-api:analyse', (_e, body: unknown) =>
    Promise.resolve(apiAnalyse(body as Parameters<typeof apiAnalyse>[0]))
  );
  ipcMain.handle('composer-os-api:export-pdf', (_e, body: unknown) =>
    apiExportPdf(body as Parameters<typeof apiExportPdf>[0])
  );
  ipcMain.handle('composer-os-api:export-guitar-pro', (_e, body: unknown) =>
    apiExportGuitarPro(body as Parameters<typeof apiExportGuitarPro>[0])
  );
  ipcMain.handle(
    'composer-os-api:save-anthropic-api-key',
    (_e, body: unknown) => {
      const k =
        body && typeof body === 'object' && typeof (body as { apiKey?: unknown }).apiKey === 'string'
          ? (body as { apiKey: string }).apiKey
          : '';
      return saveAnthropicApiKeyToSecretStore(k);
    }
  );
  ipcMain.handle('composer-os-api:open-output-folder', (_e, body: unknown) => {
    const b = body && typeof body === 'object' ? (body as { path?: string }) : {};
    console.log('[OPEN-FOLDER] ipc composer-os-api:open-output-folder', { path: b.path });
    return apiOpenOutputFolder(outputDir, b);
  });
  ipcMain.handle('composer-os-api:open-midi-file', async (_event, body: unknown) => {
    const pathRaw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path.trim()
        : '';
    if (!pathRaw) return;
    await shell.showItemInFolder(pathRaw);
  });
  console.log('[ipcEntry] registering generate-wayne-shorter');
  ipcMain.handle(
    'composer-os-api:generate-wayne-shorter',
    async (
      _event,
      body: {
        title: string;
        seed?: number;
        mode?: string;
        profile?: string;
        custom_chords?: string | null;
        song_form?: string;
      }
    ) => {
      const { spawn } = await import('child_process');
      const { writeFile } = await import('fs/promises');

      const cliPath = path.join(
        resolveEnginesRoot(),
        'wayne-shorter-engine',
        'wayne_shorter_cli.py'
      );
      const cc = body.custom_chords;
      const custom_chords =
        typeof cc === 'string' && cc.trim().length > 0 ? cc.trim() : undefined;
      const input = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        mode: body.mode ?? 'title',
        profile: body.profile ?? 'balanced',
        ...(custom_chords != null ? { custom_chords: custom_chords } : {}),
        song_form: body.song_form ?? 'aaba',
      });

      const pythonCmds = ['py', 'python', 'python3'];
      let stdout: string | undefined;
      let lastError: unknown;
      for (const cmd of pythonCmds) {
        try {
          stdout = await new Promise<string>((resolve, reject) => {
            const child = spawn(cmd, [cliPath], {
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            let out = '';
            let err = '';
            child.stdout.on('data', (d: Buffer) => {
              out += d.toString();
            });
            child.stderr.on('data', (d: Buffer) => {
              err += d.toString();
            });
            child.on('close', (code: number | null) => {
              if (code === 0) resolve(out);
              else reject(new Error(err || `exit code ${code}`));
            });
            child.on('error', reject);
            child.stdin.write(input);
            child.stdin.end();
          });
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (stdout === undefined) {
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      }

      const safeTitle = (body.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const filename = `wayne_shorter_${safeTitle}.musicxml`;
      const outPath = path.join(outputDir, filename);
      await writeFile(outPath, stdout, 'utf8');

      return { path: outPath, filename };
    }
  );

  console.log('[ipcEntry] registering generate-charlie-parker');
  ipcMain.handle(
    'composer-os-api:generate-charlie-parker',
    async (
      _event,
      body: {
        title: string;
        seed?: number;
        mode?: string;
        profile?: string;
        custom_chords?: string | null;
        song_form?: string;
      }
    ) => {
      const { spawn } = await import('child_process');
      const { writeFile } = await import('fs/promises');

      const cliPath = path.join(
        resolveEnginesRoot(),
        'charlie-parker-engine',
        'charlie_parker_cli.py'
      );
      const cc = body.custom_chords;
      const custom_chords =
        typeof cc === 'string' && cc.trim().length > 0 ? cc.trim() : undefined;
      const input = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        mode: body.mode ?? 'title',
        profile: body.profile ?? 'balanced',
        ...(custom_chords != null ? { custom_chords: custom_chords } : {}),
        song_form: body.song_form ?? 'aaba',
      });

      const pythonCmds = ['py', 'python', 'python3'];
      let stdout: string | undefined;
      let lastError: unknown;
      for (const cmd of pythonCmds) {
        try {
          stdout = await new Promise<string>((resolve, reject) => {
            console.log('[CP] spawning, input length:', input.length);
            const child = spawn(cmd, [cliPath], {
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            let out = '';
            let err = '';
            child.stdout.on('data', (d: Buffer) => {
              out += d.toString();
            });
            child.stderr.on('data', (d: Buffer) => {
              err += d.toString();
            });
            child.on('close', (code: number | null) => {
              console.log('[CP] close fired, code:', code);
              if (code === 0) resolve(out);
              else reject(new Error(err || `exit code ${code}`));
            });
            child.on('error', reject);
            child.stdin.on('error', (e: Error) => {
              console.error('[CP] stdin error:', e);
            });
            child.stdin.write(input, (writeErr) => {
              if (writeErr) console.error('[CP] stdin write error:', writeErr);
            });
            child.stdin.end();
          });
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (stdout === undefined) {
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      }

      const safeTitle = (body.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const filename = `charlie_parker_${safeTitle}.musicxml`;
      const outPath = path.join(outputDir, filename);
      await writeFile(outPath, stdout, 'utf8');

      return { path: outPath, filename };
    }
  );

  ipcMain.handle(
    'composer-os-api:generate-monk',
    async (
      _event,
      body: {
        title: string;
        seed?: number;
        custom_chords?: string | null;
        song_form?: string;
      }
    ) => {
      const { spawn } = await import('child_process');
      const { writeFile } = await import('fs/promises');

      const cliPath = path.join(
        resolveEnginesRoot(),
        'monk-engine',
        'monk_engine_cli.py'
      );
      const cc = body.custom_chords;
      const custom_chords =
        typeof cc === 'string' && cc.trim().length > 0 ? cc.trim() : undefined;
      const input = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        ...(custom_chords != null ? { custom_chords: custom_chords } : {}),
        ...(body.song_form != null && String(body.song_form).trim().length > 0
          ? { song_form: String(body.song_form).trim() }
          : {}),
      });
      const pythonCmds = ['py', 'python', 'python3'];
      let stdout = '';
      let lastErr: Error | null = null;
      for (const cmd of pythonCmds) {
        try {
          stdout = await new Promise<string>((resolve, reject) => {
            const child = spawn(cmd, [cliPath], {
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            let out = '';
            let err = '';
            child.stdout.on('data', (d: Buffer) => {
              out += d.toString();
            });
            child.stderr.on('data', (d: Buffer) => {
              err += d.toString();
            });
            child.on('close', (code: number | null) => {
              if (code === 0) resolve(out);
              else reject(new Error(err || `exit code ${code}`));
            });
            child.on('error', reject);
            child.stdin.write(input);
            child.stdin.end();
          });
          lastErr = null;
          break;
        } catch (e: unknown) {
          const err = e instanceof Error ? e : new Error(String(e));
          lastErr = err;
          const msg = err.message ?? '';
          if (!msg.includes('ENOENT')) throw err;
        }
      }
      if (lastErr) {
        throw new Error(`Python not found. Tried: ${pythonCmds.join(', ')}`);
      }

      const safeTitle = (body.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const filename = `monk_${safeTitle}.musicxml`;
      const outPath = path.join(outputDir, filename);
      await writeFile(outPath, stdout, 'utf8');
      return { path: outPath, filename };
    }
  );

  ipcMain.handle('martino:generate', async (_event, tuneConfig: unknown) => {
    const { callMartinoEngine } = await import(
      '../../../engines/composer-os-v2/core/martino/martinoEngineBridge'
    );
    const cfg =
      tuneConfig && typeof tuneConfig === 'object' && !Array.isArray(tuneConfig)
        ? (tuneConfig as Record<string, unknown>)
        : {};
    return callMartinoEngine(cfg);
  });

  ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
    if (!filePath) return { ok: false, error: 'no path' };
    const normalized = require('path').normalize(filePath);
    if (!require('fs').existsSync(normalized)) {
      return { ok: false, error: 'path not found' };
    }
    const { spawn } = require('child_process');
    const winPath = normalized.replace(/\//g, '\\');
    const child = spawn(
      'explorer.exe',
      ['/select,', winPath],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();
    return { ok: true };
  });
}
