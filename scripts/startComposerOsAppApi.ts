/**
 * Start Composer OS App API server from repo root.
 * Uses root tsconfig (CommonJS) so engine imports resolve correctly.
 *
 * `startComposerOsAppApi.js` is kept for `node scripts/startComposerOsAppApi.js`; it registers
 * ts-node and requires `composerOsApiCore.ts` explicitly so no stale `composerOsApiCore.js` is needed.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import {
  getComposerFilesRoot,
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
} from '../engines/composer-os-v2/app-api/composerOsApiCore';
import {
  apiBhlCompose,
  apiBhlDefaults,
  apiBhlExport,
  apiBhlInspect,
  apiBhlOpen,
} from '../engines/composer-os-v2/app-api/bhlApp';
import { openOutputFolderRoute } from './openOutputFolderRoute';
import { resolveDownloadFileTarget, sendDownloadFile } from './downloadFileRoute';
import type { GenerateRequest } from '../engines/composer-os-v2/app-api/appApiTypes';

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED]', reason);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use((err: unknown, _req: Request, res: Response, next: (e?: unknown) => void) => {
  const e = err as { status?: number; type?: string };
  if (e?.status === 413 || e?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: 'LeadSheet MusicXML is too large for the current web request limit.',
    });
    return;
  }
  next(err);
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'composer-os' });
});

/** Dev-only: browser mirrors `[PAYLOAD]` to API stdout (e.g. Tee-Object dev-live.txt). */
app.post('/api/log-payload', (req: Request, res: Response) => {
  console.log('[PAYLOAD-RECEIVED]', JSON.stringify((req.body as { payload?: unknown })?.payload, null, 2));
  res.json({ ok: true });
});

const OUTPUT_DIR = getComposerFilesRoot();
process.env.COMPOSER_OS_OUTPUT_DIR = OUTPUT_DIR;

app.get('/api/presets', (_req: Request, res: Response) => {
  try {
    res.json(apiGetPresets());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/style-modules', (_req: Request, res: Response) => {
  try {
    res.json(apiGetStyleModules());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/riff-phrase-corpus', (_req: Request, res: Response) => {
  try {
    res.json(apiGetRiffPhraseCorpus());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/melodic-variation-pack', (req: Request, res: Response) => {
  try {
    const result = apiMelodicVariationPack(req.body as Parameters<typeof apiMelodicVariationPack>[0]);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: String(err),
    });
  }
});

app.post('/api/generate', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GenerateRequest> & { __generateCorrelationId?: string };
    if (typeof body.__generateCorrelationId === 'string') {
      const b = body as Partial<GenerateRequest> & { barMeterMap?: Record<number, unknown> };
      const barKeys = b.barMeterMap ? Object.keys(b.barMeterMap).length : 0;
      console.log('[GEN-CORR] http /api/generate body received', {
        corr: body.__generateCorrelationId,
        presetId: b.presetId,
        primarySongwriterStyle: b.primarySongwriterStyle,
        barMeterBarCount: barKeys,
        zappaSoloMidiLow: b.zappaSoloMidiLow,
        zappaSoloMidiHigh: b.zappaSoloMidiHigh,
        zappaSoloDensity: b.zappaSoloDensity,
        zappaSoloDissonance: b.zappaSoloDissonance,
        alternateGuitarTuning: body.alternateGuitarTuning,
      });
    }
    const result = apiGenerate(body, OUTPUT_DIR);
    if ('error' in result && !('validation' in result)) {
      res.status(500).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('[GENERATE-ERROR]', e.message, e.stack);
    res.status(500).json({
      success: false,
      error: String(err),
      detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    });
  }
});

app.get('/api/outputs', (_req: Request, res: Response) => {
  try {
    res.json(apiListOutputs(OUTPUT_DIR));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/output-directory', (_req: Request, res: Response) => {
  res.json(apiGetOutputDirectory(OUTPUT_DIR));
});

app.get('/api/diagnostics', (_req: Request, res: Response) => {
  try {
    const port = parseInt(process.env.PORT ?? '3001', 10);
    res.json(apiGetDiagnostics(OUTPUT_DIR, port));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


app.get('/api/download-file', (req: Request, res: Response) => {
  const pathParam = typeof req.query.path === 'string' ? req.query.path : undefined;
  const resolved = resolveDownloadFileTarget(OUTPUT_DIR, pathParam);
  if (!resolved.ok) {
    res.status(resolved.status).json({ error: resolved.message });
    return;
  }
  sendDownloadFile(res, resolved.absolutePath, resolved.fileName);
});

app.post('/api/open-output-folder', (req: Request, res: Response) => {
  console.log('[API][route] /api/open-output-folder hit', req.body);
  openOutputFolderRoute(OUTPUT_DIR, req.body as { path?: string }).then((r) => {
    console.log('[API][route] /api/open-output-folder response', r);
    res.json(r);
  });
});

app.post('/api/system-check', async (_req: Request, res: Response) => {
  try {
    const r = await apiSystemCheck();
    if ('blocked' in r && r.blocked) {
      res.status(403).json(r);
      return;
    }
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/pdf/generate-from-pdf', async (req: Request, res: Response) => {
  try {
    const r = await apiPdfGenerateFromPdf(
      req.body as Parameters<typeof apiPdfGenerateFromPdf>[0]
    );
    res.json(r);
  } catch (err) {
    res.status(500).json({ success: true, output: null, error: String(err) });
  }
});

app.post('/api/analyse', (req: Request, res: Response) => {
  try {
    const result = apiAnalyse(req.body as Parameters<typeof apiAnalyse>[0]);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/export-pdf', async (req: Request, res: Response) => {
  try {
    const r = await apiExportPdf(req.body as Parameters<typeof apiExportPdf>[0]);
    res.json(r);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/export-guitar-pro', async (req: Request, res: Response) => {
  try {
    const r = await apiExportGuitarPro(req.body as Parameters<typeof apiExportGuitarPro>[0]);
    res.json(r);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

function sendBhl(res: Response, result: { ok: boolean }): void {
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
}

app.post('/api/bhl/defaults', (_req: Request, res: Response) => {
  try {
    sendBhl(res, apiBhlDefaults());
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/bhl/inspect', (req: Request, res: Response) => {
  try {
    sendBhl(res, apiBhlInspect(req.body));
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/bhl/compose', (req: Request, res: Response) => {
  try {
    sendBhl(res, apiBhlCompose(req.body));
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/bhl/export', (req: Request, res: Response) => {
  try {
    sendBhl(res, apiBhlExport(req.body));
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/bhl/open', (req: Request, res: Response) => {
  try {
    sendBhl(res, apiBhlOpen(req.body));
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/generate-comping', (req: Request, res: Response) => {
  try {
    const result = apiGenerateComping(req.body as Parameters<typeof apiGenerateComping>[0]);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

const staticPath = process.env.COMPOSER_OS_STATIC_DIR ?? path.join(path.resolve(__dirname, '..'), 'apps', 'composer-os-app', 'dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Composer OS API on http://localhost:${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3001 already in use — kill stale processes and relaunch');
    process.exit(1);
  }
  throw err;
});
