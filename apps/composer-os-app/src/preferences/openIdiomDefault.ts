/**
 * User preference: allow open/unresolved terminal endings by default (open_idiom UX).
 * Default OFF - preserves terminal finalBarTension hard-fail unless user opts in.
 * Persisted in localStorage; does not change the numeric >0.7 threshold.
 */

export const OPEN_IDIOM_DEFAULT_STORAGE_KEY = 'composerOs.openIdiomDefault';

/** Read preference; missing/invalid -> false (opted out). */
export function readOpenIdiomDefault(): boolean {
  try {
    return localStorage.getItem(OPEN_IDIOM_DEFAULT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist preference (`true` / `false` string). */
export function writeOpenIdiomDefault(value: boolean): void {
  try {
    localStorage.setItem(OPEN_IDIOM_DEFAULT_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore quota / private mode */
  }
}