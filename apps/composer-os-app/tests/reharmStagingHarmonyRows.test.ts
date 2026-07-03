import { describe, expect, it } from 'vitest';
import { buildReharmStagingHarmonyRows } from '../src/utils/reharmStagingHarmonyRows';

describe('reharmStagingHarmonyRows', () => {
  it('builds one row per bar in inclusive range', () => {
    const rows = buildReharmStagingHarmonyRows(
      ['Dm9', 'G13', 'Cmaj9', 'A7alt'],
      ['Dm9', 'G13', 'Ebmaj7', 'A7alt'],
      2,
      3
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ barIndex: 2, original: 'G13', candidate: 'G13', changed: false });
    expect(rows[1]).toEqual({ barIndex: 3, original: 'Cmaj9', candidate: 'Ebmaj7', changed: true });
  });

  it('normalizes reversed start/end', () => {
    const rows = buildReharmStagingHarmonyRows(['A'], ['B'], 3, 1);
    expect(rows.map((r) => r.barIndex)).toEqual([1, 2, 3]);
  });
});