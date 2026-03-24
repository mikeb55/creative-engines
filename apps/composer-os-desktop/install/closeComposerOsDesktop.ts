/**
 * Best-effort close of running Composer OS Desktop portable processes (Windows).
 * Only targets Win32 processes whose image name or executable path matches the packaged portable pattern.
 */
import { execFileSync } from 'child_process';
import {
  executablePathMatchesComposerOsPortable,
  fileNameMatchesComposerOsPortable,
  processNameMatchesComposerOsPortable,
} from './processMatchers';

export type CloseComposerOsDesktopResult = {
  /** False on non-Windows (nothing to do). */
  ran: boolean;
  /** PIDs we successfully terminated. */
  closedPids: number[];
  /** Set when PowerShell reported stderr or partial failure. */
  warning?: string;
};

function runCloseScript(): { pids: number[]; stderr: string } {
  const script = [
    '$ErrorActionPreference = "Continue"',
    '$out = @()',
    'Get-CimInstance Win32_Process | Where-Object {',
    "  ($_.ExecutablePath -match 'Composer-OS-Desktop-[\\d.]+-portable\\.exe$') -or",
    "  ($_.Name -match '^Composer-OS-Desktop-[\\d.]+-portable\\.exe$')",
    '} | ForEach-Object {',
    '  try {',
    '    Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop',
    '    $out += $_.ProcessId',
    '  } catch { }',
    '}',
    '$out -join ","',
  ].join(' ');

  try {
    const out = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 2 * 1024 * 1024 }
    );
    return { pids: parsePidCsv(out), stderr: '' };
  } catch (e) {
    const err = e as { stderr?: Buffer; message?: string };
    const stderr = err.stderr ? String(err.stderr) : err.message ?? String(e);
    return { pids: [], stderr };
  }
}

function parsePidCsv(text: string): number[] {
  const t = text.trim();
  if (!t) return [];
  return t
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Closes stale Composer OS Desktop portable instances. Safe on non-Windows (no-op).
 */
export function closeStaleComposerOsDesktopProcesses(): CloseComposerOsDesktopResult {
  if (process.platform !== 'win32') {
    return { ran: false, closedPids: [] };
  }
  const { pids, stderr } = runCloseScript();
  return {
    ran: true,
    closedPids: pids,
    warning: stderr.trim() || undefined,
  };
}

/** Exported for tests — mirrors Win32 matching rules without WMI. */
export function wouldConsiderProcessForClose(args: {
  processName: string;
  executablePath: string | null;
}): boolean {
  const { processName, executablePath } = args;
  if (executablePath && executablePathMatchesComposerOsPortable(executablePath)) return true;
  const n = processName.trim();
  if (fileNameMatchesComposerOsPortable(n)) return true;
  if (!/\.exe$/i.test(n) && processNameMatchesComposerOsPortable(n)) return true;
  return false;
}
