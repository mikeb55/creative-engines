/**
 * Hexatonic H6-A — six-note catalogue mathematics.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH6Catalogue.test.ts
 */
import assert from 'node:assert/strict';
import { BHL_WORLDS } from '../core/bhl/bhlWorlds';
import {
  HEXATONIC_ALIASES,
  HEXATONIC_REGISTRY_VERSION,
  WESTERN_SIX_NOTE_PITCH_CLASSES,
  aliasesForNormalForm,
  alternateSharpSpelling,
  censusHexachords,
  censusTertianUniverse,
  classifyPitchClassSet,
  combinationsOf,
  complementPitchClassSet,
  disjointTertianSplits,
  getHexatonicScalar,
  listCatalogueCollections,
  listCatalogueConstructions,
  listCatalogueContexts,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  listTertianTriads,
  normalForm,
  primeForm,
  readSpelling,
  rootedModes,
  transposePitchClassSet,
  triadAt,
  westernSixNoteClaim,
} from '../core/hexatonic';
import { PENTATONIC_COLOUR_RESOURCES } from '../core/pentatonic/colourRegistry';
import { WPS_VAULT_TONALITIES } from '../core/wwh/wps/wpsTonalityVaultRecord';

const census = censusHexachords();
assert.equal(combinationsOf(12, 6).length, 924);
assert.equal(census.pitchClassSets, 924);
assert.equal(census.rootedSets, 462);
assert.equal(census.transpositionClasses, 80);
assert.equal(census.transpositionInversionClasses, 50);

const triads = censusTertianUniverse();
assert.equal(listTertianTriads().length, 40);
assert.equal(triads.triads, 40);
assert.equal(triads.unorderedPairs, 780);
assert.equal(triads.relationClasses, 68);
assert.equal(triads.disjointClasses, 33);
assert.equal(triads.oneCommonToneClasses, 24);
assert.equal(triads.twoCommonToneClasses, 11);
assert.equal(triads.disjointUnionTranspositionClasses, 26);

const asymmetric = [0, 1, 2, 3, 4, 6];
const transposed = new Set<string>();
for (let semitones = 0; semitones < 12; semitones += 1) {
  const moved = transposePitchClassSet(asymmetric, semitones);
  transposed.add(moved.join(','));
  assert.deepEqual(normalForm(moved), normalForm(asymmetric));
  assert.equal(classifyPitchClassSet(moved).forte, classifyPitchClassSet(asymmetric).forte);
}
assert.equal(transposed.size, 12);

const western = westernSixNoteClaim();
assert.equal(western.setClass.forte, '6-32');
assert.deepEqual(western.setClass.primeForm, [0, 2, 4, 5, 7, 9]);
assert.deepEqual([...western.setClass.intervalVector], [1, 4, 3, 2, 5, 0]);
assert.equal(western.setClass.selfComplementary, true);
assert.deepEqual(primeForm(complementPitchClassSet(WESTERN_SIX_NOTE_PITCH_CLASSES)), [0, 2, 4, 5, 7, 9]);
assert.equal(western.id, 'hex_western_claim_not_ritsu');
assert.deepEqual([...western.storedPitchClasses], [...WESTERN_SIX_NOTE_PITCH_CLASSES]);
assert.equal(getHexatonicScalar('hex_western_claim_not_ritsu')?.id, 'hex_western_claim_not_ritsu');
assert.equal(western.modes.length, 6);
const ritsu = western.aliases.find((alias) => alias.name === 'Ritsu');
assert.ok(ritsu);
assert.equal(ritsu.status, 'disputed');
assert.equal(aliasesForNormalForm(western.setClass.normalForm).some((alias) => alias.status === 'established' && alias.name === 'Ritsu'), false);

const flat = readSpelling(['C', 'Db', 'Eb', 'F', 'Ab', 'Bb']);
const sharp = readSpelling(alternateSharpSpelling(flat.pitchClasses));
assert.equal(flat.collapsed, false);
assert.deepEqual(flat.normalForm, sharp.normalForm);
assert.notDeepEqual(flat.tokens, sharp.tokens);
const enharmonic = readSpelling(['B#', 'C#', 'D#', 'E#', 'G#', 'A#']);
assert.deepEqual(enharmonic.pitchClasses, flat.pitchClasses);
assert.equal(readSpelling(['C', 'B#', 'D', 'E', 'F', 'G']).collapsed, true);

const wholeTone = classifyPitchClassSet([0, 2, 4, 6, 8, 10]);
assert.equal(wholeTone.forte, '6-35');
assert.equal(wholeTone.transpositionSymmetry, 6);
assert.equal(rootedModes([0, 2, 4, 6, 8, 10]).length, 1);
const augmented = classifyPitchClassSet([0, 1, 4, 5, 8, 9]);
assert.equal(augmented.forte, '6-20');
assert.equal(augmented.transpositionSymmetry, 3);
assert.equal(augmented.inversionSymmetry, true);
assert.equal(rootedModes([0, 1, 4, 5, 8, 9]).length, 2);
assert.equal(classifyPitchClassSet([0, 1, 2, 3, 4, 5]).zPartner, null);
assert.equal(classifyPitchClassSet([0, 1, 2, 3, 5, 6]).zPartner, '6-36');

assert.equal(listCatalogueCollections().length, 11);
assert.equal(listCatalogueContexts().length, 27);
assert.equal(listHexatonicScalars().length, 11);
assert.equal(listHexatonicWpsPairs().length, 16);
assert.equal(WPS_VAULT_TONALITIES.length, 16);
assert.equal(HEXATONIC_REGISTRY_VERSION, 'hexatonic-registry-h2.0');

const majorMinor = triadAt('major', 0);
const minorSecond = triadAt('minor', 2);
assert.equal(classifyPitchClassSet([...majorMinor.pitchClasses, ...minorSecond.pitchClasses]).forte, '6-32');
const splits = disjointTertianSplits([0, 2, 4, 5, 7, 9]);
assert.ok(splits.length >= 1);

const constructions = listCatalogueConstructions();
const shared = constructions.find((row) => row.contextIds.includes('maj7-sharp5'));
assert.ok(shared);
for (const id of ['13-sharp11', 'minmaj9', '7-sharp9-sharp5']) assert.ok(shared.contextIds.includes(id));
assert.equal(new Set(shared.contextIds).size, shared.contextIds.length);
assert.ok(shared.contextIds.length >= 4);

assert.equal(PENTATONIC_COLOUR_RESOURCES.length, 20);
assert.deepEqual(
  BHL_WORLDS.map((world) => world.id),
  ['A', 'B', 'C', 'D', 'E', 'F'],
);
assert.equal(HEXATONIC_ALIASES.filter((alias) => alias.name === 'Ritsu' && alias.status !== 'disputed').length, 0);

console.log('hexatonicH6Catalogue: PASS');
