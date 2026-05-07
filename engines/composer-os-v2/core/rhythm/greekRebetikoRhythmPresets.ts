import type { RhythmPreset } from './greekRebetikoRhythmTypes';

/** Hasapiko-style 4/4 — 16th-note grid; doumbek + frame + auxiliary hat/bell colours. */
const HASAPIKO_44: RhythmPreset = {
  id: 'hasapiko_4_4',
  label: 'Hasapiko 4/4',
  workTitle: 'Greek rebetiko — Hasapiko 4/4',
  timeSignature: { beats: 4, beatType: 4 },
  defaultTempo: 96,
  stepsPerBar: 16,
  layers: [
    {
      layerId: 'doumbek',
      gmMidi: 36,
      pattern: [
        1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0,
      ],
    },
    {
      layerId: 'frame',
      gmMidi: 38,
      pattern: [
        0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0,
      ],
    },
    {
      layerId: 'hat',
      gmMidi: 42,
      pattern: [
        1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
      ],
    },
  ],
};

/** Zeibekiko 9/8 — 18 eighth-note steps (2+2+2+3 feel); doumbek emphasis + frame backbeat + bell markers. */
const ZEIBEKIKO_98: RhythmPreset = {
  id: 'zeibekiko_9_8',
  label: 'Zeibekiko 9/8',
  workTitle: 'Greek rebetiko — Zeibekiko 9/8',
  timeSignature: { beats: 9, beatType: 8 },
  defaultTempo: 72,
  stepsPerBar: 18,
  layers: [
    {
      layerId: 'doumbek',
      gmMidi: 36,
      pattern: [
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
      ],
    },
    {
      layerId: 'frame',
      gmMidi: 38,
      pattern: [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ],
    },
    {
      layerId: 'bell',
      gmMidi: 56,
      pattern: [
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      ],
    },
  ],
};

export const GREEK_REBETIKO_RHYTHM_PRESETS: readonly RhythmPreset[] = [HASAPIKO_44, ZEIBEKIKO_98];

export const DEFAULT_GREEK_RHYTHM_PRESET_ID = HASAPIKO_44.id;

export function getGreekRebetikoPresetById(id: string): RhythmPreset | undefined {
  return GREEK_REBETIKO_RHYTHM_PRESETS.find((p) => p.id === id);
}
