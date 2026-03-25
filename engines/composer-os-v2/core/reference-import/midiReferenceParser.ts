/**
 * Minimal Standard MIDI File (SMF) behavioural extraction — note on / pitch / rough bar mapping.
 * Not a full sequencer; safe partial results on unusual files.
 */

import type { ReferencePiece, ReferencePitchSummary, ReferenceNoteSample } from './referencePieceTypes';
import { emptyImportFailure, importSuccess, type ReferenceImportResult } from './referenceImportTypes';

function readUint32BE(buf: Uint8Array, o: number): number {
  return (buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3];
}

function readVarInt(buf: Uint8Array, pos: { o: number }): number {
  let v = 0;
  let b: number;
  let guard = 0;
  do {
    b = buf[pos.o++];
    if (b === undefined) return v;
    v = (v << 7) | (b & 0x7f);
    guard++;
    if (guard > 8) return v;
  } while (b & 0x80);
  return v;
}

function parseTrackEvents(
  trackData: Uint8Array,
  ticksPerQuarter: number
): { samples: ReferenceNoteSample[]; maxTick: number } {
  const samples: ReferenceNoteSample[] = [];
  let absTick = 0;
  let maxTick = 0;
  const pos = { o: 0 };
  let running = 0;
  const barTicks = Math.max(1, ticksPerQuarter * 4);

  while (pos.o < trackData.length) {
    const delta = readVarInt(trackData, pos);
    absTick += delta;
    if (absTick > maxTick) maxTick = absTick;

    let b = trackData[pos.o++];
    if (b === undefined) break;
    if (b < 0x80) {
      pos.o--;
      if (running === 0) {
        pos.o++;
        continue;
      }
      b = running;
    } else {
      if (b !== 0xff && b !== 0xf0 && b !== 0xf7) running = b;
    }

    if (b === 0xff) {
      const _type = trackData[pos.o++];
      const metaLen = readVarInt(trackData, pos);
      pos.o += metaLen;
      continue;
    }
    if (b === 0xf0) {
      while (pos.o < trackData.length && trackData[pos.o] !== 0xf7) pos.o++;
      pos.o++;
      continue;
    }

    const cmd = b & 0xf0;
    if (cmd === 0x90) {
      const pitch = trackData[pos.o++];
      const vel = trackData[pos.o++];
      if (vel > 0) {
        const barApprox = Math.floor(absTick / barTicks) + 1;
        samples.push({ midi: pitch, barApprox, beatInBar: (absTick % barTicks) / ticksPerQuarter });
      }
    } else if (cmd === 0x80) {
      pos.o += 2;
    } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) {
      pos.o += 2;
    } else if (cmd === 0xc0 || cmd === 0xd0) {
      pos.o += 1;
    }
  }

  return { samples, maxTick };
}

/**
 * Parse binary MIDI into ReferencePiece (first track merged; chords unknown).
 */
export function parseMidiReference(buffer: Uint8Array): ReferenceImportResult {
  const warnings: string[] = [];
  if (buffer.length < 22) {
    return emptyImportFailure(['MIDI buffer too small'], warnings);
  }
  const magic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (magic !== 'MThd') {
    return emptyImportFailure(['not a standard MIDI file (expected MThd header)'], warnings);
  }

  const headerLen = readUint32BE(buffer, 4);
  if (headerLen < 6) {
    return emptyImportFailure(['invalid MIDI header length'], warnings);
  }

  const format = (buffer[8] << 8) | buffer[9];
  const numTracks = (buffer[10] << 8) | buffer[11];
  const divisionRaw = (buffer[12] << 8) | buffer[13];

  if (divisionRaw & 0x8000) {
    warnings.push('SMPTE time division — bar mapping is approximate');
  }

  const ticksPerQuarter = divisionRaw & 0x7fff;
  if (ticksPerQuarter === 0) {
    return emptyImportFailure(['invalid ticks-per-quarter'], warnings);
  }

  let offset = 8 + headerLen;
  const allSamples: ReferenceNoteSample[] = [];
  let globalMaxTick = 0;

  for (let t = 0; t < numTracks; t++) {
    if (offset + 8 > buffer.length) {
      warnings.push('truncated MIDI — stopped early');
      break;
    }
    const trk = String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]);
    if (trk !== 'MTrk') {
      warnings.push(`expected MTrk at track ${t} — skipping remainder`);
      break;
    }
    const trkLen = readUint32BE(buffer, offset + 4);
    const start = offset + 8;
    const end = start + trkLen;
    if (end > buffer.length) {
      warnings.push('MTrk length exceeds buffer');
      break;
    }
    const slice = buffer.subarray(start, end);
    const { samples, maxTick } = parseTrackEvents(slice, ticksPerQuarter);
    allSamples.push(...samples);
    if (maxTick > globalMaxTick) globalMaxTick = maxTick;
    offset = end;
  }

  if (allSamples.length === 0) {
    warnings.push('no note-on events found — register summary nominal');
  }

  const barTicks = ticksPerQuarter * 4;
  const totalBars = Math.max(1, Math.ceil((globalMaxTick + 1) / barTicks));

  let minM = 127;
  let maxM = 0;
  for (const s of allSamples) {
    if (s.midi < minM) minM = s.midi;
    if (s.midi > maxM) maxM = s.midi;
  }
  if (allSamples.length === 0) {
    minM = 60;
    maxM = 60;
  }

  const pitchByPart: Record<string, ReferencePitchSummary> = {
    mixed: { minMidi: minM, maxMidi: maxM, noteCount: allSamples.length },
  };

  const piece: ReferencePiece = {
    sourceKind: 'midi',
    totalBars,
    sections: [{ label: 'A', startBar: 1, barCount: totalBars }],
    chordSegments: [],
    rehearsalMarks: [],
    pitchByPart,
    noteSamples: allSamples.slice(0, 256),
    harmonicRhythmBars: 0,
    warnings,
    partial: true,
  };

  if (format !== 0 && format !== 1) {
    warnings.push(`MIDI format ${format} — only light parsing attempted`);
  }

  return importSuccess(piece, warnings);
}
