/**
 * Public Piano V1.1 rhythmic windows.
 * The opaque id is a label. Pitch results come from the material policy.
 */

import type { ExactQuarter } from '../score-model/scoreModelTypes';
import {
  q,
  qAdd,
  qCmp,
  subdivisionAttackCount,
  supportedWindowExtent,
  type PianoSubdivision,
} from './pianoExactTiming';
import { buildPianoTimeline, cyclePlan, type PianoMeterBarPlan, type PianoTimelineBar } from './pianoMeterPlan';
import { acceptancePolychordRegions, type PianoPolychordRegion } from './pianoV11Polychord';
import type { PianoPitchMaterial, PianoRhythmicWindow } from './pianoV11Realise';

export interface PianoFieldError {
  field: string;
  message: string;
}

export interface PianoPublicRhythmicWindow {
  id: string;
  bar: number;
  offset: ExactQuarter;
  extent: ExactQuarter;
  hand: 'RH' | 'LH';
  subdivision: PianoSubdivision;
  rests?: boolean[];
  material: PianoPitchMaterial;
  pitches?: number[];
  against?: {
    subdivision: PianoSubdivision;
    rests?: boolean[];
    pitches?: number[];
  };
}

const SUBDIVISIONS = new Set(['3:2', '5:4', 'straight-eighths', 'straight-sixteenths']);
const MATERIALS = new Set(['parent-stack', 'parent-repeated', 'given-pitches']);

export function canonicalStageBHarmony(bars = 24): string[] {
  const cycle = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7'];
  const out = Array.from({ length: bars }, (_, index) => cycle[index % cycle.length]!);
  out[0] = 'Cmaj7';
  out[bars - 2] = 'Cmaj7';
  out[bars - 1] = 'Cmaj7';
  return out;
}

function rational(value: unknown, field: string, errors: PianoFieldError[]): ExactQuarter | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push({ field, message: 'must be a rational { n, d }' });
    return null;
  }
  const raw = value as { n?: unknown; d?: unknown };
  if (typeof raw.n !== 'number' || typeof raw.d !== 'number' || !Number.isInteger(raw.n) || !Number.isInteger(raw.d)) {
    errors.push({ field, message: 'numerator and denominator must be integers' });
    return null;
  }
  if (raw.d <= 0) {
    errors.push({ field, message: 'denominator must be a positive integer' });
    return null;
  }
  return q(raw.n, raw.d);
}

function subdivision(value: unknown, field: string, errors: PianoFieldError[]): PianoSubdivision | null {
  if (typeof value !== 'string' || !SUBDIVISIONS.has(value)) {
    errors.push({ field, message: 'must be straight eighths, straight sixteenths, 3:2, or 5:4' });
    return null;
  }
  return value as PianoSubdivision;
}

function restMask(value: unknown, field: string, count: number | null, errors: PianoFieldError[]): boolean[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((flag) => typeof flag !== 'boolean')) {
    errors.push({ field, message: 'must be a list of booleans' });
    return undefined;
  }
  if (count !== null && value.length !== count) {
    errors.push({ field, message: `must contain ${count} flags` });
  }
  return value as boolean[];
}

export function compilePublicWindows(
  timeline: readonly PianoTimelineBar[],
  windows: readonly PianoPublicRhythmicWindow[],
): { windows: PianoRhythmicWindow[]; errors: PianoFieldError[] } {
  const errors: PianoFieldError[] = [];
  const compiled: PianoRhythmicWindow[] = [];
  windows.forEach((window, index) => {
    const field = `pianoV11.rhythmicWindows[${index}]`;
    if (!window || typeof window !== 'object') {
      errors.push({ field, message: 'must be an object' });
      return;
    }
    if (typeof window.id !== 'string' || window.id.trim() === '') {
      errors.push({ field: `${field}.id`, message: 'must be a non-empty string' });
    }
    if (!Number.isInteger(window.bar) || window.bar < 1 || window.bar > timeline.length) {
      errors.push({ field: `${field}.bar`, message: `must be a bar from 1 to ${timeline.length}` });
      return;
    }
    const host = timeline[window.bar - 1]!;
    if (qCmp(window.offset, q(0, 1)) < 0) {
      errors.push({ field: `${field}.offset`, message: 'must not be negative' });
      return;
    }
    if (qCmp(window.extent, q(0, 1)) <= 0) {
      errors.push({ field: `${field}.extent`, message: 'must be positive' });
      return;
    }
    if (!supportedWindowExtent(window.extent)) {
      errors.push({ field: `${field}.extent`, message: `${window.extent.n}/${window.extent.d} is not a supported notation length` });
      return;
    }
    if (qCmp(window.offset, host.span) >= 0) {
      errors.push({ field: `${field}.offset`, message: 'starts outside its bar' });
      return;
    }
    const start = qAdd(host.start, window.offset);
    const end = qAdd(start, window.extent);
    const last = timeline[timeline.length - 1]!;
    if (qCmp(end, qAdd(last.start, last.span)) > 0) {
      errors.push({ field: `${field}.extent`, message: 'runs past the end of the score' });
      return;
    }
    const attacks = subdivisionAttackCount(window.subdivision, window.extent);
    if (attacks === null) {
      errors.push({ field: `${field}.subdivision`, message: 'does not resolve inside this extent' });
    }
    if (window.material === 'given-pitches' && (!window.pitches || window.pitches.length === 0)) {
      errors.push({ field: `${field}.pitches`, message: 'given-pitches needs explicit pitches' });
    }
    const next: PianoRhythmicWindow = {
      id: window.id,
      start,
      extent: window.extent,
      hand: window.hand,
      ratio: window.subdivision,
      material: window.material,
      ...(window.rests ? { rests: window.rests } : {}),
      ...(window.pitches ? { pitches: window.pitches } : {}),
      ...(window.against ? {
        against: window.against.subdivision,
        ...(window.against.rests ? { againstRests: window.against.rests } : {}),
        ...(window.against.pitches ? { againstPitches: window.against.pitches } : {}),
      } : {}),
    };
    compiled.push(next);
  });
  for (let i = 0; i < compiled.length; i += 1) {
    for (let j = i + 1; j < compiled.length; j += 1) {
      const a = compiled[i]!;
      const b = compiled[j]!;
      const aHands = new Set([a.hand, a.against ? (a.hand === 'RH' ? 'LH' : 'RH') : '']);
      const bHands = new Set([b.hand, b.against ? (b.hand === 'RH' ? 'LH' : 'RH') : '']);
      if (![...aHands].some((hand) => hand && bHands.has(hand))) continue;
      const overlap = qCmp(qAdd(a.start, a.extent ?? q(1, 1)), b.start) > 0
        && qCmp(qAdd(b.start, b.extent ?? q(1, 1)), a.start) > 0;
      if (overlap) {
        errors.push({
          field: `pianoV11.rhythmicWindows[${i}]`,
          message: `overlaps ${b.id} on the same hand`,
        });
      }
    }
  }
  return { windows: compiled, errors };
}

export function parsePublicWindow(value: unknown, field: string, errors: PianoFieldError[]): PianoPublicRhythmicWindow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push({ field, message: 'must be an object' });
    return null;
  }
  const raw = value as Record<string, unknown>;
  const offset = rational(raw.offset, `${field}.offset`, errors);
  const extent = rational(raw.extent, `${field}.extent`, errors);
  const hand = raw.hand === 'RH' || raw.hand === 'LH' ? raw.hand : null;
  if (!hand) errors.push({ field: `${field}.hand`, message: 'must be RH or LH' });
  const division = subdivision(raw.subdivision, `${field}.subdivision`, errors);
  const material = typeof raw.material === 'string' && MATERIALS.has(raw.material)
    ? raw.material as PianoPitchMaterial
    : null;
  if (!material) errors.push({ field: `${field}.material`, message: 'must be parent-stack, parent-repeated, or given-pitches' });
  if (typeof raw.id !== 'string' || raw.id.trim() === '') errors.push({ field: `${field}.id`, message: 'must be a non-empty string' });
  if (typeof raw.bar !== 'number' || !Number.isInteger(raw.bar)) errors.push({ field: `${field}.bar`, message: 'must be an integer' });
  const attacks = division && extent ? subdivisionAttackCount(division, extent) : null;
  const rests = restMask(raw.rests, `${field}.rests`, attacks, errors);
  let against: PianoPublicRhythmicWindow['against'];
  if (raw.against !== undefined) {
    if (!raw.against || typeof raw.against !== 'object' || Array.isArray(raw.against)) {
      errors.push({ field: `${field}.against`, message: 'must be an object' });
    } else {
      const other = raw.against as Record<string, unknown>;
      const againstDivision = subdivision(other.subdivision, `${field}.against.subdivision`, errors);
      const againstAttacks = againstDivision && extent ? subdivisionAttackCount(againstDivision, extent) : null;
      const againstRests = restMask(other.rests, `${field}.against.rests`, againstAttacks, errors);
      if (againstDivision) {
        against = {
          subdivision: againstDivision,
          ...(againstRests ? { rests: againstRests } : {}),
        };
      }
    }
  }
  if (!offset || !extent || !hand || !division || !material || typeof raw.id !== 'string' || typeof raw.bar !== 'number') return null;
  return {
    id: raw.id,
    bar: raw.bar,
    offset,
    extent,
    hand,
    subdivision: division,
    material,
    ...(rests ? { rests } : {}),
    ...(against ? { against } : {}),
  };
}

export function parsePublicWindows(value: unknown): { windows: PianoPublicRhythmicWindow[]; errors: PianoFieldError[] } {
  const errors: PianoFieldError[] = [];
  if (!Array.isArray(value)) {
    return { windows: [], errors: [{ field: 'pianoV11.rhythmicWindows', message: 'must be an array' }] };
  }
  const windows: PianoPublicRhythmicWindow[] = [];
  value.forEach((item, index) => {
    const parsed = parsePublicWindow(item, `pianoV11.rhythmicWindows[${index}]`, errors);
    if (parsed) windows.push(parsed);
  });
  return { windows, errors };
}

export function windowContinuation(timeline: readonly PianoTimelineBar[], window: PianoPublicRhythmicWindow): string {
  const host = timeline[window.bar - 1];
  if (!host) return 'Bar is outside the metre plan.';
  const end = qAdd(window.offset, window.extent);
  if (qCmp(end, host.span) <= 0) return `Stays inside bar ${window.bar}.`;
  const next = timeline[window.bar];
  return next
    ? `Crosses into bar ${next.bar}.`
    : 'Crosses past the end of the score.';
}

function oneWindow(
  id: string,
  bar: number,
  offset: ExactQuarter,
  hand: 'RH' | 'LH',
  subdivision: PianoSubdivision,
  material: PianoPitchMaterial,
  rests?: boolean[],
  against?: PianoSubdivision,
): PianoPublicRhythmicWindow {
  return {
    id,
    bar,
    offset,
    extent: q(1, 1),
    hand,
    subdivision,
    material,
    ...(rests ? { rests } : {}),
    ...(against ? { against: { subdivision: against } } : {}),
  };
}

/** The eight windows of the archived 24-bar fixture, with explicit material. */
export function fullV11DemonstrationWindows(): PianoPublicRhythmicWindow[] {
  return [
    oneWindow('demo-bar1-rh', 1, q(0, 1), 'RH', '3:2', 'parent-stack', undefined, 'straight-eighths'),
    oneWindow('demo-bar2-rh', 2, q(0, 1), 'RH', '3:2', 'parent-repeated', [false, true, false], 'straight-eighths'),
    oneWindow('demo-bar3-rh', 3, q(0, 1), 'RH', '5:4', 'parent-stack', undefined, 'straight-sixteenths'),
    oneWindow('demo-bar5-rh', 5, q(3, 1), 'RH', '3:2', 'parent-repeated'),
    oneWindow('demo-bar5-lh', 5, q(13, 4), 'LH', '5:4', 'parent-repeated'),
    oneWindow('demo-bar7-rh', 7, q(0, 1), 'RH', '3:2', 'parent-stack', undefined, '5:4'),
    oneWindow('demo-bar8-lh', 8, q(0, 1), 'LH', '3:2', 'parent-repeated', undefined, 'straight-eighths'),
    oneWindow('demo-bar12-rh', 12, q(0, 1), 'RH', '3:2', 'parent-stack'),
  ];
}

export function fullV11DemonstrationBody(): {
  phraseDevelopment: true;
  polychords: PianoPolychordRegion[];
  meterPlan: PianoMeterBarPlan[];
  rhythmicWindows: PianoPublicRhythmicWindow[];
  polyrhythm: 'off';
} {
  return {
    phraseDevelopment: true,
    polychords: acceptancePolychordRegions(),
    meterPlan: cyclePlan(4),
    rhythmicWindows: fullV11DemonstrationWindows(),
    polyrhythm: 'off',
  };
}

export function stableRequestText(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableRequestText(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableRequestText(record[key])}`).join(',')}}`;
}

/** Deterministic fingerprint. Not a musical hash. */
export function requestFingerprint(value: unknown): string {
  const text = stableRequestText(value);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export function demonstrationTimeline(): PianoTimelineBar[] {
  return buildPianoTimeline(cyclePlan(4));
}
