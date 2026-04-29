/**
 * Composer OS V2 — App API types
 */

import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import type { GenerationMetadata, ImportHarmonyMode } from '../core/compositionContext';
import type { RhythmIntentControl } from '../core/rhythmIntentTypes';
import type { AlternateGuitarTuningRequest } from '../core/song-mode/alternateGuitarTunings';

export type { StyleProfile };
export type { ImportHarmonyMode };
export type { AlternateGuitarTuningRequest };

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
   * `custom_locked` — Song Mode / duo form: exactly `totalBars` symbols (8, 16, or 32), no substitution or scaffold fill.
   */
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  /**
   * Guitar–Bass Duo / Song Mode: optional `|`-separated chords. Length must match `totalBars` when user harmony is supplied (8, 16, or 32 for Song/Form presets).
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
  /** Bar count for planning modes that support it (`big_band`, `string_quartet`; echoed elsewhere). Song/Form duo presets: 8, 16, or 32 only. */
  totalBars?: number;
  /** Guitar–Bass Duo / Song Mode: long-form planning when `totalBars` is 16 or 32 (with matching chord length). */
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
  /** Song Mode: secondary songwriter id — blended ~35% with primary in `resolveSongwritingStyles`. */
  secondarySongwriterStyle?: string;
  /** Song Mode: lyric author overlay (`AuthorRuleId`), e.g. `jimmy_webb`. */
  authorOverlay?: string;
  /** Song Mode v1 (Indie Art Pop): optional alternate guitar tuning controls. */
  alternateGuitarTuning?: AlternateGuitarTuningRequest;
  /**
   * Dev tracing only: UI may set a correlation id for one generate hop; echoed in logs, not used by MusicXML routing.
   */
  __generateCorrelationId?: string;
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
  /** Song Mode C3: James Brown funk overlay (opt-in; default false). */
  songModeJamesBrownFunkOverlay?: boolean;
  /** Song Mode C5 blend strength; default medium in engine when omitted. */
  blendStrength?: 'light' | 'medium' | 'strong';
  /** Phase 19: explicit musical form selection. */
  formId?: string;
  /** Song Mode: after duo MusicXML, run Python bridge for vocal lead sheet (optional). */
  includeVocalLeadSheet?: boolean;
  /** MusicXML lead-sheet input: Song Mode harmony+expression route, plus guarded phrase-expression pilot for selected non-Song presets. */
  songModeLeadSheetMusicXml?: string;
  /**
   * Song Mode LeadSheet import: how strongly to honour imported articulations/dynamics vs neutral defaults (0–1).
   * Omitted → engine default (~0.55).
   */
  leadSheetPerformanceBlend?: number;
  /**
   * MusicXML import policy only (orthogonal to `harmonyMode` on Guitar–Bass Duo).
   * - Omitted → normalized to `'free_harmony'` at the API boundary (`importHarmonyModeSource: 'defaulted'`).
   * - Invalid value → sanitized to `'free_harmony'` (source `'explicit'` when the field was present).
   * Contract version is echoed as `importHarmonyPolicyVersion` in `GenerationMetadata` / run manifest (see `IMPORT_HARMONY_POLICY_VERSION` in `core/importHarmonyPolicy.ts`).
   */
  importHarmonyMode?: ImportHarmonyMode;
  /**
   * Optional; clamped to 0–1 at the API boundary. Telemetry-only — no `blend_harmony` reharm behaviour yet.
   */
  harmonyBlend?: number;
  /** Dev/tests: deterministic indie dual-guitar tuning fixture (passed through to `runGoldenPath`). */
  debugFixtureMode?: 'indie_dual_guitar_tuning_proof';
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
  duoModeReceiptLabel?: string;
  motifAuthorityLevel?: GenerationMetadata['motifAuthorityLevel'];
  motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
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
  /** #17 — Chord export transparency (manifest echo; same shape as API receipt when present). */
  chordExportDiagnostics?: import('../../core/chordExportDiagnostics').ChordExportDiagnosticsReceipt;
  /** Song Mode C4 hook rhythm layer (manifest). */
  c4_hook_rhythm_applied?: boolean;
  c4_bars_used?: number[];
  /** Song Mode: receipt lines when a style profile applies real metadata nudges (e.g. Groove/Soul). */
  songModeStyleSurfaceNotes?: string[];
  /** Song Mode — Donald Fagen primary: Phase C1 overlay receipt (when applicable). */
  songModeDonaldFagenC1Receipt?: string;
  /** Song Mode — resolved primary songwriter id (manifest echo). */
  songwriterStyleId?: string;
  songModeFagenKeysCompV15Applied?: boolean;
  fagenKeysCompMusicalDiagnostics?: GenerationMetadata['fagenKeysCompMusicalDiagnostics'];
  sophisticatedPopHarmonyDiagnostics?: GenerationMetadata['sophisticatedPopHarmonyDiagnostics'];
  bacharachHarmonyDiagnostics?: GenerationMetadata['bacharachHarmonyDiagnostics'];
  bacharachSongModeRuleBundleId?: string;
  /** Song Mode eval echo — rhythm intent biases after style surfaces (0–1). */
  songwriterSyncopationBias?: number;
  songwriterDensityBias?: number;
  songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
  songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
  songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
  /** Song Mode: compact human-readable summary for eval/batch manifest scanning. */
  songModeDiagnosticsSummary?: {
    profile?: string;
    rules?: string;
    sectionShape?: string;
    sectionSources?: string[];
  };
  /** Song Mode — GCE weighted overall when gate ran (`core/gce/gceGate.ts`). */
  gceScore?: number;
  /** Song Mode — ship gate threshold met (≥ 8.0). */
  gceGatePassed?: boolean;
  /**
   * Riff Generator only: internal 0–10 composite from `scoreRiffGce` (not duo / Song Mode GCE).
   * Present when the riff candidate passed the riff-internal export gate only.
   */
  riffCompositeScore?: number;
  riffInternalGatePassed?: boolean;
  /**
   * Riff Generator only: compact structural rule outcomes (`riffQualityRules.ts`).
   * Not general GCE — kept separate from `gceScore` / duo metrics.
   */
  riffQualityRules?: {
    rulesetVersion: string;
    aggregatePass: boolean;
    passedCount: number;
    totalRules: number;
    rules: { id: string; passed: boolean }[];
  };
  /** Stage 4: import-harmony policy contract version when import-harmony telemetry is written (`core/importHarmonyPolicy.ts`). */
  importHarmonyPolicyVersion?: number;
  /** Brian Wilson Pet Sounds — diagnostics / receipts (Song Mode manifest echo). */
  brianWilsonPetSoundsDiagnostics?: GenerationMetadata['brianWilsonPetSoundsDiagnostics'];
  brianWilsonPetSoundsDeviceReceipts?: GenerationMetadata['brianWilsonPetSoundsDeviceReceipts'];
  brianWilsonPetSoundsSliceReceipt?: GenerationMetadata['brianWilsonPetSoundsSliceReceipt'];
  brianWilsonEffectiveHarmonyBars?: GenerationMetadata['brianWilsonEffectiveHarmonyBars'];
  /** Stevie Wonder (1972–76) slice — diagnostics / receipts (Song Mode manifest echo). */
  stevieWonderDiagnostics?: GenerationMetadata['stevieWonderDiagnostics'];
  stevieWonderDeviceReceipts?: GenerationMetadata['stevieWonderDeviceReceipts'];
  stevieWonderSliceReceipt?: GenerationMetadata['stevieWonderSliceReceipt'];
  stevieWonderEffectiveHarmonyBars?: GenerationMetadata['stevieWonderEffectiveHarmonyBars'];
  /** Radiohead (OK Computer–era) slice — diagnostics / receipts (Song Mode manifest echo). */
  radioheadDiagnostics?: GenerationMetadata['radioheadDiagnostics'];
  radioheadDeviceReceipts?: GenerationMetadata['radioheadDeviceReceipts'];
  radioheadSliceReceipt?: GenerationMetadata['radioheadSliceReceipt'];
  radioheadEffectiveHarmonyBars?: GenerationMetadata['radioheadEffectiveHarmonyBars'];
  /** James Brown (dominant-centre funk/soul) slice — diagnostics / receipts (Song Mode manifest echo). */
  jamesBrownDiagnostics?: GenerationMetadata['jamesBrownDiagnostics'];
  jamesBrownDeviceReceipts?: GenerationMetadata['jamesBrownDeviceReceipts'];
  jamesBrownSliceReceipt?: GenerationMetadata['jamesBrownSliceReceipt'];
  jamesBrownEffectiveHarmonyBars?: GenerationMetadata['jamesBrownEffectiveHarmonyBars'];
  jamesBrownAntiElaborationGuards?: GenerationMetadata['jamesBrownAntiElaborationGuards'];
  /** Joni Mitchell (modal open-tuning) slice — diagnostics / receipts (Song Mode manifest echo). */
  joniMitchellDiagnostics?: GenerationMetadata['joniMitchellDiagnostics'];
  joniMitchellDeviceReceipts?: GenerationMetadata['joniMitchellDeviceReceipts'];
  joniMitchellSliceReceipt?: GenerationMetadata['joniMitchellSliceReceipt'];
  joniMitchellEffectiveHarmonyBars?: GenerationMetadata['joniMitchellEffectiveHarmonyBars'];
  joniMitchellAntiElaborationGuards?: GenerationMetadata['joniMitchellAntiElaborationGuards'];
  joniMitchellTuningPatternByBar?: GenerationMetadata['joniMitchellTuningPatternByBar'];
  joniMitchellModalFieldLockLengthBars?: GenerationMetadata['joniMitchellModalFieldLockLengthBars'];
  joniMitchellSliceMeta?: GenerationMetadata['joniMitchellSliceMeta'];
  /** Sonic Youth — dual-guitar / alternate-tuning noise-harmony slice (manifest echo). */
  sonicYouthDiagnostics?: GenerationMetadata['sonicYouthDiagnostics'];
  sonicYouthDeviceReceipts?: GenerationMetadata['sonicYouthDeviceReceipts'];
  sonicYouthSliceReceipt?: GenerationMetadata['sonicYouthSliceReceipt'];
  sonicYouthEffectiveHarmonyBars?: GenerationMetadata['sonicYouthEffectiveHarmonyBars'];
  /** Pat Metheny (ECM / PMG) slice — diagnostics / receipts (Song Mode manifest echo). */
  patMethenyDiagnostics?: GenerationMetadata['patMethenyDiagnostics'];
  patMethenyDeviceReceipts?: GenerationMetadata['patMethenyDeviceReceipts'];
  patMethenySliceReceipt?: GenerationMetadata['patMethenySliceReceipt'];
  patMethenyEffectiveHarmonyBars?: GenerationMetadata['patMethenyEffectiveHarmonyBars'];
  patMethenyAntiElaborationGuards?: GenerationMetadata['patMethenyAntiElaborationGuards'];
  patMethenyPedalHoldMaxBars?: GenerationMetadata['patMethenyPedalHoldMaxBars'];
  patMethenyEligibilityStats?: GenerationMetadata['patMethenyEligibilityStats'];
  /** Wayne Shorter (post-bop) slice — diagnostics / receipts (Song Mode manifest echo). */
  wayneShorterDiagnostics?: GenerationMetadata['wayneShorterDiagnostics'];
  wayneShorterDeviceReceipts?: GenerationMetadata['wayneShorterDeviceReceipts'];
  wayneShorterSliceReceipt?: GenerationMetadata['wayneShorterSliceReceipt'];
  wayneShorterEffectiveHarmonyBars?: GenerationMetadata['wayneShorterEffectiveHarmonyBars'];
  wayneShorterAntiElaborationGuards?: GenerationMetadata['wayneShorterAntiElaborationGuards'];
  wayneShorterEligibilityStats?: GenerationMetadata['wayneShorterEligibilityStats'];
  /** Barry Harris (bebop / sixth–dim) slice — diagnostics / receipts (Song Mode manifest echo). */
  barryHarrisDiagnostics?: GenerationMetadata['barryHarrisDiagnostics'];
  barryHarrisDeviceReceipts?: GenerationMetadata['barryHarrisDeviceReceipts'];
  barryHarrisSliceReceipt?: GenerationMetadata['barryHarrisSliceReceipt'];
  barryHarrisEffectiveHarmonyBars?: GenerationMetadata['barryHarrisEffectiveHarmonyBars'];
  barryHarrisAntiElaborationGuards?: GenerationMetadata['barryHarrisAntiElaborationGuards'];
  /** Bill Evans (impressionist) slice — diagnostics / receipts (Song Mode manifest echo). */
  billEvansDiagnostics?: GenerationMetadata['billEvansDiagnostics'];
  billEvansDeviceReceipts?: GenerationMetadata['billEvansDeviceReceipts'];
  billEvansSliceReceipt?: GenerationMetadata['billEvansSliceReceipt'];
  billEvansEffectiveHarmonyBars?: GenerationMetadata['billEvansEffectiveHarmonyBars'];
  billEvansAntiElaborationGuards?: GenerationMetadata['billEvansAntiElaborationGuards'];
  /** Bacharach (theatre-pop harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  bacharachDiagnostics?: GenerationMetadata['bacharachDiagnostics'];
  bacharachDeviceReceipts?: GenerationMetadata['bacharachDeviceReceipts'];
  bacharachSliceReceipt?: GenerationMetadata['bacharachSliceReceipt'];
  bacharachEffectiveHarmonyBars?: GenerationMetadata['bacharachEffectiveHarmonyBars'];
  bacharachAntiElaborationGuards?: GenerationMetadata['bacharachAntiElaborationGuards'];
  /** Donald Fagen (jazz-rock precision harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  donaldFagenDiagnostics?: GenerationMetadata['donaldFagenDiagnostics'];
  donaldFagenDeviceReceipts?: GenerationMetadata['donaldFagenDeviceReceipts'];
  donaldFagenSliceReceipt?: GenerationMetadata['donaldFagenSliceReceipt'];
  donaldFagenEffectiveHarmonyBars?: GenerationMetadata['donaldFagenEffectiveHarmonyBars'];
  donaldFagenAntiElaborationGuards?: GenerationMetadata['donaldFagenAntiElaborationGuards'];
  /** ECM Chamber (sparse Nordic modal harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  ecmChamberDiagnostics?: GenerationMetadata['ecmChamberDiagnostics'];
  ecmChamberDeviceReceipts?: GenerationMetadata['ecmChamberDeviceReceipts'];
  ecmChamberSliceReceipt?: GenerationMetadata['ecmChamberSliceReceipt'];
  ecmChamberEffectiveHarmonyBars?: GenerationMetadata['ecmChamberEffectiveHarmonyBars'];
  ecmChamberAntiElaborationGuards?: GenerationMetadata['ecmChamberAntiElaborationGuards'];
}
