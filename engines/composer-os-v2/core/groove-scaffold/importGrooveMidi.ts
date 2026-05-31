/**
 * Raw MIDI groove import — channel-10 GM drums only; no pattern generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  beatsPerBarFromTimeSignature,
  GM_DRUM_MIDI_CHANNEL,
  midiPitchToGmDrumPitch,
  type GrooveDrumEvent,
  type ImportedGroove,
} from './importGrooveMidiTypes';

const HEADER_MAGIC = 'MThd';
const TRACK_MAGIC = 'MTrk';

interface RawNoteOn {
  tick: number;
  channel: number;
  pitch: number;
  velocity: number;
}

interface RawNoteOff {
  tick: number;
  channel: number;
  pitch: number;
}

interface ParsedMidi {
  format: number;
  ticksPerBeat: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  noteOns: RawNoteOn[];
  noteOffs: RawNoteOff[];
}

function readVarLen(data: Buffer, offset: { value: number }): number {
  let result = 0;
  while (offset.value < data.length) {
    const b = data[offset.value]!;
    offset.value += 1;
    result = (result << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) break;
  }
  return result;
}

function readAscii(data: Buffer, offset: { value: number }, len: number): string {
  const s = data.toString('ascii', offset.value, offset.value + len);
  offset.value += len;
  return s;
}

function readU16BE(data: Buffer, offset: { value: number }): number {
  const v = data.readUInt16BE(offset.value);
  offset.value += 2;
  return v;
}

function readU32BE(data: Buffer, offset: { value: number }): number {
  const v = data.readUInt32BE(offset.value);
  offset.value += 4;
  return v;
}

function parseTrackWithMeta(
  trackData: Buffer,
  noteOns: RawNoteOn[],
  noteOffs: RawNoteOff[],
  meta: { timeSignatureNumerator: number; timeSignatureDenominator: number },
): void {
  const offset = { value: 0 };
  let absTick = 0;
  let status = 0;

  while (offset.value < trackData.length) {
    absTick += readVarLen(trackData, offset);
    if (offset.value >= trackData.length) break;

    const b = trackData[offset.value]!;
    if (b >= 0x80) {
      status = b;
      offset.value += 1;
    }

    const cmd = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    if (cmd === 0x90) {
      const pitch = trackData[offset.value]!;
      const velocity = trackData[offset.value + 1]!;
      offset.value += 2;
      if (velocity > 0) {
        noteOns.push({ tick: absTick, channel, pitch, velocity });
      } else {
        noteOffs.push({ tick: absTick, channel, pitch });
      }
    } else if (cmd === 0x80) {
      const pitch = trackData[offset.value]!;
      offset.value += 2;
      noteOffs.push({ tick: absTick, channel, pitch });
    } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) {
      offset.value += 2;
    } else if (cmd === 0xc0 || cmd === 0xd0) {
      offset.value += 1;
    } else if (status === 0xff) {
      const metaType = trackData[offset.value]!;
      offset.value += 1;
      const metaLen = readVarLen(trackData, offset);
      if (metaType === 0x58 && metaLen >= 2) {
        meta.timeSignatureNumerator = trackData[offset.value]!;
        const denPow = trackData[offset.value + 1]!;
        meta.timeSignatureDenominator = 2 ** denPow;
      }
      offset.value += metaLen;
    } else if (status === 0xf0 || status === 0xf7) {
      const len = readVarLen(trackData, offset);
      offset.value += len;
    } else {
      break;
    }
  }
}

function parseMidiBuffer(data: Buffer): ParsedMidi {
  if (data.length < 14) {
    throw new Error('MIDI file too short to contain a valid MThd header');
  }

  const offset = { value: 0 };
  const magic = readAscii(data, offset, 4);
  if (magic !== HEADER_MAGIC) {
    throw new Error(`Invalid MIDI file: expected MThd header, got ${JSON.stringify(magic)}`);
  }

  const headerLen = readU32BE(data, offset);
  if (headerLen < 6) {
    throw new Error(`Invalid MIDI header length: ${headerLen}`);
  }

  const format = readU16BE(data, offset);
  const trackCount = readU16BE(data, offset);
  const division = readU16BE(data, offset);
  offset.value = 8 + headerLen;

  if (division & 0x8000) {
    throw new Error('SMPTE MIDI division is not supported for groove import');
  }

  const ticksPerBeat = division;
  const noteOns: RawNoteOn[] = [];
  const noteOffs: RawNoteOff[] = [];
  const meta = { timeSignatureNumerator: 4, timeSignatureDenominator: 4 };

  for (let t = 0; t < trackCount; t += 1) {
    if (offset.value + 8 > data.length) {
      throw new Error(`MIDI file truncated before track ${t + 1} of ${trackCount}`);
    }
    const trackMagic = readAscii(data, offset, 4);
    if (trackMagic !== TRACK_MAGIC) {
      throw new Error(`Invalid MIDI track chunk: expected MTrk, got ${JSON.stringify(trackMagic)}`);
    }
    const trackLen = readU32BE(data, offset);
    const trackEnd = offset.value + trackLen;
    if (trackEnd > data.length) {
      throw new Error(`MIDI track ${t + 1} extends past file end`);
    }
    const trackData = data.subarray(offset.value, trackEnd);
    parseTrackWithMeta(trackData, noteOns, noteOffs, meta);
    offset.value = trackEnd;
  }

  return {
    format,
    ticksPerBeat,
    timeSignatureNumerator: meta.timeSignatureNumerator,
    timeSignatureDenominator: meta.timeSignatureDenominator,
    noteOns,
    noteOffs,
  };
}

/** SD3 exports often land on MIDI channel 1; use when channel 10 has no GM hits. */
function selectDrumChannel(noteOns: RawNoteOn[]): number {
  const hasGmOnChannel = (channel: number): boolean =>
    noteOns.some((n) => n.channel === channel && midiPitchToGmDrumPitch(n.pitch) !== undefined);

  if (hasGmOnChannel(GM_DRUM_MIDI_CHANNEL)) return GM_DRUM_MIDI_CHANNEL;
  if (hasGmOnChannel(1)) return 1;
  return GM_DRUM_MIDI_CHANNEL;
}

function noteDurationTicks(on: RawNoteOn, noteOffs: RawNoteOff[], defaultTicks: number): number {
  const off = noteOffs.find((n) => n.channel === on.channel && n.pitch === on.pitch && n.tick >= on.tick);
  if (off) return Math.max(1, off.tick - on.tick);
  return defaultTicks;
}

function buildGrooveEvents(parsed: ParsedMidi, drumChannel: number, ticksPerBeat: number): GrooveDrumEvent[] {
  const defaultDurTicks = Math.max(1, Math.round(ticksPerBeat / 4));
  const channelNotes = parsed.noteOns.filter((n) => n.channel === drumChannel);
  const events: GrooveDrumEvent[] = [];

  for (const on of channelNotes) {
    const pitch = midiPitchToGmDrumPitch(on.pitch);
    if (pitch === undefined) continue;

    const durTicks = noteDurationTicks(on, parsed.noteOffs, defaultDurTicks);
    events.push({
      pitch,
      beatPosition: on.tick / ticksPerBeat,
      durationQuarters: durTicks / ticksPerBeat,
      velocity: on.velocity,
    });
  }

  events.sort((a, b) => a.beatPosition - b.beatPosition || a.pitch - b.pitch);
  return events;
}

function detectLoopLengthBars(
  events: GrooveDrumEvent[],
  numerator: number,
  denominator: number,
): number {
  const beatsPerBar = beatsPerBarFromTimeSignature(numerator, denominator);
  if (events.length === 0) return 1;
  const lastEnd = Math.max(...events.map((e) => e.beatPosition + e.durationQuarters));
  return Math.max(1, Math.ceil(lastEnd / beatsPerBar));
}

/**
 * Read a Standard MIDI File and extract GM drum note-ons (channel 10, or SD3 channel 1 fallback).
 * Never synthesises or infers drum patterns — only events present in the file.
 */
export function importExternalGrooveMidi(midiFilePath: string): ImportedGroove {
  let data: Buffer;
  try {
    data = fs.readFileSync(midiFilePath);
  } catch (err) {
    throw new Error(`Cannot read MIDI groove file "${midiFilePath}": ${String(err)}`);
  }

  let parsed: ParsedMidi;
  try {
    parsed = parseMidiBuffer(data);
  } catch (err) {
    throw new Error(`Cannot parse MIDI groove file "${path.basename(midiFilePath)}": ${String(err)}`);
  }

  const drumChannel = selectDrumChannel(parsed.noteOns);
  const events = buildGrooveEvents(parsed, drumChannel, parsed.ticksPerBeat);

  return {
    sourceFile: path.basename(midiFilePath),
    ticks_per_beat: parsed.ticksPerBeat,
    events,
    loopLengthBars: detectLoopLengthBars(
      events,
      parsed.timeSignatureNumerator,
      parsed.timeSignatureDenominator,
    ),
    timeSignatureNumerator: parsed.timeSignatureNumerator,
    timeSignatureDenominator: parsed.timeSignatureDenominator,
  };
}
