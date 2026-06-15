/**
 * Leadsheet-input melody hand-off plan — 8-bar proof fixture + N-bar rotation builder.
 */

import type { LineRole } from '../counterpoint/abstractLineSet';
import { SQ_PART_V1, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';
import { LEADSHEET_IMPORT_MAX_BARS } from './musicXmlToImportTimeline';

export type DebussyMelodyHandoffPartId = 'guitar' | typeof SQ_PART_V1 | typeof SQ_PART_VC;

export interface DebussyLeadSheetMelodyHandoffSegment {
  startBar: number;
  endBar: number;
  melodyPartId: DebussyMelodyHandoffPartId;
  engineLineRole?: LineRole;
  pitchShiftSemitones?: number;
}

/** Stable phrase span for hand-off segments (matches original 8-bar proof). */
export const LEADSHEET_MELODY_HANDOFF_SPAN_BARS = 2;

export const DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN: readonly DebussyLeadSheetMelodyHandoffSegment[] = [
  { startBar: 1, endBar: 2, melodyPartId: 'guitar' },
  { startBar: 3, endBar: 4, melodyPartId: SQ_PART_V1, engineLineRole: 'soprano' },
  { startBar: 5, endBar: 6, melodyPartId: SQ_PART_VC, engineLineRole: 'bass' },
  { startBar: 7, endBar: 8, melodyPartId: 'guitar' },
];

const HANDOFF_CYCLE: readonly {
  melodyPartId: DebussyMelodyHandoffPartId;
  engineLineRole?: LineRole;
}[] = [
  { melodyPartId: 'guitar' },
  { melodyPartId: SQ_PART_V1, engineLineRole: 'soprano' },
  { melodyPartId: SQ_PART_VC, engineLineRole: 'bass' },
  { melodyPartId: 'guitar' },
];

export interface PerBarMelodyOwnership {
  bar: number;
  ownerPartId: DebussyMelodyHandoffPartId;
}

/** Build rotating guitar → Vn I → Vc → guitar hand-off segments for N bars (2-bar phrases). */
export function buildLeadSheetMelodyHandoffPlan(
  totalBars: number,
): DebussyLeadSheetMelodyHandoffSegment[] {
  if (totalBars < 1) {
    throw new Error('buildLeadSheetMelodyHandoffPlan: totalBars must be >= 1');
  }
  if (totalBars > LEADSHEET_IMPORT_MAX_BARS) {
    throw new Error(
      `buildLeadSheetMelodyHandoffPlan: totalBars ${totalBars} exceeds max ${LEADSHEET_IMPORT_MAX_BARS}`,
    );
  }
  if (totalBars === 8) {
    return DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN.map((s) => ({ ...s }));
  }

  const segments: DebussyLeadSheetMelodyHandoffSegment[] = [];
  let bar = 1;
  let cycleIdx = 0;
  while (bar <= totalBars) {
    const template = HANDOFF_CYCLE[cycleIdx % HANDOFF_CYCLE.length]!;
    const remaining = totalBars - bar + 1;
    const span =
      remaining <= LEADSHEET_MELODY_HANDOFF_SPAN_BARS
        ? remaining
        : LEADSHEET_MELODY_HANDOFF_SPAN_BARS;
    const endBar = bar + span - 1;
    segments.push({
      startBar: bar,
      endBar,
      melodyPartId: template.melodyPartId,
      ...(template.engineLineRole ? { engineLineRole: template.engineLineRole } : {}),
    });
    bar = endBar + 1;
    cycleIdx += 1;
  }
  return segments;
}

export function buildPerBarMelodyOwnership(
  plan: readonly DebussyLeadSheetMelodyHandoffSegment[],
  totalBars: number,
): PerBarMelodyOwnership[] {
  const out: PerBarMelodyOwnership[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const seg = plan.find((s) => bar >= s.startBar && bar <= s.endBar);
    if (!seg) throw new Error(`no melody owner for bar ${bar}`);
    out.push({ bar, ownerPartId: seg.melodyPartId });
  }
  return out;
}
