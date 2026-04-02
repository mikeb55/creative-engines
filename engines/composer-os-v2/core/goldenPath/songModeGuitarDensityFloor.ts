/**
 * Song Mode — global guitar rest-ratio floor after melodic passes.
 * Extends notes into rests first; only then may insert a single stepwise eighth in a large gap.
 * Identity bars untouched; harmony (chord symbols) unchanged; bass untouched.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import { guitarRestRatio } from '../score-integrity/duoLockQuality';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { isProtectedBar } from '../score-integrity/identityLock';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';

const LOW = 55;
const HIGH = 79;
const EPS = 1e-4;
/** Aligned with C7 swing ceiling (`songModeSpaceC7`). */
export const SONG_MODE_GUITAR_REST_FLOOR = 0.45;

function chordToneOpts(context: CompositionContext) {
  return shouldUseUserChordSemanticsForTones(context) ? ({ lockedHarmony: true } as const) : undefined;
}

function nearestChordPoolMidi(pitch: number, bar: number, context: CompositionContext): number {
  const chord = getChordForBar(bar, context);
  const g = guitarChordTonesInRange(chord, LOW, HIGH, chordToneOpts(context));
  const pool = [g.root, g.third, g.fifth, g.seventh].map((x) => Math.round(x));
  let best = pool[0]!;
  let bd = Math.abs(pitch - best);
  for (const p of pool) {
    const d = Math.abs(pitch - p);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return clampPitch(best, LOW, HIGH);
}

function eventVoice(e: ScoreEvent): number {
  return (e as { voice?: number }).voice ?? 1;
}

function sortedNoteRestByVoice(m: MeasureModel, voice: number): ScoreEvent[] {
  return [...m.events]
    .filter((e) => (e.kind === 'note' || e.kind === 'rest') && eventVoice(e) === voice)
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
}

/** 4-bar Song Mode phrase end bars — avoid inserting new notes in the cadence tail. */
function isPhraseEndBar(bar: number): boolean {
  return bar >= 4 && bar <= 32 && bar % 4 === 0;
}

/**
 * Slice up to `maxSlice` beats from the rest following a note (same voice) into the note.
 */
function extendNoteIntoFollowingRest(m: MeasureModel, bar: number, context: CompositionContext, maxSlice: number): boolean {
  if (isProtectedBar(bar, context)) return false;
  for (const voice of [1, 2] as const) {
    const sorted = sortedNoteRestByVoice(m, voice);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.kind !== 'note' || b.kind !== 'rest') continue;
      const na = a as NoteEvent;
      const rb = b as RestEvent;
      if (rb.duration < 0.25 - EPS) continue;
      if (Math.abs(na.startBeat + na.duration - rb.startBeat) > EPS) continue;
      const take = Math.min(maxSlice, Math.max(0.125, rb.duration * 0.4));
      if (take < 0.125 - EPS) continue;
      const ri = m.events.indexOf(rb);
      if (ri < 0) continue;
      na.duration = snapAttackBeatToGrid(na.duration + take);
      const newRest = snapAttackBeatToGrid(rb.duration - take);
      if (newRest <= EPS) {
        m.events.splice(ri, 1);
      } else {
        rb.duration = newRest;
        rb.startBeat = snapAttackBeatToGrid(na.startBeat + na.duration);
      }
      return true;
    }
  }
  return false;
}

/**
 * One stepwise eighth in the largest qualifying rest gap (not on identity / phrase-end tail).
 */
function insertStepwiseEighthInBestGap(guitar: PartModel, context: CompositionContext): boolean {
  let best: {
    bar: number;
    m: MeasureModel;
    start: number;
    dur: number;
    voice: number;
    prevPitch: number;
  } | null = null;

  for (const meas of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const bar = meas.index;
    if (isProtectedBar(bar, context)) continue;
    for (const voice of [1, 2] as const) {
      const ev = sortedNoteRestByVoice(meas, voice);
      for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        if (e.kind !== 'rest') continue;
        const r = e as RestEvent;
        if (r.duration < 0.75 - EPS) continue;
        const prev = i > 0 && ev[i - 1].kind === 'note' ? (ev[i - 1] as NoteEvent) : null;
        if (!prev) continue;
        if (isPhraseEndBar(bar) && r.startBeat + r.duration > BEATS_PER_MEASURE - 1.25 + EPS) continue;
        if (best === null || r.duration > best.dur) {
          best = {
            bar,
            m: meas,
            start: r.startBeat,
            dur: r.duration,
            voice,
            prevPitch: prev.pitch,
          };
        }
      }
    }
  }

  if (!best || best.dur < 0.75 - EPS) return false;

  const up = nearestChordPoolMidi(best.prevPitch + 1, best.bar, context);
  const down = nearestChordPoolMidi(best.prevPitch - 1, best.bar, context);
  const iu = Math.abs(up - best.prevPitch);
  const id = Math.abs(down - best.prevPitch);
  let want = iu < id ? up : iu > id ? down : seededUnit(context.seed, best.bar, 9901) < 0.5 ? up : down;
  if (Math.abs(want - best.prevPitch) < EPS) {
    want = up === want ? down : up;
  }
  if (Math.abs(want - best.prevPitch) < EPS) return false;
  const eighth = 0.5;
  if (best.dur < eighth - EPS) return false;

  const n = createNote(want, snapAttackBeatToGrid(best.start), eighth, best.voice);
  const restIdx = best.m.events.findIndex(
    (e) =>
      e.kind === 'rest' &&
      Math.abs((e as RestEvent).startBeat - best!.start) < EPS &&
      eventVoice(e) === best!.voice
  );
  if (restIdx < 0) return false;
  const rb = best.m.events[restIdx] as RestEvent;
  best.m.events.splice(restIdx, 0, n);
  const newRestStart = snapAttackBeatToGrid(best.start + eighth);
  const newRestDur = snapAttackBeatToGrid(rb.duration - eighth);
  if (newRestDur <= EPS) {
    const idx = best.m.events.indexOf(rb);
    if (idx >= 0) best.m.events.splice(idx, 1);
  } else {
    rb.startBeat = newRestStart;
    rb.duration = newRestDur;
  }
  return true;
}

/**
 * Drive `guitarRestRatio` down toward `SONG_MODE_GUITAR_REST_FLOOR` without new random pitch content
 * beyond one optional stepwise fill pass.
 */
export function applySongModeGuitarDensityFloor(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.form.totalBars !== 32) return;

  let iter = 0;
  while (guitarRestRatio(guitar) > SONG_MODE_GUITAR_REST_FLOOR + 0.006 && iter < 48) {
    iter++;
    let changed = false;
    const bars = [...guitar.measures].map((m) => m.index).sort((a, b) => a - b);
    for (const bar of bars) {
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      while (extendNoteIntoFollowingRest(m, bar, context, 0.5)) {
        changed = true;
        if (guitarRestRatio(guitar) <= SONG_MODE_GUITAR_REST_FLOOR + 0.004) break;
      }
      if (guitarRestRatio(guitar) <= SONG_MODE_GUITAR_REST_FLOOR + 0.004) break;
    }
    if (guitarRestRatio(guitar) <= SONG_MODE_GUITAR_REST_FLOOR + 0.004) break;
    if (!changed) {
      if (insertStepwiseEighthInBestGap(guitar, context)) {
        for (const m of guitar.measures) normalizeMeasureToEighthBeatGrid(m);
        continue;
      }
      break;
    }
    for (const m of guitar.measures) normalizeMeasureToEighthBeatGrid(m);
  }

  for (const m of guitar.measures) normalizeMeasureToEighthBeatGrid(m);
}
