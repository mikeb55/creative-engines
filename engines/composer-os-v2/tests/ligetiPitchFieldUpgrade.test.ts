/**
 * Ligeti pitch-field upgrade — Session 3 tests.
 */

import type { CompositionContext } from '../core/compositionContext';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import type { PitchFieldRegion } from '../core/harmony/pitchFieldSpineTypes';
import { buildPitchFieldSpine } from '../core/harmony/pitchFieldResolver';
import { regionBoundsForVrb } from '../core/harmony/pitchFieldScheduler';
import { scoreMicropolyphonyCoherence } from '../core/gce/gceAutoScorers';
import type { MelodicNote } from '../core/gce/gce_melody_eval';
import {
  LIGETI_SQ_INTERVAL_POOL,
  LIGETI_SQ_TEXTURE,
  LIGETI_SQ_VRB_PROFILE,
} from '../core/counterpoint/vrbProfiles/ligetiSqVrb';
import { LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS } from '../core/counterpoint/vrbProfiles/ligetiSqVrbFingerprints';
import {
  SQ_VRB_PROFILE_REGISTRY_IDS,
  getSqVrbGceAdjustments,
} from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVrbFamily } from '../core/counterpoint/vrbProfiles/vrbFamilies';
import { ORNETTE_SQ_VRB_PROFILE } from '../core/counterpoint/vrbProfiles/ornetteSqVrb';

function minimalContext(totalBars: number, vrbId: string): CompositionContext {
  return {
    seed: 44102,
    form: { totalBars, sections: [] },
    voiceBundle: getVoiceRuleBundle(vrbId),
    generationMetadata: { sqLineVrbId: vrbId },
    chordSymbolPlan: {
      totalBars,
      segments: [{ chord: 'C', startBar: 1, bars: totalBars }],
    },
  } as unknown as CompositionContext;
}

function testTextureDensityField(): boolean {
  const r: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0, 1, 2],
    intervalPool: [{ semitones: 1, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.9 }],
    textureDensity: 0.85,
  };
  return r.textureDensity === 0.85;
}

function testCanonOffsetRangeField(): boolean {
  const r: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0],
    intervalPool: [{ semitones: 1, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.9 }],
    canonOffsetRange: [0.125, 0.5],
  };
  return r.canonOffsetRange?.[0] === 0.125 && r.canonOffsetRange?.[1] === 0.5;
}

function testClusterWidthField(): boolean {
  const r: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0],
    intervalPool: [{ semitones: 1, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.9 }],
    clusterWidth: 8,
  };
  return r.clusterWidth === 8;
}

function testMotionBlurField(): boolean {
  const r: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0],
    intervalPool: [{ semitones: 1, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.9 }],
    motionBlur: 0.7,
  };
  return r.motionBlur === 0.7;
}

function testEntryStaggerField(): boolean {
  const r: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0],
    intervalPool: [{ semitones: 1, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.9 }],
    entryStagger: 0.65,
  };
  return r.entryStagger === 0.65;
}

function testOrnetteRegionUnaffected(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const region = spine.regions[0]!;
  return (
    region.textureDensity === undefined &&
    region.clusterWidth === undefined &&
    region.cellGenerator === undefined
  );
}

function testSigma32(): boolean {
  return getSqVrbGceAdjustments('ligeti')?.registerCohesionStdevCeilingSt === 32;
}

function testHarmonicSubstrate(): boolean {
  return LIGETI_SQ_VRB_PROFILE.harmonicSubstrate === 'pitch-field-spine';
}

function testRegistryLigeti(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.includes('ligeti');
}

function testRegistry22(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.length === 22;
}

function testTextureDensityConstant(): boolean {
  return LIGETI_SQ_TEXTURE.textureDensity === 0.85;
}

function testClusterWidthConstant(): boolean {
  return LIGETI_SQ_TEXTURE.clusterWidth === 8;
}

function testMotionBlurConstant(): boolean {
  return LIGETI_SQ_TEXTURE.motionBlur === 0.7;
}

function testEntryStaggerConstant(): boolean {
  return LIGETI_SQ_TEXTURE.entryStagger === 0.65;
}

function testCanonOffsetMin(): boolean {
  return LIGETI_SQ_TEXTURE.canonOffsetRange[0] === 0.125;
}

function testIntervalM2Max(): boolean {
  return LIGETI_SQ_INTERVAL_POOL[0]?.weight === 1.0 && LIGETI_SQ_INTERVAL_POOL[0]?.semitones === 1;
}

function testIntervalP4Low(): boolean {
  const p4 = LIGETI_SQ_INTERVAL_POOL.find((i) => i.semitones === 4);
  return (p4?.weight ?? 1) <= 0.35;
}

function testMaxLeap3(): boolean {
  return getVoiceRuleBundle('ligeti').melodicPolicy.maxLeapSemitones === 3;
}

function testSuppressFunctional(): boolean {
  return getVoiceRuleBundle('ligeti').suppressFunctionalResolution === true;
}

function testBestBbSchneider(): boolean {
  return LIGETI_SQ_VRB_PROFILE.bestBbStyle === 'schneider';
}

function testFingerprints30(): boolean {
  return LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS.length >= 30;
}

function testWorkAtmospheres(): boolean {
  return LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_ATMOSPHERES'));
}

function testWorkLontano(): boolean {
  return LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_LONTANO'));
}

function testDiffBartok(): boolean {
  return LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_BARTOK'));
}

function testFamilyModernist(): boolean {
  return getVrbFamily('ligeti') === 'modernist';
}

function testSchedulerRegionLength(): boolean {
  const bounds = regionBoundsForVrb('ligeti');
  const ctx = minimalContext(64, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 64, ctx);
  return spine.regions.every((r) => {
    const len = r.endBar - r.startBar + 1;
    return len >= bounds.min && len <= bounds.max;
  });
}

function testMutationRange(): boolean {
  const ctx = minimalContext(64, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 64, ctx);
  const transitions = spine.regions.map((r) => r.transitionOut).filter(Boolean);
  return transitions.every((t) => {
    const m = t!.mutationStrength;
    return m >= 0.1 && m <= 0.35;
  });
}

function testMicropolyScoreReturns(): boolean {
  const ctx = minimalContext(8, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 8, ctx);
  const line: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 61, beats: 1, bar: 1, beat: 0.25 },
  ];
  const sc = scoreMicropolyphonyCoherence(line, spine, 0.85);
  return typeof sc.score === 'number' && sc.justification.length > 0;
}

function testMicropolyRewardsStepwise(): boolean {
  const ctx = minimalContext(8, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 8, ctx);
  const stepwise: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 61, beats: 1, bar: 1, beat: 0.25 },
    { midi: 62, beats: 1, bar: 2, beat: 0 },
    { midi: 63, beats: 1, bar: 2, beat: 0.25 },
  ];
  const leap: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 72, beats: 1, bar: 2, beat: 0 },
    { midi: 48, beats: 1, bar: 3, beat: 0 },
  ];
  return (
    scoreMicropolyphonyCoherence(stepwise, spine, 0.85).score >
    scoreMicropolyphonyCoherence(leap, spine, 0.85).score
  );
}

function testMicropolyPenalisesLeaps(): boolean {
  const ctx = minimalContext(8, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 8, ctx);
  const small: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 62, beats: 1, bar: 1, beat: 0.5 },
  ];
  const large: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 72, beats: 1, bar: 2, beat: 0 },
  ];
  return (
    scoreMicropolyphonyCoherence(small, spine, 0.85).score >=
    scoreMicropolyphonyCoherence(large, spine, 0.85).score
  );
}

function testOrnetteSubstrateUnchanged(): boolean {
  return ORNETTE_SQ_VRB_PROFILE.harmonicSubstrate === 'pitch-field-spine';
}

function testColtraneSigma31(): boolean {
  return getSqVrbGceAdjustments('coltrane')?.registerCohesionStdevCeilingSt === 31;
}

function testMessiaenSigma22(): boolean {
  return getSqVrbGceAdjustments('messiaen')?.registerCohesionStdevCeilingSt === 22;
}

function testGershwinNoPitchField(): boolean {
  const ctx = minimalContext(8, 'gershwin');
  return resolveBarSymbol(ctx, 1).pitchField === undefined;
}

function testLigetiRegionTextureFromSpine(): boolean {
  const ctx = minimalContext(16, 'ligeti');
  const spine = buildPitchFieldSpine('ligeti', 16, ctx);
  const r = spine.regions[0]!;
  return (
    r.textureDensity === 0.85 &&
    r.clusterWidth === 8 &&
    r.motionBlur === 0.7 &&
    r.entryStagger === 0.65
  );
}

function testResolveBarSymbolLigetiPitchField(): boolean {
  const ctx = minimalContext(8, 'ligeti');
  const row = resolveBarSymbol(ctx, 1, 'melody');
  return row.pitchField != null && row.pitchField.allowedPcs.length >= 10;
}

export function runLigetiPitchFieldUpgradeTests(): boolean {
  const cases: [string, () => boolean][] = [
    ['PitchFieldRegion textureDensity', testTextureDensityField],
    ['PitchFieldRegion canonOffsetRange', testCanonOffsetRangeField],
    ['PitchFieldRegion clusterWidth', testClusterWidthField],
    ['PitchFieldRegion motionBlur', testMotionBlurField],
    ['PitchFieldRegion entryStagger', testEntryStaggerField],
    ['Ornette region optional fields unset', testOrnetteRegionUnaffected],
    ['ligeti σ === 32', testSigma32],
    ['harmonicSubstrate pitch-field-spine', testHarmonicSubstrate],
    ['ligeti in registry', testRegistryLigeti],
    ['registry total === 22', testRegistry22],
    ['textureDensity 0.85', testTextureDensityConstant],
    ['clusterWidth 8', testClusterWidthConstant],
    ['motionBlur 0.70', testMotionBlurConstant],
    ['entryStagger 0.65', testEntryStaggerConstant],
    ['canonOffsetRange[0] 0.125', testCanonOffsetMin],
    ['intervalPool m2 weight 1.00', testIntervalM2Max],
    ['intervalPool P4 weight <= 0.35', testIntervalP4Low],
    ['maxLeapSemitones 3', testMaxLeap3],
    ['suppressFunctionalResolution', testSuppressFunctional],
    ['bestBbStyle schneider', testBestBbSchneider],
    ['fingerprints >= 30', testFingerprints30],
    ['WORK_ATMOSPHERES', testWorkAtmospheres],
    ['WORK_LONTANO', testWorkLontano],
    ['DIFF_VS_BARTOK', testDiffBartok],
    ['getVrbFamily modernist', testFamilyModernist],
    ['scheduler region 8–32 bars', testSchedulerRegionLength],
    ['mutationStrength 0.10–0.35', testMutationRange],
    ['scoreMicropolyphonyCoherence returns', testMicropolyScoreReturns],
    ['micropoly rewards stepwise', testMicropolyRewardsStepwise],
    ['micropoly penalises leaps >3', testMicropolyPenalisesLeaps],
    ['Ornette substrate unchanged', testOrnetteSubstrateUnchanged],
    ['Coltrane σ 31 unchanged', testColtraneSigma31],
    ['Messiaen σ 22 unchanged', testMessiaenSigma22],
    ['Gershwin no pitchField', testGershwinNoPitchField],
    ['ligeti spine region texture fields', testLigetiRegionTextureFromSpine],
    ['resolveBarSymbol ligeti pitchField', testResolveBarSymbolLigetiPitchField],
  ];
  let ok = true;
  for (const [name, fn] of cases) {
    if (!fn()) {
      console.error(`[ligetiPitchFieldUpgrade] FAIL: ${name}`);
      ok = false;
    }
  }
  return ok;
}
