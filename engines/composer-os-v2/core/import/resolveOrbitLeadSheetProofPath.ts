/**
 * Resolve Orbit 8-bar leadsheet MusicXML for quintet proof + GCE/LOCK eval.
 */

import fs from 'fs';
import path from 'path';

/** Phase 7 local Orbit fixture (first 8 bars, 4/4). */
export const ORBIT_LEADSHEET_PROOF_CANDIDATES: readonly string[] = [
  'C:/Dev/Guitar and String Quartet/outputs/Orbit in 4_4 - first 8 bars only 15 June 2026.musicxml',
  path.join(__dirname, '..', '..', '..', '..', 'charts', 'Orbit', '01_leadsheet', 'ORBIT-lead.xml'),
];

export function resolveOrbitLeadSheetProofPath(fromDir?: string): string | null {
  const env = process.env.ORBIT_LEADSHEET_PROOF_PATH?.trim();
  if (env && fs.existsSync(env)) return path.resolve(env);

  for (const candidate of ORBIT_LEADSHEET_PROOF_CANDIDATES) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.join(fromDir ?? path.join(__dirname, '..', '..'), candidate);
    if (fs.existsSync(resolved)) return path.resolve(resolved);
  }

  return null;
}
