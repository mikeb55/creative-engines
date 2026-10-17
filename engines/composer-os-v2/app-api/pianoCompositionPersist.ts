/**
 * Persist a Piano V1 compose result into the Composer OS output directory.
 * Musical writing stays in apiComposePianoV1. This module only writes files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { comparePianoScoreToXml } from '../core/piano/pianoXmlOracle';
import { writePianoScoreMidi } from '../core/piano/pianoMidi';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { resolveComposerLibraryRoot } from './composerOsOutputPaths';
import { apiComposePianoV1 } from './pianoCompositionApp';

export const PIANO_FIXTURE_SEED_EFFECT =
  'Seed parity changes the left-hand bar 4 figure and the inner-voice pitch.';

export const PIANO_COFFEE_RUN_SEED_EFFECT =
  'This cue ignores seed for note events. 76018 and 76019 match. Inner voice changes bars 17–18.';

export const PIANO_OUTPUT_FOLDER_NAME = 'Solo Piano';

export type PianoPersistSuccess = {
  ok: true;
  code: 'ok';
  filepath: string;
  midiFilepath: string;
  outputDirectory: string;
  elapsedSeconds: number;
  soundingAttacks: number;
  seedEffect: string;
  bars: number;
  tempo: number;
  title: string;
  innerVoice: boolean;
  pedalEventCount: number;
  validation: { oracleOk: true; errors: string[] };
};

export type PianoPersistFailure = {
  ok: false;
  code: string;
  error: string;
};

export type PianoPersistResult = PianoPersistSuccess | PianoPersistFailure;

function unlinkIfPresent(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* partial cleanup is best-effort */
  }
}

function barCount(score: ScoreModel): number {
  return score.parts[0]?.measures.length ?? 0;
}

function pieceSlug(filmCue: unknown): 'piano-v1-fixture' | 'coffee-run-variation' {
  return filmCue === 'coffee-run-variation' ? 'coffee-run-variation' : 'piano-v1-fixture';
}

export function persistPianoComposition(body: unknown, outputDir: string): PianoPersistResult {
  const composed = apiComposePianoV1(body);
  if (!composed.ok) {
    return { ok: false, code: composed.code, error: composed.error };
  }

  const request = body as { seed?: unknown; innerVoice?: unknown; filmCue?: unknown };
  const seed = request.seed;
  const innerVoice = request.innerVoice !== false;
  const piece = pieceSlug(request.filmCue);
  const libraryRoot = resolveComposerLibraryRoot(outputDir);
  const outputDirectory = path.resolve(libraryRoot, PIANO_OUTPUT_FOLDER_NAME);
  const base = `${piece}-seed${String(seed)}-${innerVoice ? 'inner' : 'no-inner'}`;
  const filepath = path.join(outputDirectory, `${base}.musicxml`);
  const midiFilepath = path.join(outputDirectory, `${base}.mid`);
  const xmlPartial = `${filepath}.partial`;
  const midiPartial = `${midiFilepath}.partial`;

  try {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(xmlPartial, composed.xml, 'utf8');
    writePianoScoreMidi(composed.score, midiPartial);
    const written = fs.readFileSync(xmlPartial, 'utf8');
    const oracle = comparePianoScoreToXml(composed.score, written);
    if (!oracle.ok) {
      unlinkIfPresent(xmlPartial);
      unlinkIfPresent(midiPartial);
      return {
        ok: false,
        code: 'parity',
        error: oracle.errors.join(' ') || 'Written MusicXML failed piano parity.',
      };
    }
    fs.renameSync(xmlPartial, filepath);
    fs.renameSync(midiPartial, midiFilepath);
    return {
      ok: true,
      code: 'ok',
      filepath: path.resolve(filepath),
      midiFilepath: path.resolve(midiFilepath),
      outputDirectory,
      elapsedSeconds: composed.elapsedSeconds,
      soundingAttacks: composed.soundingAttacks,
      seedEffect: piece === 'coffee-run-variation' ? PIANO_COFFEE_RUN_SEED_EFFECT : PIANO_FIXTURE_SEED_EFFECT,
      bars: barCount(composed.score),
      tempo: composed.score.tempo ?? 64,
      title: composed.score.title,
      innerVoice,
      pedalEventCount: composed.score.pianoPedal?.length ?? 0,
      validation: { oracleOk: true, errors: [] },
    };
  } catch (err) {
    unlinkIfPresent(xmlPartial);
    unlinkIfPresent(midiPartial);
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'validation', error };
  }
}
