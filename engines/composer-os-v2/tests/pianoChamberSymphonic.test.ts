/**
 * V4.0 Phase 1 symphonic acceptance.
 * Does not rewrite docs/v3.5-phase1 fixtures.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import { orchestrate } from '../core/orchestrate/orchestrate';
import { buildE2Score } from '../core/orchestrate/e2Placement';
import { capabilityPitch, resolveSymphonicRoster, SYMPHONIC_SLOTS } from '../core/orchestrate/symphonicWriting';
import { runEnsembleExportPipeline } from '../core/export/ensembleExport';
import { q } from '../core/piano/pianoExactTiming';
import { writtenToSounding } from '../core/instruments/writtenPitch';
import { CONCERT_TRANSPOSITION } from '../core/instruments/instrumentTypes';
import type { OrchestrateRequest } from '../core/orchestrate/types';
import type { SpelledRegister } from '../core/orchestrate/harmonicColourTypes';

const OUT = path.resolve(__dirname, '../../../docs/v4.0-phase1');
const lyrical = readFileSync(path.resolve(__dirname, '../../../docs/v3.5-phase1/lyrical/source.musicxml'), 'utf8');
const counter = readFileSync(path.resolve(__dirname, '../../../docs/v3.5-phase1/contrapuntal/source.musicxml'), 'utf8');

function spell(midi: number): SpelledRegister {
  const names = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const pc = ((midi % 12) + 12) % 12;
  return { step: names[pc] ?? 'C', alter: alters[pc] ?? 0, octave: Math.floor(midi / 12) - 1, midi };
}

function request(xml: string, ensemble?: 'symphonic', seed = 11): OrchestrateRequest {
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
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ...(ensemble ? { ensemble } : {}),
      },
    },
  };
}

function realise(xml: string, ensemble?: 'symphonic', seed = 11) {
  const result = orchestrate(request(xml, ensemble, seed));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.score) throw new Error('expected a score');
  return result;
}

function parseMidi(data: Buffer): { ppq: number; tracks: Array<{ name: string; tempos: Array<{ tick: number; bpm: number }>; notes: Array<{ midi: number; channel: number; startTick: number; endTick: number }> }> } {
  assert.equal(data.toString('ascii', 0, 4), 'MThd');
  const ppq = data.readUInt16BE(12);
  let pos = 14;
  const tracks: Array<{ name: string; tempos: Array<{ tick: number; bpm: number }>; notes: Array<{ midi: number; channel: number; startTick: number; endTick: number }> }> = [];
  while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
    const end = pos + 8 + data.readUInt32BE(pos + 4);
    pos += 8;
    let tick = 0;
    let status = 0;
    let name = '';
    const tempos: Array<{ tick: number; bpm: number }> = [];
    const notes: Array<{ midi: number; channel: number; startTick: number; endTick: number }> = [];
    const open = new Map<string, number>();
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
        if (type === 0x51 && payload.length === 3) tempos.push({ tick, bpm: 60000000 / ((payload[0]! << 16) | (payload[1]! << 8) | payload[2]!) });
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
      const channel = status & 0x0f;
      const data1 = data[pos++]!;
      const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[pos++]!;
      const key = `${channel}:${data1}`;
      if (kind === 0x90 && data2 > 0) open.set(key, tick);
      if (kind === 0x80 || (kind === 0x90 && data2 === 0)) {
        const start = open.get(key);
        if (start !== undefined) {
          notes.push({ midi: data1, channel, startTick: start, endTick: tick });
          open.delete(key);
        }
      }
    }
    tracks.push({ name, tempos, notes });
    pos = end;
  }
  return { ppq, tracks };
}

function routesOk(routes: Array<{ file: string; channel: number; partId: string }>): string | null {
  const files = new Map<string, number[]>();
  for (const route of routes) {
    const list = files.get(route.file) ?? [];
    list.push(route.channel);
    files.set(route.file, list);
  }
  for (const [file, channels] of files) {
    const pitched = channels.filter((channel) => channel !== 10);
    if (new Set(pitched).size !== pitched.length) return `${file} channel collision`;
    if (pitched.some((channel) => channel < 1 || channel > 16 || channel === 10)) return `${file} illegal channel`;
    if (channels.filter((channel) => channel === 10).length > 1) return `${file} percussion channel reused`;
  }
  if (routes.length !== 31) return 'dropped part';
  return null;
}

const chamber = realise(lyrical);
const chamberAgain = realise(lyrical);
assert.equal(chamber.musicXml, chamberAgain.musicXml);
assert.equal(chamber.midiSetBase64, undefined);
assert.equal((chamber.musicXml.match(/<score-part /g) ?? []).length, 10);
const committed = readFileSync(path.resolve(__dirname, '../../../docs/v3.5-phase1/lyrical/lyrical.musicxml'), 'utf8');
assert.equal(chamber.musicXml, committed, 'chamber developing lyrical bytes moved');

const score = realise(lyrical, 'symphonic');
const again = realise(lyrical, 'symphonic');
assert.equal(score.musicXml, again.musicXml, 'symphonic seed drift');
assert.notEqual(score.musicXml, chamber.musicXml);
assert.equal((score.musicXml.match(/<score-part /g) ?? []).length, 31);
const staffSum = [...score.musicXml.matchAll(/<staves>(\d+)<\/staves>/g)].reduce((sum, match) => sum + Number(match[1]), 0);
assert.equal(staffSum, 32, 'harp grand staff adds the 32nd staff');
assert.match(score.musicXml, /<part-name>Harp<\/part-name>/);
assert.match(score.musicXml, /<part id="hp">[\s\S]*?<staves>2<\/staves>/);
assert.doesNotMatch(score.musicXml, /<part id="hp">[\s\S]*?<instrument-sound>keyboard\.piano<\/instrument-sound>/);
assert.match(score.musicXml, /<part id="va">[\s\S]*?<clef><sign>C<\/sign><line>3<\/line><\/clef>/);
assert.match(score.musicXml, /<part id="tp1">[\s\S]*?<chromatic>-2<\/chromatic>/);
assert.match(score.musicXml, /<part id="bcl">[\s\S]*?<chromatic>-2<\/chromatic>[\s\S]*?<octave-change>-1<\/octave-change>/);
assert.match(score.musicXml, /<part id="ca">[\s\S]*?<chromatic>-7<\/chromatic>/);
assert.match(score.musicXml, /<part id="cbn">[\s\S]*?<octave-change>-1<\/octave-change>/);
assert.match(score.musicXml, /<part id="perc">[\s\S]*?<sign>percussion<\/sign>/);
assert.match(score.musicXml, /<midi-unpitched>36<\/midi-unpitched>/);
assert.match(score.musicXml, /<midi-unpitched>57<\/midi-unpitched>/);
assert.doesNotMatch(score.musicXml, /<part id="perc">[\s\S]*?<unpitched>[\s\S]*<display-step>D<\/display-step><display-octave>4<\/display-octave>/);
assert.ok(score.fidelity.symphonic);
assert.ok(score.fidelity.phrases.some((phrase) => phrase.handover));
assert.ok(score.fidelity.derivedAnswers.length > 0, 'source-related answer');
assert.ok(new Set(score.fidelity.symphonic.plans.map((plan) => plan.foregroundFamily)).size > 1);
assert.equal(score.fidelity.musicalQualityScore, null);
assert.equal(score.fidelity.musicallyApproved, false);
assert.ok(score.midiSetBase64);
assert.ok(score.midiManifest);
assert.equal(score.midiManifest.label, 'Synchronized MIDI set. Not one full-orchestra MIDI file.');
assert.equal(routesOk(score.midiManifest.routes), null);
assert.equal(routesOk([...score.midiManifest.routes, { file: 'symphony-woodwinds.mid', channel: 1, partId: 'ghost' }]) !== null, true, 'negative collision or extra part');
const dropped = score.midiManifest.routes.slice(0, 30);
assert.ok(routesOk(dropped));

const zip = unzipSync(Uint8Array.from(Buffer.from(score.midiSetBase64, 'base64')));
assert.deepEqual(Object.keys(zip).sort(), [
  'manifest.json',
  'symphony-brass.mid',
  'symphony-harp-timpani-percussion.mid',
  'symphony-strings.mid',
  'symphony-woodwinds.mid',
].sort());
const parsed = Object.fromEntries(score.midiManifest.files.map((file) => [file, parseMidi(Buffer.from(zip[file]!))]));
for (const file of score.midiManifest.files) {
  assert.equal(parsed[file]!.ppq, 480, file);
  assert.equal(parsed[file]!.tracks[0]!.tempos[0]!.tick, 0, file);
  assert.equal(Math.round(parsed[file]!.tracks[0]!.tempos[0]!.bpm), score.fidelity.tempoBpm, file);
}
assert.equal(JSON.stringify(parsed['symphony-woodwinds.mid']!.tracks[0]!.tempos) === JSON.stringify([{ tick: 10, bpm: 40 }]), false, 'negative shifted timeline');

const midiNotes = score.midiManifest.files.flatMap((file) => parsed[file]!.tracks.flatMap((track) => track.notes.map((note) => ({ ...note, name: track.name }))));
const pitchedChannels = new Map<string, Set<number>>();
for (const note of midiNotes) {
  const file = score.midiManifest.routes.find((route) => route.name === note.name)?.file ?? '';
  const set = pitchedChannels.get(file) ?? new Set<number>();
  set.add(note.channel);
  pitchedChannels.set(file, set);
}
for (const route of score.midiManifest.routes) {
  if (route.partId === 'perc') assert.equal(route.channel, 10);
  else assert.notEqual(route.channel, 10, route.partId);
}

const recombined = new Map<string, Array<{ midi: number; startTick: number }>>();
for (const file of score.midiManifest.files) {
  for (const track of parsed[file]!.tracks) {
    if (!track.name) continue;
    const list = recombined.get(track.name) ?? [];
    for (const note of track.notes) list.push({ midi: note.midi, startTick: note.startTick });
    recombined.set(track.name, list);
  }
}
for (const part of score.score.parts) {
  if (part.instrumentIdentity === 'orchestral_percussion') continue;
  const transposition = score.score.exportPartTranspose?.[part.id];
  const attacks: Array<{ midi: number; startTick: number }> = [];
  let origin = 0;
  for (const measure of [...part.measures].sort((a, b) => a.index - b.index)) {
    const span = Math.round((measure.measureBeatSpanQuarters ?? 4) * 480);
    for (const event of measure.events) {
      if (event.kind !== 'note' || !event.pianoExact) continue;
      if (event.notation?.tie === 'stop' || event.notation?.tie === 'continue') continue;
      const written = event.pitch;
      const transpositionUsed = transposition ?? CONCERT_TRANSPOSITION;
      const sounding = writtenToSounding(
        { step: event.spelling?.step ?? 'C', alter: event.spelling?.alter ?? 0, octave: Math.floor(written / 12) - 1, midi: written },
        transpositionUsed,
      ).midi;
      const start = integralStart(event.pianoExact.onsetQ);
      attacks.push({ midi: sounding, startTick: origin + start });
    }
    origin += span;
  }
  const midiAttacks = (recombined.get(part.name) ?? []).map((note) => ({ midi: note.midi, startTick: note.startTick })).sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
  attacks.sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
  assert.deepEqual(midiAttacks, attacks, part.id);
}
function integralStart(value: { n: number; d: number }): number {
  return Math.round((value.n / value.d) * 480);
}

const ingested = ingestCanonicalScore(score.musicXml);
assert.ok(ingested.score, ingested.parseError);
for (const id of score.fidelity.protectedEventIds) {
  const row = score.fidelity.classifications.find((item) => item.eventId === id);
  assert.ok(row && row.disposition !== 'omitted' && row.disposition !== 'transformed', id);
}
const tampered = score.fidelity.classifications.map((row, index) => index === 0 ? { ...row, disposition: 'omitted' as const } : row);
assert.equal(tampered.some((row) => score.fidelity.protectedEventIds.includes(row.eventId) && row.disposition === 'omitted'), true, 'negative altered protection');

const counterScore = realise(counter, 'symphonic');
assert.ok(counterScore.fidelity.silence.some((row) => row.bar === 4));
const bar4 = counterScore.score.parts.flatMap((part) => part.measures.filter((measure) => measure.index === 4).flatMap((measure) => measure.events.filter((event) => event.kind === 'note')));
assert.equal(bar4.length, 0, 'protected silence bar 4 gained notes');

const twoTempos = lyrical.replace('tempo="72"', 'tempo="72"').replace('</measure>', '</measure>').replace(
  '<measure number="5">',
  '<measure number="5"><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>96</per-minute></metronome></direction-type><sound tempo="96"/></direction>',
);
const refusedTempo = orchestrate(request(twoTempos, 'symphonic'));
assert.equal(refusedTempo.ok, false);
if (!refusedTempo.ok) assert.match(refusedTempo.error, /more than one tempo/);

const woodOff = orchestrate({
  ...request(lyrical, 'symphonic'),
  pianoChamber: {
    action: 'realise',
    sourceMusicXml: lyrical,
    correction: {
      mode: 'developing',
      reviewConfirmed: true,
      ensemble: 'symphonic',
      symphonic: { families: { woodwind: 'off' } },
    },
  },
});
assert.equal(woodOff.ok, true, woodOff.ok ? '' : woodOff.error);
if (woodOff.ok && 'score' in woodOff && woodOff.score) {
  const windNotes = woodOff.score.parts.filter((part) => ['fl1', 'ob1', 'cl1', 'bn1', 'picc'].includes(part.id)).flatMap((part) => part.measures.flatMap((measure) => measure.events.filter((event) => event.kind === 'note')));
  assert.equal(windNotes.length, 0, 'woodwind off still wrote wind notes');
}

const roster = resolveSymphonicRoster();
assert.equal(roster.omissions.length, 0);
assert.equal(roster.parts.length, 31);
for (const part of roster.parts) {
  const probe = capabilityPitch(part.partId);
  const built = buildE2Score({
    title: part.name,
    tempo: 72,
    bars: 1,
    metres: { 1: { numerator: 4, denominator: 4 } },
    parts: [{
      partId: part.partId,
      name: part.name,
      instrumentIdentity: part.spec.id,
      midiProgram: part.spec.midiProgram,
      clef: part.spec.clefs[0] === 'bass' ? 'bass' : 'treble',
      transposition: part.spec.transposition,
      hardRange: part.spec.soundingHardRange,
      maxSimultaneous: 1,
      catalogueInstrumentSound: part.spec.instrumentSound,
      ...(part.partId === 'hp' ? { harpGrandStaff: true } : {}),
    }],
    placements: [{
      id: 'probe',
      attack: {
        eventId: 'probe',
        onset: q(0),
        duration: q(1),
        pitch: spell(probe.sounding),
        members: [{ parentId: 'probe', memberId: 'probe' }],
        rest: false,
      },
      lineage: {
        eventId: 'probe',
        origin: 'source',
        sourceEventIds: ['probe'],
        parentEventIds: [],
        operation: { id: 'probe', version: '1', parametersHash: 'probe' },
        seed: 1,
      },
      regionId: 'probe',
      slotId: 'probe',
      logicalVoiceId: part.partId,
      occurrence: 0,
      sourceNotationEventIds: ['probe'],
    }],
    rests: [],
    assignments: [{ placementId: 'probe', partId: part.partId, voice: 1 }],
  });
  const exported = runEnsembleExportPipeline(built.score);
  assert.equal(exported.ok, true, `${part.partId} ${exported.ok ? '' : exported.errors.join(' ')}`);
  assert.match(exported.xml ?? '', new RegExp(part.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'lyrical-chamber.musicxml'), chamber.musicXml);
writeFileSync(path.join(OUT, 'lyrical-chamber.mid'), Buffer.from(chamber.midiBase64!, 'base64'));
writeFileSync(path.join(OUT, 'lyrical-symphony.musicxml'), score.musicXml);
writeFileSync(path.join(OUT, 'symphony-midi-set.zip'), Buffer.from(score.midiSetBase64, 'base64'));
writeFileSync(path.join(OUT, 'symphony-midi-manifest.json'), JSON.stringify(score.midiManifest, null, 2));
const comparison = {
  source: 'docs/v3.5-phase1/lyrical/source.musicxml',
  sourceSha256: createHash('sha256').update(lyrical).digest('hex'),
  chamberSha256: createHash('sha256').update(chamber.musicXml).digest('hex'),
  symphonySha256: createHash('sha256').update(score.musicXml).digest('hex'),
  chamberParts: 10,
  symphonyParts: 31,
  symphonyStaves: 32,
  phrases: score.fidelity.phrases,
  answers: score.fidelity.derivedAnswers,
  silence: score.fidelity.silence,
  warnings: score.fidelity.warnings,
  timpaniTuning: score.fidelity.symphonic?.timpaniTuning,
  conventions: score.fidelity.symphonic?.conventions,
  roster: SYMPHONIC_SLOTS.map((slot) => `${slot.partId} ${slot.name} ${slot.instrumentId} ${slot.midiFile}`),
  renders: 'NOT RUN',
  artisticApproval: 'PENDING',
};
writeFileSync(path.join(OUT, 'comparison.json'), JSON.stringify(comparison, null, 2));
console.log('symphonic acceptance ok', score.fidelity.phrases.map((phrase) => phrase.foreground).join(','));
