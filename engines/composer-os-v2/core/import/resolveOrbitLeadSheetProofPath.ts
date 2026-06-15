/**
 * Resolve local leadsheet MusicXML proof fixtures (Orbit 8-bar, Metaphysics full chart).
 */

import fs from 'fs';
import path from 'path';

/** Phase 7 local Orbit fixture (first 8 bars, 4/4). */
export const ORBIT_LEADSHEET_PROOF_CANDIDATES: readonly string[] = [
  'C:/Dev/Guitar and String Quartet/outputs/Orbit in 4_4 - first 8 bars only 15 June 2026.musicxml',
  path.join(__dirname, '..', '..', 'resources', 'test-fixtures', 'orbit-leadsheet', 'Orbit-Lead.xml'),
];

/** Long-form Metaphysics leadsheet (40 bars, melody + harmony). */
export const METAPHYSICS_LEADSHEET_PROOF_CANDIDATES: readonly string[] = [
  'C:/Dev/Guitar and String Quartet/outputs/V1.12-Metaphysics.musicxml',
  path.join(__dirname, '..', '..', 'resources', 'test-fixtures', 'metaphysics-leadsheet', 'V1.12-Metaphysics.musicxml'),
];

function resolveFirstExisting(candidates: readonly string[], fromDir?: string): string | null {
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.join(fromDir ?? path.join(__dirname, '..', '..'), candidate);
    if (fs.existsSync(resolved)) return path.resolve(resolved);
  }
  return null;
}

export function resolveOrbitLeadSheetProofPath(fromDir?: string): string | null {
  const env = process.env.ORBIT_LEADSHEET_PROOF_PATH?.trim();
  if (env && fs.existsSync(env)) return path.resolve(env);
  return resolveFirstExisting(ORBIT_LEADSHEET_PROOF_CANDIDATES, fromDir);
}

export function resolveMetaphysicsLeadSheetProofPath(fromDir?: string): string | null {
  const env = process.env.METAPHYSICS_LEADSHEET_PROOF_PATH?.trim();
  if (env && fs.existsSync(env)) return path.resolve(env);
  return resolveFirstExisting(METAPHYSICS_LEADSHEET_PROOF_CANDIDATES, fromDir);
}