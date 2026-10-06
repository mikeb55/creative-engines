/**
 * Report-only chromatic friction.
 * A sounding melody or bass pitch class one semitone from the chosen collection.
 * This does not change suitability or the path.
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
  hits: readonly ChromaticFrictionHit[];
}

function distance(left: number, right: number): number {
  const raw = Math.abs(left - right) % 12;
  return Math.min(raw, 12 - raw);
}

export function chromaticFriction(score: PentatonicScoreImport, path: PentatonicPathResult): ChromaticFrictionRegion[] {
  if (path.kind !== 'analysis' || path.segments.length === 0) return [];
  const byLabel = new Map(score.events.map((event) => [event.sourceLabel, event]));
  const regions: ChromaticFrictionRegion[] = [];
  for (const segment of path.segments) {
    if (!segment.canonicalPitchSet || segment.chosenName === 'NONE') continue;
    const collection = segment.canonicalPitchSet;
    const hits: ChromaticFrictionHit[] = [];
    let inside = false;
    for (const decision of path.events) {
      if (decision.sourceLabel === segment.firstSourceLabel) inside = true;
      if (!inside) continue;
      const event = byLabel.get(decision.sourceLabel);
      for (const attack of event?.soundingAttacks ?? []) {
        const parsed = parseNoteToken(attack.spelling);
        if (!parsed || collection.includes(parsed.pc)) continue;
        const nearestPcs = collection.filter((pc) => distance(pc, parsed.pc) === 1);
        if (nearestPcs.length === 0) continue;
        hits.push({
          sourceLabel: decision.sourceLabel,
          spelling: attack.spelling,
          pitchClass: parsed.pc,
          nearest: nearestPcs.map((pc) => PENTATONIC_NOTE_CHOICES[pc] ?? String(pc)),
          role: attack.role,
          durationBeats: attack.durationBeats,
        });
      }
      if (decision.sourceLabel === segment.lastSourceLabel) break;
    }
    const total = Math.round(hits.reduce((sum, hit) => sum + hit.durationBeats, 0) * 1000) / 1000;
    regions.push({
      measureRangeLabel: segment.firstSourceLabel === segment.lastSourceLabel ? segment.firstSourceLabel : `${segment.firstSourceLabel}–${segment.lastSourceLabel}`,
      collectionName: segment.chosenName,
      totalDurationBeats: total,
      hits,
    });
  }
  return regions.filter((region) => region.hits.length > 0);
}
