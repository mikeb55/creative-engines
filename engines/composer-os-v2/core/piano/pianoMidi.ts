/**
 * Piano MIDI file with sustain-pedal CC 64.
 * Note ticks come from the existing score MIDI writer. Pedal is added afterwards.
 * Note-on and note-off ticks are checked and must not move.
 */

import * as fs from 'fs';
import { Midi } from '@tonejs/midi';
import { writeScoreModelMidiFile } from '../export/midiScoreWriter';
import type { MeasureModel, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import { integralTicks, q, qAdd } from './pianoExactTiming';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';

function quarterSpan(score: ScoreModel, measure: MeasureModel): number {
  if (measure.measureBeatSpanQuarters != null && Number.isFinite(measure.measureBeatSpanQuarters)) {
    return measure.measureBeatSpanQuarters;
  }
  const beats = score.timeSignature?.beats ?? 4;
  const beatType = score.timeSignature?.beatType ?? 4;
  return beats * (4 / beatType);
}

function pitchKey(note: NoteEvent): string {
  return [...new Set([note.pitch, ...(note.pitches ?? [])])].sort((a, b) => a - b).join(',');
}

/**
 * A tie is one sounding attack. MusicXML keeps the tied notation.
 * MIDI receives the joined duration and does not retrigger the continuation.
 */
function scoreWithSoundingTies(score: ScoreModel): ScoreModel {
  const tied = score.parts.some((part) => part.measures.some((measure) => (
    measure.events.some((event) => event.kind === 'note' && event.notation?.tie)
  )));
  if (!tied) return score;
  const copy = structuredClone(score);
  for (const part of copy.parts) {
    const measures = [...part.measures].sort((a, b) => a.index - b.index);
    const origin = new Map<number, number>();
    let cursor = 0;
    for (const measure of measures) {
      origin.set(measure.index, cursor);
      cursor += quarterSpan(copy, measure);
    }
    const ordered: { note: NoteEvent; absStart: number }[] = [];
    for (const measure of measures) {
      const base = origin.get(measure.index) ?? 0;
      for (const event of measure.events) {
        if (event.kind === 'note') ordered.push({ note: event, absStart: base + event.startBeat });
      }
    }
    ordered.sort((a, b) => a.absStart - b.absStart || (a.note.voice ?? 1) - (b.note.voice ?? 1) || a.note.pitch - b.note.pitch);
    const open = new Map<string, { note: NoteEvent; absEnd: number }>();
    const remove = new Set<NoteEvent>();
    for (const item of ordered) {
      const key = `${item.note.voice ?? 1}|${pitchKey(item.note)}`;
      const prev = open.get(key);
      const tie = item.note.notation?.tie;
      const prevTie = prev?.note.notation?.tie;
      const continues = Boolean(
        prev
        && Math.abs(prev.absEnd - item.absStart) < 1e-4
        && (prevTie === 'start' || prevTie === 'continue')
        && (tie === 'stop' || tie === 'continue'),
      );
      if (prev && continues) {
        if (prev.note.pianoExact && item.note.pianoExact) {
          const durationQ = qAdd(prev.note.pianoExact.durationQ, item.note.pianoExact.durationQ);
          prev.note.pianoExact = { ...prev.note.pianoExact, durationQ };
          prev.note.duration = durationQ.n / durationQ.d;
          prev.absEnd = item.absStart + item.note.duration;
        } else {
          prev.note.duration += item.note.duration;
          prev.absEnd += item.note.duration;
        }
        prev.note.notation = { ...prev.note.notation, tie };
        remove.add(item.note);
      } else {
        open.set(key, { note: item.note, absEnd: item.absStart + item.note.duration });
      }
    }
    for (const measure of measures) {
      measure.events = measure.events.filter((event) => event.kind !== 'note' || !remove.has(event));
    }
  }
  return copy;
}

export interface PianoMidiNote {
  midi: number;
  ticks: number;
  durationTicks: number;
}

export function pianoMidiNotes(filePath: string): { notes: PianoMidiNote[]; pedal: { ticks: number; value: number }[]; ppq: number } {
  const midi = new Midi(fs.readFileSync(filePath));
  const notes: PianoMidiNote[] = [];
  const pedal: { ticks: number; value: number }[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({ midi: note.midi, ticks: note.ticks, durationTicks: note.durationTicks });
    }
    for (const cc of track.controlChanges[64] ?? []) {
      pedal.push({ ticks: cc.ticks, value: Math.round(cc.value * 127) });
    }
  }
  notes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
  return { notes, pedal, ppq: midi.header.ppq };
}

export function writePianoScoreMidi(score: ScoreModel, outputPath: string): void {
  if (!writeScoreModelMidiFile(scoreWithSoundingTies(score), outputPath, { bpm: score.tempo })) {
    throw new Error('Piano MIDI writer produced no file.');
  }
  const before = pianoMidiNotes(outputPath);
  if (!score.pianoPedal?.length) return;
  const midi = new Midi(fs.readFileSync(outputPath));
  const track = midi.tracks.find((item) => item.notes.length > 0);
  if (!track) throw new Error('Piano MIDI file has no notes.');
  for (const pedal of score.pianoPedal) {
    let ticks = Math.round(((pedal.bar - 1) * 4 + pedal.beat) * DIVISIONS);
    if (score.pianoV11StageA?.enabled) {
      const part = score.parts.find((item) => item.pianoGrandStaff) ?? score.parts[0];
      let origin = q(0, 1);
      for (const measure of [...(part?.measures ?? [])].sort((a, b) => a.index - b.index)) {
        if (measure.index === pedal.bar) break;
        origin = qAdd(origin, q(Math.round((measureBeatSpanQuartersOf(measure)) * 480), 480));
      }
      const at = qAdd(origin, q(Math.round(pedal.beat * 480), 480));
      const exact = integralTicks(at, score.pianoV11StageA.divisions);
      if (exact === null) throw new Error('Piano pedal offset is not integral at the Stage A PPQ.');
      ticks = exact;
    }
    track.addCC({
      number: 64,
      ticks,
      value: pedal.type === 'start' ? 1 : 0,
    });
  }
  fs.writeFileSync(outputPath, Buffer.from(midi.toArray()));
  const after = pianoMidiNotes(outputPath);
  if (after.ppq !== before.ppq || JSON.stringify(after.notes) !== JSON.stringify(before.notes)) {
    throw new Error('Adding piano pedal moved MIDI notes.');
  }
}
