export type ParsedChord = {
  symbol: string;
  rootNote: string;
  chordQuality: string;
  duration: number;
  barIndex: number;
  beatIndex: number;
};

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
  timeSignature: { num: number; den: number } | null;
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
