export interface CompingOptions {
  style: 'freddie_green' | 'shell_voicing' | 'full_chord';
  beatPattern: 'beats_2_4' | 'beats_1_3' | 'all_beats' | 'offbeats';
  voicingDensity: 'sparse' | 'medium' | 'dense';
  muted: boolean;
}
