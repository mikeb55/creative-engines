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

/** One chord symbol per measure — slow harmonic rhythm; maj7/maj9 resting; unresolved dominants (hint). */
const CHORDS: string[] = [
  'Dbmaj9',
  'Dbmaj9',
  'Bbm7',
  'Bbm7',
  'G13sus',
  'G13sus',
  'Fmaj7#11',
  'Fmaj7#11',
  'Em7b5',
  'Em7b5',
  'A7alt',
  'A7alt',
  'Dmaj9',
  'Dmaj9',
  'Cmaj9/B',
  'Cmaj9/B',
  'Gm9',
  'Gm9',
  'C13',
  'C13',
  'Abmaj9',
  'Abmaj9',
  'E7#9',
  'E7#9',
  'Dbmaj9',
  'Dbmaj9',
  'Bbm7',
  'Bbm7',
  'G13sus',
  'G13sus',
  'Fmaj9',
  'Fmaj9',
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
