/**
 * MusicXML Import — Wyble engine integration tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseMusicXMLToProgression } from './parseMusicXMLToProgression';
import { generateWybleEtude } from '../wybleEngine';
import { evaluateWybleStudy } from '../wybleAutoTest';
import type { HarmonicContext } from '../wybleTypes';

const FIXTURES = path.join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf-8');
}

function progressionToHarmonicContext(progression: { chord: string; bars: number }[]): HarmonicContext {
  const chords = progression.map(({ chord, bars }) => {
    const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7|dim|aug|m7b5)?/i);
    if (!match) return { root: 'C', quality: 'maj', bars };
    let q = (match[2] ?? 'maj').toLowerCase();
    if (q === 'm7' || q === 'min7' || q === 'm7b5') q = 'min';
    if (q === '7' || q === 'dom7') q = 'dom';
    if (q === 'maj7') q = 'maj';
    return { root: match[1], quality: q, bars };
  });
  return { chords, key: 'C' };
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

test('parsed ii-V-I feeds Wyble engine', () => {
  const xml = loadFixture('ii_v_i_simple.xml');
  const result = parseMusicXMLToProgression(xml);
  ok(result.success === true, 'parse should succeed');
  if (!result.success) return;
  const harmonicContext = progressionToHarmonicContext(result.progression);
  const output = generateWybleEtude({
    harmonicContext,
    phraseLength: result.totalBars,
    independenceBias: 0.8,
    contraryMotionBias: 0.7,
    dyadDensity: 0.6,
  });
  ok(output.upper_line.events.length > 0, 'should have upper line events');
  ok(output.lower_line.events.length > 0, 'should have lower line events');
  ok(output.implied_harmony.length > 0, 'should have implied harmony');
});

test('parsed blues feeds Wyble engine', () => {
  const xml = loadFixture('blues_simple.xml');
  const result = parseMusicXMLToProgression(xml);
  ok(result.success === true, 'parse should succeed');
  if (!result.success) return;
  const harmonicContext = progressionToHarmonicContext(result.progression);
  const output = generateWybleEtude({
    harmonicContext,
    phraseLength: result.totalBars,
  });
  ok(output.upper_line.events.length > 0, 'should have upper line events');
  ok(output.lower_line.events.length > 0, 'should have lower line events');
});

test('imported progression preserves playability', () => {
  const xml = loadFixture('ii_v_i_simple.xml');
  const result = parseMusicXMLToProgression(xml);
  ok(result.success === true, 'parse should succeed');
  if (!result.success) return;
  const harmonicContext = progressionToHarmonicContext(result.progression);
  let violations = 0;
  for (let i = 0; i < 5; i++) {
    const output = generateWybleEtude({
      harmonicContext,
      phraseLength: result.totalBars,
    });
    const score = evaluateWybleStudy(output);
    const upperDyads = output.upper_line.events.filter(e => e.isDyad);
    const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
    for (let j = 0; j < Math.min(upperDyads.length, lowerDyads.length); j++) {
      const iv = upperDyads[j].pitch - lowerDyads[j].pitch;
      if (iv > 18 || iv < 0) violations++;
    }
  }
  ok(violations === 0, `playability violations should be 0, got ${violations}`);
});

console.log(`\nMusicXML-Wyble Integration Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
