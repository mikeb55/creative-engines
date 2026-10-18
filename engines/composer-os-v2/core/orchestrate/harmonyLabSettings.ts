/**
 * Harmony Lab settings. Browser-safe: no Node imports.
 */
import type { TriadQuality } from '../wwh/wwhTriadPair';
import type { TriadicOperation } from '../hexatonic/triadicTransformation';
import type { E2EnsembleId } from './ensembleTemplates';

export const HARMONY_LAB_VERSION = 'harmony-lab-1';

export type HarmonyLabKind = 'polychord' | 'triad-pair' | 'dyad-pair';
export type HarmonyLabDensity = 'sparse' | 'medium' | 'dense';
export type HarmonyLabDuration = 'eighth' | 'quarter' | 'half';
export type CommonToneBehaviour = 'restrike' | 'sustain';
export type PairUse = 'alternate' | 'interlock' | 'superpose';
export type DyadMotion = 'parallel' | 'contrary' | 'oblique';
export type ParentTransform = 'none' | TriadicOperation;

export interface ChordSpec {
  root: string;
  quality: TriadQuality;
  octave: number;
}

export interface DyadSpec {
  low: string;
  high: string;
}

export interface HarmonyLabSettings {
  version: typeof HARMONY_LAB_VERSION;
  presetId: string | null;
  kind: HarmonyLabKind;
  ensemble: E2EnsembleId;
  title: string;
  seed: number;
  tempo: number;
  upper: ChordSpec;
  lower: ChordSpec;
  triadA: ChordSpec;
  triadB: ChordSpec;
  use: PairUse;
  parentTransform: ParentTransform;
  motifDevelopment: boolean;
  phraseReturn: boolean;
  dyadA: DyadSpec;
  dyadB: DyadSpec;
  motion: DyadMotion;
  contrarySemitones: number;
  registerLow: number;
  registerHigh: number;
  simultaneous: boolean;
  density: HarmonyLabDensity;
  duration: HarmonyLabDuration;
  commonTone: CommonToneBehaviour;
  silence: boolean;
  sourceXml: string;
  preserveMelody: boolean;
  preserveBass: boolean;
  preserveRhythm: boolean;
  preserveForm: boolean;
  preserveTempo: boolean;
  regionStartBar: number;
  regionEndBar: number;
}

export interface HarmonyLabSourceView {
  ok: boolean;
  error: string | null;
  bars: number;
  tempo: number | null;
  fourFour: boolean;
  parts: Array<{ partId: string; notes: number }>;
  events: Array<{ id: string; partId: string; bar: number; midi: number | null; rest: boolean }>;
}

export interface HarmonyLabCompileOk {
  ok: true;
  request: E2PerformRequest;
  summary: string;
  lockStatus: string;
  intervalText: string;
  unsupported: string[];
}

export type HarmonyLabCompile = HarmonyLabCompileOk | { ok: false; error: string; unsupported: string[] };

export function defaultHarmonyLabSettings(): HarmonyLabSettings {
  return {
    version: HARMONY_LAB_VERSION,
    presetId: 'polychordal-contrast',
    kind: 'polychord',
    ensemble: 'big-band',
    title: 'Polychordal Contrast',
    seed: 3401,
    tempo: 96,
    upper: { root: 'D', quality: 'major', octave: 5 },
    lower: { root: 'C', quality: 'major', octave: 3 },
    triadA: { root: 'C', quality: 'major', octave: 4 },
    triadB: { root: 'D', quality: 'major', octave: 4 },
    use: 'alternate',
    parentTransform: 'none',
    motifDevelopment: false,
    phraseReturn: false,
    dyadA: { low: 'C4', high: 'G4' },
    dyadB: { low: 'D4', high: 'A4' },
    motion: 'contrary',
    contrarySemitones: 2,
    registerLow: 36,
    registerHigh: 88,
    simultaneous: true,
    density: 'dense',
    duration: 'half',
    commonTone: 'restrike',
    silence: false,
    sourceXml: '',
    preserveMelody: false,
    preserveBass: false,
    preserveRhythm: false,
    preserveForm: false,
    preserveTempo: false,
    regionStartBar: 1,
    regionEndBar: 4,
  };
}

export const HARMONY_LAB_PRESETS: readonly HarmonyLabSettings[] = [
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'lyrical-sparse',
    kind: 'triad-pair',
    ensemble: 'string-quartet',
    title: 'Lyrical and Sparse',
    tempo: 72,
    triadA: { root: 'C', quality: 'major', octave: 5 },
    triadB: { root: 'A', quality: 'minor', octave: 4 },
    use: 'alternate',
    density: 'sparse',
    duration: 'quarter',
    simultaneous: false,
    silence: true,
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'floating-triad-pairs',
    kind: 'triad-pair',
    ensemble: 'ecm-duo',
    title: 'Floating Triad Pairs',
    tempo: 84,
    triadA: { root: 'C', quality: 'major', octave: 4 },
    triadB: { root: 'D', quality: 'major', octave: 4 },
    use: 'alternate',
    density: 'medium',
    duration: 'eighth',
    simultaneous: false,
    phraseReturn: true,
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'common-tone-movement',
    kind: 'polychord',
    ensemble: 'string-quartet',
    title: 'Common-Tone Movement',
    tempo: 80,
    upper: { root: 'A', quality: 'minor', octave: 4 },
    lower: { root: 'C', quality: 'major', octave: 4 },
    simultaneous: false,
    density: 'medium',
    duration: 'quarter',
    commonTone: 'sustain',
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'polychordal-contrast',
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'rhythmic-interlock',
    kind: 'triad-pair',
    ensemble: 'big-band',
    title: 'Rhythmic Interlock',
    tempo: 120,
    triadA: { root: 'C', quality: 'major', octave: 5 },
    triadB: { root: 'D', quality: 'major', octave: 4 },
    use: 'interlock',
    density: 'medium',
    duration: 'eighth',
    simultaneous: false,
    motifDevelopment: true,
    phraseReturn: true,
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'sparse-dyadic-counterpoint',
    kind: 'dyad-pair',
    ensemble: 'string-quartet',
    title: 'Sparse Dyadic Counterpoint',
    tempo: 66,
    dyadA: { low: 'C4', high: 'G4' },
    dyadB: { low: 'D4', high: 'A4' },
    motion: 'contrary',
    contrarySemitones: 2,
    density: 'sparse',
    duration: 'quarter',
    simultaneous: false,
    silence: true,
    commonTone: 'sustain',
  },
  {
    ...defaultHarmonyLabSettings(),
    presetId: 'radical-harmonic-contrast',
    kind: 'polychord',
    ensemble: 'big-band',
    title: 'Radical Harmonic Contrast',
    tempo: 132,
    upper: { root: 'F#', quality: 'major', octave: 5 },
    lower: { root: 'C', quality: 'major', octave: 3 },
    simultaneous: true,
    density: 'dense',
    duration: 'quarter',
  },
];

export function harmonyLabPreset(id: string): HarmonyLabSettings | null {
  return HARMONY_LAB_PRESETS.find((preset) => preset.presetId === id) ?? null;
}


export function harmonyLabLockLabel(settings: HarmonyLabSettings): string {
  const locks: string[] = [];
  if (settings.preserveMelody) locks.push('melody');
  if (settings.preserveBass) locks.push('bass');
  if (settings.preserveRhythm) locks.push('rhythm');
  if (settings.preserveForm) locks.push('form and metre');
  if (settings.preserveTempo) locks.push('tempo');
  if (!settings.sourceXml.trim()) return 'Unlocked. No source is loaded.';
  if (!locks.length) return 'Source loaded. Nothing is locked.';
  return `Locked: ${locks.join(', ')}. Region bars ${settings.regionStartBar}–${settings.regionEndBar}.`;
}

export function harmonyLabClientIssue(settings: HarmonyLabSettings): string | null {
  if (settings.kind === 'triad-pair' && settings.parentTransform !== 'none' && settings.triadB.quality !== 'major' && settings.triadB.quality !== 'minor') {
    return 'Augmented and diminished triads have no P, L, R, H, N or S transform.';
  }
  if (settings.motifDevelopment && !settings.phraseReturn) {
    return 'Turn on phrase return to develop the motif. The return is the opening, reversed.';
  }
  const pitch = /^[A-G][b#]*-?\d+$/;
  if (settings.kind === 'dyad-pair') {
    const fields = settings.motion === 'parallel'
      ? [settings.dyadA.low, settings.dyadA.high, settings.dyadB.low, settings.dyadB.high]
      : [settings.dyadA.low, settings.dyadA.high];
    if (fields.some((field) => !pitch.test(field.trim()))) return 'Write dyad pitches as C4 or F#3.';
  }
  return null;
}
