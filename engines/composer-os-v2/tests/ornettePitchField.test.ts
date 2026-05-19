/**
 * Ornette pitch-field spine — Phase 1 substrate tests.
 */

import type { CompositionContext } from '../core/compositionContext';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import {
  buildPitchFieldSpine,
  getAvailablePcs,
  isUsingPitchFieldSubstrate,
  resolveFieldForBar,
} from '../core/harmony/pitchFieldResolver';
import { scheduleFieldRegions, MIN_REGION_BARS, MAX_REGION_BARS } from '../core/harmony/pitchFieldScheduler';
import { scorePitchFieldCoherence } from '../core/gce/gceAutoScorers';
import type { MelodicNote } from '../core/gce/gce_melody_eval';
import {
  ORNETTE_SQ_CONTRAPUNTAL_LINE_POLICY,
  ORNETTE_SQ_VRB_PROFILE,
  applyOrnetteVrbProfile,
} from '../core/counterpoint/vrbProfiles/ornetteSqVrb';
import { ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS } from '../core/counterpoint/vrbProfiles/ornetteSqVrbFingerprints';
import {
  SQ_VRB_PROFILE_REGISTRY_IDS,
  getSqVrbGceAdjustments,
  getSqVrbProfile,
} from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVrbFamily, VRB_FAMILIES } from '../core/counterpoint/vrbProfiles/vrbFamilies';
import { SQ_TO_BB_SQ_COMPOSER_OPTIONS } from '../ui/sqToBbWorkflowUi';

function minimalContext(totalBars: number, vrbId: string): CompositionContext {
  const chord = 'C7';
  return {
    seed: 50213,
    form: { totalBars, sections: [] },
    voiceBundle: getVoiceRuleBundle(vrbId),
    generationMetadata: { sqLineVrbId: vrbId },
    chordSymbolPlan: {
      totalBars,
      segments: [{ chord, startBar: 1, bars: totalBars }],
    },
  } as unknown as CompositionContext;
}

function testPitchFieldSpineBuilds(): boolean {
  const ctx = minimalContext(16, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 16, ctx);
  return spine.composerVrbId === 'ornette_coleman' && spine.regions.length >= 2;
}

function testResolveFieldForBar(): boolean {
  const ctx = minimalContext(16, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 16, ctx);
  const field = resolveFieldForBar(spine, 1, 'melody');
  return field.regionId.length > 0 && field.allowedPcs.length >= 5;
}

function testGetAvailablePcs(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const field = resolveFieldForBar(spine, 2, 'melody');
  const pcs = getAvailablePcs(field, 'melody');
  return pcs.length > 0 && pcs.every((p) => p.weight > 0);
}

function testMelodyOverlayCap(): boolean {
  const melody = ORNETTE_SQ_VRB_PROFILE.contrapuntalLinePolicy;
  void melody;
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const region = spine.regions[0]!;
  const mel = region.voiceOverlays.find((v) => v.voiceId === 'melody');
  return (mel?.overlapWithParent ?? 1) <= 0.85;
}

function testBassOverlayCap(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const region = spine.regions[0]!;
  const bass = region.voiceOverlays.find((v) => v.voiceId === 'bass');
  return (bass?.overlapWithParent ?? 1) <= 0.7;
}

function testOrnetteSubstrateTrue(): boolean {
  return isUsingPitchFieldSubstrate(getVoiceRuleBundle('ornette_coleman'));
}

function testGershwinSubstrateFalse(): boolean {
  return !isUsingPitchFieldSubstrate(getVoiceRuleBundle('gershwin'));
}

function testScheduleCoversAllBars(): boolean {
  const tension = Array.from({ length: 16 }, (_, i) => 0.4 + (i % 5) * 0.1);
  const density = Array.from({ length: 16 }, () => 0.5);
  const regions = scheduleFieldRegions({
    totalBars: 16,
    vrbId: 'ornette_coleman',
    tensionArc: tension,
    densityArc: density,
    seed: 99,
    buildRegion: (idx) => ({
      id: `r${idx}`,
      parentPcSet: [0, 3, 5, 7, 10],
      intervalPool: [{ semitones: 2, weight: 1 }],
      voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.75 }],
    }),
  });
  const covered = new Set<number>();
  for (const r of regions) {
    for (let b = r.startBar; b <= r.endBar; b++) covered.add(b);
  }
  return covered.size === 16;
}

function testRegionLengthRange(): boolean {
  const ctx = minimalContext(24, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 24, ctx);
  return spine.regions.every((r) => {
    const len = r.endBar - r.startBar + 1;
    return len >= MIN_REGION_BARS && len <= MAX_REGION_BARS;
  });
}

function testMutationStrengthRange(): boolean {
  const ctx = minimalContext(24, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 24, ctx);
  const transitions = spine.regions.map((r) => r.transitionOut).filter(Boolean);
  return transitions.every((t) => {
    const m = t!.mutationStrength;
    return m >= 0.35 && m <= 0.7;
  });
}

function testCarryPcsLength(): boolean {
  const ctx = minimalContext(24, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 24, ctx);
  const transitions = spine.regions.map((r) => r.transitionOut).filter(Boolean);
  return transitions.every((t) => {
    const c = t!.carryPcs ?? [];
    return c.length >= 2 && c.length <= 4;
  });
}

function testSigma33(): boolean {
  return getSqVrbGceAdjustments('ornette_coleman')?.registerCohesionStdevCeilingSt === 33;
}

function testHarmonicSubstrate(): boolean {
  return getSqVrbProfile('ornette_coleman')?.harmonicSubstrate === 'pitch-field-spine';
}

function testRegistryHasOrnette(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.includes('ornette_coleman');
}

function testRegistryCount22(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.length === 22;
}

function testSuppressFunctional(): boolean {
  return getVoiceRuleBundle('ornette_coleman').suppressFunctionalResolution === true;
}

function testIndependenceHigh(): boolean {
  return ORNETTE_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'high';
}

function testBestBbMingus(): boolean {
  return ORNETTE_SQ_VRB_PROFILE.bestBbStyle === 'mingus';
}

function testFingerprintCount(): boolean {
  return ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS.length >= 30;
}

function testWorkShapeReceipt(): boolean {
  return ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_SHAPE_OF_JAZZ'));
}

function testWorkFreeJazzReceipt(): boolean {
  return ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_FREE_JAZZ'));
}

function testDiffColtraneReceipt(): boolean {
  return ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_COLTRANE'));
}

function testFreeJazzFamily(): boolean {
  return (VRB_FAMILIES as Record<string, readonly string[]>).free_jazz?.includes('ornette_coleman') === true;
}

function testGetVrbFamilyFreeJazz(): boolean {
  return getVrbFamily('ornette_coleman') === 'free_jazz';
}

function testUiPicker(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_OPTIONS.some((o) => o.id === 'ornette_coleman');
}

function testScorePitchFieldCoherenceReturns(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const line: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 63, beats: 1, bar: 2, beat: 0 },
  ];
  const sc = scorePitchFieldCoherence(line, spine);
  return typeof sc.score === 'number' && sc.justification.length > 0;
}

function testScorePositiveOnMatch(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const line: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 63, beats: 1, bar: 1, beat: 1 },
    { midi: 67, beats: 1, bar: 2, beat: 0 },
  ];
  return scorePitchFieldCoherence(line, spine).score > 0;
}

function testScorePenalizedOutside(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const inField: MelodicNote[] = [
    { midi: 60, beats: 1, bar: 1, beat: 0 },
    { midi: 63, beats: 1, bar: 1, beat: 1 },
  ];
  const outField: MelodicNote[] = [
    { midi: 61, beats: 1, bar: 1, beat: 0 },
    { midi: 62, beats: 1, bar: 1, beat: 1 },
    { midi: 64, beats: 1, bar: 1, beat: 2 },
  ];
  return scorePitchFieldCoherence(inField, spine).score > scorePitchFieldCoherence(outField, spine).score;
}

function testResolveBarSymbolOrnettePitchField(): boolean {
  const ctx = minimalContext(8, 'ornette_coleman');
  const row = resolveBarSymbol(ctx, 1, 'melody');
  return row.pitchField != null && row.pitchField.allowedPcs.length > 0;
}

function testResolveBarSymbolGershwinNoPitchField(): boolean {
  const ctx = minimalContext(8, 'gershwin');
  const row = resolveBarSymbol(ctx, 1);
  return row.pitchField === undefined;
}

function testApplyOrnetteProfile(): boolean {
  const stub = getVoiceRuleBundle('ornette_coleman');
  const applied = applyOrnetteVrbProfile({
    ...stub,
    sqVrbProfileId: undefined,
    contrapuntalLinePolicy: undefined,
  });
  return applied.sqVrbProfileId === 'ornette_coleman' && applied.contrapuntalLinePolicy?.enabled === true;
}

export function runOrnettePitchFieldTests(): boolean {
  const cases: [string, () => boolean][] = [
    ['PitchFieldSpine builds for ornette_coleman', testPitchFieldSpineBuilds],
    ['resolveFieldForBar returns ResolvedPitchField', testResolveFieldForBar],
    ['getAvailablePcs returns weighted pc array', testGetAvailablePcs],
    ['melody overlay overlap <= 0.85', testMelodyOverlayCap],
    ['bass overlay overlap <= 0.70', testBassOverlayCap],
    ['isUsingPitchFieldSubstrate(ORNETTE) true', testOrnetteSubstrateTrue],
    ['isUsingPitchFieldSubstrate(GERSHWIN) false', testGershwinSubstrateFalse],
    ['scheduleFieldRegions covers all bars', testScheduleCoversAllBars],
    ['region length 2–8 bars', testRegionLengthRange],
    ['mutationStrength 0.35–0.70', testMutationStrengthRange],
    ['carryPcs length 2–4', testCarryPcsLength],
    ['ornette_coleman σ === 33', testSigma33],
    ['harmonicSubstrate pitch-field-spine', testHarmonicSubstrate],
    ['ornette_coleman in registry', testRegistryHasOrnette],
    ['registry total === 22', testRegistryCount22],
    ['suppressFunctionalResolution true', testSuppressFunctional],
    ['independenceLevel high', testIndependenceHigh],
    ['bestBbStyle mingus', testBestBbMingus],
    ['fingerprintReceipts >= 30', testFingerprintCount],
    ['WORK_SHAPE_OF_JAZZ receipt', testWorkShapeReceipt],
    ['WORK_FREE_JAZZ receipt', testWorkFreeJazzReceipt],
    ['DIFF_VS_COLTRANE receipt', testDiffColtraneReceipt],
    ['free_jazz in VRB_FAMILIES', testFreeJazzFamily],
    ['getVrbFamily ornette free_jazz', testGetVrbFamilyFreeJazz],
    ['ornette in UI picker', testUiPicker],
    ['scorePitchFieldCoherence returns CategoryScore', testScorePitchFieldCoherenceReturns],
    ['score > 0 when notes match field', testScorePositiveOnMatch],
    ['score penalised outside field', testScorePenalizedOutside],
    ['resolveBarSymbol Ornette has pitchField', testResolveBarSymbolOrnettePitchField],
    ['resolveBarSymbol Gershwin no pitchField', testResolveBarSymbolGershwinNoPitchField],
    ['applyOrnetteVrbProfile merges SQ row', testApplyOrnetteProfile],
  ];
  let ok = true;
  for (const [name, fn] of cases) {
    if (!fn()) {
      console.error(`[ornettePitchField] FAIL: ${name}`);
      ok = false;
    }
  }
  return ok;
}
