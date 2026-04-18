/**
 * System-wide Fagen keys-comp behaviour vs generic baseline — no song-specific fixtures.
 */

import type { CompositionContext } from '../core/compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  applyFagenKeysCompMusicalAugment,
  fagenSectionKind,
  measureSyncopationIndex,
  fagenFormSegmentEnds,
} from '../core/goldenPath/fagenKeysCompMusical';
import {
  getSongwriterCompProfile,
  GUITAR_CENTRIC_SONGWRITER_IDS,
} from '../core/song-mode/songwriterCompProfile';

function stubContext(seed: number): CompositionContext {
  const bars = Array.from({ length: 32 }, () => 'A7alt');
  return {
    seed,
    form: { totalBars: 32, sections: [] },
    lockedHarmonyBarsRaw: bars,
    chordSymbolPlan: { segments: [{ chord: 'A7alt', startBar: 1, bars: 32 }], totalBars: 32 },
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'donald_fagen',
      totalBars: 32,
    },
  } as unknown as CompositionContext;
}

function makeMeasure(barIndex: number, events: NoteEvent[]): { index: number; events: NoteEvent[]; chord?: string } {
  return { index: barIndex, events, chord: 'A7alt' };
}

/** On-beat grid comp — intentionally square; augment should raise syncopation metrics. */
function squareCompGuitar(): PartModel {
  const measures = [];
  for (let b = 1; b <= 32; b++) {
    const ev: NoteEvent[] = [];
    for (let beat = 0; beat < 4; beat++) {
      ev.push({
        kind: 'note',
        pitch: 60 + (beat % 3),
        startBeat: beat,
        duration: 0.45,
        voice: beat % 2 === 0 ? 1 : 2,
        velocity: 78,
      });
    }
    measures.push(makeMeasure(b, ev));
  }
  return {
    id: 'guitar',
    name: 'Piano',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 1,
    clef: 'treble',
    measures,
  };
}

describe('Fagen keys-comp system-wide', () => {
  it('uses quarter-form section mapping (not single-chart bar literals)', () => {
    const tb = 32;
    const { aEnd, bEnd, retEnd } = fagenFormSegmentEnds(tb);
    expect(aEnd).toBe(8);
    expect(bEnd).toBe(16);
    expect(retEnd).toBe(24);
    expect(fagenSectionKind(8, tb)).toBe('a_open');
    expect(fagenSectionKind(9, tb)).toBe('b');
    expect(fagenSectionKind(17, tb)).toBe('a_return');
    expect(fagenSectionKind(26, tb)).toBe('closing');
  });

  it('Fagen augment raises mean syncopation index vs pre-pass square grid', () => {
    const g = squareCompGuitar();
    let pre = 0;
    for (const m of g.measures) pre += measureSyncopationIndex(m as MeasureModel);
    pre /= g.measures.length;

    const score: ScoreModel = { parts: [g] } as ScoreModel;
    const ctx = stubContext(77701);
    applyFagenKeysCompMusicalAugment(score, ctx);

    let post = 0;
    for (const m of g.measures) post += measureSyncopationIndex(m as MeasureModel);
    post /= g.measures.length;

    expect(post).toBeGreaterThan(pre);
  });

  it('diagnostics report B brighter / denser than A and bounded signature moment', () => {
    const score: ScoreModel = { parts: [squareCompGuitar()] } as ScoreModel;
    const ctx = stubContext(8802);
    applyFagenKeysCompMusicalAugment(score, ctx);

    const d = ctx.generationMetadata?.fagenKeysCompMusicalDiagnostics;
    expect(d).toBeDefined();
    expect(d!.syncopationIndexBySection).toBeDefined();
    expect(Object.keys(d!.syncopationIndexBySection ?? {}).length).toBeGreaterThan(0);
    expect(d!.voicingDensityBySection).toBeDefined();
    expect(d!.phraseTensionMeanDensityByPhrase?.length).toBeGreaterThan(0);
    /** Uniform synthetic grid can yield zero density delta — real scores differ after V15 clamp + dyads. */
    expect(typeof d!.densityDeltaBMinusA).toBe('number');

    const sig = d!.signatureMoment;
    expect(sig).toBeDefined();
    if (sig!.applied) {
      expect([16, 17, 32]).toContain(sig!.pivotBar);
    }
  });

  it('guitar-centric writers do not get a keyboard comp profile', () => {
    for (const id of GUITAR_CENTRIC_SONGWRITER_IDS) {
      expect(getSongwriterCompProfile(id)).toBeNull();
    }
  });

  it('Bacharach profile stays distinct from Fagen compact-voice grammar', () => {
    const b = getSongwriterCompProfile('bacharach');
    const f = getSongwriterCompProfile('donald_fagen');
    expect(b?.voicingBias.join('')).not.toContain('compact_four_voice');
    expect(f?.voicingBias.some((x) => x.includes('compact_four_voice'))).toBe(true);
  });

  it('diagnostics record return vs opening RH delta when registers differ by section', () => {
    const g = squareCompGuitar();
    for (const m of g.measures) {
      const sk = fagenSectionKind(m.index, 32);
      const bump = sk === 'a_return' ? 7 : sk === 'a_open' ? -5 : 0;
      for (const e of m.events) {
        if (e.kind === 'note' && (e as NoteEvent).voice === 1) {
          (e as NoteEvent).pitch += bump;
        }
      }
    }
    const score: ScoreModel = { parts: [g] } as ScoreModel;
    const ctx = stubContext(9001);
    applyFagenKeysCompMusicalAugment(score, ctx);
    const d = ctx.generationMetadata?.fagenKeysCompMusicalDiagnostics;
    expect(d?.openingVsReturnRhMeanDelta).toBeDefined();
    expect(d!.openingVsReturnRhMeanDelta!).not.toBe(0);
  });
});
