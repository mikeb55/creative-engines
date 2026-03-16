/**
 * Wyble Acceptance Generator — deterministic proof that notation architecture works.
 * 8 bars, 2 voices, simple contrary/oblique motion, clean quarter/half structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Score } from '../../shared/scoreModel';
import { composeMeasure } from '../../shared/barComposer';
import { writeScoreToMusicXML } from '../../shared/barFirstMusicXMLWriter';
import { validateAcceptanceScore } from '../../shared/notationValidation';

const ROOT = path.resolve(__dirname, '..', '..');
const ACCEPTANCE_DIR = path.join(ROOT, 'outputs', 'wyble', 'acceptance');
const OUTPUT_PATH = path.join(ACCEPTANCE_DIR, 'wyble_acceptance.musicxml');
const VALIDATION_PATH = path.join(ACCEPTANCE_DIR, 'validation_report.json');

const PROGRESSION = [
  { chord: 'Dm7', bars: 2 },
  { chord: 'G7', bars: 2 },
  { chord: 'Cmaj7', bars: 4 },
];

const UPPER_PITCHES = [67, 65, 64, 62, 67, 65, 64, 60];
const LOWER_PITCHES = [55, 57, 55, 55, 55, 57, 55, 48];

function buildAcceptanceScore(): Score {
  const measures = [];
  for (let m = 0; m < 8; m++) {
    const chord = m < 2 ? 'Dm7' : m < 4 ? 'G7' : 'Cmaj7';
    const upperPitch = UPPER_PITCHES[m];
    const lowerPitch = LOWER_PITCHES[m];
    measures.push(composeMeasure(m, chord, [
      { voice: 1, staff: 1, part: 'P1', events: [{ pitch: upperPitch, startBeat: 0, duration: 2 }, { pitch: upperPitch, startBeat: 2, duration: 2 }] },
      { voice: 2, staff: 2, part: 'P1', events: [{ pitch: lowerPitch, startBeat: 0, duration: 4 }] },
    ]));
  }
  return { title: 'Wyble Acceptance', measures, parts: ['P1'] };
}

function main(): { success: boolean; errors: string[] } {
  fs.mkdirSync(ACCEPTANCE_DIR, { recursive: true });
  const score = buildAcceptanceScore();
  const validation = validateAcceptanceScore(score);

  fs.writeFileSync(VALIDATION_PATH, JSON.stringify(validation, null, 2), 'utf-8');

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const xml = writeScoreToMusicXML(score, {
    title: 'Wyble Acceptance',
    partNames: { P1: 'Guitar' },
    firstMeasureAttrs: () => `        <attributes>
      <divisions>4</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <staves>2</staves>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>G</sign><line>2</line></clef>
    </attributes>\n`,
  });

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  return { success: true, errors: [] };
}

const result = main();
if (!result.success) {
  console.error('Wyble acceptance validation failed:', result.errors);
  process.exit(1);
}
console.log('Wyble acceptance:', OUTPUT_PATH);
