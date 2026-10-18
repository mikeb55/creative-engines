/**
 * Solo Piano advanced-mode request.
 * Unknown JSON is checked before any musical field is read.
 */

import { buildPianoTimeline, validatePianoMeterPlan, type PianoMeterBarPlan } from './pianoMeterPlan';
import { q } from './pianoExactTiming';
import type { PianoRhythmicWindow } from './pianoV11Realise';
import {
  validatePolychordRegions,
  type PianoPolychordRegion,
  type PianoTriadQuality,
} from './pianoV11Polychord';
import {
  compilePublicWindows,
  parsePublicWindows,
  type PianoFieldError,
} from './pianoV11Windows';

export type PianoV11Polyrhythm = 'off' | '3:2' | '5:4' | 'both';

export interface PianoV11RequestBody {
  phraseDevelopment?: boolean;
  polychords?: PianoPolychordRegion[];
  meterPlan?: PianoMeterBarPlan[];
  polyrhythm?: PianoV11Polyrhythm;
  acceptance?: boolean;
  groupedNineSixteenTriplet?: boolean;
  rhythmicWindows?: unknown;
  /** Stage D. Absent or false leaves the Stage C demonstration unchanged. */
  musicalRefinement?: boolean;
}

export interface ResolvedPianoV11 {
  phraseDevelopmentV11?: boolean;
  musicalRefinementV11?: boolean;
  polychords?: PianoPolychordRegion[];
  groupedNineSixteenTriplet?: boolean;
  timing?: {
    enabled: true;
    meterPlan: PianoMeterBarPlan[];
    rhythmicWindows?: PianoRhythmicWindow[];
    acceptance?: boolean;
  };
}

const QUALITIES = new Set(['major', 'minor', 'augmented', 'diminished']);

function fail(errors: PianoFieldError[]): { error: string; fieldErrors: PianoFieldError[] } {
  return {
    error: errors.map((item) => `${item.field}: ${item.message}`).join('; '),
    fieldErrors: errors,
  };
}

function isRegion(value: unknown, field: string, errors: PianoFieldError[]): PianoPolychordRegion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push({ field, message: 'must be an object' });
    return null;
  }
  const raw = value as Record<string, unknown>;
  const chord = raw.polychord;
  if (!chord || typeof chord !== 'object' || Array.isArray(chord)) {
    errors.push({ field: `${field}.polychord`, message: 'must be an object' });
    return null;
  }
  const body = chord as Record<string, unknown>;
  const assignment = body.assignment;
  if (!assignment || typeof assignment !== 'object') {
    errors.push({ field: `${field}.polychord.assignment`, message: 'must be upper RH and lower LH' });
    return null;
  }
  const hands = assignment as { upper?: unknown; lower?: unknown };
  const upper = body.upper;
  const lower = body.lower;
  if (!upper || typeof upper !== 'object' || !lower || typeof lower !== 'object') {
    errors.push({ field: `${field}.polychord`, message: 'needs an upper and a lower triad' });
    return null;
  }
  const up = upper as { root?: unknown; quality?: unknown };
  const down = lower as { root?: unknown; quality?: unknown };
  if (typeof up.root !== 'string' || typeof down.root !== 'string') {
    errors.push({ field: `${field}.polychord`, message: 'roots must be strings' });
    return null;
  }
  if (typeof up.quality !== 'string' || !QUALITIES.has(up.quality) || typeof down.quality !== 'string' || !QUALITIES.has(down.quality)) {
    errors.push({ field: `${field}.polychord`, message: 'quality must be major, minor, augmented, or diminished' });
    return null;
  }
  if (typeof raw.startBar !== 'number' || typeof raw.endBar !== 'number') {
    errors.push({ field, message: 'startBar and endBar must be numbers' });
    return null;
  }
  return {
    startBar: raw.startBar,
    endBar: raw.endBar,
    polychord: {
      upper: { root: up.root, quality: up.quality as PianoTriadQuality },
      lower: { root: down.root, quality: down.quality as PianoTriadQuality },
      assignment: { upper: hands.upper === 'RH' ? 'RH' : 'LH', lower: hands.lower === 'LH' ? 'LH' : 'RH' },
    },
  };
}

function parseMeter(value: unknown, errors: PianoFieldError[]): PianoMeterBarPlan[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push({ field: 'pianoV11.meterPlan', message: 'must be an array' });
    return undefined;
  }
  return value as PianoMeterBarPlan[];
}

function presetWindows(plan: readonly PianoMeterBarPlan[], mode: PianoV11Polyrhythm): PianoRhythmicWindow[] {
  if (mode === 'off') return [];
  const timeline = buildPianoTimeline([...plan]);
  const at = (bar: number) => timeline[bar - 1]?.start ?? q(0, 1);
  const windows: PianoRhythmicWindow[] = [];
  if (mode === '3:2' || mode === 'both') {
    windows.push({
      id: 'gui-3-2',
      start: at(1),
      hand: 'RH',
      ratio: '3:2',
      pitches: [72, 72, 72],
      against: 'straight-eighths',
      againstPitches: [48, 48],
    });
  }
  if (mode === '5:4' || mode === 'both') {
    const bar = mode === 'both' ? Math.min(3, plan.length) : 1;
    windows.push({
      id: 'gui-5-4',
      start: at(bar),
      hand: 'RH',
      ratio: '5:4',
      pitches: [72, 72, 72, 72, 72],
      against: 'straight-sixteenths',
      againstPitches: [48, 48, 48, 48],
    });
  }
  return windows;
}

export function resolvePianoV11(body: unknown, bars: number): ResolvedPianoV11 | { error: string; fieldErrors: PianoFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail([{ field: 'pianoV11', message: 'must be an object' }]);
  }
  const raw = body as Record<string, unknown>;
  const errors: PianoFieldError[] = [];
  if (raw.phraseDevelopment !== undefined && typeof raw.phraseDevelopment !== 'boolean') {
    errors.push({ field: 'pianoV11.phraseDevelopment', message: 'must be true or false' });
  }
  if (raw.acceptance !== undefined && typeof raw.acceptance !== 'boolean') {
    errors.push({ field: 'pianoV11.acceptance', message: 'must be true or false' });
  }
  if (raw.groupedNineSixteenTriplet !== undefined && typeof raw.groupedNineSixteenTriplet !== 'boolean') {
    errors.push({ field: 'pianoV11.groupedNineSixteenTriplet', message: 'must be true or false' });
  }
  if (raw.musicalRefinement !== undefined && typeof raw.musicalRefinement !== 'boolean') {
    errors.push({ field: 'pianoV11.musicalRefinement', message: 'must be true or false' });
  }
  const phraseDevelopment = raw.phraseDevelopment === true;
  const musicalRefinement = raw.musicalRefinement === true;
  if (musicalRefinement && bars !== 24) {
    errors.push({ field: 'pianoV11.musicalRefinement', message: 'needs 24 bars' });
  }
  const acceptance = raw.acceptance === true;
  const groupedNineSixteenTriplet = raw.groupedNineSixteenTriplet === true;
  if (phraseDevelopment && bars !== 24) errors.push({ field: 'pianoV11.phraseDevelopment', message: 'needs 24 bars' });
  if (acceptance && bars !== 24) errors.push({ field: 'pianoV11.acceptance', message: 'needs 24 bars' });

  let polychords: PianoPolychordRegion[] | undefined;
  if (raw.polychords !== undefined) {
    if (!Array.isArray(raw.polychords)) {
      errors.push({ field: 'pianoV11.polychords', message: 'must be an array' });
    } else {
      polychords = [];
      raw.polychords.forEach((item, index) => {
        const region = isRegion(item, `pianoV11.polychords[${index}]`, errors);
        if (region) polychords!.push(region);
      });
      if (errors.length === 0) {
        const regionError = validatePolychordRegions(polychords, bars);
        if (regionError) errors.push({ field: 'pianoV11.polychords', message: regionError });
      }
    }
  }
  if (groupedNineSixteenTriplet && (!polychords || polychords.length === 0)) {
    errors.push({ field: 'pianoV11.groupedNineSixteenTriplet', message: 'needs a polychord on bar 12' });
  }

  const mode = raw.polyrhythm === undefined ? 'off' : raw.polyrhythm;
  if (mode !== 'off' && mode !== '3:2' && mode !== '5:4' && mode !== 'both') {
    errors.push({ field: 'pianoV11.polyrhythm', message: 'must be off, 3:2, 5:4, or both' });
  }
  const polyrhythm = (mode === '3:2' || mode === '5:4' || mode === 'both' || mode === 'off') ? mode : 'off';
  if (polyrhythm === 'both' && bars < 3 && !acceptance) {
    errors.push({ field: 'pianoV11.polyrhythm', message: '3:2 and 5:4 together need at least 3 bars' });
  }
  if (acceptance && polyrhythm !== 'off') {
    errors.push({ field: 'pianoV11.polyrhythm', message: 'the acceptance fixture already includes its tuplet windows' });
  }

  const meterPlan = parseMeter(raw.meterPlan, errors);
  if (meterPlan) {
    for (const message of validatePianoMeterPlan(meterPlan, bars)) {
      errors.push({ field: 'pianoV11.meterPlan', message });
    }
  }

  let compiledWindows: PianoRhythmicWindow[] | undefined;
  if (raw.rhythmicWindows !== undefined) {
    const parsed = parsePublicWindows(raw.rhythmicWindows);
    errors.push(...parsed.errors);
    if (polyrhythm !== 'off') {
      errors.push({ field: 'pianoV11.polyrhythm', message: 'cannot be combined with explicit rhythmic windows' });
    }
    if (acceptance) {
      errors.push({ field: 'pianoV11.acceptance', message: 'cannot be combined with explicit rhythmic windows' });
    }
    if (!meterPlan) {
      errors.push({ field: 'pianoV11.rhythmicWindows', message: 'need a metre plan' });
    } else if (parsed.errors.length === 0 && errors.every((item) => !item.field.startsWith('pianoV11.meterPlan'))) {
      const timeline = buildPianoTimeline(meterPlan);
      const compiled = compilePublicWindows(timeline, parsed.windows);
      errors.push(...compiled.errors);
      compiledWindows = compiled.windows;
    }
  }
  if (groupedNineSixteenTriplet && raw.rhythmicWindows !== undefined) {
    errors.push({ field: 'pianoV11.groupedNineSixteenTriplet', message: 'bar 12 must be an explicit rhythmic window' });
  }

  if (!meterPlan && polyrhythm !== 'off') {
    errors.push({ field: 'pianoV11.polyrhythm', message: 'needs a V1.1 metre plan' });
  }
  if (errors.length > 0) return fail(errors);

  const preset = !acceptance && meterPlan && polyrhythm !== 'off' && !compiledWindows
    ? presetWindows(meterPlan, polyrhythm)
    : undefined;
  const windows = compiledWindows && compiledWindows.length > 0 ? compiledWindows : preset;
  const timing = meterPlan
    ? {
      enabled: true as const,
      meterPlan,
      ...(windows && windows.length > 0 ? { rhythmicWindows: windows } : {}),
      ...(acceptance ? { acceptance: true as const } : {}),
    }
    : undefined;
  if (!timing && !phraseDevelopment && !polychords && !musicalRefinement) {
    return fail([{ field: 'pianoV11', message: 'needs phrase development, polychords, or a metre plan' }]);
  }
  return {
    ...(phraseDevelopment ? { phraseDevelopmentV11: true } : {}),
    ...(musicalRefinement ? { musicalRefinementV11: true } : {}),
    ...(polychords ? { polychords } : {}),
    ...(groupedNineSixteenTriplet ? { groupedNineSixteenTriplet: true } : {}),
    ...(timing ? { timing } : {}),
  };
}
