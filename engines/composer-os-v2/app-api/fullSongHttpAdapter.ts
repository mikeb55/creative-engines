/**
 * Browser / TunePainter boundary — JSON in → MusicXML out.
 * Wraps production `apiGenerate` (song_mode + songFormTemplate full_song).
 * Node-side only; does not run engines in the browser.
 */

import * as fs from 'fs';
import { apiGenerate } from './composerOsApiCore';

export interface FullSongHttpRequest {
  /** Deterministic seed (required for reproducible charts). */
  seed: number;
  /** Form length; defaults to 32. */
  totalBars?: number;
  /** Optional score title. */
  title?: string;
  /** Optional primary songwriter style id (default beatles). */
  primarySongwriterStyle?: string;
}

export interface FullSongHttpSuccess {
  success: true;
  /** MusicXML 3.x score-partwise document. */
  musicXml: string;
  seed: number;
  totalBars: number;
  songFormTemplate: 'full_song';
  presetId: 'song_mode';
  filepath?: string;
  filename?: string;
}

export interface FullSongHttpFailure {
  success: false;
  error: string;
  seed?: number;
  totalBars?: number;
}

export type FullSongHttpResponse = FullSongHttpSuccess | FullSongHttpFailure;

function coerceSeed(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return Math.floor(Number(raw));
  }
  return undefined;
}

function coerceBars(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    const n = Math.floor(Number(raw));
    if (n > 0) return n;
  }
  return fallback;
}

/**
 * Map a minimal TunePainter-facing JSON body onto production Song Mode full_song generation.
 */
export function apiGenerateFullSong(
  body: FullSongHttpRequest | Record<string, unknown>,
  outputDir: string
): FullSongHttpResponse {
  const seed = coerceSeed((body as FullSongHttpRequest).seed);
  if (seed === undefined) {
    return { success: false, error: 'full-song requires numeric seed' };
  }
  const totalBars = coerceBars((body as FullSongHttpRequest).totalBars, 32);
  const title =
    typeof (body as FullSongHttpRequest).title === 'string' &&
    (body as FullSongHttpRequest).title!.trim() !== ''
      ? (body as FullSongHttpRequest).title!.trim()
      : `Full Song (${totalBars} bars)`;
  const primarySongwriterStyle =
    typeof (body as FullSongHttpRequest).primarySongwriterStyle === 'string' &&
    (body as FullSongHttpRequest).primarySongwriterStyle!.trim() !== ''
      ? (body as FullSongHttpRequest).primarySongwriterStyle!.trim()
      : 'beatles';

  const result = apiGenerate(
    {
      presetId: 'song_mode',
      seed,
      totalBars,
      longFormEnabled: true,
      songFormTemplate: 'full_song',
      primarySongwriterStyle,
      title,
      scoreTitle: title,
      outputLabel: `full-song-http-seed${seed}`,
      styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    },
    outputDir
  );

  if (!('success' in result) || result.success !== true || !result.xml) {
    const err =
      'error' in result && typeof result.error === 'string'
        ? result.error
        : 'full-song generation failed';
    return { success: false, error: err, seed, totalBars };
  }

  let musicXml = result.xml;
  if (
    (!musicXml.includes('<score-partwise') && !musicXml.includes('<score-timewise')) &&
    result.filepath &&
    fs.existsSync(result.filepath)
  ) {
    musicXml = fs.readFileSync(result.filepath, 'utf8');
  }
  if (!musicXml.includes('<score-partwise') && !musicXml.includes('<score-timewise')) {
    return { success: false, error: 'full-song produced non-MusicXML payload', seed, totalBars };
  }

  return {
    success: true,
    musicXml,
    seed,
    totalBars,
    songFormTemplate: 'full_song',
    presetId: 'song_mode',
    filepath: result.filepath,
    filename: result.filename,
  };
}
