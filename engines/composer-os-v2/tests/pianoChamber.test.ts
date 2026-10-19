/**
 * V3.5 Phase 1 piano-to-chamber.
 * The three scores are hand-authored. They are not Solo Piano V1.1 output.
 */

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { apiOrchestrate } from '../app-api/orchestrateApp';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import { parseMidiReference } from '../core/reference-import/midiReferenceParser';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { OrchestrateRequest } from '../core/orchestrate/types';

const OUT = path.resolve(__dirname, '../../../docs/v3.5-phase1');

function pitch(step: string, octave: number, alter = 0): string {
  const accidental = alter === 0 ? '' : `<alter>${alter}</alter>`;
  return `<pitch><step>${step}</step>${accidental}<octave>${octave}</octave></pitch>`;
}

function note(args: {
  step?: string;
  octave?: number;
  alter?: number;
  duration: number;
  type: string;
  staff: 1 | 2;
  voice?: number;
  chord?: boolean;
  rest?: boolean;
  dot?: boolean;
  tie?: 'start' | 'stop';
  tuplet?: 'start' | 'stop';
  actual?: number;
  normal?: number;
}): string {
  const voice = args.voice ?? 1;
  const head = args.rest
    ? '<rest/>'
    : `${args.chord ? '<chord/>' : ''}${pitch(args.step ?? 'C', args.octave ?? 4, args.alter ?? 0)}`;
  const tie = args.tie ? `<tie type="${args.tie}"/>` : '';
  const notationTie = args.tie ? `<notations><tied type="${args.tie}"/></notations>` : '';
  const time = args.tuplet || args.actual
    ? `<time-modification><actual-notes>${args.actual ?? 3}</actual-notes><normal-notes>${args.normal ?? 2}</normal-notes></time-modification>`
    : '';
  const tuplet = args.tuplet ? `<notations><tuplet type="${args.tuplet}"/></notations>` : '';
  return `<note>${head}<duration>${args.duration}</duration>${tie}<voice>${voice}</voice><type>${args.type}</type>${args.dot ? '<dot/>' : ''}${time}<staff>${args.staff}</staff>${notationTie}${tuplet}</note>`;
}

function pianoScore(title: string, bars: string[], beats = 4, beatType = 4): string {
  const attributes = `<attributes><divisions>480</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
  const tempo = `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>`;
  const measures = bars.map((body, index) => `<measure number="${index + 1}">${index === 0 ? attributes + tempo : ''}${body}</measure>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <identification><encoding><software>hand-authored phase 1 fixture</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">${measures}</part>
</score-partwise>`;
}

function q(step: string, octave: number, staff: 1 | 2 = 1, alter = 0): string {
  return note({ step, octave, alter, duration: 480, type: 'quarter', staff });
}

function h(step: string, octave: number, staff: 1 | 2 = 1): string {
  return note({ step, octave, duration: 960, type: 'half', staff });
}

function w(step: string, octave: number, staff: 1 | 2 = 1): string {
  return note({ step, octave, duration: 1920, type: 'whole', staff });
}

function rest(staff: 1 | 2, duration = 1920, type = 'whole'): string {
  return note({ rest: true, duration, type, staff });
}

function backup(duration = 1920): string {
  return `<backup><duration>${duration}</duration></backup>`;
}

function lyricalBar(melody: Array<[string, number]>, bass: [string, number], harmony?: [string, number], breathe = false): string {
  const tones = breathe ? melody.slice(0, 3) : melody;
  const right = tones.map(([step, octave]) => q(step, octave, 1)).join('') + (breathe ? rest(1, 480, 'quarter') : '');
  const left = w(bass[0], bass[1], 2);
  const inner = harmony
    ? note({ step: harmony[0], octave: harmony[1], duration: 1920, type: 'whole', staff: 1, voice: 2 })
    : '';
  const voiceBackup = harmony ? `${backup()}${inner}` : '';
  return `${right}${voiceBackup}${backup()}${left}`;
}

function lyrical(): string {
  const a: Array<Array<[string, number]>> = [
    [['C', 5], ['D', 5], ['E', 5], ['G', 5]],
    [['A', 5], ['G', 5], ['E', 5], ['D', 5]],
    [['C', 5], ['E', 5], ['G', 5], ['E', 5]],
    [['D', 5], ['C', 5], ['D', 5], ['E', 5]],
  ];
  const b: Array<Array<[string, number]>> = [
    [['E', 5], ['F', 5], ['G', 5], ['A', 5]],
    [['G', 5], ['E', 5], ['D', 5], ['C', 5]],
    [['A', 4], ['C', 5], ['E', 5], ['D', 5]],
    [['C', 5], ['B', 4], ['C', 5], ['D', 5]],
  ];
  const bassA: Array<[string, number]> = [['C', 3], ['F', 3], ['G', 3], ['C', 3]];
  const bassB: Array<[string, number]> = [['A', 2], ['F', 3], ['D', 3], ['G', 3]];
  const harmA: Array<[string, number]> = [['E', 4], ['A', 4], ['B', 4], ['G', 4]];
  const harmB: Array<[string, number]> = [['C', 4], ['C', 4], ['F', 4], ['B', 3]];
  const bars: string[] = [];
  for (let copy = 0; copy < 2; copy += 1) {
    a.forEach((melody, index) => bars.push(lyricalBar(melody, bassA[index]!, harmA[index], index === 3)));
    b.forEach((melody, index) => bars.push(lyricalBar(melody, bassB[index]!, harmB[index], index === 3)));
  }
  a.forEach((melody, index) => bars.push(lyricalBar(melody, bassA[index]!, harmA[index], index === 3)));
  b.forEach((melody, index) => bars.push(lyricalBar(melody, bassB[index]!, harmB[index], index === 3)));
  assert.equal(bars.length, 24);
  return pianoScore('Lyrical theme with return', bars);
}

function contrapunt(): string {
  const bars: string[] = [];
  const upper = [['E', 5], ['D', 5], ['C', 5], ['D', 5]] as Array<[string, number]>;
  const lower = [['C', 4], ['E', 4], ['G', 4], ['E', 4], ['F', 4], ['D', 4], ['B', 3], ['C', 4]] as Array<[string, number]>;
  for (let bar = 1; bar <= 24; bar += 1) {
    if (bar % 4 === 0) {
      bars.push(`${rest(1)}${backup()}${rest(2)}`);
      continue;
    }
    const moving = [0, 1, 2, 3].map((beat) => q(lower[(bar + beat) % lower.length]![0], lower[(bar + beat) % lower.length]![1], 2)).join('');
    const shaped = bar >= 9 && bar <= 11
      ? [['G', 5], ['A', 5], ['G', 5], ['F', 5]] as Array<[string, number]>
      : upper;
    bars.push(`${shaped.map(([step, octave]) => q(step, octave, 1)).join('')}${backup()}${moving}`);
  }
  return pianoScore('Contrapuntal silence', bars);
}

function rhythmic(): string {
  const cell: Array<[string, number, number]> = [['C', 4, 1], ['D', 4, -1], ['F', 4, 0], ['G', 4, 0]];
  const bars: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    const eighths = Array.from({ length: 8 }, (_, index) => {
      const alt: Array<[string, number, number]> = [['G', 4, 0], ['C', 5, 0], ['A', 4, -1], ['F', 4, 0]];
      const tone = bar >= 9 && bar <= 16 ? alt[(bar + index) % alt.length]! : cell[(bar + index) % cell.length]!;
      return note({ step: tone[0], octave: tone[1] + (index % 2), alter: tone[2], duration: 240, type: 'eighth', staff: 1 });
    }).join('');
    const tied = bar === 8
      ? note({ step: 'C', octave: 3, duration: 1920, type: 'whole', staff: 2, tie: 'start' })
      : bar === 9
        ? note({ step: 'C', octave: 3, duration: 1920, type: 'whole', staff: 2, tie: 'stop' })
        : w(bar % 5 === 0 ? 'A' : 'D', 2, 2);
    bars.push(`${eighths}${backup()}${tied}`);
  }
  return pianoScore('Rhythmic ambiguous', bars);
}

function metrePiece(beats: number, beatType: number, barQuarters: number): string {
  const ticks = 480 * barQuarters;
  const bars = Array.from({ length: 24 }, () => {
    const right = note({ step: 'E', octave: 5, duration: ticks, type: beats === 6 ? 'quarter' : 'whole', staff: 1, dot: beats === 6 });
    const left = note({ step: 'C', octave: 3, duration: ticks, type: beats === 6 ? 'quarter' : 'whole', staff: 2, dot: beats === 6 });
    return `${right}${backup(ticks)}${left}`;
  });
  return pianoScore(beats === 6 ? 'Six eight' : 'Three four', bars, beats, beatType);
}

function request(xml: string, mode: 'faithful' | 'developing', seed = 11): OrchestrateRequest {
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

function realise(xml: string, mode: 'faithful' | 'developing', seed = 11) {
  const result = orchestrate(request(xml, mode, seed));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.midiBase64) {
    throw new Error('expected a chamber score');
  }
  return result;
}

function assertScore(xml: string, label: string): void {
  const developing = realise(xml, 'developing', 11);
  const again = realise(xml, 'developing', 11);
  assert.equal(developing.musicXml, again.musicXml, `${label} seed drift`);
  const otherSeed = realise(xml, 'developing', 12);
  const parsed = ingestCanonicalScore(developing.musicXml);
  assert.ok(parsed.score, parsed.parseError);
  const score = parsed.score!;
  assert.equal(score.parts.length, 10, label);
  const bars = new Set(score.measures.map((measure) => measure.bar));
  assert.equal(bars.size, 24, label);
  for (const part of score.parts) {
    const partBars = score.measures.filter((measure) => measure.partId === part.id);
    assert.equal(partBars.length, 24, `${label} ${part.id}`);
  }
  const missing = developing.fidelity.protectedEventIds.filter((id) => {
    const row = developing.fidelity!.classifications.find((item) => item.eventId === id);
    return !row || row.disposition === 'omitted' || row.disposition === 'transformed';
  });
  assert.deepEqual(missing, [], `${label} protected`);
  assert.ok(developing.fidelity.classifications.every((row) => row.disposition !== 'omitted' || row.reason), label);
  const hard = developing.receipt.flagged.filter((flag) => flag.kind === 'outside_hard_range');
  assert.equal(hard.length, 0, label);
  const midi = parseMidiReference(Uint8Array.from(Buffer.from(developing.midiBase64, 'base64')));
  assert.equal(midi.ok, true, midi.errors.join('; '));
  const xmlPitches = parsed.score!.soundingEvents
    .filter((event) => !event.rest && event.soundingMidi !== null)
    .map((event) => event.soundingMidi as number)
    .sort((a, b) => a - b);
  const midiPitches = (midi.piece?.noteSamples ?? []).map((note) => note.midi).sort((a, b) => a - b);
  assert.deepEqual(midiPitches, xmlPitches, `${label} sounding MIDI`);
  assert.equal(developing.fidelity.musicalQualityScore, null);
  assert.equal(developing.fidelity.musicallyApproved, false);
  if (label === 'rhythmic') assert.match(developing.musicXml, /<tied type="start"\/>/);
  if (label === 'contrapuntal') assert.ok(developing.fidelity.silence.some((row) => row.bar === 4));
  if (label === 'lyrical') {
    assert.ok(developing.fidelity.phrases.some((phrase) => phrase.role === 'return'), 'lyrical return phrase');
    assert.ok(developing.fidelity.derivedAnswers.length > 0, 'lyrical developing answer');
    void otherSeed;
  }
  const dir = path.join(OUT, label);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${label}.musicxml`), developing.musicXml);
  writeFileSync(path.join(dir, `${label}.mid`), Buffer.from(developing.midiBase64, 'base64'));
  writeFileSync(path.join(dir, `${label}-fidelity.json`), JSON.stringify(developing.fidelity, null, 2));
  writeFileSync(path.join(dir, 'source.musicxml'), xml);
}

const lyricalXml = lyrical();
const counterXml = contrapunt();
const rhythmXml = rhythmic();

assertScore(lyricalXml, 'lyrical');
assertScore(counterXml, 'contrapuntal');
assertScore(rhythmXml, 'rhythmic');

const faithful = realise(lyricalXml, 'faithful', 11);
assert.equal(faithful.fidelity.derivedAnswers.length, 0);
assert.ok(faithful.fidelity.classifications.some((row) => row.disposition === 'retained' || row.disposition === 'octave-transferred'));

const proposed = apiOrchestrate({
  enabled: true,
  pianoChamber: { action: 'propose', sourceMusicXml: lyricalXml },
});
assert.equal(proposed.ok, true);
if (proposed.ok && 'proposalOnly' in proposed) {
  assert.equal(proposed.proposal.events.every((event) => event.needsConfirmation), true);
  assert.equal(proposed.proposal.bars, 24);
}

const unreviewed = orchestrate({
  ...request(lyricalXml, 'developing'),
  pianoChamber: { action: 'realise', sourceMusicXml: lyricalXml, correction: { mode: 'developing', reviewConfirmed: false } },
});
assert.equal(unreviewed.ok, false);

const lockedId = faithful.fidelity.protectedEventIds[0]!;
const mutated = orchestrate({
  ...request(lyricalXml, 'faithful'),
  pianoChamber: {
    action: 'realise',
    sourceMusicXml: lyricalXml,
    correction: { mode: 'faithful', reviewConfirmed: true, omitEventIds: [lockedId] },
  },
});
assert.equal(mutated.ok, false);
if (!mutated.ok) assert.match(mutated.error, /Locked source event/);

const short = pianoScore('Short', [lyricalBar([['C', 5], ['D', 5], ['E', 5], ['G', 5]], ['C', 3])]);
const refusedLength = apiOrchestrate({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: short } });
assert.equal(refusedLength.ok, false);
if (!refusedLength.ok) assert.match(refusedLength.error, /24-bar/);

const fiveFour = pianoScore('Five four', Array.from({ length: 24 }, () => `${w('C', 5, 1)}${backup()}${w('C', 3, 2)}`), 5, 4);
const acceptedFive = apiOrchestrate({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: fiveFour } });
assert.equal(acceptedFive.ok, true, acceptedFive.ok ? '' : acceptedFive.error);
if (acceptedFive.ok && 'proposalOnly' in acceptedFive) {
  assert.equal(acceptedFive.proposal.beats, 5);
  assert.equal(acceptedFive.proposal.beatType, 4);
  assert.equal(acceptedFive.proposal.metres.length, 1);
}

const nineSixteen = pianoScore('Nine sixteen', Array.from({ length: 24 }, () => `${w('C', 5, 1)}${backup()}${w('C', 3, 2)}`), 9, 16);
const refusedMetre = apiOrchestrate({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: nineSixteen } });
assert.equal(refusedMetre.ok, false);
if (!refusedMetre.ok) assert.match(refusedMetre.error, /9\/16/);

const quint = pianoScore('Quint', [
  ...Array.from({ length: 23 }, () => lyricalBar([['C', 5], ['D', 5], ['E', 5], ['G', 5]], ['C', 3])),
  `${[0, 1, 2, 3, 4].map((index) => note({
    step: 'C',
    octave: 5,
    duration: 384,
    type: 'eighth',
    staff: 1,
    tuplet: index === 0 ? 'start' : index === 4 ? 'stop' : undefined,
    actual: 5,
    normal: 4,
  })).join('')}${backup()}${w('C', 3, 2)}`,
]);
const refusedTuplet = apiOrchestrate({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: quint } });
assert.equal(refusedTuplet.ok, false);
if (!refusedTuplet.ok) assert.match(refusedTuplet.error, /tuplet|Unsupported/);

const three = realise(metrePiece(3, 4, 3), 'faithful', 3);
assert.equal(ingestCanonicalScore(three.musicXml).score?.measures.find((measure) => measure.bar === 1)?.beats, 3);
const six = realise(metrePiece(6, 8, 3), 'faithful', 5);
assert.equal(ingestCanonicalScore(six.musicXml).score?.measures.find((measure) => measure.bar === 1)?.beats, 6);

const noTempo = lyricalXml.replace(/<sound tempo="72"\/>/, '').replace(/<metronome>[\s\S]*?<\/metronome>/, '<words>andante</words>');
const refusedTempo = orchestrate({
  ...request(noTempo, 'developing'),
  pianoChamber: { action: 'realise', sourceMusicXml: noTempo, correction: { mode: 'developing', reviewConfirmed: true } },
});
assert.equal(refusedTempo.ok, false);
const withChoice = orchestrate({
  ...request(noTempo, 'developing'),
  pianoChamber: { action: 'realise', sourceMusicXml: noTempo, correction: { mode: 'developing', reviewConfirmed: true, tempoBpm: 66 } },
});
assert.equal(withChoice.ok, true);
if (withChoice.ok && 'fidelity' in withChoice && withChoice.fidelity) assert.equal(withChoice.fidelity.tempoBpm, 66);

const off = apiOrchestrate({ enabled: false, pianoChamber: { action: 'propose', sourceMusicXml: lyricalXml } });
assert.equal(off.ok, false);

const reviewed = apiOrchestrate({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: lyricalXml } });
assert.equal(reviewed.ok, true);
if (reviewed.ok && 'proposalOnly' in reviewed) {
  assert.ok(reviewed.proposal.protectedEventIds.length > 0, 'default anchors');
  const confirmedBounds = orchestrate({
    enabled: true,
    seed: 11,
    sourceMusicXml: lyricalXml,
    template: 'chamber_orchestra',
    plan: [],
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: lyricalXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        phrases: reviewed.proposal.phrases.map((phrase) => ({ id: phrase.id, startBar: phrase.startBar, endBar: phrase.endBar })),
        roles: Object.fromEntries(reviewed.proposal.events.map((event) => [event.eventId, event.proposedRole])),
      },
    },
  });
  assert.equal(confirmedBounds.ok, true);
  if (confirmedBounds.ok && 'fidelity' in confirmedBounds && confirmedBounds.fidelity) {
    assert.ok(confirmedBounds.fidelity.phrases.some((phrase) => phrase.role === 'return'), 'confirming proposed bounds keeps the return');
    assert.equal(confirmedBounds.musicXml, realise(lyricalXml, 'developing', 11).musicXml, 'unchanged review matches the unedited realisation');
  }
  const unlocked = reviewed.proposal.protectedEventIds[0]!;
  const dropped = orchestrate({
    enabled: true,
    seed: 11,
    sourceMusicXml: lyricalXml,
    template: 'chamber_orchestra',
    plan: [],
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: lyricalXml,
      correction: { mode: 'faithful', reviewConfirmed: true, unlocks: [unlocked], omitEventIds: [unlocked] },
    },
  });
  assert.equal(dropped.ok, true, dropped.ok ? '' : dropped.error);
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

for (const label of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const xml = label === 'lyrical' ? lyricalXml : label === 'contrapuntal' ? counterXml : rhythmXml;
  const result = realise(xml, 'developing', 11);
  assert.match(result.musicXml, /<part id="va">[\s\S]*?<clef><sign>C<\/sign><line>3<\/line><\/clef>/, `${label} alto clef`);
  assert.equal(result.fidelity.warnings.some((warning) => /treble|no alto/i.test(warning)), false, `${label} false clef warning`);
  assert.match(result.musicXml, /<part id="cl">[\s\S]*?<transpose>[\s\S]*?<chromatic>-2<\/chromatic>/, `${label} clarinet`);
  assert.match(result.musicXml, /<part id="hn">[\s\S]*?<transpose>[\s\S]*?<chromatic>-7<\/chromatic>/, `${label} horn`);
  assert.match(result.musicXml, /<part id="db">[\s\S]*?<octave-change>-1<\/octave-change>/, `${label} bass octave`);
  assertMidiParity(result.musicXml, result.midiBase64, label, result.fidelity.tempoBpm);
}

const rhythm = realise(rhythmXml, 'developing', 11);
const rhythmScore = ingestCanonicalScore(rhythm.musicXml).score!;
const lowC = rhythmScore.soundingEvents.filter((event) => event.partId === 'db' && event.soundingMidi === 48 && quarters(event.onset) === 28);
assert.equal(lowC.length, 1, 'one sustained low C');
assert.equal(quarters(lowC[0]!.duration), 8, 'low C lasts bars 8 and 9');
const rhythmMidi = parseMidi(Buffer.from(rhythm.midiBase64, 'base64'));
const bassTrack = rhythmMidi.tracks.find((track) => track.name === 'Double Bass')!;
const bassC = bassTrack.notes.filter((note) => note.midi === 48 && note.startTick === 28 * rhythmMidi.ppq);
assert.equal(bassC.length, 1, 'midi keeps one low C');
assert.equal(bassC[0]!.endTick - bassC[0]!.startTick, 8 * rhythmMidi.ppq, 'midi low C release');

const operatorHits: Record<string, { example: string; seed: number; partId: string; notes: Array<{ sounding: number; onset: number; duration: number }> }> = {};
const operatorRefusals: Array<{ example: string; seed: number; reason: string }> = [];
for (const [example, xml] of [['lyrical', lyricalXml], ['contrapuntal', counterXml], ['rhythmic', rhythmXml]] as const) {
  for (let seed = 11; seed <= 16; seed += 1) {
    const result = realise(xml, 'developing', seed);
    for (const line of result.receipt.derivedLines) {
      const op = line.ops[0] ?? '';
      if (!operatorHits[op]) {
        operatorHits[op] = { example, seed, partId: line.partId, notes: line.events.map((event) => ({ sounding: event.sounding, onset: event.onset, duration: event.duration })) };
      }
    }
    for (const row of result.fidelity.silence) {
      if (/no source-derived answer|shorter than three|protected silence/i.test(row.reason)) {
        operatorRefusals.push({ example, seed, reason: row.reason });
      }
    }
    const again = realise(xml, 'developing', seed);
    assert.equal(again.musicXml, result.musicXml, `${example} seed ${seed}`);
  }
}
assert.ok(operatorHits['displace'], 'displace operated');
assert.ok(operatorHits['fragment-head'], 'fragment-head operated');
assert.ok(operatorHits.augment, 'augment operated');
assert.equal(operatorHits['fragment-head']!.notes.length, 3, 'fragment-head keeps three notes');
assert.ok(operatorHits.augment!.notes.some((note) => note.duration >= 2), 'augment lengthens durations');
assert.ok(operatorHits['displace']!.notes.every((note) => note.duration <= 1), 'displace keeps the source durations');
const displacedOnsets = operatorHits['displace']!.notes.map((note) => note.onset);
assert.ok(displacedOnsets.some((onset) => Math.abs(onset - Math.round(onset)) > 0.2), 'displace moves the attack off the source beat');
for (const [op, hit] of Object.entries(operatorHits)) {
  assert.ok(hit.notes.length >= 2, op);
  const protectedHit = realise(
    hit.example === 'lyrical' ? lyricalXml : hit.example === 'contrapuntal' ? counterXml : rhythmXml,
    'developing',
    hit.seed,
  );
  const missing = protectedHit.fidelity.protectedEventIds.filter((id) => {
    const row = protectedHit.fidelity.classifications.find((item) => item.eventId === id);
    return !row || row.disposition === 'omitted' || row.disposition === 'transformed';
  });
  assert.deepEqual(missing, [], `${op} anchors`);
}
const shortBars = [
  ...Array.from({ length: 7 }, () => lyricalBar([['C', 5], ['D', 5], ['E', 5], ['G', 5]], ['C', 3])),
  lyricalBar([['C', 5], ['D', 5], ['E', 5], ['G', 5]], ['C', 3], undefined, true),
  `${q('E', 5)}${q('F', 5)}${rest(1, 960, 'half')}${backup()}${w('C', 3, 2)}`,
  ...Array.from({ length: 15 }, () => `${rest(1)}${backup()}${w('C', 3, 2)}`),
];
const shortDevelopment = realise(pianoScore('Short development cell', shortBars), 'developing', 11);
const shortRefusal = shortDevelopment.fidelity.omissions.find((row) => /shorter than three/i.test(row.reason));
assert.ok(shortRefusal, 'two-note development cell is refused rather than padded');
assert.equal(shortDevelopment.fidelity.derivedAnswers.length, 0, 'short cell adds no answer');
writeFileSync(path.join(OUT, 'operators.json'), JSON.stringify({
  operatorHits,
  operatorRefusals: operatorRefusals.slice(0, 12),
  shortCellRefusal: shortRefusal,
}, null, 2));

writeFileSync(path.join(OUT, 'LISTENING.md'), `# Listening questions

Artistic approval is pending. Sine preview is not an orchestral performance.
Playback renders, when produced, sit beside these scores and are not a hearing claim by themselves.

## Lyrical
- Does the theme survive flute/oboe handovers?
- Are the handovers musically motivated or mechanically repetitive?
- Does the violin II answer improve the phrase?
- Is the return recognisable?

## Contrapuntal
- Does the lower line remain perceptible and independent?
- Do the silent bars feel intentional?
- Does the added answer help or obscure the counterpoint?

## Rhythmic
- Does the low C sustain across bars 8–9?
- Does the eighth-note activity remain clear?
- Does the ending sound intentional rather than mechanically cadential?

Technical results are in the fidelity JSON beside each score.
`);

console.log('piano chamber phase 1 tests passed');
console.log('operators', Object.keys(operatorHits));
console.log('lyrical answers', JSON.parse(readFileSync(path.join(OUT, 'lyrical/lyrical-fidelity.json'), 'utf8')).derivedAnswers);
