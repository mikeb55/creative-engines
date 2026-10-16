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
  /** Quarter-note length of one bar. 4/4 is 4. 6/8 is 3. Falls back to beatsPerBar when omitted. */
  barQuarters?: number;
};
