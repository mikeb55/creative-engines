/**
 * Greek rebetiko rhythm — preset grid types for standalone MusicXML percussion export.
 */

export interface GreekRhythmLayer {
  layerId: string;
  /** GM percussion MIDI note number (channel 10 kit). */
  gmMidi: number;
  /** One step per subdivision in the bar (same length for every layer). */
  pattern: readonly boolean[];
}

export interface RhythmPreset {
  id: string;
  label: string;
  workTitle: string;
  timeSignature: { beats: number; beatType: number };
  defaultTempo: number;
  stepsPerBar: number;
  layers: readonly GreekRhythmLayer[];
}
