/**
 * Opt-in Piano Composition V1 API.
 * A missing or false flag returns disabled and does not enter any other generator.
 */

import { composeCoffeeRunVariation } from '../core/piano/coffeeRunVariation';
import { composeGeneralPianoV1 } from '../core/piano/generalPianoWriter';
import { resolvePianoV11, type PianoV11RequestBody } from '../core/piano/pianoV11Request';
import { composePianoV1, type PianoComposeResult } from '../core/piano/pianoWriter';
import type { GeneralPianoBarCount, GeneralPianoCentre, PianoLockedEvent } from '../core/piano/pianoTypes';
import { PIANO_V1_BARS } from '../core/piano/pianoTypes';

function isLock(value: unknown): value is PianoLockedEvent {
  if (!value || typeof value !== 'object') return false;
  const lock = value as PianoLockedEvent;
  return Number.isFinite(lock.bar)
    && (lock.voice === 1 || lock.voice === 2 || lock.voice === 3)
    && Number.isFinite(lock.startBeat)
    && Number.isFinite(lock.duration)
    && Number.isFinite(lock.pitch);
}

export function apiComposePianoV1(body: unknown): PianoComposeResult {
  if (!body || typeof body !== 'object' || (body as { pianoCompositionV1?: unknown }).pianoCompositionV1 !== true) {
    return { ok: false, code: 'disabled', error: 'Piano composition V1 is disabled.' };
  }
  const request = body as {
    seed?: unknown;
    bars?: unknown;
    tempo?: unknown;
    innerVoice?: unknown;
    lockedEvents?: unknown;
    filmCue?: unknown;
    generalPianoV1?: unknown;
    tonalCentre?: unknown;
    harmony?: unknown;
    metre?: unknown;
    meter?: unknown;
    timeSignature?: unknown;
    pianoV11?: unknown;
  };
  if (typeof request.seed !== 'number' || !Number.isInteger(request.seed)) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 needs an integer seed.' };
  }
  if (request.lockedEvents !== undefined && (!Array.isArray(request.lockedEvents) || !request.lockedEvents.every(isLock))) {
    return { ok: false, code: 'bad_request', error: 'Locked piano events are malformed.' };
  }
  if (request.generalPianoV1 === true) {
    if (request.filmCue !== undefined) {
      return { ok: false, code: 'bad_request', error: 'General piano V1 does not take a film cue.' };
    }
    const metre = request.metre;
    const meter = request.meter;
    if (metre !== undefined && metre !== '4/4') {
      return { ok: false, code: 'bad_request', error: 'General piano V1 supports 4/4 only.' };
    }
    if (meter !== undefined && meter !== '4/4') {
      return { ok: false, code: 'bad_request', error: 'General piano V1 supports 4/4 only.' };
    }
    const signature = request.timeSignature;
    if (signature !== undefined) {
      const time = signature as { beats?: unknown; beatType?: unknown };
      if (time.beats !== 4 || time.beatType !== 4) {
        return { ok: false, code: 'bad_request', error: 'General piano V1 supports 4/4 only.' };
      }
    }
    if (request.bars !== 8 && request.bars !== 16 && request.bars !== 24) {
      return { ok: false, code: 'bad_request', error: 'General piano V1 accepts 8, 16 or 24 bars.' };
    }
    if (request.tonalCentre !== 'C' && request.tonalCentre !== 'Am') {
      return { ok: false, code: 'bad_request', error: 'General piano V1 tonal centre must be C or Am.' };
    }
    if (!Array.isArray(request.harmony) || request.harmony.some((symbol) => typeof symbol !== 'string')) {
      return { ok: false, code: 'bad_request', error: 'General piano V1 needs one chord symbol for every bar.' };
    }
    if (request.pianoV11 !== undefined) {
      if (!request.pianoV11 || typeof request.pianoV11 !== 'object') {
        return { ok: false, code: 'bad_request', error: 'Piano V1.1 options are malformed.' };
      }
      const resolved = resolvePianoV11(request.pianoV11 as PianoV11RequestBody, request.bars);
      if ('error' in resolved) {
        return { ok: false, code: 'bad_request', error: resolved.error, fieldErrors: resolved.fieldErrors };
      }
      return composeGeneralPianoV1({
        seed: request.seed,
        bars: request.bars as GeneralPianoBarCount,
        tempo: typeof request.tempo === 'number' ? request.tempo : Number.NaN,
        tonalCentre: request.tonalCentre as GeneralPianoCentre,
        harmony: request.harmony,
        lockedEvents: request.lockedEvents as PianoLockedEvent[] | undefined,
        ...resolved,
      });
    }
    return composeGeneralPianoV1({
      seed: request.seed,
      bars: request.bars as GeneralPianoBarCount,
      tempo: typeof request.tempo === 'number' ? request.tempo : Number.NaN,
      tonalCentre: request.tonalCentre as GeneralPianoCentre,
      harmony: request.harmony,
      lockedEvents: request.lockedEvents as PianoLockedEvent[] | undefined,
    });
  }
  if (request.filmCue !== undefined && request.filmCue !== 'coffee-run-variation') {
    return { ok: false, code: 'bad_request', error: 'Unknown piano film cue.' };
  }
  if (request.lockedEvents !== undefined && (!Array.isArray(request.lockedEvents) || !request.lockedEvents.every(isLock))) {
    return { ok: false, code: 'bad_request', error: 'Locked piano events are malformed.' };
  }
  if (request.filmCue === 'coffee-run-variation') {
    if (request.bars !== undefined && request.bars !== 24) {
      return { ok: false, code: 'bad_request', error: 'Coffee Run variation is 24 bars.' };
    }
    if (request.tempo !== undefined && request.tempo !== 64) {
      return { ok: false, code: 'bad_request', error: 'Coffee Run variation tempo is quarter note = 64.' };
    }
    return composeCoffeeRunVariation({
      seed: request.seed,
      innerVoice: request.innerVoice !== false,
      lockedEvents: request.lockedEvents as PianoLockedEvent[] | undefined,
    });
  }
  if (request.bars !== undefined && request.bars !== PIANO_V1_BARS) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 checkpoint accepts 8 bars only.' };
  }
  if (request.tempo !== undefined && request.tempo !== 64) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 checkpoint tempo is quarter note = 64.' };
  }
  if (request.lockedEvents !== undefined && (!Array.isArray(request.lockedEvents) || !request.lockedEvents.every(isLock))) {
    return { ok: false, code: 'bad_request', error: 'Locked piano events are malformed.' };
  }
  return composePianoV1({
    seed: request.seed,
    tempo: 64,
    innerVoice: request.innerVoice !== false,
    lockedEvents: request.lockedEvents as PianoLockedEvent[] | undefined,
  });
}
