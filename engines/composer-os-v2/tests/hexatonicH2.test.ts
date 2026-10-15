/**
 * Hexatonic Phase H2 — six-note registry, relationships, and fixtures.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH2.test.ts
 */
import assert from 'node:assert/strict';
import { buildBhlWorldField, BHL_WORLDS } from '../core/bhl/bhlWorlds';
import type { BhlBassBar } from '../core/bhl/bhlRhythm';
import { generateVaultRiff } from '../core/guitar/vaultRiffGenerator';
import { TONALITY_VAULT_DATABASE } from '../core/harmony/tonalityVaultDatabase';
import { TRIAD_PAIR_CHORUS_ROTATION } from '../core/irealpro/irealVaultPipeline';
import {
  HEXATONIC_ARTISTIC_APPROVAL,
  HEXATONIC_EVIDENCE_STATUS,
  HEXATONIC_REFUSED_IDS,
  HEXATONIC_REGISTRY_VERSION,
  HEXATONIC_WPS_FAMILY,
  classifyHexatonicDistance,
  containsPitchClass,
  distinctTranspositions,
  duplicatePitchClassGroups,
  exchangeTriads,
  getHexatonicCatalogueEntry,
  getHexatonicScalar,
  guitarSurface,
  intersectPitchClasses,
  listHexatonicCatalogue,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  lydianExchangeSpellings,
  lydianFieldAt,
  majorMinorWholeToneAugmentedEvidence,
  measureHexatonicDistance,
  nearestTone,
  omitSeventhFragments,
  pitchClassSetsEqual,
  placementAgainstHome,
  rootSpelled,
  scalarTriadsAt,
  transposeHexatonicWpsPair,
  transposePitchClasses,
  transposeRegisteredScalar,
  westernReturnPath,
  wpsReturnPair,
} from '../core/hexatonic';
import {
  fieldFromPitchClasses,
  fieldFromResource,
  measureFieldDistance,
  PENTATONIC_FIELD_DISTANCE_VERSION,
} from '../core/pentatonic/fieldDistance';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import { PENTATONIC_PARENT_EXTRACTION_VERSION } from '../core/pentatonic/parentExtraction';
import { listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';
import { canonicalPitchSet, canonicalPitchSetId } from '../core/pentatonic/pitch';
import { PENTATONIC_PROJECT_FORMAT, PENTATONIC_PROJECT_VERSION, collectionState } from '../core/pentatonic/pentatonicProject';
import { WPS_VAULT_TONALITIES } from '../core/wwh/wps/wpsTonalityVaultRecord';

const COLOUR_INTERVALS: Record<string, readonly number[]> = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  suspended_pentatonic: [0, 2, 5, 7, 10],
  open_pentatonic: [0, 2, 5, 7, 9],
  minor_sixth_pentatonic: [0, 3, 5, 8, 10],
  mixolydian_pentatonic: [0, 2, 4, 7, 10],
  dorian_pentatonic: [0, 2, 3, 7, 10],
  aeolian_pentatonic: [0, 3, 5, 7, 8],
  kumoi: [0, 2, 3, 7, 9],
  hirajoshi: [0, 2, 3, 7, 8],
  insen: [0, 1, 5, 7, 10],
  iwato: [0, 1, 5, 6, 10],
  phrygian_pentatonic: [0, 1, 3, 7, 8],
  lydian_pentatonic: [0, 2, 4, 6, 9],
  whole_tone_pentachord: [0, 2, 4, 6, 8],
  blue_pentatonic: [0, 3, 5, 6, 10],
  ambiguous_third: [0, 3, 4, 7, 10],
  leading_major: [0, 2, 4, 7, 11],
  leading_minor: [0, 3, 5, 7, 11],
  remote_altered: [0, 1, 4, 6, 10],
};

assert.equal(HEXATONIC_REGISTRY_VERSION, 'hexatonic-registry-h2.0');
assert.equal(HEXATONIC_ARTISTIC_APPROVAL, false);
assert.equal(HEXATONIC_EVIDENCE_STATUS, 'fixture');

const scalars = listHexatonicScalars();
assert.deepEqual(scalars.map((row) => row.id), [
  'hex_western_claim_not_ritsu',
  'hex_major_omit_seventh',
  'hex_major_omit_fourth',
  'hex_lydian_triad_pair',
  'hex_minor_primary',
  'hex_whole_tone_even',
  'hex_whole_tone_odd',
  'hex_augmented_t0',
  'hex_augmented_t1',
  'hex_augmented_t2',
  'hex_augmented_t3',
]);
for (const row of scalars) {
  assert.equal(row.pitchClasses.length, 6, row.id);
  assert.deepEqual(row.pitchClasses, canonicalPitchSet(row.pitchClasses));
}
assert.deepEqual(getHexatonicScalar('hex_western_claim_not_ritsu')?.pitchClasses, [0, 1, 3, 5, 8, 10]);
assert.deepEqual(getHexatonicScalar('hex_major_omit_seventh')?.pitchClasses, [0, 2, 4, 5, 7, 9]);
assert.deepEqual(getHexatonicScalar('hex_major_omit_fourth')?.pitchClasses, [0, 2, 4, 7, 9, 11]);
assert.deepEqual(getHexatonicScalar('hex_minor_primary')?.pitchClasses, [0, 2, 3, 5, 7, 10]);
assert.deepEqual(getHexatonicScalar('hex_whole_tone_even')?.pitchClasses, [0, 2, 4, 6, 8, 10]);
assert.deepEqual(getHexatonicScalar('hex_whole_tone_odd')?.pitchClasses, [1, 3, 5, 7, 9, 11]);
assert.deepEqual(getHexatonicScalar('hex_augmented_t0')?.pitchClasses, [0, 3, 4, 7, 8, 11]);
assert.deepEqual(getHexatonicScalar('hex_augmented_t1')?.pitchClasses, [0, 1, 4, 5, 8, 9]);
assert.deepEqual(getHexatonicScalar('hex_augmented_t2')?.pitchClasses, [1, 2, 5, 6, 9, 10]);
assert.deepEqual(getHexatonicScalar('hex_augmented_t3')?.pitchClasses, [2, 3, 6, 7, 10, 11]);
assert.equal(getHexatonicScalar('hex_major_omit_fourth')?.triadReading, null);
assert.deepEqual(lydianFieldAt(0).pitchClasses, getHexatonicScalar('hex_lydian_triad_pair')?.pitchClasses);
assert.deepEqual(lydianExchangeSpellings(), { lower: ['C', 'E', 'G'], upper: ['D', 'F#', 'A'] });
for (const id of HEXATONIC_REFUSED_IDS) assert.equal(getHexatonicScalar(id), undefined);

const omitSeventh = scalarTriadsAt('hex_major_omit_seventh');
assert.deepEqual(omitSeventh?.map((triad) => triad.quality), ['major', 'minor']);
assert.deepEqual(omitSeventh?.[0]?.pitchClasses, [0, 4, 7]);
assert.deepEqual(omitSeventh?.[1]?.pitchClasses, [2, 5, 9]);

const pairs = listHexatonicWpsPairs();
assert.equal(pairs.length, 16);
assert.deepEqual(pairs.map((pair) => pair.id), WPS_VAULT_TONALITIES.map((row) => row.id));
for (const pair of pairs) {
  assert.equal(pair.family, HEXATONIC_WPS_FAMILY);
  assert.equal(pair.pitchClasses.length, 6);
  assert.equal(pair.disjoint, true);
  assert.deepEqual(pair.sharedPitchClasses, []);
  assert.equal(pair.resolution.validated.quality, pair.resolution.quality);
  assert.equal(pair.tension.validated.quality, pair.tension.quality);
  assert.equal(pair.primaryQuadratonicSize, 4);
  assert.equal(pair.provenance, `WPS_VAULT_TONALITIES:${pair.id}`);
  assert.equal(pair.analysis.sharedPitchClasses.length, 0);
}
assert.deepEqual(pairs.find((pair) => pair.id === 'sus-b9')?.shellOutsideUnion, [11]);
assert.deepEqual(pairs.find((pair) => pair.id === 'minmaj13-sharp11')?.shellOutsideUnion, [0]);
assert.deepEqual(pairs.find((pair) => pair.id === '13-sharp11')?.shellOutsideUnion, [0]);
assert.deepEqual(pairs.find((pair) => pair.id === '13b9')?.shellOutsideUnion, [0]);
assert.equal(pairs.filter((pair) => pair.shellOutsideUnion.length === 0).length, 12);

const catalogue = listHexatonicCatalogue();
assert.equal(catalogue.length, 27);
const duplicates = duplicatePitchClassGroups(catalogue);
assert.deepEqual(duplicates.map((group) => group.ids), [
  ['hex_major_omit_fourth', 'maj9'],
  ['hex_minor_primary', 'min11'],
]);
assert.equal(getHexatonicCatalogueEntry('hex_major_omit_fourth')?.kind, 'scalar');
assert.equal(getHexatonicCatalogueEntry('maj9')?.kind, 'wps-pair');
assert.equal(pitchClassSetsEqual(
  getHexatonicScalar('hex_major_omit_fourth')!.pitchClasses,
  pairs.find((pair) => pair.id === 'maj9')!.pitchClasses
), true);
assert.notEqual(getHexatonicCatalogueEntry('hex_major_omit_fourth')?.id, getHexatonicCatalogueEntry('maj9')?.id);

assert.equal(containsPitchClass([0, 2, 4, 5, 7, 9], 9), true);
assert.equal(containsPitchClass([0, 2, 4, 5, 7, 9], 11), false);
assert.deepEqual(canonicalPitchSet([4, 0, 16, 0, -1]), [0, 4, 11]);
assert.equal(canonicalPitchSetId([11, 0, 9, 19, 4, 2]), '0,2,4,7,9,11');
assert.equal(pitchClassSetsEqual([0, 2, 4, 7, 9, 11], [11, 0, 19, 9, 4, 2]), true);
assert.deepEqual(intersectPitchClasses([0, 2, 4, 5, 7, 9], [0, 2, 4, 7, 9, 11]), [0, 2, 4, 7, 9]);
assert.deepEqual(nearestTone(11, [0, 2, 4, 5, 7, 9]), { from: 11, to: 0, semitones: 1 });

for (let step = 0; step < 12; step += 1) {
  const moved = transposeRegisteredScalar('hex_minor_primary', step);
  assert.equal(moved.pitchClasses.length, 6);
  assert.equal(containsPitchClass(moved.pitchClasses, step), true);
}
assert.equal(distinctTranspositions('hex_minor_primary'), 12);
assert.equal(distinctTranspositions('hex_major_omit_seventh'), 12);
assert.equal(distinctTranspositions('hex_whole_tone_even'), 2);
assert.equal(distinctTranspositions('hex_whole_tone_odd'), 2);
assert.equal(distinctTranspositions('hex_augmented_t0'), 4);
const evenStep = transposeRegisteredScalar('hex_whole_tone_even', 1);
assert.equal(evenStep.symmetryLandingId, 'hex_whole_tone_odd');
assert.equal(evenStep.landingMatchesSet, true);
const evenStay = transposeRegisteredScalar('hex_whole_tone_even', 2);
assert.equal(evenStay.symmetryLandingId, 'hex_whole_tone_even');
assert.equal(evenStay.landingMatchesSet, true);
for (const step of [0, 1, 2, 3, 4, 5]) {
  const landed = transposeRegisteredScalar('hex_augmented_t0', step);
  assert.equal(landed.landingMatchesSet, true, `augmented step ${step}`);
  assert.equal(landed.symmetryLandingId, `hex_augmented_t${step % 4}`);
}
const shiftedMajor = transposeRegisteredScalar('hex_major_omit_seventh', 1);
assert.equal(shiftedMajor.symmetryLandingId, null);
assert.equal(shiftedMajor.landingMatchesSet, false);
assert.equal(shiftedMajor.pitchClasses.length, 6);

const lydianD = lydianFieldAt(2);
assert.deepEqual(lydianD.pitchClasses, transposePitchClasses(lydianFieldAt(0).pitchClasses, 2));
const lydianTriads = scalarTriadsAt('hex_lydian_triad_pair', rootSpelled(2));
assert.deepEqual(canonicalPitchSet([...(lydianTriads?.[0]?.pitchClasses ?? []), ...(lydianTriads?.[1]?.pitchClasses ?? [])]), lydianD.pitchClasses);

const maj9 = pairs.find((pair) => pair.id === 'maj9')!;
for (let step = 0; step < 12; step += 1) {
  const moved = transposeHexatonicWpsPair('maj9', rootSpelled(step));
  assert.equal(moved.id, 'maj9');
  assert.equal(moved.disjoint, true);
  assert.equal(moved.primaryQuadratonicSize, 4);
  assert.deepEqual(moved.pitchClasses, transposePitchClasses(maj9.pitchClasses, step));
  assert.equal(moved.resolution.validated.quality, 'major');
  assert.equal(moved.tension.validated.quality, 'minor');
}

assert.equal(classifyHexatonicDistance(4, 1, false, 6), 'RELATED');
assert.equal(classifyHexatonicDistance(4, 1, false, 5), 'NEAR');
const families = majorMinorWholeToneAugmentedEvidence();
assert.equal(families.artisticApproval, false);
assert.equal(families.status, 'fixture');
assert.equal(families.majorToMinor.cardinality, 6);
assert.equal(families.majorToMinor.sharedCount, 4);
assert.equal(families.majorToMinor.distanceClass, 'RELATED');
assert.equal(families.wholeToneComplement.sharedCount, 0);
assert.equal(families.wholeToneComplement.distanceClass, 'REMOTE');
assert.equal(families.augmentedNeighbor.sharedCount, 3);
assert.equal(families.augmentedNeighbor.distanceClass, 'OUTSIDE');
assert.equal(new Set([
  families.majorToMinor.distanceClass,
  families.wholeToneComplement.distanceClass,
  families.augmentedNeighbor.distanceClass,
]).size, 3);
const fiveNoteContinuity = (families.majorToMinor.sharedCount / 5) * 0.65
  + (1 - Math.min(families.majorToMinor.meanMotion, 6) / 6) * 0.25;
const sixNoteContinuity = (families.majorToMinor.sharedCount / families.majorToMinor.cardinality) * 0.65
  + (1 - Math.min(families.majorToMinor.meanMotion, 6) / 6) * 0.25;
assert.equal(families.majorToMinor.continuityPotential, sixNoteContinuity);
assert.notEqual(families.majorToMinor.continuityPotential, fiveNoteContinuity);

const same = measureHexatonicDistance([0, 2, 4, 6, 8, 10], [10, 8, 6, 4, 2, 0]);
assert.equal(same.distanceClass, 'IDENTICAL');
assert.equal(same.continuityPotential, 1);
assert.equal(same.cardinality, 6);

const fragments = omitSeventhFragments();
assert.deepEqual(fragments.two, [0, 2]);
assert.deepEqual(fragments.three, [0, 2, 4]);
assert.deepEqual(fragments.four, [0, 2, 4, 5]);
assert.equal(guitarSurface(fragments.two).accepted, true);
assert.equal(guitarSurface(fragments.three).accepted, true);
assert.equal(guitarSurface(getHexatonicScalar('hex_major_omit_seventh')!.pitchClasses).accepted, false);

const western = westernReturnPath();
assert.deepEqual(western.steps.map((step) => step.role), ['inside', 'outside', 'return']);
assert.equal(western.returnMatchesHome, true);
assert.equal(western.outsideLeavesHome, true);
assert.equal(western.steps[2]!.id, 'hex_major_omit_seventh');
assert.equal(placementAgainstHome(western.steps[0]!.pitchClasses, western.steps[1]!.pitchClasses), 'outside');
assert.equal(western.artisticApproval, false);

const vaultReturn = wpsReturnPair('maj7');
assert.equal(vaultReturn.tensionIsModulation, false);
assert.equal(vaultReturn.parentStays, 'Cmaj7');
assert.equal(vaultReturn.path.returnMatchesHome, true);
assert.equal(vaultReturn.path.outsideLeavesHome, true);
assert.deepEqual(vaultReturn.path.steps[0]!.pitchClasses, [4, 7, 11]);
assert.deepEqual(vaultReturn.path.steps[1]!.pitchClasses, [0, 5, 9]);

const lydianMove = exchangeTriads(
  {
    id: 'lydian-lower',
    rootSpelling: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    pitchClasses: [0, 4, 7],
    provenance: 'suggested',
  },
  {
    id: 'lydian-upper',
    rootSpelling: 'D',
    quality: 'major',
    notes: ['D', 'F#', 'A'],
    pitchClasses: [2, 6, 9],
    provenance: 'suggested',
  }
);
assert.equal(lydianMove.disjoint, true);
assert.equal(lydianMove.retained.length, 0);
assert.equal(lydianMove.motions.length, 3);
assert.ok(lydianMove.voiceLeadingDistance > 0);

const maj9Move = exchangeTriads(maj9.resolution.input, maj9.tension.input);
assert.equal(maj9Move.analysis.identicalCommonTones.length, 0);
assert.equal(maj9Move.disjoint, true);
assert.equal(maj9Move.motions.length, 3);
assert.deepEqual(maj9.resolution.pitchClasses, [7, 11, 2]);
assert.deepEqual(maj9.tension.pitchClasses, [9, 0, 4]);

const retained = exchangeTriads(
  {
    id: 'C-major',
    rootSpelling: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    pitchClasses: [0, 4, 7],
    provenance: 'suggested',
  },
  {
    id: 'A-minor',
    rootSpelling: 'A',
    quality: 'minor',
    notes: ['A', 'C', 'E'],
    pitchClasses: [9, 0, 4],
    provenance: 'suggested',
  }
);
assert.deepEqual(retained.sharedPitchClasses, [0, 4]);
assert.deepEqual(retained.retained.map((pair) => pair.from), [0, 4]);
assert.deepEqual(retained.motions.find((pair) => pair.from === 7), { from: 7, to: 9, semitones: 2 });

const collision = exchangeTriads(
  {
    id: 'C-major-collision',
    rootSpelling: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    pitchClasses: [0, 4, 7],
    provenance: 'suggested',
  },
  {
    id: 'Fs-major',
    rootSpelling: 'F#',
    quality: 'major',
    notes: ['F#', 'A#', 'C#'],
    pitchClasses: [6, 10, 1],
    provenance: 'suggested',
  }
);
assert.equal(collision.disjoint, true);
assert.equal(collision.leapAfterCollision, true);
assert.equal(collision.voiceLeadingDistance, 6);

assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
assert.equal(PENTATONIC_PARENT_EXTRACTION_VERSION, 'pentatonic-parent-extraction-7c');
assert.equal(PENTATONIC_FIELD_DISTANCE_VERSION, 'pentatonic-field-distance-7a');
assert.equal(PENTATONIC_PROJECT_FORMAT, 'pentatonic-project');
assert.equal(PENTATONIC_PROJECT_VERSION, 1);
const colours = listPentatonicColourResources();
assert.equal(colours.length, 20);
assert.deepEqual(colours.map((row) => row.id), Object.keys(COLOUR_INTERVALS));
for (const colour of colours) {
  assert.deepEqual(colour.intervals, COLOUR_INTERVALS[colour.id]);
  assert.equal(colour.intervals.length, 5);
  assert.equal(colour.id.startsWith('hex_'), false);
}
assert.deepEqual(listPentatonicArchetypes().map((row) => row.id), ['major_pentatonic', 'minor_pentatonic']);
assert.deepEqual(COLOUR_INTERVALS.open_pentatonic, [0, 2, 5, 7, 9]);
const refusedPentatonic = collectionState('hex_major_omit_seventh', 'C');
assert.equal('error' in refusedPentatonic, true);
assert.equal(fieldFromPitchClasses([0, 2, 4, 6, 8, 10]), null);
const openField = fieldFromResource('open_pentatonic', 'C');
assert.ok(openField);
assert.equal(measureFieldDistance(openField!, openField!).distanceClass, 'IDENTICAL');
assert.deepEqual(BHL_WORLDS.map((world) => world.id), ['A', 'B', 'C', 'D', 'E', 'F']);
const bass: BhlBassBar = {
  bar: 1,
  quarters: 4,
  attacks: [0],
  rests: [],
  notes: [{ onset: 0, quarters: 4, midi: 48, pitchClass: 0 }],
  pitchClasses: [0, 4, 7],
  rootPc: 0,
};
assert.equal(buildBhlWorldField('C', bass, 'primary').pitchClasses.length, 4);
assert.equal(TONALITY_VAULT_DATABASE.length, 17);
assert.equal(TONALITY_VAULT_DATABASE.some((row) => row.chordType === 'Maj6'), true);
assert.deepEqual([...TRIAD_PAIR_CHORUS_ROTATION], ['triad-pair-pendulum', 'bebop-placement', 'triad-pair-pendulum', 'quadratonic', 'triad-pair-pendulum']);
const pendulum = generateVaultRiff({ chordTypeId: 'Maj7', rootPc: 0, bars: 1, style: 'triad-pair-pendulum' });
assert.deepEqual(pendulum.map((note) => note.pitch), [52, 59, 52, 59, 52, 59, 52, 59]);
const quadratonic = generateVaultRiff({ chordTypeId: 'Maj7', rootPc: 0, bars: 1, style: 'quadratonic' });
assert.notDeepEqual(quadratonic.map((note) => note.pitch), pendulum.map((note) => note.pitch));
assert.equal(WPS_VAULT_TONALITIES.length, 16);

console.log('hexatonicH2: PASS');
