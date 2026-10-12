/**
 * WPS V1.3 Tonality Vault candidates. Does not edit The Mirror V1.1.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wpsV13.test.ts
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TONALITY_VAULT_DATABASE } from '../core/harmony/tonalityVaultDatabase';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { runWps } from '../core/wwh/wps/wpsAssess';
import {
  liquidHarmonyCandidates,
  mirrorBars30to33MusicXml,
  proposeMirrorBars30to33,
  proposeWpsVaultPassage,
  reduceShellVersusTriad,
  resolutionTensionCandidates,
  shellAndTriadCandidates,
} from '../core/wwh/wps/wpsVaultHarmony';
import {
  pitchClassOf,
  spellName,
  WPS_VAULT_TONALITIES,
  wpsVaultTonality,
  type Spelled,
} from '../core/wwh/wps/wpsTonalityVaultRecord';
import type { WpsSongSpec } from '../core/wwh/wps/wpsTypes';

const here = path.dirname(fileURLToPath(import.meta.url));
const specDir = path.resolve(here, '../core/wwh/wps/specs');
const fixturePath = path.resolve(here, '../core/wwh/wps/fixtures/03-the-mirror-bars-30-33-v13-candidate.musicxml');
const mirrorEdition =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/03-The-Mirror/03-The-Mirror-Performance-Edition-V1.1.musicxml';
const C: Spelled = { step: 'C', alter: 0 };

function pcs(notes: readonly Spelled[]): number[] {
  return notes.map(pitchClassOf).sort((a, b) => a - b);
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('sixteen manual tonalities, and the old database is untouched', () => {
    assert.equal(WPS_VAULT_TONALITIES.length, 16);
    assert.deepEqual(
      WPS_VAULT_TONALITIES.map((row) => row.volume),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    );
    assert.equal(TONALITY_VAULT_DATABASE.length, 17);
    const oldMaj7 = TONALITY_VAULT_DATABASE.find((row) => row.chordType === 'Maj7');
    assert.equal(oldMaj7?.melodicTriadQuality, 'major');
    assert.equal(WPS_VAULT_TONALITIES.some((row) => row.id === 'maj6'), false);
  });

  check('Cmaj7 is an E minor triad and Cmaj7#5 is an E major triad', () => {
    const maj7 = wpsVaultTonality('maj7')!;
    const sharp5 = wpsVaultTonality('maj7-sharp5')!;
    assert.equal(maj7.melodicTriad.quality, 'minor');
    assert.deepEqual(maj7.melodicTriad.notes.map(spellName), ['E', 'G', 'B']);
    assert.deepEqual(maj7.shell.map(spellName), ['C', 'E', 'B']);
    assert.equal(sharp5.melodicTriad.quality, 'major');
    assert.deepEqual(sharp5.melodicTriad.notes.map(spellName), ['E', 'G#', 'B']);
    assert.equal(sharp5.tensionTriad.quality, 'diminished');
    assert.deepEqual(sharp5.tensionTriad.notes.map(spellName), ['F#', 'A', 'C']);
    assert.notDeepEqual(pcs(maj7.melodicTriad.notes), pcs(sharp5.melodicTriad.notes));
  });

  check('half-diminished and diminished keep the manual triads', () => {
    const half = wpsVaultTonality('min7b5')!;
    assert.deepEqual(half.shell.map(spellName), ['C', 'Eb', 'Bb']);
    assert.equal(half.shell.some((note) => spellName(note) === 'Gb'), false);
    assert.deepEqual(half.melodicTriad.notes.map(spellName), ['Eb', 'Gb', 'Bb']);
    assert.equal(half.tensionTriad.quality, 'minor');
    assert.equal(half.layerTwoAgreesWithPairPage, false);
    const dim = wpsVaultTonality('dim7-b13')!;
    assert.equal(dim.melodicTriad.quality, 'major');
    assert.deepEqual(dim.melodicTriad.notes.map(spellName), ['Ab', 'C', 'Eb']);
    assert.equal(dim.shell.map(spellName).includes('Gb'), true);
  });

  check('shared triads still differ by shell or tension, and every pair is spelled', () => {
    const seen = new Map<string, string>();
    for (const row of WPS_VAULT_TONALITIES) {
      const triad = row.melodicTriad.notes.map(spellName).join(' ');
      const prior = seen.get(triad);
      const identity = `${row.shell.map(spellName).join(' ')}|${spellName(row.primaryTension)}|${row.tensionTriad.notes.map(spellName).join(' ')}`;
      if (prior) assert.notEqual(prior, identity, triad);
      seen.set(triad, identity);
      assert.equal(row.resolutionTriad.notes.map(spellName).join(' '), triad);
      assert.equal(row.tensionTriad.notes.length, 3);
      assert.equal(row.primaryQuadratonic.notes.length, 4);
      assert.equal(row.tensionQuadratonic.notes.length >= 4, true);
      assert.equal(row.chaos === null, row.id !== '13b9' && row.id !== 'min11');
    }
    assert.equal(seen.size < 16, true);
  });

  check('liquid step holds two pitch classes and moves one', () => {
    const liquid = liquidHarmonyCandidates({
      tonalityId: 'maj7-sharp5',
      root: C,
      technique: 'liquid',
      fromBar: 1,
      stringGroup: '3-2-1',
      direction: 'resolve',
    });
    assert.equal(liquid.events.length, 2);
    assert.equal(liquid.technicalFeasible, true, liquid.note);
    assert.equal(liquid.humanPlayability, 'NOT VERIFIED');
    for (const item of liquid.events) {
      assert.equal(item.pitches.length, 3);
      assert.equal(item.durationQuarters, 2);
      const strings = item.pitches.map((pitch) => pitch.stringNumber);
      assert.deepEqual(strings.slice().sort((a, b) => a - b), [1, 2, 3]);
    }
    const pcsOf = (index: number) => liquid.events[index]!.pitches.map((pitch) => (pitch.midi % 12 + 12) % 12).sort((a, b) => a - b);
    const first = pcsOf(0);
    const second = pcsOf(1);
    const held = first.filter((pc) => second.includes(pc));
    assert.equal(held.length, 2);
    assert.notDeepEqual(first, second);
    assert.equal(liquid.events[0]!.onsetQuarters, 0);
    assert.equal(liquid.events[1]!.onsetQuarters, 2);
  });

  check('shell, reduction, and triad pair are simultaneous chords', () => {
    const shell = shellAndTriadCandidates({
      tonalityId: 'maj7-sharp5',
      root: C,
      technique: 'shell-triad',
      fromBar: 1,
      bassPitchClasses: [0],
      stringGroup: '3-2-1',
    });
    assert.equal(shell.events.length >= 1, true, shell.note);
    assert.equal(shell.events.every((item) => item.pitches.length >= 2), true);
    assert.equal(shell.events.some((item) => item.pitches.some((pitch) => pitch.midi % 12 === 0 && pitch.stringNumber >= 4)), false);
    const reduced = reduceShellVersusTriad({
      tonalityId: 'maj7',
      root: C,
      technique: 'reduction',
      fromBar: 1,
      bassPitchClasses: [4],
    });
    assert.equal(reduced.technicalFeasible, true, reduced.note);
    assert.equal(reduced.events.every((item) => item.pitches.every((pitch) => pitch.midi % 12 !== 4)), true);
    const pair = resolutionTensionCandidates({
      tonalityId: 'maj7-sharp5',
      root: C,
      technique: 'triad-pair',
      fromBar: 1,
      seed: 16,
    });
    assert.equal(pair.events.length, 2, pair.note);
    assert.equal(pair.events.every((item) => item.pitches.length >= 2), true);
    assert.equal(pair.pairEngine === 'realizeTriadPair' || pair.pairEngine === 'reduction', true);
    const groups = new Set(pair.events.flatMap((item) => item.pitches.map((pitch) => pitch.stringNumber)));
    for (const stringNumber of groups) assert.equal(stringNumber >= 1 && stringNumber <= 6, true);
  });

  check('The Mirror bars 30-33 move one voice and leave V1.1 unchanged', () => {
    const before = fs.readFileSync(mirrorEdition);
    const hash = crypto.createHash('sha256').update(before).digest('hex');
    const score = importWwhDuoMusicXml(before.toString('utf8'));
    const bass = score.bass.measures[29]!;
    const bassPc = (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[bass.notes[0]!.step!]! + (bass.notes[0]!.alter ?? 0) + 12) % 12;
    assert.equal(bassPc, 11);
    const candidate = proposeMirrorBars30to33(bassPc);
    assert.equal(candidate.technicalFeasible, true, candidate.note);
    assert.equal(candidate.humanPlayability, 'NOT VERIFIED');
    assert.deepEqual(
      candidate.events.map((item) => item.bar),
      [30, 30, 31, 32, 33, 33]
    );
    assert.equal(candidate.events.some((item) => item.bar === 34), false);
    const attack = candidate.events[0]!;
    const resolution = candidate.events[1]!;
    assert.equal(attack.pitches.length, 3);
    assert.equal(resolution.pitches.length, 3);
    const attackPcs = attack.pitches.map((pitch) => pitch.midi % 12).sort((a, b) => a - b);
    const resolutionPcs = resolution.pitches.map((pitch) => pitch.midi % 12).sort((a, b) => a - b);
    assert.equal(attackPcs.filter((pc) => resolutionPcs.includes(pc)).length, 2);
    assert.equal(candidate.events.every((item) => item.pitches.every((pitch) => pitch.midi % 12 !== 11)), true);
    assert.equal(attack.durationQuarters + resolution.durationQuarters, 4);
    const xml = mirrorBars30to33MusicXml(candidate);
    assert.match(xml, /<chord\/>/);
    assert.match(xml, /<duration>512<\/duration>/);
    assert.match(xml, /<duration>1024<\/duration>/);
    assert.equal(xml.includes('number="34"'), false);
    assert.match(xml, /Not a performance edition/);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, xml);
    const fixture = importWwhDuoMusicXml(xml);
    assert.equal(fixture.guitar.measures.length, 4);
    assert.equal(fixture.bass.measures[0]?.notes[0]?.step, 'B');
    assert.equal(fixture.guitar.measures[0]?.notes.some((note) => note.chord), true);
    const ticks = fixture.guitar.measures.map((measure) =>
      measure.notes.filter((note) => !note.chord && !note.rest).reduce((sum, note) => sum + note.duration, 0)
    );
    assert.deepEqual(ticks, [1024, 1024, 1024, 1024]);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(mirrorEdition)).digest('hex'), hash);
    assert.equal(fs.readFileSync(mirrorEdition).equals(before), true);
  });

  check('V1.2 specs still pass and a bad guitar role fails', () => {
    const mirror = JSON.parse(fs.readFileSync(path.join(specDir, '03-the-mirror.json'), 'utf8')) as WpsSongSpec;
    assert.equal(mirror.wpsVersion, '1.2');
    const result = runWps(mirror);
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    assert.match(result.lines.join('\n'), /WPS V1\.3/);
    assert.match(result.lines.join('\n'), /does not generate musical notes/);
    assert.match(result.lines.join('\n'), /guitar roles: none recorded/);
    assert.match(result.lines.join('\n'), /No chordal quota/);
    const bad = runWps({
      ...mirror,
      guitarRoles: [{ bars: '30-33', role: 'comping', technique: 'liquid', tonalityId: 'not-a-tonality' }],
    });
    assert.equal(bad.ok, false);
    assert.match(bad.lines.join('\n'), /unknown vault tonality/);
    const silence = runWps({
      ...mirror,
      guitarRoles: [{ bars: '12', role: 'silence', technique: 'liquid' }],
    });
    assert.equal(silence.ok, false);
    assert.match(silence.lines.join('\n'), /silence span/);
  });

  check('protected rests are not the Mirror candidate bars', () => {
    const mirror = JSON.parse(fs.readFileSync(path.join(specDir, '03-the-mirror.json'), 'utf8')) as WpsSongSpec;
    const candidate = proposeWpsVaultPassage({
      tonalityId: 'maj7',
      root: { step: 'B', alter: 0 },
      technique: 'liquid',
      fromBar: 30,
      bassPitchClasses: [11],
      octaveChange: -1,
    });
    assert.equal(candidate.events.some((item) => mirror.protectedGuitarSilences.includes(item.bar)), false);
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
