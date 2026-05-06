/**
 * Composer OS V2 — CompositionContext
 * Non-negotiable shared contract for all core systems and future style modules.
 */

import type { MotifState } from './primitives/motifTypes';
import type { PhrasePlan } from './primitives/phraseTypes';
import type { HarmonyPlan } from './primitives/harmonyTypes';
import type { RegisterMap } from './primitives/registerTypes';
import type { DensityCurve } from './primitives/densityTypes';
import type { FeelConfig } from './rhythm-engine/rhythmTypes';
import type { InstrumentProfile } from './instrument-profiles/instrumentProfileTypes';
import type { ReleaseReadinessResult } from './readiness/readinessTypes';
import type { MxReadinessResult } from './readiness/mxReadinessScorer';
import type { ValidationResults } from './conductor/conductorTypes';
import type { EcmChamberMode, EcmGenerationMetrics } from './ecm/ecmChamberTypes';
import type { KeySignatureReceiptMetadata } from './harmony/keyInferenceTypes';
import type { HarmonyBarContract } from './harmony/harmonyBarContract';
import type { CoreMotif, Motif } from './motif/motifEngineTypes';
import type { MotifShape } from './motif/motifShape';
import type { StyleProfile } from './song-mode/songModeStyleProfile';
import type {
  SongModeSectionBehaviourDescriptor,
  SongModeSectionShapingDiagnosticsV1,
} from './song-mode/songModeSectionTypes';
import type { AuthorRuleId, ClassicalSongRuleId, SongwriterRuleId } from './song-mode/songwritingResearchTypes';
import type { RhythmIntentControl, RhythmIntentResolvedPhrase } from './rhythmIntentTypes';
import type { GuitarVoice2PolyphonyDiagnostics } from './goldenPath/guitarVoice2PolyphonyDiagnostics';
import type { EnsembleWybleRoleMap } from './wyble/wybleVoiceLayoutTypes';
import type { WybleConsumptionReceipt } from './wyble/wybleConsumptionReceipt';
import type { AlternateGuitarTuningResolved } from './song-mode/alternateGuitarTunings';
import type {
  MotifAuthorityLevel,
  MotifAuthorityPlan,
  MotifDevelopmentSummary,
  MotifFingerprint,
} from './motif/motifAuthorityV1';
import type { BarMeterMap } from './rhythm/barMeterTypes';
import type { SoloLine, ZappaImitationReceipt, ZappasoloOptions } from './solo/soloTypes';
import type { HarmonyContext } from './harmony/harmonyContext';

/** Frank Zappa Song Mode slice — harmonic vocabulary / density arc mode (metadata). */
export type FrankZappaContextMode = 'avant_rock' | 'big_band' | 'futuristic_jazz';

/** Miles Davis Song Mode slice — era / ensemble harmonic posture (`milesDavisSlice.ts`). Default **`modal_1959`** when omitted. */
export type MilesDavisContextMode = 'modal_1959' | 'quintet_1965' | 'electric_1970';

/** Béla Bartók Song Mode slice — Mikrókosmos vs quartet vs orchestral strings posture (`bartokSlice.ts`). Default **`mikrokosmos`** when omitted. */
export type BartokContextMode = 'mikrokosmos' | 'string_quartet' | 'music_for_strings';

/** George Gershwin Song Mode slice — Songbook AABA vs concert rhapsody vs rhythm-changes posture (`gershwinSlice.ts`). Default **`song_aaba`** when omitted. */
export type GershwinContextMode = 'song_aaba' | 'rhapsody' | 'rhythm_changes';

/** Arvo Pärt Song Mode slice — Fur Alina vs Spiegel im Spiegel vs Fratres posture (`arvoPartSlice.ts`). Default **`fur_alina`** when omitted. */
export type ArvoPartContextMode = 'fur_alina' | 'spiegel' | 'fratres';

/** Erik Satie Song Mode slice — Gymnopédie vs Gnossienne vs cabaret “Piège” posture (`satieSlice.ts`). Default **`gymnopedie`** when omitted. */
export type SatieContextMode = 'gymnopedie' | 'gnossienne' | 'poire';

/** Prince Song Mode slice — Minneapolis funk/soul extended harmony posture (`princeSlice.ts`). Default **`purple_rain`** when omitted. */
export type PrinceContextMode = 'purple_rain' | 'sign_o_times' | 'kiss';

/** The Beatles Song Mode slice — Merseybeat vs Rubber Soul vs Abbey Road posture (`beatlesSlice.ts`). Default **`merseybeat_1962`** when omitted. */
export type BeatlesContextMode = 'merseybeat_1962' | 'rubber_soul_1965' | 'abbey_road_1968';

/** Form map: section labels and bar ranges. */
export interface FormMap {
  sections: Array<{ label: string; startBar: number; length: number }>;
  totalBars: number;
}

/** Chord symbol plan: chord symbols per bar/segment. */
export interface ChordSymbolPlan {
  segments: Array<{ chord: string; startBar: number; bars: number }>;
  totalBars: number;
}

/** Rehearsal mark plan. */
export interface RehearsalMarkPlan {
  marks: Array<{ label: string; bar: number }>;
}

/** Runtime trace of which harmony layer produced data (enable with COMPOSER_OS_HARMONY_TRACE=1). */
export type HarmonyPipelineStage =
  | 'ui_input'
  | 'parse'
  | 'composition_context'
  | 'score_builder'
  | 'musicxml_export';

export interface HarmonyPipelineStageRecord {
  stage: HarmonyPipelineStage;
  detail: string;
}

export type ImportHarmonyMode = 'free_harmony' | 'lock_harmony' | 'blend_harmony';

export type ImportHarmonyLockFallbackReason =
  | 'mode_not_lock'
  | 'no_musicxml_input'
  | 'musicxml_parse_failed'
  | 'timeline_missing'
  | 'timeline_empty'
  | 'timeline_unusable'
  | 'not_song_mode'
  | 'free_harmony_requested';

/** LeadSheet MusicXML adapt pipeline position (Stage 1 telemetry; not a user-facing mode). */
export type ImportHarmonyLeadSheetPipelineStage =
  | 'skipped'
  | 'musicxml_unpack_failed'
  | 'musicxml_import_failed'
  | 'adapt_failed'
  | 'adapt_ok';

/** Coarse reason when the adapt pipeline does not reach `adapt_ok` (Stage 1). */
export type ImportHarmonyLeadSheetAdaptDetail =
  | 'musicxml_unpack_failed'
  | 'musicxml_import_failed'
  | 'adapt_no_chord_events'
  | 'adapt_other';

/** Generation metadata. */
export interface GenerationMetadata {
  generatedAt: string;
  /** Optional era hint (e.g. style pairing); set from `RunGoldenPathOptions.era` for downstream use. */
  era?: string;
  durationMs?: number;
  steps?: string[];
  /** Guitar–Bass Duo: built-in cycle vs user progression text */
  harmonySource?: 'builtin' | 'custom';
  /** User pasted progression: do not normalize or substitute harmony (Song Mode / locked long-form). */
  customHarmonyLocked?: boolean;
  /** Short readable summary when `harmonySource` is custom */
  customChordProgressionSummary?: string;
  /** UI / request: built-in vs custom progression mode */
  progressionMode?: 'builtin' | 'custom';
  /** Raw user `chordProgressionText` when custom mode was requested (success or parse failure) */
  chordProgressionInputRaw?: string;
  /** Parsed one chord per bar when custom harmony was applied successfully */
  parsedCustomProgressionBars?: string[];
  /** True after written MusicXML harmony blocks match `lockedHarmonyBarsRaw` bar-for-bar (release gate). */
  customHarmonyMusicXmlTruthPassed?: boolean;
  /** V3.6b — Receipt echo of `harmonySource` for clarity (chord source vs style grammar). */
  harmonySourceUsed?: 'builtin' | 'custom';
  /** V3.6b — Honest label: internal duo engine uses Barry Harris–derived rules by default; not a claim the user picked BH. */
  styleGrammarLabel?: string;
  /** V3.6b — Primary style module id driving gates (technical; often engine default `barry_harris`). */
  styleStackPrimaryModuleId?: string;
  /** V3.6b — Registry display name for primary module. */
  styleStackPrimaryDisplayName?: string;
  /** V3.6b — Human-readable active stack (primary → secondary → colour) for receipts. */
  userSelectedStyleDisplayNames?: string[];
  /** V3.6b — True when primary module is not the duo default primary (`barry_harris`). */
  userExplicitPrimaryStyle?: boolean;
  /** Guitar–Bass Duo family: receipt line for distinct playback modes (e.g. single-line duo). */
  duoModeReceiptLabel?: string;
  /** Phase 18.2B.1 — Voice-2 polyphony snapshot after inject + stabilise (guitar_bass_duo polyphony path). */
  voice2PolyphonyDiagnostics?: GuitarVoice2PolyphonyDiagnostics;
  /**
   * Portable Wyble: abstract 3-role → score part targets for duo / SQ / BB (optional; duo golden path + SQ/BB ensemble score builds consume their static maps in narrow ways).
   */
  wybleVoiceLayout?: EnsembleWybleRoleMap;
  /** Receipt: which portable Wyble consumption path ran (debug; does not change MusicXML structure). */
  wybleConsumptionReceipt?: WybleConsumptionReceipt;
  /** Feature flag: Motif Authority V1 gated vertical slice (song_mode_* + guitar_bass_duo). */
  motifAuthorityV1?: boolean;
  /** Explicit motif policy level for bounded pilot paths (`off`/`soft`/`strong`). */
  motifAuthorityLevel?: MotifAuthorityLevel;
  /** Motif Authority V1 phrase contract + thresholds. */
  motifPlan?: MotifAuthorityPlan;
  /** Opening phrase fingerprint captured for V1 diagnostics. */
  motifFingerprint?: MotifFingerprint;
  /** Development phrase classification (copy/variation/drifted). */
  variationType?: 'copy' | 'variation' | 'drifted';
  /** Return phrase similarity score (A vs A'). */
  returnSimilarity?: number;
  /** Final motif authority score used for V1 gating. */
  motifAuthorityScore?: number;
  /** Penalty when development/return is too close to literal copy. */
  literalCopyPenalty?: number;
  /** Penalty when development/return drifts too far from motif identity. */
  overDriftPenalty?: number;
  /** Pilot-path motif diagnostics for Phase 1 inspectability. */
  motifDevelopmentSummary?: MotifDevelopmentSummary;
  /** True if user requested custom but parsing failed — no score was produced with that harmony */
  chordProgressionParseFailed?: boolean;
  /** True only if built-in harmony was used despite a valid custom request (must stay false) */
  builtInHarmonyFallbackOccurred?: boolean;
  /** ECM Chamber preset only */
  ecmMode?: EcmChamberMode;
  ecmMetrics?: EcmGenerationMetrics;
  /** Guitar–Bass Duo: opt-in 32-bar long-form route (V4.0) */
  longFormDuo?: boolean;
  modulationPlanActive?: boolean;
  /** Explicit bar count when long-form or extended forms are used */
  totalBars?: number;
  /**
   * Phase A — optional per-bar time signatures (1-based bar indices).
   * When absent, export + quantiser behave as all measures 4/4.
   */
  barMeterMap?: BarMeterMap;
  /** Phase B — Zappa solo generator output (`generateZappaSolo`); optional melodic layer metadata. */
  soloLine?: SoloLine;
  /** Short manifest echo for Zappa solo receipt flags. */
  zappaSoloDigest?: string;
  /** Resolved numeric options for {@link generateZappaSolo} (UI tiers → engine; optional). */
  zappaSoloOptions?: ZappasoloOptions;
  /** V3.4 — key signature inference / export metadata (additive). */
  keySignatureReceipt?: KeySignatureReceiptMetadata;
  /** Optional bar-by-bar contract: display + semantics for locked long-form / Song Mode. */
  harmonyPipelineTrace?: HarmonyPipelineStageRecord[];
  /** Song Mode: generate hook-first guitar identity (bar 1 statement, bar 25 return); melody layer only. */
  songModeHookFirstIdentity?: boolean;
  /** Song Mode: compact hook cell (contour dirs + variation dimension) for receipts / debugging. */
  songModeHookCellSummary?: string;
  /** Song Mode: 1–3 abstract core motifs (interval/rhythm/contour/tags). */
  songModeCoreMotifs?: CoreMotif[];
  /** Song Mode: motif count (Motif Engine v2 uses 1). */
  songModeMotifCount?: 1 | 2 | 3;
  /** Song Mode Motif v2: canonical primary motif for validation / receipts. */
  songModePrimaryMotif?: Motif;
  /** Song Mode hook: MotifShape from bar 1 statement (validator alignment). */
  songModeStatementMotifShape?: MotifShape;
  /** Song Mode hook: expected return MotifShape (same pitch identity as statement; return attack grid). */
  songModeReturnMotifShapeExpected?: MotifShape;
  /** Song Mode: Style Engine profile (request echo + Style Engine pass). */
  styleProfile?: StyleProfile;
  /** Song Mode v1 (Indie Art Pop): resolved optional alternate tuning envelope. */
  alternateGuitarTuning?: AlternateGuitarTuningResolved;
  /** Song Mode v1: tiny tuning nudges (bounded). */
  altTuningDroneTendency?: number;
  altTuningRegisterBias?: 'low' | 'neutral' | 'high';
  altTuningSplitRoleActive?: boolean;
  /** Song Mode STYLE_INDIE_ART_POP Phase A: texture / role / phrase-edge pass ran on the duo score. */
  indieArtPopPhaseAApplied?: boolean;
  /**
   * Indie dual-electric (`guitar_2`): peak voice-1 single-note count in any measure that also contains a voice-2 comp
   * `ChordEvent`, measured immediately after `thinGuitar2Voice1InChordMeasures` (notation expand may emit more atoms later).
   */
  indieGuitar2ThinVoice1Peak?: number;
  /**
   * Song Mode STYLE_INDIE_ART_POP — reserved mid/high guitar windows (bar indices) for a future string layer.
   * Metadata only in Phase A; no string parts are generated yet.
   */
  indieArtPopStringsPlaceholderBars?: number[];
  /** Song Mode: short honest lines for receipts when a style surface applies real metadata nudges (see `songModeStyleSurface.ts`). */
  songModeStyleSurfaceNotes?: string[];
  /** Song Mode Phase C1: skip rhythm overlay (regression / A–B); when unset, overlay runs when Song Mode is active. */
  songModeRhythmOverlayDisabled?: boolean;
  /** Song Mode: Stable / Balanced / Surprise — scales Phase C2 phrase intent only (from request). */
  songModeRhythmStrength?: 'stable' | 'balanced' | 'surprise';
  /** Song Mode Phase C3: opt-in James Brown funk overlay (not in default C1 pool). */
  songModeJamesBrownFunkOverlay?: boolean;
  /** True after Phase C3 James Brown pass ran on the score. */
  songModeJamesBrownFunkApplied?: boolean;
  /** Phase C3 receipt line for manifests (set when funk overlay applied). */
  songModeJamesBrownFunkReceiptTag?: string;
  /** Song Mode — Donald Fagen slice v2: set when Phase C1 ran with primary `donald_fagen` (early-phrase sync lift). */
  songModeDonaldFagenC1Receipt?: string;
  /** Song Mode Phase C1/C2: engine/debug — per-phrase overlays + Phase C2 rhythm intent summaries. */
  songModeRhythmOverlayByPhrase?: Array<{
    phraseIndex: number;
    appliedOverlays: { id: string; weight: number }[];
    overlayRhythmProfile: string;
    rhythmIntent: {
      entryBias: 'onbeat' | 'offbeat' | 'late';
      groupingBias: 'even' | 'odd' | 'fragmented' | 'arc';
      densityShape: 'flat' | 'burst_rest' | 'swell' | 'sparse';
      barlineBehavior: 'contained' | 'crossing' | 'delayed';
    };
    rhythmIntentSummary: string;
  }>;
  /** Song Mode Phase C4: per-phrase ostinato / hook rhythm bias (1-bar template; after C1–C3). */
  songModeOstinatoByPhrase?: Array<{
    phraseIndex: number;
    ostinatoActive: boolean;
    ostinatoLengthBars: 1;
    ostinatoStrength: 'Stable' | 'Balanced' | 'Surprise';
    ostinatoSummary?: string;
    /** True when phrase or global C4 safety restore cleared edits for this row. */
    ostinatoSafetyReverted?: boolean;
  }>;
  /** Song Mode C4 hook rhythm layer: manifest receipt — whether timing was applied to any bar. */
  c4HookRhythmApplied?: boolean;
  /** Song Mode C4 hook rhythm layer: bar indices where guitar timing was applied (subset of hook schedule). */
  c4BarsUsed?: number[];
  /** Song Mode C4 hook rhythm layer intensity (default medium when unset). */
  c4Strength?: 'light' | 'medium' | 'strong';
  /** Song Mode C5 blend strength from request (default medium when unset). */
  blendStrength?: 'light' | 'medium' | 'strong';
  /** User Chromatic Strength — echoed from request; caps Slonimsky profile allowance. */
  chromaticStrength?: 'off' | 'subtle' | 'prominent';
  /** Resolved cap passed into Slonimsky (`chromaticStrengthToOutsideLevel`); `Math.min` with profile. */
  slonimskyAllowedOutsideOverride?: 0 | 1 | 2;
  /** Identity-locked bar indices — mutation modules must not alter these bars. */
  identityLockedBars?: number[];
  /** motifReusePlanner suggestions for downstream use. */
  motifReuseSuggestions?: Array<{ assetId: string; targetMode: string; role: string; note: string }>;
  /** Active songwriter style id — used to gate style-specific harmonic behaviour. */
  songwriterStyleId?: string;
  /** Song Mode: keyboard-centric primary songwriter — route harmony staff to keys-comp presentation + register pass. */
  songModeSongwriterKeysCompActive?: boolean;
  /** Song Mode: which `SongwriterCompProfile` id was applied (keyboard-centric path). */
  songModeSongwriterCompProfileId?: SongwriterRuleId;
  /** Song Mode — Donald Fagen keys-comp v1.5 pass applied (`fagenKeysCompV15.ts`). */
  songModeFagenKeysCompV15Applied?: boolean;
  /** STYLE_SOPHISTICATED_POP — harmony dressing + section contrast statistics (Song Mode eval). */
  sophisticatedPopHarmonyDiagnostics?: {
    barsConsidered: number;
    barsChanged: number;
    meanColourDepth: number;
    meanColourDepthSectionA: number;
    meanColourDepthSectionB: number;
    sectionContrastDelta: number;
    extensionAdds: number;
  };
  /** Primary `bacharach` — harmony dressing diagnostics (Song Mode eval / manifests). */
  bacharachHarmonyDiagnostics?: {
    barsConsidered: number;
    barsChanged: number;
    meanColourDepth: number;
    meanColourDepthSectionA: number;
    meanColourDepthSectionB: number;
    sectionContrastDelta: number;
    bridgeColourApplied: boolean;
    returnCadenceLiftApplied: boolean;
    secondaryDominantTouches: number;
    mixtureTouches: number;
  };
  /** Bacharach Song Mode: documented rule bundle id (`bacharachSongModeRuleBundle.ts`; reference-informed v1). */
  bacharachSongModeRuleBundleId?: string;
  /** Song Mode: section-aware behaviour declarations (Fagen / Bacharach / Sophisticated Pop / future slices). */
  songModeSectionBehaviourDescriptors?: SongModeSectionBehaviourDescriptor[];
  /** Song Mode LeadSheet pilot: compact per-bar melody anchors (Donald Fagen-only input slice). */
  songModeLeadSheetMelodyAnchors?: Array<{ bar: number; midi: number; velocityHint?: number; connectionHint?: number }>;
  /** Blend factor echoed from request when LeadSheet expression shaping ran (0–1). */
  songModeLeadSheetPerformanceBlend?: number;
  /** Song Mode LeadSheet pilot: LeadSheet input drove locked harmony in this run. */
  songModeLeadSheetInputApplied?: boolean;
  /** Song Mode LeadSheet pilot: first anchor was applied to guitar melody start. */
  songModeLeadSheetAnchorStartApplied?: boolean;
  /** Normalized imported-expression strength after blend mapping (0–1), shared across supported lead-sheet routes. */
  songModeLeadSheetExpressionStrength?: number;
  /** Stage 2 harmony-import mode telemetry (metadata-only in this stage). */
  importHarmonyMode?: ImportHarmonyMode;
  /** Stage 2 source tag for API-boundary mode normalization. */
  importHarmonyModeSource?: 'defaulted' | 'explicit';
  /** Stage 2 bounded harmony blend echo (telemetry-only in this stage). */
  harmonyBlendRaw?: number;
  /** Stage 4: import-harmony API/manifest contract version when telemetry is written (see `importHarmonyPolicy.ts`). */
  importHarmonyPolicyVersion?: number;
  /** Stage 3: true when Song Mode lock_harmony path consumed timeline-derived bars. */
  importHarmonyLockApplied?: boolean;
  /** Stage 3: fallback reason when lock_harmony was requested but not applied. */
  importHarmonyLockFallbackReason?: ImportHarmonyLockFallbackReason;
  /** Stage 3: count of timeline-derived locked bars consumed by harmony routing. */
  importHarmonyLockedBarsCount?: number;
  /** Stage 1: whether LeadSheet MusicXML parsing was attempted for this run (Song Mode routing flag echo). */
  importHarmonyShouldParseLeadSheetInput?: boolean;
  /** Stage 1: LeadSheet MusicXML adapt pipeline outcome (telemetry-only). */
  importHarmonyLeadSheetPipelineStage?: ImportHarmonyLeadSheetPipelineStage;
  /** Stage 1: coarse adapt failure bucket when stage is not `adapt_ok`. */
  importHarmonyLeadSheetAdaptDetail?: ImportHarmonyLeadSheetAdaptDetail;
  /** Stage 1: imported `LeadSheet.chordEvents.length` after shaping (when parse ran). */
  importHarmonyChordEventCount?: number;
  /** Stage 1: imported harmony timeline storage event count (`importedHarmonyTimeline.events`). */
  importHarmonyTimelineEventCount?: number;
  /** Song Mode: aggregated section shaping metrics for manifests, UI notes, and eval harnesses. */
  songModeSectionShapingDiagnostics?: SongModeSectionShapingDiagnosticsV1;
  /**
   * Song Mode: compact inspectability payload for "which profile/rules drove this run".
   * Travels engine -> manifest/app API -> desktop renderer dev inspector.
   */
  songModeProfileRuleDiagnostics?: {
    styleProfile?: StyleProfile;
    primarySongwriterStyleId?: SongwriterRuleId;
    secondarySongwriterStyleId?: SongwriterRuleId | null;
    authorOverlayId?: AuthorRuleId | null;
    classicalOverlayId?: ClassicalSongRuleId | null;
    styleFingerprint?: string;
    resolvedRuleIds?: string[];
    songwriterCompProfileId?: SongwriterRuleId;
    bacharachSongModeRuleBundleId?: string;
    behaviourSourceIds?: string[];
  };
  /** Fagen-only keys-comp musical augmentations — inspectable objective metrics for A/B tooling. */
  fagenKeysCompMusicalDiagnostics?: {
    rhythmPatternFamily: string;
    meanSyncopationIndex: number;
    syncopationIndexBySection?: Partial<
      Record<'a_open' | 'b' | 'a_return' | 'closing', number>
    >;
    avgInnerMotionSemitonesV2Top: number;
    meanRhMidiV1OpenA: number;
    meanRhMidiV1SectionB: number;
    densityDeltaBMinusA: number;
    voicingDensityBySection?: Partial<Record<'a_open' | 'b' | 'a_return' | 'closing', number>>;
    openingVsReturnRhMeanDelta?: number;
    returnVariationSummary?: string;
    returnPhraseGesturesApplied: number;
    signatureMoment?: { applied: boolean; pivotBar: number | null; kind: string };
    phraseTensionMeanDensityByPhrase?: number[];
  };
  /** Songwriter profile: hook repetition bias (0–1). */
  songwriterHookRepetitionBias?: number;
  /** Songwriter profile: phrase regularity (0–1). */
  songwriterPhraseRegularity?: number;
  /** Songwriter profile: syncopation bias (0–1). */
  songwriterSyncopationBias?: number;
  /** Songwriter profile: density bias (0–1). */
  songwriterDensityBias?: number;
  /**
   * Song Mode ECM surface (`STYLE_ECM` / `STYLE_ECM_CHAMBER`): silence / breath vs fill (0–1).
   * Nudged by {@link applyEcmChamberStyleSurface}.
   */
  songwriterSpaceBias?: number;
  /**
   * Song Mode ECM surface: internal preset for `applyEcmChamberStyleSurface` nudges (default `balanced` when unset).
   */
  ecmChamberMode?: 'angel_song' | 'balanced' | 'metheny_scofield';
  /**
   * Song Mode ECM surface: phrase-start looseness — beat 2 / off-beat entry bias (0–1).
   */
  songwriterPhraseStartLooseness?: number;
  /**
   * Song Mode ECM surface: bass line independence vs doubling guitar harmony rhythm (0–1).
   */
  songwriterBassIndependenceBias?: number;
  /**
   * Song Mode ECM surface: cadential softness / avoided hard cadences (0–1).
   */
  songwriterCadenceSoftness?: number;
  /** Golden path era hint: harmony density bias from `resolveEraProfile` (additive metadata; Song Mode when `era` set). */
  harmonyDensityBias?: number;
  fagenMuChordBias?: number;
  fagenLydianMajorBias?: number;
  fagenAlteredDominantBias?: number;
  fagenRootAvoidanceMelody?: number;
  fagenSlashChordDensity?: number;
  /** Song Mode — receipt only: duo guitar applied Fagen jazz-pop colour passes this run (inspectable; no mimic claim). */
  fagenJazzPopColourPassesReceipt?: string;
  /** Brian Wilson (Pet Sounds era) — per-bar harmony vocabulary scan (bass motion, ø7, aug, dim7). */
  brianWilsonPetSoundsDiagnostics?: {
    songwriterId: 'brian_wilson';
    barsConsidered: number;
    chromaticBassTransitions: number;
    halfDiminishedTouches: number;
    augmentedTouches: number;
    diminishedSeventhTouches: number;
    /** Named Pet Sounds harmonic device receipts for this run (e.g. `bw:device1:...`). */
    deviceReceipts?: string[];
  };
  /** One-line digest for manifests / dev inspector when the Pet Sounds slice ran. */
  brianWilsonPetSoundsSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after Pet Sounds harmonic devices (Brian Wilson only). */
  brianWilsonEffectiveHarmonyBars?: string[];
  /** Section-boundary semitone modulation hints (Brian Wilson Pet Sounds device 5). */
  brianWilsonSectionModulationHints?: Array<{
    atBar: number;
    semitoneDelta: -1;
    fromRole: 'verse';
    toRole: 'chorus' | 'bridge' | 'verse' | 'other';
  }>;
  /** Flat list of device receipts (mirrors diagnostics.deviceReceipts when populated). */
  brianWilsonPetSoundsDeviceReceipts?: string[];
  /** Stevie Wonder (1972–76) — per-bar harmony vocabulary scan (sus4, altered dominants, 9s, m7 colour). */
  stevieWonderDiagnostics?: {
    songwriterId: 'stevie_wonder';
    barsConsidered: number;
    sus4Touches: number;
    alteredDominantTouches: number;
    extensionNines: number;
    minorSeventhColour: number;
    /** Named harmonic device receipts for this run (e.g. `sw:device1:...`). */
    deviceReceipts?: string[];
  };
  /** One-line digest for manifests / dev inspector when the classic-period slice ran. */
  stevieWonderSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after Stevie Wonder harmonic devices. */
  stevieWonderEffectiveHarmonyBars?: string[];
  /** Flat list of harmonic device receipts (mirrors diagnostics.deviceReceipts when populated). */
  stevieWonderDeviceReceipts?: string[];
  /** Guitar-only pentatonic bias receipts (device 5); merged into diagnostics in finalize. */
  stevieWonderPentatonicReceipts?: string[];
  /** Radiohead (OK Computer / Kid A era) — per-bar harmony vocabulary scan (maj7, m, borrowed modal, slash pedals). */
  radioheadDiagnostics?: {
    songwriterId: 'radiohead';
    barsConsidered: number;
    maj7Touches: number;
    minorTriadTouches: number;
    borrowedModalTouches: number;
    slashPedalTouches: number;
    /** Named harmonic device receipts for this run (e.g. `rh:device1:...`). */
    deviceReceipts?: string[];
  };
  /** One-line digest for manifests / dev inspector when the Radiohead slice ran. */
  radioheadSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after Radiohead harmonic devices. */
  radioheadEffectiveHarmonyBars?: string[];
  /** Flat list of harmonic device receipts (mirrors diagnostics.deviceReceipts when populated). */
  radioheadDeviceReceipts?: string[];
  /** James Brown (funk/soul dominant-centre) — per-bar harmony + device/guard stats. */
  jamesBrownDiagnostics?: {
    songwriterId: 'james_brown';
    barsConsidered: number;
    dominantVampTouches: number;
    minorSeventhTouches: number;
    extensionTouches: number;
    /** Sum of reharm / turnaround / >13 extension guard triggers. */
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      reharmBlock: number;
      turnaroundBlock: number;
      extensionBeyond13: number;
    };
    deviceReceipts?: string[];
    vampLockStats?: { minRun: number; maxRun: number; meanRun: number };
    stabPlacement?: { eligibleBars: number; stabReceiptBars: number; hitRate: number };
  };
  /** One-line digest for manifests / dev inspector when the James Brown slice ran. */
  jamesBrownSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after James Brown harmonic devices. */
  jamesBrownEffectiveHarmonyBars?: string[];
  /** Flat list of harmonic device receipts (mirrors diagnostics.deviceReceipts when populated). */
  jamesBrownDeviceReceipts?: string[];
  /** Joni Mitchell (open-tuning modal) — per-bar harmony + device/guard stats. */
  joniMitchellDiagnostics?: {
    songwriterId: 'joni_mitchell';
    barsConsidered: number;
    suspensionHitRate: number;
    nonRootBassHitRate: number;
    addNineTouches: number;
    modalFieldLockLengthBars: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      dominantFamilyStripped: number;
      twoFiveOneFlattened: number;
      twoBarHoldForced: number;
      maj7CadenceMuted: number;
    };
    deviceReceipts?: string[];
  };
  /** One-line digest for manifests / dev inspector when the Joni Mitchell slice ran. */
  joniMitchellSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after Joni Mitchell harmonic devices. */
  joniMitchellEffectiveHarmonyBars?: string[];
  /** Flat list of harmonic device receipts (mirrors diagnostics.deviceReceipts when populated). */
  joniMitchellDeviceReceipts?: string[];
  /**
   * Joni slice — optional per-bar open-tuning pattern labels (e.g. `x57543`); **annotation only**, not on `ChordEvent`.
   */
  joniMitchellTuningPatternByBar?: string[];
  /** Longest run of identical symbols after slice passes (modal field lock length). */
  joniMitchellModalFieldLockLengthBars?: number;
  /** Versioned bag for slice-only metadata (tuning echo, future fields). */
  joniMitchellSliceMeta?: {
    tuningPatternByBar?: string[];
    tuningAnnotationOnly?: boolean;
    receiptsVersion?: number;
  };
  joniMitchellAntiElaborationGuards?: {
    dominantFamilyStripped: number;
    twoFiveOneFlattened: number;
    twoBarHoldForced: number;
    maj7CadenceMuted: number;
  };
  /** Sonic Youth — alternate tuning / noise-harmony slice (additive; `ChordEvent.sonicYouth` optional). */
  sonicYouthDiagnostics?: {
    songwriterId: 'sonic_youth';
    barsConsidered: number;
    susOrAddTouches: number;
    sharpElevenOrAltTouches: number;
    slashTouches: number;
    deviceReceipts?: string[];
  };
  sonicYouthSliceReceipt?: string;
  sonicYouthEffectiveHarmonyBars?: string[];
  sonicYouthDeviceReceipts?: string[];
  /** Pat Metheny (ECM / PMG modal–Lydian) — per-bar harmony + device/guard stats. */
  patMethenyDiagnostics?: {
    songwriterId: 'pat_metheny';
    barsConsidered: number;
    lydianColourHitRate: number;
    susFloatHitRate: number;
    slashPedalTouches: number;
    pedalHoldMaxBars: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      twoFiveOneFlattened: number;
      dominantChainFlattened: number;
      twoBarHoldForced: number;
      bluesDominantStripped: number;
    };
    deviceReceipts?: string[];
  };
  patMethenySliceReceipt?: string;
  patMethenyEffectiveHarmonyBars?: string[];
  patMethenyDeviceReceipts?: string[];
  patMethenyAntiElaborationGuards?: {
    twoFiveOneFlattened: number;
    dominantChainFlattened: number;
    twoBarHoldForced: number;
    bluesDominantStripped: number;
  };
  /** Longest same–slash-bass run after slice passes (inspectability). */
  patMethenyPedalHoldMaxBars?: number;
  /** Pat Metheny slice — per-device eligibility pool sizes + mean expected fires at target Bernoulli rates. */
  patMethenyEligibilityStats?: {
    totalBars: number;
    d2EligibleBars: number;
    d4EligibleBars: number;
    d5EligibleBars: number;
    targetMeanFiresD2: number;
    targetMeanFiresD4: number;
    targetMeanFiresD5: number;
  };
  /** Wayne Shorter (post-bop) — per-bar harmony vocabulary scan + device receipts. */
  wayneShorterDiagnostics?: {
    songwriterId: 'wayne_shorter';
    barsConsidered: number;
    alteredDominantHitRate: number;
    slashPedalHitRate: number;
    quartalSusHitRate: number;
    minorColourHitRate: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      neighborClamp: number;
      plateauClamp: number;
    };
    deviceReceipts?: string[];
  };
  wayneShorterSliceReceipt?: string;
  wayneShorterEffectiveHarmonyBars?: string[];
  wayneShorterDeviceReceipts?: string[];
  wayneShorterAntiElaborationGuards?: {
    neighborClamp: number;
    plateauClamp: number;
  };
  /** Wayne Shorter slice — per-device eligibility pool sizes + mean expected fires at target Bernoulli rates. */
  wayneShorterEligibilityStats?: {
    totalBars: number;
    d1EligibleBars: number;
    d2EligibleBars: number;
    d3EligibleBars: number;
    d4EligibleBars: number;
    d5EligibleBars: number;
    targetMeanFiresD1: number;
    targetMeanFiresD2: number;
    targetMeanFiresD3: number;
    targetMeanFiresD4: number;
    targetMeanFiresD5: number;
  };
  /** Frank Zappa — polytonal clash / xenochrony / juxtaposition slice diagnostics + receipts. */
  frankZappaDiagnostics?: {
    songwriterId: 'frank_zappa';
    barsConsidered: number;
    polytonalSlashHitRate: number;
    alteredColourHitRate: number;
    triadClashHitRate: number;
    deviceFireCounts?: {
      d1: number;
      d2: number;
      d3: number;
      d4: number;
      d5: number;
    };
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      polytonalNoop: number;
      xenochronyNoop: number;
    };
    deviceReceipts?: string[];
    /** Musicality Phase 3 — Barry Harris moduleValidation voice-leading gate (0–10). */
    zappaVoiceLeadingScore?: number;
    /** Bars where bass–melody gap > 12 st without contrary motion received a bounded nudge. */
    zappaInnerVoiceNudgeBars?: number[];
    /** Form sections that gained a deliberate contrary-motion moment (Phase 3). */
    zappaContraryMotionSections?: string[];
    /** Musicality Phase 4 — guitar↔bass anchor imitation receipts. */
    zappaImitationReceipt?: ZappaImitationReceipt;
  };
  /** True when any bar failed Frank Zappa bass beat-1 / beat-2 commitment (after repair attempt). */
  frankZappaBassBeatCommitmentViolated?: boolean;
  frankZappaSliceReceipt?: string;
  frankZappaEffectiveHarmonyBars?: string[];
  frankZappaDeviceReceipts?: string[];
  frankZappaAntiElaborationGuards?: {
    polytonalNoop: number;
    xenochronyNoop: number;
  };
  /** Frank Zappa slice — per-device eligibility pools + mean expected fires at target Bernoulli rates. */
  frankZappaEligibilityStats?: {
    totalBars: number;
    d1EligibleBars: number;
    d2EligibleBars: number;
    d3EligibleBars: number;
    d4EligibleBars: number;
    d5EligibleBars: number;
    targetMeanFiresD1: number;
    targetMeanFiresD2: number;
    targetMeanFiresD3: number;
    targetMeanFiresD4: number;
    targetMeanFiresD5: number;
  };
  /** Frank Zappa — slice mode for additive harmony/metadata passes (`frankZappaSlice.ts`). Default **`avant_rock`** when omitted. */
  frankZappaContext?: FrankZappaContextMode;
  /** Context-specific synthetic / modal scale weights for manifests (honest bias labels only). */
  frankZappaSyntheticScaleBias?: Record<string, number>;
  /** Per-bar density bias (0–1) from Zappa density arc; refined after hard-cut resets in precompute. */
  frankZappaDensityBiasByBar?: number[];
  /** Bars where hard-cut triggers fired (1-based). */
  frankZappaHardCutTriggerBars?: number[];
  /** String quartet — Frank Zappa SQ harmony slice (`fz:sq:` receipts); see `zappaStringQuartetSlice`. */
  zappaSQHarmonySlice?: boolean;
  zappaSQEffectiveHarmonyBars?: string[];
  zappaSQDeviceReceipts?: string[];
  /** Barry Harris (bebop / sixth–diminished) — slice diagnostics + effective harmony. */
  barryHarrisDiagnostics?: {
    songwriterId: 'barry_harris';
    barsConsidered: number;
    sixthChordTouches: number;
    diminishedTouches: number;
    dominantTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      clusterVoicingReduced: number;
      slashFlattenedToRoot: number;
      denseAlterationReduced: number;
    };
    deviceReceipts?: string[];
  };
  barryHarrisSliceReceipt?: string;
  barryHarrisEffectiveHarmonyBars?: string[];
  barryHarrisDeviceReceipts?: string[];
  barryHarrisAntiElaborationGuards?: {
    clusterVoicingReduced: number;
    slashFlattenedToRoot: number;
    denseAlterationReduced: number;
  };
  /** Bill Evans (impressionist / rootless-style extensions) — slice diagnostics + effective harmony. */
  billEvansDiagnostics?: {
    songwriterId: 'bill_evans';
    barsConsidered: number;
    extensionTouches: number;
    susModalTouches: number;
    quartalColourTouches: number;
    delayedResolutionTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bareTriadRaised: number;
      strongCadenceSoftened: number;
    };
    deviceReceipts?: string[];
  };
  billEvansSliceReceipt?: string;
  billEvansEffectiveHarmonyBars?: string[];
  billEvansDeviceReceipts?: string[];
  billEvansAntiElaborationGuards?: {
    bareTriadRaised: number;
    strongCadenceSoftened: number;
  };
  /** Debussy (impressionist parallel colour / whole-tone fields) — slice diagnostics + effective harmony (`debussySlice.ts`). */
  debussyDiagnostics?: {
    songwriterId: 'debussy';
    barsConsidered: number;
    wholeToneTouches: number;
    planingTouches: number;
    pentatonicTouches: number;
    appoggiaturaTouches: number;
    arabesqueTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopEnrich: number;
      resolutionSuppressed: number;
    };
    deviceReceipts?: string[];
  };
  debussySliceReceipt?: string;
  debussyEffectiveHarmonyBars?: string[];
  debussyDeviceReceipts?: string[];
  debussyAntiElaborationGuards?: {
    noopEnrich: number;
    resolutionSuppressed: number;
  };
  /** Bars flagged as arabesque texture (1-based). */
  debussyArabesqueBars?: number[];
  /** Optional motif-development tag per arabesque bar (metadata / manifests). */
  debussyArabesqueMotifByBar?: Record<
    number,
    'sequence_by_step' | 'rhythmic_augmentation' | 'fragment_extension' | 'register_shift' | 'ornamental'
  >;
  /** Duke Ellington (orchestral / jungle colour) — slice diagnostics + effective harmony. */
  dukeEllingtonDiagnostics?: {
    songwriterId: 'duke_ellington';
    barsConsidered: number;
    majExtensionTouches: number;
    domColourTouches: number;
    minorColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bareMajorRaised: number;
    };
    deviceReceipts?: string[];
  };
  dukeEllingtonSliceReceipt?: string;
  dukeEllingtonEffectiveHarmonyBars?: string[];
  dukeEllingtonDeviceReceipts?: string[];
  dukeEllingtonAntiElaborationGuards?: {
    bareMajorRaised: number;
  };
  /** Call / response grid (1-based bar index → role). */
  ellingtonCallResponseMap?: Record<number, 'call' | 'response'>;
  /** Bars tagged by shout-chorus pass (1-based). */
  ellingtonShoutBars?: number[];
  /** Miles Davis (modal / space / electric vamp) — slice diagnostics + effective harmony. */
  milesDavisDiagnostics?: {
    songwriterId: 'miles_davis';
    barsConsidered: number;
    modalColourTouches: number;
    dominantColourTouches: number;
    minorColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopTonic: number;
    };
    deviceReceipts?: string[];
  };
  milesDavisSliceReceipt?: string;
  milesDavisEffectiveHarmonyBars?: string[];
  milesDavisDeviceReceipts?: string[];
  milesDavisAntiElaborationGuards?: {
    noopTonic: number;
  };
  /** Modal-centre receipt map (1-based bar → label). */
  milesDavisModalCenterBars?: Record<number, string>;
  /** Quintet “time no changes” ambiguity bars (1-based). */
  milesDavisTimeNoChangesBars?: number[];
  /** Electric-era groove vamp lock bars (1-based). */
  milesDavisVampBars?: number[];
  /** True after cool phrasing pass fired on any bar. */
  milesDavisCoolMode?: boolean;
  /**
   * Miles Davis Song Mode slice mode (`milesDavisSlice.ts`). Default **`modal_1959`** when omitted.
   */
  milesDavisContext?: MilesDavisContextMode;
  /** Bartók — axis symmetry / folk-modal / chamber orchestral harmony (`bartokSlice.ts`). */
  bartokDiagnostics?: {
    songwriterId: 'bartok';
    barsConsidered: number;
    axisTouches: number;
    quartalTouches: number;
    folkModalTouches: number;
    clusterTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopAxis: number;
    };
    deviceReceipts?: string[];
  };
  bartokSliceReceipt?: string;
  bartokEffectiveHarmonyBars?: string[];
  bartokDeviceReceipts?: string[];
  bartokAntiElaborationGuards?: {
    noopAxis: number;
  };
  /**
   * Bartók Song Mode slice mode (`bartokSlice.ts`). Default **`mikrokosmos`** when omitted.
   */
  bartokContext?: BartokContextMode;
  /** George Gershwin — Songbook / concert jazz harmony (`gershwinSlice.ts`). */
  gershwinDiagnostics?: {
    songwriterId: 'gershwin';
    barsConsidered: number;
    functionalTouches: number;
    jazzExtensionTouches: number;
    chromaticTouches: number;
    modulationTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopEnrich: number;
    };
    deviceReceipts?: string[];
  };
  gershwinSliceReceipt?: string;
  gershwinEffectiveHarmonyBars?: string[];
  gershwinDeviceReceipts?: string[];
  gershwinAntiElaborationGuards?: {
    noopEnrich: number;
  };
  /**
   * Gershwin Song Mode slice mode (`gershwinSlice.ts`). Default **`song_aaba`** when omitted.
   */
  gershwinContext?: GershwinContextMode;
  /** Arvo Pärt — tintinnabuli / sparse triadic harmony (`arvoPartSlice.ts`). */
  arvoPartDiagnostics?: {
    songwriterId: 'arvo_part';
    barsConsidered: number;
    tintinnabuliTouches: number;
    silenceAsStructureTouches: number;
    additiveRhythmTouches: number;
    registerArchTouches: number;
    triadicTransformTouches: number;
    pedalTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopTriad: number;
    };
    deviceReceipts?: string[];
  };
  arvoPartSliceReceipt?: string;
  arvoPartEffectiveHarmonyBars?: string[];
  arvoPartDeviceReceipts?: string[];
  arvoPartAntiElaborationGuards?: {
    noopTriad: number;
  };
  /**
   * Arvo Pärt Song Mode slice mode (`arvoPartSlice.ts`). Default **`fur_alina`** when omitted.
   */
  arvoPartContext?: ArvoPartContextMode;
  /** Erik Satie — parallel modal plans / anti-functional stasis (`satieSlice.ts`). */
  satieDiagnostics?: {
    songwriterId: 'satie';
    barsConsidered: number;
    staticFieldTouches: number;
    parallelPlanningTouches: number;
    cellRepetitionTouches: number;
    textureFormTouches: number;
    modalCollectionTouches: number;
    parallelColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      dominantStripNoop: number;
    };
    deviceReceipts?: string[];
  };
  satieSliceReceipt?: string;
  satieEffectiveHarmonyBars?: string[];
  satieDeviceReceipts?: string[];
  satieAntiElaborationGuards?: {
    dominantStripNoop: number;
  };
  /**
   * Erik Satie Song Mode slice mode (`satieSlice.ts`). Default **`gymnopedie`** when omitted.
   */
  satieContext?: SatieContextMode;
  /** Prince — extended R&B/jazz harmony (m9 / dom9–13 / maj9·6·9 / sus9; devices `pr:*`) (`princeSlice.ts`). */
  princeDiagnostics?: {
    songwriterId: 'prince';
    barsConsidered: number;
    extensionTouches: number;
    borrowedTouches: number;
    vampTouches: number;
    bridgeColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopEnrich: number;
    };
    deviceReceipts?: string[];
  };
  princeSliceReceipt?: string;
  princeEffectiveHarmonyBars?: string[];
  princeDeviceReceipts?: string[];
  princeAntiElaborationGuards?: {
    noopEnrich: number;
  };
  /**
   * Prince Song Mode slice mode (`princeSlice.ts`). Default **`purple_rain`** when omitted.
   */
  princeContext?: PrinceContextMode;
  /** The Beatles — diatonic + flat-side / co-tonic pop harmony (`beatlesSlice.ts`). */
  beatlesDiagnostics?: {
    songwriterId: 'beatles';
    barsConsidered: number;
    functionalColourTouches: number;
    borrowedColourTouches: number;
    deviceReceipts?: string[];
  };
  beatlesSliceReceipt?: string;
  beatlesEffectiveHarmonyBars?: string[];
  beatlesDeviceReceipts?: string[];
  /**
   * Beatles Song Mode slice mode (`beatlesSlice.ts`). Default **`merseybeat_1962`** when omitted.
   */
  beatlesContext?: BeatlesContextMode;
  /** Cole Porter — Great American Songbook chromatic / cadential jazz harmony (`colePorterSlice.ts`). */
  colePorterDiagnostics?: {
    songwriterId: 'cole_porter';
    barsConsidered: number;
    chromaticTouches: number;
    secondaryDominantTouches: number;
    majColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      noopEnrich: number;
    };
    deviceReceipts?: string[];
  };
  colePorterSliceReceipt?: string;
  colePorterEffectiveHarmonyBars?: string[];
  colePorterDeviceReceipts?: string[];
  colePorterAntiElaborationGuards?: {
    noopEnrich: number;
  };
  /** Distinct chord-symbol tally after Porter passes when **`totalBars` === 32** (planning receipt). */
  colePorterDistinctChordCount32?: number;
  /** Beguine-feel pocket active for this generation (slice metadata). */
  porterBeguineFeelActive?: boolean;
  /** 1-based bars flagged for beguine bass rhythmic hint (`cp:beguine`). */
  porterBeguineBars?: number[];
  /** Maria Schneider (modal / pastoral orchestral) — slice diagnostics + effective harmony. */
  mariaSchneiderDiagnostics?: {
    songwriterId: 'maria_schneider';
    barsConsidered: number;
    lydianTouches: number;
    pedalTouches: number;
    natureTouches: number;
    colorStackTouches: number;
    planingTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bareMajorRaised: number;
    };
    deviceReceipts?: string[];
  };
  mariaSchneiderSliceReceipt?: string;
  mariaSchneiderEffectiveHarmonyBars?: string[];
  mariaSchneiderDeviceReceipts?: string[];
  mariaSchneiderAntiElaborationGuards?: {
    bareMajorRaised: number;
  };
  /** Pedal ostinato bars (1-based). */
  schneiderPedalBars?: number[];
  /** Tutti colour-stack bars (1-based). */
  schneiderColorStackBars?: number[];
  /** Bacharach (theatre-pop / studio orchestration) — slice diagnostics + effective harmony. */
  bacharachDiagnostics?: {
    songwriterId: 'bacharach';
    barsConsidered: number;
    chromaticSideTouches: number;
    extensionTouches: number;
    deceptiveTouches: number;
    slashBassTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      clusterVoicingReduced: number;
      denseAlterationReduced: number;
    };
    deviceReceipts?: string[];
  };
  bacharachSliceReceipt?: string;
  bacharachEffectiveHarmonyBars?: string[];
  bacharachDeviceReceipts?: string[];
  bacharachAntiElaborationGuards?: {
    clusterVoicingReduced: number;
    denseAlterationReduced: number;
  };
  /** Donald Fagen (jazz-rock / precision harmony) — slice diagnostics + effective harmony. */
  donaldFagenDiagnostics?: {
    songwriterId: 'donald_fagen';
    barsConsidered: number;
    lydianTonicTouches: number;
    dominantEnrichTouches: number;
    chromaticApproachTouches: number;
    susBreathTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      clusterVoicingReduced: number;
      denseAlterationReduced: number;
    };
    deviceReceipts?: string[];
  };
  donaldFagenSliceReceipt?: string;
  donaldFagenEffectiveHarmonyBars?: string[];
  donaldFagenDeviceReceipts?: string[];
  donaldFagenAntiElaborationGuards?: {
    clusterVoicingReduced: number;
    denseAlterationReduced: number;
  };
  /** ECM Chamber (Nordic / sparse modal harmony) — slice diagnostics + effective harmony. */
  ecmChamberDiagnostics?: {
    songwriterId: 'ecm_chamber';
    barsConsidered: number;
    modalOpenTouches: number;
    quartalSusTouches: number;
    pedalSlashTouches: number;
    phraseHangTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      denseClusterReduced: number;
      functionalDominantMuted: number;
    };
    deviceReceipts?: string[];
  };
  ecmChamberSliceReceipt?: string;
  ecmChamberEffectiveHarmonyBars?: string[];
  ecmChamberDeviceReceipts?: string[];
  ecmChamberAntiElaborationGuards?: {
    denseClusterReduced: number;
    functionalDominantMuted: number;
  };
  /** Antônio Carlos Jobim (bossa / Brazilian jazz harmony) — slice diagnostics + effective harmony. */
  jobimDiagnostics?: {
    songwriterId: 'antonio_carlos_jobim';
    barsConsidered: number;
    bossaTonicTouches: number;
    dominantColourTouches: number;
    subVOrBackdoorTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bluntMaj7Softened: number;
      alteredDominantReduced: number;
    };
    deviceReceipts?: string[];
  };
  jobimSliceReceipt?: string;
  jobimEffectiveHarmonyBars?: string[];
  jobimDeviceReceipts?: string[];
  jobimAntiElaborationGuards?: {
    bluntMaj7Softened: number;
    alteredDominantReduced: number;
  };
  /** Bars (1-based) where bossa comp should anticipate the next harmony (& of 4 prior bar); Jobim slice only. */
  jobimBossaAnticipationBars?: number[];
  /**
   * Song Mode: primary is Jobim — use with `STYLE_MODERN_JAZZ` so {@link applyJobimStyleSurface} runs instead of Bill Evans surface nudges.
   */
  jobimMode?: boolean;
  /** Herbie Hancock (Blue Note post-bop / fusion harmony) — slice diagnostics + effective harmony. */
  herbieHancockDiagnostics?: {
    songwriterId: 'herbie_hancock';
    barsConsidered: number;
    susFieldTouches: number;
    alteredDominantTouches: number;
    colourTonicTouches: number;
    subVColourTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      quartalThrottleHits: number;
      orthodoxTurnaroundSoftened: number;
    };
    deviceReceipts?: string[];
  };
  herbieHancockSliceReceipt?: string;
  herbieHancockEffectiveHarmonyBars?: string[];
  herbieHancockDeviceReceipts?: string[];
  herbieHancockAntiElaborationGuards?: {
    quartalThrottleHits: number;
    orthodoxTurnaroundSoftened: number;
  };
  /** Stephen Sondheim (dramatic musical theatre tonality) — slice diagnostics + effective harmony. */
  sondheimDiagnostics?: {
    songwriterId: 'stephen_sondheim';
    barsConsidered: number;
    addedNoteTouches: number;
    chromaticSurfaceTouches: number;
    pedalSlashTouches: number;
    goldenAgeBreakTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      goldenAgeChainBroken: number;
      lushJazzSweetReduced: number;
    };
    deviceReceipts?: string[];
  };
  sondheimSliceReceipt?: string;
  sondheimEffectiveHarmonyBars?: string[];
  sondheimDeviceReceipts?: string[];
  sondheimAntiElaborationGuards?: {
    goldenAgeChainBroken: number;
    lushJazzSweetReduced: number;
  };
  /** Kate Bush (tonal-modal texture / drone-aware harmony) — slice diagnostics + effective harmony. */
  kateBushDiagnostics?: {
    songwriterId: 'kate_bush';
    barsConsidered: number;
    addOrSusTouches: number;
    modalMixtureTouches: number;
    pedalSlashTouches: number;
    pedalReceiptTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      jazzStackReduced: number;
    };
    deviceReceipts?: string[];
  };
  kateBushSliceReceipt?: string;
  kateBushEffectiveHarmonyBars?: string[];
  kateBushDeviceReceipts?: string[];
  kateBushAntiElaborationGuards?: {
    jazzStackReduced: number;
  };
  /** Thelonious Monk (angular / b9-dominant harmony) — slice diagnostics + effective harmony. */
  theloniousMonkDiagnostics?: {
    songwriterId: 'thelonious_monk';
    barsConsidered: number;
    b9DominantTouches: number;
    angularHarmonyTouches: number;
    tonicColourTouches: number;
    tritoneSubReceiptTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      lushExtensionStripped: number;
    };
    deviceReceipts?: string[];
  };
  theloniousMonkSliceReceipt?: string;
  theloniousMonkEffectiveHarmonyBars?: string[];
  theloniousMonkDeviceReceipts?: string[];
  theloniousMonkAntiElaborationGuards?: {
    lushExtensionStripped: number;
  };
  /** Thelonious Monk slice — bars (1-based) with intent: no new melodic onset (full-bar rest / silence). */
  monkSilenceBars?: number[];
  /** Thelonious Monk slice — bars (1-based) where melody enters after beat 3 (partial rest). */
  monkPartialRestBars?: number[];
  /** Andrew Hill (post-bop angular non-functional harmony) — slice diagnostics + effective harmony. */
  andrewHillDiagnostics?: {
    songwriterId: 'andrew_hill';
    barsConsidered: number;
    susClusterTouches: number;
    tritoneFieldTouches: number;
    nonfunctionalMinorTouches: number;
    tritoneRootReceiptTouches: number;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      lushExtensionStripped: number;
      twoFiveChainMuted: number;
    };
    deviceReceipts?: string[];
  };
  andrewHillSliceReceipt?: string;
  andrewHillEffectiveHarmonyBars?: string[];
  andrewHillDeviceReceipts?: string[];
  andrewHillAntiElaborationGuards?: {
    lushExtensionStripped: number;
    twoFiveChainMuted: number;
  };
  /** Charlie Parker (bebop ii–V–I / tritone sub / turnaround) — slice diagnostics + effective harmony. */
  charlieParkerDiagnostics?: {
    songwriterId: 'charlie_parker';
    barsConsidered: number;
    iiVIClarified: number;
    tritoneSubTouches: number;
    turnaroundCompressed: number;
    bebopEnrichTouches: number;
    birdEnclosureTouches?: number;
    deviceReceipts?: string[];
  };
  charlieParkerSliceReceipt?: string;
  charlieParkerEffectiveHarmonyBars?: string[];
  charlieParkerDeviceReceipts?: string[];
  /** Frank Zappa (polytonal clash / metric displacement / xenochrony / style juxtaposition / through-composed) — slice diagnostics + effective harmony. */
  frankZappaDiagnostics?: {
    songwriterId: 'frank_zappa';
    barsConsidered: number;
    polytonalSlashHitRate: number;
    alteredColourHitRate: number;
    triadClashHitRate: number;
    deviceFireCounts: { d1: number; d2: number; d3: number; d4: number; d5: number };
    antiElaborationGuardTriggers: number;
    antiElaborationGuards: { polytonalNoop: number; xenochronyNoop: number };
    deviceReceipts?: string[];
    zappaVoiceLeadingScore?: number;
    zappaInnerVoiceNudgeBars?: number[];
    zappaContraryMotionSections?: string[];
    zappaImitationReceipt?: ZappaImitationReceipt;
  };
  frankZappaSliceReceipt?: string;
  frankZappaEffectiveHarmonyBars?: string[];
  frankZappaDeviceReceipts?: string[];
  frankZappaAntiElaborationGuards?: { polytonalNoop: number; xenochronyNoop: number };
  frankZappaEligibilityStats?: {
    totalBars: number;
    d1EligibleBars: number;
    d2EligibleBars: number;
    d3EligibleBars: number;
    d4EligibleBars: number;
    d5EligibleBars: number;
    targetMeanFiresD1: number;
    targetMeanFiresD2: number;
    targetMeanFiresD3: number;
    targetMeanFiresD4: number;
    targetMeanFiresD5: number;
  };
  /** Anti–art-rock / Brian Wilson / Radiohead elaboration guard hits (detailed; also folded into diagnostics). */
  jamesBrownAntiElaborationGuards?: { reharmBlock: number; turnaroundBlock: number; extensionBeyond13: number };
  /** Bars (1-based) where blues-tension colour was applied (device 5). */
  jamesBrownBluesTensionBars?: number[];
  /** Vamp run statistics (verse/chorus regions). */
  jamesBrownVampLockStats?: { minRun: number; maxRun: number; meanRun: number };
  /** Horn-stab receipt coverage vs eligible verse+chorus bars. */
  jamesBrownStabPlacementStats?: { eligibleBars: number; stabReceiptBars: number; hitRate: number };
  bacharachDeceptiveCadenceRate?: number;
  bacharachChromaticVoiceLeading?: number;
  bacharachModalMixtureLevel?: number;
  bacharachCadentialAmbiguity?: number;
  bacharachPedalUsage?: number;
  /** Song Mode Phase C5: control layer (roles, caps, muddy reduction) after C4 — no structural edits. */
  songModeC5ByPhrase?: Array<{
    phraseIndex: number;
    primaryLayer: 'c2' | 'c3' | 'c4';
    secondaryLayer: 'c2' | 'c3' | 'c4' | null;
    primaryStrength: 1;
    secondaryStrength: number;
    layerScale: { c2: number; c3: number; c4: number };
    maxDensityPerBeat: number;
    maxSyncopationRatio: number;
    maxRepetitionScore: number;
    autoReductionStep: 0 | 1 | 2;
    secondaryLayerDisabled: boolean;
    c5Skipped?: boolean;
    c5SkipReason?: string;
  }>;
  /** Phase C5 one-line receipt for manifests. */
  songModeC5Receipt?: string;
  /** Song Mode Phase C6: expression (accent + articulation) after C5 — guitar only; no structural edits. */
  songModeC6ByPhrase?: Array<{
    phraseIndex: number;
    c6Active: boolean;
    c6Summary?: string;
  }>;
  songModeC6Receipt?: string;
  /** Song Mode Phase C7: space / density (rest + hold) after C6 — guitar only. */
  songModeC7ByPhrase?: Array<{
    phraseIndex: number;
    c7Active: boolean;
    c7Summary?: string;
    c7OpsApplied?: number;
  }>;
  songModeC7Receipt?: string;
  /**
   * D1: optional raw intent from request (API → runGoldenPath). Only `ensureRhythmIntentResolvedIntoMetadata` / C5 resolve path reads this.
   */
  rhythmIntentRaw?: RhythmIntentControl;
  /** D1: per-phrase resolved intent — C4/C6/C7/C5 apply use `getEffectiveRhythmStrength(meta, phraseIndex)` only. */
  rhythmIntentResolvedByPhrase?: RhythmIntentResolvedPhrase[];
  /** D1: receipt / debug (does not affect music). */
  rhythmIntentResolutionLog?: {
    rawEcho?: RhythmIntentControl;
    clampApplied?: RhythmIntentControl;
    phraseCount?: number;
  };
}

/** Shared CompositionContext — required by every core system and style module. */
export interface CompositionContext {
  systemVersion: string;
  presetId: string;
  seed: number;

  form: FormMap;
  feel: FeelConfig;
  harmony: HarmonyPlan;
  motif: MotifState;
  phrase: PhrasePlan;
  register: RegisterMap;
  density: DensityCurve;

  instrumentProfiles: InstrumentProfile[];
  chordSymbolPlan: ChordSymbolPlan;
  rehearsalMarkPlan: RehearsalMarkPlan;
  /**
   * When set (custom / locked harmony), authoritative one chord symbol per bar (1-based index = array index + 1).
   * Score chords, MusicXML harmony export, and post-write validation must use this — not a derived planner path.
   */
  lockedHarmonyBarsRaw?: string[];
  /**
   * Locked Song Mode: one contract per bar (display + structured semantics). Generation and export must agree.
   */
  lockedHarmonyBarContracts?: HarmonyBarContract[];
  /**
   * Phase A — bar-level meter map (same semantics as `GenerationMetadata.barMeterMap`).
   * Optional; defaults to common-time when omitted.
   */
  barMeterMap?: BarMeterMap;

  generationMetadata: GenerationMetadata;
  /**
   * When set (Frank Zappa duo Song Mode), immutable one chord per bar for the whole form — same snapshot for
   * `getChordForBar`, score guitar measures, pipeline truth, and lock validation.
   */
  harmonyContext?: HarmonyContext;
  validation: ValidationResults;
  styleOverrides?: Record<string, unknown>;
  readiness: {
    release: ReleaseReadinessResult;
    mx: MxReadinessResult;
  };
}
