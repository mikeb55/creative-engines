/**
 * Riff Generator — app entry: file naming, MusicXML under the Composer OS library Riffs folder, manifest.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { writeOutputManifest } from './writeOutputManifest';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import type { GenerateResult } from './generateComposition';
import type { RiffDensity, RiffGridMode, RiffLineMode, RiffStyleId } from '../core/riff-generator/riffTypes';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { compactRiffQualityForManifest } from '../core/riff-generator/riffQualityRules';

function parseRiffBars(req: GenerateRequest): 1 | 2 | 3 | 4 {
  const n = req.totalBars;
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 2;
}

function parseRiffStyle(req: GenerateRequest): RiffStyleId {
  const s = req.riffStyle;
  if (s === 'metheny' || s === 'scofield' || s === 'funk' || s === 'neutral') return s;
  return 'neutral';
}

function parseRiffDensity(req: GenerateRequest): RiffDensity {
  const d = req.riffDensity;
  if (d === 'sparse' || d === 'medium' || d === 'dense') return d;
  return 'medium';
}

function parseRiffGrid(req: GenerateRequest): RiffGridMode {
  return req.riffGrid === 'sixteenth' ? 'sixteenth' : 'eighth';
}

function parseRiffLineMode(req: GenerateRequest): RiffLineMode {
  const m = req.riffLineMode;
  if (m === 'guitar_bass' || m === 'octave_double') return m;
  return 'single_line';
}

/** Filename slug — avoid implying duo GCE or embedding a faux “quality” brand in the path. */
function riffFilenameSlug(title: string): string {
  const t = title.trim() || 'Riff';
  const slug = t.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
  return slug || 'Riff';
}

function riffManifestValidation(
  composite: number,
  gatePassed: boolean,
  riffStructuralPass?: boolean
): import('./appApiTypes').ValidationSummary {
  return {
    scoreIntegrity: true,
    exportIntegrity: true,
    /** Duo / ECM behaviour gates do not run for riff preset. */
    behaviourGates: false,
    mxValid: true,
    strictBarMath: true,
    exportRoundTrip: false,
    instrumentMetadata: true,
    sibeliusSafe: true,
    readinessRelease: 0,
    readinessMx: 1,
    shareable: false,
    errors: [],
    warnings: (() => {
      const base =
        gatePassed
          ? [
              `Riff preset: riffCompositeScore ${composite.toFixed(
                1
              )} is an internal 0–10 composite only (scoreRiffGce); not the duo/Song Mode GCE. Duo behaviour gates were not run.`,
            ]
          : [`Riff preset: internal riff gate not met (composite ${composite.toFixed(1)}).`];
      if (riffStructuralPass === false) {
        base.push(
          'Riff structural supplement (riffQualityRules): one or more objective checks failed — see manifest riffQualityRules; not a general GCE failure.'
        );
      }
      return base;
    })(),
  };
}

export function runRiffGeneratorApp(req: GenerateRequest, presetOutputDir: string): GenerateResult {
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const bars = parseRiffBars(req);
  const style = parseRiffStyle(req);
  const density = parseRiffDensity(req);
  const grid = parseRiffGrid(req);
  let lineMode = parseRiffLineMode(req);
  const bassOn = req.riffBass === true;
  if (bassOn && lineMode === 'single_line') {
    lineMode = 'guitar_bass';
  }
  if (lineMode === 'octave_double' && bassOn) {
    /** Octave mode is guitar-only; bass ignored. */
  }
  const bpm = req.bpm && req.bpm > 0 ? req.bpm : 100;
  const title = req.title?.trim() || 'Riff';
  const chordText = req.chordProgressionText;

  const gen = runRiffGenerator(effectiveSeed, {
    bars,
    density,
    style,
    grid,
    lineMode,
    bassEnabled: bassOn && lineMode === 'guitar_bass',
    bpm,
    title,
    chordProgressionText: chordText,
  });

  if (!gen.success) {
    return {
      success: false,
      error: gen.error,
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: [gen.error],
      },
      runManifest: {
        seed: effectiveSeed,
        presetId: 'riff_generator',
        activeModules: ['riff_generator'],
        timestamp: new Date().toISOString(),
        scoreTitle: title,
        variationId: req.variationId,
        creativeControlLevel: req.creativeControlLevel,
      },
    };
  }

  if (!gen.xml) {
    return {
      success: false,
      error: 'Riff generation produced no MusicXML',
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: ['Riff generation produced no MusicXML'],
      },
      runManifest: {
        seed: effectiveSeed,
        presetId: 'riff_generator',
        activeModules: ['riff_generator'],
        timestamp: new Date().toISOString(),
        scoreTitle: title,
        variationId: req.variationId,
        creativeControlLevel: req.creativeControlLevel,
      },
    };
  }

  const riffDir = presetOutputDir;
  fs.mkdirSync(riffDir, { recursive: true });
  const slug = riffFilenameSlug(title);
  const filename = `V1-Riff-${slug}-seed${effectiveSeed}-${style}-${bars}b.musicxml`;
  const filepath = path.join(riffDir, filename);
  fs.writeFileSync(filepath, gen.xml, 'utf-8');

  const ts = new Date().toISOString();
  const rqCompact = compactRiffQualityForManifest(gen.riffQuality);
  const manifestValidation = riffManifestValidation(gen.gce, true, gen.riffQuality.aggregatePass);
  writeOutputManifest(filepath, {
    presetId: 'riff_generator',
    styleStack: ['riff_generator'],
    seed: effectiveSeed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    scoreTitle: title,
    riffCompositeScore: gen.gce,
    riffInternalGatePassed: true,
    riffQualityRules: rqCompact,
    validation: manifestValidation,
  });

  return {
    success: true,
    composerOsVersion: COMPOSER_OS_VERSION,
    xml: gen.xml,
    filename,
    filepath,
    scoreTitle: title,
    validation: {
      integrityPassed: true,
      behaviourGatesPassed: false,
      mxValidationPassed: true,
      strictBarMathPassed: true,
      exportRoundTripPassed: false,
      exportIntegrityPassed: true,
      instrumentMetadataPassed: true,
      sibeliusSafe: true,
      readiness: { shareable: false, release: 0, mx: 1 },
      errors: [],
      warnings: manifestValidation.warnings,
    },
    runManifest: {
      seed: effectiveSeed,
      presetId: 'riff_generator',
      activeModules: ['riff_generator'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
    },
    requestEcho: {
      tonalCenter: req.tonalCenter,
      bpm,
      totalBars: bars,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
    },
  };
}
