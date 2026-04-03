/**
 * Wyble Etude (Composer OS): guitar part written one octave lower by default; rests and chord symbols unchanged.
 */

import {
  applyWybleEtudeGuitarPitchRegisterToScore,
  applyWybleEtudeGuitarWrittenPitch,
  WYBLE_ETUDE_GUITAR_PITCH_OFFSET_SEMITONES,
} from '../core/goldenPath/wybleBypassGenerator';
import { createMeasure, pushNote } from '../../core/measureBuilder';
import { MEASURE_DIVISIONS } from '../../core/timing';

export function runWybleEtudePitchOffsetTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'applyWybleEtudeGuitarWrittenPitch: typical upper note -12',
    ok: (() => {
      return applyWybleEtudeGuitarWrittenPitch(64) === 64 + WYBLE_ETUDE_GUITAR_PITCH_OFFSET_SEMITONES;
    })(),
  });

  tests.push({
    name: 'applyWybleEtudeGuitarWrittenPitch: rest stays 0',
    ok: (() => applyWybleEtudeGuitarWrittenPitch(0) === 0)(),
  });

  tests.push({
    name: 'applyWybleEtudeGuitarWrittenPitch: low note guard lifts octave (48→48)',
    ok: (() => {
      const p = applyWybleEtudeGuitarWrittenPitch(48);
      return p === 48;
    })(),
  });

  tests.push({
    name: 'applyWybleEtudeGuitarPitchRegisterToScore: all notes -12 vs baseline',
    ok: (() => {
      const m = createMeasure(0, [1, 2]);
      const c = { pos: 0 };
      pushNote(m, 1, 67, MEASURE_DIVISIONS, c);
      const c2 = { pos: 0 };
      pushNote(m, 2, 55, MEASURE_DIVISIONS, c2);
      const score = { measures: [m] };
      const before = {
        u: m.voices[1]![0]!.pitch,
        l: m.voices[2]![0]!.pitch,
      };
      applyWybleEtudeGuitarPitchRegisterToScore(score);
      return (
        m.voices[1]![0]!.pitch === before.u + WYBLE_ETUDE_GUITAR_PITCH_OFFSET_SEMITONES &&
        m.voices[2]![0]!.pitch === before.l + WYBLE_ETUDE_GUITAR_PITCH_OFFSET_SEMITONES
      );
    })(),
  });

  return tests;
}
