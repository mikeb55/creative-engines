/**
 * Launch the packaged portable exe once (detached). Dev/deploy tooling; Windows-focused.
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type LaunchResult =
  | { launched: true; pid: number; launchTarget: string }
  | { launched: false; reason: string };

/**
 * Starts the packaged app without a blocking shell. Does not start Vite or repo dev scripts.
 * `launchTarget` is the normalized path passed to spawn (must match the packaged portable exe).
 */
export function launchInstalledDesktopApp(exePath: string): LaunchResult {
  const resolved = fs.existsSync(exePath) ? path.resolve(exePath) : '';
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
    return { launched: true, pid: child.pid, launchTarget: resolved };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { launched: false, reason: msg };
  }
}
