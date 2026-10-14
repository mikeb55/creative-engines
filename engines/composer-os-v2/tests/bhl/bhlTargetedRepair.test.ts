/**
 * BHL targeted repair — World E return collection, scratch guitar pitches.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlTargetedRepair.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCompose } from '../../app-api/bhlApp';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';
import { worldPitchSignature } from '../../core/bhl/bhlPhraseShape';
import { BHL_WORLD_IDS, type BhlWorldId } from '../../core/bhl/bhlWorlds';
import { sha256File } from '../../core/bhl/bhlIngest';

const SOURCE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const SPAN = { from: 33, to: 40 };
const HOME = new Set([0, 2, 4, 7, 9]);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

function guitarPart(xml: string): string {
  const named = xml.match(/<score-part id="([^"]+)"[^>]*>\s*<part-name>[^<]*[Gg]uitar[^<]*<\/part-name>/);
  const id = named?.[1] ?? 'G';
  return xml.split(`<part id="${id}">`)[1]?.split('</part>')[0] ?? '';
}

function measureBody(part: string, bar: number): string {
  return part.split(`<measure number="${bar}">`)[1]?.split('</measure>')[0] ?? '';
}

function pitchClassesIn(xmlChunk: string): number[] {
  const out: number[] = [];
  const notes = xmlChunk.matchAll(/<pitch><step>([A-G])<\/step>(?:<alter>(-?\d+)<\/alter>)?/g);
  for (const note of notes) {
    const step = 'CDEFGAB'.indexOf(note[1] ?? 'C');
    const alter = Number(note[2] ?? 0);
    const pc = [0, 2, 4, 5, 7, 9, 11][step]! + alter;
    out.push((pc + 12) % 12);
  }
  return out;
}

const before = sha256File(SOURCE);
const colour = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'E',
  musical: {
    pentatonic: {
      archetypeId: 'suspended_pentatonic',
      referenceNote: 'D',
      relationshipId: 'home',
      contrastId: 'hirajoshi',
    },
  },
});
if (!colour.ok) {
  console.error(colour.error);
  process.exit(1);
}

const worlds = BHL_WORLD_IDS.map((world) => {
  const row = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: 3340, world });
  assert.equal(row.ok, true, world);
  if (!row.ok) throw new Error(world);
  return row;
});

check('album source hash is unchanged', () => {
  assert.equal(sha256File(SOURCE), before);
  assert.equal(sha256File(SOURCE), '01383c35b0eddc74442ba056cec297e36c045e130f6990865732fcac3aafcb48');
});

check('World E return bar 38 has no B-natural and stays in the suspended collection', () => {
  const returning = colour.plan.regions.find((region) => region.role === 'return');
  assert.ok(returning?.bars.includes(38));
  const events = colour.events.filter((event) => event.bar === 38);
  assert.ok(events.length > 0);
  for (const event of events) {
    for (const pitchClass of event.pitchClasses) {
      assert.ok(HOME.has(pitchClass), `bar 38 pitch ${NAMES[pitchClass]} left D suspended pentatonic`);
    }
  }
  const xmlPcs = pitchClassesIn(measureBody(guitarPart(colour.xml), 38));
  assert.ok(xmlPcs.length > 0, 'exported MusicXML bar 38 has no guitar pitches');
  assert.ok(!xmlPcs.includes(11), `MusicXML bar 38 still has B: ${xmlPcs.map((pc) => NAMES[pc]).join(' ')}`);
  for (const pitchClass of xmlPcs) assert.ok(HOME.has(pitchClass));
});

check('Hirajoshi F-natural remains on the contrasting development', () => {
  const development = colour.plan.regions.filter((region) => region.role === 'development').flatMap((region) => region.bars);
  const pcs = colour.events.filter((event) => development.includes(event.bar)).flatMap((event) => event.pitchClasses);
  assert.ok(pcs.includes(5), `expected F in development bars ${development.join(',')}, heard ${pcs.map((pc) => NAMES[pc]).join(' ')}`);
});

check('motif and collection conflict is reported when the return cannot keep a semitone', () => {
  const hit = colour.musicalEvidence.limitations?.find((item) => /selected collection/i.test(item.reason));
  assert.ok(hit, JSON.stringify(colour.musicalEvidence.limitations));
});

check('outside colour stays on continuation regions and a return flag keeps one authorised tone', () => {
  const row = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: 3340,
    world: 'E',
    outsideColour: true,
    continuation: 'sequence',
    musical: {
      pentatonic: {
        archetypeId: 'suspended_pentatonic',
        referenceNote: 'D',
        relationshipId: 'home',
        contrastId: 'hirajoshi',
      },
    },
  });
  assert.equal(row.ok, true);
  if (!row.ok) return;
  assert.ok(row.plan.regions.some((region) => region.role === 'continuation' && region.outsideColour === true));
  assert.ok(row.plan.regions.filter((region) => region.role === 'return').every((region) => region.outsideColour !== true));
  const pcs = pitchClassesIn(measureBody(guitarPart(row.xml), 38));
  assert.ok(pcs.length > 0);
  assert.ok(!pcs.includes(11));
  for (const pitchClass of pcs) assert.ok(HOME.has(pitchClass));
  const plan = structuredClone(row.plan);
  const returning = plan.regions.find((region) => region.role === 'return');
  assert.ok(returning);
  returning.outsideColour = true;
  const direct = composeBhlGuitar({
    sourcePath: SOURCE,
    span: SPAN,
    seed: 3340,
    world: 'E',
    plan,
    pentatonicPcs: [0, 2, 4, 7, 9],
    contrastPcs: [2, 4, 5, 9, 10],
  });
  const returnPcs = direct.events.filter((event) => event.bar === 38).flatMap((event) => event.pitchClasses);
  assert.ok(!returnPcs.includes(11), `B-natural leaked: ${returnPcs.map((pc) => NAMES[pc]).join(' ')}`);
  const outside = returnPcs.filter((pitchClass) => !HOME.has(pitchClass));
  assert.deepEqual([...new Set(outside)], [10]);
  const xmlPcs = pitchClassesIn(measureBody(guitarPart(direct.xml), 38));
  assert.ok(xmlPcs.includes(10));
  assert.ok(!xmlPcs.includes(11));
});

check('worlds A–D and F keep their return lines', () => {
  const expected: Record<Exclude<BhlWorldId, 'E'>, string> = {
    A: '10.11 0.10 7.9',
    B: '6 6.7 4',
    C: '5 5.6 3',
    D: '0.4.10 5 10',
    F: '3 4 1.11',
  };
  for (const world of ['A', 'B', 'C', 'D', 'F'] as const) {
    const row = worlds.find((item) => item.world === world);
    assert.ok(row);
    const region = row.plan.regions.find((item) => item.role === 'return');
    const heard = row.events
      .filter((event) => event.regionId === region?.id)
      .map((event) => event.pitchClasses.join('.'))
      .join(' ');
    assert.equal(heard, expected[world], world);
  }
});

check('six worlds still generate distinct locked guitar lines', () => {
  const signatures = new Set(worlds.map((row) => worldPitchSignature(row.events)));
  assert.equal(signatures.size, 6);
  for (const row of worlds) {
    assert.equal(row.verification.ok, true, row.world ?? '');
    assert.equal(row.sourceSha256, before);
  }
});

check('from-scratch guitar is pitched, and generated exports stay pitched across seeds, worlds, and lengths', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-repair-'));
  const canvas = buildBhlScratchScore({ bars: 16, beats: 4, beatType: 4, tempo: 92, seed: 3340, title: 'BHL from scratch' });
  const canvasGuitar = guitarPart(canvas.xml);
  assert.ok((canvasGuitar.match(/<pitch>/g) ?? []).length >= 8, 'scratch canvas guitar is still silent');
  assert.ok(!canvasGuitar.includes('<note><rest/><duration>8</duration><voice>1</voice><type>whole</type></note>'));
  for (const seed of [3340, 4401]) {
    for (const world of ['A', 'E'] as const) {
      for (const bars of [8, 16]) {
        const score = buildBhlScratchScore({ bars, beats: 4, beatType: 4, tempo: 92, seed, title: `repair-${world}-${bars}` });
        const file = path.join(dir, `scratch-${world}-${seed}-${bars}.musicxml`);
        fs.writeFileSync(file, score.xml);
        const row = apiBhlCompose({ sourcePath: file, span: { from: 1, to: bars }, seed, world });
        assert.equal(row.ok, true, `${world} ${seed} ${bars}`);
        if (!row.ok) continue;
        const guitar = guitarPart(row.xml);
        const pitches = guitar.match(/<pitch>/g) ?? [];
        assert.ok(pitches.length >= bars, `${world} ${seed} ${bars} exported ${pitches.length} guitar pitches`);
        assert.equal(row.verification.ok, true, row.verification.errors.join('; '));
        fs.writeFileSync(path.join(dir, `export-${world}-${seed}-${bars}.musicxml`), row.xml);
      }
    }
  }
  const quiet = apiBhlCompose({
    sourcePath: path.join(dir, 'scratch-A-3340-16.musicxml'),
    span: { from: 1, to: 16 },
    seed: 3340,
    world: 'A',
    musical: { riff: { pitchSource: 'world', rhythmSource: 'riff', pitchSeed: 17, rhythmSeed: 17, transform: 'rest', displacementQuarters: 0.5 } },
  });
  assert.equal(quiet.ok, true);
  if (quiet.ok) {
    assert.match(quiet.xml, /<rest\/>/);
    assert.ok((quiet.rhythmNotes ?? []).some((line) => /rest/i.test(line)));
  }
});

if (failed) {
  console.error(`\n${failed} BHL TARGETED REPAIR CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL BHL TARGETED REPAIR CHECKS PASS');
