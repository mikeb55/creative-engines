/**
 * Validates that MusicXML measures sum to expected duration (4/4 = 16 divisions).
 * Exits 0 if valid, 1 if invalid.
 */

import * as fs from 'fs';
import * as path from 'path';

const DIVISIONS = 4;
const MEASURE_DURATION = 4 * DIVISIONS;

function parseMeasures(xml: string): Map<number, number> {
  const measureDurations = new Map<number, number>();
  const measureRegex = /<measure\s+number="(\d+)">([\s\S]*?)<\/measure>/g;
  let m: RegExpExecArray | null;
  while ((m = measureRegex.exec(xml)) !== null) {
    const measureNum = parseInt(m[1], 10);
    const content = m[2];
    let total = 0;
    const noteDurations = [...content.matchAll(/<note>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
    const backupDurations = [...content.matchAll(/<backup>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
    const forwardDurations = [...content.matchAll(/<forward>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
    total = noteDurations.reduce((a, b) => a + b, 0) - backupDurations.reduce((a, b) => a + b, 0) + forwardDurations.reduce((a, b) => a + b, 0);
    measureDurations.set(measureNum, total);
  }
  return measureDurations;
}

function main(): { valid: boolean; errors: string[] } {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    return { valid: false, errors: ['File not found'] };
  }
  const xml = fs.readFileSync(filePath, 'utf-8');
  const measures = parseMeasures(xml);
  const errors: string[] = [];
  for (const [num, total] of measures) {
    if (total !== MEASURE_DURATION) {
      errors.push(`Measure ${num}: duration sum ${total} != expected ${MEASURE_DURATION}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

const result = main();
if (!result.valid) {
  result.errors.forEach((e) => console.error(`[validateMeasureDurations] ${e}`));
  process.exit(1);
}
process.exit(0);
