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

const test = {
  todo(name: string): { name: string; ok: boolean } {
    return { name: `[todo] ${name}`, ok: true };
  },
};

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
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() })).concat(
    test.todo(
      'Glass→Shostakovich seam: no voice moves >2 semitones at bar join — implement in Commit 4',
    ),
  );
}
