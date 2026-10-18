/**
 * E2 string quartet adapter. Four parts. Double stops need an open-string witness.
 * Parallel-motion repair is not applied.
 */

import { quartetBarsHaveParallelMotionViolation, type QuartetBar } from './quartetVoiceLeadingGuard';
import { e2Roster, resolveCatalogueInstrument } from '../orchestrate/ensembleTemplates';
import { partsFromRoster, type E2Assignment, type E2PartSpec } from '../orchestrate/e2Placement';
import type { E2RealisedPlacement } from '../orchestrate/harmonicRealisation';
import { qEq } from '../piano/pianoExactTiming';

export interface DoubleStopWitness {
  partId: string;
  midis: readonly [number, number];
  openAdjacent: true;
}

const OPEN_PAIRS: Record<string, readonly (readonly [number, number])[]> = {
  violin: [[55, 62], [62, 69], [69, 76]],
  viola: [[48, 55], [55, 62], [62, 69]],
  cello: [[36, 43], [43, 50], [50, 57]],
};

export function openStringWitness(instrumentId: string, midis: readonly [number, number]): boolean {
  const pairs = OPEN_PAIRS[instrumentId] ?? [];
  const sorted = [...midis].sort((a, b) => a - b) as [number, number];
  return pairs.some((pair) => pair[0] === sorted[0] && pair[1] === sorted[1]);
}

export interface QuartetAdaptation {
  parts: E2PartSpec[];
  assignments: E2Assignment[];
  parallelMotion: boolean;
  repaired: false;
}

export function adaptQuartet(
  placements: readonly E2RealisedPlacement[],
  witnesses: readonly DoubleStopWitness[],
): { ok: true; adaptation: QuartetAdaptation } | { ok: false; reason: string } {
  const roster = e2Roster('string-quartet');
  if (roster.length !== 4) return { ok: false, reason: 'quartet roster left four parts' };
  const parts = partsFromRoster(roster, resolveCatalogueInstrument);
  const instrument = new Map(roster.map((slot) => [slot.partId, slot.instrumentId]));
  const groups = new Map<string, E2RealisedPlacement[]>();
  for (const placement of placements) {
    if (!instrument.has(placement.logicalVoiceId)) return { ok: false, reason: `quartet has no part ${placement.logicalVoiceId}` };
    const key = `${placement.logicalVoiceId}:${placement.attack.onset.n}/${placement.attack.onset.d}`;
    const list = groups.get(key) ?? [];
    list.push(placement);
    groups.set(key, list);
  }
  for (const [key, list] of groups) {
    const partId = key.split(':')[0]!;
    if (list.length === 1) continue;
    if (list.length !== 2) return { ok: false, reason: `${partId} cannot sustain ${list.length} notes` };
    const midis = list.map((item) => item.attack.pitch.midi).sort((a, b) => a - b) as [number, number];
    const sameLength = qEq(list[0]!.attack.duration, list[1]!.attack.duration);
    if (!sameLength) return { ok: false, reason: `${partId} double stop durations differ` };
    const witnessed = witnesses.some((witness) => witness.partId === partId && witness.openAdjacent && openStringWitness(instrument.get(partId)!, midis));
    if (!witnessed) return { ok: false, reason: `${partId} double stop has no adjacent open-string witness` };
  }
  const assignments = placements.map((placement) => ({ placementId: placement.id, partId: placement.logicalVoiceId, voice: 1 }));
  const bars = new Map<number, [number | undefined, number | undefined, number | undefined, number | undefined]>();
  const order = ['vn1', 'vn2', 'va', 'vc'];
  for (const placement of placements) {
    const bar = Math.floor(placement.attack.onset.n / placement.attack.onset.d / 4) + 1;
    const row = bars.get(bar) ?? [undefined, undefined, undefined, undefined];
    const index = order.indexOf(placement.logicalVoiceId);
    if (index >= 0 && row[index] === undefined) row[index] = placement.attack.pitch.midi;
    bars.set(bar, row);
  }
  const quartetBars: QuartetBar[] = [...bars.entries()].sort((a, b) => a[0] - b[0]).map(([barIndex, midiByPart]) => ({ barIndex, midiByPart }));
  return {
    ok: true,
    adaptation: {
      parts,
      assignments,
      parallelMotion: quartetBarsHaveParallelMotionViolation(quartetBars),
      repaired: false,
    },
  };
}

export function quartetMonophonicRefusal(pitchCount: number): { ok: false; reason: string } | { ok: true } {
  if (pitchCount > 4) return { ok: false, reason: 'four monophonic strings cannot sound more than four pitches' };
  return { ok: true };
}
