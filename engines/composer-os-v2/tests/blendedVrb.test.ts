/**
 * 3-way VRB blend — blendedVrb() typed policy composition (32 tests).
 */

import {
  blendedVrb,
  mergeWeightedVocabulary,
  normaliseWeights,
  parseBlendedVrbComponentIds,
  resolveBlendedRegimeBooleans,
  resolveHardSwitch,
  resolveSigma,
  resolveSoftBoolean,
} from '../core/counterpoint/vrbProfiles/blendedVrb';
import { getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileTypes';
import type { BlendPart } from '../core/counterpoint/vrbProfiles/vrbBlendTypes';
import {
  hasExplicitPerSectionVrbAssignment,
  resolveSqVrbProfileForSection,
  resolveVrbForBar,
} from '../core/counterpoint/vrbProfiles/vrbContextResolver';
import { normalizeSectionVrbMap } from '../app-api/normalizeSectionVrbMap';
import { rhythmExpectationForVrb } from '../core/gce/gceAutoScorers';
import type { CompositionContext } from '../core/compositionContext';

const ARVO = () => getSqVrbProfile('arvo_part')!;
const GLASS = () => getSqVrbProfile('glass')!;
const SATIE = () => getSqVrbProfile('satie')!;
const WEBERN = () => getSqVrbProfile('webern')!;
const DEBUSSY = () => getSqVrbProfile('debussy')!;

function approx(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps;
}

function part(id: string, weight: number): BlendPart {
  return { id, weight, profile: getSqVrbProfile(id)! };
}

function testNormaliseEqualThirds(): boolean {
  const w = normaliseWeights([1, 1, 1]);
  return approx(w[0]!, 1 / 3) && approx(w[1]!, 1 / 3) && approx(w[2]!, 1 / 3);
}

function testNormaliseTwoOne(): boolean {
  const w = normaliseWeights([2, 1]);
  return approx(w[0]!, 2 / 3) && approx(w[1]!, 1 / 3);
}

function testHardSwitchTrue(): boolean {
  return resolveHardSwitch(0.7, 0.65) === true;
}

function testHardSwitchFalse(): boolean {
  return resolveHardSwitch(0.5, 0.65) === false;
}

function testSoftBooleanTrue(): boolean {
  return resolveSoftBoolean([{ value: true, weight: 0.6 }, { value: false, weight: 0.4 }]) === true;
}

function testSoftBooleanFalse(): boolean {
  return resolveSoftBoolean([{ value: true, weight: 0.4 }, { value: false, weight: 0.6 }]) === false;
}

function testSigmaArvoGlass(): boolean {
  const s = resolveSigma([part('arvo_part', 0.5), part('glass', 0.5)]);
  return s >= 16 && s <= 17.1;
}

function testSigmaArvoWebern(): boolean {
  const s = resolveSigma([part('arvo_part', 0.5), part('webern', 0.5)]);
  return s <= 29.2;
}

function testSigmaOpennessZero(): boolean {
  const s = resolveSigma([part('arvo_part', 0.5), part('webern', 0.5)], 0);
  return s === 16;
}

function testSigmaOpennessOne(): boolean {
  const parts = [part('arvo_part', 0.5), part('webern', 0.5)];
  const mean = (16 + 40) / 2;
  return resolveSigma(parts, 1) === Math.round(mean);
}

function testVrbIdTwoWay(): boolean {
  return blendedVrb([ARVO(), GLASS()], [1, 1]).vrbId === 'blended:arvo_part+glass';
}

function testVrbIdThreeWay(): boolean {
  return blendedVrb([ARVO(), GLASS(), SATIE()], [1, 1, 1]).vrbId === 'blended:arvo_part+glass+satie';
}

function testVrbIdSorted(): boolean {
  return blendedVrb([GLASS(), ARVO()], [1, 1]).vrbId === 'blended:arvo_part+glass';
}

function testSatisfiesSqVrbProfile(): boolean {
  const p: SqVrbProfile = blendedVrb([ARVO(), GLASS()], [1, 1]);
  return p.vrbId.startsWith('blended:') && Array.isArray(p.chordVocabulary);
}

function testBlendMetaPartsLength(): boolean {
  return blendedVrb([ARVO(), GLASS()], [1, 1])._blendMeta?.parts.length === 2;
}

function testMergedChordVocabularyTokens(): boolean {
  const meta = blendedVrb([ARVO(), GLASS()], [1, 1])._blendMeta;
  return (
    Array.isArray(meta?.mergedChordVocabulary) &&
    meta!.mergedChordVocabulary.every((t) => typeof t.value === 'string' && t.support > 0)
  );
}

function testMergedSupportPositive(): boolean {
  const meta = blendedVrb([ARVO(), GLASS()], [1, 1])._blendMeta!;
  return meta.mergedChordVocabulary.every((t) => t.support > 0);
}

function testTintinnabuliHighWeight(): boolean {
  const regime = resolveBlendedRegimeBooleans([
    part('arvo_part', 0.7),
    part('glass', 0.3),
  ]);
  return regime.tintinnabuliEnabled === true;
}

function testTintinnabuliLowWeight(): boolean {
  const regime = resolveBlendedRegimeBooleans([
    part('arvo_part', 0.4),
    part('glass', 0.6),
  ]);
  return regime.tintinnabuliEnabled === false;
}

function testSuppressFunctionalCombined(): boolean {
  const regime = resolveBlendedRegimeBooleans([
    part('arvo_part', 0.35),
    part('debussy', 0.35),
  ]);
  return regime.suppressFunctionalResolution === true;
}

function testThrowsTooFew(): boolean {
  try {
    blendedVrb([ARVO()], [1]);
    return false;
  } catch {
    return true;
  }
}

function testThrowsTooMany(): boolean {
  try {
    blendedVrb([ARVO(), GLASS(), SATIE(), WEBERN()], [1, 1, 1, 1]);
    return false;
  } catch {
    return true;
  }
}

function testThrowsLengthMismatch(): boolean {
  try {
    blendedVrb([ARVO(), GLASS()], [1]);
    return false;
  } catch {
    return true;
  }
}

function testThrowsZeroWeight(): boolean {
  try {
    blendedVrb([ARVO(), GLASS()], [0, 1]);
    return false;
  } catch {
    return true;
  }
}

function testThreeWayIdSorted(): boolean {
  return blendedVrb([SATIE(), GLASS(), ARVO()], [1, 2, 3]).vrbId === 'blended:arvo_part+glass+satie';
}

function testThreeWaySigmaBounded(): boolean {
  const s = blendedVrb([ARVO(), GLASS(), SATIE()], [1, 1, 1]).gceScorerAdjustments
    .registerCohesionStdevCeilingSt;
  return s >= 16 && s <= 19 + 0.55 * (19 - 16);
}

function testBestBbStyleDominant(): boolean {
  const p = blendedVrb([ARVO(), GLASS()], [0.2, 0.8]);
  return p.bestBbStyle === GLASS().bestBbStyle;
}

function testChordVocabularyPlainUnion(): boolean {
  const p = blendedVrb([ARVO(), GLASS()], [1, 1]);
  return Array.isArray(p.chordVocabulary) && typeof p.chordVocabulary[0] === 'string';
}

function testResolverBlendedSection(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: {
      opening: { blendVrbIds: ['arvo_part', 'glass'], blendWeights: [0.5, 0.5] },
    },
    sectionLabelMode: 'instrumental',
  });
  const ctx = map.get('opening')!;
  const profile = resolveSqVrbProfileForSection(ctx);
  return profile?.vrbId === 'blended:arvo_part+glass';
}

function testResolverNonBlendedUnchanged(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: { opening: 'glass' },
    sectionLabelMode: 'instrumental',
  });
  const ctx = map.get('opening')!;
  return resolveSqVrbProfileForSection(ctx)?.vrbId === 'glass' && !ctx.blendedVrbId;
}

function testHasExplicitBlendAssignment(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: {
      opening: { blendVrbIds: ['arvo_part', 'glass'], blendWeights: [0.5, 0.5] },
    },
    sectionLabelMode: 'instrumental',
  });
  const context = {
    generationMetadata: {
      sqToBbVrbContextBySection: Object.fromEntries(map),
    },
  } as CompositionContext;
  return hasExplicitPerSectionVrbAssignment(context);
}

function testRhythmBlendedArvoGlass(): boolean {
  const exp = rhythmExpectationForVrb('blended:arvo_part+glass');
  if (!exp?.anticipationRateMax) return false;
  return exp.anticipationRateMax >= 0.02 && exp.anticipationRateMax <= 0.08;
}

function testResolveVrbForBarBlended(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: {
      opening: { blendVrbIds: ['arvo_part', 'glass'], blendWeights: [0.5, 0.5] },
      development: 'shostakovich',
    },
    sectionLabelMode: 'instrumental',
  });
  const sections = [
    { label: 'opening', startBar: 1, length: 16 },
    { label: 'development', startBar: 17, length: 16 },
  ];
  const barCtx = resolveVrbForBar(4, map, 'glass', sections);
  return barCtx.vrbId === 'blended:arvo_part+glass';
}

function testParseBlendedIds(): boolean {
  const ids = parseBlendedVrbComponentIds('blended:arvo_part+glass');
  return ids?.length === 2 && ids[0] === 'arvo_part' && ids[1] === 'glass';
}

function testMergeWeightedVocabularyField(): boolean {
  const parts = [part('arvo_part', 1), part('glass', 1)];
  const pool = mergeWeightedVocabulary<string>(parts, 'chordVocabulary');
  return pool.length > 0 && pool.every((t) => t.support > 0);
}

export function runBlendedVrbTests(): { passed: number; failed: number } {
  const cases: [string, () => boolean][] = [
    ['normaliseWeights equal thirds', testNormaliseEqualThirds],
    ['normaliseWeights 2:1', testNormaliseTwoOne],
    ['resolveHardSwitch true', testHardSwitchTrue],
    ['resolveHardSwitch false', testHardSwitchFalse],
    ['resolveSoftBoolean true', testSoftBooleanTrue],
    ['resolveSoftBoolean false', testSoftBooleanFalse],
    ['resolveSigma arvo+glass', testSigmaArvoGlass],
    ['resolveSigma arvo+webern cap', testSigmaArvoWebern],
    ['resolveSigma openness=0', testSigmaOpennessZero],
    ['resolveSigma openness=1', testSigmaOpennessOne],
    ['vrbId 2-way', testVrbIdTwoWay],
    ['vrbId 3-way', testVrbIdThreeWay],
    ['vrbId sorted', testVrbIdSorted],
    ['SqVrbProfile shape', testSatisfiesSqVrbProfile],
    ['_blendMeta.parts length', testBlendMetaPartsLength],
    ['mergedChordVocabulary tokens', testMergedChordVocabularyTokens],
    ['merged support > 0', testMergedSupportPositive],
    ['tintinnabuli w=0.7', testTintinnabuliHighWeight],
    ['tintinnabuli w=0.4', testTintinnabuliLowWeight],
    ['suppressFunctional combined', testSuppressFunctionalCombined],
    ['throws <2 profiles', testThrowsTooFew],
    ['throws >3 profiles', testThrowsTooMany],
    ['throws length mismatch', testThrowsLengthMismatch],
    ['throws weight <=0', testThrowsZeroWeight],
    ['3-way id sorted', testThreeWayIdSorted],
    ['3-way sigma bounded', testThreeWaySigmaBounded],
    ['bestBbStyle dominant', testBestBbStyleDominant],
    ['chordVocabulary plain union', testChordVocabularyPlainUnion],
    ['resolver blended section', testResolverBlendedSection],
    ['resolver non-blended', testResolverNonBlendedUnchanged],
    ['hasExplicit blend', testHasExplicitBlendAssignment],
    ['rhythm blended arvo+glass', testRhythmBlendedArvoGlass],
    ['resolveVrbForBar blended', testResolveVrbForBarBlended],
    ['parseBlendedVrbComponentIds', testParseBlendedIds],
    ['mergeWeightedVocabulary', testMergeWeightedVocabularyField],
  ];
  let passed = 0;
  let failed = 0;
  for (const [name, fn] of cases) {
    try {
      if (fn()) {
        passed++;
      } else {
        failed++;
        console.error(`FAIL: ${name}`);
      }
    } catch (e) {
      failed++;
      console.error(`FAIL: ${name}`, e);
    }
  }
  return { passed, failed };
}
