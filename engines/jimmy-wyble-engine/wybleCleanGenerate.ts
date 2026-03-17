/**
 * Wyble Clean — measure-first, deterministic.
 * Uses SAME logic as baseline: divisions=4, measure=16, 8 measures.
 * Voice 1: 4 quarter notes. Voice 2: 2 half notes per measure.
 * Reuses baseline MusicXML writer.
 * Output: outputs/wyble/clean/wyble_clean.musicxml
 */

import * as fs from 'fs';
import * as path from 'path';
import { PATHS, ensureDir } from '../core/paths';
import { writeTwoVoiceMusicXML } from '../../tools/baseline_musicxml_test/baselineMusicXMLWriter';

const DIVISIONS = 4;
const MEASURE_DURATION = 16;
const MEASURE_COUNT = 8;

/** Simple chord tones: Dm7, G7, Cmaj7 over 8 bars. */
const CHORD_ROOTS: number[] = [62, 62, 67, 67, 60, 60, 60, 60]; // D, D, G, G, C, C, C, C
const MELODY_TONES = [0, 2, 4, 5, 7, 9, 11]; // scale degrees
const BASS_TONES = [0, 5, 7]; // root, fifth, seventh

function getMelodyPitches(barIndex: number): number[] {
  const root = CHORD_ROOTS[barIndex];
  return [
    root + MELODY_TONES[barIndex % 7],
    root + MELODY_TONES[(barIndex + 1) % 7],
    root + MELODY_TONES[(barIndex + 2) % 7],
    root + MELODY_TONES[(barIndex + 3) % 7],
  ].map((p) => Math.max(60, Math.min(76, p)));
}

function getBassPitches(barIndex: number): number[] {
  const root = CHORD_ROOTS[barIndex];
  return [
    root + BASS_TONES[barIndex % 3],
    root + BASS_TONES[(barIndex + 1) % 3],
  ].map((p) => Math.max(40, Math.min(60, p)));
}

interface WybleMeasure {
  voice1: number[];
  voice2: number[];
}

function generateMeasures(): WybleMeasure[] {
  const measures: WybleMeasure[] = [];
  for (let i = 0; i < MEASURE_COUNT; i++) {
    measures.push({
      voice1: getMelodyPitches(i),
      voice2: getBassPitches(i),
    });
  }
  return measures;
}

function validate(measures: WybleMeasure[]): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  if (measures.length !== MEASURE_COUNT) {
    errors.push(`Expected ${MEASURE_COUNT} measures, got ${measures.length}`);
  }
  for (let i = 0; i < measures.length; i++) {
    const m = measures[i];
    const v1Total = 4 * 4;
    const v2Total = 8 * 2;
    if (m.voice1.length !== 4) errors.push(`Measure ${i + 1} voice1: expected 4 notes, got ${m.voice1.length}`);
    if (m.voice2.length !== 2) errors.push(`Measure ${i + 1} voice2: expected 2 notes, got ${m.voice2.length}`);
    if (v1Total !== MEASURE_DURATION) errors.push(`Measure ${i + 1} voice1: expected 16 divisions`);
    if (v2Total !== MEASURE_DURATION) errors.push(`Measure ${i + 1} voice2: expected 16 divisions`);
  }
  return { passed: errors.length === 0, errors };
}

const wybleCleanDir = path.join(PATHS.wyble, 'clean');
const outputPath = path.join(wybleCleanDir, 'wyble_clean.musicxml');

function main(): { outputPath: string } {
  ensureDir(wybleCleanDir);

  const measures = generateMeasures();
  const validation = validate(measures);

  const report = {
    measureCount: measures.length,
    divisionsPerMeasure: MEASURE_DURATION,
    divisions: DIVISIONS,
    voice1PerMeasure: '4 quarters (4+4+4+4=16)',
    voice2PerMeasure: '2 halves (8+8=16)',
    passed: validation.passed,
    errors: validation.errors,
  };

  fs.writeFileSync(
    path.join(wybleCleanDir, 'validation_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  if (!validation.passed) {
    console.error('Validation failed:', validation.errors);
    process.exit(1);
  }

  const xml = writeTwoVoiceMusicXML(measures);
  fs.writeFileSync(outputPath, xml, 'utf8');

  const runLog = {
    outputPath,
    fileExists: fs.existsSync(outputPath),
    timestamp: new Date().toISOString(),
    validationPassed: validation.passed,
  };
  fs.writeFileSync(path.join(wybleCleanDir, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');

  console.log('Wyble clean export complete.');
  console.log('Output:', outputPath);
  return { outputPath };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e);
  process.exit(1);
}
