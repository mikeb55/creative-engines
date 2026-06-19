/**
 * Mosaic section-plan presets - registry, voice validity, Plan A bar map.
 */

import {
  TELEVISION_FIELD_SUITE_PRESET,
  TELEVISION_FIELD_SUITE_PRESET_ID,
  cloneMosaicSectionPlanPresetPlan,
  getMosaicSectionPlanPreset,
  listMosaicSectionPlanPresetIds,
} from '../core/mosaic-mode/mosaicSectionPlanPresets';
import { getDispatchEntry } from '../core/mosaic-mode/mosaicComposerDispatch';
import { resolveMosaicSectionStyles } from '../core/mosaic-mode/resolveMosaicSectionStyles';

describe('mosaicSectionPlanPresets', () => {
  test('A) television_field_suite preset is registered', () => {
    expect(listMosaicSectionPlanPresetIds()).toContain(TELEVISION_FIELD_SUITE_PRESET_ID);
    expect(getMosaicSectionPlanPreset(TELEVISION_FIELD_SUITE_PRESET_ID)).toBe(
      TELEVISION_FIELD_SUITE_PRESET,
    );
    expect(getMosaicSectionPlanPreset('missing')).toBeUndefined();
  });

  test('B) all referenced voice ids are valid dispatch entries', () => {
    for (const section of TELEVISION_FIELD_SUITE_PRESET.plan) {
      expect(getDispatchEntry(section.songwriterStyleId)).toBeDefined();
    }
  });

  test('C) section/bar mapping matches Plan A with boundaries 8 / 20 / 28 / 40', () => {
    const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET_ID);
    expect(plan).toHaveLength(4);
    expect(plan[0]).toMatchObject({
      sectionLabel: 'intro',
      startBar: 1,
      endBar: 8,
      songwriterStyleId: 'verlaine',
      presetRole: 'duo',
    });
    expect(plan[1]).toMatchObject({
      sectionLabel: 'build',
      startBar: 9,
      endBar: 20,
      songwriterStyleId: 'marr',
      presetRole: 'duo',
    });
    expect(plan[2]).toMatchObject({
      sectionLabel: 'peak',
      startBar: 21,
      endBar: 28,
      songwriterStyleId: 'fripp',
      presetRole: 'duo',
    });
    expect(plan[3]).toMatchObject({
      sectionLabel: 'tail',
      startBar: 29,
      endBar: 40,
      songwriterStyleId: 'verlaine',
      presetRole: 'duo',
    });

    const routing = resolveMosaicSectionStyles(
      { sections: [], totalBars: TELEVISION_FIELD_SUITE_PRESET.totalBars },
      {
        generatedAt: '2026-06-19T00:00:00.000Z',
        songwriterStyleId: 'verlaine',
        mosaicSectionPlan: plan,
      },
    );

    expect(routing.mode).toBe('duo');
    expect(routing.barComposerMap[8]).toBe('verlaine');
    expect(routing.barComposerMap[9]).toBe('marr');
    expect(routing.barComposerMap[20]).toBe('marr');
    expect(routing.barComposerMap[21]).toBe('fripp');
    expect(routing.barComposerMap[28]).toBe('fripp');
    expect(routing.barComposerMap[29]).toBe('verlaine');
    expect(routing.barComposerMap[40]).toBe('verlaine');

    for (let bar = 1; bar <= 40; bar++) {
      expect(routing.barComposerMap[bar]).toBeDefined();
    }
  });
});