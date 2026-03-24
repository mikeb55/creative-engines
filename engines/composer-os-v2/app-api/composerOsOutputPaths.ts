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
  big_band: 'Big-Band Compositions',
  ecm_chamber: 'ECM Chamber Compositions',
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

/** Canonical directory where MusicXML + manifests for this preset are written. */
export function getOutputDirectoryForPreset(presetId: string): string {
  const root = getComposerFilesRoot();
  const sub = getPresetOutputSubfolder(presetId);
  return path.join(root, sub);
}

export function ensureOutputDirectoryForPreset(presetId: string): string {
  const dir = getOutputDirectoryForPreset(presetId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Whether `candidate` is the composer root or any preset subfolder under it. */
export function isPathUnderComposerRoot(composerRoot: string, candidate: string): boolean {
  const r = path.resolve(composerRoot);
  const c = path.resolve(candidate);
  if (c === r) return true;
  const prefix = r.endsWith(path.sep) ? r : r + path.sep;
  return c.startsWith(prefix);
}
