/**
 * V4.0 Phase 3 expressive orchestration.
 * Assertions only. Evidence files are written by scripts/writeV40Phase3Examples.ts.
 * Does not rewrite docs/v3.5-phase1, docs/v4.0-phase1, or docs/v4.0-phase2.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { orchestrate } from '../core/orchestrate/orchestrate';
import { applySymphonicExpression } from '../core/orchestrate/symphonicExpression';
import type { SymphonicPhrasePlan } from '../core/orchestrate/symphonicWriting';
import type { PianoChamberFidelity } from '../core/orchestrate/pianoChamber';
import type { ArticulationV34, DynamicMark, NoteEvent, RestEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import type { OrchestrateRequest, SymphonicOrchestrationSettings } from '../core/orchestrate/types';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { writeScoreMidi } from '../core/export/midiScoreWriter';

interface Realised {
  musicXml: string;
  midiSetBase64: string;
  fidelity: PianoChamberFidelity;
  score: ScoreModel;
}

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'docs/v3.5-phase1');
const LADDER = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];

function payload(base64: string): string {
  const zip = unzipSync(Uint8Array.from(Buffer.from(base64, 'base64')));
  return Object.keys(zip).sort().map((name) => `${name}:${createHash('sha256').update(Buffer.from(zip[name]!)).digest('hex')}`).join('\n');
}

function load(name: string): string {
  return readFileSync(path.join(SRC, name, 'source.musicxml'), 'utf8');
}

function request(xml: string, symphonic?: SymphonicOrchestrationSettings): OrchestrateRequest {
  return {
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: xml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        ...(symphonic ? { symphonic } : {}),
      },
    },
  };
}

function realise(xml: string, symphonic?: SymphonicOrchestrationSettings): Realised {
  const result = orchestrate(request(xml, symphonic));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.score || !result.midiSetBase64) {
    throw new Error('expected a symphonic score');
  }
  return { musicXml: result.musicXml, midiSetBase64: result.midiSetBase64, fidelity: result.fidelity, score: result.score };
}

function noteFacts(score: ScoreModel) {
  const facts: Array<{ partId: string; pitch: number; startBeat: number; duration: number; tie: string | null }> = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        facts.push({
          partId: part.id,
          pitch: event.pitch,
          startBeat: event.startBeat,
          duration: event.duration,
          tie: event.notation?.tie ?? null,
        });
      }
    }
  }
  return facts;
}

function assertSlurSpans(score: ScoreModel) {
  for (const part of score.parts) {
    let depth = 0;
    for (const measure of [...part.measures].sort((a, b) => a.index - b.index)) {
      const notes = measure.events.filter((event): event is NoteEvent => event.kind === 'note')
        .sort((a, b) => a.startBeat - b.startBeat || a.pitch - b.pitch);
      for (const note of notes) {
        const slur = note.notation?.slur;
        if (slur === 'start') {
          assert.equal(depth, 0, `${part.id} slur overlap`);
          depth = 1;
        } else if (slur === 'stop') {
          assert.equal(depth, 1, `${part.id} slur stop without start`);
          depth = 0;
        }
      }
    }
    assert.equal(depth, 0, `${part.id} slur left open`);
  }
}

function assertWedgeSpans(score: ScoreModel) {
  const dynamics = score.partDynamics ?? {};
  for (const [partId, events] of Object.entries(dynamics)) {
    let open = false;
    let openAt = '';
    for (const event of events) {
      if (event.wedge === 'crescendo' || event.wedge === 'diminuendo') {
        assert.equal(open, false, `${partId} overlapping wedge`);
        open = true;
        openAt = `${event.bar}:${event.beat}`;
      } else if (event.wedge === 'stop') {
        assert.equal(open, true, `${partId} wedge stop without start`);
        assert.notEqual(`${event.bar}:${event.beat}`, openAt, `${partId} zero-length wedge`);
        open = false;
      }
      if (event.mark) assert.ok(LADDER.includes(event.mark), `${partId} mark ${event.mark}`);
    }
    assert.equal(open, false, `${partId} wedge left open`);
  }
}

function parseMidi(data: Buffer) {
  assert.equal(data.toString('ascii', 0, 4), 'MThd');
  const ppq = data.readUInt16BE(12);
  let pos = 14;
  const tracks: Array<{ notes: Array<{ midi: number; startTick: number; endTick: number; velocity: number }>; expression: number[] }> = [];
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const end = pos + 8 + data.readUInt32BE(pos + 4);
    pos += 8;
    let tick = 0;
    let status = 0;
    const notes: Array<{ midi: number; startTick: number; endTick: number; velocity: number }> = [];
    const expression: number[] = [];
    const openNotes = new Map<string, { tick: number; velocity: number }>();
    while (pos < end) {
      let delta = 0;
      let byte = 0;
      do {
        byte = data[pos++]!;
        delta = (delta << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tick += delta;
      if (data[pos]! >= 0x80) status = data[pos++]!;
      if (status === 0xff) {
        data[pos++]!;
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      const kind = status & 0xf0;
      const data1 = data[pos++]!;
      const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[pos++]!;
      if (kind === 0xb0 && data1 === 11) expression.push(data2);
      if (kind === 0x90 && data2 > 0) openNotes.set(`${status & 0x0f}:${data1}`, { tick, velocity: data2 });
      if (kind === 0x80 || (kind === 0x90 && data2 === 0)) {
        const start = openNotes.get(`${status & 0x0f}:${data1}`);
        if (start) {
          notes.push({ midi: data1, startTick: start.tick, endTick: tick, velocity: start.velocity });
          openNotes.delete(`${status & 0x0f}:${data1}`);
        }
      }
    }
    tracks.push({ notes, expression });
    pos = end;
  }
  return { ppq, tracks };
}

const phase2Settings: Record<string, SymphonicOrchestrationSettings> = {
  lyrical: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' } },
  contrapuntal: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'off', percussion: 'off' } },
  rhythmic: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'open', strings: 'open', harp: 'limited', percussion: 'open' } },
};

const lyricalXml = load('lyrical');
const counterXml = load('contrapuntal');
const rhythmicXml = load('rhythmic');
const sources = { lyrical: lyricalXml, contrapuntal: counterXml, rhythmic: rhythmicXml } as const;

const plain = realise(lyricalXml, phase2Settings.lyrical);
const plainAgain = realise(lyricalXml, phase2Settings.lyrical);
const explicitLegacy = realise(lyricalXml, { ...phase2Settings.lyrical, expression: 'legacy' });
assert.equal(plain.musicXml, plainAgain.musicXml);
assert.equal(plain.musicXml, explicitLegacy.musicXml);
assert.equal(payload(plain.midiSetBase64), payload(explicitLegacy.midiSetBase64));
assert.equal(plain.fidelity.symphonic?.expression, undefined);
assert.equal(plain.musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase2/lyrical/lyrical.musicxml'), 'utf8'));
assert.equal(realise(lyricalXml).musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase1/lyrical-symphony.musicxml'), 'utf8'));
assert.equal(realise(lyricalXml, { expression: 'expressive' }).musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase1/lyrical-symphony.musicxml'), 'utf8'));
for (const name of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const chamber = orchestrate({
    enabled: true,
    sourceMusicXml: sources[name],
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: { action: 'realise', sourceMusicXml: sources[name], correction: { mode: 'developing', reviewConfirmed: true } },
  });
  assert.equal(chamber.ok, true, chamber.ok ? '' : chamber.error);
  if (chamber.ok && 'musicXml' in chamber) {
    assert.equal(chamber.musicXml, readFileSync(path.join(SRC, name, `${name}.musicxml`), 'utf8'), `${name} chamber bytes moved`);
  }
  const legacy = realise(sources[name], phase2Settings[name]);
  assert.equal(legacy.musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase2', name, `${name}.musicxml`), 'utf8'), `${name} phase 2 bytes moved`);
}
assert.equal(orchestrate(request(lyricalXml, { allocation: 'phase-2', expression: 'later' as 'legacy' })).ok, false);

const seenArticulations = new Set<string>();
const planSignatures: string[] = [];
for (const example of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const baseSettings = phase2Settings[example]!;
  const settings = { ...baseSettings, expression: 'expressive' as const };
  const score = realise(sources[example], settings);
  const again = realise(sources[example], settings);
  const base = realise(sources[example], baseSettings);
  assert.equal(score.musicXml, again.musicXml, `${example} drift`);
  assert.equal(payload(score.midiSetBase64), payload(again.midiSetBase64), `${example} midi drift`);
  assert.notEqual(score.musicXml, base.musicXml);
  assert.deepEqual(noteFacts(score.score), noteFacts(base.score), `${example} source notes moved`);
  assert.equal((score.musicXml.match(/<score-part /g) ?? []).length, 31);
  const staffSum = [...score.musicXml.matchAll(/<staves>(\d+)<\/staves>/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  assert.equal(staffSum, 32, example);
  for (const part of score.score.parts) assert.equal(part.measures.length, 24, part.id);
  const expression = score.fidelity.symphonic?.expression;
  assert.ok(expression);
  assert.equal(expression.expression, 'expressive');
  assert.equal(expression.identicalConsecutiveLong, 0, `${example} repeated a long expression pattern`);
  assert.ok(expression.dynamicMarks >= 3);
  assert.ok(expression.slurs >= 1);
  assert.ok(expression.articulations >= 1);
  assert.ok(expression.velocityLevels >= 2);
  assert.equal(expression.plannedVelocityLevels, expression.velocityLevels);
  assert.equal(expression.plannedVelocityLevels, new Set(score.score.parts.flatMap((part) => part.measures.flatMap((measure) => measure.events.flatMap((event) => event.kind === 'note' && event.velocity != null ? [event.velocity] : [])))).size);
  assert.ok(expression.wedges < expression.decisions.length, `${example} hairpin on every phrase part`);
  assert.ok(expression.decisions.some((row) => row.role === 'foreground'));
  assert.ok(expression.decisions.some((row) => row.role !== 'foreground'));
  assert.ok(new Set(expression.decisions.map((row) => row.contour)).size >= 1);
  const marks = expression.decisions.flatMap((row) => row.marks);
  assert.ok(new Set(marks).size >= 2, `${example} dynamics are flat`);
  assert.ok(marks.every((mark) => LADDER.includes(mark)));
  for (const row of expression.decisions) {
    if (row.partId === 'hp') assert.ok(row.marks.every((mark) => mark === 'pp' || mark === 'p' || mark === 'mp'));
    for (const name of row.articulations) seenArticulations.add(name);
  }
  assert.equal(expression.byFamily.harp?.slurs ?? 0, 0, `${example} harp slur`);
  assert.equal(expression.byFamily.percussion?.slurs ?? 0, 0, `${example} percussion slur`);
  assertSlurSpans(score.score);
  assertWedgeSpans(score.score);
  assert.ok(score.musicXml.includes('<slur type="start"/>'), example);
  assert.ok(score.musicXml.includes('<articulations>'), example);
  if (expression.wedges > 0) {
    assert.ok(score.musicXml.includes('<wedge type="stop"/>'), example);
    assert.ok(expression.midiExpressionEvents >= 3, `${example} hairpin has no MIDI controller`);
  }
  const marcatoParts = new Set<string>();
  for (const part of score.score.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        const names = event.notation?.articulations ?? [];
        if (names.includes('marcato' as ArticulationV34)) marcatoParts.add(part.id);
      }
    }
  }
  for (const partId of marcatoParts) {
    const family = partId.startsWith('hn') || partId.startsWith('tp') || partId.startsWith('tbn') || partId === 'tba' || partId === 'timp';
    assert.ok(family, `${example} marcato on ${partId}`);
  }
  if (example === 'lyrical') {
    assert.ok(marks.some((mark: DynamicMark) => mark === 'pp' || mark === 'p' || mark === 'mp'));
    assert.equal(expression.marcato, 0);
  }
  if (example === 'rhythmic') {
    assert.ok((expression.byFamily.brass?.articulations ?? 0) > 0);
    assert.ok((expression.byFamily.percussion?.articulations ?? 0) > 0);
    assert.ok(expression.marcato >= 1 && expression.marcato <= 4, `${example} marcato ${expression.marcato}`);
  }
  if (example === 'contrapuntal') {
    assert.equal(expression.byFamily.brass, undefined);
    assert.equal(expression.byFamily.percussion, undefined);
  }

  const zip = unzipSync(Uint8Array.from(Buffer.from(score.midiSetBase64, 'base64')));
  const baseZip = unzipSync(Uint8Array.from(Buffer.from(base.midiSetBase64, 'base64')));
  const names = Object.keys(zip).filter((name) => name.endsWith('.mid')).sort();
  assert.deepEqual(names, [
    'symphony-brass.mid',
    'symphony-harp-timpani-percussion.mid',
    'symphony-strings.mid',
    'symphony-woodwinds.mid',
  ]);
  for (const name of names) {
    const expressed = parseMidi(Buffer.from(zip[name]!));
    const legacy = parseMidi(Buffer.from(baseZip[name]!));
    assert.equal(expressed.ppq, 480, name);
    assert.equal(legacy.ppq, 480, name);
    const attacks = expressed.tracks.flatMap((track) => track.notes.map((note) => ({ midi: note.midi, startTick: note.startTick, endTick: note.endTick })));
    const baseAttacks = legacy.tracks.flatMap((track) => track.notes.map((note) => ({ midi: note.midi, startTick: note.startTick, endTick: note.endTick })));
    assert.deepEqual(attacks, baseAttacks, `${example} ${name} timing moved`);
  }
  const stringMidi = parseMidi(Buffer.from(zip['symphony-strings.mid']!));
  const baseStringMidi = parseMidi(Buffer.from(baseZip['symphony-strings.mid']!));
  const velocities = stringMidi.tracks.flatMap((track) => track.notes.map((note) => note.velocity));
  const baseVelocities = baseStringMidi.tracks.flatMap((track) => track.notes.map((note) => note.velocity));
  assert.ok(new Set(velocities).size >= 2, `${example} MIDI velocity is flat`);
  assert.notDeepEqual(velocities, baseVelocities, `${example} MIDI velocity unchanged`);
  if (expression.wedges > 0) {
    const controllers = stringMidi.tracks.flatMap((track) => track.expression);
    const anyControllers = names.flatMap((name) => parseMidi(Buffer.from(zip[name]!)).tracks.flatMap((track) => track.expression));
    assert.ok(new Set(anyControllers).size >= 2, `${example} hairpin MIDI is flat`);
    void controllers;
  }
  planSignatures.push(expression.decisions.map((row) => `${row.partId}:${row.contour}:${row.wedge}:${row.marks.join('-')}`).join('|'));
}

assert.equal(new Set(planSignatures).size, 3, 'the three examples share one expression plan');
assert.ok(seenArticulations.has('staccato'), 'no staccato');
assert.ok(seenArticulations.has('tenuto'), 'no tenuto');
assert.ok(seenArticulations.has('accent'), 'no accent');

interface XmlWedge {
  partId: string;
  partName: string;
  type: string;
  startBar: number;
  startBeat: number;
  stopBar: number;
  stopBeat: number;
}

interface XmlEvent {
  voice: string;
  staff: string;
  bar: number;
  beat: number;
  duration: number;
}

/** Reads wedges and rests from exported MusicXML. Does not use phrase plans or expression.json. */
function readExportedExpression(xml: string): { wedges: XmlWedge[]; rests: Map<string, XmlEvent[]>; notes: Map<string, XmlEvent[]> } {
  const names = new Map<string, string>();
  for (const match of xml.matchAll(/<score-part id="([^"]+)">[\s\S]*?<part-name>([^<]*)<\/part-name>/g)) {
    names.set(match[1]!, match[2]!);
  }
  const wedges: XmlWedge[] = [];
  const rests = new Map<string, XmlEvent[]>();
  const notes = new Map<string, XmlEvent[]>();
  for (const partMatch of xml.matchAll(/<part id="([^"]+)">([\s\S]*?)<\/part>/g)) {
    const partId = partMatch[1]!;
    const body = partMatch[2]!;
    let divisions = 480;
    const open: Array<{ type: string; startBar: number; startBeat: number }> = [];
    const partRests: XmlEvent[] = [];
    const partNotes: XmlEvent[] = [];
    for (const measureMatch of body.matchAll(/<measure number="(\d+)">([\s\S]*?)<\/measure>/g)) {
      const bar = Number(measureMatch[1]);
      let pos = 0;
      const tokens = measureMatch[2]!.match(/<attributes\b[\s\S]*?<\/attributes>|<backup\b[\s\S]*?<\/backup>|<forward\b[\s\S]*?<\/forward>|<direction\b[\s\S]*?<\/direction>|<note\b[\s\S]*?<\/note>/g) ?? [];
      for (const token of tokens) {
        if (token.startsWith('<attributes')) {
          const found = token.match(/<divisions>(\d+)<\/divisions>/);
          if (found) divisions = Number(found[1]);
        } else if (token.startsWith('<backup')) {
          pos -= Number(token.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0);
        } else if (token.startsWith('<forward')) {
          pos += Number(token.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0);
        } else if (token.startsWith('<direction')) {
          const offset = token.match(/<offset>(-?\d+)<\/offset>/);
          const beat = (offset ? Number(offset[1]) : pos) / divisions;
          const wedge = token.match(/<wedge type="([^"]+)"/);
          if (!wedge) continue;
          if (wedge[1] === 'stop') {
            const start = open.pop();
            assert.ok(start, `${partId} exported stop without a start`);
            wedges.push({
              partId,
              partName: names.get(partId) ?? partId,
              type: start!.type,
              startBar: start!.startBar,
              startBeat: roundBeat(start!.startBeat),
              stopBar: bar,
              stopBeat: roundBeat(beat),
            });
          } else {
            open.push({ type: wedge[1]!, startBar: bar, startBeat: beat });
          }
        } else if (token.startsWith('<note') && !token.includes('<chord/>')) {
          const duration = Number(token.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0);
          const voice = token.match(/<voice>([^<]+)<\/voice>/)?.[1] ?? '1';
          const staff = token.match(/<staff>([^<]+)<\/staff>/)?.[1] ?? '1';
          const placed = { voice, staff, bar, beat: roundBeat(pos / divisions), duration: duration / divisions };
          if (token.includes('<rest/>') || token.includes('<rest ')) partRests.push(placed);
          else partNotes.push(placed);
          pos += duration;
        }
      }
    }
    assert.equal(open.length, 0, `${partId} exported wedge left open`);
    rests.set(partId, partRests);
    notes.set(partId, partNotes);
  }
  return { wedges, rests, notes };
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function absQuarter(bar: number, beat: number): number {
  return (bar - 1) * 4 + beat;
}

/** A rest crosses a hairpin only when that same voice and staff begins the rest strictly inside the open span. */
function crossingsOf(xml: string): string[] {
  const read = readExportedExpression(xml);
  const found: string[] = [];
  for (const wedge of read.wedges) {
    const start = absQuarter(wedge.startBar, wedge.startBeat);
    const stop = absQuarter(wedge.stopBar, wedge.stopBeat);
    const partNotes = read.notes.get(wedge.partId) ?? [];
    const attacking = partNotes.filter((note) => Math.abs(absQuarter(note.bar, note.beat) - start) <= 1e-6);
    const owners = attacking.length ? attacking : partNotes.filter((note) => {
      const onset = absQuarter(note.bar, note.beat);
      return onset <= start + 1e-6 && onset + note.duration > start + 1e-6;
    });
    const scopes = [...new Set(owners.map((note) => `${note.voice}/${note.staff}`))];
    assert.ok(scopes.length > 0, `${wedge.partName} hairpin ${wedge.startBar}b${wedge.startBeat} has no sounding note`);
    const interrupted = scopes.filter((scope) => (read.rests.get(wedge.partId) ?? []).some((rest) => {
      if (`${rest.voice}/${rest.staff}` !== scope) return false;
      const restStart = absQuarter(rest.bar, rest.beat);
      const restEnd = restStart + rest.duration;
      return restStart > start + 1e-6 && restStart < stop - 1e-6 && restEnd > start + 1e-6;
    }));
    if (interrupted.length === scopes.length) {
      found.push(`${wedge.partName} ${wedge.type} ${wedge.startBar}b${wedge.startBeat} -> ${wedge.stopBar}b${wedge.stopBeat} crosses ${interrupted[0]}`);
    }
  }
  return found;
}

mkdirSync(path.join(ROOT, '.tmp-v40-phase3-repair-accept'), { recursive: true });

const reportedCrossings = [
  ['Flute 1', 2, 0, 4, 2],
  ['Flute 1', 5, 2, 8, 2],
  ['Flute 1', 18, 0, 20, 2],
  ['Flute 1', 21, 2, 24, 2],
  ['Violin I', 10, 0, 12, 2],
  ['Violin I', 13, 2, 16, 2],
] as const;

for (const example of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const expressed = realise(sources[example], { ...phase2Settings[example]!, expression: 'expressive' });
  const found = crossingsOf(expressed.musicXml);
  assert.deepEqual(found, [], `${example} hairpin crosses a rest: ${found.join('; ')}`);
  if (example !== 'lyrical') {
    assert.equal(expressed.musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase3', example, `${example}.musicxml`), 'utf8'), `${example} valid expression moved`);
  }
  const positive = new Set<number>();
  const zip = unzipSync(Uint8Array.from(Buffer.from(expressed.midiSetBase64, 'base64')));
  for (const name of Object.keys(zip).filter((item) => item.endsWith('.mid'))) {
    for (const velocity of positiveNoteOnVelocities(Buffer.from(zip[name]!))) positive.add(velocity);
  }
  assert.ok(positive.size >= 2, `${example} exported velocity`);
  const planned = expressed.fidelity.symphonic?.expression?.plannedVelocityLevels ?? 0;
  assert.notEqual(planned, 0);
  writeFileSync(path.join(ROOT, '.tmp-v40-phase3-repair-accept', `${example}-velocity.txt`), `planned ${planned}\nexportedPositiveNoteOn ${positive.size}\n`);
}

const lyricalNow = realise(lyricalXml, { ...phase2Settings.lyrical!, expression: 'expressive' });
const lyricalRead = readExportedExpression(lyricalNow.musicXml);
for (const [name, startBar, startBeat, stopBar, stopBeat] of reportedCrossings) {
  const still = lyricalRead.wedges.find((wedge) => wedge.partName === name && wedge.startBar === startBar && wedge.startBeat === startBeat && wedge.stopBar === stopBar && wedge.stopBeat === stopBeat);
  assert.equal(still, undefined, `${name} still uses the reported crossing ${startBar}:${startBeat}-${stopBar}:${stopBeat}`);
}
const keptFlute = lyricalRead.wedges.find((wedge) => wedge.partName === 'Flute 1' && wedge.startBar === 13 && wedge.startBeat === 3 && wedge.stopBar === 15 && wedge.stopBeat === 0);
assert.ok(keptFlute, 'uninterrupted Flute 1 hairpin moved');
assert.equal(lyricalRead.wedges.filter((wedge) => wedge.partName === 'Flute 1').length, 4);
assert.equal(lyricalRead.wedges.filter((wedge) => wedge.partName === 'Violin I').length, 8);

function positiveNoteOnVelocities(data: Buffer): number[] {
  const values: number[] = [];
  let pos = 14;
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const end = pos + 8 + data.readUInt32BE(pos + 4);
    pos += 8;
    let status = 0;
    while (pos < end) {
      let byte = 0;
      do {
        byte = data[pos++]!;
      } while (byte & 0x80);
      if (data[pos]! >= 0x80) status = data[pos++]!;
      if (status === 0xff) {
        data[pos++]!;
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      const kind = status & 0xf0;
      data[pos++]!;
      const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[pos++]!;
      if (kind === 0x90 && data2 > 0) values.push(data2);
    }
    pos = end;
  }
  return values;
}

function probePlan(endBar: number): SymphonicPhrasePlan {
  return {
    phraseId: 'probe',
    startBar: 1,
    endBar,
    kind: 'statement',
    foregroundFamily: 'woodwind',
    foregroundIds: ['fl1'],
    supportIds: [],
    bassIds: [],
    counterline: 'silence',
    answerIds: [],
    register: 'high',
    dynamic: 'mf',
    doubling: false,
    harp: false,
    timpani: false,
    percussion: 'none',
    previousFamily: null,
  };
}

function tone(pitch: number, startBeat: number, duration: number, voice = 1, extra: Partial<NoteEvent> & { staff?: number } = {}): NoteEvent {
  return { kind: 'note', pitch, startBeat, duration, voice, ...extra };
}

function rest(startBeat: number, duration: number, voice = 1, staff?: number): RestEvent & { staff?: number } {
  return { kind: 'rest', startBeat, duration, voice, ...(staff ? { staff } : {}) };
}

function probeScore(bars: NoteEvent[][]): ScoreModel {
  return {
    title: 'phase3-expression-probe',
    tempo: 72,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'fl1',
      name: 'Flute 1',
      instrumentIdentity: 'flute',
      midiProgram: 73,
      clef: 'treble',
      measures: bars.map((events, index) => ({ index: index + 1, events })),
    }],
  };
}

function realiseProbe(bars: NoteEvent[][]): { xml: string; score: ScoreModel } {
  const score = probeScore(bars);
  applySymphonicExpression(score, [probePlan(bars.length)]);
  const exported = exportScoreModelToMusicXml(score);
  assert.equal(exported.success, true, exported.errors.join('; '));
  return { xml: exported.xml ?? '', score };
}

function cc11Events(data: Buffer): Array<{ tick: number; value: number }> {
  const events: Array<{ tick: number; value: number }> = [];
  let pos = 14;
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const end = pos + 8 + data.readUInt32BE(pos + 4);
    pos += 8;
    let tick = 0;
    let status = 0;
    while (pos < end) {
      let delta = 0;
      let byte = 0;
      do {
        byte = data[pos++]!;
        delta = (delta << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tick += delta;
      if (data[pos]! >= 0x80) status = data[pos++]!;
      if (status === 0xff) {
        data[pos++]!;
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        pos += length;
        continue;
      }
      const kind = status & 0xf0;
      const data1 = data[pos++]!;
      const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[pos++]!;
      if (kind === 0xb0 && data1 === 11) events.push({ tick, value: data2 });
    }
    pos = end;
  }
  return events;
}

const uninterrupted = realiseProbe([[
  tone(60, 0, 1), tone(62, 1, 1), tone(64, 2, 1), tone(67, 3, 1),
], [
  tone(69, 0, 1), rest(1, 3),
]]);
const uninterruptedWedges = readExportedExpression(uninterrupted.xml).wedges;
assert.equal(crossingsOf(uninterrupted.xml).length, 0);
assert.equal(uninterruptedWedges.length, 1);
assert.equal(uninterruptedWedges[0]!.stopBar, 2);
assert.equal(uninterruptedWedges[0]!.stopBeat, 0);

const boundary = realiseProbe([[
  tone(60, 0, 1), tone(62, 1, 1), tone(64, 2, 1), rest(3, 1),
], [
  tone(67, 0, 1), tone(69, 1, 1), tone(71, 2, 1), tone(74, 3, 1),
]]);
const boundaryWedges = readExportedExpression(boundary.xml).wedges;
assert.deepEqual(crossingsOf(boundary.xml), []);
assert.equal(boundaryWedges.length, 1);
assert.equal(boundaryWedges[0]!.stopBar, 1);
assert.equal(boundaryWedges[0]!.stopBeat, 3);
const boundaryNotes = boundary.score.parts[0]!.measures.flatMap((measure) => measure.events.filter((event): event is NoteEvent => event.kind === 'note'));
const boundaryFirst = boundaryNotes[0]!;
const boundaryInside = boundaryNotes[2]!;
const boundaryFollowing = boundary.score.parts[0]!.measures[1]!.events[0]!;
assert.equal(boundaryFollowing.kind, 'note');
if (boundaryFollowing.kind === 'note') {
  assert.equal(boundaryFollowing.velocity, boundaryFirst.velocity);
  assert.notEqual(boundaryInside.velocity, boundaryFirst.velocity);
  assert.ok((boundaryInside.velocity ?? 0) < 68);
}
const boundaryMidi = writeScoreMidi(boundary.score, path.join(ROOT, '.tmp-v40-phase3-repair-accept'), 'boundary');
assert.ok(boundaryMidi);
const boundaryCc = cc11Events(readFileSync(boundaryMidi!));
assert.ok(boundaryCc.length >= 2);
assert.equal(boundaryCc[boundaryCc.length - 1]!.tick, 3 * 480);
assert.ok(boundaryCc.every((event) => event.tick < 4 * 480));
assert.ok(boundaryCc[boundaryCc.length - 1]!.value > 52 && boundaryCc[boundaryCc.length - 1]!.value < 68);

const tied = realiseProbe([[
  tone(60, 0, 4, 1, { pitches: [60, 64], notation: { tie: 'start' } }),
], [
  tone(60, 0, 2, 1, { pitches: [60, 64], notation: { tie: 'stop' } }),
  tone(64, 2, 1),
  tone(67, 3, 1),
]]);
const tiedWedges = readExportedExpression(tied.xml).wedges;
assert.deepEqual(crossingsOf(tied.xml), []);
assert.equal(tiedWedges.length, 1);
assert.equal(tiedWedges[0]!.stopBar, 2);
assert.equal(tiedWedges[0]!.stopBeat, 3);
assert.ok(tied.xml.includes('<tied type="start"/>'));
assert.ok(tied.xml.includes('<tied type="stop"/>'));

const otherVoice = realiseProbe([[
  tone(60, 0, 1), tone(62, 1, 1), tone(64, 2, 1), tone(65, 3, 1), rest(0, 4, 2),
], [
  tone(67, 0, 1), tone(69, 1, 1), tone(71, 2, 1), tone(74, 3, 1), rest(0, 4, 2),
]]);
const otherVoiceWedges = readExportedExpression(otherVoice.xml).wedges;
assert.deepEqual(crossingsOf(otherVoice.xml), []);
assert.equal(otherVoiceWedges.length, 1);
assert.equal(otherVoiceWedges[0]!.stopBar, 2);
assert.equal(otherVoiceWedges[0]!.stopBeat, 3);
assert.ok(otherVoice.xml.includes('<voice>2</voice>'));

const otherStaff = realiseProbe([[
  tone(60, 0, 1, 1, { staff: 1 }),
  tone(62, 1, 1, 1, { staff: 1 }),
  tone(64, 2, 1, 1, { staff: 1 }),
  tone(65, 3, 1, 1, { staff: 1 }),
  tone(72, 0, 1, 2, { staff: 2 }),
  rest(1, 3, 2, 2),
], [
  tone(67, 0, 1, 1, { staff: 1 }),
  tone(69, 1, 1, 1, { staff: 1 }),
  tone(71, 2, 1, 1, { staff: 1 }),
  tone(74, 3, 1, 1, { staff: 1 }),
  rest(0, 4, 2, 2),
]]);
const otherStaffWedges = readExportedExpression(otherStaff.xml).wedges;
assert.deepEqual(crossingsOf(otherStaff.xml), []);
assert.equal(otherStaffWedges[0]!.stopBar, 2);
assert.equal(otherStaffWedges[0]!.stopBeat, 3);

const tooShort = realiseProbe([[
  tone(60, 0, 1), tone(62, 1, 1), rest(2, 2),
], [
  tone(67, 0, 1), tone(69, 1, 1), tone(71, 2, 1), tone(74, 3, 1),
]]);
assert.equal(readExportedExpression(tooShort.xml).wedges.length, 0);
assert.equal(tooShort.score.midiExpression, undefined);
const tooShortFollowing = tooShort.score.parts[0]!.measures[1]!.events[0]!;
const tooShortFirst = tooShort.score.parts[0]!.measures[0]!.events[0]!;
assert.equal(tooShortFollowing.kind, 'note');
assert.equal(tooShortFirst.kind, 'note');
if (tooShortFollowing.kind === 'note' && tooShortFirst.kind === 'note') {
  assert.equal(tooShortFollowing.velocity, tooShortFirst.velocity);
}
const tooShortMidi = writeScoreMidi(tooShort.score, path.join(ROOT, '.tmp-v40-phase3-repair-accept'), 'too-short');
assert.ok(tooShortMidi);
assert.deepEqual(cc11Events(readFileSync(tooShortMidi!)), []);

console.log('phase 3 expression ok');
