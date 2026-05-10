/**
 * ORBIT — Wheeler-style jazz waltz lead sheet (MusicXML 3.1).
 * Output: charts/Orbit/01_leadsheet/ORBIT-lead.xml
 *
 * Run: npx ts-node --project tsconfig.json scripts/generateOrbitLeadSheet.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateMusicXml } from '../src/utils/musicXmlValidator';
import { buildHarmonyXmlLine } from '../engines/core/chordSemantics';

const OUT_DIR = path.join(__dirname, '..', 'charts', 'Orbit', '01_leadsheet');
const OUT_FILE = path.join(OUT_DIR, 'ORBIT-lead.xml');

/** Concert melody pitches as MIDI (treble). Wide leaps (maj7, min9) — Wheeler-ish line. */
const MELODY_MIDI: number[][] = [
  [73, 71, 68],
  [73, 78, 76],
  [71, 68, 65],
  [68, 73, 71],
  [66, 71, 69],
  [69, 73, 71],
  [71, 76, 73],
  [73, 71, 68],
  [71, 68, 66],
  [69, 73, 78],
  [76, 71, 69],
  [71, 68, 65],
  [69, 73, 76],
  [74, 71, 69],
  [73, 76, 71],
  [71, 68, 73],
  [73, 71, 76],
  [78, 73, 71],
  [71, 76, 73],
  [73, 71, 68],
  [76, 71, 73],
  [74, 71, 76],
  [76, 73, 71],
  [71, 74, 71],
  [73, 71, 68],
  [71, 76, 73],
  [73, 71, 69],
  [68, 73, 71],
  [71, 76, 73],
  [73, 71, 68],
  [71, 73, 76],
  [73, 71, 68],
];

/**
 * 32-bar form (3/4): C intro 1–4 | A 5–20 (8-bar phrase ×2) | B 21–28 | C head-out 29–32.
 * Option A harmony (May 2026 structure lock).
 */
const A8: string[] = [
  'Fmaj7#11',
  'Ebmaj7#5',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'Abmaj7',
  'Gbmaj7',
  'Emaj7',
];
const B4: string[] = ['Gmaj7/F', 'Gmaj7/F', 'Ebmaj7/F', 'Ebmaj7/F'];
const CHORDS: string[] = [
  'Dbmaj7',
  'Bb7',
  'Fmaj7',
  'Fmaj7',
  ...A8,
  ...A8,
  ...B4,
  ...B4,
  'Dbmaj7',
  'Bb7',
  'Fmaj7',
  'Fmaj7',
];

const DIVISIONS = 24;
const BEATS_PER_MEASURE = 3;

function midiToStepAlterOctave(m: number): { step: string; alter: number; octave: number } {
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  const map: { step: string; alter: number }[] = [
    { step: 'C', alter: 0 },
    { step: 'D', alter: -1 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: -1 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'G', alter: -1 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: -1 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: -1 },
    { step: 'B', alter: 0 },
  ];
  const { step, alter } = map[pc]!;
  return { step, alter, octave };
}

function pitchXml(midi: number): string {
  const { step, alter, octave } = midiToStepAlterOctave(midi);
  const altEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
  return `<pitch><step>${step}</step>${altEl}<octave>${octave}</octave></pitch>`;
}

function noteQuarter(midi: number): string {
  const dur = DIVISIONS;
  return `<note>
${pitchXml(midi)}
<duration>${dur}</duration>
<voice>1</voice>
<type>quarter</type>
<stem>up</stem>
</note>`;
}

function measureXml(measureNum: number, chords: string, midiTriplet: number[]): string {
  const harmony =
    chords.trim().length > 0 ? buildHarmonyXmlLine(chords, { staffNumber: 1 }) : '';
  const notes = midiTriplet.map((m) => noteQuarter(m)).join('\n');
  const attrs =
    measureNum === 1
      ? `<attributes>
<divisions>${DIVISIONS}</divisions>
<key><fifths>0</fifths><mode>none</mode></key>
<time><beats>${BEATS_PER_MEASURE}</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef>
</attributes>
<direction placement="above">
<direction-type>
<words font-weight="bold" font-size="12">Jazz waltz</words>
</direction-type>
</direction>
<sound tempo="168"/>
<direction placement="above">
<direction-type>
<metronome parentheses="no">
<beat-unit>quarter</beat-unit>
<per-minute>168</per-minute>
</metronome>
</direction-type>
</direction>`
      : '';

  return `<measure number="${measureNum}">
${attrs}${harmony}${notes}
</measure>`;
}

function buildScore(): string {
  if (MELODY_MIDI.length !== 32 || CHORDS.length !== 32) {
    throw new Error('Orbit lead sheet: expect 32 bars melody + chords');
  }
  const measures = MELODY_MIDI.map((triplet, i) =>
    measureXml(i + 1, CHORDS[i]!, triplet)
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
<work><work-title>Orbit</work-title></work>
<identification>
<encoding>
<software>Composer OS — Orbit chart generator</software>
</encoding>
</identification>
<part-list>
<score-part id="P1">
<part-name>Lead Sheet</part-name>
<score-instrument id="P1-I1"><instrument-name>Concert Lead</instrument-name></score-instrument>
</score-part>
</part-list>
<part id="P1">
${measures}
</part>
</score-partwise>`;
}

function main(): void {
  const xml = buildScore();
  const v = validateMusicXml(xml);
  if (!v.valid) {
    console.error('validateMusicXml failed:', v.errors);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, xml, 'utf-8');
  console.log('Wrote', OUT_FILE);
}

main();
