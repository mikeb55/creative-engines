/**
 * ORBIT — cleaned concert lead (MusicXML 3.1): 32 bars 3/4, eighth-based jazz phrasing.
 * Output: projects/Orbit/Orbit_cleaned_lead.musicxml
 *
 * Melodic pitch rows match scripts/generateOrbitLeadSheet.ts (Wheeler-ish contour).
 * Run: npx ts-node --project tsconfig.json scripts/generateOrbitCleanedLead.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildHarmonyXmlLine } from '../engines/core/chordSemantics';
import { validateMusicXml } from '../src/utils/musicXmlValidator';

const OUT_FILE = path.join(__dirname, '..', 'projects', 'Orbit', 'Orbit_cleaned_lead.musicxml');

const DIVISIONS = 24;
const BEATS_PER_MEASURE = 3;

/** Same 32×3 MIDI rows as generateOrbitLeadSheet.ts */
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

const A8 = [
  'Fmaj7#11',
  'Ebmaj7#5',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'Abmaj7',
  'Gbmaj7',
  'Emaj7',
];
const B4 = ['Gmaj7/F', 'Gmaj7/F', 'Ebmaj7/F', 'Ebmaj7/F'];
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
  return `<note>
${pitchXml(midi)}
<duration>24</duration>
<voice>1</voice>
<type>quarter</type>
<stem>up</stem>
</note>`;
}

/** Two tied quarters (beats 1–2) + quarter beat 3 — durations sum to 72. */
function measureTiedHalfPlusQuarter(pHalf: number, pThird: number): string {
  return `<note>
${pitchXml(pHalf)}
<duration>24</duration>
<voice>1</voice>
<type>quarter</type>
<stem>up</stem>
<tie type="start"/>
<notations><tied type="start"/></notations>
</note>
<note>
${pitchXml(pHalf)}
<duration>24</duration>
<voice>1</voice>
<type>quarter</type>
<stem>up</stem>
<tie type="stop"/>
<notations><tied type="stop"/></notations>
</note>
${noteQuarter(pThird)}`;
}

function eighthBeams(positionInBeat: 0 | 1): string {
  if (positionInBeat === 0) return `<beam number="1">begin</beam>`;
  return `<beam number="1">end</beam>`;
}

function noteEighth(midi: number, pos: 0 | 1): string {
  return `<note>
${pitchXml(midi)}
<duration>12</duration>
<voice>1</voice>
<type>eighth</type>
<stem>up</stem>
${eighthBeams(pos)}
</note>`;
}

/** Six eighths: double each melody pitch (two per beat). */
function measureSixEighths(p: number[]): string {
  const [p0, p1, p2] = p;
  const seq = [p0, p0, p1, p1, p2, p2];
  const parts: string[] = [];
  let i = 0;
  for (let j = 0; j < 3; j++) {
    parts.push(noteEighth(seq[i]!, 0));
    i++;
    parts.push(noteEighth(seq[i]!, 1));
    i++;
  }
  return parts.join('\n');
}

/** Beat 1 = triplet eighths (3:2); beats 2–3 = plain eighth pairs. */
function measureTripletOpening(p: number[]): string {
  const [p0, p1, p2] = p;
  const tDur = 8;
  const tupletNotes = [
    { midi: p0, beam: 'begin' as const },
    { midi: p1, beam: 'continue' as const },
    { midi: p2, beam: 'end' as const },
  ];
  const trip = tupletNotes
    .map(
      (tn, idx) =>
        `<note>
${pitchXml(tn.midi)}
<duration>${tDur}</duration>
<voice>1</voice>
<type>eighth</type>
<stem>up</stem>
<beam number="1">${tn.beam}</beam>
<time-modification>
<actual-notes>3</actual-notes>
<normal-notes>2</normal-notes>
</time-modification>${
          idx === 0
            ? `
<notations><tuplet type="start" bracket="yes"/></notations>`
            : idx === 2
              ? `
<notations><tuplet type="stop"/></notations>`
              : ''
        }
</note>`
    )
    .join('\n');

  return `${trip}
${noteEighth(p1, 0)}
${noteEighth(p2, 1)}
${noteEighth(p2, 0)}
${noteEighth(p0, 1)}`;
}

function measureBody(measureNum: number): string {
  const idx = measureNum - 1;
  const p = MELODY_MIDI[idx]!;
  if (measureNum <= 4 || measureNum >= 29) {
    return p.map((m) => noteQuarter(m)).join('\n');
  }
  if (measureNum === 8 || measureNum === 16 || measureNum === 24) {
    return measureTripletOpening(p);
  }
  if (measureNum === 11 || measureNum === 19) {
    return measureTiedHalfPlusQuarter(p[0]!, p[2]!);
  }
  return measureSixEighths(p);
}

function measureXml(measureNum: number): string {
  const chords = CHORDS[measureNum - 1]!;
  const harmony =
    chords.trim().length > 0 ? buildHarmonyXmlLine(chords, { staffNumber: 1 }) : '';
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
<words font-weight="bold" font-size="12">Jazz waltz · Orbit</words>
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
${attrs}${harmony}${measureBody(measureNum)}
</measure>`;
}

function buildScore(): string {
  if (MELODY_MIDI.length !== 32 || CHORDS.length !== 32) {
    throw new Error('Orbit cleaned lead: expect 32 bars');
  }
  const measures = Array.from({ length: 32 }, (_, i) => measureXml(i + 1)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
<work><work-title>Orbit</work-title></work>
<identification>
<encoding>
<software>Composer OS — Orbit cleaned lead</software>
</encoding>
</identification>
<part-list>
<score-part id="P1">
<part-name>Guitar</part-name>
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
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, xml, 'utf-8');
  console.log('Wrote', OUT_FILE);
}

main();
