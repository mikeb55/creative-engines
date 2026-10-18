/**
 * E2 C — scheduled polychord, triad-pair and dyad-pair realisation.
 * Primitive attacks stay in harmonicColour.ts. This file only schedules them.
 */

import { applyOperator } from '../motif-ops/operators';
import type { Motif } from '../motif-ops/types';
import { q, qAdd, qCmp, qEq, qToNumber, type ExactQuarter } from '../piano/pianoExactTiming';
import {
  contraryDyad,
  dyadParent,
  harmonicReceipt,
  realiseAlternateBar,
  realiseSimultaneous,
  realiseSuperpose,
  sameInterval,
  type HarmonicReceipt,
} from './harmonicColour';
import type {
  DyadParent,
  HarmonicIntent,
  HarmonicRegion,
  MemberRef,
  SoundingAttack,
  SpelledRegister,
  TriadParent,
} from './harmonicColourTypes';
import type { EventLineage } from './sourceFoundation';
import { parametersHash } from './sourceFoundation';
import { verifyExpandedLocks, type ExpandedLock } from './e2LockBoundary';
import type { LockPolicy } from './sourceLocks';
import type { SourceBundle } from './sourceFoundation';

export const E2_REALISATION_VERSION = 'e2-harmonic-realisation-1';

export interface E2RealisedPlacement {
  id: string;
  attack: SoundingAttack;
  lineage: EventLineage;
  regionId: string;
  slotId: string;
  logicalVoiceId: string;
  occurrence: number;
  tieChainId?: string;
  sourceNotationEventIds: readonly string[];
}

export interface E2RestWindow {
  logicalVoiceId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
  reason: 'source' | 'phrase-space' | 'capacity' | 'dialogue';
  regionId: string;
  slotId: string;
}

export interface ScheduledSlot {
  regionId: string;
  slotId: string;
  logicalVoiceId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
  parent: 'upper' | 'lower' | 'a' | 'b' | 'both';
  /** Omitted means every member of the chosen parent, or both parents when parent is both. */
  memberIds?: readonly string[];
  /** Arpeggiate memberIds (or all members) at this duration each, from onset. */
  arpeggio?: boolean;
  occurrence?: number;
  rest?: boolean;
  restReason?: E2RestWindow['reason'];
  sourceEventIds?: readonly string[];
  tieChainId?: string;
}

export interface FullAnchor {
  regionId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
}

export interface RealiseInput {
  regions: readonly HarmonicRegion[];
  schedule: readonly ScheduledSlot[];
  seed: number;
  fullAnchors?: readonly FullAnchor[];
  allowReduced?: boolean;
  source?: SourceBundle;
  lockPolicy?: LockPolicy;
  sourceXml?: string;
}

export interface CommonToneFact {
  pitchClass: number;
  spelling: string;
  midi: number;
  sustained: boolean;
}

export interface RealisationReceipt {
  version: typeof E2_REALISATION_VERSION;
  seed: number;
  parametersHash: string;
  primitive: HarmonicReceipt | null;
  placements: readonly E2RealisedPlacement[];
  rests: readonly E2RestWindow[];
  fullAnchors: readonly { regionId: string; complete: boolean; simultaneous: boolean }[];
  commonTones: readonly CommonToneFact[];
  lock: ExpandedLock | null;
  development: readonly { slotId: string; operator: string; memberOrder: readonly string[] }[];
}

export type RealisationResult =
  | { ok: true; receipt: RealisationReceipt }
  | { ok: false; reason: string };

function regionOf(regions: readonly HarmonicRegion[], id: string): HarmonicRegion {
  const region = regions.find((item, index) => (item.intent.id || `region-${index}`) === id);
  if (!region) throw new Error(`missing region ${id}`);
  return region;
}

function parentsOf(intent: HarmonicIntent, which: ScheduledSlot['parent']): Array<TriadParent | DyadParent> {
  if (intent.kind === 'polychord') {
    if (which === 'both') return [intent.lower, intent.upper];
    if (which === 'upper') return [intent.upper];
    if (which === 'lower') return [intent.lower];
    throw new Error('polychord slot cannot name triad-pair parents');
  }
  if (intent.kind === 'triad-pair') {
    if (which === 'both') return [intent.a, intent.b];
    if (which === 'a') return [intent.a];
    if (which === 'b') return [intent.b];
    throw new Error('triad-pair slot cannot name polychord parents');
  }
  if (which === 'both') return [intent.a, intent.b];
  if (which === 'a') return [intent.a];
  if (which === 'b') return [intent.b];
  throw new Error('dyad-pair slot cannot name polychord parents');
}

function membersOf(parent: TriadParent | DyadParent): readonly { id: string; pitch: SpelledRegister; ref: MemberRef }[] {
  if ('voices' in parent) return parent.voices.map((voice) => ({ id: voice.ref.memberId, pitch: voice.pitch, ref: voice.ref }));
  return parent.members.map((voice) => ({ id: voice.ref.memberId, pitch: voice.pitch, ref: voice.ref }));
}

function covers(attack: SoundingAttack, onset: ExactQuarter, duration: ExactQuarter): boolean {
  if (attack.rest) return false;
  const end = qAdd(attack.onset, attack.duration);
  const anchorEnd = qAdd(onset, duration);
  return qCmp(attack.onset, onset) <= 0 && qCmp(end, anchorEnd) >= 0;
}

function overlapNonzero(left: SoundingAttack, right: SoundingAttack): boolean {
  if (left.rest || right.rest) return false;
  const leftEnd = qAdd(left.onset, left.duration);
  const rightEnd = qAdd(right.onset, right.duration);
  return qCmp(left.onset, rightEnd) < 0 && qCmp(right.onset, leftEnd) < 0;
}

function spelling(pitch: SpelledRegister): string {
  const alter = pitch.alter === 0 ? '' : pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : '#'.repeat(pitch.alter);
  return `${pitch.step}${alter}${pitch.octave}`;
}

export function developMemberOrder(memberIds: readonly string[], seed: number): { order: string[]; operator: string } {
  const motif: Motif = {
    id: 'e2-cell',
    events: memberIds.map((id, index) => ({ onset: index, duration: 0.5, midi: index })),
  };
  const reversed = applyOperator(motif, 'retrograde');
  const order = reversed.motif.events.map((event) => memberIds[event.midi]!).filter((id): id is string => !!id);
  if (order.length !== memberIds.length) {
    return { order: [...memberIds].reverse(), operator: 'retrograde' };
  }
  return { order, operator: `retrograde:${seed}` };
}

export function realiseScheduled(input: RealiseInput): RealisationResult {
  let lock: ExpandedLock | null = null;
  if (input.source && input.lockPolicy) {
    const checked = verifyExpandedLocks(input.source, input.source, input.lockPolicy, input.sourceXml);
    lock = checked.expansion;
    if (!checked.report.ok) {
      return { ok: false, reason: `source lock failed before allocation: ${checked.report.failures.map((item) => item.detail).join('; ')}` };
    }
    if (checked.expansion.mode === 'zero' && input.lockPolicy.selectedSourceEventIds.length === 0 && input.lockPolicy.spans.length === 0) {
      return { ok: false, reason: 'empty selection was treated as unrestricted' };
    }
  }

  const placements: E2RealisedPlacement[] = [];
  const rests: E2RestWindow[] = [];
  const development: RealisationReceipt['development'] = [];
  let primitive: HarmonicReceipt | null = null;

  try {
    for (const slot of input.schedule) {
      const region = regionOf(input.regions, slot.regionId);
      const occurrence = slot.occurrence ?? 1;
      if (slot.rest) {
        rests.push({
          logicalVoiceId: slot.logicalVoiceId,
          onset: slot.onset,
          duration: slot.duration,
          reason: slot.restReason ?? 'phrase-space',
          regionId: slot.regionId,
          slotId: slot.slotId,
        });
        continue;
      }
      const parents = parentsOf(region.intent, slot.parent);
      if (
        region.intent.kind === 'polychord'
        && slot.parent === 'both'
        && !slot.memberIds
        && !slot.arpeggio
      ) {
        const attacks = realiseSimultaneous(region.intent, slot.onset, slot.duration);
        if (!primitive) primitive = harmonicReceipt(region.intent, attacks, input.seed, 'realiseSimultaneous');
        pushAttacks(placements, attacks, slot, region.intent.id, occurrence);
        continue;
      }
      if (
        region.intent.kind === 'triad-pair'
        && slot.parent === 'both'
        && !slot.memberIds
        && !slot.arpeggio
      ) {
        const attacks = realiseSuperpose(region.intent.a, region.intent.b, slot.onset, slot.duration);
        if (!primitive) primitive = harmonicReceipt(region.intent, attacks, input.seed, 'realiseSuperpose');
        pushAttacks(placements, attacks, slot, region.intent.id, occurrence);
        continue;
      }
      let cursor = slot.onset;
      for (const parent of parents) {
        let ids = slot.memberIds ? [...slot.memberIds] : membersOf(parent).map((member) => member.id);
        if (slot.arpeggio && slot.slotId.endsWith(':return')) {
          const developed = developMemberOrder(ids, input.seed);
          ids = developed.order;
          development.push({ slotId: slot.slotId, operator: developed.operator, memberOrder: ids });
        }
        const chosen = ids.map((id) => {
          const member = membersOf(parent).find((item) => item.id === id);
          if (!member) throw new Error(`${parent.id} has no member ${id}`);
          return member;
        });
        if (slot.arpeggio) {
          for (const member of chosen) {
            placements.push(placementOf(slot, region.intent.id, occurrence, cursor, slot.duration, member.pitch, [member.ref]));
            cursor = qAdd(cursor, slot.duration);
          }
        } else {
          for (const member of chosen) {
            placements.push(placementOf(slot, region.intent.id, occurrence, slot.onset, slot.duration, member.pitch, [member.ref]));
          }
        }
      }
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }

  const anchorFacts: RealisationReceipt['fullAnchors'] = [];
  for (const anchor of input.fullAnchors ?? []) {
    const region = input.regions.find((item) => item.intent.id === anchor.regionId);
    if (!region || region.intent.kind === 'dyad-pair') {
      return { ok: false, reason: `full anchor ${anchor.regionId} is not a triadic region` };
    }
    const required = region.intent.kind === 'polychord'
      ? [region.intent.lower, region.intent.upper]
      : [region.intent.a, region.intent.b];
    const local = placements.filter((item) => item.regionId === anchor.regionId).map((item) => item.attack);
    let complete = true;
    for (const parent of required) {
      for (const voice of parent.voices) {
        const hit = local.find((attack) => covers(attack, anchor.onset, anchor.duration)
          && attack.pitch.midi === voice.pitch.midi
          && attack.members.some((member) => member.parentId === parent.id && member.memberId === voice.ref.memberId));
        if (!hit) complete = false;
      }
    }
    const sounded = local.filter((attack) => !attack.rest && qCmp(attack.onset, qAdd(anchor.onset, anchor.duration)) < 0 && qCmp(qAdd(attack.onset, attack.duration), anchor.onset) > 0);
    const simultaneous = sounded.length > 0 && sounded.every((attack) => sounded.every((other) => overlapNonzero(attack, other) || attack === other));
    if (!complete && !input.allowReduced) {
      return { ok: false, reason: `full realisation infeasible at ${anchor.regionId}` };
    }
    if (complete && !simultaneous && !input.allowReduced) {
      return { ok: false, reason: `bar-wide union is not a simultaneous realisation at ${anchor.regionId}` };
    }
    anchorFacts.push({ regionId: anchor.regionId, complete, simultaneous });
  }

  const ids = new Set<string>();
  for (const placement of placements) {
    if (ids.has(placement.id)) return { ok: false, reason: `duplicate placement ${placement.id}` };
    ids.add(placement.id);
    if (placement.attack.rest) return { ok: false, reason: 'a rest was stored as a sounding placement' };
  }

  return {
    ok: true,
    receipt: {
      version: E2_REALISATION_VERSION,
      seed: input.seed,
      parametersHash: parametersHash({
        version: E2_REALISATION_VERSION,
        seed: input.seed,
        schedule: input.schedule,
        regions: input.regions.map((region) => region.intent.id),
      }),
      primitive,
      placements,
      rests,
      fullAnchors: anchorFacts,
      commonTones: commonTones(placements),
      lock,
      development,
    },
  };
}

function pushAttacks(
  placements: E2RealisedPlacement[],
  attacks: readonly SoundingAttack[],
  slot: ScheduledSlot,
  intentId: string,
  occurrence: number,
): void {
  for (const attack of attacks) {
    if (attack.rest) continue;
    const member = attack.members[0]?.memberId ?? 'shared';
    placements.push({
      id: `${slot.regionId}:${slot.slotId}:${occurrence}:${member}:${attack.pitch.midi}`,
      attack: { ...attack, eventId: `${slot.regionId}:${slot.slotId}:${occurrence}:${attack.eventId}` },
      lineage: lineageFor(slot, intentId),
      regionId: slot.regionId,
      slotId: slot.slotId,
      logicalVoiceId: slot.logicalVoiceId,
      occurrence,
      ...(slot.tieChainId ? { tieChainId: slot.tieChainId } : {}),
      sourceNotationEventIds: slot.sourceEventIds ?? [],
    });
  }
}

function placementOf(
  slot: ScheduledSlot,
  intentId: string,
  occurrence: number,
  onset: ExactQuarter,
  duration: ExactQuarter,
  pitch: SpelledRegister,
  members: readonly MemberRef[],
): E2RealisedPlacement {
  const member = members.map((item) => item.memberId).join('+');
  return {
    id: `${slot.regionId}:${slot.slotId}:${occurrence}:${member}:${pitch.midi}:${qToNumber(onset)}`,
    attack: {
      eventId: `${slot.regionId}:${slot.slotId}:${occurrence}:${member}`,
      onset,
      duration,
      pitch,
      members,
      rest: false,
    },
    lineage: lineageFor(slot, intentId),
    regionId: slot.regionId,
    slotId: slot.slotId,
    logicalVoiceId: slot.logicalVoiceId,
    occurrence,
    ...(slot.tieChainId ? { tieChainId: slot.tieChainId } : {}),
    sourceNotationEventIds: slot.sourceEventIds ?? [],
  };
}

function lineageFor(slot: ScheduledSlot, intentId: string): EventLineage {
  return {
    eventId: `${slot.regionId}:${slot.slotId}`,
    origin: slot.sourceEventIds && slot.sourceEventIds.length > 0 ? 'source' : 'generated',
    sourceEventIds: slot.sourceEventIds ?? [],
    parentEventIds: [],
    operation: {
      id: intentId,
      version: E2_REALISATION_VERSION,
      parametersHash: parametersHash({ slot: slot.slotId, intentId }),
    },
  };
}

function commonTones(placements: readonly E2RealisedPlacement[]): CommonToneFact[] {
  const byPc = new Map<number, E2RealisedPlacement[]>();
  for (const placement of placements) {
    const pc = ((placement.attack.pitch.midi % 12) + 12) % 12;
    const list = byPc.get(pc) ?? [];
    list.push(placement);
    byPc.set(pc, list);
  }
  const facts: CommonToneFact[] = [];
  for (const [pitchClass, rows] of byPc) {
    if (rows.length < 2) continue;
    const first = rows[0]!.attack.pitch;
    const sustained = rows.some((row, index) => rows.slice(index + 1).some((other) => overlapNonzero(row.attack, other.attack) && row.attack.pitch.midi === other.attack.pitch.midi));
    facts.push({
      pitchClass,
      spelling: spelling(first),
      midi: first.midi,
      sustained,
    });
  }
  return facts.sort((left, right) => left.pitchClass - right.pitchClass);
}

export function dyadTransformation(source: DyadParent, semitones: number, exactInterval: boolean): DyadParent | { ok: false; reason: string } {
  return contraryDyad(source, semitones, exactInterval);
}

export function intervalPreserved(left: DyadParent, right: DyadParent, mode: 'directed-semitone' | 'interval-class' | 'spelling'): boolean {
  return sameInterval(left, right, mode);
}

export function movedDyad(id: string, low: string, high: string): DyadParent {
  return dyadParent(id, low, high);
}

/** The fixed four-quarter primitive stays callable and is not a scheduler. */
export function fixedAlternateFixture(intent: Extract<HarmonicIntent, { kind: 'triad-pair' }>): SoundingAttack[] {
  return realiseAlternateBar(intent);
}

export function attacksMatchPrimitive(left: readonly SoundingAttack[], right: readonly SoundingAttack[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((attack, index) => {
    const other = right[index]!;
    return attack.pitch.midi === other.pitch.midi
      && qEq(attack.onset, other.onset)
      && qEq(attack.duration, other.duration)
      && attack.rest === other.rest
      && attack.members.length === other.members.length;
  });
}
