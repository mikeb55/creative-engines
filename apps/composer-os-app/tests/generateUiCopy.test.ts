import { describe, expect, it } from 'vitest';
import {
  describeOutputKind,
  EXPERIMENTAL_HELP,
  getModeUx,
  labelCreativeLevel,
  MODE_UX,
} from '../src/utils/generateUiCopy';

describe('generateUiCopy', () => {
  it('has human-facing descriptions for all six modes', () => {
    expect(MODE_UX).toHaveLength(6);
    const ids = MODE_UX.map((m) => m.id);
    expect(ids).toEqual([
      'guitar_bass_duo',
      'song_mode',
      'ecm_chamber',
      'big_band',
      'string_quartet',
      'riff_generator',
    ]);
    for (const m of MODE_UX) {
      expect(m.hint.length).toBeGreaterThan(10);
      expect(m.whatItDoes.length).toBeGreaterThan(20);
      expect(m.bestFor.length).toBeGreaterThan(10);
      expect(m.output.length).toBeGreaterThan(10);
    }
  });

  it('describeOutputKind labels planning vs full score honestly', () => {
    const duo = describeOutputKind('guitar_bass_duo');
    expect(duo.category).toBe('full_score_musicxml');
    expect(duo.headline).toMatch(/MusicXML|score/i);

    const song = describeOutputKind('song_mode');
    expect(song.category).toBe('full_score_musicxml');
    expect(song.headline).toMatch(/MusicXML|score/i);

    const bb = describeOutputKind('big_band');
    expect(bb.category).toBe('planning');
    expect(bb.headline).toMatch(/Planning/i);

    const riff = describeOutputKind('riff_generator');
    expect(riff.category).toBe('full_score_musicxml');
    expect(riff.headline).toMatch(/MusicXML|score/i);
  });

  it('getModeUx returns metadata per mode', () => {
    expect(getModeUx('big_band')?.hint).toMatch(/ensemble|planning|density/i);
    expect(getModeUx('ecm_chamber')?.hint).toMatch(/atmospheric|chamber/i);
  });

  it('labelCreativeLevel maps tiers to friendly labels', () => {
    expect(labelCreativeLevel('stable')).toBe('Stable');
    expect(labelCreativeLevel('surprise')).toBe('Surprise');
  });

  it('experimental help explains without blocking', () => {
    expect(EXPERIMENTAL_HELP.toLowerCase()).toContain('experimental');
    expect(EXPERIMENTAL_HELP.length).toBeGreaterThan(20);
  });
});
