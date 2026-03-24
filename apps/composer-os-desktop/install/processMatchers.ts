/**
 * Pure rules for matching Composer OS Desktop packaged portable processes (unit-tested).
 */

/** Windows process name (no .exe) from Get-Process / tasklist name column. */
export function processNameMatchesComposerOsPortable(name: string): boolean {
  return /^Composer-OS-Desktop-.+-portable$/i.test(name.trim());
}

/** Full file name of the portable executable. */
export function fileNameMatchesComposerOsPortable(fileName: string): boolean {
  return /^Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(fileName.trim());
}

/** Executable path from Win32 (may include mixed slashes). */
export function executablePathMatchesComposerOsPortable(absolutePath: string): boolean {
  const n = absolutePath.replace(/\//g, '\\');
  return /Composer-OS-Desktop-[\d.]+-portable\.exe$/i.test(n);
}
