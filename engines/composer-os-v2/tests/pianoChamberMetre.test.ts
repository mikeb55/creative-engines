/**
 * V3.5 piano-to-chamber metre expansion.
 * Constant 3/4, 4/4 and 6/8 stay in pianoChamber.test.ts and pianoChamberPhase2.test.ts.
 */

import assert from 'node:assert/strict';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { OrchestrateRequest } from '../core/orchestrate/types';

type Plan = Array<{ through: number; beats: number; beatType: number }>;

function signatureAt(plan: Plan, bar: number): { beats: number; beatType: number } {
  const hit = plan.find((row) => bar <= row.through);
  if (!hit) throw new Error(`no metre for bar ${bar}`);
  return hit;
}

function unitTicks(beatType: number): number {
  return Math.round((480 * 4) / beatType);
}

function noteXml(step: string, octave: number, duration: number, type: string, staff: 1 | 2, tie?: 'start' | 'stop'): string {
  const tieXml = tie ? `<tie type="${tie}"/>` : '';
  const tied = tie ? `<notations><tied type="${tie}"/></notations>` : '';
  return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>${tieXml}<voice>1</voice><type>${type}</type><staff>${staff}</staff>${tied}</note>`;
}

function scoreFor(title: string, plan: Plan, tieBars?: { from: number; to: number }): string {
  const steps = ['C', 'D', 'E', 'G', 'A', 'F', 'B'];
  const measures: string[] = [];
  let previous = '';
  for (let bar = 1; bar <= 24; bar += 1) {
    const { beats, beatType } = signatureAt(plan, bar);
    const unit = unitTicks(beatType);
    const melodyType = beatType === 8 ? 'eighth' : 'quarter';
    const melody = Array.from({ length: beats }, (_, index) => noteXml(steps[(bar + index) % steps.length]!, 5, unit, melodyType, 1)).join('');
    const bassTicks = unit * beats;
    const tie = tieBars && bar === tieBars.from ? 'start' as const : tieBars && bar === tieBars.to ? 'stop' as const : undefined;
    const bass = noteXml('C', 3, bassTicks, 'whole', 2, tie);
    const key = `${beats}/${beatType}`;
    const time = bar === 1 || key !== previous
      ? `<time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`
      : '';
    previous = key;
    const attributes = bar === 1
      ? `<attributes><divisions>480</divisions><key><fifths>0</fifths></key>${time}<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>`
      : time
        ? `<attributes>${time}</attributes>`
        : '';
    measures.push(`<measure number="${bar}">${attributes}${melody}<backup><duration>${bassTicks}</duration></backup>${bass}</measure>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}

function request(xml: string, mode: 'developing' | 'faithful' = 'developing', seed = 11): OrchestrateRequest {
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

function realise(xml: string, mode: 'developing' | 'faithful' = 'developing', seed = 11) {
  const result = orchestrate(request(xml, mode, seed));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.fidelity || !result.midiBase64) throw new Error('expected a chamber score');
  return result;
}

function quarters(value: { n: number; d: number }): number {
  return value.n / value.d;
}

function parseMidi(data: Buffer): {
  ppq: number;
  tempos: Array<{ tick: number; bpm: number }>;
  signatures: Array<{ tick: number; beats: number; beatType: number }>;
  notes: Array<{ midi: number; startTick: number; endTick: number }>;
} {
  assert.equal(data.toString('ascii', 0, 4), 'MThd');
  const ppq = data.readUInt16BE(12);
  let pos = 14;
  const tempos: Array<{ tick: number; bpm: number }> = [];
  const signatures: Array<{ tick: number; beats: number; beatType: number }> = [];
  const notes: Array<{ midi: number; startTick: number; endTick: number }> = [];
  while (pos + 8 <= data.length) {
    assert.equal(data.toString('ascii', pos, pos + 4), 'MTrk');
    const length = data.readUInt32BE(pos + 4);
    const end = pos + 8 + length;
    let cursor = pos + 8;
    let tick = 0;
    let status = 0;
    const open = new Map<number, number>();
    while (cursor < end) {
      let value = 0;
      let byte = 0;
      do {
        byte = data[cursor++]!;
        value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tick += value;
      const next = data[cursor]!;
      if (next === 0xff) {
        cursor += 1;
        const kind = data[cursor++]!;
        let metaLength = 0;
        do {
          byte = data[cursor++]!;
          metaLength = (metaLength << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        if (kind === 0x51 && metaLength === 3) {
          const us = (data[cursor]! << 16) | (data[cursor + 1]! << 8) | data[cursor + 2]!;
          tempos.push({ tick, bpm: 60_000_000 / us });
        }
        if (kind === 0x58 && metaLength >= 2) {
          signatures.push({ tick, beats: data[cursor]!, beatType: 2 ** data[cursor + 1]! });
        }
        cursor += metaLength;
        continue;
      }
      if (next === 0xf0 || next === 0xf7) {
        cursor += 1;
        let sys = 0;
        do {
          byte = data[cursor++]!;
          sys = (sys << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        cursor += sys;
        continue;
      }
      if (next & 0x80) {
        status = next;
        cursor += 1;
      }
      const kind = status & 0xf0;
      const data1 = data[cursor++]!;
      const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[cursor++]!;
      if (kind === 0x90 && data2 > 0) open.set(data1, tick);
      if (kind === 0x80 || (kind === 0x90 && data2 === 0)) {
        const start = open.get(data1);
        if (start !== undefined) {
          notes.push({ midi: data1, startTick: start, endTick: tick });
          open.delete(data1);
        }
      }
    }
    pos = end;
  }
  return { ppq, tempos, signatures, notes };
}

function assertChamber(xml: string, plan: Plan, label: string): void {
  const first = realise(xml);
  const again = realise(xml);
  assert.equal(first.musicXml, again.musicXml, `${label} determinism`);
  const parsed = ingestCanonicalScore(first.musicXml);
  assert.ok(parsed.score, parsed.parseError);
  const score = parsed.score!;
  assert.equal(score.parts.length, 10, `${label} parts`);
  for (const part of score.parts) {
    const bars = score.measures.filter((measure) => measure.partId === part.id);
    assert.equal(bars.length, 24, `${label} ${part.id} bars`);
    for (let bar = 1; bar <= 24; bar += 1) {
      const measure = bars.find((item) => item.bar === bar);
      const expected = signatureAt(plan, bar);
      assert.ok(measure, `${label} ${part.id} bar ${bar}`);
      assert.equal(measure!.beats, expected.beats, `${label} ${part.id} bar ${bar} beats`);
      assert.equal(measure!.beatType, expected.beatType, `${label} ${part.id} bar ${bar} beat type`);
      assert.equal(quarters(measure!.expected), (expected.beats * 4) / expected.beatType, `${label} bar length`);
    }
  }
  const missing = first.fidelity.protectedEventIds.filter((id) => {
    const row = first.fidelity!.classifications.find((item) => item.eventId === id);
    return !row || row.disposition === 'omitted' || row.disposition === 'transformed';
  });
  assert.deepEqual(missing, [], `${label} protected`);
  const source = ingestCanonicalScore(xml).score!;
  for (const id of first.fidelity.protectedEventIds) {
    const event = source.sourceEvents.find((item) => item.id === id);
    const row = first.fidelity.classifications.find((item) => item.eventId === id)!;
    assert.ok(event && event.soundingMidi !== null, `${label} source ${id}`);
    const midi = (event!.soundingMidi as number) + row.octaveShift;
    const onset = quarters(event!.onset);
    const hit = score.soundingEvents.some((item) => item.soundingMidi === midi && Math.abs(quarters(item.onset) - onset) < 1e-6);
    assert.ok(hit, `${label} anchor ${id} moved`);
  }
  const midi = parseMidi(Buffer.from(first.midiBase64, 'base64'));
  assert.equal(midi.ppq, 480, `${label} ppq`);
  assert.equal(midi.tempos.length, 1, `${label} tempo count`);
  assert.equal(midi.tempos[0]!.tick, 0, `${label} tempo onset`);
  assert.equal(Math.round(60_000_000 / midi.tempos[0]!.bpm), Math.round(60_000_000 / 72), `${label} tempo`);
  let tick = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const expected = signatureAt(plan, bar);
    const found = midi.signatures.some((item) => item.tick === tick && item.beats === expected.beats && item.beatType === expected.beatType);
    assert.ok(found, `${label} MIDI metre bar ${bar} at ${tick}`);
    tick += Math.round(((expected.beats * 4) / expected.beatType) * 480);
  }
  const xmlNotes = score.soundingEvents
    .filter((event) => !event.rest && event.soundingMidi !== null)
    .map((event) => ({
      midi: event.soundingMidi as number,
      startTick: Math.round(quarters(event.onset) * 480),
      endTick: Math.round((quarters(event.onset) + quarters(event.duration)) * 480),
    }))
    .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
  const midiNotes = midi.notes
    .map((note) => ({ midi: note.midi, startTick: note.startTick, endTick: note.endTick }))
    .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
  assert.deepEqual(midiNotes, xmlNotes, `${label} sounding onset duration release`);
  const crosses = (phrase: { startBar: number; endBar: number }): boolean => {
    for (let bar = phrase.startBar; bar < phrase.endBar; bar += 1) {
      const left = signatureAt(plan, bar);
      const right = signatureAt(plan, bar + 1);
      if (left.beats !== right.beats || left.beatType !== right.beatType) return true;
    }
    return false;
  };
  if (plan.length > 1) {
    const crossing = first.fidelity.phrases.find((phrase) => crosses(phrase));
    assert.ok(crossing, `${label} phrase crosses a metre change`);
    const developed = first.fidelity.phrases.find((phrase) => phrase.role === 'development' && crosses(phrase))
      ?? first.fidelity.phrases.find((phrase) => phrase.role === 'development');
    assert.ok(developed, `${label} development phrase`);
    const answer = first.fidelity.derivedAnswers.find((item) => item.phraseId === developed!.id);
    assert.ok(answer && answer.notes >= 2, `${label} answer inside ${developed!.id} (${developed!.startBar}-${developed!.endBar}) ${first.fidelity.omissions.map((item) => item.reason).join(' | ')}`);
    const phrase = developed!;
    let startQ = 0;
    let endQ = 0;
    let cursor = 0;
    for (let bar = 1; bar <= 24; bar += 1) {
      const length = (signatureAt(plan, bar).beats * 4) / signatureAt(plan, bar).beatType;
      if (bar === phrase.startBar) startQ = cursor;
      cursor += length;
      if (bar === phrase.endBar) endQ = cursor;
    }
    const preview = first.fidelity.preview.filter((note) => note.partId === answer!.partId && note.onset >= startQ - 1e-6 && note.onset + note.duration <= endQ + 1e-6);
    assert.ok(preview.length >= 2, `${label} answer fits the phrase`);
  }
}

const uniforms: Plan[] = [
  [{ through: 24, beats: 2, beatType: 4 }],
  [{ through: 24, beats: 5, beatType: 4 }],
  [{ through: 24, beats: 6, beatType: 4 }],
  [{ through: 24, beats: 7, beatType: 4 }],
  [{ through: 24, beats: 3, beatType: 8 }],
  [{ through: 24, beats: 5, beatType: 8 }],
  [{ through: 24, beats: 7, beatType: 8 }],
  [{ through: 24, beats: 9, beatType: 8 }],
  [{ through: 24, beats: 12, beatType: 8 }],
];

for (const plan of uniforms) {
  const sig = plan[0]!;
  assertChamber(scoreFor(`${sig.beats}/${sig.beatType}`, plan), plan, `${sig.beats}/${sig.beatType}`);
}

const mixedQuarters: Plan = [
  { through: 4, beats: 4, beatType: 4 },
  { through: 12, beats: 5, beatType: 4 },
  { through: 24, beats: 3, beatType: 4 },
];
assertChamber(scoreFor('4/4 to 5/4 to 3/4', mixedQuarters), mixedQuarters, '4/4-5/4-3/4');

const mixedEighths: Plan = [
  { through: 6, beats: 6, beatType: 8 },
  { through: 14, beats: 7, beatType: 8 },
  { through: 24, beats: 4, beatType: 4 },
];
assertChamber(scoreFor('6/8 to 7/8 to 4/4', mixedEighths), mixedEighths, '6/8-7/8-4/4');

const tiedPlan: Plan = [
  { through: 4, beats: 4, beatType: 4 },
  { through: 8, beats: 5, beatType: 4 },
  { through: 24, beats: 3, beatType: 4 },
];
const tied = realise(scoreFor('tie across 4/4 and 5/4', tiedPlan, { from: 4, to: 5 }), 'faithful');
assert.match(tied.musicXml, /<tied type="start"\/>/);
assert.match(tied.musicXml, /<tied type="stop"\/>/);
const tiedMidi = parseMidi(Buffer.from(tied.midiBase64, 'base64'));
const tieStart = 3 * 1920;
const tieDuration = 1920 + 2400;
const merged = tiedMidi.notes.filter((note) => note.startTick === tieStart && note.endTick - note.startTick === tieDuration);
assert.ok(merged.length >= 1, 'tied attack keeps both bar durations');

const grouped = scoreFor('grouped seven', [{ through: 24, beats: 7, beatType: 8 }]).replace(
  '<beats>7</beats>',
  '<beats>2+2+3</beats>',
);
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
if (groupedProposal.ok && 'proposalOnly' in groupedProposal) {
  assert.deepEqual(groupedProposal.proposal.metres[0]?.groups, [2, 2, 3]);
}
const groupedScore = realise(grouped, 'faithful', 3);
assert.match(groupedScore.musicXml, /<beats>7<\/beats><beat-type>8<\/beat-type>/);
assert.doesNotMatch(groupedScore.musicXml, /<beats>2\+2\+3<\/beats>/);

const five = scoreFor('five four harmony', [{ through: 24, beats: 5, beatType: 4 }]);
const bhl = orchestrate({
  ...request(five, 'developing', 11),
  pianoChamber: {
    action: 'realise',
    sourceMusicXml: five,
    correction: {
      mode: 'developing',
      reviewConfirmed: true,
      harmonicDevelopment: {
        bhl: {
          enabled: true,
          startBar: 2,
          endBar: 4,
          target: 'harmonic_support',
          departure: 'mild',
          tensionPlacement: 'early',
          resolutionTiming: 'next-beat',
        },
      },
    },
  },
});
assert.equal(bhl.ok, true, bhl.ok ? '' : bhl.error);
if (bhl.ok && 'fidelity' in bhl && bhl.fidelity?.harmonicDevelopment) {
  const line = bhl.fidelity.harmonicDevelopment.notes;
  assert.ok(line.length >= 3, '5/4 tension line');
  const [common, tension, resolution] = line;
  assert.ok(common && tension && resolution);
  assert.ok(resolution.onset >= tension.onset + tension.duration - 1e-6, '5/4 resolution after tension');
  for (const note of line) {
    const bar = Math.floor(note.onset / 5) + 1;
    const start = (bar - 1) * 5;
    assert.ok(note.onset >= start - 1e-6 && note.onset + note.duration <= start + 5 + 1e-6, '5/4 note stays in its bar');
  }
}

const seven = scoreFor('seven eight dialogue', [{ through: 24, beats: 7, beatType: 8 }]);
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
  const notes = pair.fidelity.harmonicDevelopment.notes.filter((note) => note.control === 'triad-pair');
  assert.ok(notes.length >= 2, '7/8 triad answer');
  const barLength = 3.5;
  const windowStart = 12 * barLength;
  const windowEnd = 16 * barLength;
  assert.ok(notes.every((note) => note.onset >= windowStart - 1e-6 && note.onset + note.duration <= windowEnd + 1e-6), '7/8 dialogue stays in the span');
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

refuse(scoreFor('two two', [{ through: 24, beats: 2, beatType: 2 }]), /2\/2/);
refuse(scoreFor('nine sixteen', [{ through: 24, beats: 9, beatType: 16 }]), /9\/16/);

const overflow = scoreFor('overflow', [{ through: 24, beats: 4, beatType: 4 }]).replace(
  '<duration>480</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>',
  '<duration>2400</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>',
);
refuse(overflow, /extends past bar 1/);

const disagree = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1"><part-list>
<score-part id="P1"><part-name>Piano</part-name></score-part>
<score-part id="P2"><part-name>Piano II</part-name></score-part>
</part-list>
<part id="P1">${Array.from({ length: 24 }, (_, index) => `<measure number="${index + 1}">${index === 0 ? '<attributes><divisions>480</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>' : ''}${noteXml('C', 5, 1920, 'whole', 1)}<backup><duration>1920</duration></backup>${noteXml('C', 3, 1920, 'whole', 2)}</measure>`).join('')}</part>
<part id="P2">${Array.from({ length: 24 }, (_, index) => `<measure number="${index + 1}">${index === 0 ? '<attributes><divisions>480</divisions><key><fifths>0</fifths></key><time><beats>5</beats><beat-type>4</beat-type></time></attributes>' : ''}${noteXml('E', 4, 2400, 'whole', 1)}</measure>`).join('')}</part>
</score-partwise>`;
refuse(disagree, /does not share one time signature/);

console.log('piano chamber metre tests passed');
