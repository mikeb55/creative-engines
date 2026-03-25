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
import type { BigBandEraId } from '../core/big-band/bigBandResearchTypes';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import { runSongMode } from '../core/song-mode/runSongMode';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { experimentalLabelForLevel } from '../core/creative-controls/experimentalEvaluator';

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

function requestEchoFromReq(req: GenerateRequest): NonNullable<GenerateResult['requestEcho']> {
  return {
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    stylePairing: req.stylePairing,
    ensembleConfigId: req.ensembleConfigId,
    primarySongwriterStyle: req.primarySongwriterStyle,
  };
}

function parseBigBandEraFromPairing(era?: string): BigBandEraId | undefined {
  if (era === 'swing' || era === 'bebop' || era === 'post_bop' || era === 'contemporary') {
    return era;
  }
  return undefined;
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
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sm = runSongMode({
    seed: effectiveSeed,
    title,
    primarySongwriterStyle: req.primarySongwriterStyle,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
  });
  const ok = sm.validation.valid;
  const errors = sm.validation.errors;
  const filename = `song_mode_run_${tsSafe}_${effectiveSeed}.json`;
  const payload = {
    composerOsArtifact: 'song_structure',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'song_mode',
    seed: effectiveSeed,
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    title: sm.compiledSong.title,
    validationPassed: ok,
    validationErrors: errors,
    manifestHints: sm.manifestHints,
    leadSheetReady: sm.manifestHints.leadSheetReady,
    compiledSongId: sm.compiledSong.id,
    sectionSummary: sm.compiledSong.sectionSummary,
    songwritingPrimaryStyle: sm.manifestHints.songwritingPrimaryStyle,
    songwritingRuleCount: sm.manifestHints.songwritingRuleCount,
    researchParseOk: sm.manifestHints.researchParseOk,
    songwritingFingerprint: sm.manifestHints.songwritingFingerprint,
    universalLeadSheetMode: sm.universalLeadSheet.mode,
    universalLeadSheetSectionCount: sm.universalLeadSheet.formSections.length,
    stylePairingRequest: req.stylePairing ?? null,
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
      seed: effectiveSeed,
      presetId: 'song_mode',
      activeModules: ['song_mode_compile', 'songwriting_research_rules'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
  };
}

function runBigBandPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Big Band Plan ${req.seed}`;
  const eraFromPairing = parseBigBandEraFromPairing(req.stylePairing?.era);
  const bb = runBigBandMode({
    seed: req.seed,
    title,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    ensembleConfigId: req.ensembleConfigId,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
        }
      : undefined,
    era: eraFromPairing,
  });
  const ok = bb.validation.ok;
  const runSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const filename = `big_band_plan_${tsSafe}_${runSeed}.json`;
  const payload = {
    composerOsArtifact: 'big_band_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'big_band',
    seed: runSeed,
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    title: bb.title,
    validationPassed: ok,
    validationErrors: bb.validation.errors,
    validationWarnings: bb.validation.warnings,
    manifestHints: bb.manifestHints,
    formSequence: bb.manifestHints.bigBandFormSequence,
    orchestrationReady: bb.manifestHints.bigBandOrchestrationReady,
    era: bb.era,
    composerStyle: bb.composerStyle,
    researchParseOk: bb.researchParseOk,
    resolvedRuleCount: bb.resolvedRules.ruleIds.length,
    bebopLineMetadata: bb.bebopLineMetadata,
    enhancedPlanning: bb.enhancedPlanning,
    stylePairingResolution: bb.stylePairingResolution ?? null,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  const pairing = bb.stylePairingResolution;
  const stylePairingReceipt = pairing
    ? {
        summary: `${pairing.songwriterStyle} × ${pairing.arrangerStyle}${
          pairing.era != null ? ` · ${pairing.era}` : ''
        }`,
        confidenceScore: pairing.confidenceScore,
        experimentalFlag: pairing.experimentalFlag,
        songwriterStyle: pairing.songwriterStyle,
        arrangerStyle: pairing.arrangerStyle,
        era: pairing.era,
      }
    : undefined;
  return {
    success: ok,
    productKind: 'planning',
    planningNotice: 'Big Band: planning only — no full ensemble MusicXML in this build.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : bb.validation.errors),
    runManifest: {
      seed: runSeed,
      presetId: 'big_band',
      activeModules: ['big_band_plan'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
    stylePairingReceipt,
  };
}

function runStringQuartetPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `String Quartet Plan ${req.seed}`;
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sq = runStringQuartetMode({ seed: effectiveSeed, title, totalBars: req.totalBars });
  const ok = sq.validation.ok;
  const filename = `string_quartet_plan_${tsSafe}_${effectiveSeed}.json`;
  const payload = {
    composerOsArtifact: 'string_quartet_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'string_quartet',
    seed: effectiveSeed,
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
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
      seed: effectiveSeed,
      presetId: 'string_quartet',
      activeModules: ['string_quartet_plan'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
  };
}
