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

export type ParsedChart = {
  title: string;
  composer: string;
  key: string | null;
  timeSignature: { num: number; den: number } | null;
  tempo: number | null;
  style: string | null;
  sections: ParsedSection[];
  measures: ParsedChord[][];
  repeats: { type: string; barIndex: number }[];
};
