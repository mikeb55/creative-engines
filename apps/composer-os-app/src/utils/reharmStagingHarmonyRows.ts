export type ReharmStagingHarmonyRow = {
  barIndex: number;
  original: string;
  candidate: string;
  changed: boolean;
};

/** One row per bar in [startBar, endBar] for staged harmony-table preview. */
export function buildReharmStagingHarmonyRows(
  baselineStrip: string[],
  pendingStrip: string[],
  startBar: number,
  endBar: number
): ReharmStagingHarmonyRow[] {
  const sb = Math.min(startBar, endBar);
  const eb = Math.max(startBar, endBar);
  return Array.from({ length: eb - sb + 1 }, (_, i) => {
    const barIndex = sb + i;
    const idx = barIndex - 1;
    const original = baselineStrip[idx] ?? '—';
    const candidate = pendingStrip[idx] ?? '—';
    return { barIndex, original, candidate, changed: original !== candidate };
  });
}