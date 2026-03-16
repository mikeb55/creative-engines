/**
 * Counterpoint Acceptance Generator — deterministic proof that notation architecture works.
 * 8 bars, 2 lines, explicit bar structure, simple counterpoint.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Score } from '../../shared/scoreModel';
import { composeMeasure } from '../../shared/barComposer';
import { writeScoreToMusicXML } from '../../shared/barFirstMusicXMLWriter';
import { validateAcceptanceScore } from '../../shared/notationValidation';

const ROOT = path.resolve(__dirname, '..', '..');
const ACCEPTANCE_DIR = path.join(ROOT, 'outputs', 'counterpoint', 'acceptance');
const OUTPUT_PATH = path.join(ACCEPTANCE_DIR, 'counterpoint_acceptance.musicxml');
const VALIDATION_PATH = path.join(ACCEPTANCE_DIR, 'validation_report.json');

function buildAcceptanceScore(): Score {
  const measures = [];
  const line1Pitches = [60, 62, 64, 65, 67, 65, 64, 60];
  const line2Pitches = [48, 50, 52, 53, 55, 53, 52, 48];
  for (let m = 0; m < 8; m++) {
    const chord = m < 2 ? 'Dm7' : m < 4 ? 'G7' : 'Cmaj7';
    measures.push(composeMeasure(m, chord, [
      { voice: 1, staff: 1, part: 'P1', events: [{ pitch: line1Pitches[m], startBeat: 0, duration: 4 }] },
      { voice: 1, staff: 1, part: 'P2', events: [{ pitch: line2Pitches[m], startBeat: 0, duration: 4 }] },
    ]));
  }
  return { title: 'Counterpoint Acceptance', measures, parts: ['P1', 'P2'] };
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
    title: 'Counterpoint Acceptance',
    partNames: { P1: 'Voice 1', P2: 'Voice 2' },
  });

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  return { success: true, errors: [] };
}

const result = main();
if (!result.success) {
  console.error('Counterpoint acceptance validation failed:', result.errors);
  process.exit(1);
}
console.log('Counterpoint acceptance:', OUTPUT_PATH);
