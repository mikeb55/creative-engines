/**
 * Wyble layout metadata hook: present on duo context + SQ/BB orchestration plans; additive only.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import {
  WYBLE_ROLE_MAP_BIG_BAND,
  WYBLE_ROLE_MAP_DUO_FAMILY,
  WYBLE_ROLE_MAP_STRING_QUARTET,
} from '../core/wyble/ensembleWybleRoleMaps';

function countScoreNotes(score: { parts: { measures: { events: unknown[] }[] }[] }): number {
  let n = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if ((e as { kind?: string }).kind === 'note') n++;
      }
    }
  }
  return n;
}

describe('Wyble voice layout metadata hook', () => {
  it('attaches wybleVoiceLayout to golden-path generationMetadata for standard duo', () => {
    const r = runGoldenPath(11);
    expect(r.context?.generationMetadata.wybleVoiceLayout).toEqual(WYBLE_ROLE_MAP_DUO_FAMILY);
  });

  it('attaches same duo-family map for guitar_bass_duo_single_line', () => {
    const r = runGoldenPath(11, { presetId: 'guitar_bass_duo_single_line' });
    expect(r.context?.generationMetadata.wybleVoiceLayout).toEqual(WYBLE_ROLE_MAP_DUO_FAMILY);
  });

  it('attaches wybleVoiceLayout to string quartet orchestration plan', () => {
    const sq = runStringQuartetMode({ seed: 3, totalBars: 16 });
    expect(sq.orchestrationPlan.wybleVoiceLayout).toEqual(WYBLE_ROLE_MAP_STRING_QUARTET);
  });

  it('attaches wybleVoiceLayout to big band orchestration plan', () => {
    const bb = runBigBandMode({ seed: 5, totalBars: 16 });
    expect(bb.orchestrationPlan.wybleVoiceLayout).toEqual(WYBLE_ROLE_MAP_BIG_BAND);
  });

  it('golden path still yields an 8-bar duo score shape (additive metadata only)', () => {
    const r = runGoldenPath(11);
    expect(r.score).toBeDefined();
    expect(r.score!.parts.length).toBeGreaterThanOrEqual(2);
    const g = r.score!.parts.find((p) => p.id === 'guitar');
    const b = r.score!.parts.find((p) => p.id === 'bass');
    expect(g?.measures.length).toBe(8);
    expect(b?.measures.length).toBe(8);
    const n = countScoreNotes(r.score!);
    expect(n).toBeGreaterThan(40);
    expect(n).toBeLessThan(200);
  });
});
