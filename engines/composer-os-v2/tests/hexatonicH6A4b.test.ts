/**
 * Hexatonic H6-A4b — blind clips, sessions, and review round-trip.
 * Run: node --import tsx engines/composer-os-v2/tests/hexatonicH6A4b.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiHexatonicOpenLaboratoryReview, apiHexatonicSaveLaboratoryReview } from '../app-api/hexatonicProjectApp';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import { BHL_WORLD_IDS } from '../core/bhl/bhlWorlds';
import { PENTATONIC_COLOUR_RESOURCES } from '../core/pentatonic/colourRegistry';
import {
  CORE_CANDIDATES,
  CORE_CONTEXT_IDS,
  CORE_CONTEXT_SECONDS,
  blankCoreLaboratoryReview,
  blindExcerptMusicXml,
  blindListeningEvidence,
  buildBlindAudition,
  commitBlindAnswer,
  discloseBlindItem,
  listBlindCatalogueIds,
  listCoreContextExamples,
  listHexatonicCatalogue,
  readHexatonicScore,
  validateCoreLaboratoryReview,
  type BlindListeningAnswer,
} from '../core/hexatonic';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hexatonic-a4b-'));
process.env.COMPOSER_OS_OUTPUT_DIR = root;

assert.equal(CORE_CONTEXT_SECONDS, 12);
assert.equal(CORE_CANDIDATES.length, 12);
assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);
assert.equal(PENTATONIC_COLOUR_RESOURCES.length, 20);
const catalogueBefore = listHexatonicCatalogue().map((row) => row.id).join('|');

const clips = listCoreContextExamples();
assert.equal(clips.length, 48);
for (const clip of clips) {
  assert.match(clip.musicXml, /<sound tempo="80"\/>/);
  assert.equal(clip.musicXml.includes('artisticApproval'), false);
  assert.doesNotMatch(clip.musicXml, /<tie[\s>]/);
  assert.doesNotMatch(clip.musicXml, /<staff-type>\s*tab\s*<\/staff-type>/i);
  assert.doesNotMatch(clip.musicXml, /<harmony[\s>]/i);
  const reading = readHexatonicScore(clip.musicXml);
  assert.equal(reading.tabStaff, false);
  assert.equal(reading.harmonyCount, 0);
  const reloaded = readHexatonicScore(clip.musicXml);
  assert.equal(reloaded.attacks.length, reading.attacks.length);
  const ingested = ingestCanonicalScore(clip.musicXml);
  assert.equal(ingested.parseError, null);
  assert.equal(ingested.score?.parts.length, 2);
  for (const part of ['guitar', 'bass'] as const) {
    for (let measure = 0; measure < 4; measure += 1) {
      const beats = reading.attacks
        .filter((attack) => attack.part === part && attack.measure === measure)
        .reduce((sum, attack) => sum + attack.duration, 0);
      assert.equal(beats, 4, `${clip.candidateId} ${clip.context} ${part} bar ${measure}`);
    }
  }
  const candidate = CORE_CANDIDATES.find((row) => row.id === clip.candidateId)!;
  const guitarPcs = new Set(
    reading.attacks.filter((attack) => attack.part === 'guitar').flatMap((attack) => attack.pitches.map((pitch) => ((pitch % 12) + 12) % 12)),
  );
  for (const pitchClass of [...candidate.leftSpelling, ...candidate.rightSpelling].map((token) => {
    const match = token.match(/^([A-G])([b#]*)$/);
    const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const marks = match?.[2] ?? '';
    const alter = marks.includes('b') ? -marks.length : marks.length;
    return (natural[match?.[1] ?? 'C']! + alter + 12) % 12;
  })) {
    assert.equal(guitarPcs.has(pitchClass), true, `${clip.candidateId} ${clip.context}`);
  }
  const bassPitches = reading.attacks.filter((attack) => attack.part === 'bass').flatMap((attack) => attack.pitches);
  if (clip.context === 'ambiguous') assert.equal(bassPitches.length, 0);
  if (clip.context === 'root-pedal') assert.equal(new Set(bassPitches).size, 1);
  if (clip.context === 'moving-bass') assert.ok(new Set(bassPitches).size >= 2);
  if (clip.context === 'motif-return') {
    const line = (measure: number) => reading.attacks
      .filter((attack) => attack.part === 'guitar' && attack.measure === measure)
      .map((attack) => attack.pitches.join(','))
      .join('|');
    assert.equal(line(0), line(3));
    assert.notEqual(line(0), line(1));
  }
}

const legacy = blankCoreLaboratoryReview('core-laboratory', '2026-10-15T21:00:00.000Z');
assert.equal(validateCoreLaboratoryReview(legacy).ok, true);
assert.equal(legacy.blind, undefined);

const first = buildBlindAudition(440);
const second = buildBlindAudition(440);
assert.deepEqual(first, second);
assert.notDeepEqual(buildBlindAudition(441).sessions, first.sessions);
const primaries = first.sessions.flatMap((session) => session.items.filter((item) => item.kind === 'primary').map((item) => item.candidateId));
assert.equal(new Set(primaries).size, 12);
for (const session of first.sessions) {
  assert.equal(session.items.filter((item) => item.kind === 'reference').length, 1);
}
assert.equal(first.sessions[2]!.items.filter((item) => item.kind === 'repeat').length, 1);
assert.equal(first.sessions[3]!.items.filter((item) => item.kind === 'repeat').length, 1);
const catalogue = new Set(listBlindCatalogueIds());
for (const item of first.sessions.flatMap((session) => session.items)) {
  assert.match(item.code, /^mark-\d{2}$/);
  assert.equal(CORE_CANDIDATES.some((row) => row.label === item.code || row.id === item.code), false);
  if (item.kind === 'reference') assert.equal(catalogue.has(item.catalogueId ?? ''), true);
  const hidden = discloseBlindItem(first, item.code);
  assert.equal(hidden.revealed, false);
  assert.equal(hidden.candidateId, undefined);
  assert.equal(hidden.catalogueId, undefined);
  assert.equal(hidden.label, undefined);
}

const reference = first.sessions[0]!.items.find((item) => item.kind === 'reference')!;
const referenceXml = blindExcerptMusicXml(first, reference.code, 0);
assert.match(referenceXml, /<sound tempo="92"\/>/);
assert.equal(referenceXml.includes(reference.catalogueId ?? 'missing'), true);
const repeat = first.sessions[2]!.items.find((item) => item.kind === 'repeat')!;
const source = first.sessions.flatMap((session) => session.items).find((item) => item.code === repeat.sourceCode)!;
assert.equal(blindExcerptMusicXml(first, repeat.code, 1), blindExcerptMusicXml(first, source.code, 1));

const savedAnswer: BlindListeningAnswer = {
  distinct: 'YES',
  compose: 'MAYBE',
  colour: 'dark glass',
  saved: false,
  guitarPlaythrough: '',
  disposition: 'UNDECIDED',
};
let review = commitBlindAnswer({ ...legacy, blind: first }, reference.code, savedAnswer);
const revealedReference = discloseBlindItem(review.blind!, reference.code);
assert.equal(revealedReference.revealed, true);
assert.equal(revealedReference.catalogueId, reference.catalogueId);
assert.equal(review.artisticApproval, false);
assert.ok(Object.values(review.candidates).every((entry) => entry.decision === 'UNDECIDED'));

const primary = first.sessions.flatMap((session) => session.items).find((item) => item.kind === 'primary')!;
review = commitBlindAnswer(review, primary.code, { ...savedAnswer, disposition: 'ACCEPT' });
assert.equal(review.candidates[primary.candidateId!]!.decision, 'KEEP');
assert.equal(review.artisticApproval, false);
review = commitBlindAnswer(review, primary.code, { ...savedAnswer, disposition: 'KEEP_PROVISIONAL' });
assert.equal(review.candidates[primary.candidateId!]!.decision, 'UNDECIDED');
review = commitBlindAnswer(review, repeat.code, { ...savedAnswer, distinct: 'NO', disposition: 'ACCEPT' });
assert.equal(review.candidates[repeat.candidateId!]!.decision, 'UNDECIDED');
const evidence = blindListeningEvidence(review.blind!);
assert.equal(evidence.automaticJudgement, false);
assert.match(evidence.text, /not a judgement/);

const otherPrimary = first.sessions.flatMap((session) => session.items).find((item) => item.kind === 'primary' && item.code !== primary.code)!;
review = commitBlindAnswer(review, source.code, {
  ...savedAnswer,
  distinct: 'YES',
  disposition: source.code === primary.code ? 'KEEP_PROVISIONAL' : 'UNDECIDED',
});
review = commitBlindAnswer(review, repeat.code, { ...savedAnswer, distinct: 'NO', compose: 'NO' });
const disagreed = blindListeningEvidence(review.blind!);
assert.ok(disagreed.repeatDisagreements.some((line) => line.includes(repeat.code) && line.includes('not a judgement')));
assert.equal(review.candidates[otherPrimary.candidateId!]!.decision, 'UNDECIDED');
assert.equal(listHexatonicCatalogue().map((row) => row.id).join('|'), catalogueBefore);

const stored = apiHexatonicSaveLaboratoryReview({ review });
assert.equal(stored.ok, true);
if (!stored.ok) throw new Error('save failed');
const opened = apiHexatonicOpenLaboratoryReview({ path: stored.path });
assert.equal(opened.ok, true);
if (!opened.ok) throw new Error('open failed');
assert.equal(opened.review.artisticApproval, false);
assert.equal(opened.review.blind?.seed, 440);
assert.equal(opened.review.blind?.answers[primary.code]?.disposition, 'KEEP_PROVISIONAL');
assert.equal(opened.review.candidates[primary.candidateId!]!.decision, 'UNDECIDED');
const promoted = structuredClone(opened.review) as { artisticApproval: boolean };
promoted.artisticApproval = true;
assert.equal(validateCoreLaboratoryReview(promoted).ok, false);
const broken = structuredClone(opened.review);
if (broken.blind) broken.blind.sessions = broken.blind.sessions.slice(0, 3);
assert.equal(validateCoreLaboratoryReview(broken).ok, false);

console.log('hexatonicH6A4b: PASS');
