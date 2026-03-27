/**
 * Composer OS V2 — Songwriting Engine (Phase 1): single entry `generateSong`.
 * Pipeline order: parse → bar match → seed → motif → melody score → applySwingPass → validate → [dryRun] → write → receipt.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';
import { getOutputPath } from '../../app-api/composerOsOutputPaths';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateScoreModel } from '../score-model/scoreModelValidation';
import type { SongRequest, SongResult } from './songEngineTypes';
import { buildSongScoreModel } from './songEngineMusic';
import { applySwingPass } from './swingPass';

function failResult(
  partial: Omit<SongResult, 'success' | 'filePath' | 'bars' | 'chordBars' | 'seed' | 'timestamp'> & {
    bars: number;
    chordBars: string[];
    seed: number;
    timestamp: string;
  },
  errors: string[]
): SongResult {
  return {
    success: false,
    filePath: '',
    bars: partial.bars,
    chordBars: partial.chordBars,
    seed: partial.seed,
    timestamp: partial.timestamp,
    errors,
  };
}

/**
 * Minimal songwriting generation: melody from motif, chord-aligned, Sibelius-safe MusicXML under library `Songs/`.
 * No alternate entry points.
 */
export function generateSong(request: SongRequest): SongResult {
  const timestamp = new Date().toISOString();
  const barsRequested = request.bars;

  if (!Number.isFinite(barsRequested) || barsRequested < 4) {
    return failResult(
      { bars: barsRequested, chordBars: [], seed: 0, timestamp },
      ['bars must be a number >= 4.']
    );
  }

  const parsed = parseChordProgressionInputWithBarCount(request.chordProgression, barsRequested);
  if (!parsed.ok) {
    return failResult({ bars: barsRequested, chordBars: [], seed: 0, timestamp }, [parsed.error]);
  }
  const chordBars = parsed.bars;

  const seed = request.seed !== undefined && Number.isFinite(request.seed) ? Math.floor(request.seed) : Date.now() % 0x7fffffff;
  const tempo = request.tempo !== undefined && request.tempo > 0 ? Math.floor(request.tempo) : 100;

  const score = buildSongScoreModel(chordBars, seed, tempo, request.key);

  const swingLevel =
    request.swingLevel !== undefined && Number.isFinite(request.swingLevel)
      ? Math.max(0, Math.min(5, Math.floor(request.swingLevel)))
      : 2;
  applySwingPass(score, swingLevel);

  const modelVal = validateScoreModel(score, { requireAtLeastOneNote: true, maxEventsPerMeasure: 128 });
  if (!modelVal.valid) {
    return failResult({ bars: barsRequested, chordBars, seed, timestamp }, modelVal.errors);
  }

  if (request.dryRun) {
    return {
      success: true,
      filePath: '',
      bars: barsRequested,
      chordBars,
      seed,
      timestamp,
    };
  }

  const exportResult = exportScoreModelToMusicXml(score);
  if (!exportResult.success || !exportResult.xml) {
    return failResult(
      { bars: barsRequested, chordBars, seed, timestamp },
      exportResult.errors.length ? exportResult.errors : ['MusicXML export failed.']
    );
  }

  const outDir = getOutputPath('songs');
  fs.mkdirSync(outDir, { recursive: true });
  const safeTs = timestamp.replace(/[:.]/g, '-');
  const filename = `Song-${seed}-${safeTs}.musicxml`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, exportResult.xml, 'utf-8');

  return {
    success: true,
    filePath,
    bars: barsRequested,
    chordBars,
    seed,
    timestamp,
  };
}
