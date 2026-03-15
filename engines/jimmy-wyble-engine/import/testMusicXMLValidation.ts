/**
 * MusicXML Import — Validation tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateMusicXMLContent } from './musicxmlValidation';

const FIXTURES = path.join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf-8');
}

let passed = 0;
let failed = 0;

function ok(cond: boolean, msg: string) {
  if (cond) { passed++; return; }
  failed++;
  console.error('FAIL:', msg);
}

function test(name: string, fn: () => void) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error('FAIL:', name, e);
  }
}

test('valid ii-V-I: passes validation', () => {
  const xml = loadFixture('ii_v_i_simple.xml');
  const err = validateMusicXMLContent(xml);
  ok(err === null, 'should pass validation');
});

test('valid blues: passes validation', () => {
  const xml = loadFixture('blues_simple.xml');
  const err = validateMusicXMLContent(xml);
  ok(err === null, 'should pass validation');
});

test('odd meter: fails validation', () => {
  const xml = loadFixture('odd_meter.xml');
  const err = validateMusicXMLContent(xml);
  ok(err !== null, 'should fail');
  ok(err?.code === 'UNSUPPORTED_METER', `code should be UNSUPPORTED_METER, got ${err?.code}`);
});

test('with repeat: fails validation', () => {
  const xml = loadFixture('with_repeat.xml');
  const err = validateMusicXMLContent(xml);
  ok(err !== null, 'should fail');
});

test('empty XML: fails validation', () => {
  const err = validateMusicXMLContent('');
  ok(err !== null, 'should fail');
  ok(err?.code === 'INVALID_XML', `code should be INVALID_XML, got ${err?.code}`);
});

console.log(`\nMusicXML Validation Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
