export type PlaybackNote = {
  pitch: number;
  startBeat: number;
  duration: number;
  barIndex: number;
};

export type PlaybackSequence = {
  notes: PlaybackNote[];
  bpm: number;
  beatsPerBar: number;
  totalBars: number;
};
