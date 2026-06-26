import { describe, expect, it } from 'vitest';
import { buildMosaicBlocksGeneratePayload } from './buildMosaicBlocksGeneratePayload';
import { stitchMosaicBlocks } from './stitchMosaicBlocks';

const blockA =
  'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';

describe('buildMosaicBlocksGeneratePayload', () => {
  it('forced defaults: guitar_bass_duo preset, harmony lock, long-form + band mode', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'verlaine',
      seed: 90106,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.presetId).toBe('guitar_bass_duo');
    expect(payload.body.presetId).toBe('guitar_bass_duo');
    expect(payload.body.harmonyMode).toBe('custom_locked');
    expect(payload.body.longFormEnabled).toBe(true);
    expect(payload.body.bandModeEnabled).toBe(true);
  });

  it('forced styleStack: barry_harris primary + strong/off/off blend', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'verlaine',
      seed: 90106,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.body.styleStack).toEqual({
      primary: 'barry_harris',
      styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
    });
  });

  it('derived primarySongwriterStyle = block 0 composer, not composerSlug', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'marr' },
      { chordsText: blockB, songwriterStyleId: 'verlaine' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'wayne_shorter',
      seed: 90217,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.body.primarySongwriterStyle).toBe('marr');
    expect(payload.body.outputLabel).toBe('wayne_shorter');
  });

  it('passes through chordProgressionText, mosaicSectionPlan, totalBars, seed', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'verlaine',
      seed: 90106,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.body.seed).toBe(90106);
    expect(payload.body.totalBars).toBe(16);
    expect(payload.body.chordProgressionText).toBe(stitched.result.chordProgressionText);
    expect(payload.body.mosaicSectionPlan).toEqual(stitched.result.mosaicSectionPlan);
  });

  it('bill_evans composerSlug adds stable creativeControl + musicianPremiumMelody', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'bill_evans' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'bill_evans',
      seed: 90301,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.body.creativeControlLevel).toBe('stable');
    expect(payload.body.musicianPremiumMelody).toBe(true);
    expect(payload.body.outputLabel).toBe('bill_evans');
    expect(payload.body.primarySongwriterStyle).toBe('bill_evans');
  });

  it('non-Evans composerSlug uses balanced creativeControl and omits musicianPremiumMelody', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const payload = buildMosaicBlocksGeneratePayload({
      composerSlug: 'verlaine',
      seed: 90106,
      totalBars: stitched.result.totalBars,
      chordProgressionText: stitched.result.chordProgressionText,
      mosaicSectionPlan: stitched.result.mosaicSectionPlan,
    });

    expect(payload.body.creativeControlLevel).toBe('balanced');
    expect(payload.body).not.toHaveProperty('musicianPremiumMelody');
  });
});
