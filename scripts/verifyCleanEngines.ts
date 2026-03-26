/**
 * Verification: Wyble, Counterpoint, Ellington — structural correctness.
 * No fixes. Hard truth only.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  wyble: path.join(ROOT, 'outputs', 'wyble', 'clean', 'wyble_clean.musicxml'),
  counterpoint: path.join(ROOT, 'outputs', 'counterpoint', 'clean', 'counterpoint_clean.musicxml'),
  ellington: path.join(ROOT, 'outputs', 'ellington', 'clean', 'ellington_clean.musicxml'),
};

interface Result {
  fileExists: boolean;
  fileSize: number;
  measureCount: number;
  measuresValid: boolean;
  voicesValid: boolean;
  rangeValid: boolean;
  errors: string[];
}

function parseMeasures(text: string): { divisions: number; parts: Array<{ id: string; durations: number[] }> } {
  const divisionsMatch = text.match(/<divisions>(\d+)<\/divisions>/);
  const divisions = divisionsMatch ? parseInt(divisionsMatch[1], 10) : 0;

  const parts: Array<{ id: string; durations: number[] }> = [];
  const partMatches = text.matchAll(/<part id="([^"]+)">([\s\S]*?)<\/part>/g);
  for (const m of partMatches) {
    const partId = m[1];
    const partXml = m[2];
    const measureBlocks = partXml.matchAll(/<measure number="(\d+)">([\s\S]*?)<\/measure>/g);
    const durations: number[] = [];
    for (const mm of measureBlocks) {
      const measureXml = mm[2];
      let total = 0;
      const noteDurs = measureXml.matchAll(/<duration>(\d+)<\/duration>/g);
      for (const nd of noteDurs) {
        total += parseInt(nd[1], 10);
      }
      durations.push(total);
    }
    parts.push({ id: partId, durations });
  }

  return { divisions, parts };
}

function verifyWyble(filePath: string): Result {
  const r: Result = { fileExists: false, fileSize: 0, measureCount: 0, measuresValid: false, voicesValid: false, rangeValid: true, errors: [] };

  if (!fs.existsSync(filePath)) {
    r.errors.push('File does not exist');
    return r;
  }
  r.fileExists = true;

  const stat = fs.statSync(filePath);
  r.fileSize = stat.size;
  if (r.fileSize <= 0) r.errors.push('File size is 0');

  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes('<measure')) r.errors.push('Missing <measure> tags');

  const measureMatches = text.match(/<measure/g);
  r.measureCount = measureMatches ? measureMatches.length : 0;

  const { divisions, parts } = parseMeasures(text);
  const expectedPerMeasure = 16;
  if (divisions !== 4) r.errors.push(`Expected divisions=4, got ${divisions}`);

  for (const part of parts) {
    if (part.durations.length !== 8) r.errors.push(`Part ${part.id}: expected 8 measures, got ${part.durations.length}`);
    for (let i = 0; i < part.durations.length; i++) {
      const dur = part.durations[i];
      if (dur !== expectedPerMeasure) r.errors.push(`Part ${part.id} measure ${i + 1}: expected 16, got ${dur}`);
      if (dur === 0) r.errors.push(`Part ${part.id} measure ${i + 1}: empty measure`);
    }
  }

  const allMeasuresOk = parts.length === 2 && parts.every((p) => p.durations.length === 8 && p.durations.every((v) => v === 16));
  r.measuresValid = allMeasuresOk && divisions === 4;
  r.voicesValid = allMeasuresOk;
  return r;
}

function verifyCounterpoint(filePath: string): Result {
  const r: Result = { fileExists: false, fileSize: 0, measureCount: 0, measuresValid: false, voicesValid: false, rangeValid: true, errors: [] };

  if (!fs.existsSync(filePath)) {
    r.errors.push('File does not exist');
    return r;
  }
  r.fileExists = true;

  const stat = fs.statSync(filePath);
  r.fileSize = stat.size;
  if (r.fileSize <= 0) r.errors.push('File size is 0');

  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes('<measure')) r.errors.push('Missing <measure> tags');

  const measureMatches = text.match(/<measure/g);
  r.measureCount = measureMatches ? measureMatches.length : 0;

  const { divisions, parts } = parseMeasures(text);
  const expectedPerMeasure = 16;
  if (divisions !== 4) r.errors.push(`Expected divisions=4, got ${divisions}`);

  for (const part of parts) {
    if (part.durations.length !== 8) r.errors.push(`Part ${part.id}: expected 8 measures, got ${part.durations.length}`);
    for (let i = 0; i < part.durations.length; i++) {
      const dur = part.durations[i];
      if (dur !== expectedPerMeasure) r.errors.push(`Part ${part.id} measure ${i + 1}: expected 16, got ${dur}`);
      if (dur === 0) r.errors.push(`Part ${part.id} measure ${i + 1}: empty measure`);
    }
  }

  const allMeasuresOk = parts.length === 2 && parts.every((p) => p.durations.length === 8 && p.durations.every((v) => v === 16));
  r.measuresValid = allMeasuresOk && divisions === 4;
  r.voicesValid = allMeasuresOk;
  return r;
}

function verifyEllington(filePath: string): Result {
  const r: Result = { fileExists: false, fileSize: 0, measureCount: 0, measuresValid: false, voicesValid: false, rangeValid: true, errors: [] };

  if (!fs.existsSync(filePath)) {
    r.errors.push('File does not exist');
    return r;
  }
  r.fileExists = true;

  const stat = fs.statSync(filePath);
  r.fileSize = stat.size;
  if (r.fileSize <= 0) r.errors.push('File size is 0');

  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes('<measure')) r.errors.push('Missing <measure> tags');

  const measureMatches = text.match(/<measure/g);
  r.measureCount = measureMatches ? measureMatches.length : 0;

  const { divisions, parts } = parseMeasures(text);
  const expectedPerMeasure = 16;
  if (divisions !== 4) r.errors.push(`Expected divisions=4, got ${divisions}`);

  for (const part of parts) {
    if (part.durations.length !== 8) r.errors.push(`Part ${part.id}: expected 8 measures, got ${part.durations.length}`);
    for (let i = 0; i < part.durations.length; i++) {
      const dur = part.durations[i];
      if (dur !== expectedPerMeasure && dur !== 0) r.errors.push(`Part ${part.id} measure ${i + 1}: expected 16 or 0, got ${dur}`);
    }
  }

  const allMeasuresOk = parts.length === 16 && parts.every((p) => p.durations.length === 8 && p.durations.every((v) => v === 16 || v === 0));
  r.measuresValid = allMeasuresOk && divisions === 4;
  r.voicesValid = parts.length === 16 && parts.every((p) => p.durations.length === 8);

  const pitchMatches = text.matchAll(/<step>([A-G])<\/step>(?:<alter>(-?\d+)<\/alter>)?<octave>(\d+)<\/octave>/g);
  for (const m of pitchMatches) {
    const step = m[1];
    const alter = m[2] ? parseInt(m[2], 10) : 0;
    const octave = parseInt(m[3], 10);
    const stepToSemitone: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midi = (octave + 1) * 12 + (stepToSemitone[step] ?? 0) + alter;
    if (midi < 0 || midi > 127) r.errors.push(`Note out of MIDI range: ${midi}`);
  }

  r.rangeValid = !r.errors.some((e) => e.includes('MIDI range'));
  return r;
}

function main(): void {
  console.log('=== VERIFICATION: Wyble, Counterpoint, Ellington ===\n');

  const wyble = verifyWyble(FILES.wyble);
  const counterpoint = verifyCounterpoint(FILES.counterpoint);
  const ellington = verifyEllington(FILES.ellington);

  console.log('Wyble:', wyble.errors.length ? wyble.errors.join('; ') : 'OK');
  console.log('Counterpoint:', counterpoint.errors.length ? counterpoint.errors.join('; ') : 'OK');
  console.log('Ellington:', ellington.errors.length ? ellington.errors.join('; ') : 'OK');

  const wybleOk = wyble.fileExists && wyble.fileSize > 0 && wyble.measuresValid && wyble.voicesValid;
  const cpOk = counterpoint.fileExists && counterpoint.fileSize > 0 && counterpoint.measuresValid && counterpoint.voicesValid;
  const ellOk = ellington.fileExists && ellington.fileSize > 0 && ellington.measuresValid && ellington.voicesValid && ellington.rangeValid;

  console.log('\n--- RESULTS ---');
  console.log('Wyble: measures', wyble.measuresValid ? 'PASS' : 'FAIL', '| voices', wyble.voicesValid ? 'PASS' : 'FAIL');
  console.log('Counterpoint: measures', counterpoint.measuresValid ? 'PASS' : 'FAIL', '| voices', counterpoint.voicesValid ? 'PASS' : 'FAIL');
  console.log('Ellington: measures', ellington.measuresValid ? 'PASS' : 'FAIL', '| voices', ellington.voicesValid ? 'PASS' : 'FAIL', '| range', ellington.rangeValid ? 'PASS' : 'FAIL');
}

main();
