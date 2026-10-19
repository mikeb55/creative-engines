/**
 * V4.0 Phase 2 source-led distribution.
 * Does not rewrite docs/v3.5-phase1 or docs/v4.0-phase1.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { orchestrate } from '../core/orchestrate/orchestrate';
import { auditPhase2Distribution, midiTimelineAligned } from '../core/orchestrate/symphonicDistribution';
import type { OrchestrateRequest, SymphonicOrchestrationSettings } from '../core/orchestrate/types';
import { writtenToSounding } from '../core/instruments/writtenPitch';
import { CONCERT_TRANSPOSITION } from '../core/instruments/instrumentTypes';

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'docs/v4.0-phase2');
const SRC = path.join(ROOT, 'docs/v3.5-phase1');

const BRASS = ['hn1', 'hn2', 'hn3', 'hn4', 'tp1', 'tp2', 'tp3', 'tbn1', 'tbn2', 'tbn3', 'tba'];
const WINDS = ['picc', 'fl1', 'fl2', 'ob1', 'ob2', 'ca', 'cl1', 'cl2', 'bcl', 'bn1', 'bn2', 'cbn'];

function sha(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}

function load(name: string): string {
  return readFileSync(path.join(SRC, name, 'source.musicxml'), 'utf8');
}

function request(xml: string, symphonic?: SymphonicOrchestrationSettings, mode: 'developing' | 'faithful' = 'developing'): OrchestrateRequest {
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
        mode,
        reviewConfirmed: true,
        ensemble: 'symphonic',
        ...(symphonic ? { symphonic } : {}),
      },
    },
  };
}

function realise(xml: string, symphonic?: SymphonicOrchestrationSettings, mode: 'developing' | 'faithful' = 'developing') {
  const result = orchestrate(request(xml, symphonic, mode));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.score || !result.midiSetBase64 || !result.midiManifest) {
    throw new Error('expected a symphonic score');
  }
  return result;
}

function chamberOf(xml: string) {
  const result = orchestrate({
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true } },
  });
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity) throw new Error('expected chamber');
  return result;
}

function parseMidi(data: Buffer) {
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

function counts(events: Array<{ instrument: string; role: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events) out[event.instrument] = (out[event.instrument] ?? 0) + 1;
  return out;
}

const lyricalXml = load('lyrical');
const counterXml = load('contrapuntal');
const rhythmicXml = load('rhythmic');

const phase1 = realise(lyricalXml);
const phase1Again = realise(lyricalXml);
const phase1Named = realise(lyricalXml, { allocation: 'phase-1' });
assert.equal(phase1.musicXml, phase1Again.musicXml);
assert.equal(phase1.musicXml, phase1Named.musicXml, 'explicit phase-1 changed the music');
assert.equal(phase1.fidelity.symphonic?.distribution, undefined);
assert.equal(phase1.musicXml, readFileSync(path.join(ROOT, 'docs/v4.0-phase1/lyrical-symphony.musicxml'), 'utf8'));
for (const name of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const xml = name === 'lyrical' ? lyricalXml : name === 'contrapuntal' ? counterXml : rhythmicXml;
  const chamber = chamberOf(xml);
  assert.equal(chamber.musicXml, readFileSync(path.join(SRC, name, `${name}.musicxml`), 'utf8'), `${name} chamber bytes moved`);
}

const refused = orchestrate(request(lyricalXml, { allocation: 'nope' as 'phase-2' }));
assert.equal(refused.ok, false);

const examples: Array<{ id: string; xml: string; settings: SymphonicOrchestrationSettings; brass: boolean }> = [
  { id: 'lyrical', xml: lyricalXml, settings: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' } }, brass: false },
  { id: 'contrapuntal', xml: counterXml, settings: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'off', percussion: 'off' } }, brass: false },
  { id: 'rhythmic', xml: rhythmicXml, settings: { allocation: 'phase-2', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'open', strings: 'open', harp: 'limited', percussion: 'open' } }, brass: true },
];

const written: string[] = [];
for (const example of examples) {
  const score = realise(example.xml, example.settings);
  const again = realise(example.xml, example.settings);
  assert.equal(score.musicXml, again.musicXml, `${example.id} drift`);
  assert.notEqual(score.musicXml, phase1.musicXml);
  assert.equal((score.musicXml.match(/<score-part /g) ?? []).length, 31);
  const staffSum = [...score.musicXml.matchAll(/<staves>(\d+)<\/staves>/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  assert.equal(staffSum, 32);
  for (const part of score.score.parts) assert.equal(part.measures.length, 24, part.id);
  const distribution = score.fidelity.symphonic?.distribution;
  assert.ok(distribution);
  assert.equal(distribution.allocation, 'phase-2');
  const participation = counts(distribution.events);
  const brassNotes = BRASS.reduce((sum, id) => sum + (participation[id] ?? 0), 0);
  assert.equal(brassNotes > 0, example.brass, `${example.id} brass presence`);
  if (example.id === 'lyrical') {
    assert.ok((participation.fl1 ?? 0) > 0 && (participation.vn1 ?? 0) > 0, 'wind/string handover');
    assert.ok((participation.vn2 ?? 0) >= 3, 'violin II gesture');
    assert.ok((participation.va ?? 0) >= 3, 'viola gesture');
    assert.ok((participation.vc ?? 0) >= 3, 'cello gesture');
    assert.ok(score.fidelity.derivedAnswers.some((item) => item.partId === 'vn2' && item.notes >= 3));
    assert.equal(score.fidelity.warnings.length, 0, 'flute endurance was not handed over');
  }
  if (example.id === 'contrapuntal') {
    assert.ok(score.fidelity.silence.some((row) => row.bar === 4));
    const bar4 = score.score.parts.flatMap((part) => part.measures.filter((measure) => measure.index === 4).flatMap((measure) => measure.events.filter((event) => event.kind === 'note')));
    assert.equal(bar4.length, 0);
    assert.ok(score.fidelity.derivedAnswers.length === 1);
    assert.ok((participation.fl1 ?? 0) > 0 && (participation.vn1 ?? 0) > 0 && (participation.va ?? 0) > 0 && (participation.cl1 ?? 0) > 0);
  }
  if (example.id === 'rhythmic') {
    assert.ok((participation.tp1 ?? 0) >= 2 && (participation.hn1 ?? 0) >= 2 && (participation.tba ?? 0) >= 1);
    assert.ok((participation.perc ?? 0) >= 1 && (participation.perc ?? 0) <= 2);
    assert.ok((participation.vn2 ?? 0) >= 8 && (participation.vc ?? 0) >= 3);
  }
  for (const id of score.fidelity.protectedEventIds) {
    const row = score.fidelity.classifications.find((item) => item.eventId === id);
    assert.ok(row && row.disposition !== 'omitted' && row.disposition !== 'transformed', id);
  }
  const answers = distribution.events.filter((event) => event.role === 'independent-answer');
  assert.ok(answers.length <= 8);
  const lineages = new Set(answers.map((event) => event.lineage));
  assert.ok(lineages.size <= 1);
  assert.ok(!answers.some((event) => event.transformation === 'unison-reinforcement' || event.transformation === 'octave-reinforcement'));

  assert.equal(score.midiManifest.files.length, 4);
  const zip = unzipSync(Uint8Array.from(Buffer.from(score.midiSetBase64, 'base64')));
  const parsed = Object.fromEntries(score.midiManifest.files.map((file) => [file, parseMidi(Buffer.from(zip[file]!))]));
  const tempo0 = parsed[score.midiManifest.files[0]!]!.tracks[0]!.tempos;
  for (const file of score.midiManifest.files) {
    assert.equal(parsed[file]!.ppq, 480, file);
    assert.equal(midiTimelineAligned(parsed[file]!.tracks[0]!.tempos), null, file);
    assert.equal(JSON.stringify(parsed[file]!.tracks[0]!.tempos), JSON.stringify(tempo0), file);
  }
  assert.equal(midiTimelineAligned([{ tick: 10 }]), 'shifted MIDI-family timing');
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
        const transpositionUsed = transposition ?? CONCERT_TRANSPOSITION;
        const sounding = writtenToSounding(
          { step: event.spelling?.step ?? 'C', alter: event.spelling?.alter ?? 0, octave: Math.floor(event.pitch / 12) - 1, midi: event.pitch },
          transpositionUsed,
        ).midi;
        attacks.push({ midi: sounding, startTick: origin + Math.round((event.pianoExact.onsetQ.n / event.pianoExact.onsetQ.d) * 480) });
      }
      origin += span;
    }
    const midiAttacks = (recombined.get(part.name) ?? []).slice().sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
    attacks.sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
    assert.deepEqual(midiAttacks, attacks, `${example.id} ${part.id}`);
  }
  const byFile = new Map<string, number[]>();
  for (const route of score.midiManifest.routes) {
    const list = byFile.get(route.file) ?? [];
    list.push(route.channel);
    byFile.set(route.file, list);
  }
  for (const [file, channels] of byFile) {
    const pitched = channels.filter((channel) => channel !== 10);
    assert.equal(new Set(pitched).size, pitched.length, file);
  }
  assert.equal(score.midiManifest.routes.length, 31);

  const dir = path.join(OUT, example.id);
  mkdirSync(dir, { recursive: true });
  const chamber = chamberOf(example.xml);
  writeFileSync(path.join(dir, `${example.id}.musicxml`), score.musicXml);
  writeFileSync(path.join(dir, 'phase1.musicxml'), example.id === 'lyrical' ? phase1.musicXml : realise(example.xml).musicXml);
  writeFileSync(path.join(dir, 'chamber.musicxml'), chamber.musicXml);
  writeFileSync(path.join(dir, 'symphony-midi-set.zip'), Buffer.from(score.midiSetBase64, 'base64'));
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(score.midiManifest, null, 2));
  writeFileSync(path.join(dir, 'distribution.json'), JSON.stringify(distribution, null, 2));
  const comparison = {
    source: `docs/v3.5-phase1/${example.id}/source.musicxml`,
    seed: 11,
    mode: 'developing',
    settings: example.settings,
    phase2MusicXmlSha256: sha(score.musicXml),
    phase1MusicXmlSha256: sha(readFileSync(path.join(dir, 'phase1.musicxml'))),
    chamberMusicXmlSha256: sha(chamber.musicXml),
    midiZipSha256: sha(Buffer.from(score.midiSetBase64, 'base64')),
    participation,
    answers: score.fidelity.derivedAnswers,
    phrases: score.fidelity.phrases,
    warnings: score.fidelity.warnings,
    listeningQuestions: score.fidelity.listeningQuestions,
    renders: 'MuseScore Studio 4.7.5 import wrote MSCX and PDF, then aborted on shutdown. See docs/v4.0-phase2/TECHNICAL.md.',
    artisticApproval: 'PENDING',
    note: 'Phase 2 is not expected to match Phase 1. Hashes are the primary A/B. Chamber is the secondary comparison.',
  };
  writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify(comparison, null, 2));
  written.push(`${example.id}: ${Object.entries(participation).map(([id, count]) => `${id} ${count}`).join(', ')}`);
}

const lyricalFaithful = realise(lyricalXml, examples[0]!.settings, 'faithful');
assert.equal(lyricalFaithful.fidelity.symphonic?.distribution?.events.some((event) => event.role === 'independent-answer'), false);
const windOff = realise(lyricalXml, { ...examples[0]!.settings, families: { ...examples[0]!.settings.families, woodwind: 'off' } });
assert.equal(WINDS.some((id) => (counts(windOff.fidelity.symphonic!.distribution!.events)[id] ?? 0) > 0), false);

const harmonic = orchestrate({
  ...request(lyricalXml, examples[0]!.settings),
  pianoChamber: {
    action: 'realise',
    sourceMusicXml: lyricalXml,
    correction: {
      mode: 'developing',
      reviewConfirmed: true,
      ensemble: 'symphonic',
      symphonic: examples[0]!.settings,
      harmonicDevelopment: {
        bhl: { enabled: true, startBar: 5, endBar: 8, target: 'ob1', departure: 'mild', tensionPlacement: 'early', resolutionTiming: 'next-beat' },
        triadPair: {
          enabled: true,
          parentA: { id: 'parent-a', quality: 'major', notes: ['C', 'E', 'G'], voices: ['C4', 'E4', 'G4'] },
          parentB: { id: 'parent-b', quality: 'minor', notes: ['D', 'F', 'A'], voices: ['D4', 'F4', 'A4'] },
          startBar: 13,
          endBar: 16,
          groups: [['vn2', 'va'], ['cl1', 'hn1']],
          relation: 'alternation',
          registerMin: 48,
          registerMax: 84,
          maxAttacks: 6,
        },
      },
    },
  },
});
assert.equal(harmonic.ok, true, harmonic.ok ? '' : harmonic.error);
if (harmonic.ok && harmonic.fidelity) {
  assert.ok((harmonic.fidelity.harmonicDevelopment?.notes.length ?? 0) > 0);
  for (const id of harmonic.fidelity.protectedEventIds) {
    const row = harmonic.fidelity.classifications.find((item) => item.eventId === id);
    assert.ok(row && row.disposition !== 'omitted' && row.disposition !== 'transformed', id);
  }
}

const sample = realise(lyricalXml, examples[0]!.settings).fidelity.symphonic!.distribution!;
const changedPitch = auditPhase2Distribution({
  events: sample.events.map((event, index) => index === 0 ? { ...event, sounding: event.sounding + 1 } : event),
  silentBars: new Set<number>(),
  barOf: () => 1,
  locked: [{ id: sample.events[0]!.lineage, midi: sample.events[0]!.sounding, onset: sample.events[0]!.onset, duration: sample.events[0]!.duration }],
  settings: examples[0]!.settings,
  mode: 'developing',
});
assert.equal(changedPitch.ok, false);
assert.ok(changedPitch.failures.some((failure) => failure.includes('Protected pitch')));

const filled = auditPhase2Distribution({
  events: [{ ...sample.events[0]!, onset: 12 }],
  silentBars: new Set([4]),
  barOf: (onset) => Math.floor(onset / 4) + 1,
  locked: [],
  settings: examples[0]!.settings,
  mode: 'developing',
});
assert.equal(filled.ok, false);
assert.ok(filled.failures.some((failure) => failure.includes('Filled silence')));

const split = auditPhase2Distribution({
  events: [
    { ...sample.events[0]!, lineage: 'locked-note', instrument: 'fl1', transformation: 'preserved-source' },
    { ...sample.events[0]!, lineage: 'locked-note', instrument: 'vn1', transformation: 'preserved-source' },
  ],
  silentBars: new Set<number>(),
  barOf: () => 1,
  locked: [],
  settings: examples[0]!.settings,
  mode: 'developing',
});
assert.equal(split.ok, false);
assert.ok(split.failures.some((failure) => failure.includes('Illegal handover')));

const forbidden = auditPhase2Distribution({
  events: [{ ...sample.events[0]!, instrument: 'hn1', role: 'primary-melody' }],
  silentBars: new Set<number>(),
  barOf: () => 1,
  locked: [],
  settings: examples[0]!.settings,
  mode: 'developing',
});
assert.equal(forbidden.ok, false);
assert.ok(forbidden.failures.some((failure) => failure.includes('Out of permission')));

const doubled = auditPhase2Distribution({
  events: [
    { ...sample.events[0]!, role: 'primary-melody', lineage: 'm1', onset: 0, duration: 1, sounding: 72, transformation: 'preserved-source' },
    { ...sample.events[0]!, role: 'primary-melody', lineage: 'm2', onset: 1, duration: 1, sounding: 74, transformation: 'preserved-source' },
    { ...sample.events[0]!, role: 'independent-answer', lineage: 'ans', onset: 4, duration: 1, sounding: 72, transformation: 'fragment-head' },
    { ...sample.events[0]!, role: 'independent-answer', lineage: 'ans', onset: 5, duration: 1, sounding: 74, transformation: 'fragment-head' },
  ],
  silentBars: new Set<number>(),
  barOf: () => 1,
  locked: [],
  settings: { families: { woodwind: 'open', brass: 'open', strings: 'open', harp: 'open', percussion: 'open' } },
  mode: 'developing',
});
assert.equal(doubled.ok, false);
assert.ok(doubled.failures.some((failure) => failure.includes('Doubling labelled independent')));

writeFileSync(path.join(OUT, 'TECHNICAL.md'), `# V4.0 Phase 2 — source-led distribution

Technical evidence. Not artistic approval. Player feasibility was not reviewed.

Phase 2 is \`correction.symphonic.allocation: "phase-2"\`. Absent allocation, and explicit \`phase-1\`, keep the Phase 1 allocator. Chamber stays the default when \`ensemble\` is absent.

## Examples

Seed 11. Mode developing. Sources were not edited.

${written.map((line) => `- ${line}`).join('\n')}

Primary A/B is Phase 1 versus Phase 2 symphonic MusicXML, same source, review, and seed, allocation only. Those files are not byte-identical. That difference is the allocation. Secondary comparison is the developing chamber file already stored under \`docs/v3.5-phase1\`. Hashes are in each \`comparison.json\`.

Listening was not performed. MuseScore import is recorded under Acceptance render. That pass does not judge the music.

## What the notes do

- Lyrical, brass off: flute and violin alternate the melody when a wind span reaches six quarters. Violin II has one displaced inner answer. Viola carries inner source tones. Cello carries one phrase of the bass. Harp uses a few source inner pitches. One timpani note uses the declared bass tuning.
- Contrapuntal, brass and percussion off: melody alternates flute and violin. The source countermelody alternates viola and clarinet. One augmented answer sits on violin II. Bar 4 stays empty.
- Rhythmic, brass open: trumpet reinforces a short head, horn colours it, tuba reinforces one bass attack, and percussion has one bass-drum and one cymbal off the bar downbeat. Density drops again in the final phrase.

An independent answer is one line at a time. Exact octave copies are labelled reinforcement and are not that answer.

## Listening questions

These are questions, not findings.

- Does the melody still sound like one line after a wind/string handover?
- Does the inner-string answer feel necessary?
- In the rhythmic example, is the brass weight useful or too heavy?
- Would any added note be clearer as silence?

Artistic approval: PENDING.

## Limitations

- Player feasibility was not reviewed.
- String staves are unison sections. No divisi.
- At most one newly composed independent answer is active at a time.
- No new harp-pedalling system and no new timpani-retuning system. Harp uses source pitches that share one pedal spelling. Timpani uses the declared bass tuning.
- Playback is four synchronized MIDI files, not one conventional full-orchestra MIDI file.
- Desktop DEV and STABLE applications were not rebuilt. The chamber page source can request Phase 2. Packaged apps are unchanged.

## Acceptance render

MuseScore Studio 4.7.5 at \`/Applications/MuseScore 4.app\` imported the three Phase 2 MusicXML files in isolated temporary directories. Each import wrote a complete MSCX (31 parts, 32 staves, 24 bars) and a PDF. The process then aborted during shutdown (exit 134, mutex). Round-trip pitches, ties, and quarter-lengths matched the source MusicXML after MuseScore rescaled divisions. No duration repair was observed. This render is not artistic approval.
`);

console.log('phase 2 distribution ok');
console.log(written.join('\n'));
