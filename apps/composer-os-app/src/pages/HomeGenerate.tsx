import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { api, displayOutputPath, type OutputDirectoryResponse } from '../services/api';
import { mapCoreUiToGenerationFields } from '../utils/buildGenerateRequestBody';
import {
  describeOutputKind,
  EXPERIMENTAL_HELP,
  getModeUx,
  labelCreativeLevel,
} from '../utils/generateUiCopy';
import {
  APP_PRESET_REGISTRY,
  mergePresetsWithRegistry,
  type AppPresetCard,
} from '../constants/composerOsPresetUi';
import { FORM_OPTIONS } from '../constants/formOptions';
import {
  clampSongFormBarCount,
  parseChordProgressionInputFlexible,
  parseChordProgressionInputWithBarCount,
} from '../utils/chordProgressionClient';
import { alignChordProgressionToSongFormBars } from '../utils/alignSongFormChordProgression';
import { buildSongModeProfileRuleRows } from '../utils/songModeProfileRulesViewModel';
import { buildSongModeSectionSourceRows } from '../utils/songModeSectionSourcesViewModel';
import { buildSongModeCompareCardRows, buildSongModeCompareInsights } from '../utils/songModeCompareViewModel';
import type { GuitarVoice2PolyphonyDiagnostics } from '@composer-os/core/goldenPath/guitarVoice2PolyphonyDiagnostics';
import { isGuitarBassDuoFamily } from '@composer-os/core/presets/guitarBassDuoPresetIds';
import {
  SONG_MODE_DIVERSITY_PRESETS,
  resolveSongModeDiversityPreset,
} from '@composer-os/core/song-mode/songwriterStyleResolver';
import {
  ALTERNATE_GUITAR_TUNING_PRESETS,
  normalizeAlternateGuitarTuningRequest,
  type AlternateGuitarTuningRequest,
  type GuitarTuningMode,
} from '@composer-os/core/song-mode/alternateGuitarTunings';
import { resolveSongModeDiversityStylePairing } from '@composer-os/core/style-pairing/stylePairingResolver';
import {
  extractScoreMusicXmlFromString,
  extractScoreMusicXmlFromUint8Array,
} from '@composer-os/core/lead-sheet/musicXmlScoreInput';

const FORM_OPTION_IDS_EXCLUDED_FROM_UI = new Set([
  'through5',
  'through6',
  'through7',
  'through8',
  'abacab',
]);

const FORM_OPTIONS_UI = FORM_OPTIONS.filter((f) => !FORM_OPTION_IDS_EXCLUDED_FROM_UI.has(f.id));

/** Client-side chord preflight failures (before generate). */
const CHORD_PROGRESSION_PARSE_ERROR_MESSAGE =
  'Could not parse chord progression. Use standard jazz notation e.g. Dm9, G13, Cmaj9, A7alt — separated by spaces or commas.';

/** Receipt echo from engine (#17 chord export diagnostics). */
type ChordDxReceiptUi = {
  summary: {
    totalChordsParsed: number;
    totalFallbacksUsed: number;
    totalApproximations: number;
    slashChordsPreserved: number;
  };
  exportTargetNotes: { primaryValidationTarget: string; sibeliusFallback: string };
  aggregateTargetWarning: string;
};

const SONGWRITER_OPTIONS: { id: string; label: string }[] = [
  { id: 'andrew_hill', label: 'Andrew Hill' },
  { id: 'bach', label: 'Bach' },
  { id: 'bacharach', label: 'Bacharach' },
  { id: 'barry_harris', label: 'Barry Harris' },
  { id: 'beatles', label: 'Beatles' },
  { id: 'beethoven', label: 'Beethoven' },
  { id: 'bill_evans', label: 'Bill Evans' },
  { id: 'billy_strayhorn', label: 'Billy Strayhorn' },
  { id: 'bob_dylan', label: 'Bob Dylan' },
  { id: 'brian_wilson', label: 'Brian Wilson' },
  { id: 'carole_king', label: 'Carole King' },
  { id: 'debussy', label: 'Debussy' },
  { id: 'donald_fagen', label: 'Donald Fagen' },
  { id: 'duke_ellington', label: 'Duke Ellington' },
  { id: 'ecm_chamber', label: 'ECM Chamber' },
  { id: 'holland_dozier_holland', label: 'Holland-Dozier-Holland' },
  { id: 'james_brown', label: 'James Brown' },
  { id: 'jeff_lynne', label: 'Jeff Lynne' },
  { id: 'jeff_tweedy', label: 'Jeff Tweedy' },
  { id: 'joni_mitchell', label: 'Joni Mitchell' },
  { id: 'kendrick_lamar', label: 'Kendrick Lamar' },
  { id: 'kurt_weill', label: 'Kurt Weill' },
  { id: 'mahler', label: 'Mahler' },
  { id: 'max_martin', label: 'Max Martin' },
  { id: 'messiaen', label: 'Messiaen' },
  { id: 'norman_whitfield', label: 'Norman Whitfield' },
  { id: 'paul_mccartney', label: 'Paul McCartney' },
  { id: 'pat_metheny', label: 'Pat Metheny' },
  { id: 'paul_simon', label: 'Paul Simon' },
  { id: 'prince', label: 'Prince' },
  { id: 'prokofiev', label: 'Prokofiev' },
  { id: 'randy_newman', label: 'Randy Newman' },
  { id: 'radiohead', label: 'Radiohead' },
  { id: 'ravel', label: 'Ravel' },
  { id: 'richard_thompson', label: 'Richard Thompson' },
  { id: 'schubert', label: 'Schubert' },
  { id: 'shostakovich', label: 'Shostakovich' },
  { id: 'smokey_robinson', label: 'Smokey Robinson' },
  { id: 'sonic_youth', label: 'Sonic Youth' },
  { id: 'stephen_sondheim', label: 'Stephen Sondheim' },
  { id: 'stevie_wonder', label: 'Stevie Wonder' },
  { id: 'stravinsky', label: 'Stravinsky' },
  { id: 'wayne_shorter', label: 'Wayne Shorter' },
  { id: 'xtc', label: 'XTC' },
];

/** Primary ordering inside each optgroup (Shipped = full golden-path slice in core). */
const SONGWRITER_GROUP_SHIPPED_ORDER: readonly string[] = [
  'brian_wilson',
  'stevie_wonder',
  'radiohead',
  'james_brown',
  'joni_mitchell',
  'sonic_youth',
  'pat_metheny',
  'wayne_shorter',
  'barry_harris',
  'stephen_sondheim',
];

const SONGWRITER_GROUP_READY_ORDER: readonly string[] = [
  'bacharach',
  'bill_evans',
  'donald_fagen',
  'ecm_chamber',
];

const SONGWRITER_OPTION_BY_ID = new Map(SONGWRITER_OPTIONS.map((o) => [o.id, o]));
const SONGWRITER_GROUP_SHIPPED_IDS = new Set(SONGWRITER_GROUP_SHIPPED_ORDER);
const SONGWRITER_GROUP_READY_IDS = new Set(SONGWRITER_GROUP_READY_ORDER);

const SONGWRITER_LIBRARY_ORDERED = SONGWRITER_OPTIONS.filter(
  (o) => !SONGWRITER_GROUP_SHIPPED_IDS.has(o.id) && !SONGWRITER_GROUP_READY_IDS.has(o.id)
).sort((a, b) => a.label.localeCompare(b.label));

/** Visually hidden — referenced by `aria-describedby` on grouped songwriter/arranger selects (WCAG). */
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const ARIA_SONGWRITER_GROUPS_DESC =
  'Songwriters are grouped into Shipped full slice, Ready to build, and In library.';
const ARIA_ARRANGER_GROUPS_DESC =
  'Arrangers are grouped into Big band core research-backed and Charts and studio voices.';

function SongwriterSelectOptionGroups() {
  return (
    <>
      <optgroup label="Shipped (full slice)">
        {SONGWRITER_GROUP_SHIPPED_ORDER.filter((id) => SONGWRITER_OPTION_BY_ID.has(id)).map((id) => {
          const o = SONGWRITER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="Ready to build">
        {SONGWRITER_GROUP_READY_ORDER.filter((id) => SONGWRITER_OPTION_BY_ID.has(id)).map((id) => {
          const o = SONGWRITER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="In library">
        {SONGWRITER_LIBRARY_ORDERED.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </>
  );
}

const SONG_MODE_LEADSHEET_PHASE1_WRITERS = new Set(['donald_fagen', 'barry_harris']);
type HarmonyDisplayModeUi = 'raw' | 'enriched' | 'compare';
type TonalityVaultUiFunctionalHint = 'tonic_family' | 'predominant_family' | 'dominant_family' | 'chromatic_or_unknown';

type TonalityVaultUiAnnotation = {
  bar: number;
  beat: number;
  sourceSymbol: string;
  diatonicClass: 'diatonic_major_key' | 'chromatic_or_unknown';
  scaleDegreeFromMajor?: string;
  functionalHint: TonalityVaultUiFunctionalHint;
  explanation: string;
};

type SongModeHarmonyInterpretationViewUi = {
  requestedMode: HarmonyDisplayModeUi;
  effectiveMode: HarmonyDisplayModeUi;
  viewWarnings: string[];
  enrichedDisplayFellBackToRaw?: boolean;
  comparePayload?: {
    rawChordEvents: Array<{ bar: number; beat: number; symbol: string }>;
    tonalityVault: {
      applied: boolean;
      enrichment?: {
        byChordIndex: TonalityVaultUiAnnotation[];
      };
      warnings: string[];
    };
  };
};

function formatTonalityVaultFunctionalHint(hint: TonalityVaultUiFunctionalHint): string {
  return hint.replace(/_/g, ' ');
}

function formatTonalityVaultDiatonicClass(label: TonalityVaultUiAnnotation['diatonicClass']): string {
  return label === 'diatonic_major_key' ? 'diatonic to local major' : 'chromatic or unknown';
}

function compareEnrichedLabelForUi(ann?: TonalityVaultUiAnnotation): string {
  if (!ann) return 'No enriched annotation';
  return `${ann.scaleDegreeFromMajor ?? '?'} · ${formatTonalityVaultFunctionalHint(ann.functionalHint)} · ${formatTonalityVaultDiatonicClass(ann.diatonicClass)}`;
}

function envTruthyFlag(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const t = raw.trim().toLowerCase();
  return t === '1' || t === 'true' || t === 'yes';
}

const TONALITY_VAULT_UI_AVAILABLE = envTruthyFlag(import.meta.env.VITE_COMPOSER_OS_TONALITY_VAULT_ENRICH);

function primarySongwriterDisplayLabel(id: string | undefined): string | undefined {
  if (!id?.trim()) return undefined;
  const t = id.trim().toLowerCase();
  return SONGWRITER_OPTIONS.find((o) => o.id === t)?.label ?? id.trim();
}

function isLeadSheetSongModeRoute(presetId?: string, primarySongwriterStyle?: string): boolean {
  if (presetId !== 'song_mode') return false;
  const writer = primarySongwriterStyle?.trim().toLowerCase();
  return writer === 'donald_fagen' || writer === 'barry_harris';
}

const ARRANGER_OPTIONS: { id: string; label: string }[] = [
  { id: 'ellington', label: 'Duke Ellington' },
  { id: 'basie', label: 'Count Basie' },
  { id: 'thad', label: 'Thad Jones' },
  { id: 'schneider', label: 'Maria Schneider' },
  { id: 'gil_evans', label: 'Gil Evans' },
  { id: 'sammy_nestico', label: 'Sammy Nestico' },
  { id: 'quincy_jones', label: 'Quincy Jones' },
  { id: 'bob_brookmeyer', label: 'Bob Brookmeyer' },
  { id: 'clare_fischer', label: 'Clare Fischer' },
  { id: 'manny_albam', label: 'Manny Albam' },
  { id: 'oliver_nelson', label: 'Oliver Nelson' },
  { id: 'gerald_wilson', label: 'Gerald Wilson' },
  { id: 'neal_hefti', label: 'Neal Hefti' },
  { id: 'don_sebesky', label: 'Don Sebesky' },
];

/** Matches engine `BigBandComposerId` / style-pairing “known” arrangers — grouped first like Style dropdowns. */
const ARRANGER_GROUP_CORE_ORDER: readonly string[] = ['ellington', 'basie', 'thad', 'schneider'];

const ARRANGER_OPTION_BY_ID = new Map(ARRANGER_OPTIONS.map((o) => [o.id, o]));
const ARRANGER_GROUP_CORE_IDS = new Set(ARRANGER_GROUP_CORE_ORDER);

const ARRANGER_EXTENDED_ORDERED = ARRANGER_OPTIONS.filter((o) => !ARRANGER_GROUP_CORE_IDS.has(o.id)).sort((a, b) =>
  a.label.localeCompare(b.label)
);

function ArrangerSelectOptionGroups() {
  return (
    <>
      <optgroup label="Big band core (research-backed)">
        {ARRANGER_GROUP_CORE_ORDER.filter((id) => ARRANGER_OPTION_BY_ID.has(id)).map((id) => {
          const o = ARRANGER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="Charts & studio voices">
        {ARRANGER_EXTENDED_ORDERED.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </>
  );
}

const ERA_OPTIONS: { id: string; label: string }[] = [
  { id: 'swing', label: 'Swing' },
  { id: 'bebop', label: 'Bebop' },
  { id: 'post_bop', label: 'Post-bop' },
  { id: 'contemporary', label: 'Contemporary' },
  { id: 'cool_jazz', label: 'Cool Jazz' },
  { id: 'hard_bop', label: 'Hard Bop' },
  { id: 'fusion', label: 'Fusion' },
];

const DEFAULT_CUSTOM_HARMONY_PLACEHOLDER =
  'e.g. Dm9, G13, Cmaj9, A7alt — or Cmaj7 | Am7 | Dm7 | G7 | ... (one chord per bar)';
const DUO_AND_SONG_MODE_CUSTOM_HARMONY_PLACEHOLDER =
  'e.g. Dm9, G13, Cmaj9, A7alt — or Cmaj9 | Am7 | Dm9 | G13 | ... (one chord per bar)';
const ERA_CUSTOM_HARMONY_PLACEHOLDERS: Record<string, string> = {
  swing: 'e.g. Dm9, G13, Cmaj9, A7alt — or Cmaj6 | Am7 | Dm9 | G7 | ... (one chord per bar)',
  bebop: 'e.g. Dm9, G13, Cmaj9, A7alt — or Dm7b5 | G7b9 | Cmaj7 | Ab7#11 | ... (one chord per bar)',
  cool_jazz: 'e.g. Dm9, G13, Cmaj9, A7alt — or Cmaj7 | Am9 | DmMaj7 | G13 | ... (one chord per bar)',
  hard_bop: 'e.g. Dm9, G13, Cmaj9, A7alt — or Fm7 | Bb7#9 | Ebmaj7 | Cm7b5 | ... (one chord per bar)',
  post_bop: 'e.g. Dm9, G13, Cmaj9, A7alt — or Fmaj7#11 | G7alt | Cm7 | Ab7sus | ... (one chord per bar)',
  fusion: 'e.g. Dm9, G13, Cmaj9, A7alt — or Dm9 | Dm11 | Gm9 | Gm11 | ... (one chord per bar)',
  contemporary: 'e.g. Dm9, G13, Cmaj9, A7alt — or Cmaj7#11 | Am11 | Dm9 | G7sus | ... (one chord per bar)',
};

const ENSEMBLE_OPTIONS: { id: string; label: string }[] = [
  { id: 'full_band', label: 'Full' },
  { id: 'medium_band', label: 'Medium' },
  { id: 'small_band', label: 'Small' },
  { id: 'reeds_only', label: 'Reeds' },
  { id: 'brass_only', label: 'Brass' },
  { id: 'custom', label: 'Custom' },
];

/** Fixed style stack for MusicXML modes (duo / ECM) — not user-configurable in this UI. */
const DEFAULT_SCORE_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

const MINIMAL_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

/** Must stay aligned with `StyleProfile` in `engines/composer-os-v2/core/song-mode/songModeStyleProfile.ts`. */
const SONG_MODE_STYLE_OPTIONS = [
  'STYLE_ECM',
  'STYLE_SHORTER_POST_BOP',
  'STYLE_BEBOP_LITE',
  'STYLE_MODERN_JAZZ',
  'STYLE_BEBOP_POST_BOP',
  'STYLE_SOPHISTICATED_POP',
  'STYLE_GROOVE_SOUL',
  'STYLE_INDIE_ART_POP',
  'STYLE_FOLK_GUITAR_NARRATIVE',
  'STYLE_CLASSICAL_INFLUENCE',
] as const;
type SongModeStyleProfile = (typeof SONG_MODE_STYLE_OPTIONS)[number];
const SONG_MODE_ADVANCED_STYLE_SET = new Set<SongModeStyleProfile>([
  'STYLE_SHORTER_POST_BOP',
  'STYLE_MODERN_JAZZ',
  'STYLE_SOPHISTICATED_POP',
  'STYLE_GROOVE_SOUL',
]);

function songModeStyleProfileFromSelectValue(v: string): SongModeStyleProfile | null {
  for (const o of SONG_MODE_STYLE_OPTIONS) {
    if (o === v) return o;
  }
  return null;
}

function songModeStyleProfileLabel(id: SongModeStyleProfile): string {
  if (id === 'STYLE_SHORTER_POST_BOP') return 'Post-Bop (Shorter)';
  if (id === 'STYLE_ECM') return 'ECM';
  if (id === 'STYLE_BEBOP_LITE') return 'Bebop (Light Touch)';
  if (id === 'STYLE_MODERN_JAZZ') return 'Modern Jazz';
  if (id === 'STYLE_BEBOP_POST_BOP') return 'Bebop/Post-Bop';
  if (id === 'STYLE_SOPHISTICATED_POP') return 'Sophisticated Pop';
  if (id === 'STYLE_GROOVE_SOUL') return 'Groove / Soul';
  if (id === 'STYLE_INDIE_ART_POP') return 'Indie Art Pop';
  if (id === 'STYLE_FOLK_GUITAR_NARRATIVE') return 'Folk Guitar Narrative';
  if (id === 'STYLE_CLASSICAL_INFLUENCE') return 'Classical Influence';
  return id.replace(/^STYLE_/, '').replace(/_/g, ' ');
}

function ensembleLabel(id: string): string {
  return ENSEMBLE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function nextVariationIdToken(current: string): string {
  const t = current.trim();
  const m = /^v-(\d+)$/.exec(t);
  if (m) return `v-${Number(m[1]) + 1}`;
  return `v-${Date.now().toString(36)}`;
}

function newVariationIdToken(): string {
  return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Phase 1 LeadSheet preflight — mirrors engine unpack rules for pasted/plain XML (files use binary extract). */
function validateLeadSheetMusicXmlForPhase1(trimmed: string): string | null {
  const r = extractScoreMusicXmlFromString(trimmed);
  return r.ok ? null : r.errors[0] ?? 'LeadSheet MusicXML could not be validated.';
}

type GenResult = {
  success?: boolean;
  error?: string;
  filename?: string;
  filepath?: string;
  harmonySource?: 'builtin' | 'custom';
  customChordProgressionSummary?: string;
  progressionMode?: 'builtin' | 'custom';
  chordProgressionInputRaw?: string;
  parsedCustomProgressionBars?: string[];
  chordProgressionParseFailed?: boolean;
  builtInHarmonyFallbackOccurred?: boolean;
  validation?: {
    integrityPassed?: boolean;
    behaviourGatesPassed?: boolean;
    mxValidationPassed?: boolean;
    strictBarMathPassed?: boolean;
    exportRoundTripPassed?: boolean;
    instrumentMetadataPassed?: boolean;
    readiness?: { release?: number; mx?: number; shareable?: boolean };
    errors?: string[];
    warnings?: string[];
  };
  runManifest?: {
    seed?: number;
    presetId?: string;
    activeModules?: string[];
    timestamp?: string;
    scoreTitle?: string;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    experimentalCreativeLabel?: string;
    /** Song Mode: style/songwriter receipt lines from the engine (same as `_meta` manifest). */
    songModeStyleSurfaceNotes?: string[];
    songModeDonaldFagenC1Receipt?: string;
    songModeSectionShapingDiagnostics?: {
      version?: number;
      totalBars?: number;
      densityDeltaBMinusA?: number | null;
      colourDeltaBMinusA?: number | null;
      openingVsReturnDelta?: number | null;
      returnVariationSummary?: string | null;
      returnVariationType?: string | null;
      contributingSlices?: string[];
    };
    songModeSectionBehaviourDescriptors?: Array<{
      sliceId: string;
      densityBiasByRole?: Partial<Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>>;
      registerBiasByRole?: Partial<Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>>;
      harmonicColourBiasByRole?: Partial<
        Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>
      >;
      returnVariationType?: string;
    }>;
    songModeProfileRuleDiagnostics?: {
      styleProfile?: string;
      primarySongwriterStyleId?: string;
      secondarySongwriterStyleId?: string | null;
      authorOverlayId?: string | null;
      classicalOverlayId?: string | null;
      styleFingerprint?: string;
      resolvedRuleIds?: string[];
      songwriterCompProfileId?: string;
      bacharachSongModeRuleBundleId?: string;
      behaviourSourceIds?: string[];
    };
    songModeDiagnosticsSummary?: {
      profile?: string;
      rules?: string;
      sectionShape?: string;
      sectionSources?: string[];
    };
    songModeLeadSheetInputApplied?: boolean;
    songModeLeadSheetAnchorStartApplied?: boolean;
    importHarmonyMode?: 'free_harmony' | 'lock_harmony' | 'blend_harmony';
    importHarmonyModeSource?: 'defaulted' | 'explicit';
    importHarmonyPolicyVersion?: number;
    importHarmonyLockApplied?: boolean;
    importHarmonyLockFallbackReason?: string;
    importHarmonyLockedBarsCount?: number;
  };
  scoreTitle?: string;
  requestEcho?: {
    tonalCenter?: string;
    bpm?: number;
    totalBars?: number;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    stylePairing?: { songwriterStyle: string; arrangerStyle: string; era?: string };
    ensembleConfigId?: string;
    primarySongwriterStyle?: string;
    styleProfile?: SongModeStyleProfile;
    c4Strength?: 'light' | 'medium' | 'strong';
    blendStrength?: 'light' | 'medium' | 'strong';
    leadSheetHarmonyDisplayMode?: HarmonyDisplayModeUi;
    leadSheetHarmonyDisplayModeEffective?: HarmonyDisplayModeUi;
    groove?: number;
    space?: number;
    expression?: number;
    surprise?: number;
  };
  harmonyInterpretationView?: SongModeHarmonyInterpretationViewUi;
  _uiHadLeadSheetInputForRun?: boolean;
  _uiLeadSheetPreflightErrorForRun?: string | null;
  _uiLeadSheetInputSourceForRun?: 'file' | 'paste';
  _uiLeadSheetFileNameForRun?: string;
  stylePairingReceipt?: {
    summary: string;
    confidenceScore: number;
    experimentalFlag: boolean;
    songwriterStyle: string;
    arrangerStyle: string;
    era: string | null;
  };
  voice2PolyphonyDiagnostics?: GuitarVoice2PolyphonyDiagnostics;
  vocalLeadSheetFilepath?: string;
  /** Song Mode — GCE weighted overall when the gate ran (engine receipt). */
  gceScore?: number;
  /** Song Mode — ship gate threshold met when scored. */
  gceGatePassed?: boolean;
};

type SongModeSectionRoleUi = 'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO';
type SongModeRecentRun = {
  id: string;
  label: string;
  seed?: number;
  timestamp?: string;
  filepath?: string;
  summaryLine?: string;
  shape?: NonNullable<NonNullable<GenResult['runManifest']>['songModeSectionShapingDiagnostics']>;
  profile?: NonNullable<NonNullable<GenResult['runManifest']>['songModeProfileRuleDiagnostics']>;
  sectionDescriptors: NonNullable<NonNullable<GenResult['runManifest']>['songModeSectionBehaviourDescriptors']>;
};

const SONG_MODE_SECTION_ROLE_ORDER: SongModeSectionRoleUi[] = ['OPENING', 'BRIDGE_LIFT', 'RETURN', 'OUTRO', 'WHOLE'];

const SONG_MODE_SECTION_ROLE_LABELS: Record<SongModeSectionRoleUi, string> = {
  OPENING: 'A / Opening',
  BRIDGE_LIFT: 'B / Bridge Lift',
  RETURN: 'A Return',
  OUTRO: 'Outro',
  WHOLE: 'Whole Form',
};

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function fmtSigned(v: number | null | undefined): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '-';
  return `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
}

function notifyGenPhase(phase: 'running' | 'succeeded' | 'failed' | 'idle'): void {
  window.composerOsDesktop?.notifyGenerationPhase(phase);
}

export function HomeGenerate({
  onResult,
}: {
  onResult: (r: {
    record: Record<string, unknown>;
    summary: { status: 'success' | 'failed'; shareable?: boolean; at?: string };
  }) => void;
}) {
  const [presetId, setPresetId] = useState('song_mode');
  const [ecmMode, setEcmMode] = useState<'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER'>(
    'ECM_METHENY_QUARTET'
  );
  const [baseSeed, setBaseSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [variationId, setVariationId] = useState('v-1');
  const [tonalCenter, setTonalCenter] = useState('');
  const [bpm, setBpm] = useState(120);
  const [totalBars, setTotalBars] = useState(32);
  const [creativeControlLevel, setCreativeControlLevel] = useState<
    'stable' | 'balanced' | 'surprise'
  >('stable');
  const [variationEnabled, setVariationEnabled] = useState(false);
  const [songwriterStyle, setSongwriterStyle] = useState('donald_fagen');
  const [arrangerStyle, setArrangerStyle] = useState('thad');
  const [songModeStyleProfile, setSongModeStyleProfile] = useState<SongModeStyleProfile>('STYLE_ECM');
  const [intentGroove, setIntentGroove] = useState(0.5);
  const [intentSpace, setIntentSpace] = useState(0.5);
  const [intentExpression, setIntentExpression] = useState(0.5);
  const [intentSurprise, setIntentSurprise] = useState(0.5);
  const [intentPattern, setIntentPattern] = useState(0.5);
  const [secondarySongwriterStyle, setSecondarySongwriterStyle] = useState('');
  const [songModeDiversityPresetId, setSongModeDiversityPresetId] = useState('');
  const [authorOverlay, setAuthorOverlay] = useState('');
  const [alternateTuningEnabled, setAlternateTuningEnabled] = useState(false);
  const [alternateTuningMode, setAlternateTuningMode] = useState<GuitarTuningMode>('standard');
  const [sharedTuningPresetId, setSharedTuningPresetId] = useState('standard');
  const [guitar1TuningPresetId, setGuitar1TuningPresetId] = useState('standard');
  const [guitar2TuningPresetId, setGuitar2TuningPresetId] = useState('standard');
  const [sharedCustomTuning, setSharedCustomTuning] = useState(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  const [guitar1CustomTuning, setGuitar1CustomTuning] = useState(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  const [guitar2CustomTuning, setGuitar2CustomTuning] = useState(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  const [includeVocalLeadSheet, setIncludeVocalLeadSheet] = useState(false);
  const [era, setEra] = useState('post_bop');
  const [ensembleConfigId, setEnsembleConfigId] = useState('full_band');
  const [scoreTitle, setScoreTitle] = useState('');
  /** Guitar–Bass Duo: optional chord line — 8 bars (tiled to 32 in long-form) or 32 bars (locked). When non-empty, engine uses custom harmony. */
  const [chordProgressionText, setChordProgressionText] = useState('');
  const [songModeLeadSheetMusicXml, setSongModeLeadSheetMusicXml] = useState('');
  const [leadSheetFileName, setLeadSheetFileName] = useState<string | null>(null);
  const [leadSheetInputSource, setLeadSheetInputSource] = useState<'file' | 'paste' | null>(null);
  const [importHarmonyModeUi, setImportHarmonyModeUi] = useState<'free_harmony' | 'lock_harmony' | 'blend_harmony'>(
    'free_harmony'
  );
  const [leadSheetHarmonyDisplayModeUi, setLeadSheetHarmonyDisplayModeUi] = useState<HarmonyDisplayModeUi>('raw');
  const [harmonyBlendUi, setHarmonyBlendUi] = useState(0.5);
  const [formId, setFormId] = useState<string>('');
  /** Big Band only: '' = standard (no formId); `big_band_blues12` = 42-bar blues chart. */
  const [bigBandFormId, setBigBandFormId] = useState('');
  const [songFormMenuOpen, setSongFormMenuOpen] = useState(false);
  const songFormDropdownRef = useRef<HTMLDivElement>(null);
  const [c4Strength, setC4Strength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [blendStrength, setBlendStrength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [funkGroove, setFunkGroove] = useState(false);
  const [riffStyle, setRiffStyle] = useState<'metheny' | 'scofield' | 'funk' | 'neutral'>('neutral');
  const [riffDensity, setRiffDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [riffGrid, setRiffGrid] = useState<'eighth' | 'sixteenth'>('eighth');
  const [riffLineMode, setRiffLineMode] = useState<
    'single_line' | 'guitar_bass' | 'octave_double'
  >('single_line');
  const [riffBass, setRiffBass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [recentSongModeRuns, setRecentSongModeRuns] = useState<SongModeRecentRun[]>([]);
  const [compareRunAId, setCompareRunAId] = useState('');
  const [compareRunBId, setCompareRunBId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<OutputDirectoryResponse | null>(null);
  /** Same merge as Presets tab — single source of truth with engine `getPresets()`. */
  const [modePresets, setModePresets] = useState<AppPresetCard[]>(() => [...APP_PRESET_REGISTRY]);
  const desktopTruthDumpEnabled = useRef(false);
  const songModeStyleProfileRef = useRef<SongModeStyleProfile>(songModeStyleProfile);
  const alternateTuningEnabledRef = useRef(alternateTuningEnabled);
  const alternateTuningModeRef = useRef<GuitarTuningMode>(alternateTuningMode);
  const sharedTuningPresetIdRef = useRef(sharedTuningPresetId);
  const guitar1TuningPresetIdRef = useRef(guitar1TuningPresetId);
  const guitar2TuningPresetIdRef = useRef(guitar2TuningPresetId);
  const sharedCustomTuningRef = useRef(sharedCustomTuning);
  const guitar1CustomTuningRef = useRef(guitar1CustomTuning);
  const guitar2CustomTuningRef = useRef(guitar2CustomTuning);

  useEffect(() => {
    songModeStyleProfileRef.current = songModeStyleProfile;
    alternateTuningEnabledRef.current = alternateTuningEnabled;
    alternateTuningModeRef.current = alternateTuningMode;
    sharedTuningPresetIdRef.current = sharedTuningPresetId;
    guitar1TuningPresetIdRef.current = guitar1TuningPresetId;
    guitar2TuningPresetIdRef.current = guitar2TuningPresetId;
    sharedCustomTuningRef.current = sharedCustomTuning;
    guitar1CustomTuningRef.current = guitar1CustomTuning;
    guitar2CustomTuningRef.current = guitar2CustomTuning;
  }, [
    songModeStyleProfile,
    alternateTuningEnabled,
    alternateTuningMode,
    sharedTuningPresetId,
    guitar1TuningPresetId,
    guitar2TuningPresetId,
    sharedCustomTuning,
    guitar1CustomTuning,
    guitar2CustomTuning,
  ]);

  useEffect(() => {
    const d = window.composerOsDesktop;
    if (d?.mode === 'desktop' && typeof d.getRuntimeBuildInfo === 'function') {
      void d.getRuntimeBuildInfo().then((r) => {
        console.log('[Composer OS] runtime build info (renderer)', r);
        desktopTruthDumpEnabled.current = !!(r as { truthDumpEnabled?: boolean }).truthDumpEnabled;
      });
    }
  }, []);

  useEffect(() => {
    if (recentSongModeRuns.length === 0) {
      setCompareRunAId('');
      setCompareRunBId('');
      return;
    }
    if (!compareRunAId || !recentSongModeRuns.some((r) => r.id === compareRunAId)) {
      setCompareRunAId(recentSongModeRuns[0]!.id);
    }
    if (!compareRunBId || !recentSongModeRuns.some((r) => r.id === compareRunBId)) {
      setCompareRunBId(recentSongModeRuns[1]?.id ?? recentSongModeRuns[0]!.id);
    }
  }, [recentSongModeRuns, compareRunAId, compareRunBId]);

  useEffect(() => {
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .getPresets()
      .then((r) => setModePresets(mergePresetsWithRegistry(r.presets)))
      .catch(() => setModePresets([...APP_PRESET_REGISTRY]));
  }, []);

  function modeLabelForPreset(id: string): string {
    return modePresets.find((m) => m.id === id)?.name ?? id;
  }

  const ensembleSongFormPreset = presetId === 'big_band' || presetId === 'string_quartet';
  const songFormBarPreset =
    presetId === 'song_mode' ||
    presetId === 'guitar_bass_duo' ||
    presetId === 'guitar_bass_duo_single_line' ||
    ensembleSongFormPreset;

  useEffect(() => {
    if (presetId === 'riff_generator') {
      setTotalBars((tb) => (tb >= 1 && tb <= 4 ? tb : 2));
    } else if (songFormBarPreset) {
      if (ensembleSongFormPreset) {
        setTotalBars((tb) => ([16, 24, 32, 40, 42, 48, 64].includes(tb) ? tb : 32));
      } else {
        setTotalBars((tb) => clampSongFormBarCount(tb, 32));
      }
    } else {
      setTotalBars((tb) => (tb >= 8 ? tb : 32));
    }
  }, [presetId, songFormBarPreset, ensembleSongFormPreset]);

  useEffect(() => {
    if (presetId !== 'big_band') setBigBandFormId('');
  }, [presetId]);

  useEffect(() => {
    if (presetId !== 'big_band' || bigBandFormId !== 'big_band_blues12') return;
    if (totalBars !== 42) setTotalBars(42);
  }, [presetId, bigBandFormId, totalBars]);

  useEffect(() => {
    if (!songFormMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = songFormDropdownRef.current;
      if (el && !el.contains(e.target as Node)) setSongFormMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [songFormMenuOpen]);

  const songFormBars = ensembleSongFormPreset
    ? [16, 24, 32, 40, 42, 48, 64].includes(totalBars)
      ? totalBars
      : 32
    : clampSongFormBarCount(totalBars, 32);
  const customHarmonyPlaceholder =
    presetId === 'big_band' || presetId === 'string_quartet'
      ? (ERA_CUSTOM_HARMONY_PLACEHOLDERS[era] ?? DEFAULT_CUSTOM_HARMONY_PLACEHOLDER)
      : presetId === 'guitar_bass_duo' ||
          presetId === 'guitar_bass_duo_single_line' ||
          presetId === 'song_mode'
        ? DUO_AND_SONG_MODE_CUSTOM_HARMONY_PLACEHOLDER
        : DEFAULT_CUSTOM_HARMONY_PLACEHOLDER;
  const isSongModeLeadSheetPhase1Writer =
    presetId === 'song_mode' && SONG_MODE_LEADSHEET_PHASE1_WRITERS.has(songwriterStyle.trim().toLowerCase());
  const leadSheetPreflightError =
    presetId === 'song_mode' && isSongModeLeadSheetPhase1Writer && songModeLeadSheetMusicXml.trim().length > 0
      ? validateLeadSheetMusicXmlForPhase1(songModeLeadSheetMusicXml.trim())
      : null;
  const showHarmonyImportDebugDev = presetId === 'song_mode' && import.meta.env.DEV;

  const ensembleChordBarCountForLabel =
    presetId === 'big_band'
      ? Math.max(16, Number.isFinite(totalBars) && totalBars > 0 ? totalBars : 32)
      : presetId === 'string_quartet'
        ? Math.max(16, Number.isFinite(totalBars) && totalBars > 0 ? totalBars : 24)
        : null;

  useEffect(() => {
    if (!songFormBarPreset) return;
    setChordProgressionText((prev) => alignChordProgressionToSongFormBars(prev, songFormBars));
  }, [songFormBars, songFormBarPreset]);

  function onSongFormChordProgressionBlur() {
    if (!songFormBarPreset) return;
    setChordProgressionText((prev) => alignChordProgressionToSongFormBars(prev, songFormBars));
  }

  const isScorePreset =
    presetId === 'guitar_bass_duo' ||
    presetId === 'guitar_bass_duo_single_line' ||
    presetId === 'ecm_chamber' ||
    presetId === 'riff_generator';

  const generate = useCallback(
    async (opts?: { seedOverride?: number; variationOverride?: string }) => {
      const seed = opts?.seedOverride ?? baseSeed;
      const vid = opts?.variationOverride ?? variationId;
      setLoading(true);
      setError(null);
      notifyGenPhase('running');
      try {
        const stylePairingSong =
          presetId === 'song_mode'
            ? { songwriterStyle: songwriterStyle, arrangerStyle: arrangerStyle, era }
            : undefined;
        const stylePairingBigBand =
          presetId === 'big_band'
            ? {
                songwriterStyle: songwriterStyle,
                arrangerStyle: arrangerStyle,
                era,
              }
            : undefined;
        const stylePairingStringQuartet =
          presetId === 'string_quartet'
            ? {
                songwriterStyle: songwriterStyle,
                arrangerStyle: arrangerStyle,
                era,
              }
            : undefined;

        const tonalTrim = tonalCenter.trim();
        const chordTrim = chordProgressionText.trim();
        const songModeLeadSheetTrim = songModeLeadSheetMusicXml.trim();
        const hadLeadSheetInputForRun = songModeLeadSheetTrim.length > 0;
        const uiLeadSheetPreflightErrorForRun = leadSheetPreflightError;
        const uiLeadSheetInputSourceForRun: 'file' | 'paste' | undefined = hadLeadSheetInputForRun
          ? leadSheetInputSource ?? 'paste'
          : undefined;
        const uiLeadSheetFileNameForRun =
          hadLeadSheetInputForRun && uiLeadSheetInputSourceForRun === 'file' && leadSheetFileName
            ? leadSheetFileName
            : undefined;
        if (presetId === 'wyble_etude' && !chordTrim) {
          setError(
            'Wyble requires a chord progression. Enter bar-separated chords in the Chord progression field (no built-in fallback).'
          );
          setLoading(false);
          notifyGenPhase('failed');
          onResult({
            record: {},
            summary: { status: 'failed', at: new Date().toISOString() },
          });
          return;
        }
        /**
         * Song Mode: users often paste the 32-bar line into "Tonal centre" instead of "Chord progression".
         * If we only read `chordProgressionText`, the API gets a long string in `tonalCenter` and no
         * `chordProgressionText` → engine falls back to built-in duo32 (Dmin9/G13/…).
         */
        const songChordLine = presetId === 'song_mode' ? chordTrim || tonalTrim : chordTrim;

        const tbForm = songFormBarPreset ? songFormBars : totalBars;
        const ensembleEffBarsBigBand = Math.max(
          16,
          Number.isFinite(totalBars) && totalBars > 0 ? totalBars : 32
        );
        const ensembleEffBarsQuartet = Math.max(
          16,
          Number.isFinite(totalBars) && totalBars > 0 ? totalBars : 24
        );
        const coreFields = mapCoreUiToGenerationFields({
          presetId,
          seed,
          tonalCenter:
            presetId === 'song_mode' && chordTrim === '' && tonalTrim !== '' ? '' : tonalCenter,
          bpm,
          totalBars: songFormBarPreset ? tbForm : totalBars,
          variationId: vid,
          creativeControlLevel,
          stylePairing: stylePairingSong ?? stylePairingBigBand ?? stylePairingStringQuartet,
          ensembleConfigId: presetId === 'big_band' ? ensembleConfigId : undefined,
          primarySongwriterStyle:
            presetId === 'song_mode' ||
            presetId === 'big_band' ||
            presetId === 'string_quartet'
              ? songwriterStyle
              : undefined,
          formId: presetId === 'big_band' ? bigBandFormId : formId,
        });
        /** Duo / Song Form: chord count matches selected total bars, or 8 bars (tiled) when length > 8. */
        let duoHarmonyFields: {
          harmonyMode: 'custom' | 'custom_locked';
          chordProgressionText: string;
          totalBars?: number;
          longFormEnabled?: boolean;
        } | null = null;
        if (presetId === 'guitar_bass_duo' && chordTrim) {
          const parsedDuo = parseChordProgressionInputWithBarCount(
            chordTrim,
            tbForm,
            tbForm !== 8 ? [8] : undefined
          );
          if (!parsedDuo.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
          const duoBarCount = parsedDuo.bars.length;
          if (duoBarCount === tbForm) {
            duoHarmonyFields = {
              harmonyMode: 'custom_locked',
              chordProgressionText: chordTrim,
              totalBars: tbForm,
              longFormEnabled: tbForm >= 16,
            };
          } else {
            duoHarmonyFields = {
              harmonyMode: 'custom',
              chordProgressionText: chordTrim,
              totalBars: tbForm,
              longFormEnabled: true,
            };
          }
        } else if (presetId === 'guitar_bass_duo_single_line' && chordTrim) {
          const pLine = parseChordProgressionInputWithBarCount(
            chordTrim,
            tbForm,
            tbForm !== 8 ? [8] : undefined
          );
          if (!pLine.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
          const lineBarCount = pLine.bars.length;
          duoHarmonyFields = {
            harmonyMode: lineBarCount === tbForm ? 'custom_locked' : 'custom',
            chordProgressionText: chordTrim,
            totalBars: tbForm,
            longFormEnabled: lineBarCount === tbForm ? tbForm >= 16 : true,
          };
        }
        if (presetId === 'song_mode' && songChordLine) {
          const parsedSong = parseChordProgressionInputWithBarCount(songChordLine, tbForm);
          if (!parsedSong.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        if (presetId === 'song_mode' && isSongModeLeadSheetPhase1Writer && songModeLeadSheetTrim.length > 0) {
          const leadErr = validateLeadSheetMusicXmlForPhase1(songModeLeadSheetTrim);
          if (leadErr) {
            setError(leadErr);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        if (presetId === 'wyble_etude' && chordTrim) {
          const wybleParsed = parseChordProgressionInputFlexible(chordTrim);
          if (!wybleParsed.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        if (presetId === 'big_band' && chordTrim) {
          const parsedBb = parseChordProgressionInputWithBarCount(chordTrim, ensembleEffBarsBigBand);
          if (!parsedBb.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        if (presetId === 'string_quartet' && chordTrim) {
          const parsedSq = parseChordProgressionInputWithBarCount(chordTrim, ensembleEffBarsQuartet);
          if (!parsedSq.ok) {
            setError(CHORD_PROGRESSION_PARSE_ERROR_MESSAGE);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        let alternateGuitarTuningPayload: AlternateGuitarTuningRequest | undefined;
        const __generateCorrelationId =
          presetId === 'song_mode' ? `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : undefined;
        const liveSongModeStyleProfile = songModeStyleProfileRef.current;
        const liveAlternateTuningEnabled = alternateTuningEnabledRef.current;
        if (presetId === 'song_mode' && liveSongModeStyleProfile === 'STYLE_INDIE_ART_POP' && liveAlternateTuningEnabled) {
          const specFor = (
            presetIdLocal: string,
            customValues: string[]
          ): { presetId: string; customStrings?: [string, string, string, string, string, string] } => {
            if (presetIdLocal === 'custom') {
              return { presetId: 'custom', customStrings: [...customValues] as [string, string, string, string, string, string] };
            }
            return { presetId: presetIdLocal };
          };
          alternateGuitarTuningPayload =
            alternateTuningModeRef.current === 'standard'
              ? { mode: 'standard' }
              : alternateTuningModeRef.current === 'shared'
                ? { mode: 'shared', shared: specFor(sharedTuningPresetIdRef.current, sharedCustomTuningRef.current) }
                : {
                    mode: 'separate',
                    guitar1: specFor(guitar1TuningPresetIdRef.current, guitar1CustomTuningRef.current),
                    guitar2: specFor(guitar2TuningPresetIdRef.current, guitar2CustomTuningRef.current),
                  };
          const normalized = normalizeAlternateGuitarTuningRequest(alternateGuitarTuningPayload);
          if (!normalized) {
            setError('Alternate guitar tuning is invalid. Use six notes from low to high strings (for example: D2 A2 D3 G3 A3 D4).');
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        const generatePayload = {
          ...coreFields,
          variationEnabled: variationEnabled,
          styleStack: isScorePreset ? DEFAULT_SCORE_STYLE_STACK : MINIMAL_STYLE_STACK,
          title: scoreTitle.trim() || undefined,
          ...(presetId === 'ecm_chamber' ? { ecmMode } : {}),
          ...(isGuitarBassDuoFamily(presetId) || presetId === 'song_mode'
            ? { c4Strength: c4Strength, blendStrength: blendStrength, songModeJamesBrownFunkOverlay: funkGroove }
            : {}),
          ...(duoHarmonyFields ? duoHarmonyFields : {}),
          ...(presetId === 'song_mode' && songChordLine
            ? {
                harmonyMode: 'custom_locked' as const,
                chordProgressionText: songChordLine,
                totalBars: tbForm,
                longFormEnabled: tbForm >= 16,
              }
            : {}),
          ...(presetId === 'wyble_etude' && chordTrim ? { chordProgressionText: chordTrim } : {}),
          ...(presetId === 'riff_generator'
            ? {
                riffStyle,
                riffDensity,
                riffGrid,
                riffLineMode,
                riffBass,
                ...(chordTrim ? { chordProgressionText: chordTrim } : {}),
              }
            : {}),
          ...((presetId === 'big_band' || presetId === 'string_quartet') && chordTrim
            ? { chordProgressionText: chordTrim }
            : {}),
          ...(presetId === 'song_mode'
            ? {
                ...(typeof __generateCorrelationId === 'string' ? { __generateCorrelationId } : {}),
                styleProfile: liveSongModeStyleProfile,
                leadSheetHarmonyDisplayMode: leadSheetHarmonyDisplayModeUi,
                intent: {
                  groove: intentGroove,
                  space: intentSpace,
                  expression: intentExpression,
                  surprise: intentSurprise,
                  pattern: intentPattern,
                },
                ...(includeVocalLeadSheet ? { includeVocalLeadSheet: true as const } : {}),
                ...(secondarySongwriterStyle.trim()
                  ? { secondarySongwriterStyle: secondarySongwriterStyle.trim() }
                  : {}),
                ...(authorOverlay.trim() ? { authorOverlay: authorOverlay.trim() } : {}),
                ...(alternateGuitarTuningPayload ? { alternateGuitarTuning: alternateGuitarTuningPayload } : {}),
                ...(isSongModeLeadSheetPhase1Writer && songModeLeadSheetTrim.length > 0
                  ? { songModeLeadSheetMusicXml: songModeLeadSheetTrim }
                  : {}),
                ...(showHarmonyImportDebugDev
                  ? {
                      importHarmonyMode: importHarmonyModeUi,
                      harmonyBlend: Math.max(0, Math.min(1, harmonyBlendUi)),
                    }
                  : {}),
              }
            : {}),
        };

        if (presetId === 'song_mode' && songChordLine.length > 0) {
          const gp = generatePayload as { chordProgressionText?: string };
          const out = typeof gp.chordProgressionText === 'string' ? gp.chordProgressionText.trim() : '';
          if (out !== songChordLine) {
            throw new Error(
              'Composer OS: chord progression did not reach the generate request (internal payload mismatch).'
            );
          }
        }
        if (presetId === 'song_mode') {
          const userOfferedHarmony = chordTrim.length > 0 || tonalTrim.length > 0;
          const gp = generatePayload as { chordProgressionText?: string };
          const out = typeof gp.chordProgressionText === 'string' ? gp.chordProgressionText.trim() : '';
          if (userOfferedHarmony && out.length === 0) {
            throw new Error(
              'Composer OS: you entered chord text but it was not sent to the engine. Use the Chord progression field for Song Mode, or rebuild the app if this persists.'
            );
          }
        }

        if (presetId === 'song_mode') {
          console.log('[UI][manual-generate] final request payload', JSON.stringify(generatePayload, null, 2));
        }
        if (typeof __generateCorrelationId === 'string') {
          const gp = generatePayload as { alternateGuitarTuning?: unknown };
          console.log('[GEN-CORR] HomeGenerate:payload-built', {
            corr: __generateCorrelationId,
            alternateGuitarTuning: gp.alternateGuitarTuning,
          });
        }
        if (presetId === 'song_mode' && songChordLine.length > 0) {
          console.log('[Composer OS] outgoing harmony text:', songChordLine.slice(0, 50));
        }
        if (desktopTruthDumpEnabled.current && presetId === 'song_mode') {
          console.log('[composer-os truth] HomeGenerate UI harmony (trimmed)', songChordLine.slice(0, 2000));
          console.log(
            '[composer-os truth] HomeGenerate request payload',
            JSON.stringify(generatePayload, null, 2)
          );
        }
        const r = (await api.generate(generatePayload)) as GenResult;
        setResult({
          ...r,
          _uiHadLeadSheetInputForRun: hadLeadSheetInputForRun,
          _uiLeadSheetPreflightErrorForRun: uiLeadSheetPreflightErrorForRun,
          _uiLeadSheetInputSourceForRun: uiLeadSheetInputSourceForRun,
          _uiLeadSheetFileNameForRun: uiLeadSheetFileNameForRun,
        });
        if (
          r.runManifest?.presetId === 'song_mode' &&
          (r.runManifest.songModeSectionShapingDiagnostics ||
            r.runManifest.songModeProfileRuleDiagnostics ||
            (r.runManifest.songModeSectionBehaviourDescriptors?.length ?? 0) > 0)
        ) {
          const id = `${r.runManifest.timestamp ?? 'no-ts'}:${r.runManifest.seed ?? 'no-seed'}:${r.filepath ?? ''}`;
          const summaryParts = [
            r.runManifest.songModeDiagnosticsSummary?.profile,
            r.runManifest.songModeDiagnosticsSummary?.rules,
            r.runManifest.songModeDiagnosticsSummary?.sectionShape,
          ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
          const runEntry: SongModeRecentRun = {
            id,
            label: `Seed ${r.runManifest.seed ?? '-'} · ${r.runManifest.timestamp ?? 'run'}`,
            seed: r.runManifest.seed,
            timestamp: r.runManifest.timestamp,
            filepath: r.filepath,
            summaryLine: summaryParts.join(' | '),
            shape: r.runManifest.songModeSectionShapingDiagnostics,
            profile: r.runManifest.songModeProfileRuleDiagnostics,
            sectionDescriptors: r.runManifest.songModeSectionBehaviourDescriptors ?? [],
          };
          setRecentSongModeRuns((prev) => {
            const next = [runEntry, ...prev.filter((x) => x.id !== runEntry.id)];
            return next.slice(0, 10);
          });
        }
        const ok = !!r.success;
        if (!ok) {
          const errMsg =
            (r as { error?: string }).error ??
            (r.validation?.errors?.length ? r.validation.errors.join(' ') : undefined);
          if (errMsg) setError(errMsg);
          else if (!r.success) setError('Generation failed.');
        }
        notifyGenPhase(ok ? 'succeeded' : 'failed');
        const shareable = r.validation?.readiness?.shareable;
        const at = new Date().toISOString();
        onResult({
          record: r as Record<string, unknown>,
          summary: { status: ok ? 'success' : 'failed', shareable, at },
        });
        api.getOutputDirectory().then((o) => setOutputDir(o)).catch(() => {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const lower = msg.toLowerCase();
        const leadSheetHint =
          presetId === 'song_mode' &&
          isSongModeLeadSheetPhase1Writer &&
          songModeLeadSheetMusicXml.trim().length > 0 &&
          (lower.includes('lead') || lower.includes('musicxml') || lower.includes('xml'));
        const displayMessage = leadSheetHint ? `LeadSheet MusicXML import failed: ${msg}` : msg;
        setError(displayMessage);
        setResult(null);
        notifyGenPhase('failed');
        onResult({
          record: {},
          summary: { status: 'failed', at: new Date().toISOString() },
        });
      } finally {
        setLoading(false);
      }
    },
    [
      baseSeed,
      variationId,
      tonalCenter,
      bpm,
      totalBars,
      creativeControlLevel,
      variationEnabled,
      songwriterStyle,
      arrangerStyle,
      era,
      ensembleConfigId,
      presetId,
      scoreTitle,
      chordProgressionText,
      leadSheetFileName,
      leadSheetInputSource,
      ecmMode,
      riffStyle,
      riffDensity,
      riffGrid,
      riffLineMode,
      riffBass,
      songModeStyleProfile,
      intentGroove,
      intentSpace,
      intentExpression,
      intentSurprise,
      intentPattern,
      secondarySongwriterStyle,
      authorOverlay,
      alternateTuningEnabled,
      alternateTuningMode,
      sharedTuningPresetId,
      guitar1TuningPresetId,
      guitar2TuningPresetId,
      sharedCustomTuning,
      guitar1CustomTuning,
      guitar2CustomTuning,
      songModeLeadSheetMusicXml,
      leadSheetPreflightError,
      showHarmonyImportDebugDev,
      importHarmonyModeUi,
      leadSheetHarmonyDisplayModeUi,
      harmonyBlendUi,
      includeVocalLeadSheet,
      c4Strength,
      blendStrength,
      funkGroove,
      formId,
      bigBandFormId,
      songFormBarPreset,
      songFormBars,
      onResult,
    ]
  );

  function dirnameOnly(fp: string): string {
    const p = fp.replace(/[/\\]+$/, '');
    const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    return li >= 0 ? p.slice(0, li) : p;
  }

  const openFolder = async (folderPath?: string) => {
    setError(null);
    try {
      const r = await api.openOutputFolder(folderPath ? { path: folderPath } : {});
      if (!r.success && r.message) {
        setError(r.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const v = result?.validation;
  const rm = result?.runManifest;
  const sectionShapeDiag = rm?.songModeSectionShapingDiagnostics;
  const sectionShapeDescriptors = rm?.songModeSectionBehaviourDescriptors ?? [];
  const songModeProfileRuleRows = buildSongModeProfileRuleRows(rm?.songModeProfileRuleDiagnostics);
  const sectionSourceRows = buildSongModeSectionSourceRows(sectionShapeDescriptors);
  const sectionShapeRows = SONG_MODE_SECTION_ROLE_ORDER.map((role) => {
    const roleDescriptors = sectionShapeDescriptors.filter((descriptor) => {
      const hasDensity = typeof descriptor.densityBiasByRole?.[role] === 'number';
      const hasColour = typeof descriptor.harmonicColourBiasByRole?.[role] === 'number';
      const hasRegister = typeof descriptor.registerBiasByRole?.[role] === 'number';
      const hasReturnVariation = role === 'RETURN' && typeof descriptor.returnVariationType === 'string';
      return hasDensity || hasColour || hasRegister || hasReturnVariation;
    });
    return {
      role,
      densityBiasMean: mean(
        roleDescriptors
          .map((descriptor) => descriptor.densityBiasByRole?.[role])
          .filter((value): value is number => typeof value === 'number')
      ),
      colourBiasMean: mean(
        roleDescriptors
          .map((descriptor) => descriptor.harmonicColourBiasByRole?.[role])
          .filter((value): value is number => typeof value === 'number')
      ),
      registerBiasMean: mean(
        roleDescriptors
          .map((descriptor) => descriptor.registerBiasByRole?.[role])
          .filter((value): value is number => typeof value === 'number')
      ),
      contributingSlices: roleDescriptors.map((descriptor) => descriptor.sliceId),
    };
  }).filter((row) => row.contributingSlices.length > 0);
  const compareRunA = recentSongModeRuns.find((r) => r.id === compareRunAId) ?? null;
  const compareRunB = recentSongModeRuns.find((r) => r.id === compareRunBId) ?? null;
  const compareInsights =
    compareRunA && compareRunB
      ? buildSongModeCompareInsights(
          {
            label: 'Run A',
            summaryLine: compareRunA.summaryLine,
            profile: compareRunA.profile,
            shape: compareRunA.shape,
            sectionDescriptors: compareRunA.sectionDescriptors,
          },
          {
            label: 'Run B',
            summaryLine: compareRunB.summaryLine,
            profile: compareRunB.profile,
            shape: compareRunB.shape,
            sectionDescriptors: compareRunB.sectionDescriptors,
          }
        )
      : [];
  const compareRowsA =
    compareRunA != null
      ? buildSongModeCompareCardRows({
          label: 'Run A',
          summaryLine: compareRunA.summaryLine,
          profile: compareRunA.profile,
          shape: compareRunA.shape,
          sectionDescriptors: compareRunA.sectionDescriptors,
        })
      : [];
  const compareRowsB =
    compareRunB != null
      ? buildSongModeCompareCardRows({
          label: 'Run B',
          summaryLine: compareRunB.summaryLine,
          profile: compareRunB.profile,
          shape: compareRunB.shape,
          sectionDescriptors: compareRunB.sectionDescriptors,
        })
      : [];
  const productKind = (result as { productKind?: string } | null)?.productKind;
  const summaryPresetForPass = result?.runManifest?.presetId ?? presetId;
  const harmonyImportPresentForRun = result?._uiHadLeadSheetInputForRun && !result?._uiLeadSheetPreflightErrorForRun;
  const lockedProgressionPreviewBars = result?.parsedCustomProgressionBars ?? [];
  const lockedProgressionPreviewText =
    lockedProgressionPreviewBars.length > 0
      ? `${lockedProgressionPreviewBars.slice(0, 8).join(' | ')}${
          lockedProgressionPreviewBars.length > 8 ? ' | ...' : ''
        }`
      : undefined;
  const passed = result
    ? productKind && productKind !== 'musicxml'
      ? !!result.success && !(v?.errors?.length)
      : summaryPresetForPass === 'riff_generator'
        ? !!v?.integrityPassed &&
          !!v?.mxValidationPassed &&
          !!v?.strictBarMathPassed &&
          !!v?.instrumentMetadataPassed &&
          !!result.success &&
          !(v?.errors?.length)
        : !!v?.integrityPassed &&
          !!v?.behaviourGatesPassed &&
          !!v?.mxValidationPassed &&
          !!v?.strictBarMathPassed &&
          !!v?.exportRoundTripPassed &&
          !!v?.instrumentMetadataPassed &&
          !!result.success
    : false;

  const receiptOk = result && !error && result.success && passed;
  const receiptFail = result && (!result.success || !passed);
  const showBigReceipt = result || error;

  const modeUx = getModeUx(presetId);
  const summaryPresetId = result?.runManifest?.presetId ?? presetId;
  const outputKindDesc = result
    ? (() => {
        const base = describeOutputKind(summaryPresetId);
        const pathEcho = `${result.filepath ?? ''} ${result.filename ?? ''}`;
        if (pathEcho.toLowerCase().includes('.musicxml') && base.headline === 'Planning only') {
          return {
            category: 'full_score_musicxml' as const,
            headline: 'MusicXML score',
            subtitle: 'Full ensemble score exported for Sibelius or MuseScore.',
          };
        }
        return base;
      })()
    : null;
  const echo = result?.requestEcho;
  const receiptPrimarySongwriterStyle =
    echo?.primarySongwriterStyle?.trim() ||
    rm?.songModeProfileRuleDiagnostics?.primarySongwriterStyleId?.trim() ||
    undefined;
  const hadLeadSheetInputForRun = result?._uiHadLeadSheetInputForRun === true;
  const leadSheetInputSourceForRun = result?._uiLeadSheetInputSourceForRun;
  const leadSheetFileNameForRun = result?._uiLeadSheetFileNameForRun;
  const showLeadSheetStatusBlock =
    hadLeadSheetInputForRun &&
    isLeadSheetSongModeRoute(summaryPresetId, receiptPrimarySongwriterStyle);
  const indieArtPopAltTuningEligible = presetId === 'song_mode' && songModeStyleProfile === 'STYLE_INDIE_ART_POP';

  return (
    <section>
      <h2>Generate</h2>

      {outputDir && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            wordBreak: 'break-word',
          }}
        >
          Library folder:{' '}
          <strong style={{ color: 'var(--text)' }}>{displayOutputPath(outputDir)}</strong>
          <span style={{ display: 'block', marginTop: 6, fontSize: '0.8rem' }}>
            Outputs are saved under the preset folders (e.g. Guitar-Bass Duos) below this location.
          </span>
        </p>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Mode
        </label>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)} disabled={loading}>
          {modePresets.map((m) => (
            <option key={m.id} value={m.id} disabled={!m.supported}>
              {m.name}
              {!m.supported ? ' (coming soon)' : ''}
            </option>
          ))}
        </select>
        {modeUx && (
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              marginTop: '0.45rem',
              marginBottom: 0,
              lineHeight: 1.45,
              maxWidth: 560,
            }}
          >
            {modeUx.hint}
          </p>
        )}
      </div>

      {modeUx && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            maxWidth: 600,
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: 'var(--text)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>About this mode</p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>What it does:</span> {modeUx.whatItDoes}
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Best for:</span> {modeUx.bestFor}
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: 'var(--text-muted)' }}>Output:</span> {modeUx.output}
          </p>
          {presetId === 'ecm_chamber' && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Metheny</strong> leans modal and melodic;{' '}
              <strong style={{ color: 'var(--text)' }}>Schneider / Wheeler</strong> leans expansive clouds and
              swells — pick the flavour below.
            </p>
          )}
          {(presetId === 'song_mode' || presetId === 'big_band') && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Style pairing</strong> blends songwriter and arranger
              habits for colour — guidance for the plan, not a second engine.
            </p>
          )}
          {presetId === 'string_quartet' && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Quartet planning focuses on texture, form, and four-voice roles. <strong style={{ color: 'var(--text)' }}>Era</strong>{' '}
              selects the default lead-sheet chord cycle when you leave <strong style={{ color: 'var(--text)' }}>Chord progression</strong> empty (same
              vocabulary as Big Band).
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Tonal centre / key
        </label>
        {presetId === 'song_mode' && (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              margin: '0 0 0.5rem',
              lineHeight: 1.45,
            }}
          >
            Short key label only (e.g. <code>C</code>). Enter your <strong style={{ color: 'var(--text)' }}>full
            chord progression</strong> (same length as <strong style={{ color: 'var(--text)' }}>Number of bars</strong>
            : 8, 16, or 32) in <strong style={{ color: 'var(--text)' }}>Chord progression</strong> below — not here.
          </p>
        )}
        <input
          type="text"
          value={tonalCenter}
          onChange={(e) => setTonalCenter(e.target.value)}
          placeholder="e.g. C major, F#m"
          disabled={loading}
          style={{
            maxWidth: 320,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        />
      </div>

      {(presetId === 'guitar_bass_duo' ||
        presetId === 'guitar_bass_duo_single_line' ||
        presetId === 'riff_generator' ||
        presetId === 'song_mode' ||
        presetId === 'wyble_etude' ||
        presetId === 'big_band' ||
        presetId === 'string_quartet') && (
        <div style={{ marginBottom: '1rem', maxWidth: 640 }}>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            {presetId === 'wyble_etude'
              ? 'Chord progression (required)'
              : presetId === 'big_band' || presetId === 'string_quartet'
                ? `Chord progression (${ensembleChordBarCountForLabel ?? 16} bars)`
              : songFormBarPreset
                ? `Chord progression (${songFormBars} bars)`
                : 'Chord progression (optional)'}
          </label>
          {presetId === 'wyble_etude' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              Standard jazz symbols such as <code>Dm9</code>, <code>G13</code>, <code>Cmaj9</code>, <code>A7alt</code>{' '}
              — separated by spaces or commas, or one chord per bar with <code>|</code>, <code>,</code>,{' '}
              <code>;</code>, or (without <code>|</code>) newlines / spaced <code>/</code>. Slash chords like{' '}
              <code>G7/B</code> are one symbol. This list is the only harmonic source for Wyble (no default loop).
            </p>
          ) : presetId === 'guitar_bass_duo' || presetId === 'guitar_bass_duo_single_line' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              Use standard jazz notation (e.g. <code>Dm9</code>, <code>G13</code>, <code>Cmaj9</code>, <code>A7alt</code>)
              — spaces or commas, or one chord per bar for the length under <strong style={{ color: 'var(--text)' }}>Number of bars</strong>{' '}
              (8–64 in allowed lengths). Slash chords like <code>D/F#</code> stay one symbol. Leave empty for the built-in
              study progression.
            </p>
          ) : presetId === 'big_band' || presetId === 'string_quartet' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              Use standard jazz notation (e.g. <code>Dm9</code>, <code>G13</code>, <code>Cmaj9</code>, <code>A7alt</code>)
              — spaces or commas, or one chord per bar for the length under <strong style={{ color: 'var(--text)' }}>Number of bars</strong>{' '}
              (planning uses at least 16 bars). Slash chords like <code>D/F#</code> stay one symbol. Leave empty for the built-in
              study cycle.
            </p>
          ) : presetId === 'riff_generator' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              Standard jazz symbols (e.g. <code>Dm9</code>, <code>G13</code>, <code>Cmaj9</code>, <code>A7alt</code>) — spaces or commas.
              One chord or a <strong style={{ color: 'var(--text)' }}>2–4</strong> chord loop — same separators
              as duo when you use more than one chord. Leave empty for a default vamp.
            </p>
          ) : (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>Exactly {songFormBars}</strong> chords for locked harmony (match{' '}
              <strong style={{ color: 'var(--text)' }}>Number of bars</strong>). Use standard jazz notation (e.g.{' '}
              <code>Dm9</code>, <code>G13</code>, <code>Cmaj9</code>, <code>A7alt</code>) — spaces or commas, or one per bar with{' '}
              <code>|</code>. Slash chords (e.g. <code>E7(#11)/G#</code>) are one symbol per bar.
            </p>
          )}
          <textarea
            value={chordProgressionText}
            onChange={(e) => setChordProgressionText(e.target.value)}
            onBlur={songFormBarPreset ? onSongFormChordProgressionBlur : undefined}
            disabled={loading}
            placeholder={customHarmonyPlaceholder}
            rows={
              songFormBarPreset
                ? Math.min(12, Math.max(4, Math.ceil(songFormBars / 6)))
                : presetId === 'wyble_etude'
                  ? 4
                  : 3
            }
            style={{
              width: '100%',
              maxWidth: 600,
              padding: '0.5rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Tempo (BPM)
          </label>
          <input
            type="number"
            min={20}
            max={400}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10) || 0)}
            disabled={loading}
            style={{
              width: 120,
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            {presetId === 'riff_generator' ? 'Riff length (bars)' : 'Number of bars'}
          </label>
          {songFormBarPreset ? (
            <select
              value={songFormBars}
              onChange={(e) => {
                setTotalBars(Number(e.target.value));
                setFormId('');
                if (presetId === 'big_band') setBigBandFormId('');
              }}
              disabled={loading}
              style={{
                width: 140,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            >
              {!ensembleSongFormPreset && <option value={8}>8 bars</option>}
              <option value={16}>16 bars</option>
              <option value={24}>24 bars</option>
              <option value={32}>32 bars</option>
              {(presetId === 'song_mode' ||
                presetId === 'guitar_bass_duo' ||
                presetId === 'guitar_bass_duo_single_line') && (
                <>
                  <option value={48}>48 bars</option>
                  <option value={64}>64 bars</option>
                </>
              )}
              {ensembleSongFormPreset && (
                <>
                  <option value={40}>40 bars</option>
                  <option value={42}>42 bars</option>
                  <option value={48}>48 bars</option>
                  <option value={64}>64 bars</option>
                </>
              )}
            </select>
          ) : (
            <input
              type="number"
              min={presetId === 'riff_generator' ? 1 : 8}
              max={presetId === 'riff_generator' ? 4 : 512}
              value={totalBars}
              onChange={(e) => setTotalBars(parseInt(e.target.value, 10) || 0)}
              disabled={loading}
              style={{
                width: 120,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            />
          )}
        </div>
      </div>

      {(presetId === 'guitar_bass_duo' ||
        presetId === 'guitar_bass_duo_single_line' ||
        presetId === 'song_mode' ||
        presetId === 'string_quartet') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.3rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            Song Form
          </label>
          <div ref={songFormDropdownRef} style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!loading) setSongFormMenuOpen((o) => !o);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
                font: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {formId
                  ? (() => {
                      const f = FORM_OPTIONS_UI.find((x) => x.id === formId);
                      return f
                        ? `${f.label} — ${f.bars} bars (${f.structure})`
                        : 'System default';
                    })()
                  : 'System default'}
              </span>
              <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }} aria-hidden>
                ▾
              </span>
            </button>
            {songFormMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  zIndex: 1000,
                  maxHeight: 280,
                  overflowY: 'auto',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input, var(--bg))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFormId('');
                    setSongFormMenuOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormId('');
                      setSongFormMenuOpen(false);
                    }
                  }}
                  style={{
                    padding: '0.45rem 0.6rem',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  System default
                </div>
                {FORM_OPTIONS_UI.map((f) => (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setFormId(f.id);
                      setTotalBars(f.bars);
                      setSongFormMenuOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFormId(f.id);
                        setTotalBars(f.bars);
                        setSongFormMenuOpen(false);
                      }
                    }}
                    style={{
                      padding: '0.45rem 0.6rem',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {`${f.label} — ${f.bars} bars (${f.structure})`}
                  </div>
                ))}
              </div>
            )}
          </div>
          {presetId === 'string_quartet' && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0.5rem 0 0',
                maxWidth: 560,
                lineHeight: 1.45,
              }}
            >
              Exported scores include rehearsal marks:{' '}
              <strong style={{ color: 'var(--text)' }}>Statement</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Development</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Contrast</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Return</strong>, and{' '}
              <strong style={{ color: 'var(--text)' }}>Coda</strong>.
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Variation
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <code
            style={{
              fontSize: '0.95rem',
              padding: '0.35rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            {variationId.trim() || '(none)'}
          </code>
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              const next = newVariationIdToken();
              setVariationId(next);
              setBaseSeed(Math.floor(Math.random() * 1e9));
            }}
          >
            New Variation
          </button>
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => setVariationId((v) => nextVariationIdToken(v))}
          >
            Next Variation
          </button>
        </div>
      </div>

      {(isGuitarBassDuoFamily(presetId) || presetId === 'song_mode') && (
        <>
          <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
            <label
              htmlFor="composer-os-hook-rhythm-strength"
              style={{
                display: 'block',
                marginBottom: '0.35rem',
                color: 'var(--text)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Hook Rhythm Strength
            </label>
            <select
              id="composer-os-hook-rhythm-strength"
              value={c4Strength}
              onChange={(e) => setC4Strength(e.target.value as 'light' | 'medium' | 'strong')}
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: 260,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
            <label
              htmlFor="composer-os-blend-strength"
              style={{
                display: 'block',
                marginBottom: '0.35rem',
                color: 'var(--text)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Blend Strength
            </label>
            <select
              id="composer-os-blend-strength"
              value={blendStrength}
              onChange={(e) => setBlendStrength(e.target.value as 'light' | 'medium' | 'strong')}
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: 260,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Funk Groove</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={funkGroove}
                onChange={(e) => setFunkGroove(e.target.checked)}
              />
              Enable James Brown funk overlay
            </label>
          </div>
        </>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            display: 'block',
            marginBottom: '0.35rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Feel
        </span>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', maxWidth: 520 }}>
          How much the engine nudges the variation — not the form of the piece.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'stable'}
            onChange={() => setCreativeControlLevel('stable')}
          />
          Stable
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'balanced'}
            onChange={() => setCreativeControlLevel('balanced')}
          />
          Balanced
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'surprise'}
            onChange={() => setCreativeControlLevel('surprise')}
          />
          Surprise
        </label>
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Variation
          </label>
          <select
            value={variationEnabled ? 'on' : 'off'}
            onChange={(e) => setVariationEnabled(e.target.value === 'on')}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Title (optional)
        </label>
        <input
          type="text"
          value={scoreTitle}
          onChange={(e) => setScoreTitle(e.target.value)}
          placeholder="e.g. My sketch — or leave blank for a default title"
          disabled={loading}
          style={{
            width: '100%',
            maxWidth: 520,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        />
      </div>

      {presetId === 'riff_generator' && (
        <div style={{ marginBottom: '1rem', maxWidth: 560 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Riff options
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginBottom: '0.65rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Style
              </label>
              <select
                value={riffStyle}
                onChange={(e) => setRiffStyle(e.target.value as typeof riffStyle)}
                disabled={loading}
              >
                <option value="metheny">Metheny</option>
                <option value="scofield">Scofield</option>
                <option value="funk">Funk</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Density
              </label>
              <select
                value={riffDensity}
                onChange={(e) => setRiffDensity(e.target.value as typeof riffDensity)}
                disabled={loading}
              >
                <option value="sparse">Sparse</option>
                <option value="medium">Medium</option>
                <option value="dense">Dense</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Grid
              </label>
              <select
                value={riffGrid}
                onChange={(e) => setRiffGrid(e.target.value as typeof riffGrid)}
                disabled={loading}
              >
                <option value="eighth">Eighth notes</option>
                <option value="sixteenth">Sixteenth notes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Line mode
              </label>
              <select
                value={riffLineMode}
                onChange={(e) => setRiffLineMode(e.target.value as typeof riffLineMode)}
                disabled={loading}
              >
                <option value="single_line">Single line</option>
                <option value="guitar_bass">Guitar + bass</option>
                <option value="octave_double">Octave / double-stop</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={riffBass}
              onChange={(e) => setRiffBass(e.target.checked)}
              disabled={loading || riffLineMode === 'octave_double'}
            />
            Bass (acoustic bass voice, GM 33) — ignored in octave mode
          </label>
        </div>
      )}

      {presetId === 'ecm_chamber' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            ECM chamber mode
          </label>
          <select
            value={ecmMode}
            onChange={(e) =>
              setEcmMode(e.target.value as 'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER')
            }
            disabled={loading}
          >
            <option value="ECM_METHENY_QUARTET">Metheny (modal, single-line focus)</option>
            <option value="ECM_SCHNEIDER_CHAMBER">Schneider / Wheeler (clouds, swells)</option>
          </select>
        </div>
      )}

      {presetId === 'song_mode' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <div
            style={{
              marginBottom: '0.9rem',
              padding: '0.7rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              LeadSheet MusicXML input (Phase 1)
            </label>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', lineHeight: 1.45 }}>
              {isSongModeLeadSheetPhase1Writer
                ? 'LeadSheet MusicXML input is active for this route.'
                : 'LeadSheet MusicXML input is available only for Song Mode with Donald Fagen or Barry Harris.'}
            </p>
            <input
              type="file"
              accept=".musicxml,.xml,.mxl"
              disabled={loading || !isSongModeLeadSheetPhase1Writer}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file
                  .arrayBuffer()
                  .then((buf) => {
                    const extracted = extractScoreMusicXmlFromUint8Array(new Uint8Array(buf));
                    if (!extracted.ok || !extracted.xml) {
                      setError(extracted.errors[0] ?? 'Could not read the selected MusicXML file.');
                      return;
                    }
                    setSongModeLeadSheetMusicXml(extracted.xml);
                    setLeadSheetFileName(file.name);
                    setLeadSheetInputSource('file');
                    setError(null);
                  })
                  .catch(() => {
                    setError('Could not read the selected MusicXML file (.musicxml, .xml, or MuseScore .mxl).');
                  });
              }}
              style={{ display: 'block', marginBottom: '0.45rem' }}
            />
            {isSongModeLeadSheetPhase1Writer ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  marginBottom: '0.45rem',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {leadSheetFileName ? `Loaded file: ${leadSheetFileName}` : 'No file selected'}
                </span>
                {(leadSheetFileName || songModeLeadSheetMusicXml.trim().length > 0) && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSongModeLeadSheetMusicXml('');
                      setLeadSheetFileName(null);
                      setLeadSheetInputSource(null);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    Clear LeadSheet
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.45rem' }}>
                LeadSheet MusicXML input is available only for Song Mode with Donald Fagen or Barry Harris.
              </p>
            )}
            <textarea
              value={songModeLeadSheetMusicXml}
              onChange={(e) => {
                const next = e.target.value;
                setSongModeLeadSheetMusicXml(next);
                if (next.trim().length === 0) {
                  setLeadSheetFileName(null);
                  setLeadSheetInputSource(null);
                  return;
                }
                if (leadSheetInputSource === 'file') {
                  setLeadSheetFileName(null);
                }
                setLeadSheetInputSource('paste');
              }}
              disabled={loading || !isSongModeLeadSheetPhase1Writer}
              placeholder="Paste uncompressed MusicXML here (<score-partwise>). For MuseScore .mxl, use Choose file above."
              rows={10}
              style={{
                width: '100%',
                minHeight: 180,
                maxWidth: 600,
                resize: 'vertical',
                padding: '0.5rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.82rem',
              }}
            />
            {leadSheetPreflightError && (
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', color: 'var(--error)' }}>
                {leadSheetPreflightError}
              </p>
            )}
            <div style={{ marginTop: '0.65rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Harmony interpretation
              </label>
              <select
                value={leadSheetHarmonyDisplayModeUi}
                onChange={(e) => setLeadSheetHarmonyDisplayModeUi(e.target.value as HarmonyDisplayModeUi)}
                disabled={loading || !isSongModeLeadSheetPhase1Writer}
                style={{ maxWidth: 260 }}
              >
                <option value="raw">Raw</option>
                <option value="enriched">Enriched</option>
                <option value="compare">Compare</option>
              </select>
              {!TONALITY_VAULT_UI_AVAILABLE ? (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  This runtime does not expose optional harmony enrichment, so Enriched and Compare will safely fall
                  back to Raw after you generate.
                </p>
              ) : (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Raw always keeps your imported chords as the source of truth. Enriched/Compare add optional analysis.
                </p>
              )}
            </div>
          </div>
          {showHarmonyImportDebugDev && (
            <details
              style={{
                marginBottom: '0.9rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(15,23,42,0.1)',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                Harmony import debug (dev)
              </summary>
              <div style={{ marginTop: '0.55rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Import harmony mode
                </label>
                <select
                  value={importHarmonyModeUi}
                  onChange={(e) =>
                    setImportHarmonyModeUi(e.target.value as 'free_harmony' | 'lock_harmony' | 'blend_harmony')
                  }
                  disabled={loading}
                >
                  <option value="free_harmony">free_harmony (current default path)</option>
                  <option value="lock_harmony">lock_harmony (try imported timeline lock)</option>
                  <option value="blend_harmony">blend_harmony (inactive metadata only)</option>
                </select>
                <p style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Debug-only request knobs for Song Mode telemetry/lock routing checks.
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  API default: <code>free_harmony</code> when <code>importHarmonyMode</code> is not provided (Stage 4
                  policy).
                </p>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  harmonyBlend (stored only right now)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={harmonyBlendUi}
                  onChange={(e) => setHarmonyBlendUi(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: '100%', maxWidth: 320 }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {Math.round(harmonyBlendUi * 100)}%
                </span>
              </div>
            </details>
          )}
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Style
            </label>
            <select
              value={songModeStyleProfile}
              onChange={(e) => {
                const next = songModeStyleProfileFromSelectValue(e.target.value);
                if (next) setSongModeStyleProfile(next);
              }}
              disabled={loading}
            >
              <optgroup label="Advanced styles (deeper behavior)">
                {SONG_MODE_STYLE_OPTIONS.filter((id) => SONG_MODE_ADVANCED_STYLE_SET.has(id)).map((id) => (
                  <option key={id} value={id}>
                    {songModeStyleProfileLabel(id)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Light touch styles (contour/velocity)">
                {SONG_MODE_STYLE_OPTIONS.filter((id) => !SONG_MODE_ADVANCED_STYLE_SET.has(id)).map((id) => (
                  <option key={id} value={id}>
                    {songModeStyleProfileLabel(id)}
                  </option>
                ))}
              </optgroup>
            </select>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Advanced styles apply additional harmony/rhythm behavior. Light touch styles mainly change contour and
              velocity. Bebop (Light Touch) is dynamics/contour only; Post-Bop (Shorter) adds deeper post-bop harmony
              behavior.
            </p>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Groove</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentGroove}
              onChange={(e) => setIntentGroove(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentGroove * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Space</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentSpace}
              onChange={(e) => setIntentSpace(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentSpace * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Expression</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentExpression}
              onChange={(e) => setIntentExpression(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentExpression * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Surprise</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentSurprise}
              onChange={(e) => setIntentSurprise(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentSurprise * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Pattern</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentPattern}
              onChange={(e) => setIntentPattern(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentPattern * 100)}%</span>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: '0.75rem',
              marginBottom: '0.65rem',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeVocalLeadSheet}
              onChange={(e) => setIncludeVocalLeadSheet(e.target.checked)}
              disabled={loading}
            />
            Include vocal lead sheet (separate MusicXML for singers)
          </label>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Style pairing
          </span>
          {indieArtPopAltTuningEligible && (
            <details
              style={{
                marginBottom: '0.75rem',
                padding: '0.55rem 0.7rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(15,23,42,0.08)',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' }}>
                Alternate Guitar Tuning (optional)
              </summary>
              <p style={{ margin: '0.5rem 0 0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Indie Art Pop only (v1). Leave this off to keep standard Song Mode behavior.
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: '0.5rem',
                  fontSize: '0.84rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={alternateTuningEnabled}
                  onChange={(e) => setAlternateTuningEnabled(e.target.checked)}
                  disabled={loading}
                />
                Use alternate guitar tuning
              </label>
              {alternateTuningEnabled && (
                <>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Tuning mode
                  </label>
                  <select
                    value={alternateTuningMode}
                    onChange={(e) => setAlternateTuningMode(e.target.value as GuitarTuningMode)}
                    disabled={loading}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <option value="standard">Standard tuning</option>
                    <option value="shared">One tuning for both guitars</option>
                    <option value="separate">Separate tunings for Guitar 1 and Guitar 2</option>
                  </select>
                  {alternateTuningMode === 'shared' && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Shared guitar tuning
                      </label>
                      <select
                        value={sharedTuningPresetId}
                        onChange={(e) => setSharedTuningPresetId(e.target.value)}
                        disabled={loading}
                      >
                        {ALTERNATE_GUITAR_TUNING_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {sharedTuningPresetId === 'custom' && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Custom tuning (low to high strings)
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                            {sharedCustomTuning.map((v, i) => (
                              <input
                                key={`shared-${i}`}
                                value={v}
                                onChange={(e) =>
                                  setSharedCustomTuning((prev) => {
                                    const next = [...prev];
                                    next[i] = e.target.value;
                                    return next;
                                  })
                                }
                                disabled={loading}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {alternateTuningMode === 'separate' && (
                    <>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Guitar 1 tuning
                        </label>
                        <select
                          value={guitar1TuningPresetId}
                          onChange={(e) => setGuitar1TuningPresetId(e.target.value)}
                          disabled={loading}
                        >
                          {ALTERNATE_GUITAR_TUNING_PRESETS.map((p) => (
                            <option key={`g1-${p.id}`} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        {guitar1TuningPresetId === 'custom' && (
                          <div style={{ marginTop: '0.35rem' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Custom tuning (low to high strings)
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                              {guitar1CustomTuning.map((v, i) => (
                                <input
                                  key={`g1-custom-${i}`}
                                  value={v}
                                  onChange={(e) =>
                                    setGuitar1CustomTuning((prev) => {
                                      const next = [...prev];
                                      next[i] = e.target.value;
                                      return next;
                                    })
                                  }
                                  disabled={loading}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Guitar 2 tuning
                        </label>
                        <select
                          value={guitar2TuningPresetId}
                          onChange={(e) => setGuitar2TuningPresetId(e.target.value)}
                          disabled={loading}
                        >
                          {ALTERNATE_GUITAR_TUNING_PRESETS.map((p) => (
                            <option key={`g2-${p.id}`} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        {guitar2TuningPresetId === 'custom' && (
                          <div style={{ marginTop: '0.35rem' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Custom tuning (low to high strings)
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                              {guitar2CustomTuning.map((v, i) => (
                                <input
                                  key={`g2-custom-${i}`}
                                  value={v}
                                  onChange={(e) =>
                                    setGuitar2CustomTuning((prev) => {
                                      const next = [...prev];
                                      next[i] = e.target.value;
                                      return next;
                                    })
                                  }
                                  disabled={loading}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAlternateTuningEnabled(false);
                      setAlternateTuningMode('standard');
                      setSharedTuningPresetId('standard');
                      setGuitar1TuningPresetId('standard');
                      setGuitar2TuningPresetId('standard');
                    }}
                    disabled={loading}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Reset to standard tuning
                  </button>
                </>
              )}
            </details>
          )}
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Diversity preset (optional)
            </label>
            <select
              value={songModeDiversityPresetId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSongModeDiversityPresetId(nextId);
                if (!nextId) return;
                const preset = resolveSongModeDiversityPreset(nextId);
                if (!preset) return;
                setSongwriterStyle(preset.primarySongwriterStyle);
                setSecondarySongwriterStyle(preset.secondarySongwriterStyle);
                const pairing = resolveSongModeDiversityStylePairing(preset.id);
                if (pairing?.arrangerStyle) setArrangerStyle(String(pairing.arrangerStyle));
                if (pairing?.era) setEra(String(pairing.era));
              }}
              disabled={loading}
            >
              <option value="">Manual (current controls)</option>
              {SONG_MODE_DIVERSITY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {songModeDiversityPresetId ? (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {resolveSongModeDiversityPreset(songModeDiversityPresetId)?.audibleDescription}
              </p>
            ) : (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Quick contrast presets that prefill songwriter blend and safe arranger/era hints.
              </p>
            )}
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-sm-primary-songwriter"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Songwriter
            </label>
            <select
              id="co-sm-primary-songwriter"
              aria-describedby="co-sm-primary-songwriter-desc"
              value={songwriterStyle}
              onChange={(e) => {
                setSongwriterStyle(e.target.value);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups />
            </select>
            <span id="co-sm-primary-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-sm-arranger"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Arranger
            </label>
            <select
              id="co-sm-arranger"
              aria-describedby="co-sm-arranger-desc"
              value={arrangerStyle}
              onChange={(e) => {
                setArrangerStyle(e.target.value);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              disabled={loading}
            >
              <ArrangerSelectOptionGroups />
            </select>
            <span id="co-sm-arranger-desc" style={VISUALLY_HIDDEN}>
              {ARIA_ARRANGER_GROUPS_DESC}
            </span>
          </div>
          <div>
            <label
              htmlFor="co-sm-era"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Era
            </label>
            <select
              id="co-sm-era"
              aria-describedby="co-sm-style-pairing-hint"
              value={era}
              onChange={(e) => {
                setEra(e.target.value);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              disabled={loading}
            >
              {ERA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <p
            id="co-sm-style-pairing-hint"
            style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}
          >
            Arranger and era nudge style pairing and era-aware harmony colour in Song Mode planning—soft hints, not
            hard ensemble switches.
          </p>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-sm-secondary-songwriter"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Secondary Songwriter (optional)
            </label>
            <select
              id="co-sm-secondary-songwriter"
              aria-describedby="co-sm-secondary-songwriter-desc"
              value={secondarySongwriterStyle}
              onChange={(e) => {
                setSecondarySongwriterStyle(e.target.value);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              disabled={loading}
            >
              <option value="">None</option>
              <SongwriterSelectOptionGroups />
            </select>
            <span id="co-sm-secondary-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC} Optional secondary blend with primary.
            </span>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Lyric author influence (optional)
            </label>
            <select
              value={authorOverlay}
              onChange={(e) => setAuthorOverlay(e.target.value)}
              disabled={loading}
            >
              <option value="">None</option>
              <option value="jimmy_webb">Jimmy Webb</option>
              <option value="pat_pattison">Pat Pattison</option>
              <option value="jack_perricone">Jack Perricone</option>
            </select>
          </div>
        </div>
      )}

      {presetId === 'big_band' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Big band pairing
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Songwriter, arranger, and era blend for harmonic colour; ensemble size sets the horn footprint.
          </p>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Form
            </label>
            <select
              value={bigBandFormId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'big_band_blues12') {
                  setBigBandFormId('big_band_blues12');
                  setTotalBars(42);
                } else {
                  setBigBandFormId('');
                }
              }}
              disabled={loading}
            >
              <option value="">Standard</option>
              <option value="big_band_blues12">Blues 12</option>
            </select>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0.5rem 0 0',
                lineHeight: 1.45,
              }}
            >
              Exported scores include rehearsal marks with section names such as{' '}
              <strong style={{ color: 'var(--text)' }}>Intro</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Melody Head</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Solo Section</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Soli Chorus</strong>,{' '}
              <strong style={{ color: 'var(--text)' }}>Shout Chorus</strong>, and{' '}
              <strong style={{ color: 'var(--text)' }}>Rideout</strong> — not every chart uses every section.{' '}
              <strong style={{ color: 'var(--text)' }}>Blues 12</strong> fixes a 42-bar chart (Intro 2 + Head 12 + Solo
              12 + Shout 12 + Rideout 4).
            </p>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-bb-songwriter"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Songwriter
            </label>
            <select
              id="co-bb-songwriter"
              aria-describedby="co-bb-songwriter-desc"
              value={songwriterStyle}
              onChange={(e) => setSongwriterStyle(e.target.value)}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups />
            </select>
            <span id="co-bb-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-bb-arranger"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Arranger
            </label>
            <select
              id="co-bb-arranger"
              aria-describedby="co-bb-arranger-desc"
              value={arrangerStyle}
              onChange={(e) => setArrangerStyle(e.target.value)}
              disabled={loading}
            >
              <ArrangerSelectOptionGroups />
            </select>
            <span id="co-bb-arranger-desc" style={VISUALLY_HIDDEN}>
              {ARIA_ARRANGER_GROUPS_DESC}
            </span>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-bb-era"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Era
            </label>
            <select
              id="co-bb-era"
              value={era}
              onChange={(e) => setEra(e.target.value)}
              disabled={loading}
            >
              {ERA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
              Ensemble size
            </label>
            <select
              value={ensembleConfigId}
              onChange={(e) => setEnsembleConfigId(e.target.value)}
              disabled={loading}
            >
              {ENSEMBLE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {presetId === 'string_quartet' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            String quartet harmony
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Songwriter and arranger pair with era for planning colour; era selects the built-in chord cycle when chord progression is empty (same options as Big Band).
          </p>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-sq-songwriter"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Songwriter
            </label>
            <select
              id="co-sq-songwriter"
              aria-describedby="co-sq-songwriter-desc"
              value={songwriterStyle}
              onChange={(e) => setSongwriterStyle(e.target.value)}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups />
            </select>
            <span id="co-sq-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label
              htmlFor="co-sq-arranger"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Arranger
            </label>
            <select
              id="co-sq-arranger"
              aria-describedby="co-sq-arranger-desc"
              value={arrangerStyle}
              onChange={(e) => setArrangerStyle(e.target.value)}
              disabled={loading}
            >
              <ArrangerSelectOptionGroups />
            </select>
            <span id="co-sq-arranger-desc" style={VISUALLY_HIDDEN}>
              {ARIA_ARRANGER_GROUPS_DESC}
            </span>
          </div>
          <div>
            <label
              htmlFor="co-sq-era"
              style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Era
            </label>
            <select id="co-sq-era" value={era} onChange={(e) => setEra(e.target.value)} disabled={loading}>
              {ERA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 520 }}>
        <strong style={{ color: 'var(--text)' }}>New Variation</strong> picks a fresh id;{' '}
        <strong style={{ color: 'var(--text)' }}>Next Variation</strong> steps the id (then Generate).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => void generate()} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={loading}
          onClick={() => {
            const next = newVariationIdToken();
            setVariationId(next);
            setBaseSeed(Math.floor(Math.random() * 1e9));
            void generate({ variationOverride: next });
          }}
        >
          Try Another
        </button>
        <button
          className="secondary"
          type="button"
          disabled={loading}
          onClick={() => {
            setBaseSeed(42);
            setVariationId('demo-42');
            void generate({ seedOverride: 42, variationOverride: 'demo-42' });
          }}
        >
          Demo (fixed variation)
        </button>
        <button className="secondary" type="button" onClick={() => openFolder()}>
          Open library folder
        </button>
      </div>

      {showBigReceipt && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: `3px solid ${
              error || receiptFail ? 'var(--error)' : receiptOk ? 'var(--success)' : 'var(--border)'
            }`,
            background: error || receiptFail ? 'rgba(239,68,68,0.08)' : 'var(--bg-panel)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Generation receipt</h3>

          {(result as { planningNotice?: string })?.planningNotice && (
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 0 }}>
              {(result as { planningNotice?: string }).planningNotice}
            </p>
          )}

          {result && outputKindDesc && (
            <div
              style={{
                marginTop: '0.75rem',
                marginBottom: '1rem',
                padding: '0.9rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(0,0,0,0.12)',
                fontSize: '0.9rem',
                lineHeight: 1.45,
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Result summary</h4>
              <p style={{ margin: '0 0 0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mode:</span>{' '}
                <strong>{modeLabelForPreset(summaryPresetId)}</strong>
              </p>
              <p style={{ margin: '0.35rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Output type:</span>{' '}
                <strong>{outputKindDesc.headline}</strong>
                <span style={{ color: 'var(--text-muted)' }}> — {outputKindDesc.subtitle}</span>
              </p>
              {(echo?.variationId ?? rm?.variationId) != null &&
                String(echo?.variationId ?? rm?.variationId).trim() !== '' && (
                  <p style={{ margin: '0.25rem 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Variation:</span>{' '}
                    {echo?.variationId ?? rm?.variationId}
                  </p>
                )}
              {echo?.tonalCenter?.trim() ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tonal centre:</span> {echo.tonalCenter}
                </p>
              ) : null}
              {echo?.bpm != null && echo.bpm > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tempo:</span> {echo.bpm} BPM
                </p>
              ) : null}
              {echo?.totalBars != null && echo.totalBars > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bars:</span> {echo.totalBars}
                </p>
              ) : null}
              {echo?.styleProfile ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Style profile:</span> {echo.styleProfile}
                </p>
              ) : null}
              {summaryPresetId === 'song_mode' && echo?.primarySongwriterStyle?.trim() ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Primary songwriter:</span>{' '}
                  <strong>
                    {primarySongwriterDisplayLabel(echo.primarySongwriterStyle) ?? echo.primarySongwriterStyle}
                  </strong>
                </p>
              ) : null}
              {showLeadSheetStatusBlock && (
                <div className="song-mode-leadsheet-status" style={{ margin: '0.4rem 0 0' }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    Input source: {leadSheetInputSourceForRun === 'file' ? 'File' : 'Paste'}
                  </p>
                  {leadSheetInputSourceForRun === 'file' && leadSheetFileNameForRun && (
                    <p style={{ margin: '0.25rem 0' }}>LeadSheet file: {leadSheetFileNameForRun}</p>
                  )}
                  <p style={{ margin: '0.25rem 0' }}>
                    LeadSheet input: {rm?.songModeLeadSheetInputApplied === true ? 'Applied' : 'Not applied'}
                  </p>
                  {typeof rm?.songModeLeadSheetAnchorStartApplied === 'boolean' && (
                    <p style={{ margin: '0.25rem 0' }}>
                      Melody anchor: {rm.songModeLeadSheetAnchorStartApplied ? 'Applied' : 'Not applied'}
                    </p>
                  )}
                </div>
              )}
              {(echo?.stylePairing || result.stylePairingReceipt) && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pairing:</span>{' '}
                  {result.stylePairingReceipt
                    ? result.stylePairingReceipt.summary
                    : echo?.stylePairing
                      ? `${echo.stylePairing.songwriterStyle} × ${echo.stylePairing.arrangerStyle}${
                          echo.stylePairing.era ? ` · ${echo.stylePairing.era}` : ''
                        }`
                      : null}
                </p>
              )}
              {echo?.ensembleConfigId ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ensemble:</span>{' '}
                  {ensembleLabel(echo.ensembleConfigId)}
                </p>
              ) : null}
              {(echo?.creativeControlLevel ?? rm?.creativeControlLevel) != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Creative control:</span>{' '}
                  {labelCreativeLevel(
                    (echo?.creativeControlLevel ?? rm?.creativeControlLevel) as
                      | 'stable'
                      | 'balanced'
                      | 'surprise'
                  )}
                </p>
              )}
              {echo?.c4Strength != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hook rhythm strength:</span>{' '}
                  {echo.c4Strength === 'light'
                    ? 'Light'
                    : echo.c4Strength === 'strong'
                      ? 'Strong'
                      : 'Medium'}
                </p>
              )}
              {echo?.blendStrength != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blend strength:</span>{' '}
                  {echo.blendStrength === 'light'
                    ? 'Light'
                    : echo.blendStrength === 'strong'
                      ? 'Strong'
                      : 'Medium'}
                </p>
              )}
              {presetId === 'song_mode' &&
                echo != null &&
                typeof echo.groove === 'number' &&
                typeof echo.space === 'number' &&
                typeof echo.expression === 'number' &&
                typeof echo.surprise === 'number' && (
                  <>
                    <p style={{ margin: '0.25rem 0' }}>
                      Groove: {Math.round(echo.groove * 100)}% &nbsp; Space: {Math.round(echo.space * 100)}%
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>
                      Expression: {Math.round(echo.expression * 100)}% &nbsp; Surprise:{' '}
                      {Math.round(echo.surprise * 100)}%
                    </p>
                  </>
                )}
              {result.stylePairingReceipt?.confidenceScore != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>{' '}
                  {result.stylePairingReceipt.confidenceScore.toFixed(2)} (pairing)
                </p>
              )}
              {result.stylePairingReceipt?.experimentalFlag && (
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      marginRight: 8,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: 'rgba(234,179,8,0.2)',
                      border: '1px solid rgba(234,179,8,0.5)',
                      color: 'var(--text)',
                    }}
                  >
                    Experimental
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{EXPERIMENTAL_HELP}</span>
                </p>
              )}
              {!result.stylePairingReceipt?.experimentalFlag && rm?.experimentalCreativeLabel && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Creative note:</span> {rm.experimentalCreativeLabel}
                </p>
              )}
              {result.filepath && (
                <p style={{ margin: '0.5rem 0 0', wordBreak: 'break-word' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Output path:</span> {result.filepath}
                </p>
              )}
              {result.vocalLeadSheetFilepath ? (
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem',
                    wordBreak: 'break-word',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Vocal lead sheet:</span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      const p = result.vocalLeadSheetFilepath;
                      if (p) void openFolder(dirnameOnly(p));
                    }}
                  >
                    Open file folder
                  </button>
                </p>
              ) : null}
              {summaryPresetId === 'song_mode' &&
                rm?.songModeStyleSurfaceNotes &&
                rm.songModeStyleSurfaceNotes.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <p style={{ margin: '0 0 0.45rem', fontWeight: 600, fontSize: '0.92rem' }}>
                      Song Mode generation notes
                    </p>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Behaviour-level summary (not an imitation claim). Same list is written next to your MusicXML
                      under <code>_meta</code>.
                    </p>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.15rem',
                        lineHeight: 1.5,
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {rm.songModeStyleSurfaceNotes.map((line, i) => (
                        <li key={i} style={{ marginBottom: '0.35rem' }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {summaryPresetId === 'song_mode' && (
                <details
                  style={{
                    marginTop: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(15,23,42,0.12)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Section Shape (dev diagnostics)
                  </summary>
                  {!sectionShapeDiag ? (
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No section-shaping diagnostics were attached to this Song Mode run.
                    </p>
                  ) : (
                    <div style={{ marginTop: '0.6rem' }}>
                      <p style={{ margin: '0 0 0.45rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Global deltas — density (B-A): {fmtSigned(sectionShapeDiag.densityDeltaBMinusA)} | colour
                        (B-A): {fmtSigned(sectionShapeDiag.colourDeltaBMinusA)} | opening vs return:{' '}
                        {fmtSigned(sectionShapeDiag.openingVsReturnDelta)} | return variation:{' '}
                        {sectionShapeDiag.returnVariationType ?? '-'}
                      </p>
                      {sectionShapeRows.length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          No per-section slice descriptors were present for this run.
                        </p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Section</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Density Bias</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Colour Bias</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Register Bias</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Contributing Slices</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionShapeRows.map((row) => (
                              <tr key={row.role} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.25rem 0.2rem', whiteSpace: 'nowrap' }}>
                                  {SONG_MODE_SECTION_ROLE_LABELS[row.role]}
                                </td>
                                <td style={{ padding: '0.25rem 0.2rem' }}>{fmtSigned(row.densityBiasMean)}</td>
                                <td style={{ padding: '0.25rem 0.2rem' }}>{fmtSigned(row.colourBiasMean)}</td>
                                <td style={{ padding: '0.25rem 0.2rem' }}>{fmtSigned(row.registerBiasMean)}</td>
                                <td style={{ padding: '0.25rem 0.2rem' }}>{row.contributingSlices.join(', ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {sectionShapeDiag.returnVariationSummary ? (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Return summary: {sectionShapeDiag.returnVariationSummary}
                        </p>
                      ) : null}
                    </div>
                  )}
                </details>
              )}
              {summaryPresetId === 'song_mode' && recentSongModeRuns.length > 0 && (
                <details
                  style={{
                    marginTop: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(15,23,42,0.12)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Compare recent Song Mode runs (dev)
                  </summary>
                  <div style={{ marginTop: '0.6rem', fontSize: '0.83rem' }}>
                    <p style={{ margin: '0 0 0.45rem', color: 'var(--text-muted)' }}>
                      Recent in-memory Song Mode runs (current session only)
                    </p>
                    <ul style={{ margin: '0 0 0.6rem', paddingLeft: '1rem' }}>
                      {recentSongModeRuns.map((run) => (
                        <li key={run.id} style={{ marginBottom: '0.2rem' }}>
                          {run.label}
                        </li>
                      ))}
                    </ul>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                      <label>
                        Run A{' '}
                        <select value={compareRunAId} onChange={(e) => setCompareRunAId(e.target.value)}>
                          {recentSongModeRuns.map((run) => (
                            <option key={run.id} value={run.id}>
                              {run.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Run B{' '}
                        <select value={compareRunBId} onChange={(e) => setCompareRunBId(e.target.value)}>
                          {recentSongModeRuns.map((run) => (
                            <option key={run.id} value={run.id}>
                              {run.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {compareInsights.length > 0 && (
                      <div style={{ marginBottom: '0.6rem' }}>
                        {compareInsights.map((line, i) => (
                          <p key={i} style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    {compareRunA && compareRunB && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>Run A</p>
                          {compareRowsA.map((row) => (
                            <p key={`a-${row.label}`} style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                              <span style={{ color: 'var(--text)' }}>{row.label}:</span> {row.value}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>Run B</p>
                          {compareRowsB.map((row) => (
                            <p key={`b-${row.label}`} style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                              <span style={{ color: 'var(--text)' }}>{row.label}:</span> {row.value}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}
              {summaryPresetId === 'song_mode' && (
                <details
                  style={{
                    marginTop: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(15,23,42,0.12)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Section Sources / Slates (dev)
                  </summary>
                  {sectionSourceRows.length === 0 ? (
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No per-section behaviour sources/slates were attached to this Song Mode run.
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Section</th>
                          <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Sources</th>
                          <th style={{ textAlign: 'left', padding: '0.25rem 0.2rem' }}>Slate Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionSourceRows.map((row) => (
                          <tr key={row.role} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.25rem 0.2rem', whiteSpace: 'nowrap' }}>{row.sectionLabel}</td>
                            <td style={{ padding: '0.25rem 0.2rem' }}>{row.sources.join(', ')}</td>
                            <td style={{ padding: '0.25rem 0.2rem' }}>{row.tags.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </details>
              )}
              {summaryPresetId === 'song_mode' && (
                <details
                  style={{
                    marginTop: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(15,23,42,0.12)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Song Mode Profile / Rules (dev)
                  </summary>
                  {songModeProfileRuleRows.profileRows.length === 0 &&
                  songModeProfileRuleRows.ruleSetRows.length === 0 &&
                  songModeProfileRuleRows.behaviourSourceRows.length === 0 ? (
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No Song Mode profile/rule diagnostics were attached to this result.
                    </p>
                  ) : (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.83rem' }}>
                      {[...songModeProfileRuleRows.profileRows, ...songModeProfileRuleRows.ruleSetRows, ...songModeProfileRuleRows.behaviourSourceRows].map(
                        (row) => (
                          <p key={row.label} style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--text)' }}>{row.label}:</span> {row.value}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </details>
              )}
              {v?.readiness?.mx != null && result.stylePairingReceipt?.confidenceScore == null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Readiness (MX):</span> {v.readiness.mx}
                </p>
              )}
              {typeof result.gceScore === 'number' && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GCE Quality:</span> {`${result.gceScore}/10`}{' '}
                  {result.gceGatePassed ? '✓' : '⚠'}
                </p>
              )}
            </div>
          )}

          {(result as { composerOsVersion?: string })?.composerOsVersion && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              Engine version: {(result as { composerOsVersion?: string }).composerOsVersion}
            </p>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid var(--error)',
                padding: '1rem',
                borderRadius: 8,
                marginBottom: '1rem',
              }}
            >
              <strong>Something went wrong</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {result && (
            <>
              <p style={{ fontSize: '1rem', margin: '0.25rem 0' }}>
                <strong>{receiptOk ? 'Passed' : 'Failed'}</strong>
                {receiptOk ? ' — your files are ready below.' : ' — see validation details.'}
              </p>
              {result.filename && (
                <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File:</span> {result.filename}
                </p>
              )}
              {(result.scoreTitle ?? rm?.scoreTitle) && (
                <p style={{ fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Title:</span>{' '}
                  {result.scoreTitle ?? rm?.scoreTitle}
                </p>
              )}
              {rm?.activeModules?.length ? (
                <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Engine modules:</span>{' '}
                  {rm.activeModules.join(' · ')}
                </p>
              ) : null}
              {rm?.timestamp && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  {rm.timestamp}
                </p>
              )}
              {summaryPresetId === 'song_mode' && (
                <div
                  style={{
                    fontSize: '0.86rem',
                    marginTop: '0.6rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'rgba(15,23,42,0.1)',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Harmony import status</strong>
                  <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)' }}>Imported harmony:</span>{' '}
                    {harmonyImportPresentForRun ? 'present' : 'missing'}
                  </p>
                  <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)' }}>Import mode:</span>{' '}
                    {rm?.importHarmonyMode ?? 'free_harmony'} ({rm?.importHarmonyModeSource ?? 'defaulted'})
                  </p>
                  {(echo?.leadSheetHarmonyDisplayMode || echo?.leadSheetHarmonyDisplayModeEffective) && (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Harmony interpretation:</span>{' '}
                      {echo?.leadSheetHarmonyDisplayMode ?? 'raw'} →{' '}
                      {echo?.leadSheetHarmonyDisplayModeEffective ?? echo?.leadSheetHarmonyDisplayMode ?? 'raw'}
                    </p>
                  )}
                  {result.harmonyInterpretationView?.viewWarnings?.length ? (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Interpretation notes:</span>{' '}
                      {result.harmonyInterpretationView.viewWarnings.join(' | ')}
                    </p>
                  ) : null}
                  {result.harmonyInterpretationView?.effectiveMode === 'compare' &&
                  result.harmonyInterpretationView.comparePayload ? (
                    <div
                      style={{
                        marginTop: '0.45rem',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '0.5rem 0.6rem',
                        background: 'rgba(15,23,42,0.14)',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '0.35rem' }}>
                        Raw vs enriched (first 8 imported chords)
                      </strong>
                      {result.harmonyInterpretationView.comparePayload.tonalityVault.applied !== true ? (
                        <>
                          <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                            Enriched interpretation is unavailable for this run, so compare stays raw-only.
                          </p>
                          {result.harmonyInterpretationView.comparePayload.tonalityVault.warnings.length > 0 ? (
                            <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              Why: {result.harmonyInterpretationView.comparePayload.tonalityVault.warnings.join(' | ')}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        result.harmonyInterpretationView.comparePayload.rawChordEvents.slice(0, 8).map((rawEv, idx) => {
                          const ann =
                            result.harmonyInterpretationView?.comparePayload?.tonalityVault?.enrichment?.byChordIndex?.[idx];
                          const enrichedLabel = compareEnrichedLabelForUi(ann);
                          const whyLine = ann?.explanation ?? 'No explanation available.';
                          return (
                            <div key={`${rawEv.bar}-${rawEv.beat}-${idx}`} style={{ marginBottom: '0.3rem' }}>
                              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--text)' }}>
                                  Bar {rawEv.bar} beat {rawEv.beat}:
                                </span>{' '}
                                Raw <strong style={{ color: 'var(--text)' }}>{rawEv.symbol}</strong> → Enriched{' '}
                                <strong style={{ color: 'var(--text)' }}>{enrichedLabel}</strong>
                              </p>
                              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Why: {whyLine}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                  {typeof rm?.importHarmonyPolicyVersion === 'number' && (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Import harmony policy version:</span>{' '}
                      {rm.importHarmonyPolicyVersion}
                    </p>
                  )}
                  <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)' }}>Lock applied:</span>{' '}
                    {rm?.importHarmonyLockApplied ? 'yes' : 'no'}
                  </p>
                  {rm?.importHarmonyLockApplied === false && rm?.importHarmonyLockFallbackReason && (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Fallback reason:</span>{' '}
                      {rm.importHarmonyLockFallbackReason}
                    </p>
                  )}
                  {typeof rm?.importHarmonyLockedBarsCount === 'number' && (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Locked bars:</span> {rm.importHarmonyLockedBarsCount}
                    </p>
                  )}
                  {lockedProgressionPreviewText && (
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text)' }}>Locked progression used:</span>{' '}
                      {lockedProgressionPreviewText}
                    </p>
                  )}
                </div>
              )}
              {v && (
                <div style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Validation gates:</span>{' '}
                  Score {v.integrityPassed ? '✓' : '✗'} · Bar math {v.strictBarMathPassed ? '✓' : '✗'} · Behaviour{' '}
                  {v.behaviourGatesPassed ? '✓' : '✗'} · MX {v.mxValidationPassed ? '✓' : '✗'} · Round-trip{' '}
                  {v.exportRoundTripPassed ? '✓' : '✗'} · Bass metadata {v.instrumentMetadataPassed ? '✓' : '✗'}
                </div>
              )}
              {v?.readiness && (
                <p style={{ fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Readiness score:</span> Release{' '}
                  {v.readiness.release ?? '-'} ·{' '}
                  <span style={{ color: 'var(--text-muted)' }}>MX readiness:</span> {v.readiness.mx ?? '-'}
                  {v.readiness.shareable !== undefined && (
                    <span>
                      {' '}
                      · {v.readiness.shareable ? 'Shareable' : 'Not shareable'}
                    </span>
                  )}
                </p>
              )}
              {v?.errors && v.errors.length > 0 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--error)', marginTop: '0.5rem' }}>
                  {v.errors.join('; ')}
                </p>
              )}
              {v?.warnings && v.warnings.length > 0 && (
                <div
                  style={{
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 8,
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.45)',
                    color: 'var(--text)',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Phrase quality (warnings)</strong>
                  <span style={{ lineHeight: 1.45 }}>{v.warnings.slice(0, 3).join('; ')}{v.warnings.length > 3 ? ` … (+${v.warnings.length - 3} more)` : ''}</span>
                </div>
              )}
              {(() => {
                const dx = (result as { chordExportDiagnostics?: ChordDxReceiptUi })?.chordExportDiagnostics;
                if (!dx) return null;
                return (
                  <div
                    style={{
                      fontSize: '0.88rem',
                      marginTop: '0.75rem',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'rgba(59,130,246,0.08)',
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Chord export diagnostics</strong>
                    <p style={{ margin: '0 0 0.35rem', color: 'var(--text-muted)' }}>
                      Chords parsed: <strong style={{ color: 'var(--text)' }}>{dx.summary.totalChordsParsed}</strong>
                      {' · '}
                      Fallbacks used: <strong style={{ color: 'var(--text)' }}>{dx.summary.totalFallbacksUsed}</strong>
                      {' · '}
                      Sibelius simplification flags:{' '}
                      <strong style={{ color: 'var(--text)' }}>{dx.summary.totalApproximations}</strong>
                      {' · '}
                      Slash-bass bars: <strong style={{ color: 'var(--text)' }}>{dx.summary.slashChordsPreserved}</strong>
                    </p>
                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {dx.exportTargetNotes.primaryValidationTarget}
                      <br />
                      {dx.exportTargetNotes.sibeliusFallback}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dx.aggregateTargetWarning}</p>
                  </div>
                );
              })()}
              {summaryPresetId === 'guitar_bass_duo' &&
                (() => {
                  const v2 = result.voice2PolyphonyDiagnostics;
                  if (!v2) return null;
                  const nBars = v2.v2NoteCountPerBar.length;
                  return (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        marginTop: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'rgba(0,0,0,0.14)',
                        lineHeight: 1.45,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {`VOICE 2 DIAGNOSTIC\nBars active: ${v2.v2ActiveBars} / ${nBars}\nBar coverage: ${v2.v2BarCoverage.toFixed(2)}\nTotal notes: ${v2.v2TotalNotes}\nNotes per active bar: ${v2.v2AvgNotesPerActiveBar.toFixed(2)}\nLongest rest gap: ${v2.v2LongestRestGap}\nLongest active run: ${v2.v2LongestActiveRun}\nStrong-beat entries: ${v2.v2StrongBeatEntries}\nOffbeat entries: ${v2.v2OffbeatEntries}`}
                    </div>
                  );
                })()}
            </>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="secondary" onClick={() => openFolder()}>
              Open library folder
            </button>
            <button
              type="button"
              onClick={() => result?.filepath && openFolder(dirnameOnly(result.filepath))}
            >
              Open this file&apos;s folder
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
