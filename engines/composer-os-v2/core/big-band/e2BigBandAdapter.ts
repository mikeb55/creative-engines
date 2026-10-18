/**
 * E2 Big Band adapter. Planning stays section-level. Notes are individual players.
 */

import { buildBigBandOrchestrationPlan } from './buildBigBandOrchestrationPlan';
import { resolveCatalogueInstrument, e2Roster } from '../orchestrate/ensembleTemplates';
import { partsFromRoster, type E2Assignment, type E2PartSpec } from '../orchestrate/e2Placement';
import type { E2RealisedPlacement } from '../orchestrate/harmonicRealisation';
import { qAdd, qCmp } from '../piano/pianoExactTiming';

export interface BigBandAdaptation {
  parts: E2PartSpec[];
  assignments: E2Assignment[];
  planPartIds: readonly string[];
  shoutInserted: false;
}

export function adaptBigBand(placements: readonly E2RealisedPlacement[], seed: number): { ok: true; adaptation: BigBandAdaptation } | { ok: false; reason: string } {
  const plan = buildBigBandOrchestrationPlan({
    formPlan: { totalBars: 4, slices: [{ index: 0, phase: 'melody_head', startBar: 1, endBar: 4 }] },
    sectionPlan: {
      slices: [{
        formSliceIndex: 0,
        phase: 'melody_head',
        rolesBySection: {
          saxes: 'backgrounds',
          trumpets: 'lead_melody',
          trombones: 'pads',
          rhythm_section: 'bass_anchor',
        },
      }],
    },
    densityPlan: { slices: [{ formSliceIndex: 0, phase: 'melody_head', density: 'sparse' }] },
  });
  const planPartIds = plan.silenceEligibility.map((row) => row.partId);
  if (plan.sections.some((section) => section.label === 'shout_chorus')) {
    return { ok: false, reason: 'E2 band plan inserted a shout chorus' };
  }
  const roster = e2Roster('big-band');
  if (roster.length !== 16) return { ok: false, reason: `big band roster is ${roster.length}, not 16` };
  const parts = partsFromRoster(roster, resolveCatalogueInstrument);
  const pitched = parts.filter((part) => !part.drums);
  if (pitched.length !== 15) return { ok: false, reason: 'big band pitched count left the 15-player routing' };
  const known = new Set(parts.map((part) => part.partId));
  const assignments: E2Assignment[] = [];
  const occupied = new Map<string, E2RealisedPlacement[]>();
  for (const placement of placements) {
    const partId = placement.logicalVoiceId;
    if (!known.has(partId) || partId === 'drums') return { ok: false, reason: `no individual part for ${partId}` };
    const part = parts.find((item) => item.partId === partId)!;
    const pile = occupied.get(partId) ?? [];
    for (const other of pile) {
      const overlaps = qCmp(placement.attack.onset, qAdd(other.attack.onset, other.attack.duration)) < 0
        && qCmp(other.attack.onset, qAdd(placement.attack.onset, placement.attack.duration)) < 0;
      if (overlaps && part.maxSimultaneous <= 1) return { ok: false, reason: `${part.name} is monophonic` };
    }
    pile.push(placement);
    occupied.set(partId, pile);
    assignments.push({ placementId: placement.id, partId, voice: 1 });
  }
  return {
    ok: true,
    adaptation: {
      parts,
      assignments,
      planPartIds,
      shoutInserted: false,
    },
  };
}
