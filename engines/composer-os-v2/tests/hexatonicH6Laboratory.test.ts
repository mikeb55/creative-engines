/**
 * Hexatonic H6-A3 — provisional Core laboratory.
 * Run: node --import tsx engines/composer-os-v2/tests/hexatonicH6Laboratory.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  apiHexatonicOpenLaboratoryReview,
  apiHexatonicSaveLaboratoryReview,
  apiHexatonicSaveProject,
} from '../app-api/hexatonicProjectApp';
import {
  CORE_CANDIDATES,
  CORE_LABORATORY_STATUS,
  HEXATONIC_PROJECT_VERSION,
  HEXATONIC_REGISTRY_VERSION,
  analyzeCoreCandidate,
  blankCoreLaboratoryReview,
  coreCandidateAuditionMusicXml,
  coreAuditionBookMusicXml,
  getHexatonicScalar,
  listCoreAuditionBookEntries,
  listCoreCandidateAnalyses,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  validateCoreLaboratoryReview,
  validateHexatonicProject,
} from '../core/hexatonic';
import { PENTATONIC_COLOUR_RESOURCES } from '../core/pentatonic/colourRegistry';
import { BHL_WORLD_IDS } from '../core/bhl/bhlWorlds';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hexatonic-lab-'));
process.env.COMPOSER_OS_OUTPUT_DIR = root;

assert.equal(CORE_CANDIDATES.length, 12);
assert.equal(CORE_LABORATORY_STATUS, 'PROVISIONAL — NOT MUSICALLY APPROVED');
const analyses = listCoreCandidateAnalyses();
assert.equal(analyses.length, 12);
for (const row of analyses) {
  assert.equal(row.union.length, 6);
  assert.equal(row.commonTones, 0);
  assert.equal(row.status, CORE_LABORATORY_STATUS);
  assert.equal(row.candidate.provenance, 'computed');
}
assert.equal(analyzeCoreCandidate('cM-ebm').forte, '6-49');
assert.equal(analyzeCoreCandidate('cm-dbm').forte, '6-19');
assert.match(analyzeCoreCandidate('cM-ebm').candidate.vaultNote ?? '', /notation-checked/);
assert.match(analyzeCoreCandidate('cM-ebm').candidate.vaultNote ?? '', /Provenance stays computed/);
assert.match(analyzeCoreCandidate('cm-dbm').candidate.vaultNote ?? '', /C minor \/ Db minor is not printed/);
assert.doesNotMatch(analyzeCoreCandidate('cM-ebm').candidate.vaultNote ?? '', /notation unverified/);
assert.equal(analyzeCoreCandidate('cm-bd').candidate.vaultNote, null);

const blank = blankCoreLaboratoryReview('core-laboratory', '2026-10-15T21:00:00.000Z');
assert.equal(blank.artisticApproval, false);
assert.ok(Object.values(blank.candidates).every((entry) => entry.decision === 'UNDECIDED'));
const saved = apiHexatonicSaveLaboratoryReview({ review: blank });
assert.equal(saved.ok, true);
if (!saved.ok) throw new Error('save failed');
const opened = apiHexatonicOpenLaboratoryReview({ path: saved.path });
assert.equal(opened.ok, true);
if (!opened.ok) throw new Error('open failed');
assert.equal(opened.review.candidates['cm-dbm']?.decision, 'UNDECIDED');
const marked = structuredClone(opened.review);
marked.candidates['cm-dbm'] = {
  distinct: 'YES',
  useful: 'NO',
  guitarPlayable: 'UNDECIDED',
  colour: 'dark, unnamed',
  decision: 'REFINE',
};
const again = apiHexatonicSaveLaboratoryReview({ review: marked, path: saved.path, overwrite: true });
assert.equal(again.ok, true);
const reopened = apiHexatonicOpenLaboratoryReview({ path: saved.path });
assert.equal(reopened.ok, true);
if (!reopened.ok) throw new Error('reopen failed');
assert.equal(reopened.review.candidates['cm-dbm']?.decision, 'REFINE');
assert.equal(reopened.review.artisticApproval, false);
const approved = structuredClone(reopened.review) as { artisticApproval: boolean };
approved.artisticApproval = true;
assert.equal(validateCoreLaboratoryReview(approved).ok, false);

const xml = coreCandidateAuditionMusicXml('cM-ebm');
assert.match(xml, /<score-partwise/);
assert.doesNotMatch(xml, /<staff-type>\s*tab\s*<\/staff-type>/i);
assert.match(xml, /<work-title>[^<]*provisional/);
assert.doesNotMatch(xml, /<words[^>]*>PROVISIONAL/);
assert.match(xml, /CONTRAST/);
assert.match(xml, /default-y="48"/);
const exampleDir = path.resolve('engines/composer-os-v2/core/hexatonic/examples/h6a-core');
fs.mkdirSync(exampleDir, { recursive: true });
CORE_CANDIDATES.forEach((candidate, index) => {
  const score = coreCandidateAuditionMusicXml(candidate.id);
  assert.doesNotMatch(score, /<staff-type>/i);
  const filename = `${String(index + 1).padStart(2, '0')}-${candidate.id}.musicxml`;
  fs.writeFileSync(path.join(exampleDir, filename), score);
});

assert.equal(listHexatonicScalars().length, 11);
assert.equal(listHexatonicWpsPairs().length, 16);
assert.equal(getHexatonicScalar('hex_western_claim_not_ritsu')?.pitchClasses.join(','), '0,1,3,5,8,10');
assert.equal(HEXATONIC_REGISTRY_VERSION, 'hexatonic-registry-h2.0');
assert.equal(HEXATONIC_PROJECT_VERSION, 1);
assert.equal(PENTATONIC_COLOUR_RESOURCES.length, 20);
assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);
assert.equal(validateHexatonicProject({ format: 'hexatonic-laboratory-review', version: 1 }).ok, false);
assert.equal(apiHexatonicSaveProject({ project: blank }).ok, false);

const book = listCoreAuditionBookEntries();
assert.equal(book.length, 12);
for (const row of book) {
  assert.equal(row.status, CORE_LABORATORY_STATUS);
  assert.match(row.mathematicalDifference, /No audible difference is claimed/);
  assert.equal(row.decisionPrompts[3], 'KEEP / REFINE / REJECT');
  const score = coreAuditionBookMusicXml(row.id);
  assert.doesNotMatch(score, /<staff-type>\s*tab\s*<\/staff-type>/i);
  assert.match(score, /provisional/);
  assert.match(score, /Triad 1 close/);
  assert.match(score, /Second pedal/);
  assert.match(score, /Keep \/ refine \/ reject/);
  assert.equal(score.includes('artisticApproval'), false);
}

console.log('hexatonicH6Laboratory: PASS');
