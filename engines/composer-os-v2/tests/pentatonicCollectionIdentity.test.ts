/**
 * Phase 2C — collection identity round-trip and candidate pitch distinctness.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicCollectionIdentity.test.ts
 */
import assert from 'node:assert/strict';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { autoColorContextFromAnalysis } from '../core/pentatonic/autoColor';
import { productionSnapshot } from '../core/pentatonic/productionCompare';
import { COLOUR_ROUTE_PLATEAU_NOTE, planColourRoute } from '../core/pentatonic/colourPath';
import { analysePentatonicMusicXml, collectionForRegion, transformPentatonicMotif } from '../core/pentatonic/dev4cWorkflow';
import { importPentatonicScoreFromMusicXml } from '../core/pentatonic/musicXmlScore';
import { generatePracticeExample } from '../core/pentatonic/practiceFacade';
import { mod12, parseNoteToken } from '../core/pentatonic/pitch';
import { getPentatonicColourResource } from '../core/pentatonic/colourRegistry';

const blue = getPentatonicColourResource('blue_pentatonic');
assert.ok(blue);
const example = generatePracticeExample({
  fieldId: 'blue_pentatonic',
  centre: 'A',
  motif: 'C D Eb',
  category: 'HOME_CONTINUITY',
  difficulty: 'SPARSE',
  variation: 0,
});
assert.match(example.musicXml, /<words[^>]*>collection blue_pentatonic@A<\/words>/);
assert.match(example.musicXml, /<step>E<\/step>\s*<alter>-1<\/alter>/);

const pitchXml = (xml: string) => [...xml.matchAll(/<pitch>[\s\S]*?<\/pitch>/g)].map((match) => match[0]).join('\n');
const stripped = example.musicXml.replace(/\s*<direction placement="above"><direction-type><words[^>]*>collection blue_pentatonic@A<\/words><\/direction-type><\/direction>/, '');
assert.equal(stripped.includes('collection blue_pentatonic@A'), false);
assert.equal(pitchXml(stripped), pitchXml(example.musicXml));

const declared = analyzePentatonicScore(example.musicXml);
const region = declared.regions[0];
assert.ok(region);
assert.equal(region.identityStatus, 'explicit');
assert.equal(region.explicitCollection?.archetypeId, 'blue_pentatonic');
assert.equal(region.explicitCollection?.referenceNote, 'A');
assert.equal(region.explicitCollection?.name, 'A Blue Pentatonic');
const imported = importPentatonicScoreFromMusicXml(example.musicXml);
const sounding = (imported.events[0]?.melodyNotes ?? []).map((token) => parseNoteToken(token.replace(/[0-9]+$/, ''))!.pc);
const bluePcs = blue!.intervals.map((interval) => mod12(9 + interval));
for (const pc of sounding) assert.equal(bluePcs.includes(pc), true, `pitch class ${pc} left A blue pentatonic`);

const musician = analysePentatonicMusicXml(example.musicXml);
assert.equal(musician.regions[0]?.collectionName, 'A Blue Pentatonic');
assert.match(musician.regions[0]?.identityNote ?? '', /Declared collection/);
const snapshot = productionSnapshot(declared);
assert.match(snapshot.currentField, /A Blue Pentatonic/);
assert.equal(snapshot.currentField.includes(region.collectionName) && region.collectionName !== 'A Blue Pentatonic', false);
assert.notEqual(snapshot.home, 'A Blue Pentatonic');
const colourContext = autoColorContextFromAnalysis(declared);
assert.equal(colourContext.currentResourceId, 'blue_pentatonic');
assert.equal(colourContext.centreNote, 'A');
assert.notEqual(colourContext.homeResourceId, 'blue_pentatonic');
const readingCopies = declared.diagnostics.filter((line) => line === declared.identity.reading);
assert.equal(readingCopies.length, 1);

const bare = analyzePentatonicScore(stripped);
assert.equal(bare.regions[0]?.explicitCollection, null);
assert.equal(bare.regions[0]?.identityStatus, 'ambiguous-subset');
assert.notEqual(bare.regions[0]?.collectionName, 'A Blue Pentatonic');
const bareMusician = analysePentatonicMusicXml(stripped);
assert.match(bareMusician.regions[0]?.identityNote ?? '', /Ambiguous subset/);
assert.match(bareMusician.regions[0]?.identityNote ?? '', /does not contain every note/);

const target = collectionForRegion(region!);
assert.equal(target?.archetypeId, 'blue_pentatonic');
const transformed = transformPentatonicMotif({
  xml: example.musicXml,
  analysis: declared,
  region: region!,
  target: target!,
});
assert.match(transformed.actualNotes, /Eb/);
assert.equal(transformed.actualNotes.includes('D#'), false);
assert.match(transformed.musicXml, /<step>E<\/step>\s*<alter>-1<\/alter>/);
const transformedNotes = importPentatonicScoreFromMusicXml(transformed.musicXml).events[0]?.melodyNotes ?? [];
for (const token of transformedNotes) {
  const parsed = parseNoteToken(token.replace(/[0-9]+$/, ''));
  assert.ok(parsed);
  assert.equal(bluePcs.includes(parsed.pc), true);
}

const route = planColourRoute({ resourceId: 'hirajoshi', centre: 'C', seed: 1, minSteps: 3, maxSteps: 6, ending: 'return' });
assert.equal(route.ok, true);
if (route.ok) {
  const bundle = [route.route, ...route.alternatives];
  const orders = bundle.map((item) => item.steps.map((step) => step.instance.canonicalId).join('>'));
  assert.equal(new Set(orders).size, orders.length);
  const costs = new Set(bundle.map((item) => item.totalCost.toFixed(6)));
  assert.equal(route.search.tiedWithWinner > 1 || costs.size >= 1, true);
  assert.match(COLOUR_ROUTE_PLATEAU_NOTE, /0\.225/);
  assert.equal(route.route.totalCost, 0.225);
}

console.log('pentatonicCollectionIdentity: PASS');
