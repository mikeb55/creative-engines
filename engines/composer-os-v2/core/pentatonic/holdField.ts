/**
 * Dev 5C HOLD-FIELD.
 * One colour field may stay across changing harmony when common tones earn it.
 * This is not a chord-scale system and it does not retune path cost.
 */

import { readChordEvidence } from './chordEvidence';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from './pathConfig';
import { mod12, sharpName } from './pitch';

export const PENTATONIC_HOLD_FIELD_VERSION = 'pentatonic-hold-field-5c';

export type HoldFieldDisposition =
  | 'HOME'
  | 'INSIDE'
  | 'COLOUR'
  | 'CONTINUITY'
  | 'SUSPENDED'
  | 'AMBIGUOUS'
  | 'EDGE'
  | 'OUTSIDE'
  | 'NONE';

export interface HoldFieldEvent {
  sourceLabel: string;
  chordSymbol: string;
  chordPitchClasses: readonly number[];
}

export interface HoldFieldChange {
  from: string;
  to: string;
  tones: readonly number[];
}

export interface HoldFieldReport {
  version: typeof PENTATONIC_HOLD_FIELD_VERSION;
  held: boolean;
  released: boolean;
  resourceName: string;
  span: { first: string; last: string };
  commonTones: readonly number[];
  commonToneNames: readonly string[];
  perChangeCommonTones: readonly HoldFieldChange[];
  disposition: HoldFieldDisposition;
  reason: string;
  changeCostReference: number;
}

function unique(pcs: readonly number[]): number[] {
  return [...new Set(pcs.map((pc) => mod12(pc)))].sort((left, right) => left - right);
}

function shared(left: readonly number[], right: readonly number[]): number[] {
  const wanted = new Set(right.map((pc) => mod12(pc)));
  return unique(left).filter((pc) => wanted.has(pc));
}

function sameSet(left: readonly number[], right: readonly number[]): boolean {
  const a = unique(left);
  const b = unique(right);
  return a.length === b.length && a.every((pc, index) => pc === b[index]);
}

export function holdFieldDisposition(field: readonly number[], home: readonly number[] | null): HoldFieldDisposition {
  const tones = unique(field);
  if (tones.length === 0) return 'NONE';
  if (!home || home.length === 0) return 'COLOUR';
  if (sameSet(tones, home)) return 'HOME';
  const overlap = shared(tones, home).length;
  if (overlap >= 4) return 'INSIDE';
  if (overlap >= 3) return 'CONTINUITY';
  if (overlap === 0) return 'OUTSIDE';
  if (overlap === 1) return 'EDGE';
  return 'COLOUR';
}

export function harmonyEventsFromSymbols(rows: readonly { sourceLabel: string; chordSymbol: string }[]): HoldFieldEvent[] {
  const events: HoldFieldEvent[] = [];
  for (const row of rows) {
    const symbol = row.chordSymbol.trim();
    if (!symbol || symbol === 'N.C.') continue;
    const read = readChordEvidence(symbol);
    if (!read.ok) continue;
    events.push({
      sourceLabel: row.sourceLabel,
      chordSymbol: symbol,
      chordPitchClasses: read.chord.harmonyPitchClasses,
    });
  }
  return events;
}

function report(partial: Omit<HoldFieldReport, 'version' | 'commonToneNames' | 'changeCostReference'>): HoldFieldReport {
  return {
    ...partial,
    version: PENTATONIC_HOLD_FIELD_VERSION,
    commonToneNames: partial.commonTones.map((pc) => sharpName(pc)),
    changeCostReference: DEFAULT_PENTATONIC_PATH_CONFIG.changeCost,
  };
}

/**
 * Hold when every harmonic change keeps the field credible and at least half
 * of those changes keep a common tone inside the field.
 * Release when a chord shares nothing with the field, or no useful common tone remains.
 */
export function assessHoldField(args: {
  resourceName: string;
  resourcePitchClasses: readonly number[];
  events: readonly HoldFieldEvent[];
  homePitchClasses?: readonly number[] | null;
}): HoldFieldReport {
  const field = unique(args.resourcePitchClasses);
  const events = args.events.filter((event) => event.chordPitchClasses.length > 0);
  const span = {
    first: events[0]?.sourceLabel ?? '',
    last: events[events.length - 1]?.sourceLabel ?? '',
  };
  const disposition = holdFieldDisposition(field, args.homePitchClasses ?? null);
  const labels = new Set(events.map((event) => event.chordSymbol));
  if (events.length < 2 || labels.size < 2) {
    return report({
      held: false,
      released: false,
      resourceName: args.resourceName,
      span,
      commonTones: [],
      perChangeCommonTones: [],
      disposition,
      reason: 'Harmony does not change. HOLD-FIELD is not a claim about a single chord.',
    });
  }

  const perChange: HoldFieldChange[] = [];
  let incredible = false;
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1]!;
    const next = events[index]!;
    if (previous.chordSymbol === next.chordSymbol) continue;
    const persist = shared(shared(field, previous.chordPitchClasses), next.chordPitchClasses);
    perChange.push({ from: previous.sourceLabel, to: next.sourceLabel, tones: persist });
    if (shared(field, previous.chordPitchClasses).length === 0 || shared(field, next.chordPitchClasses).length === 0) {
      incredible = true;
    }
  }

  const toneSet = new Set<number>();
  for (const change of perChange) for (const tone of change.tones) toneSet.add(tone);
  const commonTones = [...toneSet].sort((left, right) => left - right);
  const withTone = perChange.filter((change) => change.tones.length > 0).length;
  const credible = !incredible && perChange.length > 0 && withTone >= Math.ceil(perChange.length / 2) && commonTones.length > 0;

  if (!credible) {
    return report({
      held: false,
      released: true,
      resourceName: args.resourceName,
      span,
      commonTones,
      perChangeCommonTones: perChange,
      disposition,
      reason: incredible
        ? `Released. ${args.resourceName} stops being credible between ${span.first} and ${span.last}. A chord shares no pitch class with the field.`
        : `Released. ${args.resourceName} does not keep a useful common tone across ${span.first}–${span.last}, so a switch is not refused.`,
    });
  }

  const cost = DEFAULT_PENTATONIC_PATH_CONFIG.changeCost;
  return report({
    held: true,
    released: false,
    resourceName: args.resourceName,
    span,
    commonTones,
    perChangeCommonTones: perChange,
    disposition,
    reason: `HOLD-FIELD beat a switch. ${args.resourceName} stays ${disposition} across ${span.first}–${span.last}. Common tones ${commonTones.map((pc) => sharpName(pc)).join(' ')} persist. A new resource would pay change cost ${cost} without a musical need.`,
  });
}
