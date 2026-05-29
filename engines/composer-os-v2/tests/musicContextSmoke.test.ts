/**
 * V90a — MusicContext smoke: Riff producer → Wyble consumer receipt chain.
 */

import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import {
  computeMusicContextChecksum,
  harmonyBarsFromMusicContext,
} from '../core/music-context/musicContextAdapters';
import { applyWybleMusicContextOverrides } from '../../jimmy-wyble-engine/wybleGenerator';

describe('MusicContext smoke — Riff → Wyble handoff', () => {
  const prevWybleFlag = process.env.WYBLE_MUSIC_CONTEXT;

  afterEach(() => {
    if (prevWybleFlag === undefined) {
      delete process.env.WYBLE_MUSIC_CONTEXT;
    } else {
      process.env.WYBLE_MUSIC_CONTEXT = prevWybleFlag;
    }
  });

  it('runRiffGenerator surfaces valid musicContext; Wyble consumes harmony + receipts', () => {
    const result = runRiffGenerator(90210, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Smoke',
      chordProgressionText: 'Dm7 | G7',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.musicContext).toBeDefined();
    const mc = result.musicContext!;
    expect(mc.harmony.checksum).toBe(computeMusicContextChecksum([...mc.harmony.bars]));
    expect(() => harmonyBarsFromMusicContext(mc)).not.toThrow();
    expect(mc.receipts.some((r) => r.engine === 'riff')).toBe(true);

    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    const wybleParams = applyWybleMusicContextOverrides({
      harmonicContext: { chords: ['Am7', 'D7'] },
      phraseLength: mc.harmony.bars.length,
      musicContext: mc,
    });
    expect(wybleParams.harmonicContext.chords).toEqual([...mc.harmony.bars]);
    expect(mc.receipts.some((r) => r.engine === 'wyble')).toBe(true);
    expect(mc.receipts.filter((r) => r.engine === 'riff').length).toBeGreaterThanOrEqual(1);
    expect(mc.receipts.filter((r) => r.engine === 'wyble').length).toBeGreaterThanOrEqual(1);
  });
});
