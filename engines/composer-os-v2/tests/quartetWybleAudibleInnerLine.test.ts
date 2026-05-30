/**
 * Real string quartet path (runQuartetRealisation): Wyble static map swaps Violin II / Viola chord-tone
 * assignments (bars 1+ use the swap when the map is present). OFF omits the map via suppress flag.
 */

import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { SQ_PART_V2, SQ_PART_VA } from '../core/string-quartet/stringQuartetTypes';

const SEED = 12345;

function noteMidisInBar(score: ScoreModel, partId: string, bar1: number): number[] {
  const p = score.parts.find((x) => x.id === partId);
  const m = p?.measures[bar1 - 1];
  if (!m) return [];
  return m.events.filter((e) => e.kind === 'note').map((e) => (e.kind === 'note' ? e.pitch : -1));
}

describe('String quartet real path — Wyble inner line differs ON vs OFF', () => {
  it('same seed: Violin II + Viola bar 1–2 pitch patterns differ when Wyble layout is suppressed', () => {
    const base = { seed: SEED, totalBars: 16, title: 'Wyble inner line audit' };
    const wybleOn = runQuartetRealisation(base);
    const wybleOff = runQuartetRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });

    expect(wybleOn.planning.validation.ok).toBe(true);
    expect(wybleOff.planning.validation.ok).toBe(true);
    expect(wybleOn.exportPipeline.ok).toBe(true);
    expect(wybleOff.exportPipeline.ok).toBe(true);
    expect(wybleOn.score).toBeDefined();
    expect(wybleOff.score).toBeDefined();

    const scoreOn = wybleOn.score!;
    const scoreOff = wybleOff.score!;

    const stringIds = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'];
    expect(stringIds.every((id) => scoreOn.parts.some((p) => p.id === id))).toBe(true);
    expect(scoreOn.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')).toBeUndefined();

    const v2on = [noteMidisInBar(scoreOn, SQ_PART_V2, 1), noteMidisInBar(scoreOn, SQ_PART_V2, 2)];
    const vaon = [noteMidisInBar(scoreOn, SQ_PART_VA, 1), noteMidisInBar(scoreOn, SQ_PART_VA, 2)];
    const v2off = [noteMidisInBar(scoreOff, SQ_PART_V2, 1), noteMidisInBar(scoreOff, SQ_PART_V2, 2)];
    const vaoff = [noteMidisInBar(scoreOff, SQ_PART_VA, 1), noteMidisInBar(scoreOff, SQ_PART_VA, 2)];

    expect(v2on).not.toEqual(v2off);
    expect(vaon).not.toEqual(vaoff);
    expect(v2on.flat()).not.toEqual(v2off.flat());
    expect(vaon.flat()).not.toEqual(vaoff.flat());

    // Known swap semantics: ON V2 matches OFF viola pitch pattern and vice versa (chord-tone cross-assign).
    const pcOf = (midi: number) => midi % 12;
    expect(v2on.slice(0, 1).map((b) => b.map(pcOf))).toEqual(vaoff.slice(0, 1).map((b) => b.map(pcOf)));
    expect(vaon.slice(0, 1).map((b) => b.map(pcOf))).toEqual(v2off.slice(0, 1).map((b) => b.map(pcOf)));
  });
});
