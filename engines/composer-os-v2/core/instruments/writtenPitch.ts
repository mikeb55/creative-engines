/**
 * Written versus sounding pitch for MusicXML transposition.
 * Beat positions elsewhere stay on the score grid. This module does not rewrite a score.
 */

import type { Transposition } from './instrumentTypes';

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface SpelledPitch {
  step: string;
  alter: number;
  octave: number;
  midi: number;
}

export function spellMidi(midi: number): SpelledPitch {
  const pc = ((midi % 12) + 12) % 12;
  const token = FLAT_NAMES[pc]!;
  const alter = token.endsWith('b') ? -1 : 0;
  const step = alter === 0 ? token : token[0]!;
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave, midi };
}

function naturalMidi(step: string, octave: number): number {
  return (octave + 1) * 12 + (STEP_PC[step] ?? 0);
}

function shiftDiatonic(pitch: SpelledPitch, diatonicSteps: number): { step: string; octave: number } {
  let index = STEPS.indexOf(pitch.step as (typeof STEPS)[number]);
  if (index < 0) index = 0;
  let octave = pitch.octave;
  const direction = Math.sign(diatonicSteps);
  let left = Math.abs(diatonicSteps);
  while (left > 0) {
    index += direction;
    if (index > 6) {
      index = 0;
      octave += 1;
    } else if (index < 0) {
      index = 6;
      octave -= 1;
    }
    left -= 1;
  }
  return { step: STEPS[index]!, octave };
}

function shiftOctave(pitch: SpelledPitch, octaves: number): SpelledPitch {
  if (octaves === 0) return pitch;
  return { ...pitch, octave: pitch.octave + octaves, midi: pitch.midi + octaves * 12 };
}

/**
 * Apply a written-to-sounding MusicXML interval in reverse, then undo octave-change.
 * Concert C5 on a B-flat trumpet ({ diatonic: -1, chromatic: -2, octaveChange: 0 }) is written D5.
 */
export function soundingToWritten(soundingMidi: number, transposition: Transposition): SpelledPitch {
  const sounding = shiftOctave(spellMidi(soundingMidi), -transposition.octaveChange);
  const stepped = shiftDiatonic(sounding, -transposition.diatonic);
  const midi = sounding.midi - transposition.chromatic;
  const alter = midi - naturalMidi(stepped.step, stepped.octave);
  return { step: stepped.step, alter, octave: stepped.octave, midi };
}

/** Written pitch plus the catalogue transposition returns the sounding pitch. */
export function writtenToSounding(written: SpelledPitch, transposition: Transposition): SpelledPitch {
  const stepped = shiftDiatonic(written, transposition.diatonic);
  const midi = written.midi + transposition.chromatic;
  const alter = midi - naturalMidi(stepped.step, stepped.octave);
  return shiftOctave(
    { step: stepped.step, alter, octave: stepped.octave, midi },
    transposition.octaveChange,
  );
}
