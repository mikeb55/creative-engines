/**
 * Composer OS V2 — Song structure (sections + hook placement).
 */

import type { SongSectionKind, SongSectionPlan } from './songModeTypes';

export interface SongStructure {
  sections: SongSectionPlan[];
  /** Section `order` values where the hook returns (typically chorus). */
  hookBearingSectionOrders: number[];
  /** Primary hook-return section — chorus in pop-oriented Song Mode. */
  primaryHookSectionKind: 'chorus';
}

/** Chorus is the hook-return section for hook-first Song Mode. */
export function defaultHookBearingOrders(structure: { sections: SongSectionPlan[] }): number[] {
  return structure.sections.filter((s) => s.kind === 'chorus').map((s) => s.order);
}

export function structureHasChorus(structure: { sections: SongSectionPlan[] }): boolean {
  return structure.sections.some((s) => s.kind === 'chorus');
}

export function isHookBearingKind(kind: SongSectionKind): boolean {
  return kind === 'chorus';
}
