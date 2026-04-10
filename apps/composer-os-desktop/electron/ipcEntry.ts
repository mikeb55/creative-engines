/**
 * Bundled separately (esbuild) — registers Composer OS API IPC; no HTTP server.
 */
import type { IpcMain } from 'electron';
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
  ipcMain.handle(
    'composer-os-api:generate-wayne-shorter',
    async (
      _event,
      body: {
        title: string;
        seed?: number;
        mode?: string;
        profile?: string;
      }
    ) => {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const { join } = await import('path');
      const { writeFile } = await import('fs/promises');
      const execFileAsync = promisify(execFile);

      const cliPath = join(
        __dirname,
        '../../../../engines/wayne-shorter-engine/wayne_shorter_cli.py'
      );
      const input = JSON.stringify({
        title: body.title,
        seed: body.seed ?? 42,
        mode: body.mode ?? 'title',
        profile: body.profile ?? 'balanced',
      });

      const { stdout } = await execFileAsync('py', [cliPath], {
        input,
        maxBuffer: 2 * 1024 * 1024,
      });

      const filename = `wayne_shorter_${Date.now()}.musicxml`;
      const outPath = join(outputDir, filename);
      await writeFile(outPath, stdout, 'utf8');

      return { path: outPath, filename };
    }
  );
}
