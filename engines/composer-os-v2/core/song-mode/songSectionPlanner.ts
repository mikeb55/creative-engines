/**
 * Composer OS V2 — simple verse/chorus section ordering (Phase 1A+1B).
 * Expanded section kinds exist on types; default path stays verse/chorus only (no harmony).
 */

import type { SongSectionPlan } from './songModeTypes';

/** Default structure: verse → chorus → verse → chorus. */
export function planDefaultVerseChorusStructure(): SongSectionPlan[] {
  return [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'chorus' },
    { order: 2, kind: 'verse' },
    { order: 3, kind: 'chorus' },
  ];
}
