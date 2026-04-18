/**
 * Song Mode — Donald Fagen primary songwriter surface: metadata nudges are deterministic; receipt lines present.
 */

import {
  appendSongModeStyleSurfaceNotes,
  applyDonaldFagenSongwriterSurface,
} from '../core/song-mode/songModeStyleSurface';
import type { GenerationMetadata } from '../core/compositionContext';

function baseMeta(): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_ECM',
    songwriterPhraseRegularity: 0.3,
    songwriterSyncopationBias: 0.6,
    songwriterDensityBias: 0.5,
    songwriterHookRepetitionBias: 0.45,
    fagenMuChordBias: 0.7,
    fagenLydianMajorBias: 0.65,
    fagenAlteredDominantBias: 0.8,
    fagenRootAvoidanceMelody: 0.75,
    fagenSlashChordDensity: 0.6,
    bacharachDeceptiveCadenceRate: 0,
    bacharachChromaticVoiceLeading: 0,
    bacharachPedalUsage: 0.1,
  };
}

describe('applyDonaldFagenSongwriterSurface', () => {
  it('applies only when primary resolves to donald_fagen', () => {
    const m = baseMeta();
    applyDonaldFagenSongwriterSurface(m, 'donald_fagen');
    expect(m.songwriterPhraseRegularity).toBeCloseTo(0.42, 5);
    expect(m.songwriterSyncopationBias).toBeCloseTo(0.66, 5);
    expect(m.songwriterDensityBias).toBeCloseTo(0.53, 5);
    expect(m.bacharachPedalUsage).toBeCloseTo(0.02, 5);
    expect(m.songModeStyleSurfaceNotes?.length).toBeGreaterThanOrEqual(4);
    expect(m.songModeStyleSurfaceNotes?.some((l) => l.includes('Primary songwriter surface'))).toBe(true);
    expect(m.songModeStyleSurfaceNotes?.some((l) => l.includes('Duo guitar consumes'))).toBe(true);
    expect(m.songModeStyleSurfaceNotes?.some((l) => l.includes('slice v2'))).toBe(true);
    expect(m.songModeStyleSurfaceNotes?.some((l) => l.includes('keys-comp v1.5'))).toBe(true);
  });

  it('accepts SONGWRITER-style enum alias songwriter_donald_fagen', () => {
    const m = baseMeta();
    applyDonaldFagenSongwriterSurface(m, 'songwriter_donald_fagen');
    expect(m.songwriterPhraseRegularity).toBeCloseTo(0.42, 5);
  });

  it('clamps additive fields at 1', () => {
    const m = baseMeta();
    m.fagenAlteredDominantBias = 0.98;
    m.bacharachDeceptiveCadenceRate = 0.96;
    applyDonaldFagenSongwriterSurface(m, 'fagen');
    expect(m.fagenAlteredDominantBias).toBe(1);
    expect(m.bacharachDeceptiveCadenceRate).toBe(1);
  });

  it('no-op when not Fagen primary', () => {
    const m = baseMeta();
    applyDonaldFagenSongwriterSurface(m, 'bacharach');
    expect(m.songwriterPhraseRegularity).toBe(0.3);
    expect(m.songModeStyleSurfaceNotes).toBeUndefined();
  });

  it('no-op without Song Mode hook identity', () => {
    const m = baseMeta();
    m.songModeHookFirstIdentity = false;
    applyDonaldFagenSongwriterSurface(m, 'donald_fagen');
    expect(m.songwriterPhraseRegularity).toBe(0.3);
  });

  it('Phase C1 receipt appends to the same visible note list as runGoldenPath (Fagen-only path)', () => {
    const m = baseMeta();
    applyDonaldFagenSongwriterSurface(m, 'donald_fagen');
    const c1 =
      'Song Mode Fagen slice v2: keyboard comp used Phase C1 off-beat hits and anticipations in phrases 0–2 (bars 1–12) for a subtle jazz-pop lift. Not an imitation of any artist.';
    appendSongModeStyleSurfaceNotes(m, [c1]);
    expect(m.songModeStyleSurfaceNotes?.length).toBe(5);
    expect(m.songModeStyleSurfaceNotes?.some((l) => l.includes('keyboard comp used Phase C1'))).toBe(true);
  });
});
