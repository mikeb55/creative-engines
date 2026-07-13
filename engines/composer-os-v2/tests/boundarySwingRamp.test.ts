/**
 * Boundary swing ramp + VRB family taxonomy (chunk 4).
 */

import {
  buildBoundaryRamp,
  getRampProfileForBar,
} from '../core/counterpoint/boundarySwingRamp';
import { getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileTypes';
import {
  blendedComponentIds,
  getVrbFamily,
  isSameFamily,
} from '../core/counterpoint/vrbProfiles/vrbFamilies';
import {
  resolveSectionBoundary,
  MAX_SEMITONES_PER_BAR_AT_SEAM,
  type SectionJoin,
} from '../core/harmony/sectionBoundaryResolver';
import { normalizeSectionVrbMap } from '../app-api/normalizeSectionVrbMap';
import { resolveVrbForBar } from '../core/counterpoint/vrbProfiles/vrbContextResolver';

function testGetVrbFamilyGershwin(): boolean {
  return getVrbFamily('gershwin') === 'jazz';
}

function testGetVrbFamilyDebussy(): boolean {
  return getVrbFamily('debussy') === 'impressionist';
}

function testGetVrbFamilyBartok(): boolean {
  return getVrbFamily('sq_vrb_bartok') === 'modernist';
}

function testGetVrbFamilyArvoPart(): boolean {
  return getVrbFamily('arvo_part') === 'tintinnabuli';
}

function testGetVrbFamilyGlass(): boolean {
  return getVrbFamily('glass') === 'minimal';
}

function testGetVrbFamilyUnknown(): boolean {
  return getVrbFamily('unknown_id') === null;
}

function testIsSameFamilyGershwinColePorter(): boolean {
  return isSameFamily('gershwin', 'cole_porter');
}

function testIsSameFamilyGershwinDebussy(): boolean {
  return !isSameFamily('gershwin', 'debussy');
}

function testIsSameFamilyRavelSatie(): boolean {
  return isSameFamily('ravel', 'satie');
}

function testIsSameFamilyArvoPartGlass(): boolean {
  return !isSameFamily('arvo_part', 'glass');
}

function testBlendedComponentIdsBlend(): boolean {
  const ids = blendedComponentIds('blended:glass+satie');
  return ids.length === 2 && ids.includes('glass') && ids.includes('satie');
}

function testBlendedComponentIdsPlain(): boolean {
  return blendedComponentIds('gershwin').join() === 'gershwin';
}

function testBuildRampSameFamilyLength(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return ramp.length === 2;
}

function testBuildRampBar0ADominant(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return ramp[0]!.weight[0] > ramp[0]!.weight[1];
}

function testBuildRampBar1BDominant(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return ramp[1]!.weight[1] > ramp[1]!.weight[0];
}

function testBuildRampDifferentFamilyEmpty(): boolean {
  return buildBoundaryRamp('gershwin', 'sq_vrb_bartok', 2, 17).length === 0;
}

function testBuildRampZeroBarsEmpty(): boolean {
  return buildBoundaryRamp('ravel', 'satie', 0, 17).length === 0;
}

function testBuildRampBlendedVrbId(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return ramp.every((r) => r.vrbProfile.vrbId.startsWith('blended:'));
}

function testBuildRampSqVrbProfileType(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return ramp.every((r) => Boolean(getSqVrbProfile(r.vrbProfile.vrbId)));
}

function testBuildRampThreeBarLinear(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 3, 10);
  if (ramp.length !== 3) return false;
  const w0 = ramp[0]!.weight;
  const w1 = ramp[1]!.weight;
  const w2 = ramp[2]!.weight;
  const step = 1 / 4;
  return (
    Math.abs(w0[0] - (1 - step)) < 1e-9 &&
    Math.abs(w0[1] - step) < 1e-9 &&
    Math.abs(w1[0] - (1 - 2 * step)) < 1e-9 &&
    Math.abs(w1[1] - 2 * step) < 1e-9 &&
    Math.abs(w2[0] - (1 - 3 * step)) < 1e-9 &&
    Math.abs(w2[1] - 3 * step) < 1e-9
  );
}

function testGetRampProfileForBarHit(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return getRampProfileForBar(17, ramp)?.vrbId.startsWith('blended:') === true;
}

function testGetRampProfileForBarMiss(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  return getRampProfileForBar(99, ramp) === null;
}

function withPerSectionTestEnv(fn: () => boolean): boolean {
  const prev = process.env.COMPOSER_OS_TEST_PER_SECTION_VRB;
  process.env.COMPOSER_OS_TEST_PER_SECTION_VRB = '1';
  try {
    return fn();
  } finally {
    if (prev === undefined) {
      delete process.env.COMPOSER_OS_TEST_PER_SECTION_VRB;
    } else {
      process.env.COMPOSER_OS_TEST_PER_SECTION_VRB = prev;
    }
  }
}

function testResolverSameFamilyBlendedAtJoin(): boolean {
  return withPerSectionTestEnv(() => {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'ravel', development: 'satie' },
      sectionLabelMode: 'instrumental',
    });
    const sections = [
      { label: 'opening', startBar: 1, length: 16 },
      { label: 'development', startBar: 17, length: 16 },
    ];
    const ctx = resolveVrbForBar(17, map, 'glass', sections);
    return ctx.vrbId.startsWith('blended:');
  });
}

function testResolverDifferentFamilyHardCut(): boolean {
  return withPerSectionTestEnv(() => {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'gershwin', development: 'sq_vrb_bartok' },
      sectionLabelMode: 'instrumental',
    });
    const sections = [
      { label: 'opening', startBar: 1, length: 16 },
      { label: 'development', startBar: 17, length: 16 },
    ];
    const ctx = resolveVrbForBar(17, map, 'glass', sections);
    return ctx.vrbId === 'sq_vrb_bartok' && !ctx.vrbId.startsWith('blended:');
  });
}

function testRampBoundaryMaxTwoSemitones(): boolean {
  const ramp = buildBoundaryRamp('ravel', 'satie', 2, 17);
  const rampProfile = ramp[0]?.vrbProfile as SqVrbProfile | undefined;
  if (!rampProfile) return false;
  const join: SectionJoin = {
    fromSectionId: 'opening',
    toSectionId: 'development',
    joinBar: 17,
    fromVrbId: 'ravel',
    toVrbId: 'satie',
    lastVoicingOfFromSection: { notes: [60, 64, 67, 48], cost: 0 },
    transitionBars: 2,
  };
  const out = resolveSectionBoundary(join, new Map(), [], 'Dm7', rampProfile);
  return out.notes.every(
    (p, i) => Math.abs(p - join.lastVoicingOfFromSection.notes[i]!) <= MAX_SEMITONES_PER_BAR_AT_SEAM,
  );
}

export function runBoundarySwingRampTests(): { name: string; ok: boolean }[] {
  return [
    ["getVrbFamily('gershwin') → jazz", testGetVrbFamilyGershwin],
    ["getVrbFamily('debussy') → impressionist", testGetVrbFamilyDebussy],
    ["getVrbFamily('sq_vrb_bartok') → modernist", testGetVrbFamilyBartok],
    ["getVrbFamily('arvo_part') → tintinnabuli", testGetVrbFamilyArvoPart],
    ["getVrbFamily('glass') → minimal", testGetVrbFamilyGlass],
    ["getVrbFamily('unknown_id') → null", testGetVrbFamilyUnknown],
    ["isSameFamily('gershwin','cole_porter') → true", testIsSameFamilyGershwinColePorter],
    ["isSameFamily('gershwin','debussy') → false", testIsSameFamilyGershwinDebussy],
    ["isSameFamily('ravel','satie') → true", testIsSameFamilyRavelSatie],
    ["isSameFamily('arvo_part','glass') → false", testIsSameFamilyArvoPartGlass],
    ["blendedComponentIds('blended:glass+satie')", testBlendedComponentIdsBlend],
    ['blendedComponentIds plain id', testBlendedComponentIdsPlain],
    ['buildBoundaryRamp ravel→satie n=2 length 2', testBuildRampSameFamilyLength],
    ['buildBoundaryRamp bar0 A dominant', testBuildRampBar0ADominant],
    ['buildBoundaryRamp bar1 B dominant', testBuildRampBar1BDominant],
    ['buildBoundaryRamp gershwin→bartok empty', testBuildRampDifferentFamilyEmpty],
    ['buildBoundaryRamp transitionBars=0 empty', testBuildRampZeroBarsEmpty],
    ['buildBoundaryRamp vrbId blended:', testBuildRampBlendedVrbId],
    ['buildBoundaryRamp SqVrbProfile type', testBuildRampSqVrbProfileType],
    ['buildBoundaryRamp 3-bar linear weights', testBuildRampThreeBarLinear],
    ['getRampProfileForBar hit', testGetRampProfileForBarHit],
    ['getRampProfileForBar miss', testGetRampProfileForBarMiss],
    ['resolver same-family join blended', testResolverSameFamilyBlendedAtJoin],
    ['resolver different-family hard cut', testResolverDifferentFamilyHardCut],
    ['ramp boundary max 2 semitones per voice', testRampBoundaryMaxTwoSemitones],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
