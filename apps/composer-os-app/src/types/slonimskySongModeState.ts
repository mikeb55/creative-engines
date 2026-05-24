import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';
import {
  mapSlonimskyMacroStateToGenerateRequest,
  type SlonimskyMacroState,
  type SlonimskySongModeWriterId,
  type SlonimskySourcePreset,
} from './slonimskyMacroState';

export type SlonimskySectionLabel = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';

export const SLONIMSKY_SECTION_LABELS: readonly SlonimskySectionLabel[] = [
  'intro',
  'verse',
  'chorus',
  'bridge',
  'outro',
] as const;

export type SlonimskySectionOverride = {
  pin?: SlonimskySourcePreset;
  avoid?: SlonimskySourcePreset[];
};

export type SlonimskySectionOverrides = Partial<Record<SlonimskySectionLabel, SlonimskySectionOverride>>;

export type SlonimskySongModeWriterPreset = {
  id: string;
  label: string;
  writerId: SlonimskySongModeWriterId;
  macro: SlonimskyMacroState;
};

/** Display preset id → macro defaults (flavor + knobs). */
const WRITER_PRESET_DEFS: Record<
  SlonimskySongModeWriterId,
  { label: string; macro: SlonimskyMacroState }[]
> = {
  pat_metheny: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: 0, tension: -0.2, variation: 0.1 } },
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.35, tension: 0.25, variation: -0.1 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'lyrical', motion: -0.25, tension: -0.35, variation: 0.35 },
    },
  ],
  frank_zappa: [
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.4, tension: 0.45, variation: 0.2 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.55, tension: 0.35, variation: 0.15 } },
    { label: 'Symmetric', macro: { sourcePreset: 'symmetric', motion: 0.1, tension: 0.15, variation: 0 } },
  ],
  sonic_youth: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.5, tension: 0.4, variation: -0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.35, tension: 0.5, variation: 0.1 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.6, tension: 0.3, variation: 0.05 } },
  ],
  joni_mitchell: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.15, tension: -0.25, variation: 0.25 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'lyrical', motion: -0.3, tension: -0.4, variation: 0.4 },
    },
    { label: 'Symmetric', macro: { sourcePreset: 'symmetric', motion: 0, tension: -0.1, variation: 0.2 } },
  ],
  radiohead: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.25, tension: 0.35, variation: -0.2 } },
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.1, tension: 0, variation: 0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.2, tension: 0.45, variation: 0.1 } },
  ],
  wayne_shorter: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.4, tension: 0.35, variation: -0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.3, tension: 0.5, variation: 0.05 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'angular', motion: -0.15, tension: 0.15, variation: 0.3 },
    },
  ],
  bill_evans: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.1, tension: -0.25, variation: 0.2 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.15, tension: 0.4, variation: 0.1 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'lyrical', motion: -0.25, tension: -0.35, variation: 0.35 },
    },
  ],
  herbie_hancock: [
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.35, tension: 0.4, variation: -0.05 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.25, tension: 0.48, variation: 0.1 } },
    { label: 'Symmetric', macro: { sourcePreset: 'symmetric', motion: 0.05, tension: 0.2, variation: 0 } },
  ],
  larry_carlton: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: 0.05, tension: -0.15, variation: 0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.2, tension: 0.38, variation: 0.1 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.45, tension: 0.3, variation: 0.05 } },
  ],
  david_gilmour: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.05, tension: -0.2, variation: 0.2 } },
    { label: 'Riff', macro: { sourcePreset: 'riff', motion: 0.4, tension: 0.28, variation: 0.1 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.15, tension: 0.42, variation: 0.05 } },
  ],
  mccoy_tyner: [
    { label: 'Patterned', macro: { sourcePreset: 'symmetric', motion: 0.05, tension: 0.1, variation: 0.1 } },
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.1, tension: -0.2, variation: 0.25 } },
    { label: 'Angular', macro: { sourcePreset: 'angular', motion: 0.3, tension: 0.35, variation: -0.05 } },
  ],
  miles_davis: [
    { label: 'Lyrical', macro: { sourcePreset: 'lyrical', motion: -0.2, tension: -0.3, variation: 0.15 } },
    { label: 'Chromatic', macro: { sourcePreset: 'chromatic', motion: 0.1, tension: 0.35, variation: 0.05 } },
    {
      label: 'Open voice',
      macro: { sourcePreset: 'lyrical', motion: -0.35, tension: -0.45, variation: 0.3 },
    },
  ],
};

export function slonimskySongModeWriterPresets(writerId: SlonimskySongModeWriterId): SlonimskySongModeWriterPreset[] {
  return WRITER_PRESET_DEFS[writerId].map((p) => ({
    id: `${writerId}:${p.label.toLowerCase().replace(/\s+/g, '-')}`,
    label: p.label,
    writerId,
    macro: p.macro,
  }));
}

export function slonimskySectionOverridesToContextKeys(overrides: SlonimskySectionOverrides): string[] {
  const keys: string[] = [];
  for (const label of SLONIMSKY_SECTION_LABELS) {
    const o = overrides[label];
    if (!o) continue;
    if (o.pin) keys.push(`slonimsky:pin:${label}=${o.pin}`);
    if (o.avoid?.length) keys.push(`slonimsky:avoid:${label}=${o.avoid.join(',')}`);
  }
  return keys;
}

export function mergeSongModeStyleContextKeys(
  base: string[] | undefined,
  sectionOverrides: SlonimskySectionOverrides
): string[] | undefined {
  const extra = slonimskySectionOverridesToContextKeys(sectionOverrides);
  if (!base?.length && !extra.length) return undefined;
  return [...(base ?? []), ...extra];
}

/** Song Mode — macro + section overrides via {@link GenerateRequest.styleGenerationContextKeys}. */
export function mapSongModeSlonimskyToGenerateRequest(
  macro: SlonimskyMacroState,
  sectionOverrides: SlonimskySectionOverrides,
  baseStyleKeys?: string[]
): Pick<GenerateRequest, 'chromaticStrength' | 'blendStrength' | 'duoIntent' | 'styleGenerationContextKeys'> {
  const merged = mergeSongModeStyleContextKeys(baseStyleKeys, sectionOverrides);
  return {
    ...mapSlonimskyMacroStateToGenerateRequest(macro),
    ...(merged?.length ? { styleGenerationContextKeys: merged } : {}),
  };
}
