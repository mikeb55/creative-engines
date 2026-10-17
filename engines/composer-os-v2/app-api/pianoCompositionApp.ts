/**
 * Opt-in Piano Composition V1 API.
 * A missing or false flag returns disabled and does not enter any other generator.
 */

import { composePianoV1, type PianoComposeResult } from '../core/piano/pianoWriter';
import type { PianoLockedEvent } from '../core/piano/pianoTypes';
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
  };
  if (typeof request.seed !== 'number' || !Number.isInteger(request.seed)) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 needs an integer seed.' };
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
