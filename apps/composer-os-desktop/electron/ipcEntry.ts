/**
 * Bundled separately (esbuild) — registers Composer OS API IPC; no HTTP server.
 */
import { app, shell, type IpcMain } from 'electron';
import { documentsSaveBase, loadDesktopChannel } from './desktopChannel';
import { testRootWriteError } from './devTestIsolation';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'path';
import type { GenerateRequest } from '../../../engines/composer-os-v2/app-api/appApiTypes';
import {
  apiGetPresets,
  apiGetStyleModules,
  apiGetRiffPhraseCorpus,
  apiGenerate,
  apiListOutputs,
  apiGetOutputDirectory,
  apiGetDiagnostics,
  apiSystemCheck,
  apiPdfGenerateFromPdf,
  apiMelodicVariationPack,
  apiAnalyse,
  apiExportPdf,
  apiExportGuitarPro,
  apiGenerateComping,
  type PdfGenerateFromPdfRequest,
  getComposerOsRuntimeBuildInfo,
} from '../../../engines/composer-os-v2/app-api/composerOsApiCore';
import { apiHarmonyLab, apiOrchestrate } from '../../../engines/composer-os-v2/app-api/orchestrateApp';
import {
  apiLongLinePractice,
  apiLongLinePracticeProbe,
} from '../../../engines/composer-os-v2/app-api/longLinePracticeApp';
import {
  apiBhlCandidates,
  apiBhlCatalog,
  apiBhlCompare,
  apiBhlCompose,
  apiBhlDefaults,
  apiBhlExport,
  apiBhlInspect,
  apiBhlOpen,
  apiBhlOpenProject,
  apiBhlRefine,
  apiBhlSaveProject,
  apiBhlScratch,
} from '../../../engines/composer-os-v2/app-api/bhlApp';
import { apiCompareMusicalScores, apiCreateHumanReview, apiEvaluateMusicalScore, apiOpenHumanReview, apiSaveHumanReview } from '../../../engines/composer-os-v2/app-api/evaluationApp';
import { apiDevelopCoherence, apiDevelopDiscover, apiDevelopVoice } from '../../../engines/composer-os-v2/app-api/developApp';
import { apiPentatonicOpenProject, apiPentatonicSaveProject } from '../../../engines/composer-os-v2/app-api/pentatonicProjectApp';
import {
  apiHexatonicOpenLaboratoryReview,
  apiHexatonicOpenProject,
  apiHexatonicSaveLaboratoryReview,
  apiHexatonicSaveProject,
} from '../../../engines/composer-os-v2/app-api/hexatonicProjectApp';
import { writePentatonicDesktopMusicXml } from './pentatonicDesktopExport';
import { writeHexatonicDesktopMusicXml } from './hexatonicDesktopExport';
import { openOutputFolderRoute } from '../../../scripts/openOutputFolderRoute';
import { persistPianoComposition } from '../../../engines/composer-os-v2/app-api/pianoCompositionPersist';
import {
  hydrateAnthropicKeyFromAllSources,
  saveAnthropicApiKeyToSecretStore,
} from './anthropicKeyHydration';
import { getOutputDir } from '../../composer-os-app/src/lib/outputPaths';
import { loadSessionFile, saveSessionFile } from '../../../engines/composer-os-v2/core/sessions/sessionStore';
import type { ComposerSessionV1 } from '../../../engines/composer-os-v2/core/sessions/sessionTypes';
import {
  apiRunLeadSheetFileInput,
  LEADSHEET_FILE_INPUT_COMPOSERS,
  type LeadSheetFileInputComposerId,
  type LeadSheetFileInputRequest,
} from '../../../engines/composer-os-v2/app-api/runLeadSheetFileInputApi';
import {
  PAIRING_ENABLEMENT_OVERRIDES_FILENAME,
  configurePairingOverrideStorePath,
  getPairingOverride,
  setPairingOverride,
} from '../../../engines/composer-os-v2/core/riff-generator/pairingEnablementOverrides';

function resolveEnginesRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'engines')
    : path.join(__dirname, '..', '..', 'engines');
}

import { V8_SESSION_DIR } from '../../../engines/composer-os-v2/core/wwh/wwhV8Session';

/** Performance Composer RESPOND runs: Documents/Composer OS Exports/Performance Composer/RESPOND/<run>/ */
function performanceComposerRespondRoot(): string {
  return path.resolve(app.getPath('documents'), 'Composer OS Exports', 'Performance Composer', 'RESPOND');
}

/** Performance Composer TRITONE PAIR runs: Documents/Composer OS Exports/Performance Composer/TRITONE PAIR/<run>/ */
function performanceComposerTritonePairRoot(): string {
  return path.resolve(app.getPath('documents'), 'Composer OS Exports', 'Performance Composer', 'TRITONE PAIR');
}

/** Build identity of the running app, from its build stamp. Never invented. */
function runningBuildForProvenance(): { buildCommit: string; ipcBundleSha256: string; stampMatchesLiveIpc: string } {
  let buildCommit = '';
  try {
    const stamp = JSON.parse(process.env.COMPOSER_OS_BUILD_STAMP_JSON ?? '{}') as { gitCommit?: string | null };
    buildCommit = typeof stamp.gitCommit === 'string' ? stamp.gitCommit : '';
  } catch {
    buildCommit = '';
  }
  return {
    buildCommit,
    ipcBundleSha256: process.env.COMPOSER_OS_IPC_BUNDLE_SHA256 ?? '',
    stampMatchesLiveIpc: process.env.COMPOSER_OS_STAMP_IPC_MATCH ?? 'unknown',
  };
}

function sessionMusicXmlPath(body: unknown): { path: string } | { error: string } {
  const raw =
    body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
      ? (body as { path: string }).path.trim()
      : '';
  if (!raw || raw.includes('\0')) return { error: 'Missing MusicXML path.' };
  const resolved = path.resolve(raw);
  const inside = (root: string) => {
    const relative = path.relative(path.resolve(root), resolved);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  };
  if (!(inside(V8_SESSION_DIR) || inside(performanceComposerRespondRoot()) || inside(performanceComposerTritonePairRoot())) || !resolved.endsWith('.musicxml') || !existsSync(resolved)) {
    return { error: 'That file is not a Performance Composer session MusicXML.' };
  }
  return { path: resolved };
}

export function registerComposerOsIpc(ipcMain: IpcMain, outputDir: string): void {
  // User-override layer for riff style-pairing enablement (Phase 2 prerequisite).
  configurePairingOverrideStorePath(
    path.join(app.getPath('userData'), PAIRING_ENABLEMENT_OVERRIDES_FILENAME)
  );

  ipcMain.handle(
    'composer-os:get-pairing-override',
    (_e, body: unknown): { id: string; value: boolean | undefined } => {
      const id =
        body && typeof body === 'object' && typeof (body as { id?: unknown }).id === 'string'
          ? (body as { id: string }).id.trim()
          : '';
      if (!id) return { id: '', value: undefined };
      return { id, value: getPairingOverride(id) };
    }
  );

  ipcMain.handle(
    'composer-os:set-pairing-override',
    (
      _e,
      body: unknown
    ): { ok: boolean; id: string; value: boolean | undefined; error?: string } => {
      const b = body && typeof body === 'object' ? (body as { id?: unknown; value?: unknown }) : {};
      const id = typeof b.id === 'string' ? b.id.trim() : '';
      if (!id) return { ok: false, id: '', value: undefined, error: 'missing id' };
      let value: boolean | undefined;
      if (b.value === undefined || b.value === null) value = undefined;
      else if (typeof b.value === 'boolean') value = b.value;
      else return { ok: false, id, value: undefined, error: 'value must be boolean | undefined' };
      setPairingOverride(id, value);
      return { ok: true, id, value: getPairingOverride(id) };
    }
  );

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
      const base = documentsSaveBase(app.getPath('documents'), loadDesktopChannel());
      const full = path.resolve(path.join(base, ...normalized));
      const docResolved = path.resolve(base);
      const relToDoc = path.relative(docResolved, full);
      if (relToDoc.startsWith('..') || path.isAbsolute(relToDoc)) {
        return { ok: false, error: 'path outside Documents' };
      }
      const blocked = testRootWriteError(full);
      if (blocked) return { ok: false, error: blocked };
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
    const blocked = testRootWriteError(target);
    if (blocked) return;
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
  ipcMain.handle('composer-os-api:get-riff-phrase-corpus', () => apiGetRiffPhraseCorpus());
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

  ipcMain.handle('composer-os-api:pick-leadsheet-file', async (_event, body: unknown) => {
    const { dialog } = await import('electron');
    const defaultPathRaw =
      body && typeof body === 'object' && typeof (body as { defaultPath?: unknown }).defaultPath === 'string'
        ? (body as { defaultPath: string }).defaultPath.trim()
        : '';
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      defaultPath: defaultPathRaw || outputDir,
      filters: [{ name: 'MusicXML or MIDI leadsheet', extensions: ['musicxml', 'xml', 'mid', 'midi'] }],
    });
    if (result.canceled || !result.filePaths?.[0]) {
      return { ok: false, canceled: true as const };
    }
    return { ok: true as const, filepath: result.filePaths[0] };
  });

  ipcMain.handle('composer-os-api:run-leadsheet-file-input', (_event, body: unknown) => {
    const b =
      body && typeof body === 'object'
        ? (body as Partial<LeadSheetFileInputRequest>)
        : ({} as Partial<LeadSheetFileInputRequest>);
    const filePath = typeof b.filePath === 'string' ? b.filePath.trim() : '';
    const rawComposerId = b.composerId;
    const composerId: LeadSheetFileInputComposerId =
      typeof rawComposerId === 'string' &&
      (LEADSHEET_FILE_INPUT_COMPOSERS as readonly string[]).includes(rawComposerId)
        ? (rawComposerId as LeadSheetFileInputComposerId)
        : 'debussy';
    const seed = typeof b.seed === 'number' && Number.isFinite(b.seed) ? b.seed : undefined;
    const rhythmicActivity =
      typeof b.rhythmicActivity === 'number' && Number.isFinite(b.rhythmicActivity)
        ? b.rhythmicActivity
        : undefined;
    const guitarCompDensity =
      typeof b.guitarCompDensity === 'number' && Number.isFinite(b.guitarCompDensity)
        ? b.guitarCompDensity
        : undefined;
    const harmonyOverridesByBar =
      b.harmonyOverridesByBar && typeof b.harmonyOverridesByBar === 'object'
        ? (b.harmonyOverridesByBar as LeadSheetFileInputRequest['harmonyOverridesByBar'])
        : undefined;
    const outputLabel = typeof b.outputLabel === 'string' ? b.outputLabel : undefined;
    return apiRunLeadSheetFileInput(
      { filePath, composerId, seed, rhythmicActivity, guitarCompDensity, harmonyOverridesByBar, outputLabel },
      outputDir
    );
  });

  ipcMain.handle('composer-os-api:pick-mosaic-import-file', async (_event, body: unknown) => {
    const { dialog } = await import('electron');
    const defaultPathRaw =
      body && typeof body === 'object' && typeof (body as { defaultPath?: unknown }).defaultPath === 'string'
        ? (body as { defaultPath: string }).defaultPath.trim()
        : '';
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      defaultPath: defaultPathRaw || outputDir,
      filters: [
        { name: 'Music files', extensions: ['mid', 'midi', 'musicxml', 'mxl', 'xml'] },
      ],
    });
    if (result.canceled || !result.filePaths?.[0]) {
      return { ok: false, canceled: true as const };
    }
    return { ok: true as const, filepath: result.filePaths[0] };
  });

  ipcMain.handle('composer-os-api:read-file-binary', async (_event, body: unknown) => {
    const pathRaw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path.trim()
        : '';
    if (!pathRaw) {
      throw new Error('composer-os-api:read-file-binary: missing path');
    }
    const buf = await readFile(pathRaw);
    return { base64: buf.toString('base64'), fileName: path.basename(pathRaw) };
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
    const blocked = testRootWriteError(filepath);
    if (blocked) return { ok: false, error: blocked };
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
  ipcMain.handle('composer-os-api:compose-piano', (_e, body: unknown) =>
    Promise.resolve(persistPianoComposition(body, outputDir))
  );
  ipcMain.handle('composer-os-api:harmony-lab', (_e, body: unknown) =>
    Promise.resolve(apiHarmonyLab(body))
  );
  ipcMain.handle('composer-os-api:long-line-practice-probe', (_e, body: unknown) =>
    Promise.resolve(apiLongLinePracticeProbe(body))
  );
  ipcMain.handle('composer-os-api:long-line-practice', (_e, body: unknown) =>
    Promise.resolve(apiLongLinePractice(body))
  );
  ipcMain.handle('composer-os-api:piano-chamber', (_e, body: unknown) =>
    Promise.resolve(apiOrchestrate(body))
  );
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
  ipcMain.handle('composer-os-api:bhl-defaults', () => apiBhlDefaults());
  ipcMain.handle('composer-os-api:bhl-inspect', (_e, body: unknown) => apiBhlInspect(body));
  ipcMain.handle('composer-os-api:bhl-compose', (_e, body: unknown) => apiBhlCompose(body));
  ipcMain.handle('composer-os-api:bhl-export', (_e, body: unknown) => apiBhlExport(body));
  ipcMain.handle('composer-os-api:bhl-open', (_e, body: unknown) => apiBhlOpen(body));
  ipcMain.handle('composer-os-api:bhl-catalog', () => apiBhlCatalog());
  ipcMain.handle('composer-os-api:bhl-candidates', (_e, body: unknown) => apiBhlCandidates(body));
  ipcMain.handle('composer-os-api:bhl-refine', (_e, body: unknown) => apiBhlRefine(body));
  ipcMain.handle('composer-os-api:bhl-compare', (_e, body: unknown) => apiBhlCompare(body));
  ipcMain.handle('composer-os-api:bhl-project-save', (_e, body: unknown) => apiBhlSaveProject(body));
  ipcMain.handle('composer-os-api:bhl-project-open', (_e, body: unknown) => apiBhlOpenProject(body));
  ipcMain.handle('composer-os-api:pentatonic-project-save', (_e, body: unknown) => apiPentatonicSaveProject(body));
  ipcMain.handle('composer-os-api:pentatonic-project-open', (_e, body: unknown) => apiPentatonicOpenProject(body));
  ipcMain.handle('composer-os-api:hexatonic-project-save', (_e, body: unknown) => apiHexatonicSaveProject(body));
  ipcMain.handle('composer-os-api:hexatonic-project-open', (_e, body: unknown) => apiHexatonicOpenProject(body));
  ipcMain.handle('composer-os-api:hexatonic-laboratory-save', (_e, body: unknown) => apiHexatonicSaveLaboratoryReview(body));
  ipcMain.handle('composer-os-api:hexatonic-laboratory-open', (_e, body: unknown) => apiHexatonicOpenLaboratoryReview(body));
  ipcMain.handle('composer-os-api:bhl-scratch', (_e, body: unknown) => apiBhlScratch(body));
  ipcMain.handle('composer-os-api:evaluation-score', (_e, body: unknown) => apiEvaluateMusicalScore(body));
  ipcMain.handle('composer-os-api:develop-discover', (_e, body: unknown) => apiDevelopDiscover(body));
  ipcMain.handle('composer-os-api:develop-voice', (_e, body: unknown) => apiDevelopVoice(body));
  ipcMain.handle('composer-os-api:develop-coherence', (_e, body: unknown) => apiDevelopCoherence(body));
  ipcMain.handle('composer-os-api:evaluation-compare', (_e, body: unknown) => apiCompareMusicalScores(body));
  ipcMain.handle('composer-os-api:evaluation-review-create', (_e, body: unknown) => apiCreateHumanReview(body));
  ipcMain.handle('composer-os-api:evaluation-review-save', (_e, body: unknown) => apiSaveHumanReview(body));
  ipcMain.handle('composer-os-api:evaluation-review-open', (_e, body: unknown) => apiOpenHumanReview(body));
  ipcMain.handle('composer-os-api:generate-comping', (_e, body: unknown) =>
    Promise.resolve(apiGenerateComping(body as Parameters<typeof apiGenerateComping>[0]))
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
    return openOutputFolderRoute(outputDir, b);
  });
  ipcMain.handle('composer-os-api:open-midi-file', async (_event, body: unknown) => {
    const pathRaw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path.trim()
        : '';
    if (!pathRaw) return;
    await shell.showItemInFolder(pathRaw);
  });
  ipcMain.handle('composer-os-api:open-file-default-app', async (_event, filePath: unknown) => {
    const pathRaw = typeof filePath === 'string' ? filePath.trim() : '';
    if (!pathRaw) return { ok: false, error: 'Missing file path' };
    const normalized = path.normalize(pathRaw);
    if (!existsSync(normalized)) return { ok: false, error: `File not found: ${normalized}` };
    const error = await shell.openPath(normalized);
    return { ok: error === '', error: error || undefined };
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
      const blocked = testRootWriteError(outPath);
      if (blocked) throw new Error(blocked);
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
      const blocked = testRootWriteError(outPath);
      if (blocked) throw new Error(blocked);
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
      const blocked = testRootWriteError(outPath);
      if (blocked) throw new Error(blocked);
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

  ipcMain.handle('composer-os-api:wwh-v8-advise', async (_event, body: unknown) => {
    try {
      const { adviseBlackAuraPair } = await import('../../../engines/composer-os-v2/core/wwh/wwhV8Session');
      const record = body && typeof body === 'object' ? (body as { resolution?: { rootSpelling?: unknown; quality?: unknown }; tension?: { rootSpelling?: unknown; quality?: unknown } }) : {};
      const resolution = record.resolution;
      const tension = record.tension;
      if (!resolution || !tension || typeof resolution.rootSpelling !== 'string' || typeof tension.rootSpelling !== 'string') {
        return { ok: false as const, error: 'Enter a root spelling and a quality for both parents.' };
      }
      const advice = adviseBlackAuraPair(
        { rootSpelling: resolution.rootSpelling, quality: resolution.quality as 'major' },
        { rootSpelling: tension.rootSpelling, quality: tension.quality as 'major' }
      );
      return { ok: true as const, advice };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:wwh-v8-generate', async (_event, body: unknown) => {
    try {
      const { generateWwhV8Session } = await import('../../../engines/composer-os-v2/core/wwh/wwhV8Session');
      const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      const pairRaw = record.pair;
      const pair =
        pairRaw && typeof pairRaw === 'object'
          ? (pairRaw as { resolution?: { rootSpelling?: unknown; quality?: unknown }; tension?: { rootSpelling?: unknown; quality?: unknown } })
          : undefined;
      const result = generateWwhV8Session({
        piece: String(record.piece ?? ''),
        approach: record.approach as 'lyrical',
        seed: typeof record.seed === 'number' ? record.seed : Number.NaN,
        pair:
          pair && pair.resolution && pair.tension && typeof pair.resolution.rootSpelling === 'string' && typeof pair.tension.rootSpelling === 'string'
            ? {
                resolution: { rootSpelling: pair.resolution.rootSpelling, quality: pair.resolution.quality as 'major' },
                tension: { rootSpelling: pair.tension.rootSpelling, quality: pair.tension.quality as 'major' },
              }
            : undefined,
      });
      return result;
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:pc-respond', async () => {
    try {
      const { dialog } = await import('electron');
      const picked = await dialog.showOpenDialog({
        title: 'Respond — choose a MusicXML score',
        properties: ['openFile'],
        filters: [{ name: 'MusicXML', extensions: ['musicxml', 'xml'] }],
      });
      if (picked.canceled || !picked.filePaths?.[0]) return { ok: false as const, canceled: true as const };
      const { runRespondSession } = await import('../../../engines/composer-os-v2/core/performance-composer/pcRespondSession');
      const respondRoot = performanceComposerRespondRoot();
      const respondBlocked = testRootWriteError(respondRoot);
      if (respondBlocked) return { ok: false as const, error: respondBlocked };
      const result = runRespondSession({
        sourcePath: picked.filePaths[0],
        outRoot: respondRoot,
        build: runningBuildForProvenance(),
      });
      // Plain-named copies of this run on the Desktop (replaces the previous run's copies only).
      const { copyFileSync, mkdirSync, readdirSync, unlinkSync } = await import('node:fs');
      const latest = path.join(app.getPath('desktop'), 'RESPOND LATEST');
      const latestBlocked = testRootWriteError(latest);
      if (latestBlocked) return { ok: false as const, error: latestBlocked };
      mkdirSync(latest, { recursive: true });
      for (const f of readdirSync(latest)) if (f.endsWith('.musicxml')) unlinkSync(path.join(latest, f));
      const piece = result.sourceFile
        .replace(/\.(musicxml|xml)$/i, '')
        .replace(/^\d+[-_ ]*/, '')
        .replace(/[-_ ]*Duo[-_ ]*Leadsheet.*$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      for (const alt of result.alternatives) {
        copyFileSync(alt.musicXmlPath, path.join(latest, `${piece} ${alt.label.replace(' · ', ' ')}.musicxml`));
      }
      return { ...result, latestFolder: latest };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:pc-tritone-pair', async (_event, body: unknown) => {
    try {
      const { dialog } = await import('electron');
      const picked = await dialog.showOpenDialog({
        title: 'Tritone Pair — choose a guitar + bass MusicXML score',
        properties: ['openFile'],
        filters: [{ name: 'MusicXML', extensions: ['musicxml', 'xml'] }],
      });
      if (picked.canceled || !picked.filePaths?.[0]) return { ok: false as const, canceled: true as const };
      const rawSeed = body && typeof body === 'object' ? (body as { seed?: unknown }).seed : undefined;
      const seed = typeof rawSeed === 'number' && Number.isFinite(rawSeed) ? rawSeed : undefined;
      const { runTritonePairSession } = await import('../../../engines/composer-os-v2/core/performance-composer/pcTritonePairSession');
      const tritoneRoot = performanceComposerTritonePairRoot();
      const tritoneBlocked = testRootWriteError(tritoneRoot);
      if (tritoneBlocked) return { ok: false as const, error: tritoneBlocked };
      const result = runTritonePairSession({
        sourcePath: picked.filePaths[0],
        outRoot: tritoneRoot,
        build: runningBuildForProvenance(),
        seed,
      });
      // Plain-named copies on the Desktop (replaces the previous Tritone Pair copies only).
      const { copyFileSync, mkdirSync, readdirSync, unlinkSync } = await import('node:fs');
      const latest = path.join(app.getPath('desktop'), 'TRITONE PAIR LATEST');
      const latestBlocked = testRootWriteError(latest);
      if (latestBlocked) return { ok: false as const, error: latestBlocked };
      mkdirSync(latest, { recursive: true });
      for (const f of readdirSync(latest)) if (f.endsWith('.musicxml') || f.endsWith('.md')) unlinkSync(path.join(latest, f));
      copyFileSync(result.musicXmlPath, path.join(latest, path.basename(result.musicXmlPath)));
      copyFileSync(result.fieldMapPath, path.join(latest, path.basename(result.fieldMapPath)));
      return { ...result, latestFolder: latest };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:wwh-v8-open-musescore', async (_event, body: unknown) => {
    const filePath = sessionMusicXmlPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    const appPath = '/Applications/MuseScore 4.app';
    if (!existsSync(appPath)) return { ok: false as const, error: 'MuseScore 4 is not installed at /Applications/MuseScore 4.app. Use Open Folder.' };
    const { spawn } = await import('node:child_process');
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn('open', ['-a', 'MuseScore 4', filePath.path], { shell: false });
      child.on('error', reject);
      child.on('close', (exitCode) => resolve(exitCode ?? 1));
    });
    if (code !== 0) return { ok: false as const, error: `MuseScore 4 did not open (exit ${code}).` };
    return { ok: true as const };
  });

  ipcMain.handle('composer-os-api:wwh-v8-reveal', async (_event, body: unknown) => {
    const filePath = sessionMusicXmlPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    shell.showItemInFolder(filePath.path);
    return { ok: true as const };
  });

  function pentatonicExportPath(body: unknown): { path: string } | { error: string } {
    const raw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path.trim()
        : '';
    if (!raw || raw.includes('\0')) return { error: 'Missing MusicXML path.' };
    const resolved = path.resolve(raw);
    const root = path.resolve(app.getPath('documents'), 'Composer OS Exports', 'Pentatonic Engine');
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !resolved.endsWith('.musicxml') || !existsSync(resolved)) {
      return { error: 'That file is not a Pentatonic Engine MusicXML.' };
    }
    return { path: resolved };
  }

  ipcMain.handle('composer-os-api:pentatonic-write-musicxml', async (_event, body: unknown) => {
    const record = body && typeof body === 'object' ? (body as { xml?: unknown; label?: unknown }) : {};
    const xml = typeof record.xml === 'string' ? record.xml : '';
    const label = typeof record.label === 'string' ? record.label : 'collection';
    try {
      const documentsDir = app.getPath('documents');
      const documentsBlocked = testRootWriteError(documentsDir);
      if (documentsBlocked) return { ok: false as const, error: documentsBlocked };
      const written = await writePentatonicDesktopMusicXml({
        documentsDir,
        xml,
        label,
      });
      const writtenBlocked = testRootWriteError(written.fullPath);
      if (writtenBlocked) return { ok: false as const, error: writtenBlocked };
      return { ok: true as const, fullPath: written.fullPath, bytes: written.bytes };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:pentatonic-open-musescore', async (_event, body: unknown) => {
    const filePath = pentatonicExportPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    const appPath = '/Applications/MuseScore 4.app';
    if (!existsSync(appPath)) return { ok: false as const, error: 'MuseScore 4 is not installed at /Applications/MuseScore 4.app. Use Open Folder.' };
    const { spawn } = await import('node:child_process');
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn('open', ['-a', 'MuseScore 4', filePath.path], { shell: false });
      child.on('error', reject);
      child.on('close', (exitCode) => resolve(exitCode ?? 1));
    });
    if (code !== 0) return { ok: false as const, error: `MuseScore 4 did not open (exit ${code}).` };
    return { ok: true as const };
  });

  ipcMain.handle('composer-os-api:pentatonic-reveal', async (_event, body: unknown) => {
    const filePath = pentatonicExportPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    shell.showItemInFolder(filePath.path);
    return { ok: true as const };
  });

  function hexatonicExportPath(body: unknown): { path: string } | { error: string } {
    const raw =
      body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string'
        ? (body as { path: string }).path.trim()
        : '';
    if (!raw || raw.includes('\0')) return { error: 'Missing MusicXML path.' };
    const resolved = path.resolve(raw);
    const root = path.resolve(app.getPath('documents'), 'Composer OS Exports', 'Hexatonic Engine');
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !resolved.endsWith('.musicxml') || !existsSync(resolved)) {
      return { error: 'That file is not a Hexatonic Engine MusicXML.' };
    }
    return { path: resolved };
  }

  ipcMain.handle('composer-os-api:hexatonic-write-musicxml', async (_event, body: unknown) => {
    const record = body && typeof body === 'object' ? (body as { xml?: unknown; label?: unknown }) : {};
    const xml = typeof record.xml === 'string' ? record.xml : '';
    const label = typeof record.label === 'string' ? record.label : 'collection';
    try {
      const documentsDir = app.getPath('documents');
      const documentsBlocked = testRootWriteError(documentsDir);
      if (documentsBlocked) return { ok: false as const, error: documentsBlocked };
      const written = await writeHexatonicDesktopMusicXml({
        documentsDir,
        xml,
        label,
      });
      const writtenBlocked = testRootWriteError(written.fullPath);
      if (writtenBlocked) return { ok: false as const, error: writtenBlocked };
      return { ok: true as const, fullPath: written.fullPath, bytes: written.bytes };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('composer-os-api:hexatonic-open-musescore', async (_event, body: unknown) => {
    const filePath = hexatonicExportPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    const appPath = '/Applications/MuseScore 4.app';
    if (!existsSync(appPath)) return { ok: false as const, error: 'MuseScore 4 is not installed at /Applications/MuseScore 4.app. Use Open Folder.' };
    const { spawn } = await import('node:child_process');
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn('open', ['-a', 'MuseScore 4', filePath.path], { shell: false });
      child.on('error', reject);
      child.on('close', (exitCode) => resolve(exitCode ?? 1));
    });
    if (code !== 0) return { ok: false as const, error: `MuseScore 4 did not open (exit ${code}).` };
    return { ok: true as const };
  });

  ipcMain.handle('composer-os-api:hexatonic-reveal', async (_event, body: unknown) => {
    const filePath = hexatonicExportPath(body);
    if ('error' in filePath) return { ok: false as const, error: filePath.error };
    shell.showItemInFolder(filePath.path);
    return { ok: true as const };
  });

  ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'no path' };
    const normalized = path.normalize(filePath.trim());
    if (!existsSync(normalized)) {
      return { ok: false, error: 'path not found' };
    }
    shell.showItemInFolder(normalized);
    return { ok: true };
  });
}

export { apiGenerate } from '../../../engines/composer-os-v2/app-api/composerOsApiCore';
export {
  ensureOutputDirectoryForPreset,
  buildLabeledMusicXmlFilename,
} from '../../../engines/composer-os-v2/app-api/composerOsOutputPaths';
