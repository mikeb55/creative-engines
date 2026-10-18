/**
 * Solo Piano advanced-mode request.
 * The page sends this object. The API turns it into writer fields.
 */

import { buildPianoTimeline, validatePianoMeterPlan, type PianoMeterBarPlan } from './pianoMeterPlan';
import { q } from './pianoExactTiming';
import type { PianoRhythmicWindow } from './pianoV11Realise';
import {
  validatePolychordRegions,
  type PianoPolychordRegion,
} from './pianoV11Polychord';

export type PianoV11Polyrhythm = 'off' | '3:2' | '5:4' | 'both';

export interface PianoV11RequestBody {
  phraseDevelopment?: boolean;
  polychords?: PianoPolychordRegion[];
  meterPlan?: PianoMeterBarPlan[];
  polyrhythm?: PianoV11Polyrhythm;
  acceptance?: boolean;
  groupedNineSixteenTriplet?: boolean;
}

export interface ResolvedPianoV11 {
  phraseDevelopmentV11?: boolean;
  polychords?: PianoPolychordRegion[];
  groupedNineSixteenTriplet?: boolean;
  timing?: {
    enabled: true;
    meterPlan: PianoMeterBarPlan[];
    rhythmicWindows?: PianoRhythmicWindow[];
    acceptance?: boolean;
  };
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

export function resolvePianoV11(body: PianoV11RequestBody, bars: number): ResolvedPianoV11 | { error: string } {
  if (body.phraseDevelopment === true && bars !== 24) {
    return { error: 'Phrase development needs 24 bars.' };
  }
  if (body.acceptance === true && bars !== 24) {
    return { error: 'The combined V1.1 fixture needs 24 bars.' };
  }
  if (body.groupedNineSixteenTriplet === true && (!body.polychords || body.polychords.length === 0)) {
    return { error: 'The 9/16 3:2 needs a polychord on bar 12.' };
  }
  if (body.polychords) {
    const regionError = validatePolychordRegions(body.polychords, bars);
    if (regionError) return { error: regionError };
  }
  const mode = body.polyrhythm ?? 'off';
  if (mode !== 'off' && mode !== '3:2' && mode !== '5:4' && mode !== 'both') {
    return { error: 'Polyrhythm must be off, 3:2, 5:4, or both.' };
  }
  if (mode === 'both' && bars < 3 && body.acceptance !== true) {
    return { error: '3:2 and 5:4 together need at least 3 bars.' };
  }
  if (body.acceptance === true && mode !== 'off') {
    return { error: 'The acceptance fixture already includes its tuplet windows.' };
  }
  let meterPlan = body.meterPlan;
  if (meterPlan) {
    const meterErrors = validatePianoMeterPlan(meterPlan, bars);
    if (meterErrors.length > 0) return { error: meterErrors.join('; ') };
  }
  const windows = !body.acceptance && meterPlan && mode !== 'off' ? presetWindows(meterPlan, mode) : undefined;
  if (!meterPlan && mode !== 'off') {
    return { error: 'Polyrhythm windows need a V1.1 meter plan.' };
  }
  const timing = meterPlan
    ? {
      enabled: true as const,
      meterPlan,
      ...(windows && windows.length > 0 ? { rhythmicWindows: windows } : {}),
      ...(body.acceptance ? { acceptance: true as const } : {}),
    }
    : undefined;
  if (!timing && !body.phraseDevelopment && !body.polychords) {
    return { error: 'Piano V1.1 advanced mode needs phrase development, polychords, or a meter plan.' };
  }
  return {
    ...(body.phraseDevelopment ? { phraseDevelopmentV11: true } : {}),
    ...(body.polychords ? { polychords: body.polychords } : {}),
    ...(body.groupedNineSixteenTriplet ? { groupedNineSixteenTriplet: true } : {}),
    ...(timing ? { timing } : {}),
  };
}
