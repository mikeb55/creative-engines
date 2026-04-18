/**
 * Motif v2 coverage must not treat LH (voice 2) comp notes as first-class for the 50% / gap gates
 * when Fagen keys-comp v1.5 has run — those layers often lack song_motif refs by design.
 */

import type { CompositionContext } from '../core/compositionContext';
import type { MeasureModel, PartModel, ScoreEvent } from '../core/score-model/scoreModelTypes';
import {
  songModeMotifCoverageUsesVoiceOneOnly,
  validateSongModeMotifSystem,
} from '../core/motif/songModeMotifEngine';

function minimalGuitar32(): PartModel {
  const measures: MeasureModel[] = [];
  for (let i = 1; i <= 32; i++) {
    measures.push({
      index: i,
      chord: 'Cmaj7',
      events: [] as ScoreEvent[],
    });
  }
  const hookRhythm = [
    { sb: 0, dur: 0.5 },
    { sb: 1, dur: 0.5 },
    { sb: 2.5, dur: 0.5 },
    { sb: 3.5, dur: 0.5 },
  ];
  const applyBar = (barIdx: number, motifRef: string, pitches: number[]) => {
    const m = measures[barIdx - 1];
    for (let j = 0; j < hookRhythm.length; j++) {
      m.events.push({
        kind: 'note',
        pitch: pitches[j] ?? 60,
        startBeat: hookRhythm[j].sb,
        duration: hookRhythm[j].dur,
        voice: 1,
        motifRef,
      });
    }
  };

  const contourPitches = [62, 64, 62, 59];
  for (const b of [1, 25]) applyBar(b, 'song_motif_statement', contourPitches);

  /** Flood voice 2 in bars 1–8 so “all-note” motif ratio used to collapse below 50%. */
  for (let b = 1; b <= 8; b++) {
    const m = measures[b - 1];
    for (let k = 0; k < 6; k++) {
      m.events.push({
        kind: 'note',
        pitch: 52 + k,
        startBeat: k * 0.5,
        duration: 0.45,
        voice: 2,
      });
    }
  }

  for (let b = 2; b <= 24; b++) {
    if (b === 25) continue;
    applyBar(b, 'song_motif_statement', contourPitches.map((p) => p + (b % 3)));
  }
  for (let b = 26; b <= 32; b++) {
    applyBar(b, 'song_motif_statement', contourPitches.map((p) => p + (b % 3)));
  }

  return {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };
}

describe('Song Mode motif v2 × Fagen keys-comp metadata', () => {
  it('songModeMotifCoverageUsesVoiceOneOnly follows songModeFagenKeysCompV15Applied', () => {
    const off = { generationMetadata: {} } as CompositionContext;
    const on = {
      generationMetadata: { songModeFagenKeysCompV15Applied: true },
    } as CompositionContext;
    expect(songModeMotifCoverageUsesVoiceOneOnly(off)).toBe(false);
    expect(songModeMotifCoverageUsesVoiceOneOnly(on)).toBe(true);
  });

  it('does not fail sliding 50% coverage when voice 2 floods without motif refs (Fagen flag on)', () => {
    const guitar = minimalGuitar32();
    const md = {
      generatedAt: new Date().toISOString(),
      songModeHookFirstIdentity: true,
      songModeFagenKeysCompV15Applied: true,
      songModeMotifCount: 1 as const,
      songModeStatementMotifShape: undefined,
    };
    const ctx = {
      generationMetadata: md,
      form: { totalBars: 32, sections: [] },
      chordSymbolPlan: {
        segments: [{ chord: 'Cmaj7', startBar: 1, bars: 32 }],
        totalBars: 32,
      },
    } as unknown as CompositionContext;

    const issues = validateSongModeMotifSystem(guitar, ctx, undefined, 1);
    const sliding = issues.find((s) => s.includes('motif-mapped notes <50%'));
    expect(sliding).toBeUndefined();
  });
});
