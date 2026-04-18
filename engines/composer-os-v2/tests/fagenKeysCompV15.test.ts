import {
  fagenCompanionMidiForSparseRhDyad,
  maxNotesFagenKeysCompV15Bar,
  thinMeasureNotesToCap,
} from '../core/goldenPath/fagenKeysCompV15';
import type { MeasureModel } from '../core/score-model/scoreModelTypes';

describe('fagenKeysCompV15', () => {
  it('uses tighter caps in opening phrases and section contrast', () => {
    expect(maxNotesFagenKeysCompV15Bar(1)).toBe(6);
    expect(maxNotesFagenKeysCompV15Bar(10)).toBe(8);
    expect(maxNotesFagenKeysCompV15Bar(12)).toBe(8);
    expect(maxNotesFagenKeysCompV15Bar(20)).toBe(7);
    expect(maxNotesFagenKeysCompV15Bar(30)).toBe(9);
  });

  it('sparse RH dyad prefers a different chord tone than the anchor pitch class', () => {
    const tones = { root: 48, third: 52, fifth: 55, seventh: 51 };
    const comp = fagenCompanionMidiForSparseRhDyad(64, tones);
    expect(comp).toBeDefined();
    expect(comp).toBeGreaterThanOrEqual(60);
    expect(comp).toBeLessThanOrEqual(78);
    expect(comp! % 12).not.toBe(64 % 12);
  });

  it('thinMeasureNotesToCap removes non-motif filler before touching song_motif notes', () => {
    const measure: MeasureModel = {
      index: 1,
      events: [],
      chord: 'Cmaj7',
    };
    for (let i = 0; i < 8; i++) {
      measure.events.push({
        kind: 'note',
        pitch: 60 + i,
        startBeat: i * 0.25,
        duration: 0.2,
        voice: 1,
      });
    }
    measure.events.push({
      kind: 'note',
      pitch: 72,
      startBeat: 2,
      duration: 2,
      voice: 1,
      motifRef: 'song_motif_hook_a',
    });
    thinMeasureNotesToCap(measure, 6);
    const motifNotes = measure.events.filter(
      (e) => e.kind === 'note' && (e as { motifRef?: string }).motifRef?.startsWith('song_motif')
    );
    expect(motifNotes.length).toBe(1);
  });
});
