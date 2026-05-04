import type { StyleProfile } from './songModeStyleProfile';

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

/** Roadmap § Altered Tuning Presets — four character zones (custom preset has no zone). */
export type AlternateGuitarTuningZone =
  | 'jazz_sophisticated'
  | 'sonic_youth_noise'
  | 'joni_mitchell'
  | 'hybrid_harmonic';

export interface AlternateGuitarTuningPreset {
  id: string;
  label: string;
  strings: [string, string, string, string, string, string];
  audibleDescription: string;
  /** Omitted for `custom` only. */
  zone?: AlternateGuitarTuningZone;
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

/**
 * Full palette: roadmap 24 zone presets + legacy absorbed ids + `standard` / `custom`.
 * Preset `id` values are stable for requests / manifests.
 */
export const ALTERNATE_GUITAR_TUNING_PRESETS: readonly AlternateGuitarTuningPreset[] = [
  // —— Jazz / Sophisticated
  {
    id: 'standard',
    label: 'Standard',
    zone: 'jazz_sophisticated',
    strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    audibleDescription: 'Balanced all-purpose range and familiar voicing behavior.',
  },
  {
    id: 'all_fourths',
    label: 'All Fourths',
    zone: 'jazz_sophisticated',
    strings: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
    audibleDescription: 'Linear jazz spread — wide intervals, uniform fret geometry.',
  },
  {
    id: 'all_fifths',
    label: 'All Fifths',
    zone: 'jazz_sophisticated',
    strings: ['C2', 'G2', 'D3', 'A3', 'E4', 'B4'],
    audibleDescription: 'Cello-like fifths stack — very wide range.',
  },
  {
    id: 'new_standard',
    label: 'New Standard (Fripp)',
    zone: 'jazz_sophisticated',
    strings: ['C2', 'G2', 'D3', 'A3', 'E4', 'G4'],
    audibleDescription: 'Fripp New Standard — wide range with open high triad colour.',
  },
  {
    id: 'minor_third_stack',
    label: 'Minor Third Stack',
    zone: 'jazz_sophisticated',
    strings: ['C2', 'Eb2', 'F#2', 'A2', 'C3', 'Eb3'],
    audibleDescription: 'Diminished symmetry — repeating minor thirds.',
  },
  {
    id: 'augmented_stack',
    label: 'Augmented Stack',
    zone: 'jazz_sophisticated',
    strings: ['C2', 'E2', 'Ab2', 'C3', 'E3', 'Ab3'],
    audibleDescription: 'Augmented symmetry — Messiaen-adjacent colour.',
  },
  {
    id: 'whole_tone',
    label: 'Whole Tone',
    zone: 'jazz_sophisticated',
    strings: ['C2', 'D2', 'E2', 'F#2', 'Ab2', 'Bb2'],
    audibleDescription: 'Whole-tone colour — no leading tone, impressionist blur.',
  },
  // —— Sonic Youth / Noise / Experimental
  {
    id: 'open_g',
    label: 'Open G',
    zone: 'sonic_youth_noise',
    strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    audibleDescription: 'Bright open-string shimmer and hook-friendly strum motion.',
  },
  {
    id: 'drone_cluster_1',
    label: 'Drone Cluster 1',
    zone: 'sonic_youth_noise',
    strings: ['C2', 'C3', 'G3', 'G3', 'C4', 'D4'],
    audibleDescription: 'Stacked repeated notes that favor drone beds and impact clusters.',
  },
  {
    id: 'drone_cluster_2',
    label: 'Drone Cluster 2',
    zone: 'sonic_youth_noise',
    strings: ['D2', 'D3', 'A3', 'A3', 'D4', 'F4'],
    audibleDescription: 'Dense repeated-string pressure with sharper top-end dissonance.',
  },
  {
    id: 'sy_cgdgcd',
    label: 'CGDGCD',
    zone: 'sonic_youth_noise',
    strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'D4'],
    audibleDescription: 'Sonic Youth drone/noise bed — Confusion-era openness.',
  },
  {
    id: 'sy_cgdgbd',
    label: 'CGDGBD',
    zone: 'sonic_youth_noise',
    strings: ['C2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    audibleDescription: 'Drone-heavy with paired high G colour.',
  },
  {
    id: 'sy_ebebeb',
    label: 'EBEBEB',
    zone: 'sonic_youth_noise',
    strings: ['E2', 'B2', 'E3', 'B3', 'E4', 'B4'],
    audibleDescription: 'Maximum unison-family drones across strings.',
  },
  {
    id: 'sy_facgce',
    label: 'FACGCE',
    zone: 'sonic_youth_noise',
    strings: ['F2', 'A2', 'C3', 'G3', 'C4', 'E4'],
    audibleDescription: 'Cluster-friendly open voicing — noisy resonance.',
  },
  {
    id: 'sy_cgcgce',
    label: 'CGCGCE',
    zone: 'sonic_youth_noise',
    strings: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'],
    audibleDescription: 'Open C family with tight upper tension.',
  },
  {
    id: 'sy_dgdgbd',
    label: 'DGDGBD',
    zone: 'sonic_youth_noise',
    strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    audibleDescription: 'Open G variant — darker, riff-led motion.',
  },
  // —— Joni Mitchell
  {
    id: 'dadgad',
    label: 'DADGAD',
    zone: 'joni_mitchell',
    strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
    audibleDescription: 'Open modal resonance with strong drone support.',
  },
  {
    id: 'open_d',
    label: 'Open D',
    zone: 'joni_mitchell',
    strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
    audibleDescription: 'Wide ringing open-chord color with clear harmonic gravity.',
  },
  {
    id: 'joni_style_open_color',
    label: 'Joni-style open color',
    zone: 'joni_mitchell',
    strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'E4'],
    audibleDescription: 'Song-centered open voicings with soft harmonic color shifts.',
  },
  {
    id: 'joni_style_hybrid_resonance',
    label: 'Joni-style hybrid resonance',
    zone: 'joni_mitchell',
    strings: ['D2', 'G2', 'D3', 'F#3', 'B3', 'D4'],
    audibleDescription: 'Hybrid open resonance with clear melody-friendly upper strings.',
  },
  {
    id: 'joni_dgdfce',
    label: 'DGDFCE (A Case of You)',
    zone: 'joni_mitchell',
    strings: ['D2', 'G2', 'D3', 'F3', 'C4', 'E4'],
    audibleDescription: 'Highly distinctive Joni colour — lyrical suspension.',
  },
  {
    id: 'joni_cgefge',
    label: 'CGEFGE (Little Green)',
    zone: 'joni_mitchell',
    strings: ['C2', 'G2', 'E3', 'F3', 'G4', 'E4'],
    audibleDescription: 'Little Green family — wide mid/high resonance.',
  },
  {
    id: 'joni_cgdgbe',
    label: 'CGDGBE (Both Sides Now)',
    zone: 'joni_mitchell',
    strings: ['C2', 'G2', 'D3', 'G3', 'B3', 'E4'],
    audibleDescription: 'Both Sides Now flavour — bright open triad top.',
  },
  {
    id: 'joni_dadgbe',
    label: 'DADGBE (Big Yellow Taxi)',
    zone: 'joni_mitchell',
    strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    audibleDescription: 'Standard-ish lift on low strings — familiar song gravity.',
  },
  {
    id: 'joni_dadfad',
    label: 'DADf#AD (Open D minor)',
    zone: 'joni_mitchell',
    strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
    audibleDescription: 'Dark open D minor — modal folk shadow.',
  },
  {
    id: 'joni_eeeebe',
    label: 'EEEEBE',
    zone: 'joni_mitchell',
    strings: ['E2', 'E2', 'E3', 'E3', 'B3', 'E4'],
    audibleDescription: 'Dense unison beds — Richard-era harmonic stillness.',
  },
  // —— Hybrid / Harmonic
  {
    id: 'drop_d',
    label: 'Drop D',
    zone: 'hybrid_harmonic',
    strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    audibleDescription: 'Heavier low-string anchor with tighter riff punch.',
  },
  {
    id: 'open_e',
    label: 'Open E',
    zone: 'hybrid_harmonic',
    strings: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
    audibleDescription: 'Classic slide and blues-rock open voicing — ringing major triad on open strings.',
  },
  {
    id: 'baritone_standard',
    label: 'Baritone standard',
    zone: 'hybrid_harmonic',
    strings: ['B1', 'E2', 'A2', 'D3', 'F#3', 'A3'],
    audibleDescription: 'Long-scale B tuning — extended low register with familiar chord shapes shifted down.',
  },
  {
    id: 'open_modal_1',
    label: 'Open Modal 1',
    zone: 'hybrid_harmonic',
    strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'E4'],
    audibleDescription: 'Modal open-string bloom with relaxed center ambiguity.',
  },
  {
    id: 'open_modal_2',
    label: 'Open Modal 2',
    zone: 'hybrid_harmonic',
    strings: ['D2', 'A2', 'E3', 'A3', 'C4', 'E4'],
    audibleDescription: 'Suspended modal color that supports sparse lyrical motifs.',
  },
  {
    id: 'open_cmaj7',
    label: 'Open Cmaj7',
    zone: 'hybrid_harmonic',
    strings: ['C2', 'G2', 'E3', 'G3', 'B3', 'E4'],
    audibleDescription: 'Impressionist open maj7 resonance.',
  },
  {
    id: 'open_dm9',
    label: 'Open Dm9',
    zone: 'hybrid_harmonic',
    strings: ['D2', 'A2', 'D3', 'F3', 'C4', 'E4'],
    audibleDescription: 'Dark ninth-friendly spread — modal gravity.',
  },
  {
    id: 'quartal',
    label: 'Quartal (McCoy Tyner)',
    zone: 'hybrid_harmonic',
    strings: ['B1', 'E2', 'A2', 'D3', 'G3', 'C4'],
    audibleDescription: 'Low-quartal stack — pentatonic / fourth towers.',
  },
  {
    id: 'overtone',
    label: 'Overtone',
    zone: 'hybrid_harmonic',
    strings: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'],
    audibleDescription: 'Harmonic-series flavour — pure bell-like resonance.',
  },
  {
    id: 'open_em11',
    label: 'Open Em11',
    zone: 'hybrid_harmonic',
    strings: ['E2', 'B2', 'D3', 'G3', 'B3', 'E4'],
    audibleDescription: 'ECM-adjacent lush suspension — open eleventh colour.',
  },
  {
    id: 'sus2_stack',
    label: 'Sus2 Stack',
    zone: 'hybrid_harmonic',
    strings: ['D2', 'A2', 'D3', 'A3', 'D4', 'E4'],
    audibleDescription: 'Drone-heavy sus2 ladder — suspended shimmer.',
  },
  /** Uniform half-step down from standard — MusicXML export uses chromatic transpose only (no zone; list via Other / API). */
  {
    id: 'eb_standard',
    label: 'Eb standard',
    strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
    audibleDescription: 'Eb standard tuning — uniform −1 semitone from concert pitch for notation.',
  },
  {
    id: 'custom',
    label: 'Custom',
    strings: STANDARD_STRINGS,
    audibleDescription: 'User-defined six-string tuning.',
  },
];

/** The 24 roadmap zone presets (excludes legacy absorbed ids `standard`, `drop_d`, `custom`, etc.). */
export const ROADMAP_ZONE_TUNING_PRESET_IDS: readonly string[] = [
  'all_fourths',
  'all_fifths',
  'new_standard',
  'minor_third_stack',
  'augmented_stack',
  'whole_tone',
  'sy_cgdgcd',
  'sy_cgdgbd',
  'sy_ebebeb',
  'sy_facgce',
  'sy_cgcgce',
  'sy_dgdgbd',
  'joni_dgdfce',
  'joni_cgefge',
  'joni_cgdgbe',
  'joni_dadgbe',
  'joni_dadfad',
  'joni_eeeebe',
  'open_cmaj7',
  'open_dm9',
  'quartal',
  'overtone',
  'open_em11',
  'sus2_stack',
];

export function getAlternateGuitarTuningPreset(id: string | null | undefined): AlternateGuitarTuningPreset | null {
  if (!id) return null;
  return ALTERNATE_GUITAR_TUNING_PRESETS.find((p) => p.id === id) ?? null;
}

export function getPresetsByZone(zone: AlternateGuitarTuningZone): AlternateGuitarTuningPreset[] {
  return ALTERNATE_GUITAR_TUNING_PRESETS.filter((p) => p.zone === zone);
}

/** Style profiles that accept alternate-tuning request metadata + register / surface nudges (Song Mode hook-first routes). */
export const STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING: readonly StyleProfile[] = [
  'STYLE_INDIE_ART_POP',
  'STYLE_SONIC_YOUTH',
  'STYLE_JONI_MITCHELL',
  'STYLE_PAT_METHENY',
  'STYLE_ECM_CHAMBER',
];

export function styleProfileSupportsAlternateGuitarTuning(profile: StyleProfile | undefined): boolean {
  if (!profile) return false;
  return (STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING as readonly string[]).includes(profile);
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

const DRONE_CLUSTER_PRESETS = new Set<string>([
  'drone_cluster_1',
  'drone_cluster_2',
  'sy_cgdgcd',
  'sy_cgdgbd',
  'sy_ebebeb',
  'sy_facgce',
  'sy_cgcgce',
  'sy_dgdgbd',
  'open_em11',
  'sus2_stack',
]);

const JONI_ZONE_PRESET_IDS: readonly string[] = [
  'dadgad',
  'open_d',
  'joni_style_open_color',
  'joni_style_hybrid_resonance',
  'joni_dgdfce',
  'joni_cgefge',
  'joni_cgdgbe',
  'joni_dadgbe',
  'joni_dadfad',
  'joni_eeeebe',
];

const JAZZ_SPEC_PRESET_IDS: readonly string[] = [
  'all_fourths',
  'all_fifths',
  'new_standard',
  'minor_third_stack',
  'augmented_stack',
  'whole_tone',
];

const HYBRID_OPEN_MODAL_EXTRA: readonly string[] = ['quartal', 'open_cmaj7', 'open_dm9', 'overtone', 'open_modal_1', 'open_modal_2'];

const OPEN_MODAL_FAMILY_PRESETS = new Set<string>([
  ...JONI_ZONE_PRESET_IDS,
  ...JAZZ_SPEC_PRESET_IDS,
  ...HYBRID_OPEN_MODAL_EXTRA,
]);

export function resolveIndieArtPopTuningTexture(tuning: AlternateGuitarTuningResolved | undefined): IndieArtPopTuningTextureKind {
  if (!tuning || tuning.mode === 'standard') return 'standard';
  if (tuning.mode === 'separate') return 'separate_roles';
  const pid = tuning.shared?.presetId ?? 'standard';
  if (DRONE_CLUSTER_PRESETS.has(pid)) return 'drone_cluster';
  if (OPEN_MODAL_FAMILY_PRESETS.has(pid)) return 'open_modal';
  return 'standard';
}

/**
 * Fixed chromatic offsets for MusicXML `<transpose><chromatic>` (Sibelius-safe); scordatura / non-uniform tunings omit.
 * `custom` never emits transpose — treat as text / engine-only.
 */
export function exportTransposeSemitonesForAlternatePresetId(presetId: string | null | undefined): number | undefined {
  if (!presetId || presetId === 'custom') return undefined;
  if (presetId === 'drop_d') return -2;
  if (presetId === 'eb_standard') return -1;
  return undefined;
}

/**
 * Maps resolved alternate tuning to per-part transpose keys (`guitar`, `guitar_2`) for `ScoreModel.exportPartTransposeSemitones`.
 */
export function buildExportPartTransposeSemitonesFromResolvedAlternateTuning(
  tuning: AlternateGuitarTuningResolved | null | undefined
): Record<string, number> | undefined {
  if (!tuning || tuning.mode === 'standard') return undefined;
  const out: Record<string, number> = {};
  if (tuning.mode === 'shared') {
    const n = exportTransposeSemitonesForAlternatePresetId(tuning.shared?.presetId);
    if (n !== undefined) out.guitar = n;
  } else if (tuning.mode === 'separate') {
    const n1 = exportTransposeSemitonesForAlternatePresetId(tuning.guitar1?.presetId);
    const n2 = exportTransposeSemitonesForAlternatePresetId(tuning.guitar2?.presetId);
    if (n1 !== undefined) out.guitar = n1;
    if (n2 !== undefined) out.guitar_2 = n2;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
export function indieArtPopAlternateTuningWantsDualElectricGuitars(tuning: AlternateGuitarTuningResolved | undefined): boolean {
  if (!tuning) return false;
  if (tuning.mode === 'separate') return true;
  if (tuning.mode === 'shared') {
    const pid = tuning.shared?.presetId;
    if (pid === 'custom') return true;
    if (pid && pid !== 'standard') return true;
  }
  return false;
}
