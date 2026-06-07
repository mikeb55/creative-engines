/**
 * Song Mode → Mosaic mapper unit tests (V79b).
 */

import type { CompiledSong, SectionChordPlan } from './songCompilationTypes';
import { mapSongModeToMosaicSectionPlan } from './songModeToMosaicMapper';

function section(
  overrides: Partial<SectionChordPlan> & Pick<SectionChordPlan, 'sectionKind' | 'chordSymbols'>
): SectionChordPlan {
  return {
    sectionOrder: 0,
    intensity: 'medium',
    ...overrides,
  };
}

function compiled(chordPlan: SectionChordPlan[]): CompiledSong {
  return {
    id: 'test',
    title: 'Test',
    voiceType: 'male_tenor',
    hook: {
      id: 'hook_1',
      contourHint: 'arch',
      rhythmHint: 'steady',
      repetitionPriority: 0.8,
    },
    sectionSummary: [],
    chordPlan,
    melodyFirst: true,
    hookFirst: true,
    leadSheetReady: true,
  };
}

describe('mapSongModeToMosaicSectionPlan', () => {
  it('maps explicit per-section songwriterStyleId independently', () => {
    const plan = mapSongModeToMosaicSectionPlan(
      compiled([
        section({
          sectionOrder: 0,
          sectionKind: 'verse',
          chordSymbols: ['Am', 'Dm', 'G', 'C'],
          songwriterStyleId: 'fripp',
        } as SectionChordPlan & { songwriterStyleId: string }),
        section({
          sectionOrder: 1,
          sectionKind: 'chorus',
          chordSymbols: ['F', 'G', 'Am', 'Am'],
          songwriterStyleId: 'jack_white',
        } as SectionChordPlan & { songwriterStyleId: string }),
      ])
    );

    expect(plan).toHaveLength(2);
    expect(plan[0]?.songwriterStyleId).toBe('fripp');
    expect(plan[1]?.songwriterStyleId).toBe('jack_white');
  });

  it('falls back to req.primarySongwriterStyle when no per-section override', () => {
    const plan = mapSongModeToMosaicSectionPlan(
      compiled([
        section({ sectionOrder: 0, sectionKind: 'bridge', chordSymbols: ['Am', 'Dm'] }),
        section({ sectionOrder: 1, sectionKind: 'pre_chorus', chordSymbols: ['F', 'G'] }),
      ]),
      { songwriterStyleId: 'wayne_shorter' }
    );

    expect(plan).toHaveLength(2);
    expect(plan[0]?.songwriterStyleId).toBe('wayne_shorter');
    expect(plan[1]?.songwriterStyleId).toBe('wayne_shorter');
  });

  it('returns [] for a single section (mosaic requires 2+)', () => {
    const plan = mapSongModeToMosaicSectionPlan(
      compiled([
        section({ sectionOrder: 0, sectionKind: 'verse', chordSymbols: ['Am', 'Dm', 'G', 'C'] }),
      ]),
      { songwriterStyleId: 'fripp' }
    );

    expect(plan).toEqual([]);
  });
});
