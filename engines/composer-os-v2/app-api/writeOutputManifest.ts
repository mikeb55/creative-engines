/**
 * Composer OS V2 — App API: write output manifest under `_meta` (MusicXML stays in preset folder).
 */

import type { OutputEntry, ValidationSummary } from './appApiTypes';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function tryHideMetaFolderOnWindows(metaDir: string): void {
  if (process.platform !== 'win32') return;
  try {
    execSync(`attrib +h "${metaDir.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
  } catch {
    /* optional */
  }
}

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
  const manifestPath = manifestPathForMusicXml(xmlFilepath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  tryHideMetaFolderOnWindows(path.dirname(manifestPath));
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
