/**
 * Pure rules for matching Composer OS Desktop packaged portable processes (unit-tested).
 */

/** Windows process name (no .exe) from Get-Process / tasklist name column. */
export function processNameMatchesComposerOsPortable(name: string): boolean {
  const n = name.trim();
  if (/^Composer-OS$/i.test(n)) return true;
  if (/^Composer-OS\.exe$/i.test(n)) return true;
  return /^Composer-OS-Desktop-.+-portable$/i.test(n);
}

/** Full file name of the portable executable. */
export function fileNameMatchesComposerOsPortable(fileName: string): boolean {
  const n = fileName.trim();
  if (/^Composer-OS\.exe$/i.test(n)) return true;
  return /^Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(n);
}

/** Executable path from Win32 (may include mixed slashes). */
export function executablePathMatchesComposerOsPortable(absolutePath: string): boolean {
  const n = absolutePath.replace(/\//g, '\\');
  if (/Composer-OS\.exe$/i.test(n)) return true;
  return /Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(n);
}
