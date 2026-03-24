/**
 * Composer OS V2 — App API: generate composition
 */

import type { GenerateRequest } from './appApiTypes';
import { writeOutputManifest } from './writeOutputManifest';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { mapAppStyleStackToEngine } from './mapStyleStack';
import * as fs from 'fs';
import * as path from 'path';

export interface GenerateResult {
  success: boolean;
  xml?: string;
  filename?: string;
  filepath?: string;
  /** Path to run manifest JSON alongside MusicXML, when written */
  manifestPath?: string;
  validation: {
    integrityPassed: boolean;
    behaviourGatesPassed: boolean;
    mxValidationPassed: boolean;
    sibeliusSafe: boolean;
    readiness: { shareable: boolean; release: number; mx: number };
    errors: string[];
  };
  runManifest?: {
    seed: number;
    presetId: string;
    activeModules: string[];
    timestamp: string;
  };
}

export function generateComposition(req: GenerateRequest, outputDir: string): GenerateResult {
  const result = runGoldenPath(req.seed, {
    styleStack: mapAppStyleStackToEngine(req.styleStack),
    presetId: req.presetId,
  });
  const validation = {
    integrityPassed: result.integrityPassed,
    behaviourGatesPassed: result.behaviourGatesPassed,
    mxValidationPassed: result.mxValidationPassed,
    sibeliusSafe: result.sibeliusSafe,
    readiness: result.readiness,
    errors: result.errors,
  };

  let filename: string | undefined;
  let filepath: string | undefined;

  if (result.xml) {
    const ts = new Date().toISOString();
    const tsSafe = ts.replace(/[:.]/g, '-').slice(0, 19);
    filename = `composer_os_${req.presetId}_${tsSafe}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, result.xml, 'utf-8');
    writeOutputManifest(filepath, {
      presetId: req.presetId,
      styleStack: result.runManifest?.activeModules ?? [],
      seed: req.seed,
      timestamp: ts,
      validation: {
        scoreIntegrity: result.integrityPassed,
        exportIntegrity: result.behaviourGatesPassed,
        behaviourGates: result.behaviourGatesPassed,
        mxValid: result.mxValidationPassed,
        sibeliusSafe: result.sibeliusSafe,
        readinessRelease: result.readiness.release,
        readinessMx: result.readiness.mx,
        shareable: result.readiness.shareable,
        errors: result.errors,
      },
    });
  }

  return {
    success: result.success,
    xml: result.xml,
    filename,
    filepath,
    manifestPath: filepath ? filepath.replace(/\.musicxml$/i, '.manifest.json') : undefined,
    validation,
    runManifest: result.runManifest
      ? {
          seed: result.runManifest.seed,
          presetId: result.runManifest.presetId,
          activeModules: result.runManifest.activeModules,
          timestamp: result.runManifest.timestamp,
        }
      : undefined,
  };
}
