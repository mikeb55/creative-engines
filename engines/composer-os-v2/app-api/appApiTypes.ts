/**
 * Composer OS V2 — App API types
 */

import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import type { GenerationMetadata } from '../core/compositionContext';
import type { RhythmIntentControl } from '../core/rhythmIntentTypes';

export type { StyleProfile };

export interface AppPreset {
  id: string;
  name: string;
  description: string;
  supported: boolean;
}

export interface AppStyleModule {
  id: string;
  name: string;
  enabled: boolean;
  /** Registered modules may be used in primary, secondary, or colour slots */
  type?: 'primary' | 'secondary' | 'colour' | 'any';
}

/** Musical intensity for the primary module (maps to internal weights). */
export type StyleBlendPrimary = 'strong' | 'medium' | 'light';

/** Blend for the secondary slot (only used when a secondary module is selected). */
export type StyleBlendSecondary = 'off' | 'light' | 'medium';

/** Blend for the colour slot (only used when a colour module is selected). */
export type StyleBlendColour = 'off' | 'subtle' | 'present';

export interface StyleBlendSettings {
  primary: StyleBlendPrimary;
  secondary: StyleBlendSecondary;
  colour: StyleBlendColour;
}

export interface AppStyleStack {
  primary: string;
  secondary?: string;
  colour?: string;
  /**
   * Musical blend (preferred). Maps to internal weights; no raw numbers in UI.
   * If omitted, legacy `weights` is used when present.
   */
  styleBlend?: StyleBlendSettings;
  /** @deprecated Prefer styleBlend; kept for tests and older clients */
  weights?: { primary: number; secondary?: number; colour?: number };
}

/** ECM Chamber engine — mutually exclusive chamber behaviours */
export type EcmChamberMode = 'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER';

export interface AppLocks {
  melody?: boolean;
  bass?: boolean;
  harmony?: boolean;
  rhythm?: boolean;
  sectionA?: boolean;
  sectionB?: boolean;
}

export interface GenerateRequest {
  presetId: string;
  styleStack: AppStyleStack;
  seed: number;
  locks?: AppLocks;
  /** Omitted → preset default title (e.g. Guitar-Bass Duo Study). */
  title?: string;
  /**
   * Guitar–Bass Duo: built-in cycle vs user progression.
   * When `custom`, `chordProgressionText` is required (may be empty string from client → error).
   * `custom_locked` — Song Mode / long-form: exactly 32 pasted symbols, no substitution or scaffold fill.
   */
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  /**
   * Guitar–Bass Duo / Song Mode: optional `|`-separated chords (8 bars default; 32 when locked long-form).
   * Only used when `harmonyMode` is `custom` or inferred from non-empty text (legacy).
   */
  chordProgressionText?: string;
  /** When `presetId` is `ecm_chamber`, selects Metheny vs Schneider chamber logic */
  ecmMode?: EcmChamberMode;
  /** User-facing variation label — maps to deterministic engine seed when set. */
  variationId?: string;
  /** UI: enable engine variation behaviour (passed through to generation). */
  variationEnabled?: boolean;
  /** Default `stable` — identical to raw seed resolution; other tiers nudge seed only (form unchanged). */
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  /**
   * Tonal centre / key (UI; echoed in artifacts). When non-empty and parseable, it authorizes the printed
   * MusicXML key signature over chord inference (same precedence as `tonalCenterOverride`; `none` still suppresses key).
   */
  tonalCenter?: string;
  /** Tempo BPM (UI; echoed in artifacts). */
  bpm?: number;
  /** Bar count for planning modes that support it (`big_band`, `string_quartet`; echoed elsewhere). */
  totalBars?: number;
  /** Guitar–Bass Duo: explicit opt-in for 32-bar long-form (with `totalBars: 32`). */
  longFormEnabled?: boolean;
  /**
   * V3.4 — MusicXML key policy: `auto` infers from chords unless a parseable `tonalCenter` / `tonalCenterOverride` is set;
   * `override` is legacy alias for explicit key (same explicit-string authority); `none` hides key signature.
   */
  keySignatureMode?: 'auto' | 'override' | 'none';
  /** Explicit key label, e.g. `Eb`, `A minor` — same export authority as `tonalCenter` when parseable (`override` takes precedence if both set). */
  tonalCenterOverride?: string;
  /** Dual style pairing (songwriter vs arranger) — `song_mode` / `big_band`. */
  stylePairing?: {
    songwriterStyle: string;
    arrangerStyle: string;
    era?: string;
  };
  /** Big band horn footprint — `big_band` only. */
  ensembleConfigId?: 'full_band' | 'medium_band' | 'small_band' | 'reeds_only' | 'brass_only' | 'custom';
  /** Song Mode primary songwriter id (e.g. `beatles`). */
  primarySongwriterStyle?: string;
  /** Song Mode — Style Engine profile. Omitted on legacy clients; Song Mode defaults to STYLE_ECM in the handler. */
  styleProfile?: StyleProfile;
  /** D1: optional rhythm intent (engine-only; omitted = legacy behaviour). */
  intent?: RhythmIntentControl;
  /** Riff Generator (`riff_generator`): 1–4 bar riff length. */
  riffStyle?: 'metheny' | 'scofield' | 'funk' | 'neutral';
  riffDensity?: 'sparse' | 'medium' | 'dense';
  riffGrid?: 'eighth' | 'sixteenth';
  riffLineMode?: 'single_line' | 'guitar_bass' | 'octave_double';
  /** Riff Generator: add bass part (guitar–bass interaction). */
  riffBass?: boolean;
  /** Guitar–Bass Duo (Song Mode hook): C4 hook rhythm layer strength; default medium in engine when omitted. */
  c4Strength?: 'light' | 'medium' | 'strong';
  /** Song Mode C5 blend strength; default medium in engine when omitted. */
  blendStrength?: 'light' | 'medium' | 'strong';
}

export interface ValidationSummary {
  scoreIntegrity: boolean;
  exportIntegrity: boolean;
  behaviourGates: boolean;
  mxValid: boolean;
  strictBarMath: boolean;
  exportRoundTrip: boolean;
  instrumentMetadata: boolean;
  sibeliusSafe: boolean;
  readinessRelease: number;
  readinessMx: number;
  shareable: boolean;
  errors: string[];
  /** Non-blocking phrase / musical-quality diagnostics (Song Mode). */
  warnings?: string[];
}

export interface OutputEntry {
  filename: string;
  filepath: string;
  /** Subfolder under Mike Composer Files, e.g. Guitar-Bass Duos */
  presetFolderLabel: string;
  timestamp: string;
  presetId: string;
  styleStack: string[];
  seed: number;
  variationId?: string;
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  /** Title written to the score / MusicXML */
  scoreTitle?: string;
  ecmMode?: string;
  harmonySource?: 'builtin' | 'custom';
  customChordProgressionSummary?: string;
  progressionMode?: 'builtin' | 'custom';
  chordProgressionInputRaw?: string;
  parsedCustomProgressionBars?: string[];
  chordProgressionParseFailed?: boolean;
  builtInHarmonyFallbackOccurred?: boolean;
  /** V3.4 — key signature receipt (when MusicXML was written). */
  keySignatureInferredTonic?: string;
  keySignatureConfidence?: number;
  keySignatureOverrideUsed?: boolean;
  keySignatureNoneMode?: boolean;
  keySignatureHide?: boolean;
  keySignatureFifths?: number;
  keySignatureExportMode?: 'major' | 'minor';
  keySignatureInferredKey?: string;
  keySignatureInferredMode?: 'major' | 'minor' | 'ambiguous';
  keySignatureInferredFifths?: number;
  keySignatureModeApplied?: 'auto' | 'override' | 'none';
  keySignatureExportKeyWritten?: boolean;
  /** V3.6b — Same as generationMetadata: chord source vs built-in (receipt clarity). */
  harmonySourceUsed?: 'builtin' | 'custom';
  /** V3.6b — Internal duo engine grammar label (not a claim the user picked Barry Harris). */
  styleGrammarLabel?: string;
  styleStackPrimaryModuleId?: string;
  styleStackPrimaryDisplayName?: string;
  userSelectedStyleDisplayNames?: string[];
  userExplicitPrimaryStyle?: boolean;
  /** Song Mode — echoed Style Engine profile when set. */
  styleProfile?: StyleProfile;
  /** Pipeline truth gates (Guitar–Bass Duo 8-bar). */
  chordProgressionSubmittedRaw?: string;
  parsedChordBarsSnapshot?: string[];
  pipelineTruthInputStage?: 'pass' | 'fail' | 'skip';
  pipelineTruthScoreStage?: 'pass' | 'fail' | 'skip';
  pipelineTruthExportStage?: 'pass' | 'fail' | 'skip';
  validation: ValidationSummary;
  /** When listing non-MusicXML artifacts from the library */
  artifactKind?: 'musicxml' | 'planning' | 'song_structure';
  /** Populated by listOutputs for UI (mode / product clarity) */
  modeLabel?: string;
  outputTypeLabel?: string;
  presetDisplayName?: string;
  /** Song Mode Phase C2: compact phrase overlay + intent diagnostics (run manifest echo). */
  songModeRhythmOverlayPhraseDiagnostics?: string;
  /** Song Mode Phase C2: per-phrase rhythm overlay + intent (when present). */
  songModeRhythmOverlayByPhrase?: GenerationMetadata['songModeRhythmOverlayByPhrase'];
  /** D1: rhythm intent resolution receipt (JSON string; when Song Mode resolution ran). */
  rhythmIntentD1Receipt?: string;
  /** Song Mode C4 hook rhythm layer (manifest). */
  c4_hook_rhythm_applied?: boolean;
  c4_bars_used?: number[];
}
