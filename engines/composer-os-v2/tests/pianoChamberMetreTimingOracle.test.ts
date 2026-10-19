/**
 * TEST ONLY. Independent V3.5 metre timing oracle.
 * Expected ticks are integer PPQ arithmetic in this file.
 * This file does not call production bar-length, bar-origin, or placement helpers.
 */

import assert from 'node:assert/strict';
import { DOMParser } from 'linkedom';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { OrchestrateRequest } from '../core/orchestrate/types';

const PPQ = 480;
const TEMPO_US = Math.round(60_000_000 / 72);

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const TYPE_TICKS: Record<string, number> = {
  whole: 1920,
  half: 960,
  quarter: 480,
  eighth: 240,
  '16th': 120,
  '32nd': 60,
};

type Plan = Array<{ through: number; beats: number; beatType: number }>;
type Issue = 'bar-origin' | 'midi-displacement' | 'broken-tie' | 'transposition' | 'missing-tempo' | 'missing-time-signature' | 'invalid-duration' | 'silence' | 'source-timing' | 'parity';

interface Span {
  midi: number;
  start: number;
  end: number;
}

interface Expectation {
  pc: number;
  start: number;
  end: number;
}

function signatureAt(plan: Plan, bar: number): { beats: number; beatType: number } {
  const hit = plan.find((row) => bar <= row.through);
  if (!hit) throw new Error(`no metre for bar ${bar}`);
  return { beats: hit.beats, beatType: hit.beatType };
}

/** Ticks in one bar. Fails unless the length is an integer at PPQ 480. */
function barTicks(beats: number, beatType: number): number {
  if (!Number.isInteger(beats) || !Number.isInteger(beatType) || beats < 1 || beatType < 1) {
    throw new Error(`non-integral metre ${beats}/${beatType}`);
  }
  if ((PPQ * 4) % beatType !== 0) throw new Error(`${beats}/${beatType} is not an integer tick length at PPQ ${PPQ}`);
  const ticksPerBeat = (PPQ * 4) / beatType;
  const ticks = beats * ticksPerBeat;
  if (!Number.isInteger(ticks) || ticks < 1) throw new Error(`${beats}/${beatType} tick length ${ticks}`);
  return ticks;
}

function barOrigins(plan: Plan, bars = 24): number[] {
  const origins: number[] = [];
  let tick = 0;
  for (let bar = 1; bar <= bars; bar += 1) {
    origins.push(tick);
    const sig = signatureAt(plan, bar);
    tick += barTicks(sig.beats, sig.beatType);
  }
  return origins;
}

function noteXml(step: string, octave: number, duration: number, type: string, staff: 1 | 2, tie?: 'start' | 'stop', rest = false): string {
  const tieXml = tie ? `<tie type="${tie}"/>` : '';
  const tied = tie ? `<notations><tied type="${tie}"/></notations>` : '';
  const head = rest ? '<rest/>' : `<pitch><step>${step}</step><octave>${octave}</octave></pitch>`;
  return `<note>${head}<duration>${duration}</duration>${tieXml}<voice>1</voice><type>${type}</type><staff>${staff}</staff>${tied}</note>`;
}

function scoreFor(plan: Plan, options?: { tie?: { from: number; to: number }; silentBars?: number[] }): string {
  const steps = ['C', 'D', 'E', 'G', 'A', 'F', 'B'];
  const silent = new Set(options?.silentBars ?? []);
  const measures: string[] = [];
  let previous = '';
  for (let bar = 1; bar <= 24; bar += 1) {
    const sig = signatureAt(plan, bar);
    const ticks = barTicks(sig.beats, sig.beatType);
    const beat = ticks / sig.beats;
    const melodyType = sig.beatType === 8 ? 'eighth' : 'quarter';
    let body: string;
    if (silent.has(bar)) {
      body = `${noteXml('C', 5, ticks, 'whole', 1, undefined, true)}<backup><duration>${ticks}</duration></backup>${noteXml('C', 3, ticks, 'whole', 2, undefined, true)}`;
    } else {
      const melody = Array.from({ length: sig.beats }, (_, index) => noteXml(steps[(bar + index) % steps.length]!, 5, beat, melodyType, 1)).join('');
      const tie = options?.tie && bar === options.tie.from ? 'start' as const : options?.tie && bar === options.tie.to ? 'stop' as const : undefined;
      body = `${melody}<backup><duration>${ticks}</duration></backup>${noteXml('C', 3, ticks, 'whole', 2, tie)}`;
    }
    const key = `${sig.beats}/${sig.beatType}`;
    const time = bar === 1 || key !== previous
      ? `<time><beats>${sig.beats}</beats><beat-type>${sig.beatType}</beat-type></time>`
      : '';
    previous = key;
    const attributes = bar === 1
      ? `<attributes><divisions>${PPQ}</divisions><key><fifths>0</fifths></key>${time}<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>`
      : time ? `<attributes>${time}</attributes>` : '';
    measures.push(`<measure number="${bar}">${attributes}${body}</measure>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}

function expectedAttacks(plan: Plan, options?: { tie?: { from: number; to: number }; silentBars?: number[] }): Expectation[] {
  const steps = ['C', 'D', 'E', 'G', 'A', 'F', 'B'];
  const silent = new Set(options?.silentBars ?? []);
  const origins = barOrigins(plan);
  const events: Expectation[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    if (silent.has(bar)) continue;
    const sig = signatureAt(plan, bar);
    const ticks = barTicks(sig.beats, sig.beatType);
    const beat = ticks / sig.beats;
    const origin = origins[bar - 1]!;
    for (let index = 0; index < sig.beats; index += 1) {
      const pc = STEP_PC[steps[(bar + index) % steps.length]!]!;
      events.push({ pc, start: origin + index * beat, end: origin + (index + 1) * beat });
    }
    const tieFrom = options?.tie?.from === bar;
    const tieTo = options?.tie?.to === bar;
    if (tieTo) continue;
    const endBar = tieFrom ? options!.tie!.to : bar;
    events.push({ pc: 0, start: origin, end: origins[endBar - 1]! + barTicks(signatureAt(plan, endBar).beats, signatureAt(plan, endBar).beatType) });
  }
  return events;
}

function request(xml: string, mode: 'developing' | 'faithful' = 'faithful', seed = 11): OrchestrateRequest {
  return {
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: xml,
      correction: { mode, reviewConfirmed: true },
    },
  };
}

function realise(xml: string, mode: 'developing' | 'faithful' = 'faithful', seed = 11) {
  const result = orchestrate(request(xml, mode, seed));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.midiBase64 || !result.fidelity) throw new Error('expected a chamber score');
  return result;
}

function readVlq(data: Buffer, cursor: number): { value: number; cursor: number } {
  let value = 0;
  let byte = 0;
  do {
    byte = data[cursor++]!;
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return { value, cursor };
}

function writeVlq(value: number): number[] {
  if (value < 0) throw new Error('negative midi delta');
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

interface MidiEvent { delta: number; body: number[] }
interface MidiFile {
  ppq: number;
  tempos: Array<{ tick: number; us: number }>;
  signatures: Array<{ tick: number; beats: number; beatType: number }>;
  notes: Span[];
  tracks: MidiEvent[][];
}

function parseTrack(data: Buffer, start: number, end: number): MidiEvent[] {
  const events: MidiEvent[] = [];
  let cursor = start;
  let running = 0;
  while (cursor < end) {
    const delta = readVlq(data, cursor);
    cursor = delta.cursor;
    const peek = data[cursor]!;
    if (peek === 0xff) {
      const kindAt = cursor + 1;
      const length = readVlq(data, kindAt + 1);
      const body = [...data.subarray(cursor, length.cursor + length.value)];
      cursor = length.cursor + length.value;
      events.push({ delta: delta.value, body });
      continue;
    }
    if (peek === 0xf0 || peek === 0xf7) {
      const length = readVlq(data, cursor + 1);
      const body = [...data.subarray(cursor, length.cursor + length.value)];
      cursor = length.cursor + length.value;
      events.push({ delta: delta.value, body });
      continue;
    }
    let status = peek;
    if (peek & 0x80) {
      running = peek;
      cursor += 1;
    } else {
      status = running;
    }
    const size = (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
    const body = [status, ...data.subarray(cursor, cursor + size)];
    cursor += size;
    events.push({ delta: delta.value, body });
  }
  return events;
}

function parseMidi(data: Buffer): MidiFile {
  assert.equal(data.toString('ascii', 0, 4), 'MThd');
  const ppq = data.readUInt16BE(12);
  const tracks: MidiEvent[][] = [];
  let pos = 14;
  while (pos + 8 <= data.length) {
    assert.equal(data.toString('ascii', pos, pos + 4), 'MTrk');
    const length = data.readUInt32BE(pos + 4);
    tracks.push(parseTrack(data, pos + 8, pos + 8 + length));
    pos += 8 + length;
  }
  const tempos: MidiFile['tempos'] = [];
  const signatures: MidiFile['signatures'] = [];
  const notes: Span[] = [];
  for (const track of tracks) {
    let tick = 0;
    const open = new Map<number, number>();
    for (const event of track) {
      tick += event.delta;
      const body = event.body;
      if (body[0] === 0xff && body[1] === 0x51) {
        const us = (body[3]! << 16) | (body[4]! << 8) | body[5]!;
        tempos.push({ tick, us });
      }
      if (body[0] === 0xff && body[1] === 0x58) {
        signatures.push({ tick, beats: body[3]!, beatType: 2 ** body[4]! });
      }
      const kind = body[0]! & 0xf0;
      if (kind === 0x90 && (body[2] ?? 0) > 0) open.set(body[1]!, tick);
      if (kind === 0x80 || (kind === 0x90 && body[2] === 0)) {
        const start = open.get(body[1]!);
        if (start !== undefined) {
          notes.push({ midi: body[1]!, start, end: tick });
          open.delete(body[1]!);
        }
      }
    }
  }
  return { ppq, tempos, signatures, notes, tracks };
}

function encodeMidi(ppq: number, tracks: MidiEvent[][]): Buffer {
  const chunks: Buffer[] = [];
  const header = Buffer.alloc(14);
  header.write('MThd', 0, 'ascii');
  header.writeUInt32BE(6, 4);
  header.writeUInt16BE(1, 8);
  header.writeUInt16BE(tracks.length, 10);
  header.writeUInt16BE(ppq, 12);
  chunks.push(header);
  for (const track of tracks) {
    const body: number[] = [];
    for (const event of track) body.push(...writeVlq(event.delta), ...event.body);
    const chunk = Buffer.alloc(8 + body.length);
    chunk.write('MTrk', 0, 'ascii');
    chunk.writeUInt32BE(body.length, 4);
    Buffer.from(body).copy(chunk, 8);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function textOf(node: Element, name: string): string {
  const child = [...node.children].find((item) => item.localName === name);
  return child?.textContent?.trim() ?? '';
}

function typedTicks(type: string, dots: number): number {
  const base = TYPE_TICKS[type];
  if (!base) return -1;
  let ticks = base;
  let extra = base;
  for (let index = 0; index < dots; index += 1) {
    if (extra % 2 !== 0) return -1;
    extra /= 2;
    ticks += extra;
  }
  return ticks;
}

interface XmlNote extends Span {
  pc: number;
  typeTicks: number;
  tieStart: boolean;
  tieStop: boolean;
}

function xmlNotes(xml: string, plan: Plan): { notes: XmlNote[]; issues: Issue[]; divisions: number } {
  const issues: Issue[] = [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const parts = [...doc.getElementsByTagName('part')];
  const notes: XmlNote[] = [];
  const origins = barOrigins(plan);
  for (const part of parts) {
    let chromatic = 0;
    let octaveChange = 0;
    let beats = 0;
    let beatType = 0;
    const measures = [...part.getElementsByTagName('measure')];
    assert.equal(measures.length, 24, part.getAttribute('id') ?? 'part');
    measures.forEach((measure, index) => {
      const time = measure.getElementsByTagName('time')[0];
      if (time) {
        beats = Number(textOf(time, 'beats'));
        beatType = Number(textOf(time, 'beat-type'));
        if (textOf(time, 'beats').includes('+')) issues.push('invalid-duration');
      }
      const expected = signatureAt(plan, index + 1);
      if (!Number.isInteger(beats) || beats !== expected.beats || beatType !== expected.beatType) issues.push('bar-origin');
      const divisionsNode = measure.getElementsByTagName('divisions')[0];
      if (index === 0) {
        const divisions = Number(divisionsNode?.textContent ?? '0');
        if (divisions !== PPQ) issues.push('invalid-duration');
      }
      const transpose = measure.getElementsByTagName('transpose')[0];
      if (transpose) {
        chromatic = Number(textOf(transpose, 'chromatic') || '0');
        octaveChange = Number(textOf(transpose, 'octave-change') || '0');
      }
      const capacity = barTicks(expected.beats, expected.beatType);
      let cursor = 0;
      const voiceSum = new Map<number, number>();
      for (const child of [...measure.children]) {
        const name = child.localName;
        if (name === 'backup') {
          cursor -= Number(textOf(child, 'duration'));
          continue;
        }
        if (name === 'forward') {
          cursor += Number(textOf(child, 'duration'));
          continue;
        }
        if (name !== 'note' || child.getElementsByTagName('grace').length) continue;
        const voice = Number(textOf(child, 'voice') || '1');
        const duration = Number(textOf(child, 'duration'));
        const chord = child.getElementsByTagName('chord').length > 0;
        const onset = cursor;
        if (!Number.isInteger(duration) || duration < 1) issues.push('invalid-duration');
        const type = textOf(child, 'type');
        const dots = child.getElementsByTagName('dot').length;
        const typeTicks = type ? typedTicks(type, dots) : duration;
        if (type && typeTicks !== duration) issues.push('invalid-duration');
        const rest = child.getElementsByTagName('rest').length > 0;
        if (!rest) {
          const step = child.getElementsByTagName('step')[0]?.textContent?.trim() ?? '';
          const octave = Number(child.getElementsByTagName('octave')[0]?.textContent ?? '');
          const alter = Number(child.getElementsByTagName('alter')[0]?.textContent ?? '0');
          const written = (octave + 1) * 12 + (STEP_PC[step] ?? -100) + alter;
          const midi = written + chromatic + octaveChange * 12;
          const tieNodes = [...child.getElementsByTagName('tie')];
          notes.push({
            midi,
            pc: ((midi % 12) + 12) % 12,
            start: origins[index]! + onset,
            end: origins[index]! + onset + duration,
            typeTicks,
            tieStart: tieNodes.some((node) => node.getAttribute('type') === 'start'),
            tieStop: tieNodes.some((node) => node.getAttribute('type') === 'stop'),
          });
        }
        if (!chord) {
          voiceSum.set(voice, (voiceSum.get(voice) ?? 0) + duration);
          cursor += duration;
        }
        if (onset < 0 || onset + duration > capacity) issues.push('invalid-duration');
      }
      for (const sum of voiceSum.values()) {
        if (sum !== capacity) issues.push('invalid-duration');
      }
    });
  }
  return { notes, issues, divisions: PPQ };
}

function mergeTies(notes: XmlNote[]): Span[] {
  const pending = notes.map((note, index) => ({ ...note, index }));
  const used = new Set<number>();
  const merged: Span[] = [];
  for (const note of pending) {
    if (used.has(note.index)) continue;
    if (note.tieStop && pending.some((other) => other.tieStart && other.midi === note.midi && other.end === note.start)) continue;
    let end = note.end;
    if (note.tieStart) {
      let guard = 0;
      while (guard < 8) {
        const next = pending.find((item) => !used.has(item.index) && item.midi === note.midi && item.start === end && item.tieStop);
        if (!next) break;
        used.add(next.index);
        end = next.end;
        guard += 1;
      }
    }
    merged.push({ midi: note.midi, start: note.start, end });
  }
  return merged;
}

function sameSpans(left: Span[], right: Span[]): boolean {
  const key = (note: Span) => `${note.midi}:${note.start}:${note.end}`;
  const a = left.map(key).sort();
  const b = right.map(key).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function displaced(xml: Span[], midi: Span[]): boolean {
  return midi.some((note) => xml.some((item) => item.midi === note.midi && item.end === note.end && Math.abs(item.start - note.start) === 1));
}

function audit(xml: string, midiBytes: Buffer, plan: Plan, options?: {
  expected?: Expectation[];
  tie?: Expectation;
  silentBars?: number[];
}): Issue[] {
  const midi = parseMidi(midiBytes);
  const read = xmlNotes(xml, plan);
  const issues = new Set<Issue>(read.issues);
  if (midi.ppq !== PPQ) issues.add('invalid-duration');
  if (!midi.tempos.some((tempo) => tempo.tick === 0 && tempo.us === TEMPO_US)) issues.add('missing-tempo');
  const origins = barOrigins(plan);
  for (let bar = 1; bar <= 24; bar += 1) {
    const sig = signatureAt(plan, bar);
    const start = origins[bar - 1]!;
    const found = midi.signatures.some((item) => item.tick === start && item.beats === sig.beats && item.beatType === sig.beatType);
    if (found) continue;
    const shifted = midi.signatures.some((item) => item.beats === sig.beats && item.beatType === sig.beatType && item.tick !== start && Math.abs(item.tick - start) < barTicks(sig.beats, sig.beatType));
    issues.add(shifted ? 'bar-origin' : 'missing-time-signature');
  }
  const merged = mergeTies(read.notes);
  if (!sameSpans(merged, midi.notes)) {
    issues.add(displaced(merged, midi.notes) ? 'midi-displacement' : 'transposition');
    if (!displaced(merged, midi.notes) && merged.length === midi.notes.length) {
      const sameTime = merged.every((note) => midi.notes.some((item) => item.start === note.start && item.end === note.end));
      if (!sameTime) issues.add('parity');
    } else {
      issues.add('parity');
    }
  }
  if (options?.tie) {
    const tie = options.tie;
    const xmlHit = merged.some((note) => note.start === tie.start && note.end === tie.end && ((note.midi % 12) + 12) % 12 === tie.pc);
    const midiHit = midi.notes.some((note) => note.start === tie.start && note.end === tie.end && ((note.midi % 12) + 12) % 12 === tie.pc);
    const marked = read.notes.some((note) => note.tieStart && note.start === tie.start) && read.notes.some((note) => note.tieStop && note.end === tie.end);
    if (!xmlHit || !midiHit || !marked) issues.add('broken-tie');
  }
  for (const bar of options?.silentBars ?? []) {
    const start = origins[bar - 1]!;
    const end = bar === 24 ? start + barTicks(signatureAt(plan, bar).beats, signatureAt(plan, bar).beatType) : origins[bar]!;
    if (read.notes.some((note) => note.start >= start && note.start < end) || midi.notes.some((note) => note.start >= start && note.start < end)) {
      issues.add('silence');
    }
  }
  for (const event of options?.expected ?? []) {
    const hit = midi.notes.some((note) => note.start === event.start && note.end === event.end && ((note.midi % 12) + 12) % 12 === event.pc);
    if (!hit) issues.add('source-timing');
  }
  return [...issues];
}

function cloneTracks(tracks: MidiEvent[][]): MidiEvent[][] {
  return tracks.map((track) => track.map((event) => ({ delta: event.delta, body: [...event.body] })));
}

function mutate(midiBytes: Buffer, kind: 'shift-signature' | 'shift-note' | 'drop-tempo' | 'drop-signature'): Buffer {
  const midi = parseMidi(midiBytes);
  const tracks = cloneTracks(midi.tracks);
  if (kind === 'shift-signature' || kind === 'drop-signature') {
    const sigs = tracks[0]!.map((event, index) => event.body[0] === 0xff && event.body[1] === 0x58 ? index : -1).filter((index) => index >= 0);
    const index = sigs[1];
    if (index === undefined || !tracks[0]![index + 1]) throw new Error('no second time signature');
    if (kind === 'shift-signature') {
      tracks[0]![index]!.delta += 1;
      tracks[0]![index + 1]!.delta -= 1;
    } else {
      tracks[0]![index + 1]!.delta += tracks[0]![index]!.delta;
      tracks[0]!.splice(index, 1);
    }
  }
  if (kind === 'drop-tempo') {
    const index = tracks[0]!.findIndex((event) => event.body[0] === 0xff && event.body[1] === 0x51);
    if (index < 0 || !tracks[0]![index + 1]) throw new Error('no tempo');
    tracks[0]![index + 1]!.delta += tracks[0]![index]!.delta;
    tracks[0]!.splice(index, 1);
  }
  if (kind === 'shift-note') {
    const track = tracks[1]!;
    const on = track.findIndex((event) => (event.body[0]! & 0xf0) === 0x90 && (event.body[2] ?? 0) > 0);
    if (on < 0) throw new Error('no note');
    const pitch = track[on]!.body[1];
    const channel = track[on]!.body[0]! & 0x0f;
    const off = track.findIndex((event, index) => index > on && (event.body[0]! & 0x0f) === channel && event.body[1] === pitch && ((event.body[0]! & 0xf0) === 0x80 || event.body[2] === 0));
    if (off < 0 || track[off]!.delta < 1) throw new Error('no note release to shift');
    track[on]!.delta += 1;
    track[off]!.delta -= 1;
  }
  return encodeMidi(midi.ppq, tracks);
}

function mustFail(issues: Issue[], code: Issue, label: string): void {
  assert.ok(issues.includes(code), `${label} did not report ${code} (${issues.join(',') || 'clean'})`);
}

const uniforms: Plan[] = [
  [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [3, 8], [5, 8], [6, 8], [7, 8], [9, 8], [12, 8],
].map(([beats, beatType]) => [{ through: 24, beats: beats!, beatType: beatType! }]);

const mixed: Array<{ label: string; plan: Plan }> = [
  { label: '4/4-5/4-3/4', plan: [{ through: 4, beats: 4, beatType: 4 }, { through: 12, beats: 5, beatType: 4 }, { through: 24, beats: 3, beatType: 4 }] },
  { label: '6/8-7/8-4/4', plan: [{ through: 6, beats: 6, beatType: 8 }, { through: 14, beats: 7, beatType: 8 }, { through: 24, beats: 4, beatType: 4 }] },
  { label: '3/8-9/8-2/4', plan: [{ through: 5, beats: 3, beatType: 8 }, { through: 13, beats: 9, beatType: 8 }, { through: 24, beats: 2, beatType: 4 }] },
];

const report: Array<Record<string, unknown>> = [];

for (const plan of uniforms) {
  const sig = plan[0]!;
  assert.equal(barTicks(sig.beats, sig.beatType) * 24, barOrigins(plan).at(-1)! + barTicks(sig.beats, sig.beatType));
  const xml = scoreFor(plan);
  const first = realise(xml);
  const again = realise(xml);
  assert.equal(first.musicXml, again.musicXml, `${sig.beats}/${sig.beatType} determinism`);
  assert.equal(first.midiBase64, again.midiBase64, `${sig.beats}/${sig.beatType} midi determinism`);
  const issues = audit(first.musicXml, Buffer.from(first.midiBase64, 'base64'), plan, { expected: expectedAttacks(plan) });
  assert.deepEqual(issues, [], `${sig.beats}/${sig.beatType} ${issues.join(',')}`);
  report.push({ metre: `${sig.beats}/${sig.beatType}`, ticks: barTicks(sig.beats, sig.beatType), issues });
}

for (const row of mixed) {
  const xml = scoreFor(row.plan);
  const score = realise(xml, 'developing');
  const issues = audit(score.musicXml, Buffer.from(score.midiBase64, 'base64'), row.plan);
  assert.deepEqual(issues, [], `${row.label} ${issues.join(',')}`);
  const faithful = realise(xml, 'faithful');
  const faithfulIssues = audit(faithful.musicXml, Buffer.from(faithful.midiBase64, 'base64'), row.plan, { expected: expectedAttacks(row.plan) });
  assert.deepEqual(faithfulIssues, [], `${row.label} faithful ${faithfulIssues.join(',')}`);
  const origins = barOrigins(row.plan);
  const crossing = score.fidelity.phrases.find((phrase) => {
    for (let bar = phrase.startBar; bar < phrase.endBar; bar += 1) {
      const left = signatureAt(row.plan, bar);
      const right = signatureAt(row.plan, bar + 1);
      if (left.beats !== right.beats || left.beatType !== right.beatType) return true;
    }
    return false;
  });
  assert.ok(crossing, `${row.label} phrase crosses a metre change`);
  const developed = score.fidelity.phrases.find((phrase) => phrase.role === 'development') ?? crossing!;
  const answer = score.fidelity.derivedAnswers.find((item) => item.phraseId === developed.id);
  assert.ok(answer && answer.notes >= 2, `${row.label} answer`);
  const start = origins[developed.startBar - 1]!;
  const end = origins[developed.endBar - 1]! + barTicks(signatureAt(row.plan, developed.endBar).beats, signatureAt(row.plan, developed.endBar).beatType);
  const inside = score.fidelity.preview.filter((note) => note.partId === answer!.partId);
  const answerNotes = inside.filter((note) => {
    const onset = note.onset * PPQ;
    const release = (note.onset + note.duration) * PPQ;
    return Math.abs(onset - Math.round(onset)) < 1e-4 && Math.round(onset) >= start && Math.round(release) <= end;
  });
  assert.ok(answerNotes.length >= 2, `${row.label} ${answer!.operator} stays inside ${developed.startBar}-${developed.endBar}`);
  for (const note of answerNotes) {
    const ticks = note.onset * PPQ;
    assert.ok(Math.abs(ticks - Math.round(ticks)) < 1e-4, `${row.label} answer tick`);
  }
  report.push({ metre: row.label, ticks: origins.map((origin, index) => barTicks(signatureAt(row.plan, index + 1).beats, signatureAt(row.plan, index + 1).beatType)), issues, phrase: `${developed.startBar}-${developed.endBar}`, operator: answer!.operator });
}

const probePlan: Plan = [
  { through: 4, beats: 4, beatType: 4 },
  { through: 8, beats: 5, beatType: 4 },
  { through: 24, beats: 7, beatType: 8 },
];
const probeOptions = { tie: { from: 4, to: 5 }, silentBars: [10] };
const probeXml = scoreFor(probePlan, probeOptions);
const probe = realise(probeXml, 'faithful');
const probeExpected = expectedAttacks(probePlan, probeOptions);
const probeTie = probeExpected.find((event) => event.start === barOrigins(probePlan)[3] && event.end - event.start === barTicks(4, 4) + barTicks(5, 4));
assert.ok(probeTie, 'probe tie expectation');
const probeIssues = audit(probe.musicXml, Buffer.from(probe.midiBase64, 'base64'), probePlan, {
  expected: probeExpected,
  tie: probeTie,
  silentBars: [10],
});
assert.deepEqual(probeIssues, [], `probe ${probeIssues.join(',')}`);

const probeMidi = Buffer.from(probe.midiBase64, 'base64');
mustFail(audit(probe.musicXml, mutate(probeMidi, 'shift-signature'), probePlan, { expected: probeExpected, tie: probeTie, silentBars: [10] }), 'bar-origin', 'shifted signature');
mustFail(audit(probe.musicXml, mutate(probeMidi, 'shift-note'), probePlan, { expected: probeExpected, tie: probeTie, silentBars: [10] }), 'midi-displacement', 'shifted note');
mustFail(audit(probe.musicXml, mutate(probeMidi, 'drop-tempo'), probePlan, { tie: probeTie, silentBars: [10] }), 'missing-tempo', 'dropped tempo');
mustFail(audit(probe.musicXml, mutate(probeMidi, 'drop-signature'), probePlan, { tie: probeTie, silentBars: [10] }), 'missing-time-signature', 'dropped signature');
mustFail(audit(probe.musicXml.replace('<tie type="stop"/>', '').replace('<tied type="stop"/>', ''), probeMidi, probePlan, { tie: probeTie, silentBars: [10] }), 'broken-tie', 'removed tie stop');
mustFail(audit(probe.musicXml.replace(/<chromatic>(-?\d+)<\/chromatic>/g, (_, value: string) => `<chromatic>${Number(value) + 1}</chromatic>`), probeMidi, probePlan, { tie: probeTie, silentBars: [10] }), 'transposition', 'shifted chromatic');
mustFail(audit(probe.musicXml.replace(/<duration>(\d+)<\/duration>/, (_, value: string) => `<duration>${Number(value) + 1}</duration>`), probeMidi, probePlan, { tie: probeTie, silentBars: [10] }), 'invalid-duration', 'duration plus one');
const silentXml = probe.musicXml.replace(/<measure number="10">[\s\S]*?<\/measure>/, (measure) => measure.replace('<rest/>', '<pitch><step>C</step><octave>5</octave></pitch>'));
mustFail(audit(silentXml, probeMidi, probePlan, { tie: probeTie, silentBars: [10] }), 'silence', 'note in silent bar');

const grouped = scoreFor([{ through: 24, beats: 7, beatType: 8 }]).replace('<beats>7</beats>', '<beats>2+2+3</beats>');
const groupedProposal = orchestrate({
  enabled: true,
  sourceMusicXml: grouped,
  template: 'chamber_orchestra',
  plan: [],
  seed: 11,
  preserveMelody: true,
  pianoChamber: { action: 'propose', sourceMusicXml: grouped },
});
assert.equal(groupedProposal.ok, true, groupedProposal.ok ? '' : groupedProposal.error);
if (groupedProposal.ok && 'proposalOnly' in groupedProposal) assert.deepEqual(groupedProposal.proposal.metres[0]?.groups, [2, 2, 3]);
const groupedScore = realise(grouped, 'faithful');
assert.match(groupedScore.musicXml, /<beats>7<\/beats><beat-type>8<\/beat-type>/);
assert.doesNotMatch(groupedScore.musicXml, /<beats>2\+2\+3<\/beats>/);

function bhl(plan: Plan, startBar: number, endBar: number) {
  const xml = scoreFor(plan);
  return orchestrate({
    ...request(xml, 'developing', 11),
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: xml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        harmonicDevelopment: {
          bhl: { enabled: true, startBar, endBar, target: 'harmonic_support', departure: 'mild', tensionPlacement: 'early', resolutionTiming: 'next-beat' },
        },
      },
    },
  });
}

const fiveBhl = bhl([{ through: 24, beats: 5, beatType: 4 }], 2, 4);
assert.equal(fiveBhl.ok, true, fiveBhl.ok ? '' : fiveBhl.error);
if (fiveBhl.ok && 'fidelity' in fiveBhl && fiveBhl.fidelity?.harmonicDevelopment) {
  const origins = barOrigins([{ through: 24, beats: 5, beatType: 4 }]);
  const windowStart = origins[1]!;
  const windowEnd = origins[3]! + barTicks(5, 4);
  const line = fiveBhl.fidelity.harmonicDevelopment.notes;
  assert.ok(line.length >= 3, '5/4 BHL');
  for (const note of line) {
    const start = note.onset * PPQ;
    const end = (note.onset + note.duration) * PPQ;
    assert.ok(Math.abs(start - Math.round(start)) < 1e-4 && Math.abs(end - Math.round(end)) < 1e-4, '5/4 BHL ticks');
    assert.ok(Math.round(start) >= windowStart && Math.round(end) <= windowEnd, '5/4 BHL span');
  }
  assert.ok(line[2]!.onset >= line[1]!.onset + line[1]!.duration - 1e-6, '5/4 resolution after tension');
}

const threeEightBhl = bhl([{ through: 24, beats: 3, beatType: 8 }], 2, 4);
const threeEightStatus = threeEightBhl.ok ? 'accepted' : threeEightBhl.error;

const seven = scoreFor([{ through: 24, beats: 7, beatType: 8 }]);
const pair = orchestrate({
  ...request(seven, 'developing', 11),
  pianoChamber: {
    action: 'realise',
    sourceMusicXml: seven,
    correction: {
      mode: 'developing',
      reviewConfirmed: true,
      harmonicDevelopment: {
        triadPair: {
          enabled: true,
          parentA: { id: 'parent-a', quality: 'major', notes: ['C', 'E', 'G'], voices: ['C4', 'E4', 'G4'] },
          parentB: { id: 'parent-b', quality: 'minor', notes: ['D', 'F', 'A'], voices: ['D4', 'F4', 'A4'] },
          startBar: 13,
          endBar: 16,
          groups: [['vn2', 'va'], ['cl', 'hn']],
          relation: 'alternation',
          registerMin: 48,
          registerMax: 84,
          maxAttacks: 6,
        },
      },
    },
  },
});
assert.equal(pair.ok, true, pair.ok ? '' : pair.error);
if (pair.ok && 'fidelity' in pair && pair.fidelity?.harmonicDevelopment) {
  const origins = barOrigins([{ through: 24, beats: 7, beatType: 8 }]);
  const notes = pair.fidelity.harmonicDevelopment.notes.filter((note) => note.control === 'triad-pair');
  assert.ok(notes.length >= 2, '7/8 triad answer');
  for (const note of notes) {
    const start = note.onset * PPQ;
    const end = (note.onset + note.duration) * PPQ;
    assert.ok(Math.round(start) >= origins[12]! && Math.round(end) <= origins[15]! + barTicks(7, 8), '7/8 triad span');
  }
}

function refuse(xml: string, pattern: RegExp): void {
  const result = orchestrate({
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: { action: 'propose', sourceMusicXml: xml },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, pattern);
}

refuse(scoreFor([{ through: 24, beats: 2, beatType: 2 }]), /2\/2/);
refuse(scoreFor([{ through: 24, beats: 9, beatType: 16 }]), /9\/16/);
const overflow = scoreFor([{ through: 24, beats: 4, beatType: 4 }]).replace('<duration>480</duration>', '<duration>2400</duration>');
refuse(overflow, /extends past bar 1/);

console.log(JSON.stringify({ report, threeEightBhl: threeEightStatus, tempoUs: TEMPO_US }));
console.log('piano chamber metre timing oracle passed');
