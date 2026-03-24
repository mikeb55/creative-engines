/**
 * Composer OS V2 — App API: list outputs under Mike Composer Files (preset subfolders)
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

/** List all .musicxml outputs under composer root (each preset has its own subfolder). */
export function listOutputs(composerRoot: string): OutputEntry[] {
  if (!fs.existsSync(composerRoot)) return [];
  const entries: OutputEntry[] = [];

  const top = fs.readdirSync(composerRoot, { withFileTypes: true });
  for (const d of top) {
    if (d.isDirectory()) {
      const subDir = path.join(composerRoot, d.name);
      collectMusicXmlInDir(subDir, d.name, entries);
    } else if (d.isFile() && d.name.toLowerCase().endsWith('.musicxml')) {
      // Legacy flat file at root
      pushEntry(path.join(composerRoot, d.name), '', entries);
    }
  }

  entries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return entries;
}

function collectMusicXmlInDir(dir: string, folderLabel: string, entries: OutputEntry[]): void {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.musicxml')) continue;
    pushEntry(path.join(dir, f), folderLabel, entries);
  }
}

function pushEntry(filepath: string, presetFolderLabel: string, entries: OutputEntry[]): void {
  const stat = fs.statSync(filepath);
  const manifest = readManifest(filepath);
  const filename = path.basename(filepath);
  entries.push({
    filename,
    filepath,
    presetFolderLabel,
    timestamp: manifest?.timestamp ?? stat.mtime?.toISOString() ?? '',
    presetId: manifest?.presetId ?? 'guitar_bass_duo',
    styleStack: manifest?.styleStack ?? ['barry_harris'],
    seed: manifest?.seed ?? 0,
    validation: manifest?.validation ?? {
      scoreIntegrity: false,
      exportIntegrity: false,
      behaviourGates: false,
      mxValid: false,
      strictBarMath: false,
      exportRoundTrip: false,
      instrumentMetadata: false,
      sibeliusSafe: false,
      readinessRelease: 0,
      readinessMx: 0,
      shareable: false,
      errors: [],
    },
  });
}
