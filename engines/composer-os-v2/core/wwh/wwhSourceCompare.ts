/**
 * Semantic compare of a locked source span with the generated copy.
 * Measure numbers and layout may differ. Notes, pitches, onsets, durations,
 * rests, ties, harmony, metre, divisions, key, clef, tempo, and navigation may not.
 */

import type { WwhImportedMeasure, WwhImportedNote } from './wwhDuoImport';
import { tempoKey } from './wwhTiming';

function noteToken(note: WwhImportedNote, onset: number): string {
  const mod = note.timeModification
    ? `${note.timeModification.actualNotes}/${note.timeModification.normalNotes}/${note.timeModification.normalType}`
    : '';
  return [
    onset,
    note.voice,
    note.rest ? 'rest' : 'pitch',
    note.chord ? 'chord' : 'attack',
    note.step ?? '',
    note.alter ?? 0,
    note.octave ?? '',
    note.duration,
    note.type ?? '',
    note.dots,
    note.tieStart ? 'tie-start' : '',
    note.tieStop ? 'tie-stop' : '',
    mod,
  ].join(':');
}

function sequence(measure: WwhImportedMeasure): string[] {
  const onset = new Map<string, number>();
  return measure.notes.map((note) => {
    const at = onset.get(note.voice) ?? 0;
    if (!note.chord) onset.set(note.voice, at + note.duration);
    return noteToken(note, at);
  });
}

function compareMeasure(source: WwhImportedMeasure, copy: WwhImportedMeasure, label: string): string[] {
  const errors: string[] = [];
  const fields: Array<[string, string, string]> = [
    ['beats', String(source.beats), String(copy.beats)],
    ['beatType', String(source.beatType), String(copy.beatType)],
    ['divisions', String(source.divisions), String(copy.divisions)],
    ['fifths', String(source.fifths), String(copy.fifths)],
    ['mode', source.mode, copy.mode],
    ['clef', `${source.clefSign}${source.clefLine}`, `${copy.clefSign}${copy.clefLine}`],
    ['transpose', String(source.transposeOctave), String(copy.transposeOctave)],
    ['tempo', tempoKey(source.tempo), tempoKey(copy.tempo)],
    ['harmony', source.harmony.join(' | '), copy.harmony.join(' | ')],
    ['rehearsal', source.rehearsal.join(' | '), copy.rehearsal.join(' | ')],
    ['repeat', String(source.hasRepeat), String(copy.hasRepeat)],
    ['ending', String(source.hasEnding), String(copy.hasEnding)],
    ['implicit', String(source.implicit), String(copy.implicit)],
  ];
  for (const [name, left, right] of fields) {
    if (left !== right) errors.push(`${label} ${name} ${right} != ${left}`);
  }
  const leftNotes = sequence(source);
  const rightNotes = sequence(copy);
  if (leftNotes.join('\n') !== rightNotes.join('\n')) {
    errors.push(`${label} notes differ`);
  }
  return errors;
}

export function compareLockedSpan(
  source: readonly WwhImportedMeasure[],
  copy: readonly WwhImportedMeasure[],
  label: string
): string[] {
  const errors: string[] = [];
  if (source.length !== copy.length) errors.push(`${label} bar count ${copy.length} != ${source.length}`);
  const count = Math.min(source.length, copy.length);
  for (let index = 0; index < count; index++) {
    errors.push(...compareMeasure(source[index]!, copy[index]!, `${label} m${index + 1}`));
  }
  return errors;
}
