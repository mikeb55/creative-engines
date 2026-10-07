/**
 * Pentatonic Engine Dev 4C — Composer OS end-to-end workflow.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev4c.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { mapMotifPitches, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import {
  DEV4C_DEFAULT_METHOD,
  analysePentatonicMusicXml,
  colourField,
  generatePentatonicPhrase,
  manualCollection,
  transformPentatonicMotif,
} from '../core/pentatonic/dev4cWorkflow';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const OUTPUT = '/Users/user/Documents/DEVS/Pentatonic-Options';
const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const SOURCES = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
] as const;

const PILOTS = [
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
] as const;

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function beforeHashes(): Record<string, string> {
  return Object.fromEntries(SOURCES.map(([file]) => [file, sha(path.join(ALBUM, file))]));
}

const hashesBefore = beforeHashes();
for (const [file, expected] of SOURCES) {
  assert.equal(hashesBefore[file], expected, file);
}

assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
assert.equal(DEV4C_DEFAULT_METHOD, 'M-DEG');

fs.mkdirSync(path.join(OUTPUT, 'MusicXML-Exports', 'Dev4C'), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, 'Generated-Phrases', 'Dev4C'), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, 'Analysis-Reports'), { recursive: true });

const lines: string[] = ['# Dev 4C WWH workflow evidence', ''];

for (const file of PILOTS) {
  const full = path.join(ALBUM, file);
  const xml = fs.readFileSync(full, 'utf8');
  const reading = analysePentatonicMusicXml(xml, { sourceFile: file, sourceSha256: hashesBefore[file] });
  assert.ok(reading.regions.length > 0, `${file} regions`);
  assert.ok(reading.centre.length > 0);
  assert.ok(reading.home.length > 0);
  const noneRows = reading.regions.filter((region) => region.none);
  lines.push(`## ${reading.song}`);
  lines.push(`- CENTRE: ${reading.centre}`);
  lines.push(`- HOME: ${reading.home} (${reading.homeStatus})`);
  lines.push(`- NONE regions: ${reading.noneCount}`);
  for (const region of reading.regions) {
    lines.push(`- ${region.measureRangeLabel} — ${region.collectionName}${region.none ? '' : ` — ${region.colour}`}`);
  }
  assert.equal(noneRows.length, reading.noneCount);
  assert.equal(reading.analysis.summary.noneRegions, noneRows.length);
  if (reading.noneCount > 0) {
    assert.ok(noneRows.every((region) => region.collectionName === 'NONE'));
  }
  const pitched = reading.analysis.regions.find((region) => region.collectionName !== 'NONE');
  assert.ok(pitched, `${file} pentatonic region`);
  const generated = generatePentatonicPhrase({
    xml,
    analysis: reading.analysis,
    region: pitched,
    purpose: 'MOTIF',
    activity: 'SPARSE',
    seed: 84041,
  });
  assert.equal(generated.candidates.length <= 3, true);
  assert.equal(generated.candidates[0]?.letter, 'A');
  assert.equal(generated.candidates.at(-1)?.purpose, 'NO_PHRASE');
  assert.match(generated.candidates.find((candidate) => candidate.silence)?.resultLabel ?? '', /SILENCE \/ NO PHRASE/);
  assert.equal(generated.musicContext.presetId, 'guitar_bass_duo');
  assert.match(generated.musicContext.meter, /^\d+\/\d+$/);
  assert.ok(generated.musicContext.harmonyChecksum.length > 8);
  const pitchedCandidate = generated.candidates.find((candidate) => !candidate.silence);
  assert.ok(pitchedCandidate, `${file} pitched candidate`);
  assert.notEqual(pitchedCandidate.gceOverall, null);
  assert.ok(pitchedCandidate.gceCategories.length > 0);
  assert.ok(pitchedCandidate.scaleLike === 'CLEAR' || pitchedCandidate.scaleLike === 'WARNING');
  const exported = validateMusicXml(pitchedCandidate.musicXml);
  assert.equal(exported.valid, true, exported.errors.join('; '));
  assert.doesNotMatch(pitchedCandidate.musicXml, /<staff-type>tab<\/staff-type>/i);
  const slug = file.replace(/\.musicxml$/, '');
  fs.writeFileSync(path.join(OUTPUT, 'MusicXML-Exports', 'Dev4C', `${slug}-motif.musicxml`), pitchedCandidate.musicXml);
  fs.writeFileSync(
    path.join(OUTPUT, 'Generated-Phrases', 'Dev4C', `${slug}-candidates.txt`),
    generated.candidates
      .map(
        (candidate) =>
          `${candidate.letter} ${candidate.purposeLabel} ${candidate.activityLabel}\n${candidate.silence ? candidate.resultLabel : ''}\nSELECTED RESOURCE: ${candidate.selectedResource}\nACTUAL GENERATED NOTES: ${candidate.actualNotes}\nOUTSIDE-RESOURCE NOTES: ${candidate.outsideResourceNotes}\nGCE: ${candidate.gceOverall ?? 'n/a'}`
      )
      .join('\n\n')
  );
  lines.push(`- Generate MOTIF SPARSE: ${generated.candidates.map((candidate) => candidate.letter + ' ' + candidate.purposeLabel).join(', ')}`);
  lines.push(`- MusicContext ${generated.musicContext.meter} checksum ${generated.musicContext.harmonyChecksum}`);
}

const mirrorXml = fs.readFileSync(path.join(ALBUM, PILOTS[0]), 'utf8');
const mirrorReading = analysePentatonicMusicXml(mirrorXml, { sourceFile: PILOTS[0] });
const motifRegion = mirrorReading.analysis.regions.find((region) => region.collectionName !== 'NONE');
assert.ok(motifRegion);
const target = manualCollection('minor_pentatonic', 'E');
const deg = transformPentatonicMotif({
  xml: mirrorXml,
  analysis: mirrorReading.analysis,
  region: motifRegion,
  target,
  method: 'M-DEG',
});
assert.equal(deg.method, 'M-DEG');
assert.equal(deg.pitchChange === 'YES' || deg.pitchChange === 'NO', true);
assert.match(deg.selectedResource, /E Minor Pentatonic/);
const degXml = validateMusicXml(deg.musicXml);
assert.equal(degXml.valid, true, degXml.errors.join('; '));
fs.writeFileSync(path.join(OUTPUT, 'MusicXML-Exports', 'Dev4C', 'Impossible-Metaphysics-M-DEG.musicxml'), deg.musicXml);

const near = transformPentatonicMotif({
  xml: mirrorXml,
  analysis: mirrorReading.analysis,
  region: motifRegion,
  target,
  method: 'M-NEAR',
});
assert.equal(near.method, 'M-NEAR');
assert.equal(near.pitchChange === 'YES' || near.pitchChange === 'NO', true);
fs.writeFileSync(path.join(OUTPUT, 'MusicXML-Exports', 'Dev4C', 'Impossible-Metaphysics-M-NEAR.musicxml'), near.musicXml);

const already: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: null,
};
const unchanged = mapMotifPitches({
  motif: {
    id: 'already',
    barCount: 1,
    notes: [
      { pitch: 60, startBeat: 0, duration: 1 },
      { pitch: 64, startBeat: 1, duration: 1 },
      { pitch: 67, startBeat: 2, duration: 1 },
    ],
  },
  rhythm: [
    { kind: 'note', startBeat: 0, duration: 1 },
    { kind: 'note', startBeat: 1, duration: 1 },
    { kind: 'note', startBeat: 2, duration: 1 },
  ],
  source: already,
  target: already,
  method: 'M-NEAR',
  meter: { beats: 4, beatType: 4 },
});
assert.equal(
  unchanged.notes.every((note) => note.pitch === note.sourcePitch),
  true
);

const silence = generatePentatonicPhrase({
  xml: mirrorXml,
  analysis: mirrorReading.analysis,
  region: motifRegion,
  purpose: 'NO_PHRASE',
});
assert.equal(silence.candidates.length, 1);
assert.equal(silence.candidates[0]?.silence, true);
assert.equal(silence.candidates[0]?.resultLabel, 'RESULT: SILENCE / NO PHRASE');
assert.equal(silence.candidates[0]?.gceOverall, null);
assert.doesNotMatch(silence.candidates[0]?.resultLabel ?? '', /ERROR|FAILED/);

let outsideHit = false;
for (const file of PILOTS) {
  const xml = fs.readFileSync(path.join(ALBUM, file), 'utf8');
  const reading = analysePentatonicMusicXml(xml, { sourceFile: file });
  for (const region of reading.analysis.regions.filter((row) => row.collectionName !== 'NONE').slice(0, 2)) {
    for (const purpose of ['MOTIF', 'COUNTERLINE', 'COMPING_FRAGMENT'] as const) {
      const result = generatePentatonicPhrase({ xml, analysis: reading.analysis, region, purpose, activity: 'SPARSE', seed: 84041 });
      const hit = result.candidates.find((candidate) => !candidate.silence && candidate.outsideResourceNotes !== 'NONE');
      if (!hit) continue;
      outsideHit = true;
      assert.notEqual(hit.selectedResource, 'NONE');
      assert.notEqual(hit.resourceNotes, 'NONE');
      assert.notEqual(hit.actualNotes, 'NONE');
      assert.doesNotMatch(hit.outsideResourceNotes, /error/i);
      lines.push(`- Colour field outside notes: ${file} ${region.measureRangeLabel} ${purpose} ${hit.outsideResourceNotes}`);
      break;
    }
    if (outsideHit) break;
  }
  if (outsideHit) break;
}
assert.equal(outsideHit, true, 'expected a generated candidate with a pitch outside the selected pentatonic');

const field = colourField(already, [60, 61]);
assert.equal(field.selectedResource, 'C Major Pentatonic');
assert.match(field.resourceNotes, /C/);
assert.match(field.actualNotes, /C4/);
assert.notEqual(field.outsideResourceNotes, 'NONE');

for (const [file, expected] of SOURCES) {
  assert.equal(sha(path.join(ALBUM, file)), expected, `${file} changed`);
}
assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);

fs.writeFileSync(path.join(OUTPUT, 'Analysis-Reports', 'Dev4C-Wwh-Workflow.md'), lines.join('\n') + '\n');
console.log('pentatonic Dev 4C workflow PASS');
console.log(lines.filter((line) => line.startsWith('- Colour') || line.startsWith('##') || line.startsWith('- CENTRE') || line.startsWith('- HOME') || line.startsWith('- NONE')).join('\n'));
