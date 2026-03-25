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
   * Guitar–Bass Duo: optional `|`-separated chords (exactly 8 bars).
   * Omitted or blank → built-in ii–V–I–VI cycle.
   */
  chordProgressionText?: string;
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
  /** Title written to the score / MusicXML */
  scoreTitle?: string;
  harmonySource?: 'builtin' | 'custom';
  customChordProgressionSummary?: string;
  validation: ValidationSummary;
}
