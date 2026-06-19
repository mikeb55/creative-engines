/**
 * Mosaic section planner — timeline, suggest-from-import, validation badges.
 */
import type { MosaicImportTimeline } from '@composer-os/core/import/mosaicImportTimeline';
import type { MosaicSectionPlanEntry } from '../../../apps/composer-os-app/src/components/MosaicSectionPlanner';
import {
  computeMosaicPlannerWarnings,
  computeTimelineBlocks,
  hasMixedPresetSections,
  presetRoleColor,
  resolvePlannerTotalBars,
  suggestSectionsFromImport,
} from '../../../apps/composer-os-app/src/components/mosaicSectionPlannerUtils';

function makeIr(overrides: Partial<MosaicImportTimeline> = {}): MosaicImportTimeline {
  return {
    schemaVersion: 1,
    sourceFormat: 'musicxml',
    bars: 16,
    timeSig: { num: 4, den: 4 },
    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'inferred' },
    harmonyByBar: [],
    melodyLine: [],
    ...overrides,
  };
}

describe('mosaicSectionPlanner', () => {
  test('A) timeline blocks — one per section, colours by presetRole', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'intro', startBar: 1, endBar: 8, songwriterStyleId: 'default', presetRole: 'duo' },
      { sectionLabel: 'shout', startBar: 9, endBar: 16, songwriterStyleId: 'default', presetRole: 'big_band' },
      { sectionLabel: 'coda', startBar: 17, endBar: 24, songwriterStyleId: 'default', presetRole: 'string_quartet' },
    ];
    const blocks = computeTimelineBlocks(sections, 24);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.color).toBe(presetRoleColor('duo'));
    expect(blocks[1]!.color).toBe(presetRoleColor('big_band'));
    expect(blocks[2]!.color).toBe(presetRoleColor('string_quartet'));
    expect(blocks[0]!.partCount).toBe(2);
    expect(blocks[1]!.partCount).toBe(15);
    expect(blocks[2]!.partCount).toBe(4);
  });

  test('B) block width proportional to bar span', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'a', startBar: 1, endBar: 4, songwriterStyleId: 'default' },
      { sectionLabel: 'b', startBar: 5, endBar: 12, songwriterStyleId: 'default' },
    ];
    const blocks = computeTimelineBlocks(sections, 12);
    expect(blocks[0]!.widthPercent).toBeCloseTo((4 / 12) * 100, 4);
    expect(blocks[1]!.widthPercent).toBeCloseTo((8 / 12) * 100, 4);
  });

  test('C) suggest-from-import populates sections from loaded IR', () => {
    const ir = makeIr({
      bars: 16,
      harmonyByBar: [
        { bar: 1, chordSymbol: 'Cmaj7', confidence: 0.95, fieldOrigin: 'explicit' },
        { bar: 9, chordSymbol: 'G7', confidence: 0.95, fieldOrigin: 'explicit' },
      ],
    });
    const suggested = suggestSectionsFromImport(ir);
    expect(suggested.length).toBeGreaterThanOrEqual(2);
    expect(suggested[0]!.startBar).toBe(1);
    expect(suggested[0]!.endBar).toBe(8);
    expect(suggested[1]!.startBar).toBe(9);
    expect(suggested[1]!.endBar).toBe(16);
    expect(suggested.every((s) => s.presetRole === 'duo')).toBe(true);
  });

  test('C2) suggest-from-import — single section when short chart', () => {
    const ir = makeIr({
      bars: 8,
      harmonyByBar: [{ bar: 1, chordSymbol: 'Am', confidence: 0.9, fieldOrigin: 'explicit' }],
    });
    const suggested = suggestSectionsFromImport(ir);
    expect(suggested).toHaveLength(1);
    expect(suggested[0]!.startBar).toBe(1);
    expect(suggested[0]!.endBar).toBe(8);
  });

  test('D) overlapping ranges → red warning badge', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'a', startBar: 1, endBar: 10, songwriterStyleId: 'default' },
      { sectionLabel: 'b', startBar: 8, endBar: 16, songwriterStyleId: 'default' },
    ];
    const warnings = computeMosaicPlannerWarnings(sections, 16, 'none');
    expect(warnings.some((w) => w.level === 'error' && w.message.includes('Overlaps'))).toBe(true);
  });

  test('E) gap in coverage → amber warning badge', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'a', startBar: 1, endBar: 4, songwriterStyleId: 'default' },
      { sectionLabel: 'b', startBar: 9, endBar: 12, songwriterStyleId: 'default' },
    ];
    const warnings = computeMosaicPlannerWarnings(sections, 12, 'none');
    expect(warnings.some((w) => w.level === 'warning' && w.message.includes('Gap'))).toBe(true);
  });

  test('F) mixed presets → info badge', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'duo', startBar: 1, endBar: 8, songwriterStyleId: 'default', presetRole: 'duo' },
      { sectionLabel: 'bb', startBar: 9, endBar: 16, songwriterStyleId: 'default', presetRole: 'big_band' },
    ];
    expect(hasMixedPresetSections(sections)).toBe(true);
    const warnings = computeMosaicPlannerWarnings(sections, 16, 'none');
    expect(warnings.some((w) => w.level === 'info' && w.message.includes('Mixed-preset'))).toBe(true);
  });

  test('G) section exceeds total bars → red warning', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'long', startBar: 1, endBar: 20, songwriterStyleId: 'default' },
    ];
    const warnings = computeMosaicPlannerWarnings(sections, 16, 'none');
    expect(warnings.some((w) => w.level === 'error' && w.message.includes('exceed total'))).toBe(true);
  });

  test('H) lead-sheet + BB section → warning', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'bb', startBar: 1, endBar: 8, songwriterStyleId: 'default', presetRole: 'big_band' },
    ];
    const warnings = computeMosaicPlannerWarnings(sections, 8, 'lead-sheet');
    expect(warnings.some((w) => w.level === 'warning' && w.message.includes('Lead sheet'))).toBe(true);
  });

  test('I) resolvePlannerTotalBars prefers section/preset span over shorter import', () => {
    const sections: MosaicSectionPlanEntry[] = [
      { sectionLabel: 'intro', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
      { sectionLabel: 'tail', startBar: 29, endBar: 40, songwriterStyleId: 'verlaine' },
    ];
    const ir = makeIr({ bars: 19 });
    expect(resolvePlannerTotalBars(sections, ir)).toBe(40);
    expect(resolvePlannerTotalBars(sections, ir, 40)).toBe(40);
  });
});