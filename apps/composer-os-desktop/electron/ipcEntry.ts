/**
 * Bundled separately (esbuild) — registers Composer OS API IPC; no HTTP server.
 */
import { app, type IpcMain } from 'electron';
import path from 'path';
import type { GenerateRequest } from '../../../engines/composer-os-v2/app-api/appApiTypes';
import {
  apiGetPresets,
  apiGetStyleModules,
  apiGenerate,
  apiListOutputs,
  apiGetOutputDirectory,
  apiGetDiagnostics,
  apiSystemCheck,
  getComposerOsRuntimeBuildInfo,
} from '../../../engines/composer-os-v2/app-api/composerOsApiCore';

export function registerComposerOsIpc(ipcMain: IpcMain, outputDir: string): void {
  ipcMain.handle('composer-os-api:get-presets', () => apiGetPresets());
  ipcMain.handle('composer-os-api:get-style-modules', () => apiGetStyleModules());
  ipcMain.handle('composer-os-api:get-runtime-build-info', () => getComposerOsRuntimeBuildInfo());
  ipcMain.handle('composer-os-api:generate', (_e, body: unknown) => {
    const prevIpc = process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON;
    try {
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
        app.getPath('documents'),
        'Cursor AI Projects',
        'creative-engines',
        'engines',
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
        custom_chords?: string | null;
        song_form?: string;
      }
    ) => {
      console.log('[CP] handler called, title:', body.title);
      const { execFile } = await import('child_process');
      const { writeFile, readFile, unlink } = await import('fs/promises');
      const os = await import('os');
      const crypto = await import('crypto');

      const cliPath = path.join(
        app.getPath('documents'),
        'Cursor AI Projects',
        'creative-engines',
        'engines',
        'charlie-parker-engine',
        'charlie_parker_cli.py'
      );

      const cc = body.custom_chords;
      const fallbackChords =
        'Fmaj7,Dm7,G7,Cmaj7,Am7,Dm7,G7,Cmaj7';
      const custom_chords =
        typeof cc === 'string' && cc.trim().length > 0
          ? cc.trim()
          : fallbackChords;

      const payload = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        song_form: body.song_form ?? 'aaba',
        custom_chords,
      });

      const tmpId = crypto.randomBytes(8).toString('hex');
      const tmpIn = path.join(os.tmpdir(), `cp_in_${tmpId}.json`);
      const tmpOut = path.join(os.tmpdir(), `cp_out_${tmpId}.musicxml`);

      await writeFile(tmpIn, payload, 'utf8');
      console.log('[CP] tmpIn written:', tmpIn);

      const pythonCmds = ['py', 'python', 'python3'];
      let lastError: unknown;
      let succeeded = false;

      for (const cmd of pythonCmds) {
        try {
          await new Promise<void>((resolve, reject) => {
            execFile(
              cmd,
              ['-u', cliPath, '--input-file', tmpIn, '--output-file', tmpOut],
              {
                timeout: 30000,
                env: { ...process.env, PYTHONUNBUFFERED: '1' },
              },
              (error, _stdout, stderr) => {
                if (error) {
                  reject(new Error(
                    `Parker CLI error: ${error.message} stderr=${stderr}`
                  ));
                } else {
                  resolve();
                }
              }
            );
          });
          console.log('[CP] execFile completed');
          succeeded = true;
          break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!succeeded) {
        try {
          await unlink(tmpIn);
        } catch {
          /* ignore */
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      }

      const xml = await readFile(tmpOut, 'utf8');
      console.log('[CP] tmpOut read, bytes:', xml.length);
      try {
        await unlink(tmpIn);
      } catch {
        /* ignore */
      }
      try {
        await unlink(tmpOut);
      } catch {
        /* ignore */
      }

      const safeTitle = (body.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const filename = `charlie_parker_${safeTitle}.musicxml`;
      const outPath = path.join(outputDir, filename);
      await writeFile(outPath, xml, 'utf8');

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
      }
    ) => {
      const { spawn } = await import('child_process');
      const { writeFile } = await import('fs/promises');

      const cliPath = path.join(
        app.getPath('documents'),
        'Cursor AI Projects',
        'creative-engines',
        'engines',
        'monk-engine',
        'monk_cli.py'
      );
      const input = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        mode: 'title',
        profile: 'balanced',
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
