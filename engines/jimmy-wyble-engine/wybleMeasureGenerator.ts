/**
 * Wyble Measure-First Generator
 * Algorithm: for measure in form → RH rhythm template → LH rhythm template → contrary motion → harmonic targets
 * Returns explicit timed events per bar.
 */

import type { Score, Measure } from '../../shared/scoreModel';
import { composeMeasure } from '../../shared/barComposer';
import type { ChordProgression } from './wybleEtudeGenerator';

const UPPER_MIN = 64;
const UPPER_MAX = 76;
const LOWER_MIN = 48;
const LOWER_MAX = 60;
const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const SCALE_DEGREES: Record<string, number[]> = {
  maj: [0, 2, 4, 5, 7, 9, 11],
  min: [0, 2, 3, 5, 7, 8, 10],
  dom: [0, 2, 4, 5, 7, 9, 10],
};

function parseChord(symbol: string): { root: string; quality: string } {
  const m = symbol.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
  if (!m) return { root: 'C', quality: 'maj' };
  let q = (m[2] ?? 'maj').toLowerCase();
  if (q === 'm7' || q === 'min7') q = 'min';
  if (q === '7' || q === 'dom7') q = 'dom';
  if (q === 'maj7') q = 'maj';
  return { root: m[1], quality: q };
}

function getChordTones(root: string, quality: string, octave: number): number[] {
  const base = (ROOT_MIDI[root] ?? 60) + (octave - 4) * 12;
  const degrees = SCALE_DEGREES[quality] ?? SCALE_DEGREES.maj;
  return degrees.map((d) => base + d);
}

function getChordForBar(progression: ChordProgression, barIndex: number): { chord: string; root: string; quality: string } {
  let acc = 0;
  for (const seg of progression) {
    if (barIndex < acc + seg.bars) {
      const { root, quality } = parseChord(seg.chord);
      return { chord: seg.chord, root, quality };
    }
    acc += seg.bars;
  }
  const last = progression[progression.length - 1];
  const { root, quality } = parseChord(last?.chord ?? 'C');
  return { chord: last?.chord ?? 'C', root, quality };
}

/** RH rhythm template: which beats get notes. Returns array of { startBeat, duration }. */
function rhRhythmTemplate(seed: number): Array<{ startBeat: number; duration: number }> {
  const r = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const events: Array<{ startBeat: number; duration: number }> = [];
  if (r() < 0.7) events.push({ startBeat: 0, duration: 1 });
  if (r() < 0.5) events.push({ startBeat: 1, duration: 1 });
  if (r() < 0.6) events.push({ startBeat: 2, duration: 1 });
  if (r() < 0.5) events.push({ startBeat: 3, duration: 1 });
  if (events.length === 0) events.push({ startBeat: 0, duration: 2 });
  return events.sort((a, b) => a.startBeat - b.startBeat);
}

/** LH rhythm template: often simpler, bass-like. */
function lhRhythmTemplate(seed: number): Array<{ startBeat: number; duration: number }> {
  const r = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const events: Array<{ startBeat: number; duration: number }> = [];
  if (r() < 0.9) events.push({ startBeat: 0, duration: 2 });
  if (r() < 0.6) events.push({ startBeat: 2, duration: 2 });
  if (events.length === 0) events.push({ startBeat: 0, duration: 4 });
  return events.sort((a, b) => a.startBeat - b.startBeat);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Pick pitch from chord tones in range, preferring stepwise from last. */
function pickPitch(candidates: number[], last: number, min: number, max: number): number {
  const inRange = candidates.filter((c) => c >= min && c <= max);
  const pool = inRange.length > 0 ? inRange : [clamp(last, min, max)];
  const stepwise = pool.filter((c) => Math.abs(c - last) <= 2);
  const choice = (stepwise.length > 0 ? stepwise : pool).reduce(
    (a, c) => (Math.abs(c - last) < Math.abs(a - last) ? c : a)
  );
  return clamp(choice, min, max);
}

/** Generate one measure of Wyble etude. */
function generateWybleMeasure(
  barIndex: number,
  progression: ChordProgression,
  lastUpper: number,
  lastLower: number,
  seed: number
): { measure: Measure; nextUpper: number; nextLower: number } {
  const { chord, root, quality } = getChordForBar(progression, barIndex);
  const upperTones = getChordTones(root, quality, 5).filter((t) => t >= UPPER_MIN && t <= UPPER_MAX);
  const lowerTones = getChordTones(root, quality, 3).filter((t) => t >= LOWER_MIN && t <= LOWER_MAX);

  const rhTemplate = rhRhythmTemplate(seed + barIndex * 7);
  const lhTemplate = lhRhythmTemplate(seed + barIndex * 11 + 1000);

  const rhEvents: Array<{ pitch: number; startBeat: number; duration: number }> = [];
  let curUpper = lastUpper;
  for (const slot of rhTemplate) {
    const pitch = pickPitch(upperTones, curUpper, UPPER_MIN, UPPER_MAX);
    curUpper = pitch;
    rhEvents.push({ pitch, startBeat: slot.startBeat, duration: slot.duration });
  }

  const lhEvents: Array<{ pitch: number; startBeat: number; duration: number }> = [];
  let curLower = lastLower;
  for (const slot of lhTemplate) {
    const pitch = pickPitch(lowerTones, curLower, LOWER_MIN, LOWER_MAX);
    curLower = pitch;
    lhEvents.push({ pitch, startBeat: slot.startBeat, duration: slot.duration });
  }

  // Apply contrary motion: if RH ascends, prefer LH descend and vice versa
  const rhDir = rhEvents.length >= 2 ? (rhEvents[rhEvents.length - 1].pitch - rhEvents[0].pitch) : 0;
  if (lhEvents.length >= 2 && Math.abs(rhDir) > 0) {
    const preferredDir = -Math.sign(rhDir);
    lhEvents.sort((a, b) => a.startBeat - b.startBeat);
    let prev = lastLower;
    for (let i = 0; i < lhEvents.length; i++) {
      const candidates = lowerTones.filter((t) => t >= LOWER_MIN && t <= LOWER_MAX);
      const byMotion = [...candidates].sort((a, b) => {
        const da = (a - prev) * preferredDir;
        const db = (b - prev) * preferredDir;
        return db - da;
      });
      const pitch = clamp(byMotion[0] ?? prev, LOWER_MIN, LOWER_MAX);
      lhEvents[i] = { ...lhEvents[i], pitch };
      prev = pitch;
    }
  }

  const measure = composeMeasure(barIndex, chord, [
    { voice: 1, staff: 1, part: 'P1', events: rhEvents },
    { voice: 2, staff: 2, part: 'P1', events: lhEvents },
  ]);

  const nextUpper = rhEvents.length > 0 ? rhEvents[rhEvents.length - 1].pitch : lastUpper;
  const nextLower = lhEvents.length > 0 ? lhEvents[lhEvents.length - 1].pitch : lastLower;

  return { measure, nextUpper: nextUpper, nextLower: nextLower };
}

/** Generate Wyble etude as Score (measure-first). */
export function generateWybleScore(
  progression: ChordProgression,
  options?: { seed?: number; title?: string }
): Score {
  const seed = options?.seed ?? Date.now();
  const bars = progression.reduce((sum, s) => sum + s.bars, 0);
  const measures: Measure[] = [];
  let lastUpper = 67;
  let lastLower = 55;

  for (let m = 0; m < bars; m++) {
    const { measure, nextUpper, nextLower } = generateWybleMeasure(m, progression, lastUpper, lastLower, seed);
    measures.push(measure);
    lastUpper = nextUpper;
    lastLower = nextLower;
  }

  return {
    title: options?.title ?? 'Wyble Etude',
    measures,
    parts: ['P1'],
  };
}
