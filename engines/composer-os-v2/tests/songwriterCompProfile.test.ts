/**
 * Songwriter keyboard vs guitar-centric comp profile mapping.
 */

import {
  getSongwriterCompProfile,
  isKeyboardCentricSongwriter,
  songWriterPrimaryInstrument,
  GUITAR_CENTRIC_SONGWRITER_IDS,
} from '../core/song-mode/songwriterCompProfile';

describe('songwriterCompProfile', () => {
  it('marks Beatles, Paul Simon, Richard Thompson as guitar-centric', () => {
    expect(GUITAR_CENTRIC_SONGWRITER_IDS.has('beatles')).toBe(true);
    expect(GUITAR_CENTRIC_SONGWRITER_IDS.has('paul_simon')).toBe(true);
    expect(GUITAR_CENTRIC_SONGWRITER_IDS.has('richard_thompson')).toBe(true);
    expect(songWriterPrimaryInstrument('beatles')).toBe('guitar');
    expect(isKeyboardCentricSongwriter('beatles')).toBe(false);
    expect(getSongwriterCompProfile('beatles')).toBeNull();
  });

  it('returns keys comp profiles for Fagen and Bacharach with receipt lines', () => {
    const f = getSongwriterCompProfile('donald_fagen');
    expect(f?.primaryCompInstrument).toBe('keys');
    expect(f?.receiptLines.length).toBe(0);

    const b = getSongwriterCompProfile('bacharach');
    expect(b?.primaryCompInstrument).toBe('keys');
    expect(b?.receiptLines.some((l) => l.includes('Song Mode Bacharach slice'))).toBe(true);
  });

  it('defaults other writers to keyboard-centric generic profile', () => {
    expect(isKeyboardCentricSongwriter('carole_king')).toBe(true);
    const g = getSongwriterCompProfile('carole_king');
    expect(g?.primaryCompInstrument).toBe('keys');
    expect(g?.receiptLines[0]).toContain('keyboard-led comp presentation');
  });
});
