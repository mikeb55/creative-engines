/**
 * Composer OS V2 — simple verse/chorus section ordering (Phase 1A).
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
