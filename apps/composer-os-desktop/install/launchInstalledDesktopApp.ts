/**
 * Launch the packaged portable exe once (detached). Dev/deploy tooling; Windows-focused.
 */
import { spawn } from 'child_process';
import * as fs from 'fs';

export type LaunchResult = { launched: true } | { launched: false; reason: string };

/**
 * Starts the packaged app without a blocking shell. Does not start Vite or repo dev scripts.
 */
export function launchInstalledDesktopApp(exePath: string): LaunchResult {
  const resolved = fs.existsSync(exePath) ? exePath : '';
  if (!resolved) {
    return { launched: false, reason: `Executable not found: ${exePath}` };
  }
  try {
    const child = spawn(resolved, [], {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: false,
    });
    child.unref();
    if (child.pid === undefined) {
      return { launched: false, reason: 'Process did not start (no pid)' };
    }
    return { launched: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { launched: false, reason: msg };
  }
}
