/**
 * Composer OS V2 — App API types
 */

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
   */
  harmonyMode?: 'builtin' | 'custom';
  /**
   * Guitar–Bass Duo: optional `|`-separated chords (exactly 8 bars).
   * Only used when `harmonyMode` is `custom` or inferred from non-empty text (legacy).
   */
  chordProgressionText?: string;
  /** When `presetId` is `ecm_chamber`, selects Metheny vs Schneider chamber logic */
  ecmMode?: EcmChamberMode;
  /** User-facing variation label — maps to deterministic engine seed when set. */
  variationId?: string;
  /** Default `stable` — identical to raw seed resolution; other tiers nudge seed only (form unchanged). */
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  /** Tonal centre / key hint (UI; echoed in artifacts — engines may ignore until wired). */
  tonalCenter?: string;
  /** Tempo BPM (UI; echoed in artifacts). */
  bpm?: number;
  /** Bar count for planning modes that support it (`big_band`, `string_quartet`; echoed elsewhere). */
  totalBars?: number;
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
  validation: ValidationSummary;
  /** When listing non-MusicXML artifacts from the library */
  artifactKind?: 'musicxml' | 'planning' | 'song_structure';
  /** Populated by listOutputs for UI (mode / product clarity) */
  modeLabel?: string;
  outputTypeLabel?: string;
  presetDisplayName?: string;
}
