/**
 * V93 — rhythm guitar comping generator + API.
 */

import { normalizeChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runCompingGenerator } from '../core/comping/compingGenerator';
import type { CompingOptions } from '../core/comping/compingTypes';
import { apiGenerateComping } from '../app-api/composerOsApiCore';

const BASE_PARAMS = {
  key: 'C',
  bpm: 120,
  bars: 2,
  timeSignature: { num: 4, den: 4 },
};

function opts(over: Partial<CompingOptions> = {}): CompingOptions {
  return {
    style: 'full_chord',
    beatPattern: 'all_beats',
    voicingDensity: 'medium',
    muted: false,
    ...over,
  };
}

function firstVoicingPitches(chords: string[], options: CompingOptions): number[] {
  const r = runCompingGenerator(chords, { ...BASE_PARAMS, options });
  return r.chordVoicings[0]?.midiPitches ?? [];
}

describe('runCompingGenerator (V93)', () => {
  it('1: sparse voicing returns 2 midi pitches per chord event', () => {
    const pitches = firstVoicingPitches(['Cmaj7'], opts({ voicingDensity: 'sparse' }));
    expect(pitches).toHaveLength(2);
  });

  it('2: medium voicing returns 3 midi pitches', () => {
    const pitches = firstVoicingPitches(['Cmaj7'], opts({ voicingDensity: 'medium' }));
    expect(pitches).toHaveLength(3);
  });

  it('3: dense voicing returns 4 midi pitches', () => {
    const pitches = firstVoicingPitches(['Cmaj7'], opts({ voicingDensity: 'dense' }));
    expect(pitches).toHaveLength(4);
  });

  it('4: freddie_green always returns 2 pitches regardless of density', () => {
    const dense = firstVoicingPitches(
      ['G7'],
      opts({ style: 'freddie_green', voicingDensity: 'dense' })
    );
    expect(dense).toHaveLength(2);
  });

  it('5: muted returns empty midiPitches array', () => {
    const pitches = firstVoicingPitches(['Cmaj7'], opts({ muted: true }));
    expect(pitches).toEqual([]);
  });

  it('6: beats_2_4 pattern only has events on beats 2 and 4', () => {
    const r = runCompingGenerator(['Cmaj7', 'G7'], {
      ...BASE_PARAMS,
      options: opts({ beatPattern: 'beats_2_4' }),
    });
    const beats = [...new Set(r.chordVoicings.map((v) => v.beat))].sort((a, b) => a - b);
    expect(beats).toEqual([2, 4]);
  });

  it("7: result.musicContext.provenance.sourceEngineId === 'comping'", () => {
    const r = runCompingGenerator(['Cmaj7'], { ...BASE_PARAMS, options: opts() });
    expect(r.musicContext.provenance?.sourceEngineId).toBe('comping');
  });

  it('8: result.musicContext.harmony.bars normalised via normalizeChordSymbol', () => {
    const r = runCompingGenerator(['C^7'], { ...BASE_PARAMS, options: opts() });
    expect(r.musicContext.harmony.bars[0]).toBe(normalizeChordSymbol('C^7'));
  });

  it('9: unrecognised symbol adds to warnings, does not throw', () => {
    expect(() =>
      runCompingGenerator(['???'], { ...BASE_PARAMS, options: opts() })
    ).not.toThrow();
    const r = runCompingGenerator(['???'], { ...BASE_PARAMS, options: opts() });
    expect(r.warnings.some((w) => /unrecognised/i.test(w))).toBe(true);
  });
});

describe('apiGenerateComping (V93)', () => {
  it('10: returns success: true for valid input', () => {
    const r = apiGenerateComping({
      chords: ['Cmaj7', 'G7'],
      key: 'C',
      bpm: 120,
      bars: 2,
      options: opts(),
    });
    expect(r.success).toBe(true);
  });

  it('11: returns success: false for empty chords', () => {
    const r = apiGenerateComping({
      chords: [],
      key: 'C',
      bpm: 120,
      bars: 2,
      options: opts(),
    });
    expect(r.success).toBe(false);
  });
});
