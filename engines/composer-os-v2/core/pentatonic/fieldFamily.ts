/**
 * Dev 3.3 field-family report.
 * Post-path only. Does not change the path.
 * A field holds two collections. It does not chain a third.
 */

import type { PentatonicScoreEvent } from './musicXmlScore';
import { mod12, parseNoteToken, PENTATONIC_NOTE_CHOICES } from './pitch';
import { intervalFromCentre } from './centreIdentity';

interface FieldRegion {
  firstSourceLabel: string;
  lastSourceLabel: string;
  collectionName: string;
  pitchClasses: readonly number[] | null;
}

export interface PentatonicField {
  measureRangeLabel: string;
  name: string;
  mobile: readonly string[];
  inflectionLabels: readonly string[];
  members: readonly string[];
}

function distance(left: number, right: number): number {
  const raw = Math.abs(left - right) % 12;
  return Math.min(raw, 12 - raw);
}

function spell(pc: number): string {
  return PENTATONIC_NOTE_CHOICES[mod12(pc)] ?? String(pc);
}

function sounding(events: readonly PentatonicScoreEvent[]): Set<number> {
  const found = new Set<number>();
  for (const event of events) {
    for (const attack of event.soundingAttacks) {
      const parsed = parseNoteToken(attack.spelling);
      if (parsed && attack.durationBeats > 0) found.add(parsed.pc);
    }
    for (const note of event.heldNotes ?? []) {
      const parsed = parseNoteToken(note);
      if (parsed) found.add(parsed.pc);
    }
  }
  return found;
}

function canMerge(left: readonly number[], right: readonly number[], leftSound: Set<number>, rightSound: Set<number>): { mobile: number[] } | null {
  const rightSet = new Set(right);
  const leftSet = new Set(left);
  const shared = left.filter((pc) => rightSet.has(pc));
  if (shared.length < 4) return null;
  const onlyLeft = left.filter((pc) => !rightSet.has(pc));
  const onlyRight = right.filter((pc) => !leftSet.has(pc));
  if (onlyLeft.length === 0 || onlyRight.length === 0) return null;
  const paired = (from: number[], to: number[]) => from.every((pc) => to.some((other) => distance(pc, other) <= 2));
  if (!paired(onlyLeft, onlyRight) || !paired(onlyRight, onlyLeft)) return null;
  if (!onlyLeft.every((pc) => leftSound.has(pc))) return null;
  if (!onlyRight.every((pc) => rightSound.has(pc))) return null;
  return { mobile: [...onlyLeft, ...onlyRight].sort((a, b) => a - b) };
}

export function reportPentatonicFields(
  regions: readonly FieldRegion[],
  events: readonly PentatonicScoreEvent[],
  centrePc: number | null
): PentatonicField[] {
  const byLabel = new Map(events.map((event) => [event.sourceLabel, event]));
  const eventsFor = (region: FieldRegion) => {
    const labels: PentatonicScoreEvent[] = [];
    let inside = false;
    for (const event of events) {
      if (event.sourceLabel === region.firstSourceLabel) inside = true;
      if (!inside) continue;
      labels.push(event);
      if (event.sourceLabel === region.lastSourceLabel) break;
    }
    return labels.length > 0 ? labels : [byLabel.get(region.firstSourceLabel)].filter((item): item is PentatonicScoreEvent => Boolean(item));
  };
  const fields: PentatonicField[] = [];
  let index = 0;
  while (index < regions.length) {
    const left = regions[index]!;
    const right = regions[index + 1];
    const leftPcs = left.pitchClasses;
    const rightPcs = right?.pitchClasses;
    if (!right || !leftPcs || !rightPcs || left.collectionName === 'NONE' || right.collectionName === 'NONE') {
      index += 1;
      continue;
    }
    const merged = canMerge(leftPcs, rightPcs, sounding(eventsFor(left)), sounding(eventsFor(right)));
    if (!merged) {
      index += 1;
      continue;
    }
    const anchor = centrePc !== null && rightPcs.includes(centrePc) && !leftPcs.includes(centrePc) ? right : left;
    const mobile = merged.mobile.map(spell);
    const range = left.firstSourceLabel === right.lastSourceLabel ? `mm. ${left.firstSourceLabel}` : `mm. ${left.firstSourceLabel}–${right.lastSourceLabel}`;
    fields.push({
      measureRangeLabel: range,
      name: `${anchor.collectionName.replace(/ Pentatonic$/i, '')} field (${mobile.join('/')} mobile)`,
      mobile,
      inflectionLabels: [right.firstSourceLabel],
      members: [left.collectionName, right.collectionName],
    });
    index += 2;
  }
  return fields;
}

export function intervalLabelFor(centrePc: number, referencePc: number | null, archetypeId: string | null): string {
  if (referencePc === null) return 'interval unknown';
  const mode = archetypeId === 'minor_pentatonic' ? 'minor' : archetypeId === 'major_pentatonic' ? 'major' : 'collection';
  return `${intervalFromCentre(centrePc, referencePc)} ${mode}`;
}
