/**
 * E2 ECM guitar / upright bass adapter.
 * Guitar stacks need a string/fret witness. A solver that drops notes is a refusal.
 */

import { planEcmTextureBars } from './ecmTextureEngine';
import { GUITAR_OPEN_STRING_MIDIS, solveGuitarGrip } from '../guitar/voicingFeasibility';
import { e2Roster, resolveCatalogueInstrument } from '../orchestrate/ensembleTemplates';
import { partsFromRoster, type E2Assignment, type E2PartSpec } from '../orchestrate/e2Placement';
import type { E2RealisedPlacement } from '../orchestrate/harmonicRealisation';
import { qAdd, qCmp } from '../piano/pianoExactTiming';

export interface GuitarAssignment {
  /** 1 is the high E string. */
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  midi: number;
}

export interface GuitarGripWitness {
  id: string;
  slotIds: readonly string[];
  assignments: readonly GuitarAssignment[];
}

export function gripMatches(witness: GuitarGripWitness, midis: readonly number[]): boolean {
  if (witness.assignments.length !== midis.length) return false;
  const strings = new Set<number>();
  const fretted: number[] = [];
  for (const assignment of witness.assignments) {
    if (strings.has(assignment.stringNumber)) return false;
    strings.add(assignment.stringNumber);
    if (assignment.fret < 0 || assignment.fret > 22) return false;
    const open = GUITAR_OPEN_STRING_MIDIS[6 - assignment.stringNumber];
    if (open === undefined || open + assignment.fret !== assignment.midi) return false;
    if (assignment.fret > 0) fretted.push(assignment.fret);
  }
  if (fretted.length) {
    const span = Math.max(...fretted) - Math.min(...fretted);
    if (span > 4) return false;
  }
  const wanted = [...midis].sort((a, b) => a - b).join(',');
  const got = witness.assignments.map((item) => item.midi).sort((a, b) => a - b).join(',');
  return wanted === got;
}

export interface EcmAdaptation {
  parts: E2PartSpec[];
  assignments: E2Assignment[];
  textureBars: number;
  witnessIds: readonly string[];
}

export function adaptEcmDuo(
  placements: readonly E2RealisedPlacement[],
  witnesses: readonly GuitarGripWitness[],
  seed: number,
  partOf: (placement: E2RealisedPlacement) => string = (placement) => placement.logicalVoiceId,
): { ok: true; adaptation: EcmAdaptation } | { ok: false; reason: string } {
  const texture = planEcmTextureBars(4, 'ECM_SCHNEIDER_CHAMBER', seed);
  const roster = e2Roster('ecm-duo');
  if (roster.length !== 2) return { ok: false, reason: 'ECM duo roster left two parts' };
  const parts = partsFromRoster(roster, resolveCatalogueInstrument);
  const stacks = new Map<string, E2RealisedPlacement[]>();
  for (const placement of placements) {
    if (partOf(placement) !== 'guitar' && partOf(placement) !== 'bass') {
      return { ok: false, reason: `ECM duo has no part ${partOf(placement)}` };
    }
    if (partOf(placement) === 'bass') continue;
    const key = `${placement.attack.onset.n}/${placement.attack.onset.d}`;
    const list = stacks.get(key) ?? [];
    list.push(placement);
    stacks.set(key, list);
  }
  const witnessIds: string[] = [];
  const held: Array<{ until: ReturnType<typeof qAdd>; assignment: GuitarAssignment }> = [];
  const ordered = [...stacks.entries()].sort((a, b) => {
    const left = a[1][0]!.attack.onset;
    const right = b[1][0]!.attack.onset;
    return qCmp(left, right);
  });
  for (const [, list] of ordered) {
    const midis = list.map((item) => item.attack.pitch.midi);
    const witness = witnesses.find((item) => list.every((placement) => item.slotIds.includes(placement.slotId)) && gripMatches(item, midis));
    if (!witness) return { ok: false, reason: 'guitar stack has no grip witness' };
    const solved = solveGuitarGrip(midis);
    if (solved.frets.length !== 0 && solved.frets.length < midis.length) {
      return { ok: false, reason: 'guitar solver reduced the requested density' };
    }
    const onset = list[0]!.attack.onset;
    const release = list.reduce((end, item) => qCmp(qAdd(item.attack.onset, item.attack.duration), end) > 0 ? qAdd(item.attack.onset, item.attack.duration) : end, onset);
    for (const assignment of witness.assignments) {
      for (const previous of held) {
        if (qCmp(onset, previous.until) < 0 && previous.assignment.stringNumber === assignment.stringNumber && previous.assignment.fret !== assignment.fret) {
          return { ok: false, reason: `guitar string ${assignment.stringNumber} is still held` };
        }
      }
    }
    for (const assignment of witness.assignments) held.push({ until: release, assignment });
    witnessIds.push(witness.id);
  }
  return {
    ok: true,
    adaptation: {
      parts,
      assignments: placements.map((placement) => ({ placementId: placement.id, partId: partOf(placement), voice: 1 })),
      textureBars: texture.length,
      witnessIds,
    },
  };
}
