export type GuitarTuningMode = 'standard' | 'shared' | 'separate';

export interface AlternateGuitarTuningSpec {
  presetId: string;
  customStrings?: [string, string, string, string, string, string];
}

export interface AlternateGuitarTuningRequest {
  mode: GuitarTuningMode;
  shared?: AlternateGuitarTuningSpec;
  guitar1?: AlternateGuitarTuningSpec;
  guitar2?: AlternateGuitarTuningSpec;
}

export interface AlternateGuitarTuningResolvedSpec {
  presetId: string;
  strings: [string, string, string, string, string, string];
}

export interface AlternateGuitarTuningResolved {
  mode: GuitarTuningMode;
  shared?: AlternateGuitarTuningResolvedSpec;
  guitar1?: AlternateGuitarTuningResolvedSpec;
  guitar2?: AlternateGuitarTuningResolvedSpec;
}

export interface AlternateGuitarTuningPreset {
  id: string;
  label: string;
  strings: [string, string, string, string, string, string];
  audibleDescription: string;
}

const STANDARD_STRINGS: [string, string, string, string, string, string] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const STANDARD_OCTAVES: readonly [number, number, number, number, number, number] = [2, 2, 3, 3, 3, 4];
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export const ALTERNATE_GUITAR_TUNING_PRESETS: readonly AlternateGuitarTuningPreset[] = [
  { id: 'standard', label: 'Standard', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], audibleDescription: 'Balanced all-purpose range and familiar voicing behavior.' },
  { id: 'drop_d', label: 'Drop D', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], audibleDescription: 'Heavier low-string anchor with tighter riff punch.' },
  { id: 'dadgad', label: 'DADGAD', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'], audibleDescription: 'Open modal resonance with strong drone support.' },
  { id: 'open_d', label: 'Open D', strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], audibleDescription: 'Wide ringing open-chord color with clear harmonic gravity.' },
  { id: 'open_g', label: 'Open G', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'], audibleDescription: 'Bright open-string shimmer and hook-friendly strum motion.' },
  { id: 'drone_cluster_1', label: 'Drone Cluster 1', strings: ['C2', 'C3', 'G3', 'G3', 'C4', 'D4'], audibleDescription: 'Stacked repeated notes that favor drone beds and impact clusters.' },
  { id: 'drone_cluster_2', label: 'Drone Cluster 2', strings: ['D2', 'D3', 'A3', 'A3', 'D4', 'F4'], audibleDescription: 'Dense repeated-string pressure with sharper top-end dissonance.' },
  { id: 'open_modal_1', label: 'Open Modal 1', strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'E4'], audibleDescription: 'Modal open-string bloom with relaxed center ambiguity.' },
  { id: 'open_modal_2', label: 'Open Modal 2', strings: ['D2', 'A2', 'E3', 'A3', 'C4', 'E4'], audibleDescription: 'Suspended modal color that supports sparse lyrical motifs.' },
  { id: 'joni_style_open_color', label: 'Joni-style open color', strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'E4'], audibleDescription: 'Song-centered open voicings with soft harmonic color shifts.' },
  { id: 'joni_style_hybrid_resonance', label: 'Joni-style hybrid resonance', strings: ['D2', 'G2', 'D3', 'F#3', 'B3', 'D4'], audibleDescription: 'Hybrid open resonance with clear melody-friendly upper strings.' },
  { id: 'custom', label: 'Custom', strings: STANDARD_STRINGS, audibleDescription: 'User-defined six-string tuning.' },
];

export function getAlternateGuitarTuningPreset(id: string | null | undefined): AlternateGuitarTuningPreset | null {
  if (!id) return null;
  return ALTERNATE_GUITAR_TUNING_PRESETS.find((p) => p.id === id) ?? null;
}

/** One-line label for MusicXML export (from request `guitar1` / `guitar2` spec, not hardcoded tunings). */
export function formatAlternateGuitarTuningExportLine(spec: AlternateGuitarTuningSpec | undefined): string | null {
  if (!spec?.presetId) return null;
  if (spec.presetId === 'custom') {
    if (!spec.customStrings || spec.customStrings.length !== 6) return null;
    const pcs = spec.customStrings.map((raw) => {
      const m = /^\s*([A-Ga-g])([#b]?)/.exec(raw ?? '');
      return m ? `${m[1]!.toUpperCase()}${m[2] ?? ''}` : '?';
    });
    return `Tuning: Custom (${pcs.join('–')})`;
  }
  const preset = getAlternateGuitarTuningPreset(spec.presetId);
  if (!preset || preset.id === 'custom') return null;
  return `Tuning: ${preset.label}`;
}

function normalizeNote(raw: string, stringIndex: number): string | null {
  const m = /^\s*([A-Ga-g])([#b]?)(-?\d+)?\s*$/.exec(raw);
  if (!m) return null;
  const step = m[1]!.toUpperCase();
  const accidental = m[2] ?? '';
  const key = `${step}${accidental}`;
  if (NOTE_TO_SEMITONE[key] == null) return null;
  const octave = m[3] != null ? Number(m[3]) : STANDARD_OCTAVES[stringIndex]!;
  if (!Number.isFinite(octave) || octave < -1 || octave > 8) return null;
  return `${step}${accidental}${octave}`;
}

function normalizeCustomStrings(
  values: readonly string[] | [string, string, string, string, string, string] | undefined
): [string, string, string, string, string, string] | null {
  if (!values || values.length !== 6) return null;
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const n = normalizeNote(values[i] ?? '', i);
    if (!n) return null;
    out.push(n);
  }
  return out as [string, string, string, string, string, string];
}

function resolveSpec(spec: AlternateGuitarTuningSpec | undefined): AlternateGuitarTuningResolvedSpec | null {
  if (!spec?.presetId) return null;
  if (spec.presetId === 'custom') {
    const custom = normalizeCustomStrings(spec.customStrings);
    if (!custom) return null;
    return { presetId: 'custom', strings: custom };
  }
  const preset = getAlternateGuitarTuningPreset(spec.presetId);
  if (!preset || preset.id === 'custom') return null;
  return { presetId: preset.id, strings: preset.strings };
}

/**
 * Coarse texture class for STYLE_INDIE_ART_POP Phase A (score shaping only; no fretboard).
 * `separate_roles` is used when two guitars use different resolved tunings.
 */
export type IndieArtPopTuningTextureKind = 'standard' | 'drone_cluster' | 'open_modal' | 'separate_roles';

const DRONE_CLUSTER_PRESETS = new Set(['drone_cluster_1', 'drone_cluster_2']);

const OPEN_MODAL_FAMILY_PRESETS = new Set([
  'open_modal_1',
  'open_modal_2',
  'joni_style_open_color',
  'joni_style_hybrid_resonance',
  'dadgad',
  'open_d',
  'open_g',
  'drop_d',
]);

export function resolveIndieArtPopTuningTexture(
  tuning: AlternateGuitarTuningResolved | undefined
): IndieArtPopTuningTextureKind {
  if (!tuning || tuning.mode === 'standard') return 'standard';
  if (tuning.mode === 'separate') return 'separate_roles';
  const pid = tuning.shared?.presetId ?? 'standard';
  if (DRONE_CLUSTER_PRESETS.has(pid)) return 'drone_cluster';
  if (OPEN_MODAL_FAMILY_PRESETS.has(pid)) return 'open_modal';
  return 'standard';
}

export function normalizeAlternateGuitarTuningRequest(
  req: AlternateGuitarTuningRequest | null | undefined
): AlternateGuitarTuningResolved | null {
  if (!req) return null;
  if (req.mode === 'standard') return { mode: 'standard' };
  if (req.mode === 'shared') {
    const shared = resolveSpec(req.shared);
    if (!shared) return null;
    return { mode: 'shared', shared };
  }
  if (req.mode === 'separate') {
    const guitar1 = resolveSpec(req.guitar1);
    const guitar2 = resolveSpec(req.guitar2);
    if (!guitar1 || !guitar2) return null;
    return { mode: 'separate', guitar1, guitar2 };
  }
  return null;
}

/** True when alternate tuning metadata implies two clean electrics (Indie Art Pop separate or non-standard shared). */
export function indieArtPopAlternateTuningWantsDualElectricGuitars(
  tuning: AlternateGuitarTuningResolved | undefined
): boolean {
  if (!tuning) return false;
  if (tuning.mode === 'separate') return true;
  if (tuning.mode === 'shared') {
    const pid = tuning.shared?.presetId;
    if (pid === 'custom') return true;
    if (pid && pid !== 'standard') return true;
  }
  return false;
}
