/**
 * Harmony spine regression harness — table-driven shell (assertions TBD).
 * @see docs/harmonySpineInventory.md
 */

export interface HarmonySpineCaseRow {
  /** Primary Song Mode songwriter id (see harmonyResolution / songwriter registry). */
  songwriterId: string;
  totalBars: number;
  seed: number;
  /** Full-form chord symbols, index 0 = bar 1 (align with getChordForBar / score measures). */
  expectedSymbols: string[];
}

/**
 * Frozen regression vectors: populate when locking spine behaviour per slice.
 * Empty until Phase E adds real rows + assertions.
 */
export const HARMONY_SPINE_CASE_TABLE: HarmonySpineCaseRow[] = [];

export function runHarmonySpineTests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];
  rows.push({
    name: 'Harmony spine harness — scaffold (no regression rows yet)',
    ok: true,
  });
  void HARMONY_SPINE_CASE_TABLE;
  return rows;
}
