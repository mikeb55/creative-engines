/**
 * Composer OS V2 — App API types
 */

import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import type {
  AngeloBadalamentiContextMode,
  ArvoPartContextMode,
  ArvoPartTintinnabuliParams,
  BartokContextMode,
  BeatlesContextMode,
  BeatlesFormTemplateId,
  BeatlesMelodicLens,
  BernardHerrmannContextMode,
  EnnioMorriconeContextMode,
  FelaKutiContextMode,
  FrankZappaContextMode,
  ZappaStyleMode,
  GenerationMetadata,
  GershwinContextMode,
  HansZimmerContextMode,
  ImportHarmonyMode,
  JerryGoldsmithContextMode,
  JohnWilliamsContextMode,
  JoniMitchellPhaseMode,
  BasieTestamentMode,
  BrookmeyerPeriodMode,
  MessiaenPeriodMode,
  NelsonBluesFormVariant,
  NelsonPeriodMode,
  MilesDavisContextMode,
  NinoRotaContextMode,
  PhilipGlassContextMode,
  PrinceContextMode,
  SteveReichProcessMode,
  ThadJonesPhaseMode,
} from '../core/compositionContext';
import type { RhythmIntentControl } from '../core/rhythmIntentTypes';
import type { AlternateGuitarTuningRequest } from '../core/song-mode/alternateGuitarTunings';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import type { ClaveGridSpec } from '../core/rhythm/claveGridTypes';
import type { BigBandFormPhase } from '../core/big-band/bigBandPlanTypes';
import type { MotifTransform } from '../core/song-mode/motifMutationEngine';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';

export type { StyleProfile };
export type { ArvoPartContextMode };
export type { ArvoPartTintinnabuliParams };
export type { BartokContextMode };
export type { FrankZappaContextMode };
export type { ZappaStyleMode };
export type { GershwinContextMode };
export type { MilesDavisContextMode };
export type { PrinceContextMode };
export type { BeatlesContextMode };
export type { BeatlesFormTemplateId };
export type { BeatlesMelodicLens };
export type { FelaKutiContextMode };
export type { BernardHerrmannContextMode };
export type { JohnWilliamsContextMode };
export type { EnnioMorriconeContextMode };
export type { NinoRotaContextMode };
export type { JerryGoldsmithContextMode };
export type { PhilipGlassContextMode };
export type { SteveReichProcessMode };
export type { MessiaenPeriodMode };
export type { HansZimmerContextMode };
export type { AngeloBadalamentiContextMode };
export type { BasieTestamentMode };
export type { BrookmeyerPeriodMode };
export type { NelsonPeriodMode };
export type { NelsonBluesFormVariant };
export type { ImportHarmonyMode };
export type { AlternateGuitarTuningRequest };

export interface AppPreset {
  id: string;
  name: string;
  description: string;
  supported: boolean;
  /** Optional UI grouping (e.g. study generators). */
  category?: string;
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

/**
 * Section-scoped regeneration — splice a newly generated bar span into prior MusicXML (`baseMusicXml`).
 * Wired presets: guitar–bass duo family, `ecm_chamber`, `song_mode`, `big_band`, `string_quartet`.
 * Unsupported (API returns error if `baseMusicXml` is set): `riff_generator`, `wyble_etude`, `slonimsky_etude`.
 */
export interface SectionRegenerationParams {
  /** 1-based inclusive start bar */
  startBar: number;
  /** 1-based inclusive end bar */
  endBar: number;
  /** Full-score MusicXML from a prior export (same preset/settings). */
  baseMusicXml: string;
}

/** Per-section VRB assignment — single id or 2–3-way blend. */
export type SectionVrbMapEntry =
  | string
  | {
      /** Resolved primary / dominant id when blend present. */
      vrbId?: string;
      blendVrbIds: string[];
      blendWeights: number[];
    };

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
   * `custom_locked` — Song Mode / duo form: exactly `totalBars` symbols (8, 16, 24, 32, 40, 48, 56, 64), no substitution or scaffold fill.
   */
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  /**
   * Guitar–Bass Duo / Song Mode: optional `|`-separated chords. Length must match `totalBars` when user harmony is supplied (8, 16, 24, 32, 40, 48, 56, 64 for Song/Form presets).
   * Only used when `harmonyMode` is `custom` or inferred from non-empty text (legacy).
   */
  chordProgressionText?: string;
  /**
   * Riff Generator: optional pre-parsed bar chords (engine still accepts `chordProgressionText`).
   * When set, must align with `totalBars` after loop expansion.
   */
  chordProgression?: string[];
  /**
   * Song Mode — raw MusicXML string for future import parity with paste/iReal (`parseMusicXml` → LeadSheet).
   * Stub: fails generation until `parsedChartToLeadSheet` is implemented.
   */
  musicXmlSource?: string;
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
  /** Bar count for planning modes that support it (`big_band`, `string_quartet`; echoed elsewhere). Song/Form duo presets: 8, 16, 24, 32, 40, 48, 56, 64. */
  totalBars?: number;
  /** Big Band only — drum intensity policy tier. Default `standard`. */
  drumIntensity?: 'sparse' | 'standard' | 'driving';
  /**
   * Big Band — optional per-form-slice drum intensity (intro / melody head / soli / solo / shout / rideout).
   * Omitted keys use {@link drumIntensity} or `standard`.
   */
  sectionIntensityOverrides?: Partial<Record<BigBandFormPhase, 'sparse' | 'standard' | 'driving'>>;
  /** Big Band — ensemble fills / brass-shout dialogue vs background comping. Default `medium`. */
  figureResponse?: 'low' | 'medium' | 'high';
  /** Big Band — rhythm-section subdivision feel (`in2` half-time vs `in4` full swing/walk). Default `in4`. */
  feelMode?: 'in2' | 'in4';
  /** Big Band — drum timbre: explicit brushes/sticks or `auto` (intensity-driven matrix). Default `auto`. */
  drumArticulation?: 'auto' | 'brushes' | 'sticks';
  /** Guitar–Bass Duo / Song Mode: long-form planning when `totalBars` is 16, 24, 32, 40, 48, 56, or 64 (with matching chord length). */
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
  /**
   * Phase 6+7 — StylePanel: primary instrument / output family (echoed in metadata; routing hooks later).
   */
  instrumentGroup?: 'big_band' | 'string_quartet' | 'guitar' | 'etude';
  /** Phase 6+7 — Guitar / étude tab vs notation (UI). */
  guitarOutputMode?: 'notation' | 'tab' | 'both';
  /** Phase 6+7 — Étude target instrument id (`violin_I`, `cello`, …). */
  etudeInstrument?: string;
  /** Phase 6+7 — Étude technical focus. */
  etudeTechnicalFocus?: import('../core/composer/etudeGenerator').EtudeTechnicalFocus;
  /** Phase 8 — Run improv agent post-pass + append improv part to MusicXML when enabled. */
  improvMode?: boolean;
  /** Phase 8 — Voice bundle id for improv behaviour (`john_coltrane`, `gil_evans`, …). */
  improvVoiceId?: string;
  /** Phase 8 — Bar-level stochastic variance 0–1 (0 = identical to legacy deterministic picks). */
  stochasticVariance?: number;
  /** Phase 8 — Optional render ordinal for weighted pool draws (same seed + variance > 0). */
  stochasticRenderOrdinal?: number;
  /** Song Mode primary songwriter id (e.g. `beatles`). */
  primarySongwriterStyle?: string;
  /** Song Mode: secondary songwriter id — blended ~35% with primary in `resolveSongwritingStyles`. */
  secondarySongwriterStyle?: string;
  /** Song Mode: lyric author overlay (`AuthorRuleId`), e.g. `jimmy_webb`. */
  authorOverlay?: string;
  /** Song Mode: classical song / lieder overlay (`ClassicalSongRuleId`), e.g. `schubert`. */
  classicalOverlay?: string;
  /** Song Mode v1 (Indie Art Pop): optional alternate guitar tuning controls. */
  alternateGuitarTuning?: AlternateGuitarTuningRequest;
  /**
   * Dev tracing only: UI may set a correlation id for one generate hop; echoed in logs, not used by MusicXML routing.
   */
  __generateCorrelationId?: string;
  /** Song Mode — Style Engine profile. Omitted on legacy clients; Song Mode defaults to STYLE_ECM in the handler. */
  styleProfile?: StyleProfile;
  /**
   * Song Mode — ECM style surface (`STYLE_ECM` / `STYLE_ECM_CHAMBER`): nudges density/sync/space in
   * `applyEcmChamberStyleSurface` (`angel_song` | `balanced` | `metheny_scofield`). Omitted → engine default.
   */
  ecmChamberMode?: 'angel_song' | 'balanced' | 'metheny_scofield';
  /** D1: optional rhythm intent (engine-only; omitted = legacy behaviour). */
  intent?: RhythmIntentControl;
  /** Riff Generator (`riff_generator`): loop length in bars (1, 2, 4, 8, 16, 32). */
  riffStyle?: 'metheny' | 'scofield' | 'funk' | 'neutral';
  riffDensity?: 'sparse' | 'medium' | 'dense';
  riffGrid?: 'eighth' | 'sixteenth';
  riffLineMode?: 'single_line' | 'guitar_bass' | 'octave_double';
  /** Riff Generator: add bass part (guitar–bass interaction). */
  riffBass?: boolean;
  /** Riff-path Zappa-style solo overlay (requires VRB `soloGeneratorProfile`). */
  riffSolo?: boolean;
  /** Riff Generator: VoiceRuleBundle id with `riffProfile` (e.g. `nile_rodgers`, `weather_report`). */
  riffVrbId?: string;
  /** Riff Generator: odd-meter template overlay (fusion / art_rock). */
  riffOddMeterPreset?:
    | 'meter5'
    | 'meter7'
    | 'meter9'
    | 'meter10'
    | 'mahavishnu'
    | 'fripp'
    | 'weatherReport';
  /** Riff Generator: `regenerate` = fresh engine on unlocked bars; `mutate` = VRB variation operators. */
  riffOp?: 'regenerate' | 'mutate';
  /** Per-bar lock flags (length ≤ totalBars); locked bars preserved from `riffCarryForward`. */
  riffBarLocks?: boolean[];
  /** Prior riff bar snapshots from last generate (echoed on GenerateResult). */
  riffCarryForward?: import('../core/riff-generator/riffCarryForward').RiffCarryForward;
  /** Guitar–Bass Duo (Song Mode hook): C4 hook rhythm layer strength; default medium in engine when omitted. */
  c4Strength?: 'light' | 'medium' | 'strong';
  /** Song Mode C3: James Brown funk overlay (opt-in; default false). */
  songModeJamesBrownFunkOverlay?: boolean;
  /** Song Mode C5 blend strength; default medium in engine when omitted. */
  blendStrength?: 'light' | 'medium' | 'strong';
  /** Song Mode: duo conversational vs supportive posture (optional). */
  duoIntent?: 'conversational' | 'supportive';
  /**
   * V31 — Clave grid overlay (`stub` registry `presetRef`). Applied only when **`COMPOSER_OS_CLAVE_GRID_OVERLAY`**
   * is truthy in the generation process; omitted or flag off → legacy rhythm path.
   */
  claveGridOverlay?: ClaveGridSpec;
  /** Song Mode / Big Band / String Quartet: Slonimsky chromatic outside level. */
  chromaticStrength?: 'off' | 'subtle' | 'prominent';
  /** Guitar–Bass Duo / ECM chamber: regenerate bars `[startBar,endBar]` and splice into `baseMusicXml`. */
  sectionRegeneration?: SectionRegenerationParams;
  /** Phase 19: explicit musical form selection. */
  formId?: string;
  /** Song Mode: after duo MusicXML, run Python bridge for vocal lead sheet (optional). */
  includeVocalLeadSheet?: boolean;
  /** MusicXML lead-sheet input: Song Mode harmony+expression route, plus guarded phrase-expression pilot for selected non-Song presets. */
  songModeLeadSheetMusicXml?: string;
  /** MusicXML lead-sheet input for `big_band` + `string_quartet` presets (ensemble realisation handoff). */
  ensembleLeadSheetMusicXml?: string;
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
  /**
   * Preset `slonimsky_etude`: Slonimsky catalogue interval pattern id (e.g. `p_wholeTone`).
   * Clients may also send top-level `patternId`; dispatch accepts either.
   */
  slonimskyPatternId?: string;
  /** Preset `slonimsky_etude`: tonic pitch class 0–11 (default 0). */
  slonimskyKeyPc?: number;
  /** Preset `slonimsky_etude`: repeat the progression through 12 transpositions. */
  slonimskyCycleKeys?: boolean;
  /** Frank Zappa Phase B — Zappa solo lead range (MIDI inclusive; default 40–84). */
  zappaSoloMidiLow?: number;
  zappaSoloMidiHigh?: number;
  zappaSoloDensity?: 'low' | 'medium' | 'high';
  zappaSoloDissonance?: 'mild' | 'moderate' | 'extreme';
  /** Song Mode / Frank Zappa: per-bar time signatures (1-based bar keys). Omitted → all 4/4. */
  barMeterMap?: BarMeterMap;
  /** P6 — Song schema document (section `meterMap`, defaults, overrides). */
  song?: import('../core/section-architecture/sectionArchitectureTypes').Song;
  /** Frank Zappa P2 — opt-in GCE auto meter splice when no request `barMeterMap`. */
  zappaGceAutoBarMeterMapEnabled?: boolean;
  /** Frank Zappa P6 — section-meter interaction when auto meter enabled (`disrupt` default). */
  zappaGceMeterMode?: import('../core/gce/frankZappaStructuralFingerprint').ZappaGceMeterMode;
  /** Song Mode / Fripp–King Crimson: asymmetric pulse cycle — preset id or validated custom (`asymmetricPresets.ts`). */
  asymmetricRhythm?: import('../core/rhythm/asymmetricPresets').AsymmetricRhythmRequest;
  /** Optional second asymmetric preset id for polymeter LCM diagnostics (`frippKingCrimsonSlice`). */
  frippPolymeterSecondaryPresetId?: string;
  /**
   * When `true`, skip writing SD3-style drum guide MIDI/JSON next to the score. Omitted → guides are written.
   */
  skipDrumGuide?: boolean;
  /**
   * String quartet + Frank Zappa: opt out of the SQ harmony slice (per-part device receipts).
   * When omitted and songwriter is `frank_zappa`, the slice is enabled.
   */
  zappaSQHarmonySlice?: boolean;
  /**
   * Song Mode / Frank Zappa: harmonic vocabulary + density arc mode (`frankZappaSlice.ts`).
   * Omitted → engine default **`avant_rock`** when primary songwriter is **`frank_zappa`**.
   */
  frankZappaContext?: FrankZappaContextMode;
  /**
   * Frank Zappa — compositional vs blues-rock ferocity (`frankZappaSlice.ts`, `runGoldenPath.ts`).
   * Omitted → **`compositional`**.
   */
  zappaStyleMode?: ZappaStyleMode;
  zappaEraPreset?: import('../core/compositionContext').ZappaEraPreset;
  zappaPhraseCharacter?: import('../core/compositionContext').ZappaPhraseCharacter;
  zappaSymmetryBias?: import('../core/compositionContext').ZappaSymmetryBias;
  zappaChainDepth?: import('../core/compositionContext').ZappaChainDepth;
  /**
   * Song Mode / Miles Davis: modal vs quintet vs electric posture (`milesDavisSlice.ts`).
   * Omitted → engine default **`modal_1959`** when primary songwriter is **`miles_davis`**.
   */
  milesDavisContext?: MilesDavisContextMode;
  bernardHerrmannContext?: BernardHerrmannContextMode;
  johnWilliamsContext?: JohnWilliamsContextMode;
  ennioMorriconeContext?: EnnioMorriconeContextMode;
  ninoRotaContext?: NinoRotaContextMode;
  jerryGoldsmithContext?: JerryGoldsmithContextMode;
  philipGlassContext?: PhilipGlassContextMode;
  /** Song Mode / Steve Reich — pitch-field process mode (`steveReichSlice.ts`). */
  reichProcess?: SteveReichProcessMode;
  /** Song Mode / Messiaen — programme period (`messiaenSlice.ts`). Omitted → seeded resolve. */
  messiaenPeriodMode?: MessiaenPeriodMode;
  /** Song Mode / Bob Brookmeyer — early (chorus-based) vs late (through-composed) (`bobBrookmeyerSlice.ts`). */
  brookmeyerPeriodMode?: BrookmeyerPeriodMode;
  /** Song Mode / Oliver Nelson — era posture (`oliverNelsonSlice.ts`). Omitted → seeded resolve. */
  nelsonPeriodMode?: NelsonPeriodMode;
  /** Song Mode / Oliver Nelson — 12 vs 16-bar blues variant (`oliverNelsonSlice.ts`). */
  nelsonBluesFormVariant?: NelsonBluesFormVariant;
  hansZimmerContext?: HansZimmerContextMode;
  angeloBadalamentiContext?: AngeloBadalamentiContextMode;
  /**
   * Song Mode / Bartók: Mikrókosmos vs quartet vs orchestral strings posture (`bartokSlice.ts`).
   * Omitted → engine default **`mikrokosmos`** when primary songwriter is **`bartok`**.
   */
  bartokContext?: BartokContextMode;
  /**
   * Song Mode / Gershwin: Songbook AABA vs concert rhapsody vs rhythm-changes posture (`gershwinSlice.ts`).
   * Omitted → engine default **`song_aaba`** when primary songwriter is **`gershwin`**.
   */
  gershwinContext?: GershwinContextMode;
  /**
   * Song Mode / Arvo Pärt: Fur Alina vs Spiegel vs Fratres posture (`arvoPartSlice.ts`).
   * Omitted → engine default **`fur_alina`** when primary songwriter is **`arvo_part`**.
   */
  arvoPartContext?: ArvoPartContextMode;
  /** Optional tintinnabuli triad field / M–T voicing (`arvoPartSlice.ts`). */
  arvoPartTintinnabuli?: ArvoPartTintinnabuliParams;
  /**
   * Song Mode / Prince: purple_rain vs sign_o_times vs kiss posture (`princeSlice.ts`).
   * Omitted → engine default **`purple_rain`** when primary songwriter is **`prince`**.
   */
  princeContext?: PrinceContextMode;
  /**
   * Song Mode / The Beatles: Merseybeat vs Rubber Soul vs Abbey Road posture (`beatlesSlice.ts`).
   * Omitted → engine default **`merseybeat_1962`** when primary songwriter is **`beatles`**.
   */
  beatlesContext?: BeatlesContextMode;
  /**
   * Song Mode / Beatles: Verse–Verse–Bridge–Verse default vs verse–chorus secondary vs legacy VC scaffold (`songSectionPlanner.ts`).
   * Omitted → **`vv_br_v`** when primary songwriter is **`beatles`**.
   */
  beatlesFormTemplate?: BeatlesFormTemplateId;
  /**
   * Song Mode / Beatles: Lennon vs McCartney vs blended (**default**) vs neutral melodic lens (`melodyBehaviourPlanner.ts`).
   */
  beatlesMelodicLens?: BeatlesMelodicLens;
  /**
   * Song Mode / Radiohead: RH_MEL_05 acoustic vs electronic melodic generator posture (`melodyBehaviourPlanner.ts`).
   */
  radioheadMelodicContext?: 'acoustic' | 'electronic';
  /**
   * Song Mode / Fela Kuti: Zombie vs Water No Get Enemy vs Lady posture (`felaKutiSlice.ts`).
   * Omitted → engine default **`zombie_1977`** when primary songwriter is **`fela_kuti`**.
   */
  felaKutiContext?: FelaKutiContextMode;
  /**
   * Song Mode / Fela Kuti: manual percussion grid (`felaKutiSlice.ts`).
   * Omitted → posture drives **`fk:*`** feel (`zombie_1977`→afrobeat, etc.).
   */
  felaPercussionFeelOverride?: 'straight' | 'swing' | 'afrobeat';
  /**
   * V44 — optional merged harmonic (`hv:*`) + rhythm (`fk:|gr:|…`) context keys from Style Panel.
   * Forward-compatible; omitted on legacy clients.
   */
  styleGenerationContextKeys?: string[];
  /**
   * String Quartet — optional SQ rhythm engine from Style Panel (additive diagnostics on `GenerationMetadata`).
   */
  sqRhythmEngineId?:
    | 'bartok_bulgarian_aksak'
    | 'free_proportional'
    | 'baroque_dance'
    | 'reich_phasing_grid'
    | 'viennese_waltz'
    | 'jewish_klezmer';
  /**
   * String Quartet — optional pre-merged SQ VRB bundle from UI dual-arranger blend (`vrbBlend.ts`).
   * Omitted when a single arranger or none is selected.
   */
  sqArrangerVrb?: VoiceRuleBundle;
  /** Song Mode / Thad Jones (`thadJonesSlice.ts`). Default **`swing`** in engine when omitted. */
  thadPhase?: ThadJonesPhaseMode;
  /** Song Mode / Count Basie — Old vs New Testament (`basieSlice.ts`). Omitted → seeded resolve. */
  basieTestamentMode?: BasieTestamentMode;
  /** Song Mode / Joni Mitchell (`joniMitchellSlice.ts`). Default **`folk_modal`** in engine when omitted. */
  joniPhase?: JoniMitchellPhaseMode;
  /** SQ→BB workflow (`sq_to_bb` preset) — sketch / regenerate / translate / export. */
  sqToBbAction?: import('../core/counterpoint/sqToBbWorkflowTypes').SqToBbWorkflowAction;
  /** SQ→BB style profile picker: Schneider / Basie / Mingus / Brookmeyer. */
  sqToBbStyleProfile?: import('../core/counterpoint/sqToBbWorkflowTypes').SqToBbStyleProfileId;
  /** Client-held abstract line set between workflow steps. */
  sqToBbLineSet?: import('../core/counterpoint/abstractLineSet').AbstractLineSet;
  /** Phrase index for `regenerate_phrase`. */
  sqToBbPhraseIndex?: number;
  /** SQ→BB sketch length (bars). Integer 8–128. Default 32 when omitted. */
  lengthBars?: number;
  /** SQ→BB SQ harmonic voice (`null` = style-profile default; `bartok` enabled). */
  sqToBbSqComposer?: import('../core/counterpoint/sqToBbWorkflowTypes').SqToBbSqComposer;
  /**
   * Per-section SQ VRB map (canonical section label → vrbId or blend spec).
   * sectionVrbMap supersedes sqToBbSqComposer when present.
   * Keys must be canonical section labels for sectionLabelMode.
   * If absent, sqToBbSqComposer is used as a global fallback.
   */
  sectionVrbMap?: Record<string, SectionVrbMapEntry>;
  /** Canonical section label set for sectionVrbMap keys. Default `instrumental`. */
  sectionLabelMode?: import('../core/counterpoint/vrbProfiles/sqToBbSectionLabels').SqToBbSectionLabelMode;
  /** SQ→BB Messiaen pitch-field — mode of limited transposition (1–7). Default 2 (octatonic). */
  messiaenModeId?: import('../core/harmony/pitchFieldSpineTypes').MessiaenModeId;
  /**
   * SQ→BB optional era hint. Omit, `null`, or blank → no `generationMetadata.era` tag.
   * Do not use `stylePairing.era` for this preset.
   */
  sqToBbEra?: string | null;
  /** SQ→BB: raw user chord timeline (Session 1 state wire; parsing Session 2). */
  userChordInput?: string | null;
  /** SQ→BB UI: generate internal harmony vs use `userChordInput`. */
  sqToBbChordSourceMode?: 'generate_harmony' | 'use_user_chords' | 'midi';
  /** SQ→BB: base64-encoded `.mid` bytes; server extracts pipe-separated chords. */
  midiChordInput?: string;
  /** SQ→BB: override BPM for MIDI chord extraction (optional). */
  midiChordBpm?: number;
  /** SQ→BB meso quantizer density (`sparse` | `medium` | `dense`). Default `medium`. */
  sqToBbDensity?: import('../core/counterpoint/sqToBbWorkflowTypes').SqToBbDensity;
  /** SQ→BB Light Touch — cap doublings, thin inner voices (default false). */
  bbLightTouch?: boolean;
  /** SQ→BB: how to resolve N chords < M bars (`repeat` | `fill_internal`). */
  sqToBbChordMismatchResolution?: import('../core/counterpoint/parseUserChordInput').SqToBbChordMismatchResolution;
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
  /** Big Band / String Quartet: Chromatic Strength → Slonimsky receipt lines (when request set user control). */
  ensembleSlonimskyReceipt?: string[];
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
  /** V65 P4 — opt-in groove scaffold receipt/diagnostics. */
  grooveScaffoldReceipt?: GenerationMetadata['grooveScaffoldReceipt'];
  grooveScaffoldReceipts?: GenerationMetadata['grooveScaffoldReceipts'];
  grooveScaffoldDiagnostics?: GenerationMetadata['grooveScaffoldDiagnostics'];
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
  radioheadVoiceLeadingGrammarReceipts?: GenerationMetadata['radioheadVoiceLeadingGrammarReceipts'];
  radioheadMelodicGrammarReceipts?: GenerationMetadata['radioheadMelodicGrammarReceipts'];
  radioheadMelodicContext?: GenerationMetadata['radioheadMelodicContext'];
  radioheadRhythmGrammarReceipts?: GenerationMetadata['radioheadRhythmGrammarReceipts'];
  radioheadRhythmEarlyPeriodBackbeat?: GenerationMetadata['radioheadRhythmEarlyPeriodBackbeat'];
  radioheadRhythmAsymmetricFeaturesEligible?: GenerationMetadata['radioheadRhythmAsymmetricFeaturesEligible'];
  radioheadOrchestrationGrammarReceipts?: GenerationMetadata['radioheadOrchestrationGrammarReceipts'];
  radioheadOrchestrationPalette?: GenerationMetadata['radioheadOrchestrationPalette'];
  radioheadMicrotonalGuitarEligible?: GenerationMetadata['radioheadMicrotonalGuitarEligible'];
  radioheadFingerprintReceipts?: GenerationMetadata['radioheadFingerprintReceipts'];
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
  wayneShorterHarmFingerprintReceipts?: GenerationMetadata['wayneShorterHarmFingerprintReceipts'];
  wayneShorterMelFingerprintReceipts?: GenerationMetadata['wayneShorterMelFingerprintReceipts'];
  wayneShorterRhythmFingerprintReceipts?: GenerationMetadata['wayneShorterRhythmFingerprintReceipts'];
  wayneShorterFormFingerprintReceipts?: GenerationMetadata['wayneShorterFormFingerprintReceipts'];
  wayneShorterFpFingerprintReceipts?: GenerationMetadata['wayneShorterFpFingerprintReceipts'];
  wayneShorterHarmonicGrammarReceipts?: GenerationMetadata['wayneShorterHarmonicGrammarReceipts'];
  wayneShorterMelodicGrammarReceipts?: GenerationMetadata['wayneShorterMelodicGrammarReceipts'];
  wayneShorterRhythmGrammarReceipts?: GenerationMetadata['wayneShorterRhythmGrammarReceipts'];
  wayneShorterFormGrammarReceipts?: GenerationMetadata['wayneShorterFormGrammarReceipts'];
  wayneShorterFingerprintReceipts?: GenerationMetadata['wayneShorterFingerprintReceipts'];
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
  /** Debussy (impressionist harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  debussyDiagnostics?: GenerationMetadata['debussyDiagnostics'];
  debussyDeviceReceipts?: GenerationMetadata['debussyDeviceReceipts'];
  debussySliceReceipt?: GenerationMetadata['debussySliceReceipt'];
  debussyEffectiveHarmonyBars?: GenerationMetadata['debussyEffectiveHarmonyBars'];
  debussyAntiElaborationGuards?: GenerationMetadata['debussyAntiElaborationGuards'];
  debussyArabesqueBars?: GenerationMetadata['debussyArabesqueBars'];
  debussyArabesqueMotifByBar?: GenerationMetadata['debussyArabesqueMotifByBar'];
  debussyProgramPeriod?: GenerationMetadata['debussyProgramPeriod'];
  debussyFormReceipts?: GenerationMetadata['debussyFormReceipts'];
  debussyOrchestrationReceipts?: GenerationMetadata['debussyOrchestrationReceipts'];
  debussyVocalColourOrchestral?: GenerationMetadata['debussyVocalColourOrchestral'];
  debussyFingerprintReceipts?: GenerationMetadata['debussyFingerprintReceipts'];
  bernardHerrmannContext?: GenerationMetadata['bernardHerrmannContext'];
  bernardHerrmannDiagnostics?: GenerationMetadata['bernardHerrmannDiagnostics'];
  bernardHerrmannDeviceReceipts?: GenerationMetadata['bernardHerrmannDeviceReceipts'];
  bernardHerrmannSliceReceipt?: GenerationMetadata['bernardHerrmannSliceReceipt'];
  bernardHerrmannEffectiveHarmonyBars?: GenerationMetadata['bernardHerrmannEffectiveHarmonyBars'];
  johnWilliamsContext?: GenerationMetadata['johnWilliamsContext'];
  johnWilliamsDiagnostics?: GenerationMetadata['johnWilliamsDiagnostics'];
  johnWilliamsDeviceReceipts?: GenerationMetadata['johnWilliamsDeviceReceipts'];
  johnWilliamsSliceReceipt?: GenerationMetadata['johnWilliamsSliceReceipt'];
  johnWilliamsEffectiveHarmonyBars?: GenerationMetadata['johnWilliamsEffectiveHarmonyBars'];
  ennioMorriconeContext?: GenerationMetadata['ennioMorriconeContext'];
  ennioMorriconeDiagnostics?: GenerationMetadata['ennioMorriconeDiagnostics'];
  ennioMorriconeDeviceReceipts?: GenerationMetadata['ennioMorriconeDeviceReceipts'];
  ennioMorriconeSliceReceipt?: GenerationMetadata['ennioMorriconeSliceReceipt'];
  ennioMorriconeEffectiveHarmonyBars?: GenerationMetadata['ennioMorriconeEffectiveHarmonyBars'];
  ninoRotaContext?: GenerationMetadata['ninoRotaContext'];
  ninoRotaDiagnostics?: GenerationMetadata['ninoRotaDiagnostics'];
  ninoRotaDeviceReceipts?: GenerationMetadata['ninoRotaDeviceReceipts'];
  ninoRotaSliceReceipt?: GenerationMetadata['ninoRotaSliceReceipt'];
  ninoRotaEffectiveHarmonyBars?: GenerationMetadata['ninoRotaEffectiveHarmonyBars'];
  jerryGoldsmithContext?: GenerationMetadata['jerryGoldsmithContext'];
  jerryGoldsmithDiagnostics?: GenerationMetadata['jerryGoldsmithDiagnostics'];
  jerryGoldsmithDeviceReceipts?: GenerationMetadata['jerryGoldsmithDeviceReceipts'];
  jerryGoldsmithSliceReceipt?: GenerationMetadata['jerryGoldsmithSliceReceipt'];
  jerryGoldsmithEffectiveHarmonyBars?: GenerationMetadata['jerryGoldsmithEffectiveHarmonyBars'];
  philipGlassContext?: GenerationMetadata['philipGlassContext'];
  philipGlassDiagnostics?: GenerationMetadata['philipGlassDiagnostics'];
  philipGlassDeviceReceipts?: GenerationMetadata['philipGlassDeviceReceipts'];
  philipGlassSliceReceipt?: GenerationMetadata['philipGlassSliceReceipt'];
  philipGlassEffectiveHarmonyBars?: GenerationMetadata['philipGlassEffectiveHarmonyBars'];
  reichProcess?: GenerationMetadata['reichProcess'];
  reichResolvedProcess?: GenerationMetadata['reichResolvedProcess'];
  steveReichDiagnostics?: GenerationMetadata['steveReichDiagnostics'];
  steveReichDeviceReceipts?: GenerationMetadata['steveReichDeviceReceipts'];
  steveReichSliceReceipt?: GenerationMetadata['steveReichSliceReceipt'];
  steveReichEffectiveHarmonyBars?: GenerationMetadata['steveReichEffectiveHarmonyBars'];
  steveReichHarmonicRhythmBars?: GenerationMetadata['steveReichHarmonicRhythmBars'];
  steveReichPulseGridDensity?: GenerationMetadata['steveReichPulseGridDensity'];
  messiaenPeriodMode?: GenerationMetadata['messiaenPeriodMode'];
  messiaenPeriodModeResolved?: GenerationMetadata['messiaenPeriodModeResolved'];
  periodMode?: GenerationMetadata['periodMode'];
  activeMode?: GenerationMetadata['activeMode'];
  colourTag?: GenerationMetadata['colourTag'];
  birdsongSpecies?: GenerationMetadata['birdsongSpecies'];
  messiaenHarmonicRhythmMinBars?: GenerationMetadata['messiaenHarmonicRhythmMinBars'];
  messiaenDiagnostics?: GenerationMetadata['messiaenDiagnostics'];
  messiaenDeviceReceipts?: GenerationMetadata['messiaenDeviceReceipts'];
  messiaenSliceReceipt?: GenerationMetadata['messiaenSliceReceipt'];
  messiaenEffectiveHarmonyBars?: GenerationMetadata['messiaenEffectiveHarmonyBars'];
  hansZimmerContext?: GenerationMetadata['hansZimmerContext'];
  hansZimmerDiagnostics?: GenerationMetadata['hansZimmerDiagnostics'];
  hansZimmerDeviceReceipts?: GenerationMetadata['hansZimmerDeviceReceipts'];
  hansZimmerSliceReceipt?: GenerationMetadata['hansZimmerSliceReceipt'];
  hansZimmerEffectiveHarmonyBars?: GenerationMetadata['hansZimmerEffectiveHarmonyBars'];
  angeloBadalamentiContext?: GenerationMetadata['angeloBadalamentiContext'];
  angeloBadalamentiDiagnostics?: GenerationMetadata['angeloBadalamentiDiagnostics'];
  angeloBadalamentiDeviceReceipts?: GenerationMetadata['angeloBadalamentiDeviceReceipts'];
  angeloBadalamentiSliceReceipt?: GenerationMetadata['angeloBadalamentiSliceReceipt'];
  angeloBadalamentiEffectiveHarmonyBars?: GenerationMetadata['angeloBadalamentiEffectiveHarmonyBars'];
  /** Duke Ellington (orchestral harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  dukeEllingtonDiagnostics?: GenerationMetadata['dukeEllingtonDiagnostics'];
  dukeEllingtonDeviceReceipts?: GenerationMetadata['dukeEllingtonDeviceReceipts'];
  dukeEllingtonSliceReceipt?: GenerationMetadata['dukeEllingtonSliceReceipt'];
  dukeEllingtonEffectiveHarmonyBars?: GenerationMetadata['dukeEllingtonEffectiveHarmonyBars'];
  dukeEllingtonAntiElaborationGuards?: GenerationMetadata['dukeEllingtonAntiElaborationGuards'];
  ellingtonCallResponseMap?: GenerationMetadata['ellingtonCallResponseMap'];
  ellingtonShoutBars?: GenerationMetadata['ellingtonShoutBars'];
  /** Maria Schneider (modal orchestral harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  mariaSchneiderDiagnostics?: GenerationMetadata['mariaSchneiderDiagnostics'];
  mariaSchneiderDeviceReceipts?: GenerationMetadata['mariaSchneiderDeviceReceipts'];
  mariaSchneiderSliceReceipt?: GenerationMetadata['mariaSchneiderSliceReceipt'];
  mariaSchneiderEffectiveHarmonyBars?: GenerationMetadata['mariaSchneiderEffectiveHarmonyBars'];
  mariaSchneiderAntiElaborationGuards?: GenerationMetadata['mariaSchneiderAntiElaborationGuards'];
  schneiderPedalBars?: GenerationMetadata['schneiderPedalBars'];
  schneiderColorStackBars?: GenerationMetadata['schneiderColorStackBars'];
  thadPhase?: GenerationMetadata['thadPhase'];
  thadResolvedPhase?: GenerationMetadata['thadResolvedPhase'];
  thadJonesDiagnostics?: GenerationMetadata['thadJonesDiagnostics'];
  thadJonesDeviceReceipts?: GenerationMetadata['thadJonesDeviceReceipts'];
  thadJonesSliceReceipt?: GenerationMetadata['thadJonesSliceReceipt'];
  thadJonesEffectiveHarmonyBars?: GenerationMetadata['thadJonesEffectiveHarmonyBars'];
  thadJonesShoutBars?: GenerationMetadata['thadJonesShoutBars'];
  basieTestamentMode?: GenerationMetadata['basieTestamentMode'];
  basieResolvedTestament?: GenerationMetadata['basieResolvedTestament'];
  basieDiagnostics?: GenerationMetadata['basieDiagnostics'];
  basieDeviceReceipts?: GenerationMetadata['basieDeviceReceipts'];
  basieSliceReceipt?: GenerationMetadata['basieSliceReceipt'];
  basieEffectiveHarmonyBars?: GenerationMetadata['basieEffectiveHarmonyBars'];
  basieShoutBars?: GenerationMetadata['basieShoutBars'];
  basieEpisodePlan?: GenerationMetadata['basieEpisodePlan'];
  brookmeyerPeriodMode?: GenerationMetadata['brookmeyerPeriodMode'];
  brookmeyerPeriodModeResolved?: GenerationMetadata['brookmeyerPeriodModeResolved'];
  activePitchModule?: GenerationMetadata['activePitchModule'];
  brookmeyerSoloPermitted?: GenerationMetadata['brookmeyerSoloPermitted'];
  brookmeyerEpisodePlanSummary?: GenerationMetadata['brookmeyerEpisodePlanSummary'];
  bobBrookmeyerDiagnostics?: GenerationMetadata['bobBrookmeyerDiagnostics'];
  bobBrookmeyerDeviceReceipts?: GenerationMetadata['bobBrookmeyerDeviceReceipts'];
  bobBrookmeyerSliceReceipt?: GenerationMetadata['bobBrookmeyerSliceReceipt'];
  bobBrookmeyerEffectiveHarmonyBars?: GenerationMetadata['bobBrookmeyerEffectiveHarmonyBars'];
  lineFirstHierarchy?: GenerationMetadata['lineFirstHierarchy'];
  contrapuntalLineCount?: GenerationMetadata['contrapuntalLineCount'];
  nelsonPeriodMode?: GenerationMetadata['nelsonPeriodMode'];
  nelsonPeriodModeResolved?: GenerationMetadata['nelsonPeriodModeResolved'];
  nelsonBluesFormVariant?: GenerationMetadata['nelsonBluesFormVariant'];
  nelsonBluesFormVariantResolved?: GenerationMetadata['nelsonBluesFormVariantResolved'];
  activePedal?: GenerationMetadata['activePedal'];
  upperModalChords?: GenerationMetadata['upperModalChords'];
  nelsonTwoLayerForm?: GenerationMetadata['nelsonTwoLayerForm'];
  oliverNelsonEpisodePlanSummary?: GenerationMetadata['oliverNelsonEpisodePlanSummary'];
  joniPhase?: GenerationMetadata['joniPhase'];
  joniResolvedPhase?: GenerationMetadata['joniResolvedPhase'];
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
  /** Antônio Carlos Jobim (bossa harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  jobimDiagnostics?: GenerationMetadata['jobimDiagnostics'];
  jobimDeviceReceipts?: GenerationMetadata['jobimDeviceReceipts'];
  jobimSliceReceipt?: GenerationMetadata['jobimSliceReceipt'];
  jobimEffectiveHarmonyBars?: GenerationMetadata['jobimEffectiveHarmonyBars'];
  jobimAntiElaborationGuards?: GenerationMetadata['jobimAntiElaborationGuards'];
  /** Herbie Hancock (quartal/modal harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  herbieHancockDiagnostics?: GenerationMetadata['herbieHancockDiagnostics'];
  herbieHancockDeviceReceipts?: GenerationMetadata['herbieHancockDeviceReceipts'];
  herbieHancockSliceReceipt?: GenerationMetadata['herbieHancockSliceReceipt'];
  herbieHancockEffectiveHarmonyBars?: GenerationMetadata['herbieHancockEffectiveHarmonyBars'];
  herbieHancockAntiElaborationGuards?: GenerationMetadata['herbieHancockAntiElaborationGuards'];
  hancockPhase?: GenerationMetadata['hancockPhase'];
  hancockResolvedPhase?: GenerationMetadata['hancockResolvedPhase'];
  /** Stephen Sondheim (dramatic theatre harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  sondheimDiagnostics?: GenerationMetadata['sondheimDiagnostics'];
  sondheimDeviceReceipts?: GenerationMetadata['sondheimDeviceReceipts'];
  sondheimSliceReceipt?: GenerationMetadata['sondheimSliceReceipt'];
  sondheimEffectiveHarmonyBars?: GenerationMetadata['sondheimEffectiveHarmonyBars'];
  sondheimAntiElaborationGuards?: GenerationMetadata['sondheimAntiElaborationGuards'];
  /** Kate Bush (tonal-modal texture) slice — diagnostics / receipts (Song Mode manifest echo). */
  kateBushDiagnostics?: GenerationMetadata['kateBushDiagnostics'];
  kateBushDeviceReceipts?: GenerationMetadata['kateBushDeviceReceipts'];
  kateBushSliceReceipt?: GenerationMetadata['kateBushSliceReceipt'];
  kateBushEffectiveHarmonyBars?: GenerationMetadata['kateBushEffectiveHarmonyBars'];
  kateBushAntiElaborationGuards?: GenerationMetadata['kateBushAntiElaborationGuards'];
  /** Thelonious Monk (angular harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  theloniousMonkDiagnostics?: GenerationMetadata['theloniousMonkDiagnostics'];
  theloniousMonkDeviceReceipts?: GenerationMetadata['theloniousMonkDeviceReceipts'];
  theloniousMonkSliceReceipt?: GenerationMetadata['theloniousMonkSliceReceipt'];
  theloniousMonkEffectiveHarmonyBars?: GenerationMetadata['theloniousMonkEffectiveHarmonyBars'];
  theloniousMonkAntiElaborationGuards?: GenerationMetadata['theloniousMonkAntiElaborationGuards'];
  /** John Coltrane (three-tonic cycle) slice — diagnostics / receipts (Song Mode manifest echo). */
  johnColtraneDiagnostics?: GenerationMetadata['johnColtraneDiagnostics'];
  johnColtraneDeviceReceipts?: GenerationMetadata['johnColtraneDeviceReceipts'];
  johnColtraneSliceReceipt?: GenerationMetadata['johnColtraneSliceReceipt'];
  johnColtraneEffectiveHarmonyBars?: GenerationMetadata['johnColtraneEffectiveHarmonyBars'];
  mccoyTynerDiagnostics?: GenerationMetadata['mccoyTynerDiagnostics'];
  mccoyTynerDeviceReceipts?: GenerationMetadata['mccoyTynerDeviceReceipts'];
  mccoyTynerSliceReceipt?: GenerationMetadata['mccoyTynerSliceReceipt'];
  mccoyTynerEffectiveHarmonyBars?: GenerationMetadata['mccoyTynerEffectiveHarmonyBars'];
  coltranePhase?: GenerationMetadata['coltranePhase'];
  coltraneHarmonicDensity?: GenerationMetadata['coltraneHarmonicDensity'];
  /** Andrew Hill (angular non-functional harmony) slice — diagnostics / receipts (Song Mode manifest echo). */
  andrewHillDiagnostics?: GenerationMetadata['andrewHillDiagnostics'];
  andrewHillDeviceReceipts?: GenerationMetadata['andrewHillDeviceReceipts'];
  andrewHillSliceReceipt?: GenerationMetadata['andrewHillSliceReceipt'];
  andrewHillEffectiveHarmonyBars?: GenerationMetadata['andrewHillEffectiveHarmonyBars'];
  andrewHillAntiElaborationGuards?: GenerationMetadata['andrewHillAntiElaborationGuards'];
  /** Jim Hall (interval-first guitar / shell+one) slice — diagnostics / receipts (Song Mode manifest echo). */
  jimHallDiagnostics?: GenerationMetadata['jimHallDiagnostics'];
  jimHallDeviceReceipts?: GenerationMetadata['jimHallDeviceReceipts'];
  jimHallSliceReceipt?: GenerationMetadata['jimHallSliceReceipt'];
  jimHallEffectiveHarmonyBars?: GenerationMetadata['jimHallEffectiveHarmonyBars'];
  jimHallMode?: GenerationMetadata['jimHallMode'];
  jimHallResolvedMode?: GenerationMetadata['jimHallResolvedMode'];
  jimHallVoicingCap?: GenerationMetadata['jimHallVoicingCap'];
  frankZappaDiagnostics?: GenerationMetadata['frankZappaDiagnostics'];
  frankZappaDeviceReceipts?: GenerationMetadata['frankZappaDeviceReceipts'];
  frankZappaSliceReceipt?: GenerationMetadata['frankZappaSliceReceipt'];
  frankZappaEffectiveHarmonyBars?: GenerationMetadata['frankZappaEffectiveHarmonyBars'];
  frankZappaAntiElaborationGuards?: GenerationMetadata['frankZappaAntiElaborationGuards'];
  frankZappaEligibilityStats?: GenerationMetadata['frankZappaEligibilityStats'];
}

/** POST /api/melodic-variation-pack — minimal note (HTTP contract calls this NoteEvent: pitch MIDI + duration in quarters). */
export type MelodicVariationPackNoteEvent = {
  pitch: number;
  duration: number;
};

export type MelodicVariationPackRequest = {
  melody: MelodicVariationPackNoteEvent[];
  chords: string[];
  variationCount: number;
  songwriterId: string;
};

export type MelodicVariationPackSuccessResponse = {
  success: true;
  /** Stub duo score + {@link scoreResultForGce}; arrangement pillar uses bass-rests placeholder. */
  scoringMode: 'melody-only';
  melody: MelodicVariationPackNoteEvent[];
  variations: Array<{
    melody: MelodicVariationPackNoteEvent[];
    gceScore: number;
    transform: MotifTransform;
  }>;
};

export type MelodicVariationPackResponse =
  | MelodicVariationPackSuccessResponse
  | { success: false; error: string };
