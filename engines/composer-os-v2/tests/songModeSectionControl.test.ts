/**
 * Shared Song Mode section-role control — form-relative roles, descriptors, finalize diagnostics.
 */

import type { GenerationMetadata } from '../core/compositionContext';
import {
  finalizeSongModeSectionShaping,
  mapSophisticatedPopKindToSongModeRole,
  registerSongModeSectionBehaviour,
  songModeSectionRoleForBar,
} from '../core/song-mode/songModeSectionControl';

describe('songModeSectionControl', () => {
  it('maps Sophisticated Pop kinds to shared roles', () => {
    expect(mapSophisticatedPopKindToSongModeRole('single')).toBe('WHOLE');
    expect(mapSophisticatedPopKindToSongModeRole('A')).toBe('OPENING');
    expect(mapSophisticatedPopKindToSongModeRole('A_prime')).toBe('OPENING');
    expect(mapSophisticatedPopKindToSongModeRole('B')).toBe('BRIDGE_LIFT');
    expect(mapSophisticatedPopKindToSongModeRole('return')).toBe('RETURN');
  });

  it('assigns roles from bar index without fixed literal A/B ranges only (32-bar classic)', () => {
    expect(songModeSectionRoleForBar(1, 32)).toBe('OPENING');
    expect(songModeSectionRoleForBar(12, 32)).toBe('OPENING');
    expect(songModeSectionRoleForBar(20, 32)).toBe('BRIDGE_LIFT');
    expect(songModeSectionRoleForBar(28, 32)).toBe('RETURN');
  });

  it('marks an outro tail on long forms', () => {
    expect(songModeSectionRoleForBar(41, 48)).toBe('OUTRO');
    expect(songModeSectionRoleForBar(40, 48)).not.toBe('OUTRO');
  });

  it('allows slices to attach distinct section behaviour descriptors', () => {
    const md = { songModeHookFirstIdentity: true } as GenerationMetadata;
    registerSongModeSectionBehaviour(md, {
      sliceId: 'donald_fagen',
      densityBiasByRole: { BRIDGE_LIFT: 0.03 },
      returnVariationType: 'evolved_comp',
    });
    registerSongModeSectionBehaviour(md, {
      sliceId: 'bacharach',
      harmonicColourBiasByRole: { BRIDGE_LIFT: 0.08 },
      returnVariationType: 'harmonic_recolour',
    });
    expect(md.songModeSectionBehaviourDescriptors?.length).toBe(2);
    expect(md.songModeSectionBehaviourDescriptors?.[0]?.sliceId).toBe('donald_fagen');
    expect(md.songModeSectionBehaviourDescriptors?.[1]?.sliceId).toBe('bacharach');
  });

  it('finalize aggregates stable diagnostics for eval harnesses', () => {
    const md = {
      totalBars: 32,
      songModeSectionBehaviourDescriptors: [
        {
          sliceId: 'style_sophisticated_pop',
          returnVariationType: 'none' as const,
        },
      ],
      sophisticatedPopHarmonyDiagnostics: {
        barsConsidered: 32,
        barsChanged: 4,
        meanColourDepth: 1,
        meanColourDepthSectionA: 0.8,
        meanColourDepthSectionB: 1.1,
        sectionContrastDelta: 0.3,
        extensionAdds: 2,
      },
      fagenKeysCompMusicalDiagnostics: {
        rhythmPatternFamily: 'x',
        meanSyncopationIndex: 0,
        densityDeltaBMinusA: 0.05,
        openingVsReturnRhMeanDelta: 0.02,
        returnPhraseGesturesApplied: 1,
        returnVariationSummary: 'Return varied voicing spacing.',
        avgInnerMotionSemitonesV2Top: 0,
        meanRhMidiV1OpenA: 0,
        meanRhMidiV1SectionB: 0,
      },
    } as GenerationMetadata;

    finalizeSongModeSectionShaping(md);
    const d = md.songModeSectionShapingDiagnostics;
    expect(d?.version).toBe(1);
    expect(d?.totalBars).toBe(32);
    expect(d?.colourDeltaBMinusA).toBeCloseTo(0.3, 5);
    expect(d?.densityDeltaBMinusA).toBeCloseTo(0.05, 5);
    expect(d?.openingVsReturnDelta).toBeCloseTo(0.02, 5);
    expect(d?.contributingSlices).toContain('style_sophisticated_pop');
    expect(md.songModeStyleSurfaceNotes?.some((l) => l.includes('Song Mode section shaping'))).toBe(true);
  });
});
