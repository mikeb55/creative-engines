/**
 * BB101 Cubase sketch — alto pitch DNA → rhythmic LeadSheet for melody lock.
 */

import fs from 'fs';
import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../lead-sheet/leadSheetTypes';
import { buildBb101ChordBars } from './bb101HarmonicMap';

const TICKS_PER_BEAT = 480;
const TICKS_PER_BAR = TICKS_PER_BEAT * 4;

interface RawNote {
  bar: number;
  midi: number;
  tickInBar: number;
  vel: number;
}

function readVlq(buf: Buffer, pos: { p: number }): number {
  let v = 0;
  while (true) {
    const b = buf[pos.p++]!;
    v = (v << 7) | (b & 0x7f);
    if (!(b & 0x80)) break;
  }
  return v;
}

function parseTrackNotes(buf: Buffer, start: number, end: number): RawNote[] {
  const notes: RawNote[] = [];
  let tick = 0;
  let status = 0;
  const pos = { p: start };
  while (pos.p < end) {
    const delta = readVlq(buf, pos);
    tick += delta;
    let b = buf[pos.p++]!;
    if (b < 0x80) {
      pos.p--;
      b = status;
    } else status = b;
    const cmd = b & 0xf0;
    if (cmd === 0x90 || cmd === 0x80) {
      const note = buf[pos.p++]!;
      const vel = buf[pos.p++]!;
      if (cmd === 0x90 && vel > 0) {
        const bar = Math.floor(tick / TICKS_PER_BAR) + 1;
        const tickInBar = tick % TICKS_PER_BAR;
        notes.push({ bar, midi: note, tickInBar, vel });
      }
    } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) pos.p += 2;
    else if (cmd === 0xc0 || cmd === 0xd0) pos.p += 1;
    else if (b === 0xff) {
      const meta = buf[pos.p++]!;
      const ml = readVlq(buf, pos);
      pos.p += ml;
      if (meta === 0x2f) break;
    }
  }
  return notes;
}

function parseBb101AltoNotes(filePath: string): RawNote[] {
  const buf = fs.readFileSync(filePath);
  let pos = 0;
  const rs = (n: number) => {
    const s = buf.toString('ascii', pos, pos + n);
    pos += n;
    return s;
  };
  const u32 = () => {
    const v = buf.readUInt32BE(pos);
    pos += 4;
    return v;
  };
  const u16 = () => {
    const v = buf.readUInt16BE(pos);
    pos += 2;
    return v;
  };
  if (rs(4) !== 'MThd') throw new Error(`Not MIDI: ${filePath}`);
  u32();
  u16();
  const nTracks = u16();
  u16();
  for (let t = 0; t < nTracks; t++) {
    if (rs(4) !== 'MTrk') throw new Error('Bad track');
    const len = u32();
    const end = pos + len;
    let name = '';
    const scan = pos;
    let tick = 0;
    let st = 0;
    const p2 = { p: pos };
    while (p2.p < end) {
      tick += readVlq(buf, p2);
      let b = buf[p2.p++]!;
      if (b < 0x80) {
        p2.p--;
        b = st;
      } else st = b;
      if (b === 0xff) {
        const meta = buf[p2.p++]!;
        const ml = readVlq(buf, p2);
        const data = buf.subarray(p2.p, p2.p + ml);
        p2.p += ml;
        if (meta === 0x03) name = data.toString('utf8');
      } else if ((b & 0xf0) === 0x90 || (b & 0xf0) === 0x80) {
        p2.p += 2;
      } else if ((b & 0xf0) === 0xa0 || (b & 0xf0) === 0xb0 || (b & 0xf0) === 0xe0) p2.p += 2;
      else if ((b & 0xf0) === 0xc0 || (b & 0xf0) === 0xd0) p2.p += 1;
    }
    const notes = parseTrackNotes(buf, pos, end);
    pos = end;
    if (/alto/i.test(name)) return notes;
  }
  throw new Error('Alto Sax track not found in BB101 MIDI');
}

function midiToStepOctave(midi: number): { step: string; alter: number; octave: number } {
  const names = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const step = names[midi % 12]!;
  const alter = alters[midi % 12]!;
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave };
}

/** Rhythmicize sparse long tones — same pitch DNA, 2–3 attacks when active. */
function rhythmicizeBar(bar: number, midis: number[], seed: number): LeadSheetMelodyNoteEvent[] {
  const pc = midis[0]!;
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  const anchor = sorted[0]!;
  const upper = sorted.length > 1 ? sorted[sorted.length - 1]! : anchor;
  const zone =
    bar <= 16 ? 0 : bar <= 40 ? 1 : bar <= 64 ? 2 : bar <= 80 ? 3 : bar <= 104 ? 4 : 5;
  const templates: Array<Array<{ beat: number; dur: number; pick: 'anchor' | 'upper' }>> = [
    [{ beat: 0, dur: 2.5, pick: 'anchor' }],
    [
      { beat: 0, dur: 1.25, pick: 'anchor' },
      { beat: 1.5, dur: 0.75, pick: 'upper' },
      { beat: 2.75, dur: 1, pick: 'anchor' },
    ],
    [
      { beat: 0, dur: 1, pick: 'anchor' },
      { beat: 1.25, dur: 0.5, pick: 'upper' },
      { beat: 2, dur: 1.25, pick: 'anchor' },
      { beat: 3.5, dur: 0.5, pick: 'upper' },
    ],
    [{ beat: 0, dur: 3, pick: 'anchor' }],
    [
      { beat: 0, dur: 0.75, pick: 'anchor' },
      { beat: 1, dur: 0.75, pick: 'upper' },
      { beat: 2.5, dur: 1, pick: 'anchor' },
      { beat: 3.5, dur: 0.5, pick: 'upper' },
    ],
    [
      { beat: 0, dur: 0.5, pick: 'anchor' },
      { beat: 0.75, dur: 0.5, pick: 'upper' },
      { beat: 1.5, dur: 0.5, pick: 'anchor' },
      { beat: 2.25, dur: 0.5, pick: 'upper' },
      { beat: 3, dur: 0.75, pick: 'anchor' },
    ],
  ];
  const tIdx = (bar + seed + pc) % templates.length;
  const tpl = templates[tIdx]!;
  const out: LeadSheetMelodyNoteEvent[] = [];
  for (const cell of tpl) {
    const midi = cell.pick === 'upper' && upper !== anchor ? upper : anchor;
    const { step, alter, octave } = midiToStepOctave(midi);
    out.push({
      bar,
      beat: cell.beat,
      durationBeats: cell.dur,
      midi,
      step,
      alter,
      octave,
      velocityMidi: 72 + zone * 4,
    });
  }
  return out;
}

export function buildBb101LeadSheetFromMidi(
  midiPath: string,
  opts?: { seed?: number; totalBars?: number }
): LeadSheet {
  const seed = opts?.seed ?? 10101;
  const totalBars = opts?.totalBars ?? 120;
  const raw = parseBb101AltoNotes(midiPath);
  const byBar = new Map<number, number[]>();
  for (const n of raw) {
    if (n.bar < 1 || n.bar > totalBars) continue;
    const arr = byBar.get(n.bar) ?? [];
    arr.push(n.midi);
    byBar.set(n.bar, arr);
  }
  const melodyEvents: LeadSheetMelodyNoteEvent[] = [];
  for (const [bar, midis] of byBar) {
    melodyEvents.push(...rhythmicizeBar(bar, midis, seed));
  }
  melodyEvents.sort((a, b) => a.bar - b.bar || a.beat - b.beat);

  /** Shout foreshadow + celebration — seed from head bars onto target measures. */
  const foreshadowFrom = [21, 37, 25, 31];
  const foreshadowTo = [97, 98, 99, 100, 107, 108, 109, 110, 111, 112];
  for (let i = 0; i < foreshadowTo.length; i++) {
    const srcBar = foreshadowFrom[i % foreshadowFrom.length]!;
    const srcMidis = byBar.get(srcBar);
    if (!srcMidis?.length) continue;
    const dest = foreshadowTo[i]!;
    if (!byBar.has(dest)) {
      melodyEvents.push(...rhythmicizeBar(dest, srcMidis, seed + dest));
    }
  }

  const chordBars = buildBb101ChordBars();
  const chordEvents = chordBars.map((symbol, i) => ({
    bar: i + 1,
    beat: 0,
    symbol,
  }));

  return {
    sourceFormat: 'musicxml',
    title: 'BB101',
    tempoBpm: 90,
    timeSignature: { beats: 4, beatType: 4 },
    keySignature: { fifths: -2, mode: 'major' },
    totalBars,
    sections: [
      { label: 'A', startBar: 1 },
      { label: 'B', startBar: 17 },
      { label: 'C', startBar: 41 },
      { label: 'E', startBar: 65 },
      { label: 'F', startBar: 81 },
      { label: 'H', startBar: 105 },
    ],
    chordEvents,
    melodyEvents,
    repeatMarkers: [],
  };
}
