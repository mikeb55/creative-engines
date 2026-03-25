/**
 * Single Composer OS app entry for Generate: routes presets to golden-path MusicXML
 * or structural/planning runs (no deep UI imports).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { generateComposition, type GenerateResult } from './generateComposition';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import { runSongMode } from '../core/song-mode/runSongMode';

export const SUPPORTED_APP_PRESET_IDS = [
  'guitar_bass_duo',
  'ecm_chamber',
  'song_mode',
  'big_band',
  'string_quartet',
] as const;

export type SupportedAppPresetId = (typeof SUPPORTED_APP_PRESET_IDS)[number];

function validationForStructural(ok: boolean, errors: string[]): GenerateResult['validation'] {
  return {
    integrityPassed: ok,
    behaviourGatesPassed: ok,
    mxValidationPassed: ok,
    strictBarMathPassed: ok,
    exportRoundTripPassed: ok,
    exportIntegrityPassed: ok,
    instrumentMetadataPassed: ok,
    sibeliusSafe: ok,
    readiness: { shareable: false, release: ok ? 1 : 0, mx: ok ? 1 : 0 },
    errors,
  };
}

function writeArtifactJson(
  outputDir: string,
  filename: string,
  body: Record<string, unknown>
): { filepath: string } {
  fs.mkdirSync(outputDir, { recursive: true });
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
  return { filepath };
}

export function runAppGeneration(req: GenerateRequest, outputDir: string): GenerateResult {
  const id = req.presetId as string;
  if (!SUPPORTED_APP_PRESET_IDS.includes(id as SupportedAppPresetId)) {
    return {
      success: false,
      error: `Unsupported preset: ${id}`,
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: validationForStructural(false, [`Unsupported preset: ${id}`]),
      runManifest: {
        seed: req.seed,
        presetId: id,
        activeModules: [],
        timestamp: new Date().toISOString(),
      },
    };
  }

  switch (id) {
    case 'guitar_bass_duo':
    case 'ecm_chamber':
      return { ...generateComposition(req, outputDir), composerOsVersion: COMPOSER_OS_VERSION };
    case 'song_mode':
      return runSongStructure(req, outputDir);
    case 'big_band':
      return runBigBandPlanning(req, outputDir);
    case 'string_quartet':
      return runStringQuartetPlanning(req, outputDir);
    default:
      return {
        success: false,
        validation: validationForStructural(false, ['Unreachable preset branch']),
        composerOsVersion: COMPOSER_OS_VERSION,
      };
  }
}

function runSongStructure(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Song Mode Study ${req.seed}`;
  const sm = runSongMode({ seed: req.seed, title });
  const ok = sm.validation.valid;
  const errors = sm.validation.errors;
  const filename = `song_mode_run_${tsSafe}_${req.seed}.json`;
  const payload = {
    composerOsArtifact: 'song_structure',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'song_mode',
    seed: req.seed,
    timestamp: ts,
    title: sm.compiledSong.title,
    validationPassed: ok,
    validationErrors: errors,
    manifestHints: sm.manifestHints,
    leadSheetReady: sm.manifestHints.leadSheetReady,
    compiledSongId: sm.compiledSong.id,
    sectionSummary: sm.compiledSong.sectionSummary,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  return {
    success: ok,
    productKind: 'song_structure',
    planningNotice:
      'Song Mode: structural run + lead-sheet contract (no MusicXML export in this build). Output is a JSON summary.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, errors),
    runManifest: {
      seed: req.seed,
      presetId: 'song_mode',
      activeModules: ['song_mode_compile'],
      timestamp: ts,
      scoreTitle: title,
    },
    scoreTitle: title,
  };
}

function runBigBandPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Big Band Plan ${req.seed}`;
  const bb = runBigBandMode({ seed: req.seed, title });
  const ok = bb.validation.ok;
  const filename = `big_band_plan_${tsSafe}_${req.seed}.json`;
  const payload = {
    composerOsArtifact: 'big_band_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'big_band',
    seed: req.seed,
    timestamp: ts,
    title: bb.title,
    validationPassed: ok,
    validationErrors: bb.validation.errors,
    validationWarnings: bb.validation.warnings,
    manifestHints: bb.manifestHints,
    formSequence: bb.manifestHints.bigBandFormSequence,
    orchestrationReady: bb.manifestHints.bigBandOrchestrationReady,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  return {
    success: ok,
    productKind: 'planning',
    planningNotice: 'Big Band: planning only — no full ensemble MusicXML in this build.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : bb.validation.errors),
    runManifest: {
      seed: req.seed,
      presetId: 'big_band',
      activeModules: ['big_band_plan'],
      timestamp: ts,
      scoreTitle: title,
    },
    scoreTitle: title,
  };
}

function runStringQuartetPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `String Quartet Plan ${req.seed}`;
  const sq = runStringQuartetMode({ seed: req.seed, title });
  const ok = sq.validation.ok;
  const filename = `string_quartet_plan_${tsSafe}_${req.seed}.json`;
  const payload = {
    composerOsArtifact: 'string_quartet_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'string_quartet',
    seed: req.seed,
    timestamp: ts,
    title: sq.title,
    validationPassed: ok,
    validationErrors: sq.validation.errors,
    validationWarnings: sq.validation.warnings,
    manifestHints: sq.manifestHints,
    formSequence: sq.manifestHints.stringQuartetFormSequence,
    orchestrationReady: sq.manifestHints.stringQuartetOrchestrationReady,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  return {
    success: ok,
    productKind: 'planning',
    planningNotice: 'String Quartet: planning only — no quartet MusicXML in this build.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : sq.validation.errors),
    runManifest: {
      seed: req.seed,
      presetId: 'string_quartet',
      activeModules: ['string_quartet_plan'],
      timestamp: ts,
      scoreTitle: title,
    },
    scoreTitle: title,
  };
}
