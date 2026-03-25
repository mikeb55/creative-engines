/**
 * Composer OS V2 — Run manifest generator
 * Essential for replay/debug.
 */

import type { RunManifest } from './runLedgerTypes';

export interface CreateRunManifestInput {
  version: string;
  seed: number;
  presetId: string;
  ecmMode?: string;
  scoreTitle?: string;
  activeModules: string[];
  feelMode: string;
  instrumentProfiles: string[];
  readinessScores: { release: number; mx: number };
  validationPassed: boolean;
  validationErrors?: string[];
  exportTarget?: string;
  timestamp: string;
}

/** Create run manifest. */
export function createRunManifest(input: CreateRunManifestInput): RunManifest {
  return {
    composerOsVersion: input.version,
    seed: input.seed,
    presetId: input.presetId,
    ecmMode: input.ecmMode,
    scoreTitle: input.scoreTitle,
    activeModules: input.activeModules,
    feelMode: input.feelMode,
    instrumentProfiles: input.instrumentProfiles,
    readinessScores: input.readinessScores,
    validationPassed: input.validationPassed,
    validationErrors: input.validationErrors,
    exportTarget: input.exportTarget,
    timestamp: input.timestamp,
  };
}
