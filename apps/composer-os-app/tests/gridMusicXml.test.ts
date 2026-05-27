import { describe, expect, it } from 'vitest';
import { midiToPitchName } from '@renderer/lib/gridMusicXml.js';

describe('gridMusicXml helpers', () => {
  it('midiToPitchName maps MIDI to spellings', () => {
    expect(midiToPitchName(60)).toBe('C4');
    expect(midiToPitchName(61)).toBe('C#4');
  });
});
