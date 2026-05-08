/**
 * Build PDF — iteration 1: render PDF pages to PNG (pdfjs-dist + canvas), chord OCR via Claude Vision,
 * then Vault riff pipeline (same semantics as {@link generateFromIReal}).
 */

import { createCanvas } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type GenerationMode } from '../generation';
import { type VaultRiffStyle } from '../guitar/vaultRiffGenerator';
import type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
import {
  generateVaultFromParsedChart,
  type IRealVaultOutput,
  type GenerateFromIRealOptions,
} from '../irealpro/irealVaultPipeline';
import { harmoniesFromMeasures, type ParsedChart, type ParsedChord, type ParsedSection } from '../irealpro/parsedChart';

const DEFAULT_RENDER_SCALE = 2.5;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

/** Set on failure so `apiPdfGenerateFromPdf` can show a specific message (not always “missing API key”). */
export type PdfPipelinePhase =
  | 'missing_api_key'
  | 'pdf_render'
  | 'anthropic_http'
  | 'anthropic_parse'
  | 'empty_measures';

export type PdfPipelineDiag = {
  phase: PdfPipelinePhase;
  /** Present when phase === anthropic_http */
  httpStatus?: number;
  /** Low-level error text (e.g. pdf_render exception message). */
  detail?: string;
};

let pdfPipelineDiag: PdfPipelineDiag | null = null;

function setPdfPipelineDiag(d: PdfPipelineDiag): void {
  pdfPipelineDiag = d;
}

/** Consume and clear last PDF pipeline failure (call after `generateFromPdf` returns null). */
export function takePdfPipelineDiag(): PdfPipelineDiag | null {
  const d = pdfPipelineDiag;
  pdfPipelineDiag = null;
  return d;
}

/** User-facing copy after `generateFromPdf` returned null (consumes diag). */
export function formatPdfExtractFailureHint(): string {
  const d = takePdfPipelineDiag();
  if (!d) {
    return 'PDF extraction failed for an unknown reason.';
  }
  switch (d.phase) {
    case 'missing_api_key':
      return 'Missing ANTHROPIC_API_KEY. Desktop: DevTools → await window.composerOsDesktop?.saveAnthropicApiKey?.("sk-ant-…"), set Windows User env (persistent), or add ANTHROPIC_API_KEY to packaged resources/.env.';
    case 'pdf_render': {
      const tail = d.detail ? ` ${d.detail}` : '';
      return `Could not render PDF page.${tail}`;
    }
    case 'anthropic_http':
      return `Anthropic API HTTP ${d.httpStatus ?? '?'}. Check API key, billing, and model access (status ${d.httpStatus}).`;
    case 'anthropic_parse':
      return 'Claude vision did not return usable chord JSON for this page. Try another page or a clearer scan.';
    case 'empty_measures':
      return 'No chord symbols were extracted (empty measures). Try another page or a scan with larger chord symbols.';
    default:
      return 'PDF extraction failed.';
  }
}

function resetPdfPipelineDiag(): void {
  pdfPipelineDiag = null;
}

type PdfJsLegacy = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfJsCached: PdfJsLegacy | null = null;
let domPolyfilledForPdfJs = false;

/**
 * Electron main / Node has no `DOMMatrix` / `ImageData` / `Path2D`. pdf.js tries to polyfill via
 * `process.getBuiltinModule('module')`, which fails under Electron — assign globals from `@napi-rs/canvas`
 * **before** importing `pdf.mjs`.
 */
async function ensureNodeDomPolyfillsForPdfJs(): Promise<void> {
  if (domPolyfilledForPdfJs) return;
  if (typeof globalThis.DOMMatrix !== 'undefined') {
    domPolyfilledForPdfJs = true;
    return;
  }
  try {
    const mod = await import('@napi-rs/canvas');
    const canvas = (mod as { default?: typeof import('@napi-rs/canvas') }).default ?? mod;
    if (canvas.DOMMatrix) (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = canvas.DOMMatrix;
    if (canvas.ImageData) (globalThis as unknown as { ImageData: unknown }).ImageData = canvas.ImageData;
    if (canvas.Path2D) (globalThis as unknown as { Path2D: unknown }).Path2D = canvas.Path2D;
    if (typeof globalThis.navigator === 'undefined') {
      (globalThis as unknown as { navigator: { language: string; platform: string; userAgent: string } }).navigator =
        { language: 'en-US', platform: '', userAgent: '' };
    }
    domPolyfilledForPdfJs = true;
  } catch (e) {
    console.warn('[pdfChordReader] @napi-rs/canvas DOM polyfill failed — PDF render may error:', e);
  }
}

/**
 * Packaged Electron has no repo `node_modules` — main sets `COMPOSER_OS_PDFJS_WORKER_FILE`
 * to `resources/pdf.worker.mjs`. Dev falls back to cwd walk / `COMPOSER_OS_REPO_ROOT`.
 */
function resolvePdfWorkerFileUrl(): string {
  const fromEnv = process.env.COMPOSER_OS_PDFJS_WORKER_FILE;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '' && existsSync(fromEnv.trim())) {
    return pathToFileURL(fromEnv.trim()).href;
  }
  const repoRoot = process.env.COMPOSER_OS_REPO_ROOT;
  if (typeof repoRoot === 'string' && repoRoot.trim() !== '') {
    const p = join(
      repoRoot.trim(),
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build',
      'pdf.worker.mjs'
    );
    if (existsSync(p)) return pathToFileURL(p).href;
  }
  for (let up = 0; up < 8; up++) {
    const base = up === 0 ? process.cwd() : join(process.cwd(), ...Array(up).fill('..'));
    const p = join(base, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
    if (existsSync(p)) return pathToFileURL(p).href;
  }
  throw new Error(
    `pdf.worker.mjs not found (set COMPOSER_OS_PDFJS_WORKER_FILE or install pdfjs-dist). cwd=${process.cwd()}`
  );
}

/** Root containing `cmaps/`, `standard_fonts/`, `wasm/` — desktop sets `COMPOSER_OS_PDFJS_DIST_DIR`. */
function resolvePdfjsDistRoot(): string | undefined {
  const fromEnv = process.env.COMPOSER_OS_PDFJS_DIST_DIR?.trim();
  if (fromEnv && existsSync(join(fromEnv, 'wasm')) && existsSync(join(fromEnv, 'cmaps'))) {
    return fromEnv;
  }
  const repoRoot = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  if (repoRoot) {
    const p = join(repoRoot, 'node_modules', 'pdfjs-dist');
    if (existsSync(join(p, 'wasm'))) return p;
  }
  for (let up = 0; up < 10; up++) {
    const base = up === 0 ? process.cwd() : join(process.cwd(), ...Array(up).fill('..'));
    const p = join(base, 'node_modules', 'pdfjs-dist');
    if (existsSync(join(p, 'wasm'))) return p;
  }
  return undefined;
}

function pdfDocumentInitParams(): Record<string, unknown> {
  const root = resolvePdfjsDistRoot();
  const base: Record<string, unknown> = {
    useSystemFonts: true,
    cMapPacked: true,
    useWorkerFetch: false,
  };
  if (!root) return base;
  const dirUrl = (sub: string): string | undefined => {
    const d = join(root, sub);
    if (!existsSync(d)) return undefined;
    let href = pathToFileURL(d).href;
    if (!href.endsWith('/')) href += '/';
    return href;
  };
  const cMapUrl = dirUrl('cmaps');
  const standardFontDataUrl = dirUrl('standard_fonts');
  const wasmUrl = dirUrl('wasm');
  if (cMapUrl) base.cMapUrl = cMapUrl;
  if (standardFontDataUrl) base.standardFontDataUrl = standardFontDataUrl;
  if (wasmUrl) base.wasmUrl = wasmUrl;
  return base;
}

/** Lazy-load legacy pdf.js so ts-node/CJS resolution stays compatible with sibling `../generation` imports. */
async function loadPdfJs(): Promise<PdfJsLegacy> {
  await ensureNodeDomPolyfillsForPdfJs();
  if (!pdfJsCached) {
    pdfJsCached = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { GlobalWorkerOptions } = pdfJsCached;
    if (!GlobalWorkerOptions.workerSrc) {
      GlobalWorkerOptions.workerSrc = resolvePdfWorkerFileUrl();
    }
  }
  return pdfJsCached;
}

function defaultSections(totalBars: number): ParsedSection[] {
  if (totalBars <= 0) return [];
  return [{ label: 'A', startBar: 0, endBar: totalBars - 1 }];
}

/** Mirrors `splitChordSymbol` in `irealProAdapter.ts` (not exported there). */
function splitChordSymbol(symbol: string): { rootNote: string; chordQuality: string } {
  const s = symbol.trim();
  if (s === '' || /^n\.?c\.?$/i.test(s)) {
    return { rootNote: '', chordQuality: '' };
  }
  const m = s.match(/^([A-G](?:#|b|♭|♯)?)(.*)$/);
  if (!m) {
    return { rootNote: '', chordQuality: s };
  }
  let root = m[1]!;
  root = root.replace('♭', 'b').replace('♯', '#');
  const rootNote = root.toLowerCase();
  return {
    rootNote,
    chordQuality: (m[2] ?? '').trim(),
  };
}

type VisionChordChartJson = {
  title?: string;
  key?: string | null;
  timeSignature?: { num: number; den: number } | null;
  tempo?: number | null;
  measures?: string[][];
};

/**
 * Removes trailing OCR junk from Vision titles: whitespace, page labels ("pg 3", "page 3"),
 * hyphen-number tails ("- 3"), and a final standalone page digit token ("Song 3" → "Song").
 */
function cleanVisionTitle(raw: string): string {
  let s = raw.trim();
  if (s === '') return '';

  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s
      .replace(/\s+-\s*\d+$/i, '')
      .replace(/\s+(?:pg|page)\.?\s*\d+$/i, '')
      .replace(/\s+\d+$/, '')
      .trimEnd();
  }
  return s.trim();
}

function visionJsonToParsedChart(v: VisionChordChartJson): ParsedChart | null {
  if (!v.measures || !Array.isArray(v.measures)) return null;
  const measures: ParsedChord[][] = [];
  for (let barIndex = 0; barIndex < v.measures.length; barIndex++) {
    const bar = v.measures[barIndex];
    if (!Array.isArray(bar)) return null;
    const row: ParsedChord[] = [];
    for (let beatIndex = 0; beatIndex < bar.length; beatIndex++) {
      const symbol = String(bar[beatIndex] ?? '').trim();
      const { rootNote, chordQuality } = splitChordSymbol(symbol);
      row.push({
        symbol: symbol || 'N.C.',
        rootNote,
        chordQuality,
        duration: 1,
        barIndex,
        beatIndex,
      });
    }
    measures.push(row);
  }

  const ts = v.timeSignature;
  let timeSignature: ParsedChart['timeSignature'] = null;
  if (
    ts &&
    typeof ts === 'object' &&
    Number.isFinite(ts.num) &&
    Number.isFinite(ts.den) &&
    ts.den > 0
  ) {
    timeSignature = { num: Math.floor(ts.num), den: Math.floor(ts.den) };
  }

  return {
    title: typeof v.title === 'string' ? cleanVisionTitle(v.title) : '',
    composer: '',
    key: typeof v.key === 'string' && v.key !== '' ? v.key : null,
    meter: timeSignature,
    timeSignature,
    harmonies: harmoniesFromMeasures(measures),
    barMeterMap: {},
    repeatMarkers: [],
    tempo: typeof v.tempo === 'number' && Number.isFinite(v.tempo) ? v.tempo : null,
    style: null,
    sections: defaultSections(measures.length),
    measures,
    repeats: [],
  };
}

function parseJsonFromAssistantText(text: string): unknown {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m.exec(t);
  if (fence) {
    return JSON.parse(fence[1]!.trim());
  }
  return JSON.parse(t);
}

const SYSTEM_PROMPT =
  'You are a music chart reader. Extract chord symbols and bar structure from this lead sheet image. Return ONLY valid JSON with this exact schema: { title: string, key: string, timeSignature: { num: number, den: number }, tempo: number | null, measures: string[][] } where measures is an array of bars, each bar is an array of chord symbol strings. If you cannot read the chart return null.';

function normalizeBase64Png(input: string): string {
  const m = /^data:image\/png;base64,(.+)$/i.exec(input.trim());
  return m ? m[1]! : input.replace(/\s/g, '');
}

/**
 * Renders a single PDF page to a PNG, base64-encoded (no `data:` prefix).
 */
export async function renderPdfPageToBase64(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale: number = DEFAULT_RENDER_SCALE
): Promise<string> {
  const { getDocument } = await loadPdfJs();
  const loadingTask = getDocument({
    data: pdfBytes,
    ...pdfDocumentInitParams(),
  });
  const pdf = await loadingTask.promise;
  const pageIdx = Math.floor(pageNumber);
  if (pageIdx < 1 || pageIdx > pdf.numPages) {
    throw new RangeError(
      `renderPdfPageToBase64: pageNumber ${pageNumber} out of range 1–${pdf.numPages}`
    );
  }
  const page = await pdf.getPage(pageIdx);
  const viewport = page.getViewport({ scale });
  const w = Math.max(1, Math.ceil(viewport.width));
  const h = Math.max(1, Math.ceil(viewport.height));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const buf = canvas.toBuffer('image/png');
  return Buffer.from(buf).toString('base64');
}

/**
 * Sends a PNG (base64) to Claude Vision; parses JSON into {@link ParsedChart}.
 */
export async function extractChordsFromPdfPage(base64Image: string): Promise<ParsedChart | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    setPdfPipelineDiag({ phase: 'missing_api_key' });
    return null;
  }

  const data = normalizeBase64Png(base64Image);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data,
                },
              },
              {
                type: 'text',
                text: 'Return the JSON object or null as instructed.',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      setPdfPipelineDiag({ phase: 'anthropic_http', httpStatus: res.status });
      return null;
    }

    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    let text = '';
    for (const block of body.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string') {
        text += block.text;
      }
    }

    const trimmed = text.trim();
    if (trimmed === 'null' || trimmed.toLowerCase() === 'null') {
      setPdfPipelineDiag({ phase: 'anthropic_parse' });
      return null;
    }

    const parsed = parseJsonFromAssistantText(trimmed) as VisionChordChartJson | null;
    if (parsed == null || typeof parsed !== 'object') {
      setPdfPipelineDiag({ phase: 'anthropic_parse' });
      return null;
    }

    const converted = visionJsonToParsedChart(parsed);
    if (!converted) {
      setPdfPipelineDiag({ phase: 'anthropic_parse' });
      return null;
    }
    return converted;
  } catch {
    setPdfPipelineDiag({ phase: 'anthropic_parse' });
    return null;
  }
}

function coerceRiffStyle(style: string | undefined): VaultRiffStyle {
  const allowed: VaultRiffStyle[] = [
    'quadratonic',
    'dyad-seesaw',
    'triad-pair-pendulum',
    'pedal-string',
    'bebop-placement',
  ];
  if (style && (allowed as string[]).includes(style)) {
    return style as VaultRiffStyle;
  }
  return 'bebop-placement';
}

export type GenerateFromPdfOptions = {
  mode?: GenerationMode;
  riffStyle?: string;
  tuningId?: string;
  /** Same semantics as iReal Build I (`generateVaultFromParsedChart`); not yet applied musically in-engine. */
  drift?: EmotionalDrift;
  /** 1-based page index. Default 1. */
  pageNumber?: number;
  /** Render scale; default 2.5 */
  scale?: number;
  chorusCount?: number;
  seed?: number;
  duoIntent?: 'conversational' | 'supportive';
  songwriterStyleId?: string;
};

function pdfOptionsToVaultOptions(options?: GenerateFromPdfOptions): GenerateFromIRealOptions | undefined {
  if (!options) return undefined;
  const out: GenerateFromIRealOptions = {
    mode: options.mode,
    tuningId: options.tuningId,
    riffStyle: coerceRiffStyle(options.riffStyle),
  };
  if (options.drift !== undefined) out.drift = options.drift;
  if (options.chorusCount !== undefined) out.chorusCount = options.chorusCount;
  if (options.seed !== undefined) out.seed = options.seed;
  if (options.duoIntent !== undefined) out.duoIntent = options.duoIntent;
  if (options.songwriterStyleId !== undefined) out.songwriterStyleId = options.songwriterStyleId;
  return out;
}

/**
 * Render one page → Claude Vision → {@link ParsedChart} → Vault riffs → {@link IRealVaultOutput}.
 */
export async function generateFromPdf(
  pdfBytes: Uint8Array,
  options?: GenerateFromPdfOptions
): Promise<{ output: IRealVaultOutput; chart: ParsedChart } | null> {
  resetPdfPipelineDiag();
  const pageNumber = options?.pageNumber ?? 1;
  const scale = options?.scale ?? DEFAULT_RENDER_SCALE;

  let base64: string;
  try {
    base64 = await renderPdfPageToBase64(pdfBytes, pageNumber, scale);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setPdfPipelineDiag({ phase: 'pdf_render', detail: msg.slice(0, 500) });
    return null;
  }

  const chart = await extractChordsFromPdfPage(base64);
  if (!chart || !chart.measures?.length) {
    if (!pdfPipelineDiag) {
      setPdfPipelineDiag({ phase: 'empty_measures' });
    }
    return null;
  }

  const output = generateVaultFromParsedChart(chart, pdfOptionsToVaultOptions(options));
  return { output, chart };
}
