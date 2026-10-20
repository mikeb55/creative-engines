/**
 * Full-score MIDI export (Type-1 SMF): conductor meta + one melodic track per {@link PartModel}.
 * Uses same PPQ / tempo / meter sequencing patterns as {@link midiDrumGuideWriter}.
 */

import * as fs from 'fs';
import * as path from 'path';
import MidiWriter from 'midi-writer-js';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import {
  measureDivisionsForMeter,
  resolveMeasureDivisionsForBar,
  resolveMeterForBar,
} from '../rhythm/oddMeterQuantiser';
import type { ChordEvent, MeasureModel, NoteEvent, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import { integralTicks } from '../piano/pianoExactTiming';
import { writtenToSounding } from '../instruments/writtenPitch';
import { CONCERT_TRANSPOSITION } from '../instruments/instrumentTypes';
import { GROOVE_DRUMS_INSTRUMENT_IDENTITY, GROOVE_DRUMS_PART_ID } from '../groove-scaffold/grooveScaffold';

/** Pulses per quarter (aligned with MusicXML divisions / drum guide). */
export const SCORE_MIDI_PPQ = DIVISIONS;

function tempoMetaBytes(bpm: number): number[] {
  const usPerQuarter = Math.round(60_000_000 / Math.max(1, bpm));
  return [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff];
}

function timeSigMetaBytes(numerator: number, denominator: number): number[] {
  const denPow = Math.round(Math.log2(denominator));
  return [0xff, 0x58, 0x04, numerator & 0xff, denPow & 0xff, 24, 8];
}

/** Map MIDI velocity 1–127 to midi-writer-js 1–100. */
function writerVelocityFromMidi(midi127: number): number {
  const clamped = Math.max(1, Math.min(127, Math.round(midi127)));
  return Math.max(1, Math.min(100, Math.round((clamped / 127) * 100)));
}

function createPrebuiltTrack(rawData: number[]): InstanceType<typeof MidiWriter.Track> {
  const track = new MidiWriter.Track();
  track.buildData = function buildData(options?: { ticksPerBeat?: number }) {
    this.data = rawData;
    this.size = MidiWriter.Utils.numberToBytes(this.data.length, 4);
    this.type = MidiWriter.Constants.TRACK_CHUNK_TYPE;
    return this;
  };
  return track;
}

/** Ordered meta events with absolute ticks (tempo + one time signature per bar start). */
function buildConductorTrackBytes(
  bpm: number,
  totalBars: number,
  barMeterMap?: BarMeterMap,
  tempoMap?: ScoreModel['tempoMap'],
): number[] {
  const utils = MidiWriter.Utils;
  type Queued = { t: number; order: number; bytes: number[] };
  const q: Queued[] = [];
  q.push({ t: 0, order: 0, bytes: tempoMetaBytes(bpm) });
  let cumTick = 0;
  for (let i = 0; i < totalBars; i++) {
    const barNum = i + 1;
    const sig = resolveMeterForBar(barNum, barMeterMap);
    q.push({
      t: cumTick,
      order: i + 1,
      bytes: timeSigMetaBytes(sig.numerator, sig.denominator),
    });
    cumTick += measureDivisionsForMeter(sig.numerator, sig.denominator);
  }
  if (tempoMap && tempoMap.length > 0) {
    let origin = 0;
    for (let i = 0; i < totalBars; i += 1) {
      const barNum = i + 1;
      for (const event of tempoMap) {
        if (event.bar !== barNum) continue;
        const quarterBpm = event.beatUnit === 'half'
          ? event.bpm * 2
          : event.beatUnit === 'eighth'
            ? event.bpm / 2
            : event.beatUnit === 'dotted-quarter'
              ? event.bpm * 1.5
              : event.bpm;
        q.push({
          t: origin + Math.round(event.beat * SCORE_MIDI_PPQ),
          order: 0,
          bytes: tempoMetaBytes(quarterBpm),
        });
      }
      const sig = resolveMeterForBar(barNum, barMeterMap);
      origin += measureDivisionsForMeter(sig.numerator, sig.denominator);
    }
  }
  q.sort((a, b) => a.t - b.t || a.order - b.order);

  const out: number[] = [];
  let prevTick = 0;
  for (const ev of q) {
    const delta = ev.t - prevTick;
    prevTick = ev.t;
    out.push(...utils.numberToVariableLength(delta), ...ev.bytes);
  }
  out.push(0x00, 0xff, 0x2f, 0x00);
  return out;
}

function scoreTotalBars(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

function findMeasureForBar(part: PartModel, bar1Based: number): MeasureModel | undefined {
  return part.measures.find((mm) => mm.index === bar1Based);
}

/** Prefer explicit measure span when any part carries it; else fall back to meter map / 4/4. */
function measureLengthTicks(
  bar1Based: number,
  score: ScoreModel,
  barMeterMap: BarMeterMap | undefined
): number {
  for (const p of score.parts) {
    const m = findMeasureForBar(p, bar1Based);
    if (m?.measureBeatSpanQuarters != null && Number.isFinite(m.measureBeatSpanQuarters)) {
      return Math.round(m.measureBeatSpanQuarters * SCORE_MIDI_PPQ);
    }
  }
  const map = barMeterMap ?? score.barMeterMap;
  return resolveMeasureDivisionsForBar(bar1Based, map);
}

function cumulativeBarOffsets(score: ScoreModel, totalBars: number, barMeterMap: BarMeterMap | undefined): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (let b = 1; b <= totalBars; b++) {
    starts.push(acc);
    acc += measureLengthTicks(b, score, barMeterMap);
  }
  return starts;
}

function isNoteLike(e: ScoreEvent): e is NoteEvent | ChordEvent {
  return e.kind === 'note' || e.kind === 'chord';
}

function pitchesFromNoteLike(e: NoteEvent | ChordEvent): number[] {
  if (e.kind === 'chord') {
    return [...new Set(e.pitches.map((p) => Math.round(p)).filter((p) => p >= 0 && p <= 127))].sort(
      (a, b) => a - b
    );
  }
  const raw = [e.pitch, ...(e.pitches ?? [])];
  return [...new Set(raw.map((p) => Math.round(p)).filter((p) => p >= 0 && p <= 127))].sort((a, b) => a - b);
}

/** MIDI channels 1–16 melodic; skip 10 (GM drums). */
function melodicChannelForPartIndex(partIndex: number): number {
  let ch = (partIndex % 15) + 1;
  if (ch >= 10) ch++;
  return ch;
}

function midiChannelForPart(part: PartModel, partIndex: number, e2: boolean): number {
  const drums = part.id === GROOVE_DRUMS_PART_ID
    || part.instrumentIdentity === GROOVE_DRUMS_INSTRUMENT_IDENTITY
    || part.instrumentIdentity === 'big_band_jazz_drums';
  if (drums && (e2 || part.id === GROOVE_DRUMS_PART_ID || part.instrumentIdentity === GROOVE_DRUMS_INSTRUMENT_IDENTITY)) return 10;
  if (part.instrumentIdentity === 'orchestral_percussion') return 10;
  if (e2 && partIndex >= 15) throw new Error(`E2 MIDI refuses channel wrap for part ${part.id}`);
  return melodicChannelForPartIndex(partIndex);
}

function hasRenderableNotes(score: ScoreModel): boolean {
  if (!score.parts?.length) return false;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (isNoteLike(e) && pitchesFromNoteLike(e).length > 0) return true;
      }
    }
  }
  return false;
}

export interface WriteScoreMidiOptions {
  /** Overrides {@link ScoreModel.tempo} when set. */
  bpm?: number;
  /** Overrides {@link ScoreModel.barMeterMap} when resolving meters (same as MusicXML export). */
  barMeterMap?: BarMeterMap;
  /** Writes conductor and part tracks when every part rests. The channel-wrap guard stays. */
  allowEmpty?: boolean;
}

/** Channel used by E2 sounding export. Channel 10 is only an explicit percussion mapping. */
export function e2SoundingChannel(part: PartModel, partIndex: number): number {
  return midiChannelForPart(part, partIndex, true);
}

function mergeTieChains(
  rows: readonly { pitch: number; startTick: number; durTicks: number; velocity: number; tie?: 'start' | 'stop' | 'continue'; voice: number }[],
): Array<{ pitch: number; startTick: number; durTicks: number; velocity: number }> {
  const pending = rows.map((row, index) => ({ ...row, index }));
  const used = new Set<number>();
  const out: Array<{ pitch: number; startTick: number; durTicks: number; velocity: number }> = [];
  for (const row of pending) {
    if (used.has(row.index)) continue;
    if (row.tie === 'stop' || row.tie === 'continue') {
      const owned = pending.some((other) => other.tie === 'start' && other.voice === row.voice && other.pitch === row.pitch && other.startTick < row.startTick);
      if (owned) continue;
    }
    let end = row.startTick + row.durTicks;
    if (row.tie === 'start' || row.tie === 'continue') {
      for (let guard = 0; guard < 12; guard += 1) {
        const next = pending.find((item) => !used.has(item.index)
          && item.voice === row.voice
          && item.pitch === row.pitch
          && item.startTick === end
          && (item.tie === 'stop' || item.tie === 'continue'));
        if (!next) break;
        used.add(next.index);
        end = next.startTick + next.durTicks;
        if (next.tie === 'stop') break;
      }
    }
    out.push({ pitch: row.pitch, startTick: row.startTick, durTicks: end - row.startTick, velocity: row.velocity });
  }
  return out;
}

/**
 * Writes a Type-1 SMF to `outputPath` (conductor + one track per part).
 * @returns true when a non-empty file was written.
 */
export function writeScoreModelMidiFile(score: ScoreModel, outputPath: string, options?: WriteScoreMidiOptions): boolean {
  const totalBars = scoreTotalBars(score);
  if (totalBars < 1 || (!hasRenderableNotes(score) && !options?.allowEmpty)) {
    return false;
  }

  const barMeterMap = options?.barMeterMap ?? score.barMeterMap;
  const bpm = options?.bpm ?? score.tempo ?? 120;

  const e2 = score.e2SoundingMidi === true;
  const metaRaw = buildConductorTrackBytes(bpm, totalBars, barMeterMap, e2 ? score.tempoMap : undefined);
  const metaTrack = createPrebuiltTrack(metaRaw);

  const barStarts = cumulativeBarOffsets(score, totalBars, barMeterMap);

  const tracks: InstanceType<typeof MidiWriter.Track>[] = [metaTrack];

  score.parts.forEach((part, pi) => {
    const channel = midiChannelForPart(part, pi, e2);
    const prog = Math.max(0, Math.min(127, Math.round(part.midiProgram)));

    const track = new MidiWriter.Track();
    if (channel !== 10) {
      track.addEvent(
        new MidiWriter.ProgramChangeEvent({
          instrument: prog,
          channel,
        })
      );
    }
    const label = (part.name || part.id || `part_${pi}`).slice(0, 128);
    track.addEvent(new MidiWriter.TrackNameEvent({ text: label }));
    const queued: Array<{ pitch: number; startTick: number; durTicks: number; velocity: number; tie?: 'start' | 'stop' | 'continue'; voice: number }> = [];

    for (let bar = 1; bar <= totalBars; bar++) {
      const meas = findMeasureForBar(part, bar);
      const baseTick = barStarts[bar - 1] ?? 0;
      if (!meas) continue;

      for (const ev of meas.events) {
        if (!isNoteLike(ev)) continue;
        const pitches = pitchesFromNoteLike(ev);
        if (pitches.length === 0) continue;

        const startBeat = ev.startBeat;
        const durationBeats = ev.duration;
        if (!Number.isFinite(startBeat) || !Number.isFinite(durationBeats)) continue;

        const exact = ev.kind === 'note' || ev.kind === 'rest' ? ev.pianoExact : undefined;
        if (ev.kind === 'rest') continue;
        const exactStart = exact ? integralTicks(exact.onsetQ, SCORE_MIDI_PPQ) : null;
        const exactDur = exact ? integralTicks(exact.durationQ, SCORE_MIDI_PPQ) : null;
        if (exact && (exactStart === null || exactDur === null)) {
          throw new Error(`MIDI PPQ ${SCORE_MIDI_PPQ} cannot represent exact timing ${exact.onsetQ.n}/${exact.onsetQ.d}`);
        }
        const startTick = exactStart !== null ? baseTick + exactStart : baseTick + Math.round(startBeat * SCORE_MIDI_PPQ);
        let durTicks = exactDur !== null ? exactDur : Math.round(durationBeats * SCORE_MIDI_PPQ);
        if (durTicks < 1) durTicks = 1;

        const velRaw =
          ev.kind === 'note' && ev.velocity != null && Number.isFinite(ev.velocity)
            ? ev.velocity
            : 90;
        const velocity = writerVelocityFromMidi(velRaw);
        const transposition = score.exportPartTranspose?.[part.id] ?? CONCERT_TRANSPOSITION;
        const sounding = (written: number, spelling?: { step: string; alter: number }): number => {
          if (!e2 || channel === 10) return written;
          const octave = Math.floor(written / 12) - 1;
          return writtenToSounding(
            { step: spelling?.step ?? 'C', alter: spelling?.alter ?? 0, octave, midi: written },
            transposition,
          ).midi;
        };

        const durStr = `t${durTicks}`;
        const tie = ev.kind === 'note' ? ev.notation?.tie : undefined;
        const voice = ev.voice ?? 1;
        for (const pitch of pitches) {
          const soundingPitch = sounding(pitch, ev.kind === 'note' ? ev.spelling : ev.kind === 'chord' ? undefined : undefined);
          if (e2) {
            queued.push({ pitch: soundingPitch, startTick, durTicks, velocity, voice, ...(tie ? { tie } : {}) });
            continue;
          }
          const noteEvent = new MidiWriter.NoteEvent({
            pitch,
            startTick,
            duration: durStr,
            channel,
            velocity,
          });
          // midi-writer-js stores `startTick || null`. Tick 0 is dropped, and the note
          // is then queued after the previous sequential note instead of on the downbeat.
          if (startTick === 0) noteEvent.tick = 0;
          track.addEvent(noteEvent);
        }
      }
    }

    const midiNotes = e2 ? mergeTieChains(queued) : [];
    for (const note of midiNotes) {
      const noteEvent = new MidiWriter.NoteEvent({
        pitch: note.pitch,
        startTick: note.startTick,
        duration: `t${note.durTicks}`,
        channel,
        velocity: note.velocity,
      });
      if (note.startTick === 0) noteEvent.tick = 0;
      track.addEvent(noteEvent);
    }

    tracks.push(track);
  });

  const writer = new MidiWriter.Writer(tracks, { ticksPerBeat: SCORE_MIDI_PPQ });
  let bytes = Buffer.from(writer.buildFile());
  if (score.midiExpression && score.midiExpression.length > 0) {
    const inserts: MidiControllerInsert[] = [];
    score.parts.forEach((part, partIndex) => {
      const events = score.midiExpression!.filter((event) => event.partId === part.id);
      for (const event of events) {
        const tick = (barStarts[event.bar - 1] ?? 0) + Math.round(event.beat * SCORE_MIDI_PPQ);
        inserts.push({
          trackIndex: partIndex + 1,
          tick,
          channelNibble: midiChannelForPart(part, partIndex, e2) - 1,
          controller: event.controller,
          value: Math.max(0, Math.min(127, Math.round(event.value))),
        });
      }
    });
    bytes = Buffer.from(spliceMidiControllers(bytes, inserts));
  }
  fs.writeFileSync(outputPath, bytes);
  return true;
}

interface MidiControllerInsert {
  trackIndex: number;
  tick: number;
  channelNibble: number;
  controller: number;
  value: number;
}

function readVariableLength(data: Buffer, pos: number): { value: number; pos: number } {
  let value = 0;
  let byte = 0;
  do {
    byte = data[pos++]!;
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return { value, pos };
}

function writeVariableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

/** Inserts controller events without moving existing note ticks. No inserts leaves the file unread. */
export function spliceMidiControllers(data: Buffer, inserts: readonly MidiControllerInsert[]): Buffer {
  if (!inserts.length) return data;
  const headerLength = data.readUInt32BE(4);
  let pos = 8 + headerLength;
  const trackStarts: number[] = [];
  const trackEnds: number[] = [];
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const length = data.readUInt32BE(pos + 4);
    trackStarts.push(pos);
    trackEnds.push(pos + 8 + length);
    pos += 8 + length;
  }
  const rebuilt: Buffer[] = [data.subarray(0, trackStarts[0] ?? data.length)];
  for (let trackIndex = 0; trackIndex < trackStarts.length; trackIndex += 1) {
    const events = readTrackEvents(data, trackStarts[trackIndex]! + 8, trackEnds[trackIndex]!);
    const additions = inserts.filter((insert) => insert.trackIndex === trackIndex);
    for (const insert of additions) {
      const noteOrder = events
        .filter((event) => event.tick === insert.tick && (event.body[0]! & 0xf0) === 0x90)
        .map((event) => event.order);
      events.push({
        tick: insert.tick,
        order: noteOrder.length ? Math.min(...noteOrder) - 0.1 : 1_000_000 + insert.controller,
        body: [0xb0 | (insert.channelNibble & 0x0f), insert.controller & 0x7f, insert.value & 0x7f],
      });
    }
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const end = events.findIndex((event) => event.body[0] === 0xff && event.body[1] === 0x2f);
    if (end >= 0 && end !== events.length - 1) {
      const [ending] = events.splice(end, 1);
      if (ending) events.push(ending);
    }
    rebuilt.push(encodeTrack(events));
  }
  return Buffer.concat(rebuilt);
}

function readTrackEvents(data: Buffer, start: number, end: number): Array<{ tick: number; order: number; body: number[] }> {
  const events: Array<{ tick: number; order: number; body: number[] }> = [];
  let pos = start;
  let tick = 0;
  let status = 0;
  let order = 0;
  while (pos < end) {
    const delta = readVariableLength(data, pos);
    pos = delta.pos;
    tick += delta.value;
    if (data[pos]! >= 0x80) status = data[pos++]!;
    let body: number[];
    if (status === 0xff) {
      const type = data[pos++]!;
      const length = readVariableLength(data, pos);
      pos = length.pos;
      body = [0xff, type, ...writeVariableLength(length.value), ...data.subarray(pos, pos + length.value)];
      pos += length.value;
    } else if (status === 0xf0 || status === 0xf7) {
      const length = readVariableLength(data, pos);
      pos = length.pos;
      body = [status, ...writeVariableLength(length.value), ...data.subarray(pos, pos + length.value)];
      pos += length.value;
    } else {
      const kind = status & 0xf0;
      const size = kind === 0xc0 || kind === 0xd0 ? 1 : 2;
      body = [status, ...data.subarray(pos, pos + size)];
      pos += size;
    }
    events.push({ tick, order: order++, body });
  }
  return events;
}

function encodeTrack(events: Array<{ tick: number; body: number[] }>): Buffer {
  const bytes: number[] = [];
  let previous = 0;
  for (const event of events) {
    bytes.push(...writeVariableLength(event.tick - previous), ...event.body);
    previous = event.tick;
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([Buffer.from('MTrk'), length, Buffer.from(bytes)]);
}

/**
 * Writes `<baseName>.mid` under `outputDir` next to the MusicXML export.
 * @returns absolute `.mid` path when written, otherwise `undefined`.
 */
export function writeScoreMidi(
  score: ScoreModel,
  outputDir: string,
  baseName: string,
  barMeterMap?: BarMeterMap,
  bpmOverride?: number
): string | undefined {
  const safeBase = baseName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'score';
  const midPath = path.join(outputDir, `${safeBase}.mid`);
  const ok = writeScoreModelMidiFile(score, midPath, { barMeterMap, bpm: bpmOverride });
  return ok ? midPath : undefined;
}
