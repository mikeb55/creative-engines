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
import type { CharlesMingusEpisodePlan } from './song-mode/mingusEpisodeTypes';
import type { KennyWheelerSliceParams } from './song-mode/wheelerLyricSlice';
import type { BillyStrayhornSliceParams } from './song-mode/billyStrayhornSlice';
import type { DonSebeskySliceParams, SebeskyProductionSection } from './song-mode/donSebeskySlice';
import type {
  HenryThreadgillEpisodePlan,
  HenryThreadgillSliceParams,
} from './song-mode/threadgillEpisodeTypes';
import type {
  JanGarbarekFieldPlan,
  JanGarbarekSliceParams,
} from './song-mode/janGarbarekSlice';
import type {
  JohnSurmanFolkPlan,
  JohnSurmanSliceParams,
} from './song-mode/johnSurmanSlice';
import type {
  TownerPolyphonicPlan,
  RalphTownerSliceParams,
} from './song-mode/ralphTownerSlice';
import type {
  VerlaineFieldPlan,
  VerlaineSliceParams,
} from './song-mode/verlainFieldSlice';
import type {
  HoldsworthScalePlan,
  HoldsworthSliceParams,
} from './song-mode/holdsworthScaleSlice';
import type {
  JackWhiteDronePlan,
  JackWhiteSliceParams,
} from './song-mode/jackWhiteDroneSlice';
import type {
  BeefheartFragmentPlan,
  BeefheartSliceParams,
} from './song-mode/beefheartFragmentSlice';
import type {
  FrippSystemsPlan,
  FrippSliceParams,
  FrippEraSystemMode,
} from './song-mode/frippSystemsSlice';
import type {
  MarrMelodicPlan,
  MarrSliceParams,
} from './song-mode/marrMelodicSlice';
import type {
  WeberFieldPlan,
  EberhardWeberSliceParams,
} from './song-mode/weberFieldSlice';
import type {
  ClausOgermanSliceParams,
  OgermanContinuumPlan,
} from './song-mode/clausOgermanSlice';
import type {
  JohnnyMandelSliceParams,
  MandelLyricWarmthPlan,
} from './song-mode/johnnyMandelSlice';
import type {
  JohnBarrySliceParams,
  BarryThematicMonolithPlan,
} from './song-mode/johnBarrySlice';
import type { LaloSchifrinSliceParams } from './song-mode/laloSchifrinSlice';
import type { BillHolmanSliceParams } from './song-mode/billHolmanSlice';
import type { CarlaBleySliceParams } from './song-mode/carlaBleySlice';
import type { CarlaBleyEpisodePlan } from './song-mode/bleyEpisodeTypes';
import type { BasieEpisodePlan } from './song-mode/basieEpisodeTypes';
import type { BasieTestamentMode } from './song-mode/basieSlice';
import type {
  MotifAuthorityLevel,
  MotifAuthorityPlan,
  MotifDevelopmentSummary,
  MotifFingerprint,
} from './motif/motifAuthorityV1';
import type { BarMeterMap } from './rhythm/barMeterTypes';
import type { ClaveGridOverlayReceipt } from './rhythm/claveGridOverlay';
import type { SoloLine, ZappaImitationReceipt, ZappasoloOptions } from './solo/soloTypes';
import type { HarmonyContext } from './harmony/harmonyContext';
import type { HarmonicScene } from './composer/harmonicScene';
import type { AbstractLineSet } from './counterpoint/abstractLineSet';
import type { VoiceRuleBundle } from './composer/voiceRuleBundle';
import type { SectionMarker } from './composer/sectionMarkerTypes';
import type { VoiceBundleHarmonicRhythmState } from './composer/voiceBundleHarmonicRhythm';
import type { MacroFormPlan } from './form/macroFormPlanner';
import type { BergStyleMode } from './style/berg/bergStyleModes';
import type { BergTrichordIndexEntry } from './style/berg/bergRowEngine';
import type { BergClimaxPlan, BergSilenceTag } from './style/berg/bergFormModules';
import type { GrooveScaffoldDiagnostics } from './groove-scaffold/grooveScaffold';

/** Frank Zappa Song Mode slice — harmonic vocabulary / density arc mode (metadata). */
export type FrankZappaContextMode = 'avant_rock' | 'big_band' | 'futuristic_jazz';

/** Frank Zappa duo GCE lane — compositional structural fingerprint vs blues-rock ferocious Slonimsky map. Default **`compositional`**. */
export type ZappaStyleMode = 'compositional' | 'bluesrockFerocious';

/** Riff solo era — maps to 7/8-style eighth cell groupings (`zappaRiffSoloParams.ts`). */
export type ZappaEraPreset = 'broad' | 'mothers_66' | 'rio_73' | 'synclavier_84';

/** Riff solo phrase length posture. */
export type ZappaPhraseCharacter = 'balanced' | 'fragmented' | 'extended';

/** Riff solo symmetric / tritone colour weighting. */
export type ZappaSymmetryBias = 'low' | 'medium' | 'high';

/** Max rhythmic cell chain repeats on the solo lane (1–3). */
export type ZappaChainDepth = 1 | 2 | 3;

/** Riff + metadata bundle for Zappa solo adapter threading. */
export interface ZappaRiffSoloControls {
  zappaStyleMode?: ZappaStyleMode;
  zappaEraPreset?: ZappaEraPreset;
  zappaPhraseCharacter?: ZappaPhraseCharacter;
  zappaSymmetryBias?: ZappaSymmetryBias;
  zappaChainDepth?: ZappaChainDepth;
}

/** Miles Davis Song Mode slice — era / ensemble harmonic posture (`milesDavisSlice.ts`). Default **`modal_1959`** when omitted. */
export type MilesDavisContextMode = 'modal_1959' | 'quintet_1965' | 'electric_1970';

/** Béla Bartók Song Mode slice — Mikrókosmos vs quartet vs orchestral strings posture (`bartokSlice.ts`). Default **`mikrokosmos`** when omitted. */
export type BartokContextMode = 'mikrokosmos' | 'string_quartet' | 'music_for_strings';

/** George Gershwin Song Mode slice — Songbook AABA vs concert rhapsody vs rhythm-changes posture (`gershwinSlice.ts`). Default **`song_aaba`** when omitted. */
export type GershwinContextMode = 'song_aaba' | 'rhapsody' | 'rhythm_changes';

/** Arvo Pärt Song Mode slice — Fur Alina vs Spiegel im Spiegel vs Fratres posture (`arvoPartSlice.ts`). Default **`fur_alina`** when omitted. */
export type ArvoPartContextMode = 'fur_alina' | 'spiegel' | 'fratres';

/** Tintinnabuli T-voice placement vs M-voice (`arvoPartSlice.ts`). */
export type ArvoPartTintinnabuliPosition = 'above' | 'below' | 'alternating';

/** M1 = one T-voice line; M2 = simultaneous T above + T below (`arvoPartSlice.ts`). */
export type ArvoPartTintinnabuliVoiceMode = 'M1' | 'M2';

/** Optional tintinnabuli engine overrides — static triad field / progression bypass uses wash symbol (`arvoPartSlice.ts`). */
export interface ArvoPartTintinnabuliParams {
  triadRoot?: string;
  position?: ArvoPartTintinnabuliPosition;
  mode?: ArvoPartTintinnabuliVoiceMode;
  triadQuality?: 'major' | 'minor';
}

/** Erik Satie Song Mode slice — Gymnopédie vs Gnossienne vs cabaret “Piège” posture (`satieSlice.ts`). Default **`gymnopedie`** when omitted. */
export type SatieContextMode = 'gymnopedie' | 'gnossienne' | 'poire';

/** Prince Song Mode slice — Minneapolis funk/soul extended harmony posture (`princeSlice.ts`). Default **`purple_rain`** when omitted. */
export type PrinceContextMode = 'purple_rain' | 'sign_o_times' | 'kiss';

/** Herbie Hancock Song Mode slice — quartal modal pedal vs Headhunters funk vs VSOP (`herbieHancockSlice.ts`). Default **`modal`**. */
export type HancockPhase = 'modal' | 'funk' | 'vsop';

/** Wayne Shorter — functional + mediant insertions vs floating centres vs fusion vs late (`wayneShorterSlice.ts`). Default **`mid60s`**. */
export type ShorterPhase = 'hardbop+' | 'mid60s' | 'fusion' | 'late';

/** Andrew Hill — loose post-bop form vs modal cluster field (`andrewHillSlice.ts`). Default **`postbop_free`**. */
export type HillMode = 'postbop_free' | 'modal_cluster';

/** Jim Hall guitar comp slice — duo shell voicing vs fuller trio vs solo spread (`jimHallSlice.ts`). Default **`duo`**. */
export type JimHallMode = 'duo' | 'trio' | 'solo';

/** Steve Reich — pitch-field process engine (`steveReichSlice.ts`). Default **`phasing`**. */
export type SteveReichProcessMode = 'phasing' | 'additive' | 'cycle';

/** Olivier Messiaen — early vs middle vs late structural posture (`messiaenSlice.ts`). Seeded when omitted. */
export type MessiaenPeriodMode = 'early_messiaen' | 'middle_messiaen' | 'late_messiaen';

/** Bob Brookmeyer — chorus-based vs through-composed counterpoint posture (`bobBrookmeyerSlice.ts`). Seeded when omitted. */
export type BrookmeyerPeriodMode = 'early_brookmeyer' | 'late_brookmeyer';

/** Oliver Nelson — era posture (`oliverNelsonSlice.ts`). Seeded when omitted. */
export type NelsonPeriodMode = 'early_nelson' | 'middle_nelson' | 'late_nelson';

/** Oliver Nelson — minor blues cycle length vs Cascades-style 16-bar A (`oliverNelsonSlice.ts`). */
export type NelsonBluesFormVariant = 'twelve_bar' | 'sixteen_bar';

/** Thad Jones — big-band extended common-practice slice (`thadJonesSlice.ts`). Default **`swing`**. */
export type ThadJonesPhaseMode = 'swing' | 'ballad' | 'groove';

/** Joni Mitchell — sus/modal pitch-field slice (`joniMitchellSlice.ts`). Default **`folk_modal`**. */
export type JoniMitchellPhaseMode = 'folk_modal' | 'jazz_folk' | 'modal_jazz';

/** The Beatles Song Mode slice — Merseybeat vs Rubber Soul vs Abbey Road posture (`beatlesSlice.ts`). Default **`merseybeat_1962`** when omitted. */
export type BeatlesContextMode = 'merseybeat_1962' | 'rubber_soul_1965' | 'abbey_road_1968';

/**
 * Beatles macro-form scaffold (`songSectionPlanner.ts`, BT_FORM_01–02).
 * Default **`vv_br_v`** for primary **`beatles`** when omitted.
 */
export type BeatlesFormTemplateId = 'vv_br_v' | 'verse_chorus' | 'legacy_vc';

/**
 * Beatles Song Mode — melodic writer lens (`melodyBehaviourPlanner.ts`). Default **`blended`** when omitted.
 */
export type BeatlesMelodicLens = 'neutral' | 'lennon' | 'mccartney' | 'blended';

/** Fela Kuti Song Mode slice — Afrobeat era posture (`felaKutiSlice.ts`). Default **`zombie_1977`** when omitted. */
export type FelaKutiContextMode = 'zombie_1977' | 'water_no_get_enemy' | 'lady_1972';

/** Bernard Herrmann — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type BernardHerrmannContextMode = 'bh:thriller_mode' | 'bh:romantic_mode' | 'bh:minimal_pulse';

/** John Williams — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). Receipt prefix **`jwill:*`** (Jack White owns **`jw:*`**). */
export type JohnWilliamsContextMode = 'jwill:heroic_mode' | 'jwill:magic_mode' | 'jwill:drama_mode';

/** Ennio Morricone — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type EnnioMorriconeContextMode = 'em:spaghetti_mode' | 'em:lyric_mode' | 'em:serial_tension';

/** Nino Rota — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type NinoRotaContextMode = 'nr:waltz_mode' | 'nr:carnival_mode' | 'nr:godfather_mode';

/** Jerry Goldsmith — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type JerryGoldsmithContextMode = 'jg:action_mode' | 'jg:lyric_mode' | 'jg:suspense_mode';

/** Lalo Schifrin — groove-native jazz-Latin film slice (`laloSchifrinSlice.ts`). */
export type LaloSchifrinContextMode = 'ls:groove_mode' | 'ls:action_mode' | 'ls:jazz_latin_mode';

/** Philip Glass — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type PhilipGlassContextMode = 'pg:minimal_pulse' | 'pg:lyrical_minimal' | 'pg:dark_pedal';

/** Hans Zimmer — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type HansZimmerContextMode = 'hz:epic_mode' | 'hz:introspective_mode' | 'hz:tension_mode';

/** Angelo Badalamenti — film soundtrack harmony posture (`filmSoundtrackHarmonySlices.ts`). */
export type AngeloBadalamentiContextMode = 'ab:dream_pop' | 'ab:mystery_mode' | 'ab:romantic_dark';

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
  /** Resolved request harmony mode (duo slice vs Gate B `custom_locked`). */
  harmonyModeRequested?: 'builtin' | 'custom' | 'custom_locked';
  /** Short readable summary when `harmonySource` is custom */
  customChordProgressionSummary?: string;
  /** UI / request: built-in vs custom progression mode */
  progressionMode?: 'builtin' | 'custom';
  /** Raw user `chordProgressionText` when custom mode was requested (success or parse failure) */
  chordProgressionInputRaw?: string;
  /** SQ→BB: unparsed user chord timeline (`userChordInput` on request; Session 2 parses). */
  userChordInput?: string | null;
  /** SQ→BB: merged per-bar chord timeline (user + optional internal fill). */
  userChordTimeline?: import('./counterpoint/parseUserChordInput').MergedChordTimelineBar[] | null;
  /** SQ→BB: chord timeline authority — user, internal, or mixed. */
  chordTimelineSource?: import('./counterpoint/parseUserChordInput').SqToBbChordTimelineSource;
  /** SQ→BB: SQ harmonic voice picker (`null` = BB style-profile line default). */
  sqToBbSqComposer?: import('./counterpoint/sqToBbWorkflowTypes').SqToBbSqComposer;
  /** SQ→BB: VRB id used for contrapuntal line sketch / regen. */
  sqLineVrbId?: string;
  /** SQ→BB: section label mode for `sectionVrbMap` keys and pitch-field song guard. */
  sectionLabelMode?: import('./counterpoint/vrbProfiles/sqToBbSectionLabels').SqToBbSectionLabelMode;
  /** SQ→BB Messiaen pitch-field — limited-transposition mode (1–7; default 2). */
  messiaenModeId?: import('./harmony/pitchFieldSpineTypes').MessiaenModeId;
  /** SQ→BB: per-section VRB contexts keyed by canonical section label (Commit 3). */
  sqToBbVrbContextBySection?: Readonly<
    Record<string, import('./counterpoint/vrbProfiles/vrbContextMap').SectionVrbContext>
  >;
  /** Parsed one chord per bar when custom harmony was applied successfully */
  parsedCustomProgressionBars?: string[];
  /** Section-scoped regen: receipt when a fragment run was spliced into prior MusicXML. */
  sectionRegenerationReceipt?: string;
  /** Score model may reflect fragment bars only; skip full-score MIDI/drum guides when true. */
  sectionRegenerationPartialScore?: boolean;
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
  /** Song Mode / duo: conversational vs supportive (optional; omitted = no intent bias). */
  duoIntent?: 'conversational' | 'supportive';
  /** Duo golden-path: intent-specific register ownership applied to final guitar/bass score lanes. */
  duoIntentRegisterOwnershipPlan?: {
    intent: 'conversational' | 'supportive';
    guitarMelody: number[];
    guitarComp: number[];
    bassFoundation: number[];
    bassResponse: number[];
    receipt: string;
  };
  /** Duo golden-path: final velocity-only balance by product intent. */
  duoIntentVelocityBalanceReceipt?: {
    intent: 'conversational' | 'supportive';
    guitarMeanBefore: number;
    guitarMeanAfter: number;
    bassMeanBefore: number;
    bassMeanAfter: number;
    accompanimentDelta: number;
    receipt: string;
  };
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
  /** Per-bar ECM texture roles (GCE space/silence scorer). */
  ecmBarTexturePlan?: import('./ecm/ecmTextureEngine').EcmBarTexture[];
  /** Set when {@link applyEcmChamberPhraseEdgeSpaceToParts} runs on the duo score. */
  ecmPhraseEdgeSpaceApplied?: boolean;
  /** Guitar–Bass Duo: opt-in 32-bar long-form route (V4.0) */
  longFormDuo?: boolean;
  modulationPlanActive?: boolean;
  /** Explicit bar count when long-form or extended forms are used */
  totalBars?: number;
  /** Macro section goals (harmony pacing, motif treatment, energy/register) from `macroFormPlanner.planMacroForm`. */
  macroFormPlan?: MacroFormPlan;
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
  /** V31 — Clave grid overlay receipt when `COMPOSER_OS_CLAVE_GRID_OVERLAY` is on (applied or validation skip). */
  claveGridOverlayReceipt?: ClaveGridOverlayReceipt;
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
  /** Mosaic Mode — per-section songwriter routing (Step 1); 2+ entries enables duo mode in {@link resolveMosaicSectionStyles}. */
  mosaicSectionPlan?: Array<{
    sectionLabel: string;
    startBar: number;
    /** endBar is inclusive — last bar IN this section */
    endBar: number;
    songwriterStyleId: string;
    timeSignature?: {
      numerator: number;
      denominator: number;
    };
    phraseRole?: 'statement' | 'development' | 'climax' | 'release';
    /** Hook-first spine sections — post-finalize mosaic inject bypass is permanent when true. */
    spineProtected?: boolean;
    /** Section is Mosaic-dispatched (Song Mode → mosaic mapper). */
    mosaicOwned?: boolean;
    /** Tile inject may fire when true and {@link allowMosaicPostFinalizeInject} is on. */
    injectEligible?: boolean;
    /** INS-1 — ensemble realizer for this section (`duo` default when absent). */
    presetRole?: 'duo' | 'big_band' | 'string_quartet';
  }>;
  /** V82b+c — MusicXML deep-import section markers for Barry Harris section resolver. */
  musicXmlDeepImportSectionStarts?: Array<{ bar: number; label: string }>;
  /** Song Mode hook-first: lift mosaic post-finalize inject on eligible non-spine sections (default off). */
  allowMosaicPostFinalizeInject?: boolean;
  /** Mosaic Mode Step 3 — full-form merged effective harmony (one symbol per bar, bar 1 at index 0). */
  mosaicMergedHarmonyBars?: string[];
  /** Mosaic Mode Step 6 — per-section LOCK contracts (order-independent; one entry per section). */
  mosaicLockRegistry?: Array<{
    sectionLabel: string;
    startBar: number;
    endBar: number;
    composerId: string;
    expectedHarmonyBars: string[];
  }>;
  /** Mosaic Mode Step 7 — per-section GCE/style evaluation results (one profile per section). */
  mosaicSectionEvalResults?: Array<{
    sectionLabel: string;
    startBar: number;
    endBar: number;
    composerId: string;
    passed: boolean;
    scores: Record<string, number>;
    failures: string[];
  }>;
  /** Mosaic Mode Step 3 — global bar index (1-based) → section label from duo precompute orchestrator. */
  mosaicSectionOwnership?: Record<number, string>;
  /** Mosaic Mode motif MVP — seeded source cell independent of composer section. */
  mosaicSourceMotif?: CoreMotif | MotifShape;
  /** Mosaic Mode motif MVP — per-section transformed variants keyed by sectionLabel. */
  mosaicSectionMotifVariants?: Record<string, CoreMotif | MotifShape>;
  /** V80f — SQ mosaic contrapuntal soft-target guides keyed by sectionLabel. */
  mosaicSqContrapuntalGuides?: Record<
    string,
    import('./string-quartet/mosaicSqContrapuntalGuide').MosaicSqContrapuntalGuide
  >;
  /** Mosaic Mode motif MVP — pairwise section similarity diagnostics (non-blocking). */
  mosaicMotifSimilarityReceipts?: Array<{
    fromSection: string;
    toSection: string;
    similarity: number;
  }>;
  /** Mosaic Mode rc12 — section GCE retry outcome receipt when a failing section passes on retry. */
  mosaicSectionRetryReceipt?: string;
  /** INS-2 — stub realizer receipts from golden-path section router (INS-3 merges fragments). */
  mosaicSectionRealizationResults?: Array<{
    sectionLabel: string;
    startBar: number;
    endBar: number;
    presetRole: 'duo' | 'big_band' | 'string_quartet';
    stub?: boolean;
    activePartIds?: string[];
    partCount?: number;
  }>;
  /** V80a INS-3 — mixed-preset assembly ran (scoped late passes applied). */
  mixedPresetAssemblyApplied?: boolean;
  /** V80a — union part ids from assembled score registry. */
  assembledScoreRegistry?: string[];
  /** V80a — global bar index → section label ownership map. */
  assembledSectionOwnership?: Record<number, string>;
  /** String Quartet StylePanel — SQ rhythm engine id (`bartok_bulgarian_aksak`, `free_proportional`, `baroque_dance`, `reich_phasing_grid`, `viennese_waltz`, `jewish_klezmer`, …). */
  sqRhythmEngineId?: string;
  /** String Quartet — rhythm engine fingerprint receipts (`BG_RHYTHM_*`, …) for telemetry / eval. */
  sqRhythmEngineReceipts?: readonly string[];
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
  /** V80k IMP-4: full imported melody line retained for variation engine. */
  importMelodyLineFull?: import('./import/mosaicImportTimeline').ImportMelodyNote[];
  /** V80k IMP-4: evaluated import variation candidates (gated; default off). */
  variationResult?: import('./import/mosaicVariationEngine').VariationResult;
  /** V80m IMP-5: style-transfer result (pinned melody + slice harmony). */
  styleTransferResult?: import('./import/mosaicStyleTransfer').StyleTransferResult;
  /** V82a: preserveMelody flag from style-transfer request (default true when omitted). */
  styleTransferPreserveMelody?: boolean;
  /** V80m IMP-5: BB/SQ re-orchestration applied during style-transfer. */
  styleTransferReorchestrateApplied?: boolean;
  /** Song Mode: aggregated section shaping metrics for manifests, UI notes, and eval harnesses. */
  songModeSectionShapingDiagnostics?: SongModeSectionShapingDiagnosticsV1;
  /** V65 P4 — opt-in section-aware symbolic drum accompaniment diagnostics. */
  grooveScaffoldDiagnostics?: GrooveScaffoldDiagnostics;
  /** V65 P4 — compact manifest receipt for the groove scaffold pass. */
  grooveScaffoldReceipt?: string;
  /** V65 P4 — GROOVE_* receipt ids active for this run. */
  grooveScaffoldReceipts?: string[];
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
  /** Songwriter profile: harmony colour bias (0–1). */
  songwriterHarmonyColourBias?: number;
  /** Songwriter profile: section contrast (0–1). */
  songwriterSectionContrast?: number;
  /** Songwriter profile: hook return variation (0–1). */
  songwriterHookReturnVariation?: number;
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
    /** BW_HARM_01–10 pattern tags from `brianWilsonPetSoundsSlice.ts`. */
    harmonicGrammarReceipts?: string[];
    /** BW_VL_01–06 voice-leading / texture tags from `brianWilsonPetSoundsSlice.ts`. */
    voiceLeadingGrammarReceipts?: string[];
    /** BW_MEL_01–05 melodic planning tags from `brianWilsonPetSoundsSlice.ts`. */
    melodicGrammarReceipts?: string[];
    /** BW_RHYTHM_01–04 rhythm / ensemble timing tags from `brianWilsonPetSoundsSlice.ts`. */
    rhythmGrammarReceipts?: string[];
    /** BW_ORCH_01–05 studio orchestration tags from `brianWilsonPetSoundsSlice.ts`. */
    orchestrationGrammarReceipts?: string[];
    /** BW_FP_01–03 composite fingerprint tags from `brianWilsonPetSoundsSlice.ts`. */
    fingerprintReceipts?: string[];
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
  /** Brian Wilson BW_HARM research grammar receipts (`bw:harmNN_*` in `brianWilsonPetSoundsSlice.ts`). */
  brianWilsonHarmonicGrammarReceipts?: string[];
  /** Brian Wilson BW_VL research receipts (`bw:vlNN_*` in `brianWilsonPetSoundsSlice.ts`). */
  brianWilsonVoiceLeadingGrammarReceipts?: string[];
  /** Brian Wilson BW_MEL research receipts (`bw:melNN_*` in `brianWilsonPetSoundsSlice.ts`). */
  brianWilsonMelodicGrammarReceipts?: string[];
  /** Brian Wilson BW_RHYTHM research receipts (`bw:rhythmNN_*` in `brianWilsonPetSoundsSlice.ts`). */
  brianWilsonRhythmGrammarReceipts?: string[];
  /** Optional structural collective-ritard cue bars (section pivots); metadata only unless exporter consumes. */
  brianWilsonStructuralRitardHints?: number[];
  /** Brian Wilson BW_ORCH research receipts (`bw:orchNN_*` in `brianWilsonPetSoundsSlice.ts`). */
  brianWilsonOrchestrationGrammarReceipts?: string[];
  /** Pet Sounds modular section-assembly posture (BW_ORCH_04); hints compound tracking / splices for formal generator. */
  brianWilsonFormalThroughComposeAssembly?: boolean;
  /** Brian Wilson BW_FP composite receipts (`bw:fpNN_*` in `brianWilsonPetSoundsSlice.ts`) when full bundle gates align. */
  brianWilsonFingerprintReceipts?: string[];
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
    /** RH_HARM_01 — Pablo Honey/Bends vs OK Computer/Kid A vs In Rainbows / Moon Shaped Pool emphasis. */
    harmonicPeriod?: 'early' | 'middle' | 'late';
    /** RH_HARM_01 — primary harmonic system for this seed (others remain eligible at lower weight). */
    harmonicPrimarySystem?: 'functional_tonal' | 'functional_modal' | 'contrapuntal_keyboard';
    /** RH_VL_01–RH_VL_06 — voice-leading / texture tags (`rh:vlNN_*`, `radioheadSlice.ts`). */
    voiceLeadingGrammarReceipts?: string[];
    /** RH_MEL_* — melodic grammar (`rh:melNN_*`, `melodyBehaviourPlanner.ts`). */
    melodicGrammarReceipts?: string[];
    /** RH_MEL_05 — acoustic vs electronic melodic posture. */
    radioheadMelodicContext?: 'acoustic' | 'electronic';
    /** RH_RHYTHM_* — rhythmic grammar (`rh:rhythmNN_*`). */
    rhythmGrammarReceipts?: string[];
    /** RH_ORCH_* — orchestration grammar (`rh:orchNN_*`). */
    orchestrationGrammarReceipts?: string[];
    /** RH_FP_01–03 — composite fingerprint component + full lines (`rh:fpNN_*`). */
    fingerprintReceipts?: string[];
    /** Named harmonic device receipts for this run (e.g. `rh:device1:...`). */
    deviceReceipts?: string[];
  };
  /** One-line digest for manifests / dev inspector when the Radiohead slice ran. */
  radioheadSliceReceipt?: string;
  /** Duo golden path: effective one chord per bar after Radiohead harmonic devices. */
  radioheadEffectiveHarmonyBars?: string[];
  /** RH_HARM_01 — deterministic era gate for Radiohead harmonic emphasis (`radioheadSlice`). */
  radioheadHarmonicPeriod?: 'early' | 'middle' | 'late';
  /** RH_HARM_01 — primary system aligned with {@link GenerationMetadata.radioheadHarmonicPeriod}. */
  radioheadHarmonicPrimarySystem?: 'functional_tonal' | 'functional_modal' | 'contrapuntal_keyboard';
  /** RH_VL_* pattern tags (flattened; mirrors {@link GenerationMetadata.radioheadDiagnostics}.voiceLeadingGrammarReceipts). */
  radioheadVoiceLeadingGrammarReceipts?: string[];
  /** RH_MEL_* pattern tags (flattened). */
  radioheadMelodicGrammarReceipts?: string[];
  /** RH_MEL_05 — optional request override or resolved posture after {@link planMelodyBehaviour}. */
  radioheadMelodicContext?: 'acoustic' | 'electronic';
  /** RH_RHYTHM_* pattern tags (flattened). */
  radioheadRhythmGrammarReceipts?: string[];
  /** RH_RHYTHM_01 — Pablo Honey/Bends posture: suppress odd-meter generator options. */
  radioheadRhythmEarlyPeriodBackbeat?: boolean;
  /** RH_RHYTHM_02–05 — middle/late asymmetric-meter / polyrhythm / layer tooling eligible. */
  radioheadRhythmAsymmetricFeaturesEligible?: boolean;
  /** RH_ORCH_* pattern tags (flattened). */
  radioheadOrchestrationGrammarReceipts?: string[];
  /** RH_ORCH_01 — gated instrumentation palette from harmonic period. */
  radioheadOrchestrationPalette?: 'core_band' | 'core_plus_electronics' | 'strings_plus_electronics';
  /** RH_ORCH_05 — optional microtonal guitar path eligible this seed. */
  radioheadMicrotonalGuitarEligible?: boolean;
  /** RH_FP_01–03 — harmonic + rhythmic + orchestral fingerprint receipts (flattened). */
  radioheadFingerprintReceipts?: string[];
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
    shorterResolvedPhase?: ShorterPhase;
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
      chromaticWedgeRate: number;
      pitchCentreAnchorBias: number;
      defaultPhase: ShorterPhase;
    };
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
  /** Wayne Shorter — WS_HARM_01–06 VRB harmonic fingerprint lines (echo of `WAYNE_SHORTER_WS_HARM_FINGERPRINTS`). */
  wayneShorterHarmFingerprintReceipts?: readonly string[];
  /** Wayne Shorter — WS_MEL_01–04 VRB melodic fingerprint lines (echo of `WAYNE_SHORTER_WS_MEL_FINGERPRINTS`). */
  wayneShorterMelFingerprintReceipts?: readonly string[];
  /** Wayne Shorter — WS_RHYTHM_01–03 VRB rhythm fingerprint lines (echo of `WAYNE_SHORTER_WS_RHYTHM_FINGERPRINTS`). */
  wayneShorterRhythmFingerprintReceipts?: readonly string[];
  /** Wayne Shorter — WS_FORM_01–02 VRB form/orchestration fingerprint lines (echo of `WAYNE_SHORTER_WS_FORM_FINGERPRINTS`). */
  wayneShorterFormFingerprintReceipts?: readonly string[];
  /** Wayne Shorter — WS_FP_01–03 composite fingerprint lines (echo of `WAYNE_SHORTER_WS_FP_FINGERPRINTS`). */
  wayneShorterFpFingerprintReceipts?: readonly string[];
  /** Wayne Shorter — runtime harmonic grammar tags (`WS_HARM_*`) from `applyWayneShorterHarmonicGrammarReceipts`. */
  wayneShorterHarmonicGrammarReceipts?: readonly string[];
  /** Wayne Shorter — runtime melodic grammar tags (`WS_MEL_*`) from `applyWayneShorterMelodicGrammarReceipts`. */
  wayneShorterMelodicGrammarReceipts?: readonly string[];
  /** Wayne Shorter — runtime rhythm grammar tags (`WS_RHYTHM_*`) from `applyWayneShorterRhythmGrammarReceipts`. */
  wayneShorterRhythmGrammarReceipts?: readonly string[];
  /** Wayne Shorter — runtime form/orchestration grammar tags (`WS_FORM_*`) from `applyWayneShorterFormGrammarReceipts`. */
  wayneShorterFormGrammarReceipts?: readonly string[];
  /** Wayne Shorter — composite FP gate firings (`WS_FP_*`) from `applyWayneShorterFingerprintReceipts`. */
  wayneShorterFingerprintReceipts?: readonly string[];
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
  /** V65 P5 — promoted differentiator receipts active at runtime (`FZ_DIFF_01`, `FZ_DIFF_02`). */
  frankZappaDiffReceipts?: string[];
  /** V65 P5 — per-section Zappa density/register/style-boundary behavior diagnostics. */
  zappaSectionBehaviorBySection?: Record<
    string,
    {
      label: string;
      bars: number[];
      meanDensityScalar: number;
      meanRegisterShiftSemitones: number;
      structuralContrastBars: number[];
      styleBoundaryBars: number[];
      receipts: string[];
    }
  >;
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
  /** Frank Zappa — GCE / Slonimsky duo lane (`gceGate.ts`). Default **`compositional`**. */
  zappaStyleMode?: ZappaStyleMode;
  /** Frank Zappa riff solo — era cell map (`zappaRiffSoloParams.ts`). */
  zappaEraPreset?: ZappaEraPreset;
  zappaPhraseCharacter?: ZappaPhraseCharacter;
  zappaSymmetryBias?: ZappaSymmetryBias;
  zappaChainDepth?: ZappaChainDepth;
  /** Z7 — Slonimsky cell → harmonic scene voicing colour receipts (compositional Zappa). */
  slonimskyHarmonicSceneReceipts?: string[];
  /** Z8 — guitar–bass duo Slonimsky cell selection receipts. */
  slonimskyGbdCellReceipts?: string[];
  /** Z9 — song-mode Slonimsky cell selection receipts. */
  slonimskySongModeCellReceipts?: string[];
  /** Per-section VRB marker wiring receipt (e.g. sonic_youth A/B Slonimsky switch). */
  sectionVrbMarkerReceipt?: string;
  /** Z10/Z11 — ensemble Slonimsky cell receipts (SQ / BB). */
  slonimskyEnsembleCellReceipts?: string[];
  /** Context-specific synthetic / modal scale weights for manifests (honest bias labels only). */
  frankZappaSyntheticScaleBias?: Record<string, number>;
  /** Per-bar density bias (0–1) from Zappa density arc; refined after hard-cut resets in precompute. */
  frankZappaDensityBiasByBar?: number[];
  /** Bars where hard-cut triggers fired (1-based). */
  frankZappaHardCutTriggerBars?: number[];
  /** GCE structural fingerprint — generation pass applied (compositional mode). */
  zappaGceStructuralFingerprintApplied?: boolean;
  /** GCE structural — probabilistic register swap threshold (from fingerprint). */
  zappaGceRegisterShiftProbability?: number;
  /** GCE structural — bars where register swap fired (1-based). */
  zappaGceRegisterShiftBars?: number[];
  /** GCE structural — absurdist section surface kinds (march / ballad / …). */
  zappaSectionKindSequence?: readonly string[];
  /** True when barMeterMap was auto-spliced from GCE fingerprint (not request-level). */
  zappaGceAutoBarMeterMap?: boolean;
  /** P6 — Song schema section meter merged into barMeterMap. */
  sectionMeterApplied?: boolean;
  /** V65 P1 — Song schema bridged to FormMap + effective context active. */
  sectionArchitectureWired?: boolean;
  /** V65 P1 — Song document id when wired. */
  songId?: string;
  /** V65 P1 — Song schemaVersion when wired. */
  songSchemaVersion?: number;
  /** P6 — Zappa GCE meter mode used when auto meter enabled. */
  zappaGceMeterMode?: 'disrupt' | 'respect' | 'own';
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
  /** V82b+c — chord-melody precompute stash (engine-internal; not API-echoed). */
  barryHarrisChordMelodyFoundation?: import('./barry-harris/types').BarryHarrisChordMelodyFoundation;
  /** V82e — identity-resolved note choices + block voicing hints (engine-internal). */
  barryHarrisResolvedNotes?: import('./barry-harris/types').ResolvedChordMelodyNote[];
  /** V82f — per-note `bh:cm:*` chord-melody observability receipts. */
  barryHarrisChordMelodyReceipts?: string[];
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
    /** DB_FORM_03 — early / middle / late programme gate (`debussySlice.ts`). */
    programPeriod?: 'early' | 'middle' | 'late';
    /** DB_FORM_* tags (`db:form*`) alongside harmony `db:*` device strings. */
    formReceipts?: string[];
    /** DB_ORCH_* tags (`db:orch*`). */
    orchestrationReceipts?: string[];
    /** DB_ORCH_07 — optional wordless vocal layer as orchestral colour. */
    vocalColourOrchestral?: boolean;
    /** DB_FP_01–04 composite fingerprint tags (`db:fp*`). */
    fingerprintReceipts?: string[];
  };
  debussySliceReceipt?: string;
  debussyEffectiveHarmonyBars?: string[];
  debussyDeviceReceipts?: string[];
  /** DB_FORM_03 — mirrored for manifest / LOCK consumers. */
  debussyProgramPeriod?: 'early' | 'middle' | 'late';
  /** DB_FORM_01–05 — formal encoding receipts (`applyDebussyFormEncoding`). */
  debussyFormReceipts?: string[];
  /** DB_ORCH_01–07 — orchestration encoding receipts (`applyDebussyOrchestrationEncoding`). */
  debussyOrchestrationReceipts?: string[];
  /** DB_ORCH_07 — when true, wordless vocal colour layer is staged for downstream orchestration hints. */
  debussyVocalColourOrchestral?: boolean;
  /** DB_FP_01–04 — composite fingerprint receipts (`finalizeDebussyMetadata`). */
  debussyFingerprintReceipts?: string[];
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
  /** Billy Strayhorn — chromatic song-form / extended-tone fusion slice (`billyStrayhornSlice.ts`). */
  billyStrayhornDiagnostics?: {
    songwriterId: 'billy_strayhorn';
    barsConsidered: number;
    extensionTouches: number;
    chromaticTouches: number;
    parallelColorTouches: number;
    innerVoiceTouches: number;
    chromaticArchitectureCount?: number;
    sliceParams?: BillyStrayhornSliceParams;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bareMajorRaised: number;
    };
    deviceReceipts?: string[];
  };
  billyStrayhornSliceReceipt?: string;
  billyStrayhornEffectiveHarmonyBars?: string[];
  billyStrayhornDeviceReceipts?: string[];
  billyStrayhornAntiElaborationGuards?: {
    bareMajorRaised: number;
  };
  billyStrayhornSliceParams?: BillyStrayhornSliceParams;
  /** Bars with sustained closed-block texture (1-based). */
  strayhornClosedBlockBars?: number[];
  /** Thad Jones Song Mode slice posture (`thadJonesSlice.ts`). Default **`swing`** when omitted. */
  thadPhase?: ThadJonesPhaseMode;
  /** Effective Thad phase after resolve. */
  thadResolvedPhase?: ThadJonesPhaseMode;
  thadJonesDiagnostics?: {
    songwriterId: 'thad_jones';
    thadResolvedPhase?: ThadJonesPhaseMode;
    sliceParameters?: {
      nonachordBias: number;
      sideSlipRate: number;
      shoutAlterationMultiplier: number;
      bluesInflectionBias: number;
      defaultPhase: ThadJonesPhaseMode;
    };
    barsConsidered: number;
    nonachordTouches: number;
    shoutTouches: number;
    dominantAlterTouches: number;
    deviceReceipts?: string[];
  };
  thadJonesSliceReceipt?: string;
  thadJonesEffectiveHarmonyBars?: string[];
  thadJonesDeviceReceipts?: string[];
  /** Shout region bars (1-based), big-band vertical density. */
  thadJonesShoutBars?: number[];
  /** Joni Mitchell Song Mode slice posture (`joniMitchellSlice.ts`). Default **`folk_modal`** when omitted. */
  joniPhase?: JoniMitchellPhaseMode;
  joniResolvedPhase?: JoniMitchellPhaseMode;
  /** Melody-first harmony anchor (`JONI_MITCHELL_SLICE_PARAMETERS`). */
  pitchFieldAnchor?: boolean;
  /** Pedal common-tone emulation across changes. */
  openStringSimulation?: boolean;
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
  bernardHerrmannContext?: BernardHerrmannContextMode;
  bernardHerrmannDiagnostics?: {
    songwriterId: 'bernard_herrmann';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  bernardHerrmannSliceReceipt?: string;
  bernardHerrmannEffectiveHarmonyBars?: string[];
  bernardHerrmannDeviceReceipts?: string[];
  johnWilliamsContext?: JohnWilliamsContextMode;
  johnWilliamsDiagnostics?: {
    songwriterId: 'john_williams';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  johnWilliamsSliceReceipt?: string;
  johnWilliamsEffectiveHarmonyBars?: string[];
  johnWilliamsDeviceReceipts?: string[];
  ennioMorriconeContext?: EnnioMorriconeContextMode;
  ennioMorriconeDiagnostics?: {
    songwriterId: 'ennio_morricone';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  ennioMorriconeSliceReceipt?: string;
  ennioMorriconeEffectiveHarmonyBars?: string[];
  ennioMorriconeDeviceReceipts?: string[];
  ninoRotaContext?: NinoRotaContextMode;
  ninoRotaDiagnostics?: {
    songwriterId: 'nino_rota';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  ninoRotaSliceReceipt?: string;
  ninoRotaEffectiveHarmonyBars?: string[];
  ninoRotaDeviceReceipts?: string[];
  jerryGoldsmithContext?: JerryGoldsmithContextMode;
  jerryGoldsmithDiagnostics?: {
    songwriterId: 'jerry_goldsmith';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  jerryGoldsmithSliceReceipt?: string;
  jerryGoldsmithEffectiveHarmonyBars?: string[];
  jerryGoldsmithDeviceReceipts?: string[];
  laloSchifrinContext?: LaloSchifrinContextMode;
  laloSchifrinDiagnostics?: {
    songwriterId: 'lalo_schifrin';
    barsConsidered: number;
    oddMeterTouches?: number;
    percussionTouches?: number;
    brassTouches?: number;
    modalTouches?: number;
    motivicTouches?: number;
    sliceParams?: LaloSchifrinSliceParams;
    deviceReceipts?: string[];
  };
  laloSchifrinSliceParams?: LaloSchifrinSliceParams;
  laloSchifrinSliceReceipt?: string;
  laloSchifrinEffectiveHarmonyBars?: string[];
  laloSchifrinDeviceReceipts?: string[];
  philipGlassContext?: PhilipGlassContextMode;
  philipGlassDiagnostics?: {
    songwriterId: 'philip_glass';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  philipGlassSliceReceipt?: string;
  philipGlassEffectiveHarmonyBars?: string[];
  philipGlassDeviceReceipts?: string[];
  hansZimmerContext?: HansZimmerContextMode;
  hansZimmerDiagnostics?: {
    songwriterId: 'hans_zimmer';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  hansZimmerSliceReceipt?: string;
  hansZimmerEffectiveHarmonyBars?: string[];
  hansZimmerDeviceReceipts?: string[];
  angeloBadalamentiContext?: AngeloBadalamentiContextMode;
  angeloBadalamentiDiagnostics?: {
    songwriterId: 'angelo_badalamenti';
    barsConsidered: number;
    deviceReceipts?: string[];
  };
  angeloBadalamentiSliceReceipt?: string;
  angeloBadalamentiEffectiveHarmonyBars?: string[];
  angeloBadalamentiDeviceReceipts?: string[];
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
  /**
   * Alban Berg — Song Mode slice posture (`bergSlice.ts`). Default **`middle_berg`** when omitted.
   */
  bergStyleMode?: BergStyleMode;
  /** Alban Berg — twelve-tone / derived-row diagnostics (`bergSlice.ts`). */
  bergDiagnostics?: {
    songwriterId: 'berg';
    barsConsidered: number;
    alteredTouches: number;
    chromaticTouches: number;
    deviceReceipts?: string[];
  };
  bergSliceReceipt?: string;
  bergEffectiveHarmonyBars?: string[];
  bergDeviceReceipts?: string[];
  bergRowPrimePcs?: number[];
  bergPreferredTransform?: 'P' | 'R' | 'I' | 'RI';
  bergRowIc16Score?: number;
  bergSharedTrichordIndex?: BergTrichordIndexEntry[];
  bergClimaxPlan?: BergClimaxPlan;
  bergStructuralSilences?: BergSilenceTag[];
  /** Sammy Nestico — Basie-school chart clarity (`sammyNesticoSlice.ts`). */
  sammyNesticoDiagnostics?: {
    songwriterId: 'sammy_nestico';
    barsConsidered: number;
    dominantTouches: number;
    extensionTouches: number;
    deviceReceipts?: string[];
  };
  sammyNesticoSliceReceipt?: string;
  sammyNesticoEffectiveHarmonyBars?: string[];
  sammyNesticoDeviceReceipts?: string[];
  /** Bob Brookmeyer — quartal counterpoint (`bobBrookmeyerSlice.ts`). */
  bobBrookmeyerDiagnostics?: {
    songwriterId: 'bob_brookmeyer';
    barsConsidered: number;
    quartalTouches: number;
    alteredTouches: number;
    pitchModuleReceiptTouches?: number;
    episodeReceiptTouches?: number;
    deviceReceipts?: string[];
  };
  bobBrookmeyerSliceReceipt?: string;
  bobBrookmeyerEffectiveHarmonyBars?: string[];
  bobBrookmeyerDeviceReceipts?: string[];
  /** Brookmeyer — resolved programme period (`bobBrookmeyerSlice.ts`). */
  brookmeyerPeriodMode?: BrookmeyerPeriodMode;
  brookmeyerPeriodModeResolved?: BrookmeyerPeriodMode;
  /** 3-note generative pitch-class module (0–11); harmony tinted toward these PCs. */
  activePitchModule?: readonly [number, number, number];
  brookmeyerActivePitchModule?: readonly [number, number, number];
  brookmeyerActivePitchModuleNames?: readonly string[];
  brookmeyerSoloPermitted?: boolean;
  brookmeyerSoloGateThresholdEpisodes?: number;
  brookmeyerLineFirstHierarchy?: boolean;
  /** When true, voice-leading solver relaxes parallel-motion penalties so harmony yields to line (`voiceLeadingSolver.ts`). */
  lineFirstHierarchy?: boolean;
  /** Line-first SATB plan from {@link precomputeContrapuntalLines} (before effective-harmony-bar precompute). */
  contrapuntalLineSet?: AbstractLineSet;
  /** Pass 4 — empty-bar fills from contrapuntal SQ / BB overlay into exported MusicXML score. */
  contrapuntalLineMusicXmlMergeReceipt?: import('./counterpoint/contrapuntalPass4MusicXmlMerge').ContrapuntalLineMusicXmlMergeReceipt;
  /** Phase 6 — wired {@link applyPhase6RendererWiring} soli/backgrounds + phrase render (`bigBandSectionPlanRenderer.ts`). */
  bigBandVoicing?: import('./counterpoint/ContrapuntalLineEngine').BigBandVoicing;
  bigBandSectionRender?: import('./composer/bigBandSectionPlanRenderer').BigBandSectionRenderOutput;
  /** SQ→BB sketch density — meso quantizer threshold (`sparse` | `medium` | `dense`). */
  sqToBbDensity?: import('./counterpoint/sqToBbWorkflowTypes').SqToBbDensity;
  /** SQ→BB Light Touch — cap doublings / thin inner voices on BB section render. */
  bbLightTouch?: boolean;
  /** SQ→BB Phase A — Gate 1 (Melodic Identity + Phrase Grammar) after contrapuntal precompute. */
  sqBbGceGate1?: import('./counterpoint/sqToBbGceGates').SqBbGceGate1Record;
  /** When Gate 1 fails after DCR refine — skip {@link wireBigBandSectionRendererOnContext}. */
  sqBbGceGate1BlockedRenderer?: boolean;
  /** SQ→BB Phase A — Gate 2 (Arrangement + Economy) after BB renderer wiring. */
  sqBbGceGate2?: import('./counterpoint/sqToBbGceGates').SqBbGceGate2Record;
  /** Duo line-first — strong-beat co-onset displacement receipts (`duoAbstractLineWiring.ts`). */
  duoLineFirstRhythmReceipts?: string[];
  brookmeyerContrapuntalLineCount?: number;
  contrapuntalLineCount?: number;
  brookmeyerEpisodePlanSummary?: string;
  brookmeyerEraShort?: 'early' | 'late';
  /** Clare Fischer — dense Latin harmony (`clareFischerSlice.ts`). */
  clareFischerDiagnostics?: {
    songwriterId: 'clare_fischer';
    barsConsidered: number;
    clusterTouches: number;
    latinGrooveHints: number;
    deviceReceipts?: string[];
  };
  clareFischerSliceReceipt?: string;
  clareFischerEffectiveHarmonyBars?: string[];
  clareFischerDeviceReceipts?: string[];
  /** Oliver Nelson — blues-functional arranging (`oliverNelsonSlice.ts`). */
  oliverNelsonDiagnostics?: {
    songwriterId: 'oliver_nelson';
    barsConsidered: number;
    bluesTouches: number;
    modalTouches: number;
    deviceReceipts?: string[];
  };
  oliverNelsonSliceReceipt?: string;
  oliverNelsonEffectiveHarmonyBars?: string[];
  oliverNelsonDeviceReceipts?: string[];
  /** Oliver Nelson — resolved programme period (`oliverNelsonSlice.ts`). */
  nelsonPeriodMode?: NelsonPeriodMode;
  nelsonPeriodModeResolved?: NelsonPeriodMode;
  /** Pitch class (0–11) of sustained pedal root (`oliverNelsonSlice.ts`). */
  activePedal?: number;
  /** Upper maj7 colours over minor pedal (symbol roots, not slash bass). */
  upperModalChords?: readonly [string, string];
  nelsonBluesFormVariant?: NelsonBluesFormVariant;
  nelsonBluesFormVariantResolved?: NelsonBluesFormVariant;
  /** Head/modal layer vs 12-bar minor blues solo layer (`oliverNelsonSlice.ts`). */
  nelsonTwoLayerForm?: boolean;
  oliverNelsonEpisodePlanSummary?: string;
  /** Quincy Jones — crossover brass arranging (`quincyJonesSlice.ts`). */
  quincyJonesDiagnostics?: {
    songwriterId: 'quincy_jones';
    barsConsidered: number;
    soulTouches: number;
    swingTouches: number;
    orchestralTouches: number;
    deviceReceipts?: string[];
  };
  quincyJonesSliceReceipt?: string;
  quincyJonesEffectiveHarmonyBars?: string[];
  quincyJonesDeviceReceipts?: string[];
  /** Don Sebesky — CTI production-orchestra slice (`donSebeskySlice.ts`). */
  donSebeskyDiagnostics?: {
    songwriterId: 'don_sebesky';
    barsConsidered: number;
    functionalTouches: number;
    extensionTouches: number;
    stringHaloTouches: number;
    liftTouches: number;
    sliceParams?: DonSebeskySliceParams;
    deviceReceipts?: string[];
  };
  donSebeskySliceReceipt?: string;
  donSebeskyEffectiveHarmonyBars?: string[];
  donSebeskyDeviceReceipts?: string[];
  donSebeskySliceParams?: DonSebeskySliceParams;
  donSebeskyProductionSections?: SebeskyProductionSection[];
  donSebeskyLiftEventCount?: number;
  /** Johnny Mandel — melody-forward Studio Orchestral warmth slice (`johnnyMandelSlice.ts`, receipts `jmd:*`). */
  johnnyMandelDiagnostics?: {
    songwriterId: 'johnny_mandel';
    barsConsidered: number;
    extensionTouches: number;
    innerWarmthTouches: number;
    borrowedIvTouches: number;
    softenedCadenceTouches: number;
    brassCushionTouches: number;
    minPhraseSpan?: number;
    sliceParams?: JohnnyMandelSliceParams;
    deviceReceipts?: string[];
  };
  mandelLyricWarmthPlan?: MandelLyricWarmthPlan;
  johnnyMandelSliceParams?: JohnnyMandelSliceParams;
  johnnyMandelSliceReceipt?: string;
  johnnyMandelEffectiveHarmonyBars?: string[];
  johnnyMandelDeviceReceipts?: string[];
  /** John Barry — thematic monolith Film slice (`johnBarrySlice.ts`, receipts `jbr:*`). */
  johnBarryDiagnostics?: {
    songwriterId: 'john_barry';
    barsConsidered: number;
    thematicMonolithTouches: number;
    bondPaletteTouches: number;
    brassPolarityTouches: number;
    melodicNobilityTouches: number;
    climaxTouches: number;
    minPhraseSpan?: number;
    sliceParams?: JohnBarrySliceParams;
    deviceReceipts?: string[];
  };
  barryThematicMonolithPlan?: BarryThematicMonolithPlan;
  johnBarrySliceParams?: JohnBarrySliceParams;
  johnBarrySliceReceipt?: string;
  johnBarryEffectiveHarmonyBars?: string[];
  johnBarryDeviceReceipts?: string[];
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
  /** Tintinnabuli dual-voice params (`arvoPartSlice.ts`). */
  arvoPartTintinnabuli?: ArvoPartTintinnabuliParams;
  /**
   * Duo golden-path only: holds harmony diagnostics accumulator until real tintinnabuli notes are merged (`arvoPartSlice.ts`).
   */
  arvoPartHarmonyAccumulatorHold?: { barsConsidered: number; pedalTouches: number };
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
    harmonicGrammarReceipts?: string[];
    voiceLeadingGrammarReceipts?: string[];
    rhythmGrammarReceipts?: string[];
    formGrammarReceipts?: string[];
    fingerprintReceipts?: string[];
  };
  beatlesSliceReceipt?: string;
  beatlesEffectiveHarmonyBars?: string[];
  beatlesDeviceReceipts?: string[];
  /** Pattern tags **`bt:harmNN_*`** from `beatlesSlice.ts` (Beatles major-key grammar / BT_HARM). */
  beatlesHarmonicGrammarReceipts?: string[];
  /** Pattern tags **`bt:vlNN_*`** — Beatles voice-leading / texture grammar (BT_VL). */
  beatlesVoiceLeadingGrammarReceipts?: string[];
  /** Pattern tags **`bt:rhythmNN_*`** — Beatles rhythm / metric grammar (BT_RHYTHM). */
  beatlesRhythmGrammarReceipts?: string[];
  /**
   * Beatles BT_RHYTHM_03 — late era: odd-meter / polyrhythm metadata permissive mode (Abbey posture).
   */
  beatlesLateRhythmConstraintRelaxed?: boolean;
  /** Pattern tags **`bt:formNN_*`** — Beatles macro-form grammar (BT_FORM). */
  beatlesFormGrammarReceipts?: string[];
  /** BT_FORM_05 — late collage / through-composed posture flag (Abbey era). */
  beatlesCollageThroughComposedHint?: boolean;
  /**
   * Beatles Song Mode slice mode (`beatlesSlice.ts`). Default **`merseybeat_1962`** when omitted.
   */
  beatlesContext?: BeatlesContextMode;
  /**
   * Beatles macro-form template (`songSectionPlanner.ts`). Default **`vv_br_v`** when primary is **`beatles`** and omitted.
   */
  beatlesFormTemplate?: BeatlesFormTemplateId;
  /** Beatles BT_FP_04 — Lennon / McCartney / blended writer lens (`melodyBehaviourPlanner.ts`). */
  beatlesMelodicLens?: BeatlesMelodicLens;
  /** Beatles BT_FP_01–04 — consolidated fingerprint receipts (`beatlesSlice.ts`). */
  beatlesFingerprintReceipts?: string[];
  /** Fela Kuti — Afrobeat static-vamp / call-response harmony (`felaKutiSlice.ts`). */
  felaKutiDiagnostics?: {
    songwriterId: 'fela_kuti';
    barsConsidered: number;
    minorSeventhVampTouches: number;
    flatSevenDominantTouches: number;
    fourDominantTouches: number;
    flatThreeMajorColourTouches: number;
    deviceReceipts?: string[];
    yorubaPentatonicDegrees?: readonly string[];
  };
  felaKutiSliceReceipt?: string;
  felaKutiEffectiveHarmonyBars?: string[];
  felaKutiDeviceReceipts?: string[];
  /** Yoruba pentatonic degree labels for melody planners (1,2,♭3,4,5,6,♭7). */
  felaKutiYorubaPentatonicDegrees?: readonly string[];
  /**
   * Fela Kuti Song Mode slice mode (`felaKutiSlice.ts`). Default **`zombie_1977`** when omitted.
   */
  felaKutiContext?: FelaKutiContextMode;
  /**
   * Percussion staff feel for Tony Allen grids (`afrobeatRhythmEngine.ts`) — receipt **`fk:*`** (`felaKutiSlice.ts`).
   */
  felaPercussionFeelTag?: 'fk:straight' | 'fk:swing' | 'fk:afrobeat';
  /**
   * Song Mode UI / API — fixed drum grid; overrides posture→feel mapping (`felaKutiSlice.ts`).
   */
  felaPercussionFeelOverride?: 'straight' | 'swing' | 'afrobeat';
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
  /** Kenny Wheeler — polyaxial lyrical ECM slice (`wheelerLyricSlice.ts`). */
  kennyWheelerDiagnostics?: {
    songwriterId: 'kenny_wheeler';
    barsConsidered: number;
    upperStructureTouches: number;
    tensionCarryTouches: number;
    colorToneTouches: number;
    openCadenceTouches: number;
    bassMotionTouches: number;
    sliceParams?: KennyWheelerSliceParams;
    antiElaborationGuardTriggers: number;
    antiElaborationGuards?: {
      bareTriadRaised: number;
      dominantSoftened: number;
    };
    deviceReceipts?: string[];
  };
  kennyWheelerSliceReceipt?: string;
  kennyWheelerEffectiveHarmonyBars?: string[];
  kennyWheelerDeviceReceipts?: string[];
  kennyWheelerAntiElaborationGuards?: {
    bareTriadRaised: number;
    dominantSoftened: number;
  };
  kennyWheelerSliceParams?: KennyWheelerSliceParams;
  /** Gil Evans — cool modal / orchestral colour slice (`gilEvansSlice.ts`). */
  gilEvansDiagnostics?: {
    songwriterId: 'gil_evans';
    barsConsidered: number;
    modalTouches: number;
    susTouches: number;
    sideSlipTouches: number;
    deviceReceipts?: string[];
  };
  gilEvansSliceReceipt?: string;
  gilEvansEffectiveHarmonyBars?: string[];
  gilEvansDeviceReceipts?: string[];
  /** Charles Mingus — blues-episodic slice (`charlesMingusSlice.ts`). */
  charlesMingusDiagnostics?: {
    songwriterId: 'charles_mingus';
    barsConsidered: number;
    bluesDominantTouches: number;
    slashTouches: number;
    sideStepTouches: number;
    episodeCount?: number;
    shockCutBar?: number;
    deviceReceipts?: string[];
  };
  /** Episode texture / shock-cut plan — built in `charlesMingusSlice.precomputeCharlesMingusEffectiveHarmonyBars`. */
  charlesMingusEpisodePlan?: CharlesMingusEpisodePlan;
  charlesMingusSliceReceipt?: string;
  charlesMingusEffectiveHarmonyBars?: string[];
  charlesMingusDeviceReceipts?: string[];
  /** Henry Threadgill — interval-cell episodic slice (`henryThreadgillSlice.ts`). */
  henryThreadgillDiagnostics?: {
    songwriterId: 'henry_threadgill';
    barsConsidered: number;
    intervalCellTouches: number;
    polymodalTouches: number;
    antiMetricTouches: number;
    pitchSetTouches: number;
    episodeCount?: number;
    sliceParams?: HenryThreadgillSliceParams;
    vrbFingerprintCount?: string;
    deviceReceipts?: string[];
  };
  henryThreadgillEpisodePlan?: HenryThreadgillEpisodePlan;
  henryThreadgillSliceParams?: HenryThreadgillSliceParams;
  henryThreadgillSliceReceipt?: string;
  henryThreadgillEffectiveHarmonyBars?: string[];
  henryThreadgillDeviceReceipts?: string[];
  /** Jan Garbarek — ritual modal ECM field slice (`janGarbarekSlice.ts`). */
  janGarbarekDiagnostics?: {
    songwriterId: 'jan_garbarek';
    barsConsidered: number;
    modalFieldTouches: number;
    droneTouches: number;
    slowHarmonyTouches: number;
    openCadenceTouches: number;
    quartalTouches: number;
    sectionCount?: number;
    phraseBreathBars?: number[];
    sliceParams?: JanGarbarekSliceParams;
    deviceReceipts?: string[];
  };
  janGarbarekFieldPlan?: JanGarbarekFieldPlan;
  janGarbarekSliceParams?: JanGarbarekSliceParams;
  janGarbarekSliceReceipt?: string;
  janGarbarekEffectiveHarmonyBars?: string[];
  janGarbarekDeviceReceipts?: string[];
  /** John Surman — British folk-minimalist ECM slice (`johnSurmanSlice.ts`, receipts `js:*`). */
  johnSurmanDiagnostics?: {
    songwriterId: 'john_surman';
    barsConsidered: number;
    folkModalTouches: number;
    ostinatoTouches: number;
    silenceTouches: number;
    alteredStripped: number;
    darkReedTouches: number;
    minSectionSpan?: number;
    maxPhraseArcBars?: number;
    darkRegisterMidiFloor?: number;
    darkRegisterMidiCeiling?: number;
    sliceParams?: JohnSurmanSliceParams;
    deviceReceipts?: string[];
  };
  johnSurmanFolkPlan?: JohnSurmanFolkPlan;
  johnSurmanSliceParams?: JohnSurmanSliceParams;
  johnSurmanSliceReceipt?: string;
  johnSurmanEffectiveHarmonyBars?: string[];
  johnSurmanDeviceReceipts?: string[];
  /** Ralph Towner — guitar-born polyphonic ECM slice (`ralphTownerSlice.ts`, receipts `rt:*`). */
  ralphTownerDiagnostics?: {
    songwriterId: 'ralph_towner';
    barsConsidered: number;
    guitarVoicingTouches: number;
    melodyFromVoicingTouches: number;
    resonanceTouches: number;
    openStringTouches: number;
    bassIndependenceTouches: number;
    arpeggioMotorTouches: number;
    minSectionSpan?: number;
    maxPhraseArcBars?: number;
    sliceParams?: RalphTownerSliceParams;
    deviceReceipts?: string[];
  };
  townerPolyphonicPlan?: TownerPolyphonicPlan;
  ralphTownerSliceParams?: RalphTownerSliceParams;
  ralphTownerSliceReceipt?: string;
  ralphTownerEffectiveHarmonyBars?: string[];
  ralphTownerDeviceReceipts?: string[];
  /** Tom Verlaine — suspended modal field art-rock slice (`verlainFieldSlice.ts`, receipts `tv:*`). */
  verlaineDiagnostics?: {
    songwriterId: 'verlaine';
    barsConsidered: number;
    suspendedSurfaceTouches: number;
    bassDisplacementTouches: number;
    extensionHoldTouches: number;
    fieldHoldTouches: number;
    intersectingLineTouches: number;
    minSectionSpan?: number;
    sliceParams?: VerlaineSliceParams;
    deviceReceipts?: string[];
  };
  verlaineFieldPlan?: VerlaineFieldPlan;
  verlaineSliceParams?: VerlaineSliceParams;
  verlaineSliceReceipt?: string;
  verlaineEffectiveHarmonyBars?: string[];
  verlaineDeviceReceipts?: string[];
  /** Allan Holdsworth — scale-derived fusion slice (`holdsworthScaleSlice.ts`, receipts `AH:*`). */
  holdsworthDiagnostics?: {
    songwriterId: 'allan_holdsworth';
    barsConsidered: number;
    scaleDerivedTouches: number;
    scaleHoldTouches: number;
    chromaticVlTouches: number;
    intervalSubsetTouches: number;
    functionalStripTouches: number;
    minSectionSpan?: number;
    sliceParams?: HoldsworthSliceParams;
    deviceReceipts?: string[];
  };
  holdsworthScalePlan?: HoldsworthScalePlan;
  holdsworthSliceParams?: HoldsworthSliceParams;
  holdsworthSliceReceipt?: string;
  holdsworthEffectiveHarmonyBars?: string[];
  holdsworthDeviceReceipts?: string[];
  /** Jack White — drone-centered riff slice (`jackWhiteDroneSlice.ts`, receipts `jw:*`). */
  jackWhiteDiagnostics?: {
    songwriterId: 'jack_white';
    barsConsidered: number;
    tonicPersistTouches: number;
    droneLogicTouches: number;
    impliedHarmonyTouches: number;
    riffCellTouches: number;
    incompleteTouches: number;
    fusedPartTouches: number;
    fullTriadTouches: number;
    hendrixBleedTouches: number;
    minSectionSpan?: number;
    tonicPersistence: number;
    droneLogic: number;
    harmonyByImplication: number;
    riffCellEconomy: number;
    controlledIncompleteness: number;
    leadRhythmFusion: number;
    sliceParams?: JackWhiteSliceParams;
    deviceReceipts?: string[];
  };
  jackWhiteDronePlan?: JackWhiteDronePlan;
  jackWhiteSliceParams?: JackWhiteSliceParams;
  jackWhiteSliceReceipt?: string;
  jackWhiteEffectiveHarmonyBars?: string[];
  jackWhiteDeviceReceipts?: string[];
  /** Captain Beefheart — blues-fragment polyphony slice (`beefheartFragmentSlice.ts`, receipts `cbf:*`). */
  beefheartDiagnostics?: {
    songwriterId: 'beefheart';
    barsConsidered: number;
    bluesTransformTouches: number;
    partCycleTouches: number;
    wrongRepeatTouches: number;
    asymModuleTouches: number;
    resolutionSuppressTouches: number;
    denseLineTouches: number;
    minSectionSpan?: number;
    sliceParams?: BeefheartSliceParams;
    bluesTransformation: number;
    independentPartPeriodicity: number;
    wrongNoteRecurrence: number;
    asymmetricPhraseModule: number;
    resolutionSuppression: number;
    denseSeparatedTexture: number;
    wrongNoteRecurrencePairs?: number;
    deviceReceipts?: string[];
  };
  beefheartFragmentPlan?: BeefheartFragmentPlan;
  beefheartSliceParams?: BeefheartSliceParams;
  beefheartSliceReceipt?: string;
  beefheartEffectiveHarmonyBars?: string[];
  beefheartDeviceReceipts?: string[];
  /** Robert Fripp — era-dependent process systems slice (`frippSystemsSlice.ts`, receipts `rf:*`). */
  frippEraSystemMode?: FrippEraSystemMode;
  frippDiagnostics?: {
    songwriterId: 'fripp';
    barsConsidered: number;
    intervalFieldTouches: number;
    interlockTouches: number;
    dissonanceTouches: number;
    melodicCellTouches: number;
    asymGroupTouches: number;
    processAudibleTouches: number;
    minSectionSpan?: number;
    sliceParams?: FrippSliceParams;
    intervalFieldHarmony: number;
    interlockPattern: number;
    dissonanceManagement: number;
    melodicIntervalCell: number;
    asymmetricGrouping: number;
    processAudibility: number;
    texturalDensityControl: number;
    tritoneRetention?: number;
    compositePulse?: number;
    layerTransparency?: number;
    eraMode?: FrippEraSystemMode;
    deviceReceipts?: string[];
  };
  frippSystemsPlan?: FrippSystemsPlan;
  frippSliceParams?: FrippSliceParams;
  frippSliceReceipt?: string;
  frippEffectiveHarmonyBars?: string[];
  frippDeviceReceipts?: string[];
  /** Johnny Marr — melodic rhythm guitar slice (`marrMelodicSlice.ts`, receipts `jma:*`). */
  marrDiagnostics?: {
    songwriterId: 'marr';
    barsConsidered: number;
    partialVoicingTouches: number;
    openStringTouches: number;
    topNoteMelodyTouches: number;
    addNoteHarmonyTouches: number;
    pendulumSubdivisionTouches: number;
    modalAmbiguityTouches: number;
    plainTriadTouches: number;
    barreBlockTouches: number;
    negEdgeTouches: number;
    negMcguinnTouches: number;
    minSectionSpan?: number;
    sliceParams?: MarrSliceParams;
    partialVoicingRate?: number;
    topNoteMelody?: number;
    openStringResonance?: number;
    addNoteHarmony?: number;
    pendulumSubdivision?: number;
    modalAmbiguity?: number;
    deviceReceipts?: string[];
  };
  marrMelodicPlan?: MarrMelodicPlan;
  marrSliceParams?: MarrSliceParams;
  marrSliceReceipt?: string;
  marrEffectiveHarmonyBars?: string[];
  marrDeviceReceipts?: string[];
  /** Eberhard Weber — bass-led harmonic field slice (`weberFieldSlice.ts`, receipts `ew:*`). */
  eberhardWeberDiagnostics?: {
    songwriterId: 'eberhard_weber';
    barsConsidered: number;
    pedalTouches: number;
    upperRefreshTouches: number;
    bassLedTouches: number;
    revoicingTouches: number;
    resonantTouches: number;
    maxPhraseArcLength?: number;
    unitCount?: number;
    sliceParams?: EberhardWeberSliceParams;
    deviceReceipts?: string[];
  };
  eberhardWeberFieldPlan?: WeberFieldPlan;
  eberhardWeberSliceParams?: EberhardWeberSliceParams;
  eberhardWeberSliceReceipt?: string;
  eberhardWeberEffectiveHarmonyBars?: string[];
  eberhardWeberDeviceReceipts?: string[];
  /** Claus Ogerman — orchestral continuum slice (`clausOgermanSlice.ts`, receipts `co:*`). */
  clausOgermanDiagnostics?: {
    songwriterId: 'claus_ogerman';
    barsConsidered: number;
    suspensionTouches: number;
    innerVoiceTouches: number;
    stringLayerTouches: number;
    textureResolutionTouches: number;
    orchestralModeTouches: number;
    cellCount?: number;
    sliceParams?: ClausOgermanSliceParams;
    deviceReceipts?: string[];
  };
  clausOgermanContinuumPlan?: OgermanContinuumPlan;
  clausOgermanSliceParams?: ClausOgermanSliceParams;
  clausOgermanSliceReceipt?: string;
  clausOgermanEffectiveHarmonyBars?: string[];
  clausOgermanDeviceReceipts?: string[];
  /** Bill Holman — chart-first linear counterpoint slice (`billHolmanSlice.ts`). */
  billHolmanDiagnostics?: {
    songwriterId: 'bill_holman';
    barsConsidered: number;
    lineIndependenceTouches: number;
    approachNoteTouches: number;
    countermelodyTouches: number;
    saxSoliTouches: number;
    deviceReceipts?: string[];
  };
  billHolmanSliceParams?: BillHolmanSliceParams;
  billHolmanEpisodePlanSummary?: string;
  billHolmanShoutStartBar?: number;
  billHolmanSliceReceipt?: string;
  billHolmanEffectiveHarmonyBars?: string[];
  billHolmanDeviceReceipts?: string[];
  /** Carla Bley — formal irony ECM slice (`carlaBleySlice.ts`, receipts `cbl:*`). */
  carlaBleyDiagnostics?: {
    songwriterId: 'carla_bley';
    barsConsidered: number;
    ironyTouches: number;
    deflationTouches: number;
    deadpanTouches: number;
    plainChordTouches: number;
    repriseTouches: number;
    topicStagingTouches: number;
    episodeCount?: number;
    formalIronyIndex?: number;
    deviceReceipts?: string[];
  };
  carlaBleySliceParams?: CarlaBleySliceParams;
  carlaBleyEpisodePlan?: CarlaBleyEpisodePlan;
  carlaBleyEpisodePlanSummary?: string;
  carlaBleyDeflationPivotBar?: number;
  carlaBleySliceReceipt?: string;
  carlaBleyEffectiveHarmonyBars?: string[];
  carlaBleyDeviceReceipts?: string[];
  /** Count Basie — Kansas City swing / riff-head slice (`basieSlice.ts`). */
  basieTestamentMode?: BasieTestamentMode;
  basieResolvedTestament?: BasieTestamentMode;
  basieEpisodePlan?: BasieEpisodePlan;
  basieDiagnostics?: {
    songwriterId: 'count_basie';
    basieResolvedTestament?: BasieTestamentMode;
    barsConsidered: number;
    extensionTouches: number;
    dimPassTouches: number;
    shoutTouches: number;
    episodeReceipts?: string[];
    deviceReceipts?: string[];
  };
  basieSliceReceipt?: string;
  basieEffectiveHarmonyBars?: string[];
  basieDeviceReceipts?: string[];
  /** Shout region bars (1-based). */
  basieShoutBars?: number[];
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
    /** BB_HARM_01–10 pattern tags from `bacharachSlice.ts`. */
    harmonicGrammarReceipts?: string[];
    /** BB_VL_01–05 voice-leading / orchestration tags from `bacharachSlice.ts`. */
    voiceLeadingGrammarReceipts?: string[];
    /** BB_RHYTHM_01–05 metric / phrase / percussion tags from `bacharachSlice.ts`. */
    rhythmGrammarReceipts?: string[];
    /** BB_FORM_01–05 macro-form / section tags from `bacharachSlice.ts`. */
    formGrammarReceipts?: string[];
    /** BB_ORCH_01–05 studio orchestration tags from `bacharachSlice.ts`. */
    orchestrationGrammarReceipts?: string[];
    /** BB_FP_01–03 composite fingerprints from `bacharachSlice.ts`. */
    fingerprintReceipts?: string[];
  };
  bacharachSliceReceipt?: string;
  bacharachEffectiveHarmonyBars?: string[];
  bacharachDeviceReceipts?: string[];
  /** Bacharach BB_HARM research grammar receipts (`bb:harmNN_*` in `bacharachSlice.ts`). */
  bacharachHarmonicGrammarReceipts?: string[];
  /** Bacharach BB_VL research receipts (`bb:vlNN_*` in `bacharachSlice.ts`). */
  bacharachVoiceLeadingGrammarReceipts?: string[];
  /** Bacharach BB_RHYTHM research receipts (`bb:rhythmNN_*` in `bacharachSlice.ts`). */
  bacharachRhythmGrammarReceipts?: string[];
  /** Bacharach BB_FORM research receipts (`bb:formNN_*` in `bacharachSlice.ts`). */
  bacharachFormGrammarReceipts?: string[];
  /** Bacharach BB_ORCH research receipts (`bb:orchNN_*` in `bacharachSlice.ts`). */
  bacharachOrchestrationGrammarReceipts?: string[];
  /** Bacharach BB_FP composite fingerprints (`bb:fpNN_*` in `bacharachSlice.ts`). */
  bacharachFingerprintReceipts?: string[];
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
  /** Herbie Hancock slice posture — resolver defaults to **`modal`** when omitted (`herbieHancockSlice.ts`). */
  hancockPhase?: HancockPhase;
  /** Effective Hancock phase after precompute (always set when slice runs). */
  hancockResolvedPhase?: HancockPhase;
  /** Wayne Shorter slice posture — resolver defaults to **`mid60s`** (`wayneShorterSlice.ts`). */
  shorterPhase?: ShorterPhase;
  /** Effective Shorter era after precompute (set when slice runs). */
  shorterResolvedPhase?: ShorterPhase;
  /** Andrew Hill slice posture — resolver defaults to **`postbop_free`** (`andrewHillSlice.ts`). */
  hillMode?: HillMode;
  /** Effective Hill mode after precompute (set when slice runs). */
  hillResolvedMode?: HillMode;
  /** Jim Hall slice posture — resolver defaults to **`duo`** (`jimHallSlice.ts`). */
  jimHallMode?: JimHallMode;
  /** Effective Jim Hall mode after precompute (set when slice runs). */
  jimHallResolvedMode?: JimHallMode;
  /** Voicing / economy hints for comp exporter (max notes, shell rule). */
  jimHallVoicingCap?: {
    maxVoicingNotes: number;
    harmonicEconomy: string;
    guitarIntervalBias: boolean;
    contrapuntalMode: boolean;
  };
  /** Herbie Hancock — quartal/sus modal harmony slice (`HANCOCK_SLICE_PARAMETERS` + receipts **`hh:*`**). */
  herbieHancockDiagnostics?: {
    songwriterId: 'herbie_hancock';
    hancockResolvedPhase?: HancockPhase;
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
      sideSlipRate: number;
      defaultPhase: HancockPhase;
    };
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
    /** Mirrors `MONK_SLICE_PARAMETERS` numeric fields (`theloniousMonkSlice.ts`) for receipts / UI. */
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
    };
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
  /** John Coltrane slice — three-tonic cycle phase (`changes` default). */
  coltranePhase?: 'changes' | 'modal';
  /** John Coltrane — scaffold harmonic-density hint for UI / receipts (`COLTRANE_SLICE_PARAMETERS`). */
  coltraneHarmonicDensity?: { chordsPerBar: number };
  johnColtraneDiagnostics?: {
    songwriterId: 'john_coltrane';
    barsConsidered: number;
    thirdCycleTouches: number;
    lydianTonicTouches: number;
    alteredDominantTouches: number;
    modalPedalTouches: number;
    /** Effective phase after resolve (`COLTRANE_SLICE_PARAMETERS.defaultPhase` when unset). */
    coltranePhase: 'changes' | 'modal';
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
    };
    deviceReceipts?: string[];
  };
  johnColtraneSliceReceipt?: string;
  johnColtraneEffectiveHarmonyBars?: string[];
  johnColtraneDeviceReceipts?: string[];
  /** McCoy Tyner — quartal / pentatonic / IV-over-minor modal slice. */
  mccoyTynerDiagnostics?: {
    songwriterId: 'mccoy_tyner';
    sliceParameters?: {
      quartalBias: number;
      pentatonicBias: number;
      modalMinorBias: number;
      ivQuartalRate: number;
      tritoneRate: number;
      susBias: number;
    };
    barsConsidered: number;
    quartalTouches: number;
    pentatonicTouches: number;
    ivQuartalTouches: number;
    modalMinorTouches: number;
    deviceReceipts?: string[];
  };
  mccoyTynerSliceReceipt?: string;
  mccoyTynerEffectiveHarmonyBars?: string[];
  mccoyTynerDeviceReceipts?: string[];
  /** Andrew Hill (post-bop angular non-functional harmony) — slice diagnostics + effective harmony. */
  andrewHillDiagnostics?: {
    songwriterId: 'andrew_hill';
    hillResolvedMode?: HillMode;
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
      clusterDensity: number;
      pitchFieldAnchor: boolean;
      rhythmicDisplacementBias: number;
      bluesInflectionBias: number;
      defaultMode: HillMode;
    };
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
  /** Jim Hall (interval-first guitar / shell+one duo harmony) — slice diagnostics + effective harmony. */
  jimHallDiagnostics?: {
    songwriterId: 'jim_hall';
    jimHallResolvedMode?: JimHallMode;
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
      maxVoicingNotes: number;
      innerVoiceChromaticRate: number;
      defaultMode: JimHallMode;
    };
    barsConsidered: number;
    warmExtensionTouches: number;
    innerVoiceReceiptTouches: number;
    shellEconomyTouches: number;
    deviceReceipts?: string[];
  };
  jimHallSliceReceipt?: string;
  jimHallEffectiveHarmonyBars?: string[];
  jimHallDeviceReceipts?: string[];
  /** Steve Reich (pitch-field process / static diatonic field) — slice posture + receipts **`sr:*`**. */
  reichProcess?: SteveReichProcessMode;
  /** Effective process mode after resolve (`steveReichSlice.ts`). */
  reichResolvedProcess?: SteveReichProcessMode;
  /** Locked harmonic rhythm window (bars per static field segment). */
  steveReichHarmonicRhythmBars?: number;
  /** Rhythmic subdivision density under static harmony — exporter / phrase hints. */
  steveReichPulseGridDensity?: 'high' | 'medium' | 'low';
  steveReichDiagnostics?: {
    songwriterId: 'steve_reich';
    reichResolvedProcess?: SteveReichProcessMode;
    sliceParameters?: {
      tritoneRate: number;
      susBias: number;
      chromaticMediantBias: number;
      staticDominantBias: number;
      chromaticAlterationRate: number;
      harmonicRhythmBars: number;
      defaultProcess: SteveReichProcessMode;
    };
    barsConsidered: number;
    fieldHoldTouches: number;
    susQuartalTouches: number;
    additiveTouches: number;
    deviceReceipts?: string[];
  };
  steveReichSliceReceipt?: string;
  steveReichEffectiveHarmonyBars?: string[];
  steveReichDeviceReceipts?: string[];
  /** Olivier Messiaen — optional API posture; copied to context (`messiaenSlice.ts`). */
  messiaenPeriodMode?: MessiaenPeriodMode;
  /** Resolved period after slice normalize (`messiaenSlice.ts`). */
  messiaenPeriodModeResolved?: MessiaenPeriodMode;
  /** Compact period tag for manifests — **`early` | `middle` | `late`**. */
  periodMode?: 'early' | 'middle' | 'late';
  /** Active limited-transposition / pool tier label (`messiaenSlice.ts`). */
  activeMode?: string;
  /** Research colour association stub (`messiaenSlice.ts` / messiaen-colour-engine placeholder). */
  colourTag?: string;
  /** Birdsong ornamental species tag (`messiaenSlice.ts`). */
  birdsongSpecies?: string;
  messiaenHarmonicRhythmMinBars?: number;
  messiaenDiagnostics?: {
    songwriterId: 'messiaen';
    barsConsidered: number;
    slowRhythmTouches: number;
    cadenceBlocks: number;
    episodeReceipts: number;
    sliceParameters?: {
      harmonicRhythmMinBars: number;
      modeRegisterChordMinimum: number;
    };
    deviceReceipts?: string[];
  };
  messiaenSliceReceipt?: string;
  messiaenEffectiveHarmonyBars?: string[];
  messiaenDeviceReceipts?: string[];
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
  /** Fripp / King Crimson — optional polymeter companion preset id (LCM alignment receipt). */
  frippPolymeterSecondaryPresetId?: string;
  /** Echo of {@link import('./rhythm/asymmetricPresets').AsymmetricRhythmRequest} from golden-path options. */
  asymmetricRhythmRequest?: import('./rhythm/asymmetricPresets').AsymmetricRhythmRequest;
  frippKingCrimsonEffectiveHarmonyBars?: string[];
  frippKingCrimsonSliceReceipt?: string;
  frippKingCrimsonAsymmetricPresetResolved?: string;
  frippKingCrimsonPolymeterReceipt?: string;
  frippKingCrimsonMelodyHints?: {
    phraseMultipleSixteenths: number;
    nonStepwiseMotionTarget: number;
    periodicLeapMinSemitones: number;
    melodicRegisterCentreMidi: number;
    staticRootCeilingMidi: number;
  };
  frippKingCrimsonDiagnostics?: {
    songwriterId: 'fripp_king_crimson';
    barsConsidered: number;
    pitchCollectionBarsWholeTone: number;
    thirdCycleSteps: number;
    polymeterLcmSixteenths?: number;
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
  /** Phase 2+3a — harmonic voice id (normalized); drives VoiceRuleBundle when set. */
  harmonicVoice?: string;
  /** Phase 2+3a — bar-hold state for harmonic rhythm overlay (`getChordForBar`). */
  voiceBundleHarmonicRhythmState?: VoiceBundleHarmonicRhythmState;
  /** Phase 2+3a — inspectability echo of active bundle policy (does not replace receipts). */
  voiceBundlePolicyEcho?: {
    bassRole: string;
    voicingMinSpreadSemitones: number;
    melodicMaxLeapSemitones: number;
    rhythmAntiMetric?: boolean;
  };
  /** Phase 2+3a — rhythm overlay flag from bundle (Phase 3b consumers). */
  voiceBundleRhythmAntiMetric?: boolean;
  /** Phase 2+3a — repairPolicy.resolveParallels was true; motion fix pass deferred to Phase 3b. */
  voiceBundleRepairResolveParallelsRequested?: boolean;
  /** Phase 2+3a — echo of repairPolicy.maxVoiceOverlap for downstream scoring. */
  voiceBundleRepairMaxVoiceOverlap?: number;
  /** Phase 3b — voice-leading / parallel repair log lines for manifests. */
  voiceBundleVoiceLeadingRepairs?: string[];
  /** Phase 4+5 — per-bar tension envelope after form scheduler (`tensionLevelForBar` reads this first). */
  scheduledTensionByBar?: number[];
  /** Phase 4+5 — RhythmDNA cells allowed/forbidden vs motif R spine. */
  rhythmMotifBinding?: import('./composer/rhythmDnaMotifBinder').RhythmMotifBinding;
  /** Phase 4+5 — planned vs heuristic actual tension deviation by section. */
  tensionAudit?: import('./composer/tensionScheduler').TensionAuditRow[];
  /** Phase 6+7 — UI instrument group echo (Big Band | String Quartet | Guitar | Étude). */
  uiInstrumentGroup?: 'big_band' | 'string_quartet' | 'guitar' | 'etude';
  /** String Quartet — composite VRB from multi-arranger blend (UI Phase 3+); additive diagnostics. */
  sqArrangerVrb?: VoiceRuleBundle;
  /** Phase 6+7 — guitar export mode from StylePanel. */
  guitarOutputMode?: 'notation' | 'tab' | 'both';
  /** Phase 6+7 — étude generator instrument id from UI. */
  etudeInstrument?: string;
  /** Phase 6+7 — étude technical focus from UI. */
  etudeTechnicalFocus?: import('./composer/etudeGenerator').EtudeTechnicalFocus;
  /** Phase 8 — improv agent echo (post-export improv part optional). */
  improvModeEcho?: boolean;
  improvVoiceIdEcho?: string;
  /** Phase 8 — live weighted chord/rhythm pools (0–1). */
  stochasticVariance?: number;
  /** Phase 8 — second-render discriminator for weighted pools (same seed → different sample when variance > 0). */
  stochasticRenderOrdinal?: number;
  /** Phase 8 — per-bar RhythmDNA cell pick after weightedRhythmSample. */
  phase8RhythmDnaCellByBar?: string[];
  stochasticVarianceEcho?: number;
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
  /** Phase 2+3a — compiled harmonic voice policy (when harmonicVoice requested). */
  voiceBundle?: VoiceRuleBundle;
  /** Per-section VRB markers — overrides merged per bar via {@link resolveVoiceRuleBundleForBar}. */
  sectionMarkers?: SectionMarker[];
  /** Phase 2+3a — session harmonic scenes (stub rows until Phase 3b). */
  harmonicScenes?: HarmonicScene[];
  /** Phase 4+5 — harmonic form arc (when VoiceRuleBundle attached). */
  formSections?: import('./composer/formController').FormSection[];
  validation: ValidationResults;
  styleOverrides?: Record<string, unknown>;
  readiness: {
    release: ReleaseReadinessResult;
    mx: MxReadinessResult;
  };
  /** Count Basie Song Mode — resolved Old vs New Testament flag (`basieSlice.ts`). */
  basieTestamentMode?: BasieTestamentMode;
  /** Olivier Messiaen Song Mode — early / middle / late programme posture (`messiaenSlice.ts`). */
  messiaenPeriodMode?: MessiaenPeriodMode;
  /** SQ→BB — canonical section label mode (`song` | `instrumental`). */
  sectionLabelMode?: import('./counterpoint/vrbProfiles/sqToBbSectionLabels').SqToBbSectionLabelMode;
  /** SQ→BB Messiaen pitch-field — mode of limited transposition (default 2). */
  messiaenModeId?: import('./harmony/pitchFieldSpineTypes').MessiaenModeId;
  /** Bob Brookmeyer Song Mode — early (chorus-based) vs late (through-composed) (`bobBrookmeyerSlice.ts`). */
  brookmeyerPeriodMode?: BrookmeyerPeriodMode;
  /** Oliver Nelson Song Mode — era + blues form variant (`oliverNelsonSlice.ts`). */
  nelsonPeriodMode?: NelsonPeriodMode;
  nelsonBluesFormVariant?: NelsonBluesFormVariant;
  /** When true, harmonic voicing yields to melodic line (`bobBrookmeyerSlice.ts` + `voiceLeadingSolver.ts`). */
  lineFirstHierarchy?: boolean;
  /** When true, chart-first linear lines generate harmony (`billHolmanSlice.ts`). */
  chartFirstLinearHierarchy?: boolean;
  /** When true, formal irony topics reframe harmony (`carlaBleySlice.ts`). */
  formalIronyHierarchy?: boolean;
  /** V65 P1 — Song schema document (section architecture); bridged at pipeline entry. */
  song?: import('./section-architecture/sectionArchitectureTypes').Song;
}

export type { BasieTestamentMode } from './song-mode/basieSlice';
