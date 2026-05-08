export type ParsedChord = {
  symbol: string;
  rootNote: string;
  chordQuality: string;
  duration: number;
  barIndex: number;
  beatIndex: number;
};

/** One chord symbol per bar (first slot); empty bars → `N.C.` */
export function harmoniesFromMeasures(measures: ParsedChord[][]): string[] {
  return measures.map((row) => {
    const sym = row[0]?.symbol?.trim();
    return sym && sym.length > 0 ? sym : 'N.C.';
  });
}

export type ParsedSection = {
  label: string;
  startBar: number;
  endBar: number;
};

/** iReal `{` `}` `S` `Q` after compacting to non-empty bars (0-based). */
export type ParsedRepeatMarker = {
  type: 'start' | 'end' | 'segno' | 'coda';
  barIndex: number;
};

export type ParsedChart = {
  title: string;
  composer: string;
  key: string | null;
  /** Global meter for the chart (same object as {@link timeSignature} where set). */
  meter: { num: number; den: number } | null;
  /** Legacy alias of {@link meter} — identical values; kept for existing callers. */
  timeSignature: { num: number; den: number } | null;
  /** Bar-majority harmony line (first chord per bar); see {@link harmoniesFromMeasures}. */
  harmonies: string[];
  /** Sparse: bar index → meter when it differs from carry (iReal `T` markers). */
  barMeterMap: Record<number, { num: number; den: number }>;
  /** From iReal repeat / segno / coda symbols; not used by generation yet. */
  repeatMarkers: ParsedRepeatMarker[];
  tempo: number | null;
  style: string | null;
  sections: ParsedSection[];
  measures: ParsedChord[][];
  repeats: { type: string; barIndex: number }[];
};
