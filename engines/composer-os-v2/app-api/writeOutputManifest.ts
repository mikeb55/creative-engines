/**
 * Composer OS V2 — App API: write output manifest alongside MusicXML
 */

import type { OutputEntry, ValidationSummary } from './appApiTypes';
import * as fs from 'fs';
import * as path from 'path';

export function writeOutputManifest(
  xmlFilepath: string,
  meta: {
    presetId: string;
    styleStack: string[];
    seed: number;
    timestamp: string;
    scoreTitle?: string;
    validation: ValidationSummary;
  }
): void {
  const manifestPath = xmlFilepath.replace(/\.musicxml$/i, '.manifest.json');
  const entry: Partial<OutputEntry> = {
    presetId: meta.presetId,
    styleStack: meta.styleStack,
    seed: meta.seed,
    timestamp: meta.timestamp,
    scoreTitle: meta.scoreTitle,
    validation: meta.validation,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(entry, null, 0), 'utf-8');
}
