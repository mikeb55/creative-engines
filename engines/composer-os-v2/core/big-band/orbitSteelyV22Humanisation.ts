/**
 * Steely Orbit V2.2 — post-V17: minimum-touch alto variety for GCE `rhythmicIdentity` + `structureAndForm`.
 * - Bars 9–24: one quarter → two eighths (same pitch) per 4-bar phrase
 * - Bars 26 & 30 only: vary F5/D#5/A#4 cell (25/27/29/31 unchanged)
 */

import { createNote } from '../score-model/scoreEventBuilder';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES } from './buildBigBandOrchestrationPlan';
import {
  effBar,
  emitVoice1Segments,
  STEELY_ORBIT_V14_SEED_MIDI,
} from './orbitSteelyV14MelodicDevelopment';

const EIGHTH = 0.5;

function findAlto(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.id === 'bb_alto_sax');
}

function snapAlto(m: number): number {
  return snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!);
}

/**
 * First voice-1 note in the measure with ~quarter duration → two eighths, same pitch.
 */
function splitOneQuarterToEighthsVoice1(m: MeasureModel, L: number): boolean {
  const v1 = m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
  for (const n of v1) {
    if (n.duration >= 0.92 && n.duration <= 1.08 && n.startBeat + n.duration <= L + 1e-4) {
      const p = n.pitch;
      const st = n.startBeat;
      m.events = m.events.filter((e) => e !== n);
      m.events.push(createNote(p, st, EIGHTH, 1, undefined, undefined, 84));
      m.events.push(createNote(p, st + EIGHTH, EIGHTH, 1, undefined, undefined, 84));
      m.events.sort((a, b) => {
        const ab = a.kind === 'note' ? (a as NoteEvent).startBeat : 0;
        const bb = b.kind === 'note' ? (b as NoteEvent).startBeat : 0;
        return ab - bb;
      });
      return true;
    }
  }
  return false;
}

/** One split per 4-bar phrase in 9–24 (first eligible bar wins per phrase). */
function applyPhraseQuarterToEighthSplits(score: ScoreModel, alto: PartModel): void {
  const phrases: [number, number][] = [
    [9, 12],
    [13, 16],
    [17, 20],
    [21, 24],
  ];
  for (const [lo, hi] of phrases) {
    for (let bar = lo; bar <= hi; bar++) {
      const m = alto.measures[bar - 1];
      if (!m) continue;
      const L = effBar(score, bar);
      if (splitOneQuarterToEighthsVoice1(m, L)) break;
    }
  }
}

/** Bar 26: chromatic passing G5 between F5 and D#5 (25/27 untouched). */
function varyBar26(score: ScoreModel, alto: PartModel): void {
  const L = effBar(score, 26);
  const m = alto.measures[25];
  if (!m) return;
  emitVoice1Segments(m, L, [
    { st: 0, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[0]!), dur: EIGHTH },
    { st: EIGHTH, midi: snapAlto(79), dur: EIGHTH },
    { st: 1, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[1]!), dur: 1 },
    { st: 2, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[2]!), dur: 1 },
  ]);
}

/** Bar 30: rhythmic displacement — eighth rest then F5/D#5/A#4 grid shifted (29/31 untouched). */
function varyBar30(score: ScoreModel, alto: PartModel): void {
  const L = effBar(score, 30);
  const m = alto.measures[29];
  if (!m) return;
  emitVoice1Segments(m, L, [
    { st: EIGHTH, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[0]!), dur: 1 },
    { st: 1 + EIGHTH, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[1]!), dur: 1 },
    { st: 2 + EIGHTH, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[2]!), dur: 1 - EIGHTH },
  ]);
}

export function applySteelyOrbitV22Humanisation(score: ScoreModel): void {
  const alto = findAlto(score);
  if (!alto) return;
  applyPhraseQuarterToEighthSplits(score, alto);
  varyBar26(score, alto);
  varyBar30(score, alto);
}
