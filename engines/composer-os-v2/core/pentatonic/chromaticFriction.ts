/**
 * Chromatic friction.
 * Melody or bass sounding pitch class outside the candidate, with at least one
 * candidate pitch class exactly one semitone away.
 * Exact collection membership is not friction.
 * Harmony symbols, held notes, grace notes, annotations, and rests do not add duration.
 * This is a colour/tension cost, not an avoid-note rule.
 * The report and the evaluator both call `chromaticFrictionMeasure`.
 */

import { PENTATONIC_NOTE_CHOICES, parseNoteToken } from './pitch';
import type { PentatonicScoreImport } from './musicXmlScore';
import type { PentatonicPathResult } from './pathTypes';

export interface ChromaticFrictionHit {
  sourceLabel: string;
  spelling: string;
  pitchClass: number;
  nearest: readonly string[];
  role: 'melody' | 'bass';
  durationBeats: number;
}

export interface ChromaticFrictionRegion {
  measureRangeLabel: string;
  collectionName: string;
  totalDurationBeats: number;
  eligibleDurationBeats: number;
  frictionShare: number;
  hits: readonly ChromaticFrictionHit[];
}

export interface FrictionWeightedAttack {
  role: 'melody' | 'bass';
  pitchClass: number;
  duration: number;
  spelling?: string;
  sourceLabel?: string;
}

export interface ChromaticFrictionMeasure {
  frictionDuration: number;
  eligibleDuration: number;
  frictionShare: number;
  /** 1 − frictionShare. Null when there is no melody or bass duration. */
  component: number | null;
  hits: readonly {
    role: 'melody' | 'bass';
    pitchClass: number;
    duration: number;
    spelling: string;
    nearest: readonly number[];
    sourceLabel: string;
  }[];
}

function distance(left: number, right: number): number {
  const raw = Math.abs(left - right) % 12;
  return Math.min(raw, 12 - raw);
}

function quantize(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function chromaticFrictionMeasure(
  collection: readonly number[],
  attacks: readonly FrictionWeightedAttack[]
): ChromaticFrictionMeasure {
  const have = new Set(collection);
  let eligibleDuration = 0;
  let frictionDuration = 0;
  const hits: ChromaticFrictionMeasure['hits'][number][] = [];
  for (const attack of attacks) {
    if (attack.role !== 'melody' && attack.role !== 'bass') continue;
    if (!(attack.duration > 0)) continue;
    eligibleDuration += attack.duration;
    if (have.has(attack.pitchClass)) continue;
    const nearest = collection.filter((pc) => distance(pc, attack.pitchClass) === 1);
    if (nearest.length === 0) continue;
    frictionDuration += attack.duration;
    hits.push({
      role: attack.role,
      pitchClass: attack.pitchClass,
      duration: attack.duration,
      spelling: attack.spelling ?? PENTATONIC_NOTE_CHOICES[attack.pitchClass] ?? String(attack.pitchClass),
      nearest,
      sourceLabel: attack.sourceLabel ?? '',
    });
  }
  if (eligibleDuration <= 0) {
    return { frictionDuration: 0, eligibleDuration: 0, frictionShare: 0, component: null, hits: [] };
  }
  const frictionShare = frictionDuration / eligibleDuration;
  return {
    frictionDuration: quantize(frictionDuration),
    eligibleDuration: quantize(eligibleDuration),
    frictionShare: quantize(frictionShare),
    component: quantize(1 - frictionShare),
    hits,
  };
}

export function chromaticFriction(score: PentatonicScoreImport, path: PentatonicPathResult): ChromaticFrictionRegion[] {
  if (path.kind !== 'analysis' || path.segments.length === 0) return [];
  const byLabel = new Map(score.events.map((event) => [event.sourceLabel, event]));
  const regions: ChromaticFrictionRegion[] = [];
  for (const segment of path.segments) {
    if (!segment.canonicalPitchSet || segment.chosenName === 'NONE') continue;
    const collection = segment.canonicalPitchSet;
    const attacks: FrictionWeightedAttack[] = [];
    let inside = false;
    for (const decision of path.events) {
      if (decision.sourceLabel === segment.firstSourceLabel) inside = true;
      if (!inside) continue;
      const event = byLabel.get(decision.sourceLabel);
      for (const attack of event?.soundingAttacks ?? []) {
        const parsed = parseNoteToken(attack.spelling);
        if (!parsed || !(attack.durationBeats > 0)) continue;
        attacks.push({
          role: attack.role,
          pitchClass: parsed.pc,
          duration: attack.durationBeats,
          spelling: attack.spelling,
          sourceLabel: decision.sourceLabel,
        });
      }
      if (decision.sourceLabel === segment.lastSourceLabel) break;
    }
    const measured = chromaticFrictionMeasure(collection, attacks);
    regions.push({
      measureRangeLabel: segment.firstSourceLabel === segment.lastSourceLabel ? segment.firstSourceLabel : `${segment.firstSourceLabel}–${segment.lastSourceLabel}`,
      collectionName: segment.chosenName,
      totalDurationBeats: Math.round(measured.frictionDuration * 1000) / 1000,
      eligibleDurationBeats: Math.round(measured.eligibleDuration * 1000) / 1000,
      frictionShare: measured.frictionShare,
      hits: measured.hits.map((hit) => ({
        sourceLabel: hit.sourceLabel,
        spelling: hit.spelling,
        pitchClass: hit.pitchClass,
        nearest: hit.nearest.map((pc) => PENTATONIC_NOTE_CHOICES[pc] ?? String(pc)),
        role: hit.role,
        durationBeats: hit.duration,
      })),
    });
  }
  return regions.filter((region) => region.hits.length > 0);
}
