/**
 * Composer OS V2 — App API: list outputs
 */

import type { OutputEntry } from './appApiTypes';
import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_SUFFIX = '.manifest.json';

function readManifest(filepath: string): Partial<OutputEntry> | null {
  const manifestPath = filepath.replace(/\.musicxml$/i, MANIFEST_SUFFIX);
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as Partial<OutputEntry>;
  } catch {
    return null;
  }
}

export function listOutputs(outputDir: string): OutputEntry[] {
  if (!fs.existsSync(outputDir)) return [];
  const files = fs.readdirSync(outputDir);
  const entries: OutputEntry[] = [];

  for (const f of files) {
    if (!f.toLowerCase().endsWith('.musicxml')) continue;
    const filepath = path.resolve(outputDir, f);
    const stat = fs.statSync(filepath);
    const manifest = readManifest(filepath);
    entries.push({
      filename: f,
      filepath,
      timestamp: manifest?.timestamp ?? stat.mtime?.toISOString() ?? '',
      presetId: manifest?.presetId ?? 'guitar_bass_duo',
      styleStack: manifest?.styleStack ?? ['barry_harris'],
      seed: manifest?.seed ?? 0,
      validation: manifest?.validation ?? {
        scoreIntegrity: false,
        exportIntegrity: false,
        behaviourGates: false,
        mxValid: false,
        sibeliusSafe: false,
        readinessRelease: 0,
        readinessMx: 0,
        shareable: false,
        errors: [],
      },
    });
  }

  entries.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
  return entries;
}
