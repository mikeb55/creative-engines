/**
 * Single source of truth for Composer OS user output locations.
 * Default: <Documents>/Mike Composer Files/<preset folder>
 * Override: set COMPOSER_OS_OUTPUT_DIR to replace "Mike Composer Files" root (preset subfolders still apply).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const MIKE_COMPOSER_FILES_ROOT = 'Mike Composer Files';

/** Preset id → subfolder under the composer files root (exact names requested). */
export const PRESET_OUTPUT_SUBFOLDER: Record<string, string> = {
  guitar_bass_duo: 'Guitar-Bass Duos',
  guitar_bass_duo_single_line: 'Guitar-Bass Duo Single-Line',
  big_band: 'Big-Band Compositions',
  ecm_chamber: 'ECM Chamber Compositions',
  string_quartet: 'String Quartet Compositions',
  song_mode: 'Song Mode',
  riff_generator: 'Riffs',
};

export function getUserDocumentsPath(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(home, 'Documents');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Documents');
  }
  return path.join(home, 'Documents');
}

/**
 * Root folder (Mike Composer Files). COMPOSER_OS_OUTPUT_DIR replaces this entire root when set.
 */
export function getComposerFilesRoot(): string {
  const env = process.env.COMPOSER_OS_OUTPUT_DIR?.trim();
  if (env) {
    return path.resolve(env);
  }
  return path.join(getUserDocumentsPath(), MIKE_COMPOSER_FILES_ROOT);
}

export function getPresetOutputSubfolder(presetId: string): string {
  return PRESET_OUTPUT_SUBFOLDER[presetId] ?? PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo;
}

/** For tests / UI: folder name for a preset id. */
export function expectedPresetFolderName(presetId: string): string {
  return getPresetOutputSubfolder(presetId);
}

/**
 * Resolves the Composer OS library root: explicit `libraryRoot` (from IPC / HTTP) wins;
 * otherwise `COMPOSER_OS_OUTPUT_DIR` or default Documents/Mike Composer Files.
 */
export function resolveComposerLibraryRoot(libraryRoot?: string): string {
  const t = libraryRoot?.trim();
  if (t) {
    return path.resolve(t);
  }
  return getComposerFilesRoot();
}

/** Canonical directory where MusicXML is written (manifests go under `_meta`). */
export function getOutputDirectoryForPreset(presetId: string, libraryRoot?: string): string {
  const root = resolveComposerLibraryRoot(libraryRoot);
  const sub = getPresetOutputSubfolder(presetId);
  return path.join(root, sub);
}

export function ensureOutputDirectoryForPreset(presetId: string, libraryRoot?: string): string {
  const dir = getOutputDirectoryForPreset(presetId, libraryRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Songwriting engine (Phase 1) — subfolder under the Composer OS library root only. */
export const SONG_ENGINE_OUTPUT_KINDS = ['songs'] as const;
export type SongEngineOutputKind = (typeof SONG_ENGINE_OUTPUT_KINDS)[number];

const SONG_ENGINE_SUBFOLDER: Record<SongEngineOutputKind, string> = {
  songs: 'Songs',
};

/**
 * Canonical output directory for the minimal songwriting engine, e.g. `getOutputPath('songs')`
 * → `<library root>/Songs`. Uses `resolveComposerLibraryRoot` (IPC / env / Documents) — no AppData bundle paths.
 */
export function getOutputPath(kind: SongEngineOutputKind, libraryRoot?: string): string {
  const sub = SONG_ENGINE_SUBFOLDER[kind];
  return path.join(resolveComposerLibraryRoot(libraryRoot), sub);
}

/** Internal subfolder under each preset output dir for `.manifest.json` files (MusicXML stays next to user). */
export const OUTPUT_META_FOLDER = '_meta';

/** Canonical path for the disk manifest JSON for a given MusicXML file. */
export function manifestPathForMusicXml(xmlFilepath: string): string {
  const dir = path.dirname(xmlFilepath);
  const base = path.basename(xmlFilepath).replace(/\.musicxml$/i, '');
  return path.join(dir, OUTPUT_META_FOLDER, `${base}.manifest.json`);
}

/** Pre-`_meta` layout (read fallback only). */
export function legacyManifestPathForMusicXml(xmlFilepath: string): string {
  return xmlFilepath.replace(/\.musicxml$/i, '.manifest.json');
}

/**
 * When opening Explorer/Finder, never land inside `_meta` — strip to the composition folder.
 * Accepts a folder path or a file path (e.g. manifest or MusicXML).
 */
export function normalizeLibraryFolderOpenTarget(pathOrFile: string): string {
  let r = path.resolve(pathOrFile);
  try {
    if (fs.existsSync(r) && fs.statSync(r).isFile()) {
      r = path.dirname(r);
    }
  } catch {
    /* use path as-is */
  }
  while (path.basename(r) === OUTPUT_META_FOLDER) {
    const parent = path.dirname(r);
    if (parent === r) break;
    r = parent;
  }
  return r;
}

/** Whether `candidate` is the composer root or any preset subfolder under it. */
export function isPathUnderComposerRoot(composerRoot: string, candidate: string): boolean {
  const r = path.normalize(path.resolve(composerRoot));
  const c = path.normalize(path.resolve(candidate));
  if (process.platform === 'win32') {
    const rl = r.toLowerCase();
    const cl = c.toLowerCase();
    if (cl === rl) return true;
    const prefix = rl.endsWith('\\') ? rl : `${rl}\\`;
    return cl.startsWith(prefix);
  }
  if (c === r) return true;
  const prefix = r.endsWith(path.sep) ? r : r + path.sep;
  return c.startsWith(prefix);
}

/**
 * Canonical folder to open for "library" or "this file's folder" (desktop + API).
 * Same rules for IPC, HTTP, and Electron main process.
 */
export function resolveOpenFolderTarget(
  composerRoot: string,
  body?: { path?: string }
): { ok: true; target: string } | { ok: false; message: string } {
  let target = path.resolve(composerRoot);
  if (body?.path && typeof body.path === 'string' && body.path.trim()) {
    const resolved = path.normalize(path.resolve(body.path.trim()));
    if (!isPathUnderComposerRoot(composerRoot, resolved)) {
      return {
        ok: false,
        message: 'That folder is not part of your Composer OS output library.',
      };
    }
    target = normalizeLibraryFolderOpenTarget(resolved);
    if (!isPathUnderComposerRoot(composerRoot, target)) {
      return {
        ok: false,
        message: 'That folder is not part of your Composer OS output library.',
      };
    }
  }
  return { ok: true, target };
}
