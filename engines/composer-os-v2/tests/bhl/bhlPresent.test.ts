/**
 * BHL presentation — title and staff-text placement.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlPresent.test.ts
 */
import assert from 'node:assert/strict';
import { presentBhlScore } from '../../core/bhl/bhlPresent';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';

const source = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>WHILE WE'RE HERE — WRONG TURNING</work-title></work>
  <movement-title>Integrated Guitar Study V2.4</movement-title>
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction placement="above"><direction-type><rehearsal default-y="72">A</rehearsal></direction-type></direction>
      <direction placement="above"><direction-type><words default-y="48">Head In</words></direction-type></direction>
      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120"/></direction>
      <direction placement="above"><direction-type><words default-y="14">E-cell field</words></direction-type></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="40">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <direction placement="above"><direction-type><rehearsal>C</rehearsal></direction-type></direction>
      <direction placement="above"><direction-type><words>Metric Interruption</words></direction-type></direction>
      <harmony placement="above" default-y="14"><root><root-step>F</root-step></root><kind text="(add4)">major</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>3</duration><type>half</type><dot/></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><pitch><step>E</step><octave>2</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="40">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>3</duration><type>half</type><dot/></note>
    </measure>
  </part>
</score-partwise>
`;

function events(xml: string): string {
  return [...xml.matchAll(/<(?:note|backup|forward)\b[\s\S]*?<\/(?:note|backup|forward)>/g)].map((match) => match[0]).join('\n');
}

const presented = presentBhlScore(source);
assert.equal(events(presented), events(source));
assert.match(presented, /<movement-title>WHILE WE'RE HERE — WRONG TURNING<\/movement-title>/);
assert.doesNotMatch(presented, /<movement-title>Integrated Guitar Study V2\.4<\/movement-title>/);
assert.match(presented, /<sound tempo="120"/);
assert.match(presented, /<beats>3<\/beats>/);
assert.match(presented, /<kind text="\(add4\)">major<\/kind>/);
const bar1 = /<measure number="1">([\s\S]*?)<\/measure>/.exec(presented)?.[1] ?? '';
assert.equal((bar1.match(/<direction[\s>]/g) ?? []).length, 2);
assert.match(bar1, /A&#10;Head In&#10;E-cell field/);
assert.doesNotMatch(bar1, /default-y=/);
const scratch = buildBhlScratchScore({ bars: 16, beats: 4, beatType: 4, tempo: 96, seed: 4400, title: 'BHL Batch B scratch' });
assert.equal(scratch.xml.includes('<part id="B"><measure number="1">'), true);
const bass = scratch.xml.split('<part id="B">')[1] ?? '';
assert.equal(bass.includes('<rehearsal>'), false);
assert.match(scratch.xml, /CANDIDATE FOR AUDITION/);
assert.match(scratch.xml, /<movement-title>BHL Batch B scratch<\/movement-title>/);
console.log('bhlPresent: PASS');
