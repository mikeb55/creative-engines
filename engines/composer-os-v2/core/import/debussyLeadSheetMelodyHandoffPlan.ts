/**
 * Phase 3 - debussy leadsheet-input melody hand-off plan (8-bar proof fixture).
 */

import type { LineRole } from '../counterpoint/abstractLineSet';
import { SQ_PART_V1, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';

export type DebussyMelodyHandoffPartId = 'guitar' | typeof SQ_PART_V1 | typeof SQ_PART_VC;

export interface DebussyLeadSheetMelodyHandoffSegment {
  startBar: number;
  endBar: number;
  melodyPartId: DebussyMelodyHandoffPartId;
  engineLineRole?: LineRole;
  pitchShiftSemitones?: number;
}

export const DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN: readonly DebussyLeadSheetMelodyHandoffSegment[] = [
  { startBar: 1, endBar: 2, melodyPartId: 'guitar' },
  { startBar: 3, endBar: 4, melodyPartId: SQ_PART_V1, engineLineRole: 'soprano' },
  { startBar: 5, endBar: 6, melodyPartId: SQ_PART_VC, engineLineRole: 'bass' },
  { startBar: 7, endBar: 8, melodyPartId: 'guitar' },
];

export interface PerBarMelodyOwnership {
  bar: number;
  ownerPartId: DebussyMelodyHandoffPartId;
}

export function buildPerBarMelodyOwnership(
  plan: readonly DebussyLeadSheetMelodyHandoffSegment[] = DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN,
  totalBars = 8,
): PerBarMelodyOwnership[] {
  const out: PerBarMelodyOwnership[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const seg = plan.find((s) => bar >= s.startBar && bar <= s.endBar);
    if (!seg) throw new Error(`no melody owner for bar ${bar}`);
    out.push({ bar, ownerPartId: seg.melodyPartId });
  }
  return out;
}