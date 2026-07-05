import type { SlonimskyMacroState } from './slonimskyMacroState';

/** Guitar–Bass Duo Slonimsky writer roster (VRB + planning stubs). */
export const SLONIMSKY_GBD_WRITERS = [
  'nile_rodgers',
  'jamerson',
  'eddie_van_halen',
  'larry_carlton',
  'david_gilmour',
  'hendrix',
  'fripp',
  'wes_montgomery',
  'joe_pass',
  'allan_holdsworth',
  'scott_henderson',
] as const;

export type SlonimskyGbdWriterId = (typeof SLONIMSKY_GBD_WRITERS)[number];

export type SlonimskyGbdWriterPreset = {
  id: string;
  label: string;
  writerId: SlonimskyGbdWriterId;
  macro: SlonimskyMacroState;
};

const WRITER_PRESET_DEFS: Record<SlonimskyGbdWriterId, { label: string; macro: SlonimskyMacroState }[]> = {
  nile_rodgers: [
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.5, tension: 0.35, variation: 0.1 } },
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.35, tension: 0.3, variation: 0 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.25, tension: 0.45, variation: 0.05 } },
  ],
  jamerson: [
    { label: 'Pocket', macro: { sourcePreset: 'riff', motion: 0.42, tension: 0.32, variation: 0.08 } },
    { label: 'Syncopated', macro: { sourcePreset: 'angular', motion: 0.38, tension: 0.36, variation: 0.12 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.22, tension: 0.4, variation: 0.06 } },
  ],
  eddie_van_halen: [
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.55, tension: 0.4, variation: 0.15 } },
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.45, tension: 0.42, variation: 0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.35, tension: 0.5, variation: 0.1 } },
  ],
  larry_carlton: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: 0.05, tension: -0.15, variation: 0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.2, tension: 0.38, variation: 0.1 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.4, tension: 0.28, variation: 0.05 } },
  ],
  david_gilmour: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.05, tension: -0.2, variation: 0.2 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.4, tension: 0.28, variation: 0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.15, tension: 0.42, variation: 0.05 } },
  ],
  hendrix: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.45, tension: 0.4, variation: 0.1 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.5, tension: 0.38, variation: 0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.3, tension: 0.48, variation: 0.1 } },
  ],
  fripp: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.2, tension: 0.35, variation: -0.15 } },
    { label: 'Patterned', macro: { sourcePreset: 'symmetric', motion: 0.1, tension: 0.2, variation: -0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.25, tension: 0.45, variation: 0 } },
  ],
  wes_montgomery: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.05, tension: -0.2, variation: 0.2 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.35, tension: 0.25, variation: 0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.1, tension: 0.35, variation: 0.05 } },
  ],
  joe_pass: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: 0, tension: -0.22, variation: 0.18 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.18, tension: 0.42, variation: 0.08 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'lyrical', motion: -0.2, tension: -0.35, variation: 0.32 },
    },
  ],
  allan_holdsworth: [
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.35, tension: 0.52, variation: 0.1 } },
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.4, tension: 0.45, variation: 0.05 } },
    { label: 'Patterned', macro: { sourcePreset: 'symmetric', motion: 0.15, tension: 0.25, variation: 0.05 } },
  ],
  scott_henderson: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.45, tension: 0.42, variation: -0.05 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.55, tension: 0.38, variation: 0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.3, tension: 0.48, variation: 0.08 } },
  ],
};

export function slonimskyGbdWriterPresets(writerId: SlonimskyGbdWriterId): SlonimskyGbdWriterPreset[] {
  return WRITER_PRESET_DEFS[writerId].map((p) => ({
    id: `${writerId}:${p.label.toLowerCase().replace(/\s+/g, '-')}`,
    label: p.label,
    writerId,
    macro: p.macro,
  }));
}
