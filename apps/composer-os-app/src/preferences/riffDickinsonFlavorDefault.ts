/**
 * User preference: apply Dickinson southern flavor on jimmy_herring riffs.
 * Default OFF - preserves stock JH output unless user opts in (openIdiomDefault pattern).
 */
export const RIFF_DICKINSON_FLAVOR_STORAGE_KEY = 'composerOs.riffDickinsonFlavor';

/** Read preference; missing/invalid -> false (opted out). */
export function readRiffDickinsonFlavorDefault(): boolean {
  try {
    return localStorage.getItem(RIFF_DICKINSON_FLAVOR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist preference. */
export function writeRiffDickinsonFlavorDefault(value: boolean): void {
  try {
    localStorage.setItem(RIFF_DICKINSON_FLAVOR_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}