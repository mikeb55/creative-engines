/**
 * Real big band path (runBigBandRealisation): Wyble static map lowers tenor sax below alto lead
 * (`bigBandWybleHornVoicing`) bar-by-bar when the map is present. OFF omits the map via suppress flag.
 */

import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 12345;
const BB_ALTO = 'bb_alto_sax';
const BB_TENOR = 'bb_tenor_sax';

function noteMidisInBar(score: ScoreModel, partId: string, bar1: number): number[] {
  const p = score.parts.find((x) => x.id === partId);
  const m = p?.measures[bar1 - 1];
  if (!m) return [];
  return m.events.filter((e) => e.kind === 'note').map((e) => (e.kind === 'note' ? e.pitch : -1));
}

describe('Big band real path — Wyble inner sax line differs ON vs OFF', () => {
  it('same seed: tenor sax bar 1–2 pitch patterns differ when Wyble layout is suppressed', () => {
    const base = { seed: SEED, totalBars: 16, era: 'swing' as const, title: 'Wyble BB inner line audit' };
    const wybleOn = runBigBandRealisation(base);
    const wybleOff = runBigBandRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });

    expect(wybleOn.planning.validation.ok).toBe(true);
    expect(wybleOff.planning.validation.ok).toBe(true);
    expect(wybleOn.exportPipeline.ok).toBe(true);
    expect(wybleOff.exportPipeline.ok).toBe(true);
    expect(wybleOn.score).toBeDefined();
    expect(wybleOff.score).toBeDefined();

    const scoreOn = wybleOn.score!;
    const scoreOff = wybleOff.score!;

    expect(scoreOn.parts.some((p) => p.id === BB_ALTO)).toBe(true);
    expect(scoreOn.parts.some((p) => p.id === BB_TENOR)).toBe(true);
    expect(scoreOn.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')).toBeUndefined();

    const altoOn = [noteMidisInBar(scoreOn, BB_ALTO, 1), noteMidisInBar(scoreOn, BB_ALTO, 2)];
    const tenorOn = [noteMidisInBar(scoreOn, BB_TENOR, 1), noteMidisInBar(scoreOn, BB_TENOR, 2)];
    const altoOff = [noteMidisInBar(scoreOff, BB_ALTO, 1), noteMidisInBar(scoreOff, BB_ALTO, 2)];
    const tenorOff = [noteMidisInBar(scoreOff, BB_TENOR, 1), noteMidisInBar(scoreOff, BB_TENOR, 2)];

    expect(altoOn).toEqual(altoOff);
    expect(tenorOn).not.toEqual(tenorOff);
    expect(tenorOn.flat()).not.toEqual(tenorOff.flat());

    expect(tenorOn[0]?.length).toBeGreaterThan(0);
    expect(tenorOff[0]?.length).toBeGreaterThan(0);
  });
});
