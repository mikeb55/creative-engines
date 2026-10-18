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
import { PIANO_V11_ALGORITHM, PIANO_V11_OUTPUT_FOLDER, pianoV11FileBase } from '../core/piano/pianoV11Output';

export const PIANO_FIXTURE_SEED_EFFECT =
  'Seed parity changes the left-hand bar 4 figure and the inner-voice pitch.';

export const PIANO_GENERAL_SEED_EFFECT =
  'Seed changes the opening rhythm, contour and left-hand figuration. The same seed and inputs repeat.';

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
  fieldErrors?: { field: string; message: string }[];
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

function pieceSlug(body: unknown): 'piano-v1-fixture' | 'coffee-run-variation' | 'general-piano-v1' {
  const request = body as { filmCue?: unknown; generalPianoV1?: unknown };
  if (request.filmCue === 'coffee-run-variation') return 'coffee-run-variation';
  if (request.generalPianoV1 === true) return 'general-piano-v1';
  return 'piano-v1-fixture';
}

export function persistPianoComposition(body: unknown, outputDir: string): PianoPersistResult {
  const composed = apiComposePianoV1(body);
  if (!composed.ok) {
    return {
      ok: false,
      code: composed.code,
      error: composed.error,
      ...(composed.fieldErrors ? { fieldErrors: composed.fieldErrors } : {}),
    };
  }

  const request = body as {
    seed?: unknown;
    innerVoice?: unknown;
    filmCue?: unknown;
    generalPianoV1?: unknown;
    pianoV11?: unknown;
    bars?: unknown;
    tempo?: unknown;
    tonalCentre?: unknown;
    harmony?: unknown;
  };
  const seed = request.seed;
  const innerVoice = request.innerVoice !== false;
  const piece = pieceSlug(body);
  const libraryRoot = resolveComposerLibraryRoot(outputDir);
  const v11 = request.generalPianoV1 === true && request.pianoV11 && typeof request.pianoV11 === 'object';
  const outputDirectory = path.resolve(libraryRoot, v11 ? PIANO_V11_OUTPUT_FOLDER : PIANO_OUTPUT_FOLDER_NAME);
  const base = v11
    ? pianoV11FileBase({
      seed: Number(seed),
      tempo: composed.score.tempo ?? (Number(request.tempo) || 0),
      bars: barCount(composed.score),
      tonalCentre: typeof request.tonalCentre === 'string' ? request.tonalCentre : 'C',
      payload: {
        algorithm: PIANO_V11_ALGORITHM,
        seed,
        tempo: request.tempo,
        bars: request.bars,
        tonalCentre: request.tonalCentre,
        harmony: request.harmony,
        pianoV11: request.pianoV11,
      },
    })
    : piece === 'general-piano-v1'
      ? `general-piano-v1-seed${String(seed)}-${barCount(composed.score)}bars-${composed.score.tempo ?? 0}bpm`
      : `${piece}-seed${String(seed)}-${innerVoice ? 'inner' : 'no-inner'}`;
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
    if (v11) {
      fs.writeFileSync(path.join(outputDirectory, `${base}.manifest.json`), `${JSON.stringify({
        algorithm: PIANO_V11_ALGORITHM,
        seed,
        tempo: request.tempo,
        bars: request.bars,
        tonalCentre: request.tonalCentre,
        harmony: request.harmony,
        pianoV11: request.pianoV11,
        listening: 'PENDING',
        notationInspection: 'PENDING',
        physicalPlayability: 'PENDING',
      }, null, 2)}\n`);
    }
    return {
      ok: true,
      code: 'ok',
      filepath: path.resolve(filepath),
      midiFilepath: path.resolve(midiFilepath),
      outputDirectory,
      elapsedSeconds: composed.elapsedSeconds,
      soundingAttacks: composed.soundingAttacks,
      seedEffect: piece === 'coffee-run-variation'
        ? PIANO_COFFEE_RUN_SEED_EFFECT
        : piece === 'general-piano-v1'
          ? PIANO_GENERAL_SEED_EFFECT
          : PIANO_FIXTURE_SEED_EFFECT,
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
