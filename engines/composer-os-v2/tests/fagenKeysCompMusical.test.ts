/**
 * Fagen-only keys-comp musical augmentations vs baseline behaviours.
 */

import type { CompositionContext } from '../core/compositionContext';
import type { MeasureModel, NoteEvent, PartModel } from '../core/score-model/scoreModelTypes';
import {
  applyFagenInnerVoiceMotionV2,
  applyFagenRhythmFingerprintVelocities,
  fagenSectionKind,
  rhClampRangeForFagenBar,
} from '../core/goldenPath/fagenKeysCompMusical';
import {
  getSongwriterCompProfile,
  GUITAR_CENTRIC_SONGWRITER_IDS,
} from '../core/song-mode/songwriterCompProfile';

function stubContext(seed: number): CompositionContext {
  return {
    seed,
    chordSymbolPlan: { segments: [{ chord: 'Cmaj7', startBar: 1, bars: 32 }], totalBars: 32 },
    generationMetadata: { generatedAt: new Date().toISOString() },
    form: { totalBars: 32, sections: [] },
  } as unknown as CompositionContext;
}

function makeMeasure(barIndex: number, notes: NoteEvent[]): MeasureModel {
  return { index: barIndex, chord: 'C', events: notes };
}

describe('fagenKeysCompMusical', () => {
  it('maps ECM 32-bar sections for contrast', () => {
    expect(fagenSectionKind(4)).toBe('a_open');
    expect(fagenSectionKind(12)).toBe('b');
    expect(fagenSectionKind(20)).toBe('a_return');
    expect(fagenSectionKind(28)).toBe('closing');
  });

  it('raises RH floor in B vs A', () => {
    expect(rhClampRangeForFagenBar(5).lo).toBeLessThan(rhClampRangeForFagenBar(12).lo);
  });

  it('rhythm fingerprint boosts anticipated comp attacks (deterministic velocity lift)', () => {
    const g: PartModel = {
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 1,
      clef: 'treble',
      measures: [
        makeMeasure(1, [
          {
            kind: 'note',
            pitch: 60,
            startBeat: 1.55,
            duration: 0.25,
            voice: 2,
            velocity: 50,
          },
        ]),
      ],
    };
    applyFagenRhythmFingerprintVelocities(g, stubContext(999), 'test');
    const n = g.measures[0].events[0] as NoteEvent;
    expect(n.velocity).toBeGreaterThan(50);
  });

  it('inner-voice pass nudges repeated LH shell top after same pitch class streak', () => {
    const g: PartModel = {
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 1,
      clef: 'treble',
      measures: [1, 2, 3].map((i) =>
        makeMeasure(i, [
          {
            kind: 'note',
            pitch: 52,
            startBeat: 0,
            duration: 2,
            voice: 2,
            velocity: 72,
          },
        ])
      ),
    };
    const ctx = stubContext(42);
    ctx.lockedHarmonyBarsRaw = Array(32).fill('Dmin9');
    applyFagenInnerVoiceMotionV2(g, ctx);
    const pitches = g.measures.map((m) => (m.events[0] as NoteEvent).pitch);
    expect(pitches.some((p) => p !== 52)).toBe(true);
  });

  it('Beatles / Paul Simon / Richard Thompson stay guitar-centric and unchanged by Fagen profile', () => {
    expect(GUITAR_CENTRIC_SONGWRITER_IDS.has('beatles')).toBe(true);
    expect(getSongwriterCompProfile('beatles')).toBeNull();
    expect(getSongwriterCompProfile('paul_simon')).toBeNull();
    expect(getSongwriterCompProfile('richard_thompson')).toBeNull();
  });

  it('Bacharach profile stays separate from Fagen tokens', () => {
    const b = getSongwriterCompProfile('bacharach');
    const f = getSongwriterCompProfile('donald_fagen');
    expect(b?.voicingBias.some((x) => x.includes('compact_four_voice'))).toBe(false);
    expect(f?.voicingBias.some((x) => x.includes('compact_four_voice'))).toBe(true);
  });
});
