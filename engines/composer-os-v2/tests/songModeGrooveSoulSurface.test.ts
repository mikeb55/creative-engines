/**
 * Song Mode — STYLE_GROOVE_SOUL surface: metadata nudges are deterministic and receipt lines present.
 */

import { applyGrooveSoulStyleSurface } from '../core/song-mode/songModeStyleSurface';
import type { GenerationMetadata } from '../core/compositionContext';

function baseMeta(): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_GROOVE_SOUL',
  };
}

describe('applyGrooveSoulStyleSurface', () => {
  it('raises syncopation and density from defaults and sets receipt notes', () => {
    const m = baseMeta();
    applyGrooveSoulStyleSurface(m, 'STYLE_GROOVE_SOUL');
    expect(m.songwriterSyncopationBias).toBeCloseTo(0.62, 5);
    expect(m.songwriterDensityBias).toBeCloseTo(0.58, 5);
    expect(m.songModeStyleSurfaceNotes?.length).toBeGreaterThanOrEqual(2);
  });

  it('adds on top of existing songwriter biases', () => {
    const m = baseMeta();
    m.songwriterSyncopationBias = 0.4;
    m.songwriterDensityBias = 0.6;
    applyGrooveSoulStyleSurface(m, 'STYLE_GROOVE_SOUL');
    expect(m.songwriterSyncopationBias).toBeCloseTo(0.52, 5);
    expect(m.songwriterDensityBias).toBeCloseTo(0.68, 5);
  });

  it('no-op when not Groove/Soul', () => {
    const m = baseMeta();
    m.styleProfile = 'STYLE_ECM';
    applyGrooveSoulStyleSurface(m, 'STYLE_ECM');
    expect(m.songwriterSyncopationBias).toBeUndefined();
    expect(m.songModeStyleSurfaceNotes).toBeUndefined();
  });
});
