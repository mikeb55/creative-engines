/**
 * Build PDF — iteration 1: render PDF pages to PNG (pdfjs-dist + canvas), chord OCR via Claude Vision,
 * then Vault riff pipeline (same semantics as {@link generateFromIReal}).
 */

import 'dotenv/config';
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
import type { ParsedChart, ParsedChord, ParsedSection } from '../irealpro/parsedChart';

const DEFAULT_RENDER_SCALE = 2.5;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

type PdfJsLegacy = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfJsCached: PdfJsLegacy | null = null;

/** Walk up from cwd to find `node_modules/pdfjs-dist/.../pdf.worker.mjs` (Node has no `import.meta` in this project’s CJS tsconfig). */
function resolvePdfWorkerFileUrl(): string {
  for (let up = 0; up < 8; up++) {
    const base = up === 0 ? process.cwd() : join(process.cwd(), ...Array(up).fill('..'));
    const p = join(base, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
    if (existsSync(p)) return pathToFileURL(p).href;
  }
  throw new Error(`pdf.worker.mjs not found near cwd=${process.cwd()}`);
}

/** Lazy-load legacy pdf.js so ts-node/CJS resolution stays compatible with sibling `../generation` imports. */
async function loadPdfJs(): Promise<PdfJsLegacy> {
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
    timeSignature,
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
  const loadingTask = getDocument({ data: pdfBytes, useSystemFonts: true });
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
  if (!apiKey || typeof apiKey !== 'string') {
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
      return null;
    }

    const parsed = parseJsonFromAssistantText(trimmed) as VisionChordChartJson | null;
    if (parsed == null || typeof parsed !== 'object') {
      return null;
    }

    return visionJsonToParsedChart(parsed);
  } catch {
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
  const pageNumber = options?.pageNumber ?? 1;
  const scale = options?.scale ?? DEFAULT_RENDER_SCALE;

  let base64: string;
  try {
    base64 = await renderPdfPageToBase64(pdfBytes, pageNumber, scale);
  } catch {
    return null;
  }

  const chart = await extractChordsFromPdfPage(base64);
  if (!chart || !chart.measures?.length) {
    return null;
  }

  const output = generateVaultFromParsedChart(chart, pdfOptionsToVaultOptions(options));
  return { output, chart };
}
