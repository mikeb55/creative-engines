/**
 * Phase 6+7 — pedagogical single-line étude from motif spine + technical constraints.
 */

import type { MotifCell2 } from '../motif/themeGenome';
import { STRING_INSTRUMENTS, type StringInstrumentId } from './stringEnsemble';

export type EtudeTechnicalFocus =
  | 'scales'
  | 'arpeggios'
  | 'interval-skips'
  | 'chromatic'
  | 'position-shifts';

export interface EtudeConstraints {
  instrument: string;
  rangeMin: number;
  rangeMax: number;
  maxIntervalLeap: number;
  technicalFocus: EtudeTechnicalFocus;
  tempoMarking: string;
  bars: number;
}

function clampPitch(p: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, p));
}

function seededUnit(seed: number, i: number, salt: number): number {
  const x = Math.sin(seed * 0.001 + i * 1.7 + salt) * 10000;
  return x - Math.floor(x);
}

export function defaultEtudeConstraints(instrument: string): EtudeConstraints {
  const sid = instrument as StringInstrumentId;
  const si = STRING_INSTRUMENTS[sid];
  const lo = si?.rangeMin ?? 55;
  const hi = si?.rangeMax ?? 79;
  return {
    instrument,
    rangeMin: lo,
    rangeMax: hi,
    maxIntervalLeap: 12,
    technicalFocus: 'scales',
    tempoMarking: 'Andante',
    bars: 8,
  };
}

/** Generate MIDI pitches per bar (one note per beat × bars). */
export function generateEtudeMidiLine(
  motif: MotifCell2 | null,
  harmonyDegrees: number[],
  constraints: EtudeConstraints,
  seed: number
): number[][] {
  const beatsPerBar = 4;
  const bars: number[][] = [];
  let pitch = clampPitch(motif?.registerBand?.[0] ?? 60, constraints.rangeMin, constraints.rangeMax);

  const chordTones = harmonyDegrees.length ? harmonyDegrees : [0, 4, 7];
  const chromPool = [1, -1, 2, -2];
  const scalePool = [-2, -1, 1, 2];
  const skipPool = [-7, 7, -5, 5];
  const shiftPool = [-12, 12, -9, 9];

  for (let b = 0; b < constraints.bars; b++) {
    const bar: number[] = [];
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const u = seededUnit(seed, b * beatsPerBar + beat, 901);
      if (constraints.technicalFocus === 'arpeggios') {
        const deg = chordTones[Math.floor(u * chordTones.length)]!;
        const tonicBase = 60;
        let cand = tonicBase + deg;
        for (let k = 0; k < 8; k++) {
          if (cand >= constraints.rangeMin && cand <= constraints.rangeMax) break;
          if (cand < constraints.rangeMin) cand += 12;
          else cand -= 12;
        }
        pitch = clampPitch(cand, constraints.rangeMin, constraints.rangeMax);
      } else if (constraints.technicalFocus === 'scales') {
        const step = scalePool[Math.floor(u * scalePool.length)]!;
        pitch = clampPitch(pitch + step, constraints.rangeMin, constraints.rangeMax);
      } else if (constraints.technicalFocus === 'chromatic') {
        const step = chromPool[Math.floor(u * chromPool.length)]!;
        pitch = clampPitch(pitch + step, constraints.rangeMin, constraints.rangeMax);
      } else if (constraints.technicalFocus === 'interval-skips') {
        const step = skipPool[Math.floor(u * skipPool.length)]!;
        pitch = clampPitch(pitch + step, constraints.rangeMin, constraints.rangeMax);
      } else if (constraints.technicalFocus === 'position-shifts') {
        let step = shiftPool[Math.floor(u * shiftPool.length)]!;
        if (beat === 0 && b > 0 && u > 0.45) step = pitch < (constraints.rangeMin + constraints.rangeMax) / 2 ? 9 : -9;
        pitch = clampPitch(pitch + step, constraints.rangeMin, constraints.rangeMax);
      }
      bar.push(pitch);
    }
    bars.push(bar);
  }
  return bars;
}

export function maxMelodicIntervalInEtude(bars: number[][]): number {
  let max = 0;
  for (const bar of bars) {
    for (let i = 1; i < bar.length; i++) {
      max = Math.max(max, Math.abs(bar[i]! - bar[i - 1]!));
    }
  }
  return max;
}

export function allNotesAreChordTones(bars: number[][], tonicPc: number, chordTones: number[]): boolean {
  const set = new Set(chordTones.map((t) => (tonicPc + t) % 12));
  for (const bar of bars) {
    for (const p of bar) {
      if (!set.has(p % 12)) return false;
    }
  }
  return true;
}

export function etudeLineToMusicXmlSnippetsWithFingering(bars: number[][]): string {
  const rows: string[] = [];
  let step = 1;
  for (const bar of bars) {
    for (const _p of bar) {
      const fg = 1 + (step % 4);
      rows.push(
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><technical><fingering>${fg}</fingering></technical></note>`
      );
      step++;
    }
  }
  return rows.join('');
}
