/**
 * Assemble ScoreModel for riff (guitar ± octave double-stop voice, optional bass).
 */

import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffRhythmSegment } from './riffTypes';
import { createMeasure, createNote, createRest, createScore } from '../score-model/scoreEventBuilder';
import { assignBassToBar } from './riffBass';
import { applyLoopClosure, assignMelodyToBar, enforceHook, type MelodyLine } from './riffMelody';
import type { RiffGeneratorParams } from './riffTypes';
import { buildMultiBarRhythm } from './riffRhythm';
import { mulberry32 } from './riffRandom';

function measuresFromChordLoop(chords: string[]): import('../score-model/scoreModelTypes').MeasureModel[] {
  return chords.map((chord, i) => createMeasure(i + 1, chord));
}

export interface BuiltRiffScore {
  score: ScoreModel;
  perBarRhythm: RiffRhythmSegment[][];
}

export function buildRiffScoreModel(params: RiffGeneratorParams): BuiltRiffScore {
  const rng = mulberry32(params.seed);
  const perBarRhythm = buildMultiBarRhythm(rng, params.grid, params.density, params.bars);
  const chords = [...params.chordSymbols];
  while (chords.length < params.bars) {
    chords.push(chords[chords.length - 1] ?? 'Am7');
  }

  const guitarMeasures = measuresFromChordLoop(chords);
  guitarMeasures[0]!.rehearsalMark = 'Riff';

  const wantBass = params.bassEnabled && params.lineMode === 'guitar_bass';
  const bassMeasures = wantBass ? measuresFromChordLoop(chords) : null;

  const perBarMelody: MelodyLine[][] = [];
  let prevLast: number | undefined;
  let firstPitch: number | undefined;

  for (let b = 0; b < params.bars; b++) {
    const chord = chords[b]!;
    const barRh = perBarRhythm[b]!;
    const { notes, lastPitch } = assignMelodyToBar(
      barRh,
      chord,
      params.style,
      rng,
      b,
      firstPitch,
      prevLast
    );
    if (b === 0 && notes[0]) firstPitch = notes[0].pitch;
    perBarMelody.push(notes);
    prevLast = lastPitch;
  }

  enforceHook(perBarMelody.flat(), rng);

  if (firstPitch !== undefined && params.bars >= 1) {
    applyLoopClosure(perBarMelody[params.bars - 1]!, firstPitch, rng);
  }

  const doubleOct = params.lineMode === 'octave_double';

  for (let b = 0; b < params.bars; b++) {
    const gm = guitarMeasures[b]!;
    const lines = perBarMelody[b]!;
    const ev = [];
    for (const ln of lines) {
      ev.push(createNote(ln.pitch, ln.startBeat, ln.duration, 1));
      if (doubleOct) {
        ev.push(createNote(ln.pitch + 12, ln.startBeat, ln.duration, 2));
      }
    }
    if (ev.length === 0) {
      gm.events = [createRest(0, 4, 1)];
    } else {
      gm.events = ev;
    }

    if (bassMeasures) {
      const bnotes = assignBassToBar(perBarRhythm[b]!, chords[b]!, rng);
      bassMeasures[b]!.events = bnotes.map((n) => createNote(n.pitch, n.startBeat, n.duration, 1));
    }
  }

  const guitarPart: PartModel = {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: guitarMeasures,
  };

  const parts: PartModel[] = [guitarPart];
  if (bassMeasures) {
    parts.push({
      id: 'bass',
      name: 'Acoustic Upright Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: bassMeasures,
    });
  }

  const score = createScore(params.title?.trim() || 'Riff', parts, {
    tempo: params.bpm,
  });
  return { score, perBarRhythm };
}
