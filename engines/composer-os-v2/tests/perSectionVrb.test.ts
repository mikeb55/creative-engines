/**
 * Per-section VRB — types, labels, Glass→Shostakovich (Commit 1).
 */

import {
  buildGlobalVrbContextMap,
  dominantVrb,
  validateVrbWeights,
  type SectionVrbContext,
} from '../core/counterpoint/vrbProfiles/vrbContextMap';
import {
  getSectionLabelsForMode,
  isValidSectionLabel,
  SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
} from '../core/counterpoint/vrbProfiles/sqToBbSectionLabels';
import {
  assertSectionBarRanges,
  buildSqToBbFormSections,
  normalizeSectionVrbMap,
} from '../app-api/normalizeSectionVrbMap';
import { resolveVrbForBar, sectionRecordFromVrbContextMap } from '../core/counterpoint/vrbProfiles/vrbContextResolver';
import { USE_PER_SECTION_VRB } from '../core/counterpoint/vrbProfiles/vrbContextMap';
import {
  computeTransitionBars,
  joinConstraint,
  resolveSectionBoundary,
  MAX_SEMITONES_PER_BAR_AT_SEAM,
  type SectionJoin,
} from '../core/harmony/sectionBoundaryResolver';
import { buildSectionAwareHarmonySpine, chordUsesVrbVocabulary } from '../core/harmony/harmonySpineSectionLoop';
import { mergeBoundaryThreshold, resolveSqGceForBar } from '../core/gce/sqVrbGcePerBar';
import { getSqVrbGceAdjustments } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { CompositionContext } from '../core/compositionContext';

function testBuildGlobalVrbContextMap(): boolean {
  const map = buildGlobalVrbContextMap('glass', 32);
  if (map.size !== 1) return false;
  const ctx = map.get('sq_bb');
  if (!ctx || ctx.sectionId !== 'sq_bb') return false;
  return ctx.vrbs.length === 1 && ctx.vrbs[0]!.vrbId === 'glass' && ctx.vrbs[0]!.weight === 1;
}

function testDominantVrbMultiWeight(): boolean {
  const ctx: SectionVrbContext = {
    sectionId: 'development',
    vrbs: [
      { vrbId: 'glass', weight: 0.2 },
      { vrbId: 'shostakovich', weight: 0.55 },
      { vrbId: 'ravel', weight: 0.25 },
    ],
    transitionBars: 2,
  };
  return dominantVrb(ctx) === 'shostakovich';
}

function testValidateVrbWeights(): boolean {
  const valid: SectionVrbContext = {
    sectionId: 'sq_bb',
    vrbs: [
      { vrbId: 'a', weight: 0.6 },
      { vrbId: 'b', weight: 0.4 },
    ],
    transitionBars: 0,
  };
  const invalid: SectionVrbContext = {
    sectionId: 'sq_bb',
    vrbs: [
      { vrbId: 'a', weight: 0.5 },
      { vrbId: 'b', weight: 0.3 },
    ],
    transitionBars: 0,
  };
  return validateVrbWeights(valid) && !validateVrbWeights(invalid);
}

function testIsValidSectionLabelSong(): boolean {
  return (
    isValidSectionLabel('verse', 'song') &&
    !isValidSectionLabel('development', 'song') &&
    isValidSectionLabel('sq_bb', 'song')
  );
}

function testIsValidSectionLabelInstrumental(): boolean {
  return (
    isValidSectionLabel('development', 'instrumental') &&
    !isValidSectionLabel('chorus', 'instrumental') &&
    isValidSectionLabel('sq_bb', 'instrumental')
  );
}

function testGetSectionLabelsForModeCounts(): boolean {
  return (
    SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE === 'instrumental' &&
    getSectionLabelsForMode('song').length === 6 &&
    getSectionLabelsForMode('instrumental').length === 8
  );
}

function testFreeFormLabelRejected(): boolean {
  return !isValidSectionLabel('my_custom_section', 'song') && !isValidSectionLabel('my_custom_section', 'instrumental');
}

function testNormalizeSectionVrbMapFromMap(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: { opening: 'glass', development: 'shostakovich' },
    sectionLabelMode: 'instrumental',
  });
  if (map.size !== 2) return false;
  const opening = map.get('opening');
  const development = map.get('development');
  return (
    opening?.sectionId === 'opening' &&
    dominantVrb(opening) === 'glass' &&
    development?.sectionId === 'development' &&
    dominantVrb(development) === 'shostakovich'
  );
}

function testNormalizeSectionVrbMapComposerFallback(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sqToBbSqComposer: 'glass',
  });
  const ctx = map.get('sq_bb');
  return map.size === 1 && ctx != null && dominantVrb(ctx) === 'glass';
}

function testNormalizeSectionVrbMapInvalidLabel(): boolean {
  try {
    normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { my_custom_section: 'glass' },
    });
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return msg.includes('Invalid section label') && msg.includes('my_custom_section');
  }
}

function testNormalizeSectionVrbMapUnknownVrbId(): boolean {
  try {
    normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'not_a_real_vrb' },
    });
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return msg.includes('Unknown vrbId') && msg.includes('not_a_real_vrb') && msg.includes('opening');
  }
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

function testResolveVrbForBarRespectsFlag(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: { opening: 'glass', development: 'shostakovich' },
  });
  const sections = [
    { label: 'opening', startBar: 1, length: 16 },
    { label: 'development', startBar: 17, length: 16 },
  ];
  const bar5 = resolveVrbForBar(5, map, 'ravel', sections);
  const bar20 = resolveVrbForBar(20, map, 'ravel', sections);
  if (!USE_PER_SECTION_VRB) {
    return bar5.vrbId === 'ravel' && bar20.vrbId === 'ravel' && bar5.sectionId === 'sq_bb';
  }
  return (
    bar5.vrbId === 'glass' &&
    bar5.sectionId === 'opening' &&
    bar20.vrbId === 'shostakovich' &&
    bar20.sectionId === 'development'
  );
}

function testResolveVrbForBarSectionA(): boolean {
  return withPerSectionTestEnv(() => {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'glass', development: 'shostakovich' },
      sectionLabelMode: 'instrumental',
    });
    const sections = [
      { label: 'opening', startBar: 1, length: 16 },
      { label: 'development', startBar: 17, length: 16 },
    ];
    const ctx = resolveVrbForBar(4, map, 'ravel', sections);
    return ctx.sectionId === 'opening' && ctx.vrbId === 'glass';
  });
}

function testResolveVrbForBarSectionB(): boolean {
  return withPerSectionTestEnv(() => {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'glass', development: 'shostakovich' },
      sectionLabelMode: 'instrumental',
    });
    const sections = [
      { label: 'opening', startBar: 1, length: 16 },
      { label: 'development', startBar: 17, length: 16 },
    ];
    const ctx = resolveVrbForBar(20, map, 'ravel', sections);
    return ctx.sectionId === 'development' && ctx.vrbId === 'shostakovich';
  });
}

function testResolveVrbForBarSafetyNet(): boolean {
  return withPerSectionTestEnv(() => {
    const map = normalizeSectionVrbMap({ totalBars: 16, sectionVrbMap: { opening: 'glass' } });
    const sections = [{ label: 'opening', startBar: 1, length: 8 }];
    const ctx = resolveVrbForBar(99, map, 'ravel', sections);
    return ctx.vrbId === 'ravel' && ctx.sectionId === 'sq_bb';
  });
}

function testResolveVrbForBarTransitionZone(): boolean {
  return withPerSectionTestEnv(() => {
    const map = new Map([
      [
        'opening',
        {
          sectionId: 'opening',
          vrbs: [{ vrbId: 'glass', weight: 1 }],
          transitionBars: 2,
        },
      ],
    ]);
    const sections = [{ label: 'opening', startBar: 1, length: 8 }];
    return (
      resolveVrbForBar(7, map, 'ravel', sections).isTransitionBar &&
      resolveVrbForBar(8, map, 'ravel', sections).isTransitionBar
    );
  });
}

function testResolveVrbForBarNonTransitionZone(): boolean {
  return withPerSectionTestEnv(() => {
    const map = new Map([
      [
        'opening',
        {
          sectionId: 'opening',
          vrbs: [{ vrbId: 'glass', weight: 1 }],
          transitionBars: 2,
        },
      ],
    ]);
    const sections = [{ label: 'opening', startBar: 1, length: 8 }];
    return !resolveVrbForBar(5, map, 'ravel', sections).isTransitionBar;
  });
}

function testComputeTransitionBarsGlassToShostakovich(): boolean {
  return computeTransitionBars('glass', 'shostakovich') === 4;
}

function testComputeTransitionBarsEqualSigma(): boolean {
  return computeTransitionBars('glass', 'glass') === 1;
}

function testResolveSectionBoundaryWithinTwoSemitones(): boolean {
  const join: SectionJoin = {
    fromSectionId: 'opening',
    toSectionId: 'development',
    joinBar: 17,
    fromVrbId: 'glass',
    toVrbId: 'shostakovich',
    lastVoicingOfFromSection: { notes: [60, 64, 67, 48], cost: 0 },
    transitionBars: 4,
  };
  const out = resolveSectionBoundary(join, new Map(), [], 'Dm7');
  return out.notes.every((p, i) => Math.abs(p - join.lastVoicingOfFromSection.notes[i]!) <= MAX_SEMITONES_PER_BAR_AT_SEAM);
}

function testJoinConstraintNearestTone(): boolean {
  const c = joinConstraint({ voiceIndex: 0, pitchMidi: 60 }, 'C');
  return Math.abs(c.targetPitch - 60) <= MAX_SEMITONES_PER_BAR_AT_SEAM;
}

function testJoinConstraintSustainWhenFar(): boolean {
  const c = joinConstraint({ voiceIndex: 0, pitchMidi: 90 }, 'C');
  return c.targetPitch === 90;
}

function testGceBoundaryThresholdMaxNotAverage(): boolean {
  const a = getSqVrbGceAdjustments('glass')!.registerCohesionStdevCeilingSt;
  const b = getSqVrbGceAdjustments('shostakovich')!.registerCohesionStdevCeilingSt;
  const maxed = mergeBoundaryThreshold(a, b);
  const avg = (a + b) / 2;
  return maxed === Math.max(a, b) && maxed > avg;
}

function testGceBoundaryBarFlag(): boolean {
  return withPerSectionTestEnv(() => {
    const ctx = buildGlassShostakovichContext();
    const res = resolveSqGceForBar(17, ctx, 'glass');
    return res.isBoundaryBar === true;
  });
}

function buildGlassShostakovichContext(): CompositionContext {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: { opening: 'glass', development: 'shostakovich' },
    sectionLabelMode: 'instrumental',
  });
  const sections = buildSqToBbFormSections(map, 32, 'instrumental');
  const segments = Array.from({ length: 32 }, (_, i) => ({
    startBar: i + 1,
    bars: 1,
    chord: i < 16 ? 'Am' : 'Dm',
  }));
  return {
    form: { totalBars: 32, sections },
    voiceBundle: getVoiceRuleBundle('glass'),
    generationMetadata: {
      sqLineVrbId: 'glass',
      sqToBbVrbContextBySection: sectionRecordFromVrbContextMap(map),
    },
    seed: 42,
    chordSymbolPlan: { segments, totalBars: 32 },
  } as CompositionContext;
}

function maxVoiceMove(a: number[], b: number[]): number {
  let m = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = Math.abs((b[i] ?? b[b.length - 1]!) - (a[i] ?? a[a.length - 1]!));
    m = Math.max(m, d);
  }
  return m;
}

function testGlassShostakovichSeamLive(): boolean {
  return withPerSectionTestEnv(() => {
    const ctx = buildGlassShostakovichContext();
    const spine = buildSectionAwareHarmonySpine(ctx);
    const bar16 = spine.find((r) => r.bar === 16);
    const bar17 = spine.find((r) => r.bar === 17);
    if (!bar16 || !bar17 || !bar16.voicing || !bar17.voicing) return false;
    const a = bar16.isPhraseBoundary === true;
    const b = maxVoiceMove(bar16.voicing.notes, bar17.voicing.notes) <= MAX_SEMITONES_PER_BAR_AT_SEAM;
    const c = bar17.resolvedVrbId === 'shostakovich' || chordUsesVrbVocabulary(bar17.symbol, 'shostakovich');
    const d = !bar17.usedEmergencyFallback;
    return a && b && c && d;
  });
}

function testSectionBarRangesSumToTotalBars(): boolean {
  const map = normalizeSectionVrbMap({
    totalBars: 32,
    sectionVrbMap: { opening: 'glass', statement: 'ravel', development: 'shostakovich', coda: 'webern' },
    sectionLabelMode: 'instrumental',
  });
  const sections = buildSqToBbFormSections(map, 32, 'instrumental');
  try {
    assertSectionBarRanges(sections, 32);
    return sections.length === 4 && sections.every((s) => s.length > 0);
  } catch {
    return false;
  }
}

export function runPerSectionVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['buildGlobalVrbContextMap — single sq_bb entry', testBuildGlobalVrbContextMap],
    ['dominantVrb — highest weight from blend', testDominantVrbMultiWeight],
    ['validateVrbWeights — sum 1.0 tolerance', testValidateVrbWeights],
    ['isValidSectionLabel — song mode', testIsValidSectionLabelSong],
    ['isValidSectionLabel — instrumental mode', testIsValidSectionLabelInstrumental],
    ['getSectionLabelsForMode — 6 song / 8 instrumental', testGetSectionLabelsForModeCounts],
    ['isValidSectionLabel — reject free-form keys', testFreeFormLabelRejected],
    ['normalizeSectionVrbMap — sectionVrbMap present', testNormalizeSectionVrbMapFromMap],
    ['normalizeSectionVrbMap — sqToBbSqComposer fallback', testNormalizeSectionVrbMapComposerFallback],
    ['normalizeSectionVrbMap — invalid label throws', testNormalizeSectionVrbMapInvalidLabel],
    ['normalizeSectionVrbMap — unknown vrbId throws', testNormalizeSectionVrbMapUnknownVrbId],
    ['buildSqToBbFormSections — bar ranges sum to totalBars', testSectionBarRangesSumToTotalBars],
    ['resolveVrbForBar — respects USE_PER_SECTION_VRB flag', testResolveVrbForBarRespectsFlag],
    ['resolveVrbForBar — flag true section A vrbId', testResolveVrbForBarSectionA],
    ['resolveVrbForBar — flag true section B vrbId', testResolveVrbForBarSectionB],
    ['resolveVrbForBar — flag true unknown bar safety net', testResolveVrbForBarSafetyNet],
    ['resolveVrbForBar — isTransitionBar true at section end', testResolveVrbForBarTransitionZone],
    ['resolveVrbForBar — isTransitionBar false mid-section', testResolveVrbForBarNonTransitionZone],
    ['computeTransitionBars — glass→shostakovich clamped to 4', testComputeTransitionBarsGlassToShostakovich],
    ['computeTransitionBars — equal σ returns 1', testComputeTransitionBarsEqualSigma],
    ['resolveSectionBoundary — voices within 2 semitones', testResolveSectionBoundaryWithinTwoSemitones],
    ['joinConstraint — nearest chord tone within 2st', testJoinConstraintNearestTone],
    ['joinConstraint — sustain when no tone within 2st', testJoinConstraintSustainWhenFar],
    ['GCE boundary threshold — max not average', testGceBoundaryThresholdMaxNotAverage],
    ['GCE boundary bar — isBoundaryBar flagged', testGceBoundaryBarFlag],
    ['Glass→Shostakovich seam — live fixture', testGlassShostakovichSeamLive],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
