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
} from '../../../engines/composer-os-v2/app-api/composerOsApiCore';

export function registerComposerOsIpc(ipcMain: IpcMain, outputDir: string): void {
  ipcMain.handle('composer-os-api:get-presets', () => apiGetPresets());
  ipcMain.handle('composer-os-api:get-style-modules', () => apiGetStyleModules());
  ipcMain.handle('composer-os-api:generate', (_e, body: unknown) =>
    Promise.resolve(apiGenerate(body as Partial<GenerateRequest>, outputDir))
  );
  ipcMain.handle('composer-os-api:get-outputs', () => apiListOutputs(outputDir));
  ipcMain.handle('composer-os-api:get-output-directory', () => apiGetOutputDirectory(outputDir));
  ipcMain.handle('composer-os-api:get-diagnostics', () => apiGetDiagnostics(outputDir, 0));
}
