/**
 * V3.5 Phase 2 — harmonic development on the Phase 1 piano-to-chamber path.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { INSTRUMENT_CATALOGUE } from '../core/instruments/instrumentCatalogue';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import { buildOrchestrationReport } from '../core/musical-evaluation/orchestrationReport';
import { parseMidiReference } from '../core/reference-import/midiReferenceParser';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { BhlTensionReleaseControl, OrchestrateRequest, TriadPairDialogueControl } from '../core/orchestrate/types';

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'docs/v3.5-phase1');
const OUT = path.join(ROOT, 'docs/v3.5-phase2');

const PART_INSTRUMENT: Record<string, string> = {
  fl: 'flute',
  ob: 'oboe',
  cl: 'clarinet_bb',
  hn: 'horn_f',
  bn: 'bassoon',
  vn1: 'violin',
  vn2: 'violin',
  va: 'viola',
  vc: 'cello',
  db: 'double_bass',
};

function committed(rel: string): Buffer {
  return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT });
}

function quarters(value: { n: number; d: number }): number {
  return value.n / value.d;
}

function parseMidi(data: Buffer): { ppq: number; tracks: Array<{ name: string; tempos: Array<{ tick: number; bpm: number }>; notes: Array<{ midi: number; startTick: number; endTick: number }> }> } {
  assert.equal(data.toString('ascii', 0, 4), 'MThd');
  const ppq = data.readUInt16BE(12);
  let pos = 14;
  const tracks: Array<{ name: string; tempos: Array<{ tick: number; bpm: number }>; notes: Array<{ midi: number; startTick: number; endTick: number }> }> = [];
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const end = pos + 8 + data.readUInt32BE(pos + 4);
    pos += 8;
    let tick = 0;
    let status = 0;
    let name = '';
    const tempos: Array<{ tick: number; bpm: number }> = [];
    const notes: Array<{ midi: number; startTick: number; endTick: number }> = [];
    const open = new Map<number, number>();
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
        const type = data[pos++]!;
        let length = 0;
        do {
          byte = data[pos++]!;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        const payload = data.subarray(pos, pos + length);
        pos += length;
        if (type === 0x03) name = payload.toString('utf8');
        if (type === 0x51 && payload.length === 3) {
          const microseconds = (payload[0]! << 16) | (payload[1]! << 8) | payload[2]!;
          tempos.push({ tick, bpm: 60000000 / microseconds });
        }
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
      if (kind === 0x90 && data2 > 0) open.set(data1, tick);
      if (kind === 0x80 || (kind === 0x90 && data2 === 0)) {
        const start = open.get(data1);
        if (start !== undefined) {
          notes.push({ midi: data1, startTick: start, endTick: tick });
          open.delete(data1);
        }
      }
    }
    tracks.push({ name, tempos, notes });
    pos = end;
  }
  return { ppq, tracks };
}

function assertMidiParity(xml: string, midiBase64: string, label: string, tempo: number): void {
  const parsed = ingestCanonicalScore(xml);
  assert.ok(parsed.score, parsed.parseError);
  const score = parsed.score!;
  const midi = parseMidi(Buffer.from(midiBase64, 'base64'));
  const musicTracks = midi.tracks.filter((track) => track.notes.length > 0 || track.name);
  assert.equal(musicTracks.length, 10, `${label} midi parts`);
  const tempoEvents = midi.tracks.flatMap((track) => track.tempos);
  assert.equal(tempoEvents.length, 1, `${label} tempo events`);
  assert.equal(Math.round(60000000 / tempoEvents[0]!.bpm), Math.round(60000000 / tempo), `${label} tempo microseconds`);
  assert.equal(tempoEvents[0]!.tick, 0, `${label} tempo onset`);
  score.parts.forEach((part, index) => {
    const track = musicTracks[index]!;
    assert.equal(track.name, part.name, `${label} ${part.id} name`);
    const xmlNotes = score.soundingEvents
      .filter((event) => event.partId === part.id && !event.rest && event.soundingMidi !== null)
      .map((event) => ({
        midi: event.soundingMidi as number,
        startTick: Math.round(quarters(event.onset) * midi.ppq),
        endTick: Math.round((quarters(event.onset) + quarters(event.duration)) * midi.ppq),
      }))
      .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
    const midiNotes = track.notes
      .map((note) => ({ midi: note.midi, startTick: note.startTick, endTick: note.endTick }))
      .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
    assert.deepEqual(midiNotes, xmlNotes, `${label} ${part.id} sounding onset duration release`);
  });
}

function load(name: string): string {
  return readFileSync(path.join(SRC, name, 'source.musicxml'), 'utf8');
}

function base(xml: string, seed = 11): OrchestrateRequest {
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
      correction: { mode: 'developing', reviewConfirmed: true },
    },
  };
}

function withHarmonic(xml: string, harmonicDevelopment: NonNullable<NonNullable<OrchestrateRequest['pianoChamber']>['correction']>['harmonicDevelopment'], seed = 11): OrchestrateRequest {
  const request = base(xml, seed);
  request.pianoChamber = {
    action: 'realise',
    sourceMusicXml: xml,
    correction: { mode: 'developing', reviewConfirmed: true, harmonicDevelopment },
  };
  return request;
}

function realise(request: OrchestrateRequest) {
  const result = orchestrate(request);
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.midiBase64) throw new Error('expected a score');
  return result;
}

function keyOf(note: { partId: string; midi: number; onset: number; duration: number }): string {
  return `${note.partId}:${note.midi}@${note.onset}/${note.duration}`;
}

const bhl = (patch: Partial<BhlTensionReleaseControl> = {}): BhlTensionReleaseControl => ({
  enabled: true,
  startBar: 5,
  endBar: 8,
  target: 'harmonic_support',
  departure: 'mild',
  tensionPlacement: 'early',
  resolutionTiming: 'next-beat',
  ...patch,
});

const pair = (patch: Partial<TriadPairDialogueControl> = {}): TriadPairDialogueControl => ({
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
  ...patch,
});

const sources = {
  lyrical: load('lyrical'),
  contrapuntal: load('contrapuntal'),
  rhythmic: load('rhythmic'),
};

mkdirSync(OUT, { recursive: true });
const comparisons: string[] = [];

for (const [name, xml] of Object.entries(sources)) {
  const off = realise(base(xml));
  const again = realise(base(xml));
  assert.equal(off.musicXml, again.musicXml, `${name} phase 1 drift`);
  const disabled = realise(withHarmonic(xml, { bhl: { ...bhl(), enabled: false }, triadPair: { ...pair(), enabled: false } }));
  assert.equal(disabled.musicXml, off.musicXml, `${name} off-path MusicXML`);
  assert.equal(disabled.midiBase64, off.midiBase64, `${name} off-path MIDI`);
  assert.equal(disabled.fidelity.harmonicDevelopment, undefined, `${name} off-path fidelity`);
  const committedXml = committed(`docs/v3.5-phase1/${name}/${name}.musicxml`).toString('utf8');
  const committedMid = committed(`docs/v3.5-phase1/${name}/${name}.mid`);
  assert.equal(off.musicXml, committedXml, `${name} off-path differs from committed Phase 1 MusicXML`);
  assert.ok(Buffer.from(off.midiBase64, 'base64').equals(committedMid), `${name} off-path differs from committed Phase 1 MIDI`);

  const bhlOn = realise(withHarmonic(xml, { bhl: bhl() }));
  const bhlAgain = realise(withHarmonic(xml, { bhl: bhl() }));
  assert.equal(bhlOn.musicXml, bhlAgain.musicXml, `${name} bhl seed drift`);
  assert.notEqual(bhlOn.musicXml, off.musicXml, `${name} bhl changed the score`);
  const strong = realise(withHarmonic(xml, { bhl: bhl({ departure: 'strong' }) }));
  assert.notEqual(strong.musicXml, bhlOn.musicXml, `${name} strong departure differs from mild`);

  const pairOn = realise(withHarmonic(xml, { triadPair: pair() }));
  const pairAgain = realise(withHarmonic(xml, { triadPair: pair() }));
  assert.equal(pairOn.musicXml, pairAgain.musicXml, `${name} pair seed drift`);
  assert.notEqual(pairOn.musicXml, off.musicXml, `${name} pair changed the score`);
  const interlock = realise(withHarmonic(xml, { triadPair: pair({ relation: 'interlocking', startBar: 5, endBar: 8 }) }));
  assert.notEqual(interlock.musicXml, pairOn.musicXml, `${name} interlocking differs`);

  for (const [label, on] of [['bhl', bhlOn], ['triad-pair', pairOn]] as const) {
    const parsed = ingestCanonicalScore(on.musicXml);
    assert.ok(parsed.score, parsed.parseError);
    const score = parsed.score!;
    assert.equal(score.parts.length, 10, label);
    assert.equal(new Set(score.measures.map((measure) => measure.bar)).size, 24, label);
    for (const part of score.parts) {
      assert.equal(score.measures.filter((measure) => measure.partId === part.id).length, 24, part.id);
    }
    const midi = parseMidiReference(Uint8Array.from(Buffer.from(on.midiBase64, 'base64')));
    assert.equal(midi.ok, true, midi.errors.join('; '));
    const xmlPitches = score.soundingEvents.filter((event) => !event.rest && event.soundingMidi !== null).map((event) => event.soundingMidi as number).sort((a, b) => a - b);
    const midiPitches = (midi.piece?.noteSamples ?? []).map((note) => note.midi).sort((a, b) => a - b);
    assert.deepEqual(midiPitches, xmlPitches, `${name} ${label} sounding midi`);
    const report = buildOrchestrationReport({ xml: on.musicXml });
    assert.equal(report.rangeUse.filter((row) => row.outsideHard > 0).length, 0, `${name} ${label} range`);
    assert.match(on.musicXml, /<part id="cl">[\s\S]*?<chromatic>-2<\/chromatic>/);
    assert.match(on.musicXml, /<part id="hn">[\s\S]*?<chromatic>-7<\/chromatic>/);
    assert.match(on.musicXml, /<part id="db">[\s\S]*?<octave-change>-1<\/octave-change>/);
    const offKeys = new Set(off.fidelity.preview.map(keyOf));
    const onKeys = new Set(on.fidelity.preview.map(keyOf));
    for (const key of offKeys) assert.ok(onKeys.has(key), `${name} ${label} dropped ${key}`);
    const added = on.fidelity.preview.filter((note) => !offKeys.has(keyOf(note)));
    assert.ok(added.length >= 2, `${name} ${label} added sounding notes`);
    const recorded = new Set((on.fidelity.harmonicDevelopment?.notes ?? []).map(keyOf));
    for (const note of added) assert.ok(recorded.has(keyOf(note)), `${name} ${label} extra note was not recorded ${keyOf(note)}`);
    for (const id of off.fidelity.protectedEventIds) {
      const before = off.fidelity.classifications.find((row) => row.eventId === id);
      const after = on.fidelity.classifications.find((row) => row.eventId === id);
      assert.deepEqual(after, before, `${name} ${label} lock ${id}`);
    }
    assert.equal(on.fidelity.musicalQualityScore, null);
    assert.equal(on.fidelity.musicallyApproved, false);
    const line = on.fidelity.harmonicDevelopment?.notes ?? [];
    const rhythms = new Set(line.map((note) => note.duration));
    const parts = new Set(line.map((note) => note.partId));
    assert.ok(rhythms.size >= 1, `${name} ${label} rhythm`);
    assert.ok(parts.size >= 1, `${name} ${label} instrument`);
    assertMidiParity(on.musicXml, on.midiBase64, `${name} ${label}`, on.fidelity.tempoBpm);
    if (label === 'bhl') {
      assert.equal(line.length, 3, `${name} bhl note count`);
      assert.notEqual(line[1]!.midi, line[0]!.midi, `${name} tension moves`);
      assert.equal(line[2]!.midi, line[0]!.midi, `${name} resolution returns to the common tone`);
      assert.ok(line[2]!.onset >= line[1]!.onset + line[1]!.duration - 1e-6, `${name} resolution after tension`);
    }
    if (label === 'triad-pair') {
      const parentA = new Set([0, 4, 7]);
      const parentB = new Set([2, 5, 9]);
      for (const note of line) {
        const pitchClass = ((note.midi % 12) + 12) % 12;
        const named = note.reason.includes('states parent-b') ? parentB : parentA;
        assert.ok(named.has(pitchClass), `${name} ${note.midi} left its named parent`);
      }
    }
    for (const note of line) {
      const instrument = INSTRUMENT_CATALOGUE.find((item) => item.id === PART_INSTRUMENT[note.partId]);
      assert.ok(instrument?.soundingHardRange, note.partId);
      const [low, high] = instrument!.soundingHardRange!;
      assert.ok(note.midi >= low && note.midi <= high, `${name} ${label} ${note.partId} MIDI ${note.midi} hard range`);
    }
    if (name === 'contrapuntal') {
      assert.ok(on.fidelity.silence.some((row) => row.bar === 4), `${label} keeps bar 4 silence`);
    }
    if (name === 'rhythmic') {
      const lowC = score.soundingEvents.filter((event) => event.partId === 'db' && event.soundingMidi === 48 && quarters(event.onset) === 28);
      assert.equal(lowC.length, 1, `${label} tied low C`);
      assert.equal(quarters(lowC[0]!.duration), 8, `${label} tied low C duration`);
      assert.match(on.musicXml, /<tied type="start"\/>/);
    }
    comparisons.push([
      `## ${name} ${label}`,
      `A notes ${off.fidelity.preview.length}. B notes ${on.fidelity.preview.length}. Added ${added.length}.`,
      ...line.map((note) => `- ${note.partId} onset ${note.onset} dur ${note.duration} MIDI ${note.midi}. ${note.reason}`),
    ].join('\n'));
    writeFileSync(path.join(OUT, `${name}-${label}.musicxml`), on.musicXml);
    writeFileSync(path.join(OUT, `${name}-${label}.mid`), Buffer.from(on.midiBase64, 'base64'));
  }
  writeFileSync(path.join(OUT, `${name}-phase1.musicxml`), off.musicXml);
}

const lyrical = sources.lyrical;
const foreground = realise(base(lyrical)).fidelity.phrases.find((phrase) => phrase.startBar <= 5 && phrase.endBar >= 5)?.foreground;
assert.ok(foreground);
const refusedCarrier = orchestrate(withHarmonic(lyrical, { bhl: bhl({ target: foreground }) }));
assert.equal(refusedCarrier.ok, false);
if (!refusedCarrier.ok) assert.match(refusedCarrier.error, /protected melody or bass/);

const refusedBass = orchestrate(withHarmonic(lyrical, { bhl: bhl({ target: 'db' }) }));
assert.equal(refusedBass.ok, false);

const refusedSpan = orchestrate(withHarmonic(lyrical, { bhl: bhl({ startBar: 30, endBar: 32 }) }));
assert.equal(refusedSpan.ok, false);

const silent = orchestrate(withHarmonic(sources.contrapuntal, { bhl: bhl({ startBar: 4, endBar: 4 }) }));
assert.equal(silent.ok, false);
if (!silent.ok) assert.match(silent.error, /silence|span|resolution/);

const sameParent = orchestrate(withHarmonic(lyrical, {
  triadPair: pair({
    parentB: { id: 'parent-a', quality: 'major', notes: ['C', 'E', 'G'], voices: ['C4', 'E4', 'G4'] },
  }),
}));
assert.equal(sameParent.ok, false);

const refusedGroup = orchestrate(withHarmonic(lyrical, { triadPair: pair({ groups: [['db', 'va'], ['cl', 'hn']] }) }));
assert.equal(refusedGroup.ok, false);
if (!refusedGroup.ok) assert.match(refusedGroup.error, /protected|bass/);

const refusedActivity = orchestrate(withHarmonic(lyrical, { triadPair: pair({ maxAttacks: 1 }) }));
assert.equal(refusedActivity.ok, false);

const badTriad = orchestrate(withHarmonic(lyrical, {
  triadPair: pair({ parentA: { id: 'bad', quality: 'major', notes: ['C', 'C', 'G'], voices: ['C4', 'C4', 'G4'] } }),
}));
assert.equal(badTriad.ok, false);

const legacy = orchestrate({ enabled: true, sourceMusicXml: lyrical, template: 'string_quartet', plan: [], seed: 11, preserveMelody: true });
assert.equal(legacy.ok, false);

function metreScore(beats: number, beatType: number): string {
  const quarters = beats * 4 / beatType;
  const ticks = 480 * quarters;
  const type = beats === 6 ? 'quarter' : 'whole';
  const dot = beats === 6 ? '<dot/>' : '';
  const bars = Array.from({ length: 24 }, (_, index) => {
    const right = `<note><pitch><step>${index % 2 === 0 ? 'E' : 'G'}</step><octave>5</octave></pitch><duration>${ticks}</duration><voice>1</voice><type>${type}</type>${dot}<staff>1</staff></note>`;
    const left = `<note><pitch><step>C</step><octave>3</octave></pitch><duration>${ticks}</duration><voice>1</voice><type>${type}</type>${dot}<staff>2</staff></note>`;
    return `<measure number="${index + 1}">${index === 0 ? `<attributes><divisions>480</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>` : ''}${right}<backup><duration>${ticks}</duration></backup>${left}</measure>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${bars}</part></score-partwise>`;
}

for (const [beats, beatType] of [[3, 4], [6, 8]] as const) {
  const xml = metreScore(beats, beatType);
  const off = realise(base(xml, 3));
  const on = realise(withHarmonic(xml, { bhl: bhl({ startBar: 2, endBar: 4, target: 'va' }) }, 3));
  assert.equal(ingestCanonicalScore(on.musicXml).score?.measures.find((measure) => measure.bar === 1)?.beats, beats);
  assert.notEqual(on.musicXml, off.musicXml, `${beats}/${beatType} bhl`);
  const line = on.fidelity.harmonicDevelopment?.notes ?? [];
  assert.ok(line.length >= 3, `${beats}/${beatType} line`);
  const tension = line[1]!;
  const resolution = line[2]!;
  assert.ok(resolution.onset >= tension.onset + tension.duration - 1e-6, `${beats}/${beatType} resolution after tension`);
}

writeFileSync(path.join(OUT, 'COMPARISON.md'), `# Phase 2 A/B\n\nA is Phase 1 developing, seed 11, controls off.\nB uses the same source, mode, and seed with one control on.\n\n${comparisons.join('\n\n')}\n`);

console.log('piano chamber phase 2 tests passed');
