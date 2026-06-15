import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  auditionFromGenerateResult,
  playAuditionSequence,
  resolveAuditionPlaybackFilepath,
} from '../src/playback/auditionFromGenerateResult';

vi.mock('../src/playback/playbackEngine', () => ({
  initPlayback: vi.fn().mockResolvedValue(undefined),
  play: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/playback/musicXmlToPlaybackSequence', () => ({
  parseXmlToPlaybackSequence: vi.fn((xml: string) => {
    if (xml.includes('<note>')) {
      return { bpm: 120, beatsPerBar: 4, notes: [{ barIndex: 1, startBeat: 0, duration: 1, pitch: 60 }] };
    }
    return { bpm: 120, beatsPerBar: 4, notes: [] };
  }),
}));

describe('resolveAuditionPlaybackFilepath', () => {
  it('prefers ensembleMusicXmlFilepath over filepath', () => {
    expect(
      resolveAuditionPlaybackFilepath({
        filepath: '/out/plan.json',
        ensembleMusicXmlFilepath: '/out/score.musicxml',
      })
    ).toBe('/out/score.musicxml');
  });

  it('falls back to filepath', () => {
    expect(resolveAuditionPlaybackFilepath({ filepath: '/out/score.musicxml' })).toBe(
      '/out/score.musicxml'
    );
  });
});

describe('auditionFromGenerateResult', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (globalThis as { window?: unknown }).window = { composerOsDesktop: undefined };
  });

  it('gates empty sequences and does not play', async () => {
    const { play } = await import('../src/playback/playbackEngine');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const outcome = await auditionFromGenerateResult(
      { xml: '<empty/>', runManifest: { seed: 42, songwriterStyle: 'bill_evans' } },
      { composerId: 'bill_evans', autoPlay: true }
    );

    expect(outcome.status).toBe('no_notes');
    expect(outcome.sequence?.notes.length).toBe(0);
    expect(play).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('plays when notes exist and autoPlay is true', async () => {
    const { play } = await import('../src/playback/playbackEngine');

    const outcome = await auditionFromGenerateResult(
      { xml: '<score><note></note></score>', runManifest: { seed: 99 } },
      { autoPlay: true, onBeat: () => undefined }
    );

    expect(outcome.status).toBe('playing');
    expect(outcome.sequence?.notes.length).toBeGreaterThan(0);
    expect(play).toHaveBeenCalled();
  });

  it('loads inline xml on web without desktop ipc', async () => {
    const outcome = await auditionFromGenerateResult(
      { xml: '<score><note></note></score>' },
      { autoPlay: false }
    );
    expect(outcome.status).toBe('ready');
    expect(outcome.loadedXml).toBe('<score><note></note></score>');
  });
});

describe('playAuditionSequence', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('no-ops on empty notes', async () => {
    const { play } = await import('../src/playback/playbackEngine');
    await playAuditionSequence({ bpm: 120, beatsPerBar: 4, notes: [] }, () => undefined);
    expect(play).not.toHaveBeenCalled();
  });
});