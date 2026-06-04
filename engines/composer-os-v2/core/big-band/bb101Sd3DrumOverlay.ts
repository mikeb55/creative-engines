/**
 * BB101 — replace generated drum part with Superior Drummer 3 second-line groove map.
 */

import fs from 'fs';
import path from 'path';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';

const SD3_DIR = 'C:\\ProgramData\\Toontrack\\Superior3';
const TICKS_PER_BEAT = 960;

export interface Sd3Hit {
  beat: number;
  midi: number;
  vel: number;
}

/** Map SD3 / host drum pitches to Sibelius-safe GM layer pitches. */
function mapSd3ToGm(midi: number, layer: 'top' | 'kick'): number {
  if (layer === 'kick') {
    if (midi <= 36) return 36;
    return 36;
  }
  if (midi >= 49) return 51;
  if (midi >= 42) return 42;
  if (midi >= 38) return 40;
  return 42;
}

interface ParsedMidi {
  loopBars: number;
  ticksPerBar: number;
  hitsByBar: Map<number, Sd3Hit[]>;
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

function parseDrumMidi(filePath: string): ParsedMidi {
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
  rs(4);
  u32();
  u16();
  const nTracks = u16();
  const division = u16();
  const tpb = division & 0x8000 ? 480 : division;
  const tsNum = 4;
  const ticksPerBar = tpb * tsNum;
  const events: Array<{ tick: number; midi: number; vel: number }> = [];
  for (let t = 0; t < nTracks; t++) {
    rs(4);
    const len = u32();
    const end = pos + len;
    let tick = 0;
    let status = 0;
    const p = { p: pos };
    while (p.p < end) {
      tick += readVlq(buf, p);
      let b = buf[p.p++]!;
      if (b < 0x80) {
        p.p--;
        b = status;
      } else status = b;
      const cmd = b & 0xf0;
      if (cmd === 0x90) {
        const note = buf[p.p++]!;
        const vel = buf[p.p++]!;
        if (vel > 0) events.push({ tick, midi: note, vel });
      } else if (cmd === 0x80) p.p += 2;
      else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) p.p += 2;
      else if (cmd === 0xc0 || cmd === 0xd0) p.p += 1;
      else if (b === 0xff) {
        p.p++;
        const ml = readVlq(buf, p);
        p.p += ml;
      }
    }
    pos = end;
  }
  const loopBars = Math.max(1, Math.ceil((Math.max(0, ...events.map((e) => e.tick)) + 1) / ticksPerBar));
  const hitsByBar = new Map<number, Sd3Hit[]>();
  for (const e of events) {
    const bar = Math.floor(e.tick / ticksPerBar) + 1;
    const beat = (e.tick % ticksPerBar) / tpb + 1;
    const arr = hitsByBar.get(bar) ?? [];
    arr.push({ beat, midi: e.midi, vel: e.vel });
    hitsByBar.set(bar, arr);
  }
  return { loopBars, ticksPerBar, hitsByBar };
}

const GROOVE_FILES = {
  intro: 'Intro 01.mid',
  verse: 'Verse 01.mid',
  pre: 'Pre Chorus 01.mid',
  chorus: 'Chorus 01.mid',
  bridge: 'Bridge 01.mid',
  fill1: 'Fills 01.mid',
  fill2: 'Fills 02.mid',
  fill3: 'Fills 03.mid',
  rolloff: 'Roll-Off 01.mid',
} as const;

const grooveCache = new Map<string, ParsedMidi>();

function loadGroove(key: keyof typeof GROOVE_FILES): ParsedMidi {
  const k = GROOVE_FILES[key];
  if (grooveCache.has(k)) return grooveCache.get(k)!;
  const p = path.join(SD3_DIR, k);
  const parsed = parseDrumMidi(p);
  grooveCache.set(k, parsed);
  return parsed;
}

function hitsForLoop(groove: ParsedMidi, barInLoop: number): Sd3Hit[] {
  const idx = ((barInLoop - 1) % groove.loopBars) + 1;
  return groove.hitsByBar.get(idx) ?? [];
}

function fillAt(chartBar: number): keyof typeof GROOVE_FILES | null {
  if (chartBar % 8 !== 0) return null;
  const n = Math.floor(chartBar / 8) % 3;
  return n === 0 ? 'fill1' : n === 1 ? 'fill2' : 'fill3';
}

function grooveKeyForBar(bar: number): keyof typeof GROOVE_FILES {
  if (bar >= 117) return 'rolloff';
  if (bar >= 105) return 'chorus';
  if (bar >= 81) return bar <= 96 ? 'pre' : 'verse';
  if (bar >= 65) return 'bridge';
  if (bar >= 41) {
    const block = Math.floor((bar - 41) / 8);
    return block % 2 === 0 ? 'pre' : 'bridge';
  }
  if (bar >= 17) return 'verse';
  return 'intro';
}

export function chartBarSd3Hits(bar: number): Sd3Hit[] {
  const fill = fillAt(bar);
  if (fill) return hitsForLoop(loadGroove(fill), 1);
  const key = grooveKeyForBar(bar);
  const g = loadGroove(key);
  const posInSection =
    bar <= 16
      ? bar
      : bar <= 40
        ? bar - 16
        : bar <= 64
          ? bar - 40
          : bar <= 80
            ? bar - 64
            : bar <= 104
              ? bar - 80
              : bar <= 116
                ? bar - 104
                : bar - 116;
  return hitsForLoop(g, posInSection);
}

function fillDrumVoice(
  measure: ScoreModel['parts'][0]['measures'][0],
  hits: Sd3Hit[],
  voice: number,
  layer: 'top' | 'kick',
  barLen = 4
): void {
  if (hits.length === 0) {
    addEvent(measure, createRest(0, barLen, voice));
    return;
  }
  const sorted = [...hits]
    .map((h) => ({
      start: Math.round(Math.max(0, Math.min(barLen - 0.125, h.beat - 1)) * 4) / 4,
      midi: mapSd3ToGm(h.midi, layer),
      vel: Math.min(127, h.vel),
    }))
    .sort((a, b) => a.start - b.start);
  const deduped: typeof sorted = [];
  for (const h of sorted) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.start - h.start) < 0.05) continue;
    deduped.push(h);
  }
  let t = 0;
  const noteDur = 0.125;
  for (const h of deduped) {
    if (h.start >= barLen - noteDur) break;
    if (h.start > t + 1e-4) {
      addEvent(measure, createRest(t, h.start - t, voice));
    }
    addEvent(
      measure,
      createNote(h.midi, h.start, noteDur, voice, undefined, undefined, h.vel)
    );
    t = h.start + noteDur;
    if (t >= barLen - 1e-4) break;
  }
  if (t < barLen - 1e-4) {
    addEvent(measure, createRest(t, barLen - t, voice));
  }
}

export function applyBb101Sd3DrumOverlay(score: ScoreModel): void {
  const drums = score.parts.find((p) => p.id === 'bb_drums');
  if (!drums) return;
  const totalBars = drums.measures.length;
  for (let bar = 1; bar <= totalBars; bar++) {
    const m = drums.measures[bar - 1];
    if (!m) continue;
    m.events = [];
    const hits = chartBarSd3Hits(bar);
    if (hits.length === 0) {
      addEvent(m, createRest(0, 4, 1));
      addEvent(m, createRest(0, 4, 2));
      continue;
    }
    const kick = hits.filter((h) => h.midi <= 36 || h.midi === 35);
    const top = hits.filter((h) => h.midi > 36);
    fillDrumVoice(m, top, 1, 'top');
    fillDrumVoice(m, kick.length ? kick : hits, 2, 'kick');
  }
}
