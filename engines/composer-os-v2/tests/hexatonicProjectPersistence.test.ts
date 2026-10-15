/**
 * Hexatonic H4B — project save and reopen.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicProjectPersistence.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiHexatonicOpenProject, apiHexatonicSaveProject } from '../app-api/hexatonicProjectApp';
import { validateBhlProject } from '../core/bhl/bhlProject';
import {
  captureHexatonicProject,
  generateHexatonicPhrase,
  getHexatonicWpsPair,
  hexatonicEventIdentity,
  HEXATONIC_PROJECT_FORMAT,
  validateHexatonicProject,
} from '../core/hexatonic';
import { PENTATONIC_PROJECT_FORMAT, validatePentatonicProject } from '../core/pentatonic/pentatonicProject';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hexatonic-project-'));
process.env.COMPOSER_OS_OUTPUT_DIR = root;

const phrase = generateHexatonicPhrase({ seed: 4, centre: 2, method: 'M-NEAR', wpsId: 'maj9' });
const captured = captureHexatonicProject({
  id: 'maj9-session',
  title: 'Maj9 session',
  notes: 'kept phrase',
  savedAt: '2026-10-15T12:00:00.000Z',
  family: 'wps-pair',
  wpsId: 'maj9',
  centre: 2,
  seed: 4,
  method: 'M-NEAR',
  phrase,
});
assert.equal(captured.ok, true, captured.errors.join('; '));
const project = captured.project!;
project.phrase.bmef = { ...project.phrase.bmef, note: 'STORED-NOT-REGENERATED' };
const identity = hexatonicEventIdentity(project.phrase);
const pair = getHexatonicWpsPair('maj9');
assert.ok(pair);
assert.equal(project.selection.original.provenance, pair!.provenance);
assert.equal(project.selection.original.registrySource, 'WPS_VAULT_TONALITIES:maj9');
assert.equal(project.phrase.parentSymbol, pair!.parentSymbol);
assert.equal(project.format, HEXATONIC_PROJECT_FORMAT);

const saved = apiHexatonicSaveProject({ project });
assert.equal(saved.ok, true);
if (!saved.ok) throw new Error(saved.error);
assert.ok(saved.path.endsWith(`${path.sep}Hexatonic Projects${path.sep}maj9-session.hexatonic.json`));
assert.equal(fs.existsSync(saved.path), true);

const again = apiHexatonicSaveProject({ project, path: saved.path });
assert.equal(again.ok, false);
if (again.ok) throw new Error('overwrite should fail');
assert.match(again.error, /already exists/);
const before = fs.readFileSync(saved.path);
const replaced = apiHexatonicSaveProject({ project, path: saved.path, overwrite: true });
assert.equal(replaced.ok, true);
assert.equal(before.equals(fs.readFileSync(saved.path)), true);

let closed: typeof project | undefined;
const opened = apiHexatonicOpenProject({ path: saved.path });
assert.equal(opened.ok, true);
if (!opened.ok) throw new Error(opened.error);
closed = opened.project;
assert.equal(hexatonicEventIdentity(closed.phrase), identity);
assert.equal(closed.phrase.bmef.note, 'STORED-NOT-REGENERATED');
assert.notEqual(closed.phrase.bmef.note, generateHexatonicPhrase({ seed: 4, centre: 2, method: 'M-NEAR', wpsId: 'maj9' }).bmef.note);
assert.equal(closed.phrase.musicXml, phrase.musicXml);
assert.equal(closed.selection.original.provenance, 'WPS_VAULT_TONALITIES:maj9');
assert.deepEqual(closed.phrase.bars.map((bar) => bar.role), ['inside', 'inside', 'outside', 'outside', 'return', 'return']);

const escape = apiHexatonicSaveProject({ project, path: path.join(root, 'Hexatonic Projects', '..', 'escape.hexatonic.json') });
assert.equal(escape.ok, false);
const foreign = apiHexatonicOpenProject({ path: path.join(root, 'Pentatonic Projects', 'piece.pentatonic.json') });
assert.equal(foreign.ok, false);
const nul = apiHexatonicOpenProject({ path: `bad\0.hexatonic.json` });
assert.equal(nul.ok, false);

const tampered = JSON.parse(fs.readFileSync(saved.path, 'utf8')) as { phrase: { bars: { attacks: { pitches: number[] }[] }[] } };
tampered.phrase.bars[0]!.attacks[0]!.pitches[0]! += 1;
assert.equal(validateHexatonicProject(tampered).ok, false);

assert.equal(validateHexatonicProject({ format: PENTATONIC_PROJECT_FORMAT, version: 1 }).ok, false);
assert.equal(validateHexatonicProject({ format: 'bhl-project', version: 1 }).ok, false);
assert.equal(validatePentatonicProject({ format: HEXATONIC_PROJECT_FORMAT, version: 1 }).ok, false);
assert.equal(validateBhlProject({ format: HEXATONIC_PROJECT_FORMAT, version: 1 }).ok, false);
assert.equal(
  fs.readFileSync(path.join(process.cwd(), 'engines/composer-os-v2/core/hexatonic/hexatonicProject.ts'), 'utf8').includes('generateHexatonicPhrase('),
  false
);

const scalar = generateHexatonicPhrase({ seed: 1, centre: 0, method: 'M-DEG', scalarId: 'hex_lydian_triad_pair' });
const scalarProject = captureHexatonicProject({
  id: 'lydian',
  family: 'scalar',
  scalarId: 'hex_lydian_triad_pair',
  centre: 0,
  seed: 1,
  method: 'M-DEG',
  phrase: scalar,
});
assert.equal(scalarProject.ok, true, scalarProject.errors.join('; '));
assert.equal(scalarProject.project?.selection.original.registrySource, 'bhl-world-A');
assert.equal(scalarProject.project?.phrase.provenance, 'h1-scalar');

console.log('hexatonicProjectPersistence: PASS');
console.log(saved.path);
