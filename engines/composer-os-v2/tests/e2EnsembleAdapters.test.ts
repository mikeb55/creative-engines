/**
 * E2 D — ensemble adapters, nine combinations, export parity.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/e2EnsembleAdapters.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { elementChildren } from '../core/performance-composer/pcScore';
import { writeScoreModelMidiFile } from '../core/export/midiScoreWriter';
import { gripMatches, type GuitarGripWitness } from '../core/ecm/e2EcmDuoAdapter';
import {
  ALTO_SAX_TRANSPOSITION,
  BARITONE_SAX_TRANSPOSITION,
  DOUBLE_BASS_TRANSPOSITION,
  TENOR_SAX_TRANSPOSITION,
  TRUMPET_BB_TRANSPOSITION,
} from '../core/instruments/instrumentCatalogue';
import { soundingSpellingToWritten } from '../core/instruments/writtenPitch';
import { midiOfPitch } from '../core/performance-composer/pcChord';
import { E2_NINE } from '../core/orchestrate/e2NineFixtures';
import { performE2, projectSourceLocks } from '../core/orchestrate/e2Perform';
import { buildE2Score, defaultMetres, partsFromRoster, quarterLength, totalQuarters } from '../core/orchestrate/e2Placement';
import { e2Roster, resolveCatalogueInstrument } from '../core/orchestrate/ensembleTemplates';
import { quartetMonophonicRefusal } from '../core/string-quartet/e2QuartetAdapter';
import { captureSource } from '../core/orchestrate/sourceFoundation';
import { q, qAdd, integralTicks } from '../core/piano/pianoExactTiming';
import type { E2RealisedPlacement } from '../core/orchestrate/harmonicRealisation';
import type { SpelledRegister } from '../core/orchestrate/harmonicColourTypes';
import { CONCERT_TRANSPOSITION } from '../core/instruments/instrumentTypes';

const rows: { name: string; ok: boolean }[] = [];
function check(name: string, fn: () => void): void {
  try {
    fn();
    rows.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    rows.push({ name, ok: false });
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

const outDir = path.join(os.tmpdir(), 'e2-cd-evidence');
fs.mkdirSync(outDir, { recursive: true });

function spelled(step: string, alter: number, octave: number): SpelledRegister {
  return { step, alter, octave, midi: midiOfPitch(step, alter, octave) };
}

function xmlNotes(xml: string): Array<{ part: string; step: string; alter: number; octave: number; dur: number; chord: boolean; tie: string }> {
  const doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document;
  const notes: Array<{ part: string; step: string; alter: number; octave: number; dur: number; chord: boolean; tie: string }> = [];
  for (const part of elementChildren(doc.documentElement, 'part')) {
    const partId = part.getAttribute('id') ?? '';
    for (const measure of elementChildren(part, 'measure')) {
      for (const note of elementChildren(measure, 'note')) {
        if (elementChildren(note, 'rest').length) continue;
        const pitch = elementChildren(note, 'pitch')[0];
        if (!pitch) continue;
        notes.push({
          part: partId,
          step: elementChildren(pitch, 'step')[0]?.textContent ?? '',
          alter: Number(elementChildren(pitch, 'alter')[0]?.textContent ?? 0),
          octave: Number(elementChildren(pitch, 'octave')[0]?.textContent ?? 0),
          dur: Number(elementChildren(note, 'duration')[0]?.textContent ?? 0),
          chord: elementChildren(note, 'chord').length > 0,
          tie: elementChildren(note, 'tie').map((tie) => tie.getAttribute('type') ?? '').join('+'),
        });
      }
    }
  }
  return notes;
}

function decodeMidi(file: string): { ppq: number; notes: Array<{ tick: number; dur: number; pitch: number; channel: number }>; programs: Array<{ channel: number; program: number }> } {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('ascii', 0, 4), 'MThd');
  const ppq = buf.readUInt16BE(12);
  const trackCount = buf.readUInt16BE(10);
  let offset = 14;
  const notes: Array<{ tick: number; dur: number; pitch: number; channel: number }> = [];
  const programs: Array<{ channel: number; program: number }> = [];
  const sounding = new Map<string, { tick: number; pitch: number; channel: number }>();
  for (let track = 0; track < trackCount; track += 1) {
    assert.equal(buf.toString('ascii', offset, offset + 4), 'MTrk');
    const size = buf.readUInt32BE(offset + 4);
    const end = offset + 8 + size;
    offset += 8;
    let tick = 0;
    let status = 0;
    while (offset < end) {
      let value = 0;
      let byte = 0;
      do {
        byte = buf[offset++] ?? 0;
        value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tick += value;
      byte = buf[offset] ?? 0;
      if (byte >= 0x80) {
        status = byte;
        offset += 1;
      }
      if (status >= 0x90 && status < 0xa0) {
        const pitch = buf[offset++] ?? 0;
        const velocity = buf[offset++] ?? 0;
        const channel = (status & 0x0f) + 1;
        const key = `${channel}:${pitch}`;
        if (velocity > 0) sounding.set(key, { tick, pitch, channel });
        else {
          const start = sounding.get(key);
          if (start) notes.push({ tick: start.tick, dur: tick - start.tick, pitch, channel });
          sounding.delete(key);
        }
      } else if (status >= 0x80 && status < 0x90) {
        const pitch = buf[offset++] ?? 0;
        offset += 1;
        const channel = (status & 0x0f) + 1;
        const start = sounding.get(`${channel}:${pitch}`);
        if (start) notes.push({ tick: start.tick, dur: tick - start.tick, pitch, channel });
        sounding.delete(`${channel}:${pitch}`);
      } else if (status >= 0xc0 && status < 0xd0) {
        programs.push({ channel: (status & 0x0f) + 1, program: buf[offset++] ?? 0 });
      } else if (status === 0xff) {
        offset += 1;
        let length = 0;
        do {
          byte = buf[offset++] ?? 0;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        offset += length;
      } else if (status >= 0xb0 && status < 0xc0) offset += 2;
      else if (status >= 0xe0 && status < 0xf0) offset += 2;
      else offset += 1;
    }
    offset = end;
  }
  return { ppq, notes, programs };
}

const EXPECTED: Record<string, Array<{ part: string; midi: number }>> = {
  'E2 Polychord Big Band': [
    { part: 'tbn3', midi: 48 },
    { part: 'tbn2', midi: 52 },
    { part: 'tbn1', midi: 55 },
    { part: 'tp3', midi: 74 },
    { part: 'tp2', midi: 78 },
    { part: 'tp1', midi: 81 },
  ],
  'E2 Polychord String Quartet': [
    { part: 'vc', midi: 43 },
    { part: 'vc', midi: 50 },
    { part: 'va', midi: 60 },
    { part: 'vn2', midi: 69 },
    { part: 'vn2', midi: 76 },
    { part: 'vn1', midi: 78 },
  ],
  'E2 Polychord ECM Duo': [
    { part: 'guitar', midi: 52 },
    { part: 'guitar', midi: 55 },
    { part: 'guitar', midi: 60 },
    { part: 'bass', midi: 45 },
  ],
  'E2 Triad Pair Big Band': [
    { part: 'as1', midi: 72 },
    { part: 'as1', midi: 76 },
    { part: 'as1', midi: 79 },
    { part: 'ts1', midi: 62 },
    { part: 'ts1', midi: 66 },
    { part: 'ts1', midi: 69 },
  ],
  'E2 Triad Pair String Quartet': [
    { part: 'vn1', midi: 72 },
    { part: 'vn1', midi: 76 },
    { part: 'vn1', midi: 79 },
    { part: 'va', midi: 62 },
    { part: 'va', midi: 66 },
    { part: 'va', midi: 69 },
  ],
  'E2 Triad Pair ECM Duo': [
    { part: 'guitar', midi: 60 },
    { part: 'guitar', midi: 64 },
    { part: 'guitar', midi: 67 },
    { part: 'guitar', midi: 62 },
    { part: 'guitar', midi: 66 },
    { part: 'guitar', midi: 69 },
    { part: 'bass', midi: 45 },
  ],
  'E2 Dyad Pair Big Band': [
    { part: 'ts1', midi: 60 },
    { part: 'ts2', midi: 65 },
    { part: 'tp1', midi: 74 },
    { part: 'tp2', midi: 79 },
  ],
  'E2 Dyad Pair String Quartet': [
    { part: 'va', midi: 60 },
    { part: 'vn2', midi: 67 },
    { part: 'vc', midi: 62 },
    { part: 'vn1', midi: 65 },
    { part: 'vc', midi: 61 },
    { part: 'vn1', midi: 66 },
  ],
  'E2 Dyad Pair ECM Duo': [
    { part: 'guitar', midi: 60 },
    { part: 'guitar', midi: 65 },
    { part: 'guitar', midi: 59 },
    { part: 'guitar', midi: 66 },
    { part: 'bass', midi: 45 },
  ],
};

check('D1 nine combinations sound the hand-authored anchors', () => {
  for (const build of E2_NINE) {
    const request = build();
    const result = performE2(request);
    assert.equal(result.ok, true, result.ok ? '' : result.reason);
    if (!result.ok) return;
    const expected = EXPECTED[request.title]!;
    for (const anchor of expected) {
      const placement = result.placements.find((item) => item.attack.pitch.midi === anchor.midi);
      assert.ok(placement, `${request.title} missing sounding ${anchor.midi}`);
      const writtenPitch = result.built.writtenByPlacement.get(placement.id);
      assert.ok(writtenPitch);
      const part = result.score.parts.find((item) => item.id === anchor.part);
      assert.ok(part, `${request.title} missing part ${anchor.part}`);
      const present = part.measures.some((measure) => measure.events.some((event) => event.kind === 'note' && (event.pitches ?? [event.pitch]).includes(writtenPitch.midi)));
      assert.equal(present, true, `${request.title} ${anchor.part} lacks written ${writtenPitch.midi}`);
    }
    if (request.ensemble === 'big-band') {
      assert.equal(result.score.parts.length, 16);
      assert.ok(result.score.parts.every((part) => part.id !== 'bb_saxes'));
    }
    if (request.ensemble === 'string-quartet') {
      assert.deepEqual(result.score.parts.map((part) => part.id), ['vn1', 'vn2', 'va', 'vc']);
      assert.equal(result.score.parts.some((part) => part.instrumentIdentity === 'piano'), false);
    }
    if (request.ensemble === 'ecm-duo') assert.deepEqual(result.score.parts.map((part) => part.id), ['guitar', 'bass']);
    const xmlPath = path.join(outDir, `${request.title.replace(/ /g, '-')}.musicxml`);
    const midPath = path.join(outDir, `${request.title.replace(/ /g, '-')}.mid`);
    fs.writeFileSync(xmlPath, result.musicXml);
    assert.equal(writeScoreModelMidiFile(result.score, midPath), true);
    const written = xmlNotes(result.musicXml);
    assert.ok(written.length > 0, `${request.title} XML has no pitched notes`);
    const midi = decodeMidi(midPath);
    assert.equal(midi.ppq, 480);
    assert.ok(midi.notes.length > 0, `${request.title} MIDI has no notes`);
  }
});

check('D2 polychord parents are simultaneous and ECM shares C and E', () => {
  const band = performE2(E2_NINE[0]!());
  const quartet = performE2(E2_NINE[1]!());
  const duo = performE2(E2_NINE[2]!());
  assert.equal(band.ok && quartet.ok && duo.ok, true);
  if (!band.ok || !quartet.ok || !duo.ok) return;
  const bandAnchor = band.placements.filter((placement) => placement.attack.onset.n === 0 && placement.attack.duration.n === 2);
  assert.equal(new Set(bandAnchor.map((placement) => placement.attack.pitch.midi)).size, 6);
  const quartetNotes = xmlNotes(quartet.musicXml).filter((note) => note.dur === 960);
  assert.equal(quartetNotes.some((note) => note.part === 'vc' && note.chord), true);
  assert.equal(quartetNotes.some((note) => note.part === 'vn2' && note.chord), true);
  const shared = duo.placements.filter((placement) => placement.attack.members.length === 2);
  assert.deepEqual(shared.map((placement) => placement.attack.pitch.midi).sort(), [52, 60]);
});

check('D3 infeasible allocations refuse', () => {
  assert.equal(quartetMonophonicRefusal(6).ok, false);
  const six = performE2({
    ...E2_NINE[2]!(),
    title: 'too many',
    partFor: () => 'guitar',
    fullAnchors: [],
    schedule: E2_NINE[2]!().schedule.map((slot) => ({ ...slot, logicalVoiceId: 'guitar' })),
  });
  assert.equal(six.ok, false);
  const badGrip: GuitarGripWitness = {
    id: 'same-string',
    slotIds: ['low-c', 'high-f'],
    assignments: [
      { stringNumber: 3, fret: 5, midi: 60 },
      { stringNumber: 3, fret: 10, midi: 65 },
    ],
  };
  assert.equal(gripMatches(badGrip, [60, 65]), false);
  const wide: GuitarGripWitness = {
    id: 'wide',
    slotIds: ['x'],
    assignments: [
      { stringNumber: 6, fret: 1, midi: 41 },
      { stringNumber: 1, fret: 8, midi: 72 },
    ],
  };
  assert.equal(gripMatches(wide, [41, 72]), false);
  const held = performE2({
    ...E2_NINE[8]!(),
    schedule: E2_NINE[8]!().schedule.map((slot) => slot.onset.n === 3 ? { ...slot, onset: q(1, 2) } : slot),
  });
  assert.equal(held.ok, false);
});

check('D4 written XML and sounding MIDI match the transposition table', () => {
  const cases = [
    { id: 'trumpet_bb', name: 'Trumpet', transposition: TRUMPET_BB_TRANSPOSITION, sounding: spelled('C', 0, 5), writtenStep: 'D', writtenOctave: 5, writtenAlter: 0 },
    { id: 'alto_sax', name: 'Alto', transposition: ALTO_SAX_TRANSPOSITION, sounding: spelled('E', -1, 4), writtenStep: 'C', writtenOctave: 5, writtenAlter: 0 },
    { id: 'tenor_sax', name: 'Tenor', transposition: TENOR_SAX_TRANSPOSITION, sounding: spelled('B', -1, 3), writtenStep: 'C', writtenOctave: 5, writtenAlter: 0 },
    { id: 'baritone_sax', name: 'Bari', transposition: BARITONE_SAX_TRANSPOSITION, sounding: spelled('E', -1, 3), writtenStep: 'C', writtenOctave: 5, writtenAlter: 0 },
    { id: 'double_bass', name: 'Bass', transposition: DOUBLE_BASS_TRANSPOSITION, sounding: spelled('A', 0, 2), writtenStep: 'A', writtenOctave: 3, writtenAlter: 0 },
  ];
  for (const item of cases) {
    const written = soundingSpellingToWritten(item.sounding, item.transposition);
    assert.equal(written.step, item.writtenStep);
    assert.equal(written.octave, item.writtenOctave);
    assert.equal(written.alter, item.writtenAlter);
    const placement: E2RealisedPlacement = {
      id: item.id,
      attack: { eventId: item.id, onset: q(0), duration: q(1), pitch: item.sounding, members: [], rest: false },
      lineage: { eventId: item.id, origin: 'generated', sourceEventIds: [], parentEventIds: [] },
      regionId: 't',
      slotId: 't',
      logicalVoiceId: 'p',
      occurrence: 1,
      sourceNotationEventIds: [],
    };
    const roster = partsFromRoster([{ partId: 'p', instrumentId: item.id, name: item.name }], resolveCatalogueInstrument);
    const built = buildE2Score({
      title: item.name,
      tempo: 96,
      bars: 1,
      metres: defaultMetres(1),
      parts: roster,
      placements: [placement],
      rests: [],
      assignments: [{ placementId: item.id, partId: 'p', voice: 1 }],
    });
    const file = path.join(outDir, `${item.id}.mid`);
    assert.equal(writeScoreModelMidiFile(built.score, file), true);
    const midi = decodeMidi(file);
    assert.equal(midi.notes.some((note) => note.pitch === item.sounding.midi), true);
    assert.equal(midi.notes.some((note) => note.pitch === written.midi && written.midi !== item.sounding.midi), false);
  }
});

check('D5 exact ticks, mixed-metre cycle and tie release', () => {
  assert.equal(integralTicks(q(1, 3), 480), 160);
  assert.equal(integralTicks(q(1, 5), 480), 96);
  const cycle = [4, 4, 3, 4, 5, 4, 6, 8, 7, 8, 9, 16];
  let sum = q(0);
  const metres = {};
  for (let copy = 0; copy < 4; copy += 1) {
    for (let index = 0; index < cycle.length; index += 2) {
      const bar = copy * 6 + index / 2 + 1;
      metres[bar] = { numerator: cycle[index]!, denominator: cycle[index + 1]! };
      sum = qAdd(sum, quarterLength(cycle[index]!, cycle[index + 1]!));
    }
  }
  assert.equal(sum.n, 83);
  assert.equal(sum.d, 1);
  assert.equal(totalQuarters(metres, 24).n, 83);
  assert.equal(83 * 480, 39840);
  assert.equal(83 * 60 / 48, 103.75);
  const trumpet = partsFromRoster([{ partId: 'tp', instrumentId: 'trumpet_bb', name: 'Trumpet' }], resolveCatalogueInstrument)[0]!;
  const note = (id: string, onset: ReturnType<typeof q>, duration: ReturnType<typeof q>, pitch: SpelledRegister, voice: number): E2RealisedPlacement => ({
    id,
    attack: { eventId: id, onset, duration, pitch, members: [], rest: false },
    lineage: { eventId: id, origin: 'generated', sourceEventIds: [], parentEventIds: [] },
    regionId: 'stress',
    slotId: id,
    logicalVoiceId: 'tp',
    occurrence: 1,
    sourceNotationEventIds: [],
  });
  const c5 = spelled('C', 0, 5);
  const built = buildE2Score({
    title: 'E2 stress',
    tempo: 48,
    bars: 24,
    metres,
    parts: [trumpet],
    placements: [
      note('tri-a', q(0), q(1, 3), c5, 1),
      note('tri-b', q(1, 3), q(1, 3), spelled('D', 0, 5), 1),
      note('tri-c', q(2, 3), q(1, 3), spelled('E', 0, 5), 1),
      note('quin-a', q(1), q(1, 5), c5, 2),
      note('quin-b', q(6, 5), q(1, 5), spelled('D', 0, 5), 2),
      note('quin-c', q(7, 5), q(1, 5), spelled('E', 0, 5), 2),
      note('quin-d', q(8, 5), q(1, 5), spelled('F', 0, 5), 2),
      note('quin-e', q(9, 5), q(1, 5), spelled('G', 0, 5), 2),
      note('tie-a', q(3), q(1), c5, 1),
      note('tie-b', q(4), q(1), c5, 1),
      note('untied', q(3), q(1), spelled('D', 0, 5), 2),
    ],
    rests: [],
    assignments: [
      { placementId: 'tri-a', partId: 'tp', voice: 1 },
      { placementId: 'tri-b', partId: 'tp', voice: 1 },
      { placementId: 'tri-c', partId: 'tp', voice: 1 },
      { placementId: 'quin-a', partId: 'tp', voice: 2 },
      { placementId: 'quin-b', partId: 'tp', voice: 2 },
      { placementId: 'quin-c', partId: 'tp', voice: 2 },
      { placementId: 'quin-d', partId: 'tp', voice: 2 },
      { placementId: 'quin-e', partId: 'tp', voice: 2 },
      { placementId: 'tie-a', partId: 'tp', voice: 1 },
      { placementId: 'tie-b', partId: 'tp', voice: 1 },
      { placementId: 'untied', partId: 'tp', voice: 2 },
    ],
  });
  const start = built.score.parts[0]!.measures[0]!.events.find((event) => event.kind === 'note' && event.pianoExact?.logicalEventId === 'tie-a');
  const stop = built.score.parts[0]!.measures[1]!.events.find((event) => event.kind === 'note' && event.pianoExact?.logicalEventId === 'tie-b');
  assert.ok(start && start.kind === 'note' && stop && stop.kind === 'note');
  start.notation = { tie: 'start' };
  stop.notation = { tie: 'stop' };
  const xml = path.join(outDir, 'stress.musicxml');
  const mid = path.join(outDir, 'stress.mid');
  fs.writeFileSync(xml, performXml(built.score));
  assert.equal(writeScoreModelMidiFile(built.score, mid), true);
  const midi = decodeMidi(mid);
  const tied = midi.notes.filter((note) => note.pitch === 72 && note.dur === 960);
  assert.equal(tied.length, 1);
  assert.equal(midi.notes.some((note) => note.dur === 160), true);
  assert.equal(midi.notes.some((note) => note.dur === 96), true);
});

function performXml(score: Parameters<typeof writeScoreModelMidiFile>[0]): string {
  const { exportScoreModelToMusicXml } = require('../core/export/musicxmlExporter') as typeof import('../core/export/musicxmlExporter');
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join('; '));
  return exported.xml;
}

check('D6 locked source pitch survives allocation and a mutated export fails projection', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Bass</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>A</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><rest/><duration>2</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;
  const source = captureSource(xml, 'bass.musicxml');
  const note = source.records.find((record) => !record.canonical.rest)!;
  const request = E2_NINE[8]!();
  request.source = source;
  request.sourceXml = xml;
  request.lockPolicy = {
    selectedSourceEventIds: [note.canonical.id],
    spans: [],
    preserve: { pitch: true, spelling: true, rhythm: true, silence: true, harmony: false, form: false, tempo: false },
    harmonyMeaning: 'declared-intent',
  };
  request.sourceNotes = [{ partId: 'bass', pitch: spelled('A', 0, 2), onset: q(0), duration: q(2), sourceId: note.canonical.id }];
  const result = performE2(request);
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
  if (!result.ok) return;
  const projected = projectSourceLocks(source, request.lockPolicy, result.built, result.placements);
  assert.equal(projected.ok, true, projected.detail);
  const locked = result.placements.find((placement) => placement.sourceNotationEventIds.includes(note.canonical.id));
  assert.ok(locked);
  let mutated = false;
  for (const part of result.score.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind === 'note' && event.pianoExact?.logicalEventId === locked.id) {
          event.pitch = 59;
          event.spelling = { step: 'B', alter: 0 };
          mutated = true;
        }
      }
    }
  }
  assert.equal(mutated, true);
  const failed = projectSourceLocks(source, request.lockPolicy, result.built, result.placements);
  assert.equal(failed.ok, false, failed.detail);
});

check('D7 E2 dispatch stays off the legacy path unless requested', () => {
  const { orchestrate } = require('../core/orchestrate/orchestrate') as typeof import('../core/orchestrate/orchestrate');
  const off = orchestrate({
    enabled: false,
    sourceMusicXml: '',
    template: 'string_quartet',
    plan: [],
    seed: 1,
    preserveMelody: true,
  });
  assert.equal(off.ok, false);
  const on = orchestrate({
    enabled: true,
    sourceMusicXml: '',
    template: 'string_quartet',
    plan: [{
      section: 'e2', startBar: 1, endBar: 1, density: 'sparse', registerCentre: 60,
      melodyCarriers: [], doubling: 'none', maxDoublingBars: 0, harmonySource: 'source',
    }],
    seed: 1,
    preserveMelody: true,
    e2: E2_NINE[1]!(),
  });
  assert.equal(on.ok, true);
  if (!on.ok) return;
  assert.equal(on.score.parts.length, 4);
  assert.equal(on.receipt.musicallyApproved, false);
  assert.equal(on.receipt.musicalQualityScore, null);
});

void CONCERT_TRANSPOSITION;

export function runE2EnsembleAdapterTests(): { name: string; ok: boolean }[] {
  return rows;
}

if (rows.some((row) => !row.ok)) process.exitCode = 1;
