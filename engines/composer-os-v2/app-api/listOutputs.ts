/**
 * Composer OS V2 — App API: list outputs under Mike Composer Files (preset subfolders)
 */

import type { OutputEntry } from './appApiTypes';
import { getPresets } from './getPresets';
import { legacyManifestPathForMusicXml, manifestPathForMusicXml, PRESET_OUTPUT_SUBFOLDER } from './composerOsOutputPaths';
import * as fs from 'fs';
import * as path from 'path';

/** Legacy disk layout before `song_mode` folder was renamed. */
const LEGACY_FOLDER_TO_PRESET: Record<string, string> = {
  'Song Mode Compositions': 'song_mode',
};

function buildFolderToPresetMap(): Record<string, string> {
  const m: Record<string, string> = { ...LEGACY_FOLDER_TO_PRESET };
  for (const [id, label] of Object.entries(PRESET_OUTPUT_SUBFOLDER)) {
    m[label] = id;
  }
  return m;
}

const FOLDER_TO_PRESET = buildFolderToPresetMap();

let presetNameCache: Record<string, string> | null = null;
function presetDisplayName(presetId: string): string {
  if (!presetNameCache) {
    presetNameCache = {};
    for (const p of getPresets()) {
      presetNameCache[p.id] = p.name;
    }
  }
  return presetNameCache[presetId] ?? presetId;
}

function isKnownPresetId(id: string): id is keyof typeof PRESET_OUTPUT_SUBFOLDER {
  return id in PRESET_OUTPUT_SUBFOLDER;
}

function inferPresetIdFromJson(
  folderLabel: string,
  art: string,
  dataPreset: unknown
): string {
  if (typeof dataPreset === 'string' && isKnownPresetId(dataPreset)) {
    return dataPreset;
  }
  const fromFolder = FOLDER_TO_PRESET[folderLabel];
  if (fromFolder) return fromFolder;
  if (art === 'big_band_planning') return 'big_band';
  if (art === 'string_quartet_planning') return 'string_quartet';
  if (art === 'song_structure') return 'song_mode';
  return 'unknown';
}

function resolvePresetIdForMusicXml(manifest: Partial<OutputEntry> | null, folderLabel: string): string {
  const fromFolder = folderLabel ? FOLDER_TO_PRESET[folderLabel] : undefined;
  const mid = manifest?.presetId;
  if (typeof mid === 'string' && isKnownPresetId(mid)) {
    return mid;
  }
  if (fromFolder) return fromFolder;
  return 'unknown';
}

function outputTypeLabel(presetId: string, artifactKind: OutputEntry['artifactKind']): string {
  if (artifactKind === 'song_structure') {
    return 'Lead-sheet-ready (structure)';
  }
  if (artifactKind === 'planning') {
    return presetId === 'song_mode' ? 'Lead-sheet-ready (structure)' : 'Planning';
  }
  if (presetId === 'guitar_bass_duo' || presetId === 'guitar_bass_duo_single_line' || presetId === 'ecm_chamber') {
    return 'Score-ready (MusicXML)';
  }
  if (presetId === 'song_mode') {
    return 'Lead-sheet-ready (structure)';
  }
  return 'Score-ready (MusicXML)';
}

function enrich(entry: OutputEntry): OutputEntry {
  const pid = entry.presetId;
  const modeLabel = presetDisplayName(pid);
  return {
    ...entry,
    modeLabel,
    presetDisplayName: modeLabel,
    outputTypeLabel: outputTypeLabel(pid, entry.artifactKind),
  };
}

function readManifest(xmlFilepath: string): Partial<OutputEntry> | null {
  const candidates = [manifestPathForMusicXml(xmlFilepath), legacyManifestPathForMusicXml(xmlFilepath)];
  for (const manifestPath of candidates) {
    try {
      if (!fs.existsSync(manifestPath)) continue;
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(raw) as Partial<OutputEntry>;
    } catch {
      continue;
    }
  }
  return null;
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
      collectJsonArtifactsInDir(subDir, d.name, entries);
    } else if (d.isFile() && d.name.toLowerCase().endsWith('.musicxml')) {
      pushEntry(path.join(composerRoot, d.name), '', entries);
    }
  }

  entries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return entries.map(enrich);
}

function collectJsonArtifactsInDir(dir: string, folderLabel: string, entries: OutputEntry[]): void {
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirents) {
    if (!d.isFile()) continue;
    const name = d.name;
    if (!name.endsWith('.json')) continue;
    if (!name.includes('_plan_') && !name.startsWith('song_mode_run_')) {
      continue;
    }
    pushJsonArtifactEntry(path.join(dir, name), folderLabel, entries);
  }
}

function pushJsonArtifactEntry(filepath: string, presetFolderLabel: string, entries: OutputEntry[]): void {
  let raw: string;
  try {
    raw = fs.readFileSync(filepath, 'utf-8');
  } catch {
    return;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }
  const art = data.composerOsArtifact;
  if (
    art !== 'big_band_planning' &&
    art !== 'string_quartet_planning' &&
    art !== 'song_structure'
  ) {
    return;
  }
  const presetId = inferPresetIdFromJson(presetFolderLabel, String(art), data.presetId);
  const seed = typeof data.seed === 'number' ? data.seed : 0;
  const timestamp = typeof data.timestamp === 'string' ? data.timestamp : '';
  const passed = data.validationPassed === true;
  const errsRaw = data.validationErrors;
  const errs = Array.isArray(errsRaw) ? (errsRaw as unknown[]).map((e) => String(e)) : [];
  const artifactKind: OutputEntry['artifactKind'] = art === 'song_structure' ? 'song_structure' : 'planning';
  const variationId = typeof data.variationId === 'string' ? data.variationId : undefined;

  entries.push({
    filename: path.basename(filepath),
    filepath,
    presetFolderLabel,
    timestamp,
    presetId,
    styleStack: [],
    seed,
    scoreTitle: typeof data.title === 'string' ? data.title : undefined,
    artifactKind,
    variationId,
    validation: {
      scoreIntegrity: passed,
      exportIntegrity: passed,
      behaviourGates: passed,
      mxValid: passed,
      strictBarMath: passed,
      exportRoundTrip: passed,
      instrumentMetadata: passed,
      sibeliusSafe: passed,
      readinessRelease: passed ? 1 : 0,
      readinessMx: passed ? 1 : 0,
      shareable: false,
      errors: passed ? [] : errs,
    },
  });
}

function collectMusicXmlInDir(dir: string, folderLabel: string, entries: OutputEntry[]): void {
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirents) {
    if (!d.isFile()) continue;
    if (!d.name.toLowerCase().endsWith('.musicxml')) continue;
    pushEntry(path.join(dir, d.name), folderLabel, entries);
  }
}

function pushEntry(filepath: string, presetFolderLabel: string, entries: OutputEntry[]): void {
  const stat = fs.statSync(filepath);
  const manifest = readManifest(filepath);
  const filename = path.basename(filepath);
  const presetId = resolvePresetIdForMusicXml(manifest, presetFolderLabel);
  entries.push({
    filename,
    filepath,
    presetFolderLabel,
    timestamp: manifest?.timestamp ?? stat.mtime?.toISOString() ?? '',
    presetId,
    styleStack: manifest?.styleStack ?? ['barry_harris'],
    seed: manifest?.seed ?? 0,
    artifactKind: 'musicxml',
    variationId: manifest?.variationId,
    creativeControlLevel: manifest?.creativeControlLevel,
    scoreTitle: manifest?.scoreTitle,
    harmonySourceUsed: manifest?.harmonySourceUsed,
    harmonySource: manifest?.harmonySource,
    styleGrammarLabel: manifest?.styleGrammarLabel,
    styleStackPrimaryModuleId: manifest?.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: manifest?.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: manifest?.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: manifest?.userExplicitPrimaryStyle,
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
