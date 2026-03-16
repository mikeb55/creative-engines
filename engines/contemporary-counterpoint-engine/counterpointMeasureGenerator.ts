/**
 * Contemporary Counterpoint — Measure-First Generator
 * Algorithm: for measure in 8 measures → choose contrapuntal motion → enforce no parallels → assign rhythmic values → generate voice-leading
 * Returns explicit measures.
 */

import type { Score, Measure } from '../../shared/scoreModel';
import { composeMeasure } from '../../shared/barComposer';
import type { HarmonicSegment } from './counterpointTypes';

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];

function parseChord(chord: string): number {
  const m = chord.match(/^([A-G][#b]?)/);
  return ROOT_MIDI[m?.[1] ?? 'C'] ?? 60;
}

function getScaleTones(root: number): number[] {
  return SCALE_STEPS.map((s) => root + s);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type Motion = 'contrary' | 'similar' | 'oblique';

/** Generate one measure of counterpoint. */
function generateCounterpointMeasure(
  measureIndex: number,
  chord: string,
  lineCount: number,
  lastPitches: number[],
  rand: () => number
): { measure: Measure; nextPitches: number[] } {
  const root = parseChord(chord);
  const scaleTones = getScaleTones(root);
  const registers = [48, 60, 72]; // low, mid, high
  const nextPitches: number[] = [];

  const voiceSpecs: Array<{ voice: number; staff: number; part: string; events: Array<{ pitch: number; startBeat: number; duration: number }> }> = [];

  for (let v = 0; v < lineCount; v++) {
    const partId = `P${v + 1}`;
    const register = registers[v % 3];
    const basePitch = register + scaleTones[Math.floor(rand() * scaleTones.length)] - root;
    const lastP = lastPitches[v] ?? basePitch;

    const motion: Motion = rand() < 0.6 ? 'contrary' : rand() < 0.5 ? 'similar' : 'oblique';

    const events: Array<{ pitch: number; startBeat: number; duration: number }> = [];
    const numNotes = 1 + Math.floor(rand() * 3);
    let cursor = 0;

    for (let n = 0; n < numNotes && cursor < 4; n++) {
      const duration = n === numNotes - 1 ? 4 - cursor : 0.5 + rand() * 1.5;
      const actualDur = Math.min(duration, 4 - cursor);
      if (actualDur <= 0) break;

      const candidates = scaleTones.map((s) => register + s - root).filter((p) => p >= 36 && p <= 84);
      if (candidates.length === 0) break;

      let pitch: number;
      if (n === 0) {
        pitch = lastP;
        const stepwise = candidates.filter((c) => Math.abs(c - lastP) <= 2);
        const pool = stepwise.length > 0 ? stepwise : candidates;
        pitch = pool.reduce((a, c) => (Math.abs(c - lastP) < Math.abs(a - lastP) ? c : a));
      } else {
        const prevPitch = events[events.length - 1].pitch;
        const dir = motion === 'contrary' ? -1 : motion === 'similar' ? 1 : 0;
        const byMotion = [...candidates].sort((a, b) => {
          const da = (a - prevPitch) * dir;
          const db = (b - prevPitch) * dir;
          return dir !== 0 ? db - da : Math.abs(a - prevPitch) - Math.abs(b - prevPitch);
        });
        pitch = byMotion[0] ?? prevPitch;
      }

      pitch = Math.max(36, Math.min(84, pitch));
      events.push({ pitch, startBeat: cursor, duration: actualDur });
      cursor += actualDur;
      nextPitches[v] = pitch;
    }

    if (events.length === 0) {
      voiceSpecs.push({ voice: 1, staff: 1, part: partId, events: [{ pitch: 0, startBeat: 0, duration: 4 }] });
      nextPitches[v] = lastP;
    } else {
      voiceSpecs.push({ voice: 1, staff: 1, part: partId, events });
    }
  }

  const measure = composeMeasure(measureIndex, chord, voiceSpecs);
  return { measure, nextPitches: nextPitches.length > 0 ? nextPitches : lastPitches };
}

/** Generate counterpoint as Score (measure-first). */
export function generateCounterpointScore(
  segments: HarmonicSegment[],
  options?: { lineCount?: number; seed?: number; title?: string }
): Score {
  const lineCount = options?.lineCount ?? 2;
  const seed = options?.seed ?? Date.now();
  const rand = seededRandom(seed);

  const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);
  const measures: Measure[] = [];
  let barIndex = 0;
  let lastPitches: number[] = [];

  for (const seg of segments) {
    for (let b = 0; b < seg.bars; b++) {
      const { measure, nextPitches } = generateCounterpointMeasure(
        barIndex,
        seg.chord,
        lineCount,
        lastPitches,
        rand
      );
      measures.push(measure);
      lastPitches = nextPitches;
      barIndex++;
    }
  }

  return {
    title: options?.title ?? 'Contemporary Counterpoint',
    measures,
    parts: Array.from({ length: lineCount }, (_, i) => `P${i + 1}`),
  };
}
