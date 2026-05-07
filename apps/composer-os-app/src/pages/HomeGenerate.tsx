import { useState, useEffect, useCallback, useRef, Fragment, useMemo } from 'react';
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
import { RhythmBlendControls } from '../components/RhythmBlendControls';
import {
  AFROBEAT_STARTER_PRESETS,
  GREEK_REBETIKO_STARTER_PRESETS,
} from '../constants/rhythmBlendStarterPresets';
import {
  exportBlendedScoreToMusicXml as blendExportBlendedScoreToMusicXml,
  exportSongFormToMusicXml as blendExportSongFormToMusicXml,
} from '@composer-os/core/blend';
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
  getAlternateGuitarTuningPreset,
  getPresetsByZone,
  normalizeAlternateGuitarTuningRequest,
  type AlternateGuitarTuningRequest,
  type AlternateGuitarTuningZone,
  type GuitarTuningMode,
} from '@composer-os/core/song-mode/alternateGuitarTunings';
import { resolveSongModeDiversityStylePairing } from '@composer-os/core/style-pairing/stylePairingResolver';
import {
  extractScoreMusicXmlFromString,
  extractScoreMusicXmlFromUint8Array,
} from '@composer-os/core/lead-sheet/musicXmlScoreInput';
import {
  generateReharmCandidates,
  type ReharmCandidate,
} from '@composer-os/core/harmony/reharmCandidateEngine';
import {
  buildComposerOddMeterRows,
  COMPOSER_METER_PRESET_MAP,
  isComposerOddMeterSongwriter,
  type ComposerOddMeterSongwriterId,
  ZAPPA_METER_CYCLE_PRESET_DEFINITIONS,
  tileZappaMeterCycle,
  zappaMeterCycleToPresetPattern,
} from '@composer-os/core/rhythm/oddMeterQuantiser';
import {
  generateFromIReal,
  generateVaultFromParsedChart,
  parseChordProgressionText,
  parseIRealProInput,
  inspectChordSymbol,
  inspectChordToMusicXml,
  remixSeed,
  vaultRiffScoreNotesToMusicXml,
  type ChordInspectorResult,
  type ChorusTensionProgression,
  type EmotionalDrift,
  type IRealVaultOutput,
  type ParsedChart,
  type PhraseContourTag,
  type VaultGenerationOptions,
} from '@composer-os/core/irealpro';
import { ChorusArcStrip } from '../components/ChorusArcStrip';
import { WriterRecipeCard } from '../components/WriterRecipeCard';

const FORM_OPTION_IDS_EXCLUDED_FROM_UI = new Set([
  'through5',
  'through6',
  'through7',
  'through8',
  'abacab',
]);

const FORM_OPTIONS_UI = FORM_OPTIONS.filter((f) => !FORM_OPTION_IDS_EXCLUDED_FROM_UI.has(f.id));

const PASTE_CHORD_KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function chordPasteTimeSigFromUi(id: '4-4' | '3-4' | '6-8'): { num: number; den: number } {
  if (id === '3-4') return { num: 3, den: 4 };
  if (id === '6-8') return { num: 6, den: 8 };
  return { num: 4, den: 4 };
}

/** Resolved meters across chart bars: global `timeSignature` + sparse `barMeterMap` carry. */
function parsedChartHasMixedMeter(chart: ParsedChart): boolean {
  const n = chart.measures?.length ?? 0;
  if (n <= 1) return false;
  const base = chart.timeSignature ?? { num: 4, den: 4 };
  const bmm = chart.barMeterMap ?? {};
  let carry = base;
  const distinct = new Set<string>();
  for (let i = 0; i < n; i++) {
    const at = bmm[i];
    if (
      at != null &&
      Number.isFinite(at.num) &&
      Number.isFinite(at.den) &&
      at.den > 0 &&
      at.num > 0
    ) {
      carry = { num: Math.floor(at.num), den: Math.floor(at.den) };
    }
    distinct.add(`${carry.num}/${carry.den}`);
    if (distinct.size > 1) return true;
  }
  return false;
}

/** UI-only: detect multiple `<beats>/<beat-type>` pairs in pasted MusicXML (Song Mode lead sheet). */
function leadSheetXmlLooksMixedMeter(xml: string): boolean {
  const s = xml.trim();
  if (s.length < 24) return false;
  const beats = [...s.matchAll(/<beats>(\d+)<\/beats>/gi)].map((m) => m[1]!);
  const types = [...s.matchAll(/<beat-type>(\d+)<\/beat-type>/gi)].map((m) => m[1]!);
  if (beats.length === 0 || types.length === 0) return false;
  const sigs = new Set<string>();
  const n = Math.min(beats.length, types.length);
  for (let i = 0; i < n; i++) sigs.add(`${beats[i]}/${types[i]}`);
  return sigs.size > 1;
}

function MixedMeterBadge() {
  return (
    <span
      title="Multiple time signatures in this chart"
      style={{
        marginLeft: '0.35rem',
        fontSize: '0.68rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        padding: '0.1rem 0.4rem',
        borderRadius: 4,
        border: '1px solid var(--border)',
        background: 'rgba(99, 102, 241, 0.12)',
        color: 'var(--text-muted)',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      mixed meter
    </span>
  );
}

/** Trim/pad a boolean array to length `n` (chorus lock rows). */
function boolArrayToLength(source: boolean[], n: number): boolean[] {
  const len = Math.max(0, Math.floor(n));
  const out = source.slice(0, len);
  while (out.length < len) out.push(false);
  return out;
}

const VAULT_EMOTIONAL_DRIFT_OPTIONS: { value: EmotionalDrift; label: string }[] = [
  { value: 'neutral', label: 'neutral' },
  { value: 'darker', label: 'darker' },
  { value: 'brighter', label: 'brighter' },
  { value: 'more-suspended', label: 'more-suspended' },
  { value: 'more-unstable', label: 'more-unstable' },
  { value: 'more-cinematic', label: 'more-cinematic' },
];

function nextEmotionalDrift(current: EmotionalDrift): EmotionalDrift {
  const opts = VAULT_EMOTIONAL_DRIFT_OPTIONS;
  const idx = opts.findIndex((o) => o.value === current);
  const i = idx >= 0 ? idx : 0;
  return opts[(i + 1) % opts.length]!.value;
}

function driftLabel(d: EmotionalDrift): string {
  return VAULT_EMOTIONAL_DRIFT_OPTIONS.find((o) => o.value === d)?.label ?? d;
}

function driftToSliderIndex(d: EmotionalDrift): number {
  const i = VAULT_EMOTIONAL_DRIFT_OPTIONS.findIndex((o) => o.value === d);
  return i >= 0 ? i : 0;
}

function sliderIndexToDrift(i: number): EmotionalDrift {
  const opts = VAULT_EMOTIONAL_DRIFT_OPTIONS;
  const idx = Math.min(opts.length - 1, Math.max(0, Math.floor(i)));
  return opts[idx]!.value;
}

type VaultRemixKind = 'ireal' | 'paste' | 'pdf';

type VaultRemixSession = {
  kind: VaultRemixKind;
  chart: ParsedChart;
  runOptions: VaultGenerationOptions;
  outputA: IRealVaultOutput;
  axis: 'drift' | 'duoIntent';
  driftB: EmotionalDrift;
  duoB: 'conversational' | 'supportive';
  outputB: IRealVaultOutput | null;
  patchForB: Partial<VaultGenerationOptions> | null;
};

/** Mirrors `driftAffinity` in `reharmCandidateEngine` — UI-only scoring / labels (no engine edits). */
function reharmDriftAffinityScore(chordTypeId: string, drift: EmotionalDrift): number {
  const id = chordTypeId;
  const lower = id.toLowerCase();

  switch (drift) {
    case 'darker': {
      if (id.startsWith('min') || id.includes('min9') || id.includes('min11') || id.includes('minMaj')) return 0.95;
      if (lower.includes('dim') || lower.includes('b13') || lower.includes('b9')) return 0.92;
      if (lower.includes('min7b5')) return 0.9;
      if (lower.startsWith('maj') || lower.includes('#11#9')) return 0.35;
      return 0.5;
    }
    case 'brighter': {
      if (
        id === 'Maj7' ||
        id === 'Maj9' ||
        id === 'Maj7#11' ||
        id.includes('Maj9') ||
        (lower.includes('maj') && !id.startsWith('min'))
      )
        return 0.92;
      if (lower.includes('#11') && !id.startsWith('min')) return 0.88;
      if (lower.includes('sus9')) return 0.78;
      if (id.startsWith('min')) return 0.32;
      return 0.48;
    }
    case 'more-suspended': {
      return lower.includes('sus') ? 0.95 : 0.42;
    }
    case 'more-unstable': {
      if (lower.includes('#9') || lower.includes('7#9') || lower.includes('#11#9')) return 0.95;
      if (lower.includes('13#11') || lower.includes('13b9')) return 0.88;
      if (lower.includes('b9')) return 0.72;
      return 0.45;
    }
    case 'more-cinematic': {
      if (lower.includes('maj7') || lower.includes('minmaj') || lower.includes('sus9')) return 0.88;
      if (lower.includes('m11') || lower.includes('maj9')) return 0.82;
      return 0.52;
    }
    case 'neutral':
    default:
      return 0.55;
  }
}

function sliderToTargetReharmDrift(slider: number): EmotionalDrift {
  const order: EmotionalDrift[] = [
    'neutral',
    'darker',
    'brighter',
    'more-suspended',
    'more-unstable',
    'more-cinematic',
  ];
  const t = Math.min(1, Math.max(0, slider));
  const idx = Math.round(t * (order.length - 1));
  return order[idx]!;
}

function dominantEmotionalDriftForChordType(chordTypeId: string): EmotionalDrift {
  let best: EmotionalDrift = 'neutral';
  let bestScore = -1;
  for (const o of VAULT_EMOTIONAL_DRIFT_OPTIONS) {
    const s = reharmDriftAffinityScore(chordTypeId, o.value);
    if (s > bestScore) {
      bestScore = s;
      best = o.value;
    }
  }
  return best;
}

const CHORD_INSPECTOR_PC_TO_SHARP_ROOT: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function formatChordInspectorSubstituteSymbol(rootPc: number, vaultChordTypeId: string): string {
  const r = CHORD_INSPECTOR_PC_TO_SHARP_ROOT[((rootPc % 12) + 12) % 12] ?? 'C';
  return `${r}${vaultChordTypeId}`;
}

function emotionalDriftOptionLabel(drift: EmotionalDrift): string {
  return VAULT_EMOTIONAL_DRIFT_OPTIONS.find((o) => o.value === drift)?.label ?? drift;
}

const VAULT_GENERATION_OPTIONS_HINT =
  'Mode, tuning, riff style, and emotional drift are sent on the request. Drift is reserved for reharm bias in the engine and does not change output yet.';

function VaultImportChartSummary({ chart }: { chart: ParsedChart }) {
  const ts = chart.timeSignature;
  const tsStr = ts ? `${ts.num}/${ts.den}` : '—';
  const tempo =
    chart.tempo != null && Number.isFinite(chart.tempo) && chart.tempo > 0
      ? `${Math.round(chart.tempo)} BPM`
      : '—';
  const bars = chart.measures?.length ?? 0;
  const style = chart.style?.trim() ? chart.style : '—';
  const composer = chart.composer?.trim() ? chart.composer : null;
  const title = chart.title?.trim() ? chart.title : '—';
  return (
    <div
      role="region"
      aria-label="Parsed chart summary"
      style={{
        marginTop: '0.65rem',
        marginBottom: '0.35rem',
        padding: '0.5rem 0.65rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated, rgba(0,0,0,0.04))',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>
        Chart preview
      </p>
      <p style={{ margin: '0.2rem 0' }}>
        <strong>Title:</strong> {title}
      </p>
      {composer ? (
        <p style={{ margin: '0.2rem 0' }}>
          <strong>Composer:</strong> {composer}
        </p>
      ) : null}
      <p style={{ margin: '0.2rem 0' }}>
        <strong>Key:</strong> {chart.key ?? '—'}
      </p>
      <p
        style={{
          margin: '0.2rem 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <span>
          <strong>Time signature:</strong> {tsStr}
        </span>
        {parsedChartHasMixedMeter(chart) ? <MixedMeterBadge /> : null}
      </p>
      {(() => {
        const bmm = chart.barMeterMap;
        const keys = Object.keys(bmm);
        if (keys.length === 0) return null;
        const line = keys
          .map((k) => Number(k))
          .filter((k) => Number.isFinite(k))
          .sort((a, b) => a - b)
          .map((k) => {
            const m = bmm[k]!;
            return `bar ${k + 1}: ${m.num}/${m.den}`;
          })
          .join(' · ');
        return (
          <p style={{ margin: '0.2rem 0' }}>
            <strong>Per-bar meter (iReal T):</strong> {line}
          </p>
        );
      })()}
      <p style={{ margin: '0.2rem 0' }}>
        <strong>Tempo:</strong> {tempo}
      </p>
      <p style={{ margin: '0.2rem 0' }}>
        <strong>Style:</strong> {style}
      </p>
      <p style={{ margin: '0.2rem 0' }}>
        <strong>Bars:</strong> {bars}
      </p>
    </div>
  );
}

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
  { id: 'antonio_carlos_jobim', label: 'Antônio Carlos Jobim' },
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
  { id: 'frank_zappa', label: 'Frank Zappa' },
  { id: 'greek_rebetiko', label: 'Greek Rebetiko' },
  { id: 'ecm_chamber', label: 'ECM Chamber' },
  { id: 'holland_dozier_holland', label: 'Holland-Dozier-Holland' },
  { id: 'herbie_hancock', label: 'Herbie Hancock' },
  { id: 'james_brown', label: 'James Brown' },
  { id: 'jeff_lynne', label: 'Jeff Lynne' },
  { id: 'jeff_tweedy', label: 'Jeff Tweedy' },
  { id: 'kate_bush', label: 'Kate Bush' },
  { id: 'joni_mitchell', label: 'Joni Mitchell' },
  { id: 'kendrick_lamar', label: 'Kendrick Lamar' },
  { id: 'kurt_weill', label: 'Kurt Weill' },
  { id: 'mahler', label: 'Mahler' },
  { id: 'max_martin', label: 'Max Martin' },
  { id: 'miles_davis', label: 'Miles Davis' },
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
  { id: 'satie', label: 'Erik Satie' },
  { id: 'schubert', label: 'Schubert' },
  { id: 'shostakovich', label: 'Shostakovich' },
  { id: 'smokey_robinson', label: 'Smokey Robinson' },
  { id: 'sonic_youth', label: 'Sonic Youth' },
  { id: 'stephen_sondheim', label: 'Stephen Sondheim' },
  { id: 'stevie_wonder', label: 'Stevie Wonder' },
  { id: 'stravinsky', label: 'Stravinsky' },
  { id: 'thelonious_monk', label: 'Thelonious Monk' },
  { id: 'dave_brubeck', label: 'Dave Brubeck' },
  { id: 'andrew_hill', label: 'Andrew Hill' },
  { id: 'charlie_parker', label: 'Charlie Parker' },
  { id: 'wayne_shorter', label: 'Wayne Shorter' },
  { id: 'xtc', label: 'XTC' },
];

/** Song Mode UI hint only — not sent on Generate (no backend contract). */
const SONG_MODE_DUO_PAIRING_UX: Record<
  string,
  { primaryLabel: string; primaryRationale: string; alternateLabel: string; alternateRationale: string }
> = {
  pat_metheny: {
    primaryLabel: 'guitar + melodica',
    primaryRationale: 'wide register, lyrical answering phrases',
    alternateLabel: 'guitar + piano',
    alternateRationale: 'open harmony under lyrical guitar lead',
  },
  bacharach: {
    primaryLabel: 'piano + strings',
    primaryRationale: 'melodic lead with harmonic cushion',
    alternateLabel: 'voice + rhythm section',
    alternateRationale: 'breathy lead over anchored groove',
  },
  ecm_chamber: {
    primaryLabel: 'piano + bass',
    primaryRationale: 'sparse chamber texture, wide spacing',
    alternateLabel: 'guitar + bass',
    alternateRationale: 'electric warmth with anchored upright motion',
  },
};

/** Primary ordering inside each optgroup (Shipped = full golden-path slice in core). */
const SONGWRITER_GROUP_SHIPPED_ORDER: readonly string[] = [
  'brian_wilson',
  'stevie_wonder',
  'radiohead',
  'james_brown',
  'sonic_youth',
  'pat_metheny',
  'wayne_shorter',
  'barry_harris',
  'stephen_sondheim',
  'kate_bush',
  'thelonious_monk',
  'dave_brubeck',
  'andrew_hill',
  'charlie_parker',
  'bill_evans',
  'satie',
  'miles_davis',
  'bacharach',
  'donald_fagen',
  'frank_zappa',
  'ecm_chamber',
  'antonio_carlos_jobim',
  'herbie_hancock',
];

/** Shipped writers shown under the Singer-Songwriter subgroup (full slice; separate optgroup label). */
const SONGWRITER_GROUP_SHIPPED_SINGER_SONGWRITER_ORDER: readonly string[] = ['joni_mitchell'];

const SONGWRITER_GROUP_READY_ORDER: readonly string[] = [];

const SONGWRITER_OPTION_BY_ID = new Map(SONGWRITER_OPTIONS.map((o) => [o.id, o]));
const SONGWRITER_GROUP_SHIPPED_IDS = new Set<string>([
  ...SONGWRITER_GROUP_SHIPPED_ORDER,
  ...SONGWRITER_GROUP_SHIPPED_SINGER_SONGWRITER_ORDER,
]);
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
  'Songwriters are grouped into Shipped full slice, Shipped singer-songwriter slice, Ready to build, and In library.';
const ARIA_ARRANGER_GROUPS_DESC =
  'Arrangers are grouped into Big band core research-backed and Charts and studio voices.';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(''));
}

function SongwriterSelectOptionGroups({ onOptionHover }: { onOptionHover?: (id: string | null) => void }) {
  const optHover = (id: string) =>
    onOptionHover
      ? {
          onMouseEnter: () => onOptionHover(id),
        }
      : {};
  return (
    <>
      <optgroup label="Shipped (full slice)">
        {SONGWRITER_GROUP_SHIPPED_ORDER.filter((id) => SONGWRITER_OPTION_BY_ID.has(id)).map((id) => {
          const o = SONGWRITER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id} {...optHover(o.id)}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="Shipped — Singer-Songwriter">
        {SONGWRITER_GROUP_SHIPPED_SINGER_SONGWRITER_ORDER.filter((id) => SONGWRITER_OPTION_BY_ID.has(id)).map((id) => {
          const o = SONGWRITER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id} {...optHover(o.id)}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="Ready to build">
        {SONGWRITER_GROUP_READY_ORDER.filter((id) => SONGWRITER_OPTION_BY_ID.has(id)).map((id) => {
          const o = SONGWRITER_OPTION_BY_ID.get(id)!;
          return (
            <option key={id} value={o.id} {...optHover(o.id)}>
              {o.label}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="In library">
        {SONGWRITER_LIBRARY_ORDERED.map((o) => (
          <option key={o.id} value={o.id} {...optHover(o.id)}>
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

type ZappaMeterExtraPresetId = (typeof ZAPPA_METER_CYCLE_PRESET_DEFINITIONS)[number]['id'];
type ZappaMeterPresetId = 'all_4_4' | 'zappa_classic' | 'black_page' | ZappaMeterExtraPresetId;

const ZAPPA_METER_RADIO_OPTIONS: { id: ZappaMeterPresetId; label: string }[] = [
  { id: 'all_4_4', label: 'All 4/4' },
  { id: 'zappa_classic', label: 'Zappa Classic' },
  { id: 'black_page', label: 'Black Page' },
  ...ZAPPA_METER_CYCLE_PRESET_DEFINITIONS.map((d) => ({ id: d.id, label: d.label })),
];

function buildZappaMetersForPreset(
  preset: ZappaMeterPresetId,
  barCount: number
): Array<{ numerator: number; denominator: number }> {
  const extra = ZAPPA_METER_CYCLE_PRESET_DEFINITIONS.find((p) => p.id === preset);
  if (extra) return tileZappaMeterCycle(extra.cycle, barCount);
  const out: Array<{ numerator: number; denominator: number }> = [];
  const n = Math.max(0, Math.floor(barCount));
  for (let b = 1; b <= n; b++) {
    if (preset === 'all_4_4') {
      out.push({ numerator: 4, denominator: 4 });
    } else if (preset === 'zappa_classic') {
      out.push(b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 });
    } else {
      out.push(b % 2 === 1 ? { numerator: 19, denominator: 16 } : { numerator: 4, denominator: 4 });
    }
  }
  return out;
}

/** Builds API `barMeterMap` (1-based keys). */
function zappaRowsToBarMeterMap(
  rows: Array<{ numerator: number; denominator: number }>
): Record<number, { numerator: number; denominator: number }> {
  const map: Record<number, { numerator: number; denominator: number }> = {};
  for (let i = 0; i < rows.length; i++) {
    map[i + 1] = {
      numerator: rows[i]!.numerator,
      denominator: rows[i]!.denominator,
    };
  }
  return map;
}

type ZappaMeterStep = { numerator: number; denominator: number };

/** Canonical repeating unit + stride for each meter preset (Pattern tab). */
function zappaPresetPattern(preset: ZappaMeterPresetId): { steps: ZappaMeterStep[]; barsPerStep: number } {
  const extra = ZAPPA_METER_CYCLE_PRESET_DEFINITIONS.find((p) => p.id === preset);
  if (extra) return zappaMeterCycleToPresetPattern(extra.cycle);
  if (preset === 'all_4_4') {
    return { steps: [{ numerator: 4, denominator: 4 }], barsPerStep: 1 };
  }
  if (preset === 'zappa_classic') {
    return {
      steps: [
        { numerator: 7, denominator: 8 },
        { numerator: 4, denominator: 4 },
      ],
      barsPerStep: 1,
    };
  }
  return {
    steps: [
      { numerator: 19, denominator: 16 },
      { numerator: 4, denominator: 4 },
    ],
    barsPerStep: 1,
  };
}

/** Tile `steps` across `barCount` bars; each step lasts `barsPerStep` consecutive bars. */
function expandZappaPatternToRows(steps: ZappaMeterStep[], barsPerStep: number, barCount: number): ZappaMeterStep[] {
  const n = Math.max(0, Math.floor(barCount));
  const safeSteps = steps.length > 0 ? steps : [{ numerator: 4, denominator: 4 }];
  const k = Math.max(1, Math.min(64, Math.floor(barsPerStep)));
  const out: ZappaMeterStep[] = [];
  for (let b = 1; b <= n; b++) {
    const stepIdx = Math.floor((b - 1) / k) % safeSteps.length;
    const src = safeSteps[stepIdx]!;
    out.push({ numerator: src.numerator, denominator: src.denominator });
  }
  return out;
}

/** Frank Zappa Song Mode — discrete lengths aligned with engine song-form counts. */
const ZAPPA_SONG_BAR_OPTIONS = [8, 16, 32, 64] as const;
type ZappaSongBarCount = (typeof ZAPPA_SONG_BAR_OPTIONS)[number];

function nearestZappaSongBarCount(tb: number): ZappaSongBarCount {
  let best = ZAPPA_SONG_BAR_OPTIONS[0]!;
  let bestD = Infinity;
  for (const x of ZAPPA_SONG_BAR_OPTIONS) {
    const d = Math.abs(x - tb);
    if (d < bestD || (d === bestD && x < best)) {
      best = x;
      bestD = d;
    }
  }
  return best;
}

function clampMeterPart(raw: string, fallback: number): number {
  const n = Math.round(parseFloat(raw));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(128, n);
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
const ARRANGER_GROUP_CORE_ORDER: readonly string[] = [
  'ellington',
  'basie',
  'thad',
  'schneider',
  'quincy_jones',
  'gil_evans',
  'bob_brookmeyer',
  'clare_fischer',
];

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
  /** Alternate-tuning affinity (see `alternateGuitarTunings` STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING). */
  'STYLE_SONIC_YOUTH',
  'STYLE_JONI_MITCHELL',
  'STYLE_PAT_METHENY',
  'STYLE_ECM_CHAMBER',
] as const;
type SongModeStyleProfile = (typeof SONG_MODE_STYLE_OPTIONS)[number];
const SONG_MODE_ADVANCED_STYLE_SET = new Set<SongModeStyleProfile>([
  'STYLE_ECM',
  'STYLE_ECM_CHAMBER',
  'STYLE_SHORTER_POST_BOP',
  'STYLE_MODERN_JAZZ',
  'STYLE_SOPHISTICATED_POP',
  'STYLE_GROOVE_SOUL',
  /** Wired to songwriter slice logic (harmony precompute + passes / velocity); see playbook. */
  'STYLE_SONIC_YOUTH',
  'STYLE_JONI_MITCHELL',
  'STYLE_PAT_METHENY',
]);

/** Song Mode ECM surface — matches engine `applyEcmChamberStyleSurface` / GenerateRequest.ecmChamberMode. */
type EcmChamberGenerationMode = 'angel_song' | 'balanced' | 'metheny_scofield';

function ecmChamberFlow01ToMode(flow01: number): EcmChamberGenerationMode {
  const t = Math.max(0, Math.min(1, flow01));
  if (t < 1 / 3) return 'angel_song';
  if (t < 2 / 3) return 'balanced';
  return 'metheny_scofield';
}

function ecmChamberModeToFlow01(mode: EcmChamberGenerationMode): number {
  if (mode === 'angel_song') return 0;
  if (mode === 'balanced') return 0.5;
  return 1;
}

function ecmChamberModeUiLabel(mode: EcmChamberGenerationMode): string {
  if (mode === 'angel_song') return 'Angel Song';
  if (mode === 'balanced') return 'Balanced ECM Duo';
  return 'Metheny·Scofield';
}

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
  if (id === 'STYLE_SONIC_YOUTH') return 'Sonic Youth / Noise (alt tuning)';
  if (id === 'STYLE_JONI_MITCHELL') return 'Joni Mitchell (alt tuning)';
  if (id === 'STYLE_PAT_METHENY') return 'Pat Metheny (alt tuning)';
  if (id === 'STYLE_ECM_CHAMBER') return 'ECM Chamber (alt tuning)';
  return id.replace(/^STYLE_/, '').replace(/_/g, ' ');
}

/** Presets listed under "Other" — excluded from zone optgroups to avoid duplicate options. */
const ALT_TUNING_OTHER_GROUP_IDS = ['standard', 'drop_d', 'custom'] as const;

const ALT_TUNING_ZONE_GROUPS: { zone: AlternateGuitarTuningZone; label: string }[] = [
  { zone: 'jazz_sophisticated', label: 'Jazz / Sophisticated' },
  { zone: 'sonic_youth_noise', label: 'Sonic Youth / Noise' },
  { zone: 'joni_mitchell', label: 'Joni Mitchell' },
  { zone: 'hybrid_harmonic', label: 'Hybrid / Harmonic' },
];

function AlternateTuningPresetSelect(props: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  optionKeyPrefix: string;
}) {
  const excluded = new Set<string>(ALT_TUNING_OTHER_GROUP_IDS);
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
    >
      {ALT_TUNING_ZONE_GROUPS.map(({ zone, label }) => (
        <optgroup key={`${props.optionKeyPrefix}-zg-${zone}`} label={label}>
          {getPresetsByZone(zone)
            .filter((p) => !excluded.has(p.id))
            .map((p) => (
              <option key={`${props.optionKeyPrefix}-${p.id}`} value={p.id}>
                {p.label}
              </option>
            ))}
        </optgroup>
      ))}
      <optgroup key={`${props.optionKeyPrefix}-other`} label="Other">
        {ALT_TUNING_OTHER_GROUP_IDS.map((tid) => {
          const p = getAlternateGuitarTuningPreset(tid);
          return p ? (
            <option key={`${props.optionKeyPrefix}-${tid}`} value={p.id}>
              {p.label}
            </option>
          ) : null;
        })}
      </optgroup>
    </select>
  );
}

/** Song Mode style profiles that expose the alternate tuning control (aligned with engine policy). */
const SONG_MODE_ALT_TUNING_STYLE_PROFILES = new Set<SongModeStyleProfile>([
  'STYLE_INDIE_ART_POP',
  'STYLE_SONIC_YOUTH',
  'STYLE_JONI_MITCHELL',
  'STYLE_PAT_METHENY',
  'STYLE_ECM_CHAMBER',
]);

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

const MUSICXML_IMPORT_INVALID_MESSAGE =
  'File does not appear to be valid MusicXML — please check and try again';

/** Optional lead-sheet file upload: well-formed XML with MusicXML score root (partwise or timewise). */
function validateMusicXmlScoreDocument(xml: string): boolean {
  const t = xml.trim();
  if (!t) return false;
  try {
    const doc = new DOMParser().parseFromString(t, 'application/xml');
    if (doc.querySelector('parsererror')) return false;
    const root = doc.documentElement;
    if (!root) return false;
    const ln = root.localName?.toLowerCase() ?? '';
    return ln === 'score-partwise' || ln === 'score-timewise';
  } catch {
    return false;
  }
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
    /** When true, treat the run as export-valid even if readiness shareable is false. */
    exportIntegrityPassed?: boolean;
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

type DuoHealthLevel = 'green' | 'amber' | 'red';

function duoHealthBadgeStyle(level: DuoHealthLevel): { bg: string; border: string; color: string } {
  if (level === 'green') {
    return { bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.45)', color: '#166534' };
  }
  if (level === 'amber') {
    return { bg: 'rgba(234,179,8,0.16)', border: 'rgba(234,179,8,0.5)', color: '#a16207' };
  }
  return { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.45)', color: '#b91c1c' };
}

function parsePhraseContoursLoose(v: unknown): PhraseContourTag[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: PhraseContourTag[] = [];
  for (const x of v) {
    if (x === 'rise' || x === 'fall' || x === 'stable') out.push(x);
  }
  return out.length ? out : undefined;
}

function parseTensionProgressionLoose(v: unknown): ChorusTensionProgression | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const pc = (v as { perChorus?: unknown }).perChorus;
  if (!Array.isArray(pc)) return undefined;
  const nums = pc.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return nums.length ? { perChorus: nums.map((n) => Math.min(1, Math.max(0, n))) } : undefined;
}

/** Best-effort read when API echoes vault diagnostics on the root record or under `runManifest`. */
function extractVaultEchoFromGenResult(r: GenResult | null): {
  phraseContours?: PhraseContourTag[];
  tensionProgression?: ChorusTensionProgression;
} {
  if (!r) return {};
  const rec = r as Record<string, unknown>;
  const directC = parsePhraseContoursLoose(rec.phraseContours);
  const directT = parseTensionProgressionLoose(rec.tensionProgression);
  const rm = rec.runManifest as Record<string, unknown> | undefined;
  const nestedC = rm ? parsePhraseContoursLoose(rm.phraseContours) : undefined;
  const nestedT = rm ? parseTensionProgressionLoose(rm.tensionProgression) : undefined;
  return {
    phraseContours: directC ?? nestedC,
    tensionProgression: directT ?? nestedT,
  };
}

function meanAbsRegisterBiasFromManifest(rm: GenResult['runManifest']): number | null {
  const desc = rm?.songModeSectionBehaviourDescriptors;
  if (!desc?.length) return null;
  const vals: number[] = [];
  for (const d of desc) {
    const rb = d.registerBiasByRole;
    if (!rb) continue;
    for (const k of Object.keys(rb)) {
      const z = rb[k as keyof typeof rb];
      if (typeof z === 'number') vals.push(Math.abs(z));
    }
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * UI-only heuristic: prefers vault `phraseContours` + `tensionProgression` when present on the client record;
 * otherwise falls back to Voice-2 polyphony + Space slider + register biases.
 */
function computeSongModeDuoHealthReadout(r: GenResult | null): {
  independence: DuoHealthLevel;
  spacing: DuoHealthLevel;
  sourceLabel: string;
} | null {
  if (!r?.success || r.runManifest?.presetId !== 'song_mode') return null;

  const { phraseContours: pc, tensionProgression: tp } = extractVaultEchoFromGenResult(r);
  const n = pc?.length ?? 0;
  const hasTp = (tp?.perChorus?.length ?? 0) > 0;

  if (n > 0 || hasTp) {
    const riseRatio = n > 0 ? pc!.filter((c) => c === 'rise').length / n : 0;
    const stableRatio = n > 0 ? pc!.filter((c) => c === 'stable').length / n : 0;
    const avgT =
      hasTp && tp!.perChorus.length > 0
        ? tp!.perChorus.reduce((a, b) => a + b, 0) / tp!.perChorus.length
        : 0.42;

    const indStress = 0.52 * avgT + 0.48 * riseRatio;
    const independence: DuoHealthLevel =
      indStress < 0.38 ? 'green' : indStress < 0.58 ? 'amber' : 'red';

    const spaceStress =
      0.58 * stableRatio * (1 - avgT) + 0.42 * Math.max(0, 0.32 - avgT) * (0.45 + stableRatio * 0.55);
    const spacing: DuoHealthLevel =
      spaceStress < 0.36 ? 'green' : spaceStress < 0.54 ? 'amber' : 'red';

    return { independence, spacing, sourceLabel: 'Contour + tension (vault echo)' };
  }

  const v2 = r.voice2PolyphonyDiagnostics;
  const reg = meanAbsRegisterBiasFromManifest(r.runManifest);
  const spaceEcho = r.requestEcho?.space;

  if (!v2 && reg == null && typeof spaceEcho !== 'number') return null;

  let independence: DuoHealthLevel = 'amber';
  if (v2 && v2.v2TotalNotes > 0) {
    const fusion = v2.v2StrongBeatEntries / Math.max(1, v2.v2TotalNotes);
    const densityStress = Math.min(1, v2.v2AvgNotesPerActiveBar / 3.25);
    const stress = 0.55 * fusion + 0.45 * densityStress;
    independence = stress < 0.36 ? 'green' : stress < 0.6 ? 'amber' : 'red';
  }

  let spacing: DuoHealthLevel = 'green';
  if (typeof spaceEcho === 'number') {
    if (spaceEcho < 0.22 || spaceEcho > 0.88) {
      spacing = spaceEcho < 0.12 || spaceEcho > 0.93 ? 'red' : 'amber';
    }
  }
  if (reg != null) {
    if (reg > 0.62) spacing = spacing === 'green' ? 'amber' : spacing;
    if (reg > 0.88) spacing = 'red';
  }

  return { independence, spacing, sourceLabel: 'Voice-2 + Space slider + register bias (proxy)' };
}

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
  /** ECM style (`STYLE_ECM` / `STYLE_ECM_CHAMBER`): 0 = Chamber (Angel Song pole), 0.5 = Balanced, 1 = Flow (Metheny·Scofield pole). */
  const [ecmChamberFlow01, setEcmChamberFlow01] = useState(0.5);
  const [intentGroove, setIntentGroove] = useState(0.5);
  const [intentSpace, setIntentSpace] = useState(0.5);
  const [intentExpression, setIntentExpression] = useState(0.5);
  const [intentSurprise, setIntentSurprise] = useState(0.5);
  const [intentPattern, setIntentPattern] = useState(0.5);
  const [secondarySongwriterStyle, setSecondarySongwriterStyle] = useState('');
  const [primarySongwriterHoverId, setPrimarySongwriterHoverId] = useState<string | null>(null);
  const [secondarySongwriterHoverId, setSecondarySongwriterHoverId] = useState<string | null>(null);
  const [songModeDiversityPresetId, setSongModeDiversityPresetId] = useState('');
  const [authorOverlay, setAuthorOverlay] = useState('');
  const [classicalOverlay, setClassicalOverlay] = useState('');
  const [zappaSoloMidiLow, setZappaSoloMidiLow] = useState(40);
  const [zappaSoloMidiHigh, setZappaSoloMidiHigh] = useState(84);
  const [zappaSoloDensity, setZappaSoloDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [zappaSoloDissonance, setZappaSoloDissonance] = useState<'mild' | 'moderate' | 'extreme'>('moderate');
  const [zappaMeterPresetId, setZappaMeterPresetId] = useState<ZappaMeterPresetId>('all_4_4');
  const [composerMeterPresetId, setComposerMeterPresetId] = useState<string>('all_4_4');
  const [zappaMetersByBar, setZappaMetersByBar] = useState<Array<{ numerator: number; denominator: number }>>([]);
  const [zappaMeterUiMode, setZappaMeterUiMode] = useState<'pattern' | 'per_bar'>('pattern');
  const [zappaMeterPatternSteps, setZappaMeterPatternSteps] = useState<ZappaMeterStep[]>([
    { numerator: 4, denominator: 4 },
  ]);
  const [zappaMeterBarsPerStep, setZappaMeterBarsPerStep] = useState(1);
  const lastZappaMeterPresetRef = useRef<ZappaMeterPresetId>('all_4_4');
  const [zappaSongBars, setZappaSongBars] = useState<ZappaSongBarCount>(32);
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
  /** Optional MusicXML lead sheet for Song Mode / Big Band / String Quartet (`ensembleLeadSheetMusicXml`). */
  const [leadSheetFile, setLeadSheetFile] = useState<File | null>(null);
  const [leadSheetXml, setLeadSheetXml] = useState<string | null>(null);
  const [leadSheetImportError, setLeadSheetImportError] = useState<string | null>(null);
  const ensembleLeadSheetFileInputRef = useRef<HTMLInputElement | null>(null);
  const [formId, setFormId] = useState<string>('');
  /** Big Band only: '' = standard (no formId); `big_band_blues12` = 42-bar blues chart. */
  const [bigBandFormId, setBigBandFormId] = useState('');
  const [songFormMenuOpen, setSongFormMenuOpen] = useState(false);
  const songFormDropdownRef = useRef<HTMLDivElement>(null);
  const [c4Strength, setC4Strength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [blendStrength, setBlendStrength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [chromaticStrength, setChromaticStrength] = useState<'off' | 'subtle' | 'prominent'>('off');
  const [funkGroove, setFunkGroove] = useState(false);
  const [generateDrumGuide, setGenerateDrumGuide] = useState(true);
  const [riffStyle, setRiffStyle] = useState<'metheny' | 'scofield' | 'funk' | 'neutral'>('neutral');
  const [riffDensity, setRiffDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [riffGrid, setRiffGrid] = useState<'eighth' | 'sixteenth'>('eighth');
  const [riffLineMode, setRiffLineMode] = useState<
    'single_line' | 'guitar_bass' | 'octave_double'
  >('single_line');
  const [riffBass, setRiffBass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iRealPaste, setIRealPaste] = useState('');
  const [iRealVaultRiffStyle, setIRealVaultRiffStyle] = useState<
    'bebop-placement' | 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string'
  >('bebop-placement');
  const [iRealVaultTuningId, setIRealVaultTuningId] = useState('standard');
  const [iRealVaultMode, setIRealVaultMode] = useState<'solo' | 'melody'>('solo');
  const [iRealVaultDrift, setIRealVaultDrift] = useState<EmotionalDrift>('neutral');
  const [iRealVaultChorusCount, setIRealVaultChorusCount] = useState(1);
  const [iRealVaultChorusLocks, setIRealVaultChorusLocks] = useState<boolean[]>([]);
  const [iRealVaultOutput, setIRealVaultOutput] = useState<IRealVaultOutput | null>(null);
  const [iRealVaultBusy, setIRealVaultBusy] = useState(false);
  const [chordPasteText, setChordPasteText] = useState('');
  const [chordPasteKey, setChordPasteKey] = useState('C');
  const [chordPasteTimeSigId, setChordPasteTimeSigId] = useState<'4-4' | '3-4' | '6-8'>('4-4');
  const [chordPasteTempo, setChordPasteTempo] = useState(120);
  const [chordPasteMode, setChordPasteMode] = useState<'solo' | 'melody'>('solo');
  const [chordPasteTuningId, setChordPasteTuningId] = useState('standard');
  const [chordPasteRiffStyle, setChordPasteRiffStyle] = useState<
    'bebop-placement' | 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string'
  >('bebop-placement');
  const [chordPasteDrift, setChordPasteDrift] = useState<EmotionalDrift>('neutral');
  const [chordPasteChorusCount, setChordPasteChorusCount] = useState(1);
  const [chordPasteChorusLocks, setChordPasteChorusLocks] = useState<boolean[]>([]);
  const [chordPasteOutput, setChordPasteOutput] = useState<IRealVaultOutput | null>(null);
  const [chordPasteBusy, setChordPasteBusy] = useState(false);
  const [chordPasteError, setChordPasteError] = useState<string | null>(null);
  const [chordPasteMusicXmlError, setChordPasteMusicXmlError] = useState<string | null>(null);
  const [chordInspectorInput, setChordInspectorInput] = useState('');
  const [chordInspectorMode, setChordInspectorMode] = useState<'solo' | 'melody'>('solo');
  const [chordInspectorBars, setChordInspectorBars] = useState<1 | 2 | 4>(2);
  const [chordInspectorRiffStyle, setChordInspectorRiffStyle] = useState<
    'bebop-placement' | 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string'
  >('bebop-placement');
  const [chordInspectorTuningId, setChordInspectorTuningId] = useState('standard');
  const [chordInspectorReharmDriftSlider, setChordInspectorReharmDriftSlider] = useState(0.5);
  const [chordInspectorReharmPanelOpen, setChordInspectorReharmPanelOpen] = useState(false);
  const [chordInspectorResult, setChordInspectorResult] = useState<ChordInspectorResult | null>(null);
  const [chordInspectorParseError, setChordInspectorParseError] = useState<string | null>(null);
  const [chordInspectorExportError, setChordInspectorExportError] = useState<string | null>(null);
  const [pdfLeadSheetFile, setPdfLeadSheetFile] = useState<File | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfVaultMode, setPdfVaultMode] = useState<'solo' | 'melody'>('solo');
  const [pdfVaultTuningId, setPdfVaultTuningId] = useState('standard');
  const [pdfVaultRiffStyle, setPdfVaultRiffStyle] = useState<
    'bebop-placement' | 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string'
  >('bebop-placement');
  const [pdfVaultDrift, setPdfVaultDrift] = useState<EmotionalDrift>('neutral');
  const [pdfVaultOutput, setPdfVaultOutput] = useState<IRealVaultOutput | null>(null);
  const [pdfVaultBusy, setPdfVaultBusy] = useState(false);
  const [pdfVaultError, setPdfVaultError] = useState<string | null>(null);
  const [pdfMusicXmlExportError, setPdfMusicXmlExportError] = useState<string | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const [recentSongModeRuns, setRecentSongModeRuns] = useState<SongModeRecentRun[]>([]);
  const [compareRunAId, setCompareRunAId] = useState('');
  const [compareRunBId, setCompareRunBId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<OutputDirectoryResponse | null>(null);
  /** Same merge as Presets tab — single source of truth with engine `getPresets()`. */
  const [modePresets, setModePresets] = useState<AppPresetCard[]>(() => [...APP_PRESET_REGISTRY]);
  /** Song Mode duo pairing chip: per-writer index 0 = primary, 1 = alternate (UI only). */
  const [songModeDuoPairingVariantByWriter, setSongModeDuoPairingVariantByWriter] = useState<
    Record<string, number>
  >({});
  /** Song Mode duo intent — UI only until backend wiring. */
  const [duoIntent, setDuoIntent] = useState<'conversational' | 'supportive'>('conversational');
  /** ECM Chamber Song Mode — UI-only override label for sweep depth (no API wiring). */
  const [ecmFullSweepOverride, setEcmFullSweepOverride] = useState(false);
  /** Last vault RNG options (for remix parity) — set on each successful vault Generate. */
  const [iRealVaultLastRunOptions, setIRealVaultLastRunOptions] = useState<VaultGenerationOptions | null>(null);
  const [chordPasteVaultLastRunOptions, setChordPasteVaultLastRunOptions] = useState<VaultGenerationOptions | null>(
    null
  );
  const [pdfVaultLastRunOptions, setPdfVaultLastRunOptions] = useState<VaultGenerationOptions | null>(null);
  const [pdfVaultParsedChart, setPdfVaultParsedChart] = useState<ParsedChart | null>(null);

  const [vaultRemixSession, setVaultRemixSession] = useState<VaultRemixSession | null>(null);

  /** After "Keep both" — show two saved variants until next vault Generate. */
  const [iRealVaultDual, setIRealVaultDual] = useState<{ a: IRealVaultOutput; b: IRealVaultOutput } | null>(null);
  const [chordPasteVaultDual, setChordPasteVaultDual] = useState<{ a: IRealVaultOutput; b: IRealVaultOutput } | null>(
    null
  );
  const [pdfVaultDual, setPdfVaultDual] = useState<{ a: IRealVaultOutput; b: IRealVaultOutput } | null>(null);
  const desktopTruthDumpEnabled = useRef(false);

  const iRealParsedChart = useMemo((): ParsedChart | null => {
    const t = iRealPaste.trim();
    if (t.length < 8) return null;
    const c = parseIRealProInput(t);
    if (!c.measures?.length && !c.title?.trim()) return null;
    return c;
  }, [iRealPaste]);

  const chordPastePreviewChart = useMemo((): ParsedChart | null => {
    try {
      if (!chordPasteText.trim()) return null;
      return parseChordProgressionText(
        chordPasteText,
        chordPasteKey,
        chordPasteTimeSigFromUi(chordPasteTimeSigId),
        chordPasteTempo
      );
    } catch {
      return null;
    }
  }, [chordPasteText, chordPasteKey, chordPasteTimeSigId, chordPasteTempo]);

  const chordInspectorReharmTopEight = useMemo((): ReharmCandidate[] => {
    if (!chordInspectorResult || !chordInspectorReharmPanelOpen) return [];
    const target = sliderToTargetReharmDrift(chordInspectorReharmDriftSlider);
    const pool = generateReharmCandidates(
      chordInspectorResult.vaultChordTypeId,
      chordInspectorResult.rootPc,
      null,
      'neutral'
    );
    const scored = pool.map((c) => ({
      c,
      proximity: reharmDriftAffinityScore(c.substituteChordTypeId, target),
    }));
    scored.sort((a, b) => {
      const d = b.proximity - a.proximity;
      if (d !== 0) return d;
      return b.c.bassSmoothnessScore - a.c.bassSmoothnessScore;
    });
    return scored.slice(0, 8).map((s) => s.c);
  }, [chordInspectorResult, chordInspectorReharmPanelOpen, chordInspectorReharmDriftSlider]);

  const songModeStyleProfileRef = useRef<SongModeStyleProfile>(songModeStyleProfile);
  const ecmChamberFlow01Ref = useRef(ecmChamberFlow01);
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
    ecmChamberFlow01Ref.current = ecmChamberFlow01;
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
    ecmChamberFlow01,
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
    setIRealVaultChorusLocks((prev) => boolArrayToLength(prev, iRealVaultChorusCount));
  }, [iRealVaultChorusCount]);

  useEffect(() => {
    setChordPasteChorusLocks((prev) => boolArrayToLength(prev, chordPasteChorusCount));
  }, [chordPasteChorusCount]);

  useEffect(() => {
    setLeadSheetFile(null);
    setLeadSheetXml(null);
    setLeadSheetImportError(null);
    if (ensembleLeadSheetFileInputRef.current) ensembleLeadSheetFileInputRef.current.value = '';
  }, [presetId]);

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
    : presetId === 'song_mode' && songwriterStyle === 'frank_zappa'
      ? zappaSongBars
      : clampSongFormBarCount(totalBars, 32);

  const ecmSweepChartRisk = useMemo((): { longForm: boolean; mixedMeter: boolean } => {
    if (presetId !== 'song_mode' || songwriterStyle.trim().toLowerCase() !== 'ecm_chamber') {
      return { longForm: false, mixedMeter: false };
    }
    let mainLineBars = 0;
    try {
      const line = chordProgressionText.trim() || tonalCenter.trim();
      if (line) {
        const c = parseChordProgressionText(
          line,
          tonalCenter.trim() || 'C',
          { num: 4, den: 4 },
          bpm
        );
        mainLineBars = c.measures?.length ?? 0;
      }
    } catch {
      mainLineBars = 0;
    }
    const irealBars = iRealParsedChart?.measures?.length ?? 0;
    const pasteBars = chordPastePreviewChart?.measures?.length ?? 0;
    const longForm =
      songFormBars > 32 || mainLineBars > 32 || irealBars > 32 || pasteBars > 32;
    const mixedMeter =
      (iRealParsedChart != null && parsedChartHasMixedMeter(iRealParsedChart)) ||
      (chordPastePreviewChart != null && parsedChartHasMixedMeter(chordPastePreviewChart)) ||
      leadSheetXmlLooksMixedMeter(songModeLeadSheetMusicXml);
    return { longForm, mixedMeter };
  }, [
    presetId,
    songwriterStyle,
    songFormBars,
    chordProgressionText,
    tonalCenter,
    bpm,
    iRealParsedChart,
    chordPastePreviewChart,
    songModeLeadSheetMusicXml,
  ]);

  const ecmSweepRiskEscalated = ecmSweepChartRisk.longForm || ecmSweepChartRisk.mixedMeter;
  const showEcmAmberSweepBadge = ecmSweepRiskEscalated && !ecmFullSweepOverride;

  useEffect(() => {
    if (songwriterStyle.trim().toLowerCase() !== 'ecm_chamber') setEcmFullSweepOverride(false);
  }, [songwriterStyle]);

  useEffect(() => {
    if (presetId !== 'song_mode' || songwriterStyle !== 'frank_zappa') return;
    setTotalBars(zappaSongBars);
  }, [zappaSongBars, songwriterStyle, presetId]);

  useEffect(() => {
    setComposerMeterPresetId('all_4_4');
  }, [songwriterStyle]);
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

  useEffect(() => {
    if (songwriterStyle !== 'frank_zappa') return;
    if (presetId !== 'song_mode' && presetId !== 'string_quartet' && presetId !== 'big_band') return;
    const n = songFormBars;

    if (zappaMeterUiMode === 'pattern') {
      const safeSteps =
        zappaMeterPatternSteps.length > 0 ? zappaMeterPatternSteps : [{ numerator: 4, denominator: 4 }];
      setZappaMetersByBar(expandZappaPatternToRows(safeSteps, zappaMeterBarsPerStep, n));
      lastZappaMeterPresetRef.current = zappaMeterPresetId;
      return;
    }

    if (lastZappaMeterPresetRef.current !== zappaMeterPresetId) {
      lastZappaMeterPresetRef.current = zappaMeterPresetId;
      setZappaMetersByBar(buildZappaMetersForPreset(zappaMeterPresetId, n));
      return;
    }
    setZappaMetersByBar((prev) => {
      if (prev.length === n) return prev;
      if (n > prev.length) {
        const tail = buildZappaMetersForPreset(zappaMeterPresetId, n).slice(prev.length);
        return [...prev, ...tail];
      }
      return prev.slice(0, n);
    });
  }, [
    songFormBars,
    zappaMeterPresetId,
    songwriterStyle,
    presetId,
    zappaMeterUiMode,
    zappaMeterPatternSteps,
    zappaMeterBarsPerStep,
  ]);

  function switchZappaMeterUiToPatternTab() {
    if (zappaMeterUiMode === 'pattern') return;
    setZappaMeterUiMode('pattern');
    const rows = zappaMetersByBar;
    if (rows.length > 0) {
      setZappaMeterPatternSteps(
        rows.slice(0, Math.min(16, rows.length)).map((r) => ({
          numerator: r.numerator,
          denominator: r.denominator,
        }))
      );
    }
  }

  function switchZappaMeterUiToPerBarTab() {
    setZappaMeterUiMode('per_bar');
  }

  function onSongFormChordProgressionBlur() {
    if (!songFormBarPreset) return;
    setChordProgressionText((prev) => alignChordProgressionToSongFormBars(prev, songFormBars));
  }

  async function onEnsembleLeadSheetFileChange(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const isMxl = nameLower.endsWith('.mxl');
    setLeadSheetImportError(null);
    try {
      let xml: string;
      if (isMxl) {
        const buf = await file.arrayBuffer();
        const extracted = extractScoreMusicXmlFromUint8Array(new Uint8Array(buf));
        if (!extracted.ok || !extracted.xml) {
          setLeadSheetFile(null);
          setLeadSheetXml(null);
          setLeadSheetImportError(MUSICXML_IMPORT_INVALID_MESSAGE);
          return;
        }
        xml = extracted.xml;
      } else {
        xml = await file.text();
      }
      if (!validateMusicXmlScoreDocument(xml)) {
        setLeadSheetFile(null);
        setLeadSheetXml(null);
        setLeadSheetImportError(MUSICXML_IMPORT_INVALID_MESSAGE);
        return;
      }
      setLeadSheetFile(file);
      setLeadSheetXml(xml);
      setLeadSheetImportError(null);
    } catch {
      setLeadSheetFile(null);
      setLeadSheetXml(null);
      setLeadSheetImportError(MUSICXML_IMPORT_INVALID_MESSAGE);
    }
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
        const leadSheetXmlTrim = (leadSheetXml ?? '').trim();
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
        if (
          presetId === 'song_mode' &&
          liveAlternateTuningEnabled &&
          SONG_MODE_ALT_TUNING_STYLE_PROFILES.has(liveSongModeStyleProfile as SongModeStyleProfile)
        ) {
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
        /** Frank Zappa: ensure full-length meter rows even if UI state is one render behind `songFormBars`. */
        const zappaBarMeterPayload =
          (presetId === 'song_mode' || presetId === 'string_quartet' || presetId === 'big_band') &&
          songwriterStyle === 'frank_zappa'
            ? (() => {
                const n = songFormBars;
                const rows =
                  zappaMetersByBar.length === n
                    ? zappaMetersByBar
                    : buildZappaMetersForPreset(zappaMeterPresetId, n);
                if (rows.length !== n || n <= 0) return undefined;
                return zappaRowsToBarMeterMap(rows);
              })()
            : undefined;

        const composerBarMeterPayload =
          presetId === 'song_mode' &&
          isComposerOddMeterSongwriter(songwriterStyle) &&
          composerMeterPresetId !== 'all_4_4'
            ? (() => {
                const n = songFormBars;
                const rows = buildComposerOddMeterRows(songwriterStyle, composerMeterPresetId, n);
                if (rows.length !== n || n <= 0) return undefined;
                return zappaRowsToBarMeterMap(rows);
              })()
            : undefined;

        const generatePayload = {
          ...coreFields,
          ...(!generateDrumGuide ? { skipDrumGuide: true as const } : {}),
          variationEnabled: variationEnabled,
          styleStack: isScorePreset ? DEFAULT_SCORE_STYLE_STACK : MINIMAL_STYLE_STACK,
          title: scoreTitle.trim() || undefined,
          ...(presetId === 'ecm_chamber' ? { ecmMode } : {}),
          ...(isGuitarBassDuoFamily(presetId) || presetId === 'song_mode'
            ? { c4Strength: c4Strength, blendStrength: blendStrength, songModeJamesBrownFunkOverlay: funkGroove }
            : {}),
          ...(presetId === 'song_mode' || presetId === 'big_band' || presetId === 'string_quartet'
            ? { chromaticStrength }
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
                /** Reinforces coreFields — visible in `[PAYLOAD]` and survives mapping edge cases. */
                primarySongwriterStyle: songwriterStyle.trim(),
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
                ...(classicalOverlay.trim() ? { classicalOverlay: classicalOverlay.trim() } : {}),
                ...(songwriterStyle === 'frank_zappa'
                  ? {
                      zappaSoloMidiLow,
                      zappaSoloMidiHigh,
                      zappaSoloDensity,
                      zappaSoloDissonance,
                      ...(zappaBarMeterPayload ? { barMeterMap: zappaBarMeterPayload } : {}),
                    }
                  : {}),
                ...(composerBarMeterPayload ? { barMeterMap: composerBarMeterPayload } : {}),
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
                ...(liveSongModeStyleProfile === 'STYLE_ECM' ||
                liveSongModeStyleProfile === 'STYLE_ECM_CHAMBER'
                  ? { ecmChamberMode: ecmChamberFlow01ToMode(ecmChamberFlow01Ref.current) }
                  : {}),
              }
            : {}),
          ...((presetId === 'string_quartet' || presetId === 'big_band') &&
          songwriterStyle === 'frank_zappa' &&
          zappaBarMeterPayload
            ? { barMeterMap: zappaBarMeterPayload }
            : {}),
          ...((presetId === 'song_mode' || presetId === 'big_band' || presetId === 'string_quartet') &&
          leadSheetXmlTrim.length > 0
            ? { ensembleLeadSheetMusicXml: leadSheetXmlTrim }
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
          console.log('[PAYLOAD]', JSON.stringify(generatePayload));
          fetch('/api/log-payload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: generatePayload }),
          }).catch(() => {});
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
      leadSheetXml,
      leadSheetPreflightError,
      showHarmonyImportDebugDev,
      importHarmonyModeUi,
      leadSheetHarmonyDisplayModeUi,
      harmonyBlendUi,
      includeVocalLeadSheet,
      c4Strength,
      blendStrength,
      funkGroove,
      generateDrumGuide,
      formId,
      bigBandFormId,
      songFormBarPreset,
      songFormBars,
      zappaMeterPresetId,
      composerMeterPresetId,
      zappaMetersByBar,
      zappaSoloMidiLow,
      zappaSoloMidiHigh,
      zappaSoloDensity,
      zappaSoloDissonance,
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

  const exportIntegrityFlag = v?.exportIntegrityPassed;
  /** Green receipt when export integrity passed, even if shareable is false; fallback to full `passed` when flag omitted. */
  const receiptExportOk =
    !!result &&
    !error &&
    !!result.success &&
    (exportIntegrityFlag === true || (exportIntegrityFlag === undefined && passed));
  /** Red on thrown/client error, failed success flag, explicit exportIntegrity false, or (legacy) full validation failure when integrity flag is omitted. */
  const receiptHardFail =
    !!error ||
    (result != null && !result.success) ||
    exportIntegrityFlag === false ||
    (exportIntegrityFlag === undefined && !!result && !error && !!result.success && !passed);
  const notShareableGenerated = receiptExportOk && v?.readiness?.shareable === false;
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
  const duoHealthReadout = useMemo(() => computeSongModeDuoHealthReadout(result), [result]);
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
  const indieArtPopAltTuningEligible =
    presetId === 'song_mode' && SONG_MODE_ALT_TUNING_STYLE_PROFILES.has(songModeStyleProfile);

  const frankZappaMeterMapBlock = (
    <div
      style={{
        marginBottom: '0.65rem',
        padding: '0.5rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 520,
      }}
    >
      <span
        style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}
      >
        Frank Zappa — meter map (mixed meters)
      </span>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Time signatures for export and odd-meter planning ({songFormBars} bars). Uses{' '}
        <code style={{ fontSize: '0.75rem' }}>oddMeterQuantiser</code> semantics; absent bars default to 4/4.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.55rem' }}>
        {ZAPPA_METER_RADIO_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={zappaMeterPresetId === opt.id}
            onClick={() => {
              const spec = zappaPresetPattern(opt.id);
              setZappaMeterPresetId(opt.id);
              setZappaMeterPatternSteps(spec.steps);
              setZappaMeterBarsPerStep(spec.barsPerStep);
            }}
            disabled={loading}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.8rem',
              borderRadius: 4,
              border:
                zappaMeterPresetId === opt.id
                  ? '1px solid var(--accent, #6ae)'
                  : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
              background: zappaMeterPresetId === opt.id ? 'rgba(100,160,255,0.12)' : 'transparent',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Zappa Classic: 7/8 then 4/4 each bar. Black Page: 19/16 then 4/4 each bar. Oh No–Factory: repeating cycles tile
        across your bar count.
      </p>
      <div
        role="tablist"
        aria-label="Meter map editing mode"
        style={{
          display: 'flex',
          gap: '0.35rem',
          marginBottom: '0.45rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          role="tab"
          id="co-zappa-meter-tab-pattern"
          aria-selected={zappaMeterUiMode === 'pattern'}
          aria-controls="co-zappa-meter-pattern-panel"
          tabIndex={zappaMeterUiMode === 'pattern' ? 0 : -1}
          onClick={switchZappaMeterUiToPatternTab}
          disabled={loading}
          style={{
            padding: '0.3rem 0.65rem',
            fontSize: '0.8rem',
            borderRadius: 4,
            border:
              zappaMeterUiMode === 'pattern'
                ? '1px solid var(--accent, #6ae)'
                : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
            background: zappaMeterUiMode === 'pattern' ? 'rgba(100,160,255,0.12)' : 'transparent',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          Pattern
        </button>
        <button
          type="button"
          role="tab"
          id="co-zappa-meter-tab-per-bar"
          aria-selected={zappaMeterUiMode === 'per_bar'}
          aria-controls="co-zappa-meter-per-bar-panel"
          tabIndex={zappaMeterUiMode === 'per_bar' ? 0 : -1}
          onClick={switchZappaMeterUiToPerBarTab}
          disabled={loading}
          style={{
            padding: '0.3rem 0.65rem',
            fontSize: '0.8rem',
            borderRadius: 4,
            border:
              zappaMeterUiMode === 'per_bar'
                ? '1px solid var(--accent, #6ae)'
                : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
            background: zappaMeterUiMode === 'per_bar' ? 'rgba(100,160,255,0.12)' : 'transparent',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          Per-bar <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(advanced)</span>
        </button>
      </div>
      {zappaMeterUiMode === 'pattern' ? (
        <div
          id="co-zappa-meter-pattern-panel"
          role="tabpanel"
          aria-labelledby="co-zappa-meter-tab-pattern"
          style={{ marginBottom: '0.45rem' }}
        >
          <p
            style={{
              margin: '0 0 0.45rem',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            Define a repeating meter sequence, then repeat for all {songFormBars} bars. Each pattern step can
            span multiple bars (cycle length).
          </p>
          <div style={{ marginBottom: '0.45rem' }}>
            <label
              htmlFor="co-zappa-meter-bars-per-step"
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              Bars per pattern step (cycle length)
            </label>
            <input
              id="co-zappa-meter-bars-per-step"
              type="number"
              min={1}
              max={64}
              value={zappaMeterBarsPerStep}
              onChange={(e) => {
                const raw = Math.round(parseFloat(e.target.value));
                const v =
                  !Number.isFinite(raw) || raw < 1 ? 1 : raw > 64 ? 64 : raw;
                setZappaMeterBarsPerStep(v);
              }}
              disabled={loading}
              style={{ width: '100%', maxWidth: 88, padding: '0.2rem 0.35rem', fontSize: '0.85rem' }}
            />
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
              }}
            >
              Hold each step for this many bars before advancing (1 = new meter every bar).
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.35rem' }}>
            <button
              type="button"
              onClick={() =>
                setZappaMeterPatternSteps((prev) => [...prev, { numerator: 4, denominator: 4 }])
              }
              disabled={loading}
              style={{
                padding: '0.2rem 0.45rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                background: 'transparent',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              Add step
            </button>
            <button
              type="button"
              onClick={() =>
                setZappaMeterPatternSteps((prev) =>
                  prev.length <= 1 ? prev : prev.slice(0, -1)
                )
              }
              disabled={loading || zappaMeterPatternSteps.length <= 1}
              style={{
                padding: '0.2rem 0.45rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                background: 'transparent',
                cursor: loading || zappaMeterPatternSteps.length <= 1 ? 'default' : 'pointer',
              }}
            >
              Remove last step
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginBottom: '0.35rem',
            }}
          >
            {zappaMeterPatternSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ minWidth: '4.5rem', color: 'var(--text-muted)' }}>
                  Step {idx + 1}
                </span>
                <input
                  type="number"
                  min={1}
                  max={128}
                  aria-label={`Pattern step ${idx + 1} numerator`}
                  value={step.numerator}
                  onChange={(e) => {
                    const v = clampMeterPart(e.target.value, step.numerator);
                    setZappaMeterPatternSteps((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx]!, numerator: v };
                      return next;
                    });
                  }}
                  disabled={loading}
                  style={{ width: 72, maxWidth: '100%' }}
                />
                <span>/</span>
                <input
                  type="number"
                  min={1}
                  max={128}
                  aria-label={`Pattern step ${idx + 1} denominator`}
                  value={step.denominator}
                  onChange={(e) => {
                    const v = clampMeterPart(e.target.value, step.denominator);
                    setZappaMeterPatternSteps((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx]!, denominator: v };
                      return next;
                    });
                  }}
                  disabled={loading}
                  style={{ width: 72, maxWidth: '100%' }}
                />
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Live preview fills <strong style={{ fontWeight: 600 }}>barMeterMap</strong> below (same payload as
            Generate).
          </p>
        </div>
      ) : (
        <div
          id="co-zappa-meter-per-bar-panel"
          role="tabpanel"
          aria-labelledby="co-zappa-meter-tab-per-bar"
          style={{ marginBottom: '0.45rem' }}
        >
          <p
            style={{
              margin: '0 0 0.35rem',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            Edit each bar directly (through-composed). Switch back to Pattern for repeating cycles.
          </p>
        </div>
      )}
      <div
        style={{
          maxHeight: 220,
          overflowY: 'auto',
          border: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
          borderRadius: 4,
          padding: '0.35rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(2.5rem,auto) minmax(3rem,1fr) auto minmax(3rem,1fr)',
            gap: '0.25rem 0.35rem',
            alignItems: 'center',
            fontSize: '0.78rem',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Bar</span>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Num</span>
          <span />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Den</span>
          {zappaMetersByBar.map((row, idx) => (
            <Fragment key={idx}>
              <span style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
              <input
                type="number"
                min={1}
                max={128}
                value={row.numerator}
                onChange={(e) => {
                  const v = clampMeterPart(e.target.value, row.numerator);
                  setZappaMetersByBar((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx]!, numerator: v };
                    return next;
                  });
                }}
                disabled={loading || zappaMeterUiMode === 'pattern'}
                style={{ width: '100%', maxWidth: 72 }}
              />
              <span style={{ textAlign: 'center' }}>/</span>
              <input
                type="number"
                min={1}
                max={128}
                value={row.denominator}
                onChange={(e) => {
                  const v = clampMeterPart(e.target.value, row.denominator);
                  setZappaMetersByBar((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx]!, denominator: v };
                    return next;
                  });
                }}
                disabled={loading || zappaMeterUiMode === 'pattern'}
                style={{ width: '100%', maxWidth: 72 }}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  const composerOddMeterSongwriterLabel = primarySongwriterDisplayLabel(songwriterStyle) ?? 'Composer';
  const composerOddMeterMapBlock = isComposerOddMeterSongwriter(songwriterStyle) ? (
    <div
      style={{
        marginBottom: '0.65rem',
        padding: '0.5rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 520,
      }}
    >
      <span
        style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}
      >
        {composerOddMeterSongwriterLabel} — meter map
      </span>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Time signatures for export and odd-meter planning ({songFormBars} bars). Uses{' '}
        <code style={{ fontSize: '0.75rem' }}>oddMeterQuantiser</code> semantics; choose <strong>All 4/4</strong> to omit{' '}
        <code style={{ fontSize: '0.75rem' }}>barMeterMap</code> (default engine path).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.35rem' }}>
        {[
          { id: 'all_4_4', label: 'All 4/4' },
          ...COMPOSER_METER_PRESET_MAP[songwriterStyle as ComposerOddMeterSongwriterId].map((d) => ({
            id: d.id,
            label: d.label,
          })),
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={composerMeterPresetId === opt.id}
            onClick={() => setComposerMeterPresetId(opt.id)}
            disabled={loading}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.8rem',
              borderRadius: 4,
              border:
                composerMeterPresetId === opt.id
                  ? '1px solid var(--accent, #6ae)'
                  : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
              background: composerMeterPresetId === opt.id ? 'rgba(100,160,255,0.12)' : 'transparent',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} disabled={loading}>
            {modePresets.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.supported}>
                {m.name}
                {!m.supported ? ' (coming soon)' : ''}
              </option>
            ))}
          </select>
          {presetId === 'song_mode' && songwriterStyle.trim().toLowerCase() === 'ecm_chamber' ? (
            <span
              role="status"
              title={
                showEcmAmberSweepBadge
                  ? 'Long-form or mixed-meter chart — ECM Chamber reduces sweep variant depth'
                  : 'ECM Chamber Song Mode uses conservative sweep defaults'
              }
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                padding: '0.12rem 0.45rem',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: showEcmAmberSweepBadge ? 'rgba(245, 158, 11, 0.14)' : 'rgba(100, 116, 139, 0.12)',
                color: showEcmAmberSweepBadge ? 'rgb(180, 83, 9)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {showEcmAmberSweepBadge
                ? 'Long-form sparse chart — reduced variant depth'
                : 'Safe sweep profile'}
            </span>
          ) : null}
        </div>
        {presetId === 'song_mode' && songwriterStyle.trim().toLowerCase() === 'ecm_chamber' ? (
          <details
            style={{
              marginTop: '0.45rem',
              maxWidth: 520,
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                userSelect: 'none',
              }}
            >
              Advanced
            </summary>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '0.4rem',
                fontSize: '0.82rem',
                color: 'var(--text)',
              }}
            >
              <input
                type="checkbox"
                checked={ecmFullSweepOverride}
                onChange={(e) => setEcmFullSweepOverride(e.target.checked)}
                disabled={loading}
              />
              Try full sweep anyway
            </label>
          </details>
        ) : null}
        {presetId === 'song_mode' &&
          (() => {
            const w = songwriterStyle.trim().toLowerCase();
            const row = SONG_MODE_DUO_PAIRING_UX[w];
            if (!row) return null;
            const ix = songModeDuoPairingVariantByWriter[w] ?? 0;
            const useAlternate = ix % 2 === 1;
            const instruments = useAlternate ? row.alternateLabel : row.primaryLabel;
            const duoRationale = useAlternate ? row.alternateRationale : row.primaryRationale;
            return (
              <div
                role="note"
                aria-label="Recommended duo pairing"
                style={{ marginTop: '0.45rem', maxWidth: 560 }}
              >
                <span
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Recommended duo pairing
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 999,
                      border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                      background: 'rgba(100,160,255,0.1)',
                      color: 'var(--text)',
                    }}
                  >
                    {instruments}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSongModeDuoPairingVariantByWriter((prev) => ({
                        ...prev,
                        [w]: ((prev[w] ?? 0) + 1) % 2,
                      }))
                    }
                    disabled={loading}
                    style={{
                      fontSize: '0.78rem',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--accent, #6ae)',
                      cursor: loading ? 'default' : 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    swap
                  </button>
                </div>
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                  }}
                >
                  {duoRationale}
                </p>
              </div>
            );
          })()}
        {presetId === 'song_mode' && (
          <div
            role="radiogroup"
            aria-label="Duo intent"
            style={{ marginTop: '0.55rem', maxWidth: 560 }}
          >
            <span
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              Duo intent
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  cursor: loading ? 'default' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                <input
                  type="radio"
                  name="co-duo-intent"
                  checked={duoIntent === 'conversational'}
                  onChange={() => setDuoIntent('conversational')}
                  disabled={loading}
                />
                Conversational
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  cursor: loading ? 'default' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                <input
                  type="radio"
                  name="co-duo-intent"
                  checked={duoIntent === 'supportive'}
                  onChange={() => setDuoIntent('supportive')}
                  disabled={loading}
                />
                Supportive
              </label>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {duoIntent === 'conversational'
                ? 'Voices answer each other across phrases.'
                : 'One voice leads; the other accompanies.'}
            </p>
          </div>
        )}
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

      {(presetId === 'song_mode' || presetId === 'big_band' || presetId === 'string_quartet') && (
        <div style={{ marginBottom: '1rem', maxWidth: 560 }}>
          <span
            id="composer-os-import-lead-sheet-heading"
            style={{
              display: 'block',
              marginBottom: 6,
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Import lead sheet (optional)
          </span>
          <p style={{ margin: '0 0 0.55rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            MusicXML from Sibelius, Finale, or MuseScore
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.65rem',
              minHeight: 44,
            }}
          >
            <input
              ref={ensembleLeadSheetFileInputRef}
              id="composer-os-import-lead-sheet-file"
              type="file"
              accept=".musicxml,.xml,.mxl"
              disabled={loading}
              aria-labelledby="composer-os-import-lead-sheet-heading"
              aria-invalid={leadSheetImportError ? true : undefined}
              onChange={(e) => void onEnsembleLeadSheetFileChange(e.target.files)}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            />
            <label
              htmlFor="composer-os-import-lead-sheet-file"
              style={{
                minHeight: 44,
                minWidth: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 1rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
                fontSize: '0.9rem',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              Choose file
            </label>
            {leadSheetFile && leadSheetXml && !leadSheetImportError && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 44,
                  fontSize: '0.88rem',
                  color: 'var(--text)',
                }}
                aria-live="polite"
              >
                <span style={{ color: 'var(--success, #22c55e)', fontWeight: 700 }} aria-hidden>
                  ✓
                </span>
                <span style={{ wordBreak: 'break-word' }}>{leadSheetFile.name}</span>
              </span>
            )}
            {leadSheetFile && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setLeadSheetFile(null);
                  setLeadSheetXml(null);
                  setLeadSheetImportError(null);
                  if (ensembleLeadSheetFileInputRef.current) ensembleLeadSheetFileInputRef.current.value = '';
                }}
                disabled={loading}
                style={{ minHeight: 44, minWidth: 44, padding: '0 0.85rem' }}
              >
                Remove
              </button>
            )}
          </div>
          {leadSheetImportError && (
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', color: 'var(--error)' }} role="alert">
              {leadSheetImportError}
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
                const n = Number(e.target.value);
                setTotalBars(n);
                if (presetId === 'song_mode' && songwriterStyle === 'frank_zappa') {
                  setZappaSongBars(nearestZappaSongBarCount(clampSongFormBarCount(n, 32)));
                }
                setFormId('');
                if (presetId === 'big_band') setBigBandFormId('');
              }}
              disabled={loading || (presetId === 'song_mode' && songwriterStyle === 'frank_zappa')}
              title={
                presetId === 'song_mode' && songwriterStyle === 'frank_zappa'
                  ? 'Use Frank Zappa — song length in the Songwriter section'
                  : undefined
              }
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
                      if (presetId === 'song_mode' && songwriterStyle === 'frank_zappa') {
                        setZappaSongBars(nearestZappaSongBarCount(clampSongFormBarCount(f.bars, 32)));
                      }
                      setSongFormMenuOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFormId(f.id);
                        setTotalBars(f.bars);
                        if (presetId === 'song_mode' && songwriterStyle === 'frank_zappa') {
                          setZappaSongBars(nearestZappaSongBarCount(clampSongFormBarCount(f.bars, 32)));
                        }
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

      {(presetId === 'song_mode' || presetId === 'big_band' || presetId === 'string_quartet') && (
        <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
          <label
            htmlFor="composer-os-chromatic-strength"
            style={{
              display: 'block',
              marginBottom: '0.35rem',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Chromatic Strength
          </label>
          <select
            id="composer-os-chromatic-strength"
            value={chromaticStrength}
            onChange={(e) =>
              setChromaticStrength(e.target.value as 'off' | 'subtle' | 'prominent')
            }
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
            <option value="off">Off</option>
            <option value="subtle">Subtle</option>
            <option value="prominent">Prominent</option>
          </select>
        </div>
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
          {presetId === 'song_mode' &&
            (songModeStyleProfile === 'STYLE_ECM' || songModeStyleProfile === 'STYLE_ECM_CHAMBER') && (
              <details
                open
                style={{
                  marginBottom: '0.65rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'rgba(15,23,42,0.06)',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', listStyle: 'none' }}>
                  Advanced ECM
                </summary>
                <div style={{ marginTop: '0.55rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: '0.55rem',
                    }}
                    role="group"
                    aria-label="ECM style surface preset"
                  >
                    {(
                      [
                        { mode: 'angel_song' as const, label: 'Angel Song' },
                        { mode: 'balanced' as const, label: 'Balanced ECM Duo' },
                        { mode: 'metheny_scofield' as const, label: 'Metheny·Scofield' },
                      ] as const
                    ).map(({ mode, label }) => {
                      const active = ecmChamberFlow01ToMode(ecmChamberFlow01) === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          disabled={loading}
                          aria-pressed={active}
                          onClick={() => setEcmChamberFlow01(ecmChamberModeToFlow01(mode))}
                          style={{
                            flex: '1 1 120px',
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.78rem',
                            borderRadius: 6,
                            border: `1px solid ${active ? 'var(--accent, #6366f1)' : 'var(--border)'}`,
                            background: active ? 'rgba(99,102,241,0.12)' : 'var(--panel-elevated, rgba(15,23,42,0.25))',
                            color: 'var(--text)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label
                    style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}
                  >
                    Chamber ↔ Flow
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 4,
                      maxWidth: 420,
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      Chamber
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={ecmChamberFlow01}
                      onChange={(e) => setEcmChamberFlow01(Number(e.target.value))}
                      disabled={loading}
                      aria-valuetext={`${ecmChamberFlow01ToMode(ecmChamberFlow01)} (${Math.round(ecmChamberFlow01 * 100)}%)`}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      Flow
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Active surface:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {ecmChamberModeUiLabel(ecmChamberFlow01ToMode(ecmChamberFlow01))}
                    </strong>{' '}
                    ({ecmChamberFlow01ToMode(ecmChamberFlow01)}). Centre = Balanced ECM Duo; left emphasises chamber
                    space; right lifts forward motion.
                  </p>
                </div>
              </details>
            )}
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
            Include vocal lead sheet (planned vocal melody — separate MusicXML for singers)
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
                Available when Song Mode style is Indie Art Pop, Sonic Youth, Joni Mitchell, Pat Metheny, or ECM Chamber
                (alt-tuning profiles). Leave off to keep standard Song Mode behaviour.
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
                      <AlternateTuningPresetSelect
                        value={sharedTuningPresetId}
                        onChange={setSharedTuningPresetId}
                        disabled={loading}
                        optionKeyPrefix="shared-tuning"
                      />
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
                        <AlternateTuningPresetSelect
                          value={guitar1TuningPresetId}
                          onChange={setGuitar1TuningPresetId}
                          disabled={loading}
                          optionKeyPrefix="g1-tuning"
                        />
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
                        <AlternateTuningPresetSelect
                          value={guitar2TuningPresetId}
                          onChange={setGuitar2TuningPresetId}
                          disabled={loading}
                          optionKeyPrefix="g2-tuning"
                        />
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
                setPrimarySongwriterHoverId(null);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              onMouseLeave={() => setPrimarySongwriterHoverId(null)}
              onBlur={() => setPrimarySongwriterHoverId(null)}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups onOptionHover={setPrimarySongwriterHoverId} />
            </select>
            <span id="co-sm-primary-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
            <WriterRecipeCard writerId={primarySongwriterHoverId ?? songwriterStyle} />
          </div>
          {composerOddMeterMapBlock}
          {presetId === 'song_mode' &&
            (songwriterStyle.trim().toLowerCase() === 'fela_kuti' ||
              songwriterStyle.trim().toLowerCase() === 'greek_rebetiko') && (
              <RhythmBlendControls
                afrobeatPresets={AFROBEAT_STARTER_PRESETS}
                rebetikoPresets={GREEK_REBETIKO_STARTER_PRESETS}
                exportSongFormToMusicXml={(form) =>
                  blendExportSongFormToMusicXml({
                    title: form.title,
                    sections: form.sections.map((s) => ({
                      bars: s.bars,
                      rhythm: { engine: s.rhythm.engine, presetId: s.rhythm.presetId },
                    })),
                  })
                }
                exportBlendedScoreToMusicXml={(plan) =>
                  blendExportBlendedScoreToMusicXml({
                    afrobeatPreset: { presetId: plan.afrobeatPreset.presetId },
                    rebetikoPreset: { presetId: plan.rebetikoPreset.presetId },
                    conflictStrategy: plan.conflictStrategy,
                  })
                }
              />
            )}
          {songwriterStyle === 'frank_zappa' && (
            <>
            <div
              style={{
                marginBottom: '0.65rem',
                padding: '0.5rem 0.65rem',
                border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
                borderRadius: 6,
                maxWidth: 520,
              }}
            >
              <span
                style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Frank Zappa — song length
              </span>
              <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Sets <strong style={{ color: 'var(--text)' }}>Number of bars</strong> for this generate (chords, engine,
                meter map). Default 32.
              </p>
              <label htmlFor="co-zappa-song-bars-range" style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Bars ({zappaSongBars})
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <input
                  id="co-zappa-song-bars-range"
                  type="range"
                  min={0}
                  max={ZAPPA_SONG_BAR_OPTIONS.length - 1}
                  step={1}
                  value={Math.max(
                    0,
                    ZAPPA_SONG_BAR_OPTIONS.indexOf(zappaSongBars) >= 0
                      ? ZAPPA_SONG_BAR_OPTIONS.indexOf(zappaSongBars)
                      : 2
                  )}
                  onChange={(e) => {
                    const i = Number(e.target.value);
                    const next = ZAPPA_SONG_BAR_OPTIONS[Math.max(0, Math.min(ZAPPA_SONG_BAR_OPTIONS.length - 1, i))];
                    if (next) setZappaSongBars(next);
                  }}
                  disabled={loading}
                  style={{ width: '100%', maxWidth: 280 }}
                  aria-valuetext={`${zappaSongBars} bars`}
                />
                <select
                  id="co-zappa-song-bars-select"
                  value={zappaSongBars}
                  onChange={(e) => setZappaSongBars(Number(e.target.value) as ZappaSongBarCount)}
                  disabled={loading}
                  aria-label="Song length in bars"
                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.85rem' }}
                >
                  {ZAPPA_SONG_BAR_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} bars
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                marginBottom: '0.65rem',
                padding: '0.5rem 0.65rem',
                border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
                borderRadius: 6,
                maxWidth: 520,
              }}
            >
              <span
                style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Frank Zappa — lead solo (Slonimsky layer)
              </span>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Separate MusicXML part. Default range matches guitar (MIDI 40–84).
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div>
                  <label
                    htmlFor="co-zappa-midi-low"
                    style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    Range low (MIDI)
                  </label>
                  <input
                    id="co-zappa-midi-low"
                    type="number"
                    min={0}
                    max={127}
                    value={zappaSoloMidiLow}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setZappaSoloMidiLow(Number.isFinite(n) ? Math.max(0, Math.min(127, n)) : 40);
                    }}
                    disabled={loading}
                    style={{ width: '100%', maxWidth: 120 }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="co-zappa-midi-high"
                    style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    Range high (MIDI)
                  </label>
                  <input
                    id="co-zappa-midi-high"
                    type="number"
                    min={0}
                    max={127}
                    value={zappaSoloMidiHigh}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setZappaSoloMidiHigh(Number.isFinite(n) ? Math.max(0, Math.min(127, n)) : 84);
                    }}
                    disabled={loading}
                    style={{ width: '100%', maxWidth: 120 }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label
                  htmlFor="co-zappa-density"
                  style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}
                >
                  Density
                </label>
                <select
                  id="co-zappa-density"
                  value={zappaSoloDensity}
                  onChange={(e) => setZappaSoloDensity(e.target.value as 'low' | 'medium' | 'high')}
                  disabled={loading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="co-zappa-dissonance"
                  style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}
                >
                  Dissonance level
                </label>
                <select
                  id="co-zappa-dissonance"
                  value={zappaSoloDissonance}
                  onChange={(e) =>
                    setZappaSoloDissonance(e.target.value as 'mild' | 'moderate' | 'extreme')
                  }
                  disabled={loading}
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>
            </div>
            {frankZappaMeterMapBlock}
            </>
          )}
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
                setSecondarySongwriterHoverId(null);
                if (songModeDiversityPresetId) setSongModeDiversityPresetId('');
              }}
              onMouseLeave={() => setSecondarySongwriterHoverId(null)}
              onBlur={() => setSecondarySongwriterHoverId(null)}
              disabled={loading}
            >
              <option value="">None</option>
              <SongwriterSelectOptionGroups onOptionHover={setSecondarySongwriterHoverId} />
            </select>
            <span id="co-sm-secondary-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC} Optional secondary blend with primary.
            </span>
            {(secondarySongwriterHoverId ?? secondarySongwriterStyle) ? (
              <WriterRecipeCard writerId={secondarySongwriterHoverId ?? secondarySongwriterStyle} />
            ) : null}
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
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Classical song influence (optional)
            </label>
            <select
              value={classicalOverlay}
              onChange={(e) => setClassicalOverlay(e.target.value)}
              disabled={loading}
            >
              <option value="">None</option>
              <option value="schubert">Schubert</option>
              <option value="schumann">Schumann</option>
              <option value="faure">Fauré</option>
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
              onChange={(e) => {
                setSongwriterStyle(e.target.value);
                setPrimarySongwriterHoverId(null);
              }}
              onMouseLeave={() => setPrimarySongwriterHoverId(null)}
              onBlur={() => setPrimarySongwriterHoverId(null)}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups onOptionHover={setPrimarySongwriterHoverId} />
            </select>
            <span id="co-bb-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
            <WriterRecipeCard writerId={primarySongwriterHoverId ?? songwriterStyle} />
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
          {songwriterStyle === 'frank_zappa' && frankZappaMeterMapBlock}
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
              onChange={(e) => {
                setSongwriterStyle(e.target.value);
                setPrimarySongwriterHoverId(null);
              }}
              onMouseLeave={() => setPrimarySongwriterHoverId(null)}
              onBlur={() => setPrimarySongwriterHoverId(null)}
              disabled={loading}
            >
              <SongwriterSelectOptionGroups onOptionHover={setPrimarySongwriterHoverId} />
            </select>
            <span id="co-sq-songwriter-desc" style={VISUALLY_HIDDEN}>
              {ARIA_SONGWRITER_GROUPS_DESC}
            </span>
            <WriterRecipeCard writerId={primarySongwriterHoverId ?? songwriterStyle} />
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
          {songwriterStyle === 'frank_zappa' && frankZappaMeterMapBlock}
        </div>
      )}

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 520 }}>
        <strong style={{ color: 'var(--text)' }}>New Variation</strong> picks a fresh id;{' '}
        <strong style={{ color: 'var(--text)' }}>Next Variation</strong> steps the id (then Generate).
      </p>

      <div style={{ marginBottom: '0.85rem' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.88rem',
            color: 'var(--text)',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={generateDrumGuide}
            onChange={(e) => setGenerateDrumGuide(e.target.checked)}
            disabled={loading}
            aria-label="Generate drum guide (SD3)"
          />
          Generate drum guide (SD3)
        </label>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 520 }}>
          Exports a kick/snare MIDI guide and JSON sidecar next to the score when enabled.
        </p>
      </div>

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

      <details
        style={{
          marginBottom: '1rem',
          maxWidth: 560,
          padding: '0.75rem 0.85rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            listStylePosition: 'outside',
          }}
        >
          Paste Chord Progression
        </summary>
        <div style={{ marginTop: '0.85rem' }}>
          <label
            htmlFor="co-chord-paste-text"
            style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
          >
            Chords — bars separated by <code style={{ fontSize: '0.8rem' }}>|</code>, chords in a bar separated by
            spaces (e.g. Cmaj7 Dm7 | G7 | Cmaj7)
          </label>
          <textarea
            id="co-chord-paste-text"
            value={chordPasteText}
            onChange={(e) => setChordPasteText(e.target.value)}
            rows={5}
            wrap="soft"
            spellCheck={false}
            disabled={chordPasteBusy}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              padding: '0.45rem 0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '0.65rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                htmlFor="co-chord-paste-key"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Key
              </label>
              <select
                id="co-chord-paste-key"
                value={chordPasteKey}
                onChange={(e) => setChordPasteKey(e.target.value)}
                disabled={chordPasteBusy}
              >
                {PASTE_CHORD_KEY_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-timesig"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Time signature
              </label>
              <select
                id="co-chord-paste-timesig"
                value={chordPasteTimeSigId}
                onChange={(e) => setChordPasteTimeSigId(e.target.value as '4-4' | '3-4' | '6-8')}
                disabled={chordPasteBusy}
              >
                <option value="4-4">4/4</option>
                <option value="3-4">3/4</option>
                <option value="6-8">6/8</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-tempo"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Tempo (BPM)
              </label>
              <input
                id="co-chord-paste-tempo"
                type="number"
                min={20}
                max={400}
                value={chordPasteTempo}
                onChange={(e) =>
                  setChordPasteTempo(Math.min(400, Math.max(20, Math.floor(Number(e.target.value) || 120))))
                }
                disabled={chordPasteBusy}
                style={{
                  width: '5rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div role="group" aria-label="Paste chord progression mode">
              <span
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Mode
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={chordPasteMode === 'solo' ? undefined : 'secondary'}
                  onClick={() => setChordPasteMode('solo')}
                  disabled={chordPasteBusy}
                  aria-pressed={chordPasteMode === 'solo'}
                >
                  Solo
                </button>
                <button
                  type="button"
                  className={chordPasteMode === 'melody' ? undefined : 'secondary'}
                  onClick={() => setChordPasteMode('melody')}
                  disabled={chordPasteBusy}
                  aria-pressed={chordPasteMode === 'melody'}
                >
                  Melody
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-tuning"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Tuning
              </label>
              <select
                id="co-chord-paste-tuning"
                value={chordPasteTuningId}
                onChange={(e) => setChordPasteTuningId(e.target.value)}
                disabled={chordPasteBusy}
              >
                <option value="standard">standard</option>
                <option value="dadgad">dadgad (DADGAD)</option>
                <option value="open_d">open_d (Open D)</option>
                <option value="open_g">open_g (Open G)</option>
                <option value="sy_cgdgcd">sy_cgdgcd (Sonic Youth)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-riff-style"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Riff style
              </label>
              <select
                id="co-chord-paste-riff-style"
                value={chordPasteRiffStyle}
                onChange={(e) =>
                  setChordPasteRiffStyle(
                    e.target.value as
                      | 'bebop-placement'
                      | 'quadratonic'
                      | 'dyad-seesaw'
                      | 'triad-pair-pendulum'
                      | 'pedal-string'
                  )
                }
                disabled={chordPasteBusy}
              >
                <option value="bebop-placement">bebop-placement</option>
                <option value="quadratonic">quadratonic</option>
                <option value="dyad-seesaw">dyad-seesaw</option>
                <option value="triad-pair-pendulum">triad-pair-pendulum</option>
                <option value="pedal-string">pedal-string</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-drift"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Emotional drift
              </label>
              <select
                id="co-chord-paste-drift"
                value={chordPasteDrift}
                onChange={(e) => setChordPasteDrift(e.target.value as EmotionalDrift)}
                disabled={chordPasteBusy}
              >
                {VAULT_EMOTIONAL_DRIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-paste-choruses"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Choruses
              </label>
              <input
                id="co-chord-paste-choruses"
                type="number"
                min={1}
                max={64}
                step={1}
                value={chordPasteChorusCount}
                onChange={(e) =>
                  setChordPasteChorusCount(
                    Math.min(64, Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  )
                }
                disabled={chordPasteBusy}
                style={{
                  width: '5rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>
          {chordPasteOutput && chordPastePreviewChart?.measures?.length ? (
            <ChorusArcStrip
              chorusCount={chordPasteChorusCount}
              barsPerChorus={chordPastePreviewChart.measures.length}
              output={chordPasteOutput}
              locked={boolArrayToLength(chordPasteChorusLocks, chordPasteChorusCount)}
              onToggleLock={(chorusIndex) => {
                setChordPasteChorusLocks((prev) => {
                  const next = boolArrayToLength(prev, chordPasteChorusCount);
                  next[chorusIndex] = !next[chorusIndex];
                  return next;
                });
              }}
            />
          ) : null}
          {chordPastePreviewChart &&
            (chordPastePreviewChart.measures?.some((m) => m.length > 0) ||
              !!chordPastePreviewChart.title?.trim()) && (
              <VaultImportChartSummary chart={chordPastePreviewChart} />
            )}
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 520 }}>
            {VAULT_GENERATION_OPTIONS_HINT}
          </p>
          <div style={{ marginTop: '0.65rem' }}>
            <button
              type="button"
              disabled={chordPasteBusy}
              onClick={() => {
                setChordPasteBusy(true);
                setChordPasteError(null);
                setChordPasteMusicXmlError(null);
                try {
                  const chart = parseChordProgressionText(
                    chordPasteText,
                    chordPasteKey,
                    chordPasteTimeSigFromUi(chordPasteTimeSigId),
                    chordPasteTempo
                  );
                  const anyChord = chart.measures.some((m) => m.length > 0);
                  if (!anyChord) {
                    setChordPasteOutput(null);
                    setChordPasteError('Add at least one chord symbol (use | between bars).');
                    return;
                  }
                  const runSeed = Date.now();
                  const opts: VaultGenerationOptions = {
                    mode: chordPasteMode,
                    tuningId: chordPasteTuningId,
                    riffStyle: chordPasteRiffStyle,
                    drift: chordPasteDrift,
                    chorusCount: chordPasteChorusCount,
                    seed: runSeed,
                    ...(presetId === 'song_mode'
                      ? {
                          duoIntent,
                          songwriterStyleId: songwriterStyle.trim().toLowerCase(),
                        }
                      : {}),
                  };
                  setChordPasteVaultLastRunOptions(opts);
                  const out = generateVaultFromParsedChart(chart, opts);
                  setChordPasteOutput(out);
                  setChordPasteVaultDual(null);
                } catch (e) {
                  setChordPasteOutput(null);
                  setChordPasteError(e instanceof Error ? e.message : String(e));
                } finally {
                  setChordPasteBusy(false);
                }
              }}
            >
              {chordPasteBusy ? 'Working…' : 'Generate from Chords'}
            </button>
          </div>
          {chordPasteError && (
            <div
              role="alert"
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 6,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.35)',
                fontSize: '0.85rem',
                color: 'var(--error, #ef4444)',
              }}
            >
              {chordPasteError}
            </div>
          )}
          {chordPasteOutput && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 0.35rem', color: 'var(--text)' }}>
                <strong>{chordPasteOutput.title.trim() ? chordPasteOutput.title : '(untitled)'}</strong>
              </p>
              <p style={{ margin: '0.25rem 0' }}>Key: {chordPasteOutput.key ?? '—'}</p>
              <p
                style={{
                  margin: '0.25rem 0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>
                  Time signature:{' '}
                  {(() => {
                    const ts =
                      chordPastePreviewChart?.timeSignature ?? chordPasteTimeSigFromUi(chordPasteTimeSigId);
                    return `${ts.num}/${ts.den}`;
                  })()}
                </span>
                {chordPastePreviewChart && parsedChartHasMixedMeter(chordPastePreviewChart) ? (
                  <MixedMeterBadge />
                ) : null}
              </p>
              <p style={{ margin: '0.25rem 0' }}>Tempo: {chordPasteTempo} BPM</p>
              {(() => {
                const barsPerChorus =
                  chordPastePreviewChart?.measures?.length ??
                  (chordPasteChorusCount > 0
                    ? Math.round(chordPasteOutput.bars / chordPasteChorusCount)
                    : chordPasteOutput.bars);
                const totalBars = barsPerChorus * chordPasteChorusCount;
                return (
                  <p style={{ margin: '0.25rem 0' }}>
                    Total bars: {totalBars} ({barsPerChorus} bars/chorus × {chordPasteChorusCount} choruses)
                  </p>
                );
              })()}
              <p style={{ margin: '0.25rem 0' }}>
                Mapped chords: {chordPasteOutput.chordMappings.length} · Unmapped:{' '}
                {chordPasteOutput.unmappedChords.length}
              </p>
              <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Vault seed:</strong> {chordPasteOutput.seed ?? '—'}
              </p>
              {chordPasteVaultDual ? (
                <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong>Compare pair saved:</strong> variants A & B (see below). Next Generate clears this row.
                </p>
              ) : null}
              <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    chordPasteBusy ||
                    !chordPastePreviewChart?.measures?.length ||
                    chordPasteVaultLastRunOptions?.seed == null
                  }
                  onClick={() => {
                    const chart = chordPastePreviewChart;
                    const output = chordPasteOutput;
                    const runOpts = chordPasteVaultLastRunOptions;
                    if (!chart?.measures?.length || !output || runOpts?.seed == null) return;
                    const driftBase = runOpts.drift ?? 'neutral';
                    const duoBase = runOpts.duoIntent ?? 'conversational';
                    setVaultRemixSession({
                      kind: 'paste',
                      chart,
                      runOptions: { ...runOpts },
                      outputA: output,
                      axis: 'drift',
                      driftB: nextEmotionalDrift(driftBase),
                      duoB: duoBase === 'conversational' ? 'supportive' : 'conversational',
                      outputB: null,
                      patchForB: null,
                    });
                  }}
                >
                  Remix same seed
                </button>
              </div>
              {chordPasteVaultDual ? (
                <div
                  style={{
                    marginTop: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  {(['a', 'b'] as const).map((side) => {
                    const o = chordPasteVaultDual[side];
                    const barsPerChorus =
                      chordPastePreviewChart?.measures?.length ??
                      Math.max(1, Math.round(o.bars / chordPasteChorusCount));
                    return (
                      <div
                        key={`paste-dual-${side}`}
                        style={{
                          padding: '0.55rem 0.65rem',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-elevated, rgba(0,0,0,0.03))',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Saved variant {side.toUpperCase()}</div>
                        <p style={{ margin: '0.15rem 0', fontSize: '0.78rem' }}>
                          Bars: {o.bars} · Mapped: {o.chordMappings.length}
                        </p>
                        <ChorusArcStrip
                          chorusCount={chordPasteChorusCount}
                          barsPerChorus={barsPerChorus}
                          output={o}
                          locked={boolArrayToLength(chordPasteChorusLocks, chordPasteChorusCount)}
                          onToggleLock={(chorusIndex) => {
                            setChordPasteChorusLocks((prev) => {
                              const next = boolArrayToLength(prev, chordPasteChorusCount);
                              next[chorusIndex] = !next[chorusIndex];
                              return next;
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {chordPasteOutput.unmappedChords.length > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.35)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.35rem',
                      fontWeight: 600,
                      color: '#ca8a04',
                      fontSize: '0.82rem',
                    }}
                  >
                    Unmapped chords
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {chordPasteOutput.unmappedChords.map((u, i) => (
                      <li key={`chord-paste-unmapped-${u.barIndex}-${i}-${u.symbol}`}>
                        Bar {u.barIndex + 1}: {u.symbol || '(empty)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '0.65rem' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={chordPasteBusy || chordPasteOutput.generatedNotes.length === 0}
                  onClick={() => {
                    setChordPasteMusicXmlError(null);
                    if (!chordPasteOutput.generatedNotes.length) {
                      setChordPasteMusicXmlError('No generated notes to export (all chords may be unmapped).');
                      return;
                    }
                    const titleRaw = chordPasteOutput.title.trim() || 'Pasted progression';
                    const xml = vaultRiffScoreNotesToMusicXml(
                      chordPasteOutput.generatedNotes,
                      chordPasteOutput.bars,
                      titleRaw
                    );
                    const base =
                      titleRaw
                        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                        .replace(/\s+/g, '_')
                        .replace(/^\.+|\.+$/g, '') || 'pasted_progression';
                    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${base}.xml`;
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download MusicXML
                </button>
              </div>
              {chordPasteMusicXmlError && (
                <div
                  role="alert"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    fontSize: '0.85rem',
                    color: 'var(--error, #ef4444)',
                  }}
                >
                  {chordPasteMusicXmlError}
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      <details
        style={{
          marginBottom: '1rem',
          maxWidth: 560,
          padding: '0.75rem 0.85rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            listStylePosition: 'outside',
          }}
        >
          iReal Pro Import (Beta)
        </summary>
        <div style={{ marginTop: '0.85rem' }}>
          <label
            htmlFor="co-ireal-paste"
            style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
          >
            Paste an <code style={{ fontSize: '0.8rem' }}>ireal://</code> URL or iReal Pro HTML export
          </label>
          <textarea
            id="co-ireal-paste"
            value={iRealPaste}
            onChange={(e) => setIRealPaste(e.target.value)}
            rows={5}
            wrap="soft"
            spellCheck={false}
            disabled={iRealVaultBusy}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              padding: '0.45rem 0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          {iRealParsedChart &&
            (iRealParsedChart.measures?.length > 0 || !!iRealParsedChart.title?.trim()) && (
              <VaultImportChartSummary chart={iRealParsedChart} />
            )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '0.65rem',
              alignItems: 'flex-end',
            }}
          >
            <div role="group" aria-label="iReal vault mode">
              <span
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Mode
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={iRealVaultMode === 'solo' ? undefined : 'secondary'}
                  onClick={() => setIRealVaultMode('solo')}
                  disabled={iRealVaultBusy}
                  aria-pressed={iRealVaultMode === 'solo'}
                >
                  Solo
                </button>
                <button
                  type="button"
                  className={iRealVaultMode === 'melody' ? undefined : 'secondary'}
                  onClick={() => setIRealVaultMode('melody')}
                  disabled={iRealVaultBusy}
                  aria-pressed={iRealVaultMode === 'melody'}
                >
                  Melody
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="co-ireal-riff-style"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Riff style
              </label>
              <select
                id="co-ireal-riff-style"
                value={iRealVaultRiffStyle}
                onChange={(e) =>
                  setIRealVaultRiffStyle(
                    e.target.value as
                      | 'bebop-placement'
                      | 'quadratonic'
                      | 'dyad-seesaw'
                      | 'triad-pair-pendulum'
                      | 'pedal-string'
                  )
                }
                disabled={iRealVaultBusy}
              >
                <option value="bebop-placement">bebop-placement</option>
                <option value="quadratonic">quadratonic</option>
                <option value="dyad-seesaw">dyad-seesaw</option>
                <option value="triad-pair-pendulum">triad-pair-pendulum</option>
                <option value="pedal-string">pedal-string</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-ireal-tuning"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Tuning
              </label>
              <select
                id="co-ireal-tuning"
                value={iRealVaultTuningId}
                onChange={(e) => setIRealVaultTuningId(e.target.value)}
                disabled={iRealVaultBusy}
              >
                <option value="standard">standard</option>
                <option value="dadgad">dadgad (DADGAD)</option>
                <option value="open_d">open_d (Open D)</option>
                <option value="open_g">open_g (Open G)</option>
                <option value="sy_cgdgcd">sy_cgdgcd (Sonic Youth)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-ireal-drift"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Emotional drift
              </label>
              <select
                id="co-ireal-drift"
                value={iRealVaultDrift}
                onChange={(e) => setIRealVaultDrift(e.target.value as EmotionalDrift)}
                disabled={iRealVaultBusy}
              >
                {VAULT_EMOTIONAL_DRIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="co-ireal-choruses"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Choruses
              </label>
              <input
                id="co-ireal-choruses"
                type="number"
                min={1}
                max={64}
                step={1}
                value={iRealVaultChorusCount}
                onChange={(e) =>
                  setIRealVaultChorusCount(
                    Math.min(64, Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  )
                }
                disabled={iRealVaultBusy}
                style={{
                  width: '5rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>
          {iRealVaultOutput && iRealParsedChart?.measures?.length ? (
            <ChorusArcStrip
              chorusCount={iRealVaultChorusCount}
              barsPerChorus={iRealParsedChart.measures.length}
              output={iRealVaultOutput}
              locked={boolArrayToLength(iRealVaultChorusLocks, iRealVaultChorusCount)}
              onToggleLock={(chorusIndex) => {
                setIRealVaultChorusLocks((prev) => {
                  const next = boolArrayToLength(prev, iRealVaultChorusCount);
                  next[chorusIndex] = !next[chorusIndex];
                  return next;
                });
              }}
            />
          ) : null}
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 520 }}>
            {VAULT_GENERATION_OPTIONS_HINT}
          </p>
          <div style={{ marginTop: '0.65rem' }}>
            <button
              type="button"
              disabled={iRealVaultBusy}
              onClick={() => {
                setIRealVaultBusy(true);
                try {
                  const runSeed = Date.now();
                  const opts: VaultGenerationOptions = {
                    mode: iRealVaultMode,
                    riffStyle: iRealVaultRiffStyle,
                    tuningId: iRealVaultTuningId,
                    drift: iRealVaultDrift,
                    chorusCount: iRealVaultChorusCount,
                    seed: runSeed,
                    ...(presetId === 'song_mode'
                      ? {
                          duoIntent,
                          songwriterStyleId: songwriterStyle.trim().toLowerCase(),
                        }
                      : {}),
                  };
                  setIRealVaultLastRunOptions(opts);
                  const out = generateFromIReal(iRealPaste, opts);
                  setIRealVaultOutput(out);
                  setIRealVaultDual(null);
                } finally {
                  setIRealVaultBusy(false);
                }
              }}
            >
              {iRealVaultBusy ? 'Working…' : 'Generate from iReal'}
            </button>
          </div>
          {iRealVaultOutput && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 0.35rem', color: 'var(--text)' }}>
                <strong>{iRealVaultOutput.title.trim() ? iRealVaultOutput.title : '(untitled)'}</strong>
              </p>
              <p style={{ margin: '0.25rem 0' }}>Key: {iRealVaultOutput.key ?? '—'}</p>
              {iRealParsedChart?.timeSignature ? (
                <p
                  style={{
                    margin: '0.25rem 0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>
                    Time signature: {iRealParsedChart.timeSignature.num}/{iRealParsedChart.timeSignature.den}
                  </span>
                  {parsedChartHasMixedMeter(iRealParsedChart) ? <MixedMeterBadge /> : null}
                </p>
              ) : null}
              {iRealParsedChart != null &&
              iRealParsedChart.tempo != null &&
              Number.isFinite(iRealParsedChart.tempo) &&
              iRealParsedChart.tempo > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>Tempo: {Math.round(iRealParsedChart.tempo)} BPM</p>
              ) : null}
              {(() => {
                const barsPerChorus =
                  iRealParsedChart?.measures?.length ??
                  (iRealVaultChorusCount > 0
                    ? Math.round(iRealVaultOutput.bars / iRealVaultChorusCount)
                    : iRealVaultOutput.bars);
                const totalBars = barsPerChorus * iRealVaultChorusCount;
                return (
                  <p style={{ margin: '0.25rem 0' }}>
                    Total bars: {totalBars} ({barsPerChorus} bars/chorus × {iRealVaultChorusCount} choruses)
                  </p>
                );
              })()}
              <p style={{ margin: '0.25rem 0' }}>
                Mapped chords: {iRealVaultOutput.chordMappings.length} · Unmapped:{' '}
                {iRealVaultOutput.unmappedChords.length}
              </p>
              <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Vault seed:</strong> {iRealVaultOutput.seed ?? '—'}
              </p>
              {iRealVaultDual ? (
                <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong>Compare pair saved:</strong> variants A & B (see below). Next Generate clears this row.
                </p>
              ) : null}
              <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    iRealVaultBusy || !iRealParsedChart?.measures?.length || iRealVaultLastRunOptions?.seed == null
                  }
                  onClick={() => {
                    const chart = iRealParsedChart;
                    const output = iRealVaultOutput;
                    const runOpts = iRealVaultLastRunOptions;
                    if (!chart?.measures?.length || !output || runOpts?.seed == null) return;
                    const driftBase = runOpts.drift ?? 'neutral';
                    const duoBase = runOpts.duoIntent ?? 'conversational';
                    setVaultRemixSession({
                      kind: 'ireal',
                      chart,
                      runOptions: { ...runOpts },
                      outputA: output,
                      axis: 'drift',
                      driftB: nextEmotionalDrift(driftBase),
                      duoB: duoBase === 'conversational' ? 'supportive' : 'conversational',
                      outputB: null,
                      patchForB: null,
                    });
                  }}
                >
                  Remix same seed
                </button>
              </div>
              {iRealVaultDual ? (
                <div
                  style={{
                    marginTop: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  {(['a', 'b'] as const).map((side) => {
                    const o = iRealVaultDual[side];
                    const barsPerChorus =
                      iRealParsedChart?.measures?.length ??
                      Math.max(1, Math.round(o.bars / iRealVaultChorusCount));
                    return (
                      <div
                        key={`ireal-dual-${side}`}
                        style={{
                          padding: '0.55rem 0.65rem',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-elevated, rgba(0,0,0,0.03))',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Saved variant {side.toUpperCase()}</div>
                        <p style={{ margin: '0.15rem 0', fontSize: '0.78rem' }}>
                          Bars: {o.bars} · Mapped: {o.chordMappings.length}
                        </p>
                        <ChorusArcStrip
                          chorusCount={iRealVaultChorusCount}
                          barsPerChorus={barsPerChorus}
                          output={o}
                          locked={boolArrayToLength(iRealVaultChorusLocks, iRealVaultChorusCount)}
                          onToggleLock={(chorusIndex) => {
                            setIRealVaultChorusLocks((prev) => {
                              const next = boolArrayToLength(prev, iRealVaultChorusCount);
                              next[chorusIndex] = !next[chorusIndex];
                              return next;
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {iRealVaultOutput.unmappedChords.length > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.35)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.35rem',
                      fontWeight: 600,
                      color: '#ca8a04',
                      fontSize: '0.82rem',
                    }}
                  >
                    Unmapped chords
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {iRealVaultOutput.unmappedChords.map((u, i) => (
                      <li key={`ireal-unmapped-${u.barIndex}-${i}-${u.symbol}`}>
                        Bar {u.barIndex + 1}: {u.symbol || '(empty)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      <details
        style={{
          marginBottom: '1rem',
          maxWidth: 560,
          padding: '0.75rem 0.85rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            listStylePosition: 'outside',
          }}
        >
          Chord Inspector
        </summary>
        <div style={{ marginTop: '0.85rem' }}>
          <label
            htmlFor="co-chord-inspector-input"
            style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
          >
            Chord symbol
          </label>
          <input
            id="co-chord-inspector-input"
            type="text"
            value={chordInspectorInput}
            onChange={(e) => setChordInspectorInput(e.target.value)}
            placeholder="e.g. Cmaj7, F#min9, Bb7#11"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              padding: '0.45rem 0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '0.65rem',
              alignItems: 'flex-end',
            }}
          >
            <div role="group" aria-label="Chord inspector mode">
              <span
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Mode
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={chordInspectorMode === 'solo' ? undefined : 'secondary'}
                  onClick={() => setChordInspectorMode('solo')}
                  aria-pressed={chordInspectorMode === 'solo'}
                >
                  Solo
                </button>
                <button
                  type="button"
                  className={chordInspectorMode === 'melody' ? undefined : 'secondary'}
                  onClick={() => setChordInspectorMode('melody')}
                  aria-pressed={chordInspectorMode === 'melody'}
                >
                  Melody
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="co-chord-inspector-bars"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Bars
              </label>
              <select
                id="co-chord-inspector-bars"
                value={chordInspectorBars}
                onChange={(e) => setChordInspectorBars(Number(e.target.value) as 1 | 2 | 4)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-inspector-riff-style"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Riff style
              </label>
              <select
                id="co-chord-inspector-riff-style"
                value={chordInspectorRiffStyle}
                onChange={(e) =>
                  setChordInspectorRiffStyle(
                    e.target.value as
                      | 'bebop-placement'
                      | 'quadratonic'
                      | 'dyad-seesaw'
                      | 'triad-pair-pendulum'
                      | 'pedal-string'
                  )
                }
              >
                <option value="bebop-placement">bebop-placement</option>
                <option value="quadratonic">quadratonic</option>
                <option value="dyad-seesaw">dyad-seesaw</option>
                <option value="triad-pair-pendulum">triad-pair-pendulum</option>
                <option value="pedal-string">pedal-string</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-chord-inspector-tuning"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Tuning
              </label>
              <select
                id="co-chord-inspector-tuning"
                value={chordInspectorTuningId}
                onChange={(e) => setChordInspectorTuningId(e.target.value)}
              >
                <option value="standard">standard</option>
                <option value="dadgad">dadgad (DADGAD)</option>
                <option value="open_d">open_d (Open D)</option>
                <option value="open_g">open_g (Open G)</option>
                <option value="sy_cgdgcd">sy_cgdgcd (Sonic Youth)</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setChordInspectorExportError(null);
                const r = inspectChordSymbol(chordInspectorInput, chordInspectorTuningId);
                if (!r) {
                  setChordInspectorResult(null);
                  setChordInspectorReharmPanelOpen(false);
                  setChordInspectorParseError(
                    'Could not parse chord or map it to the Tonality Vault. Check the symbol (e.g. Cmaj7, F#m9, Bb7#11).'
                  );
                  return;
                }
                setChordInspectorParseError(null);
                setChordInspectorResult(r);
                setChordInspectorReharmPanelOpen(false);
              }}
            >
              Inspect Chord
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setChordInspectorExportError(null);
                const xml = inspectChordToMusicXml(chordInspectorInput, {
                  bars: chordInspectorBars,
                  mode: chordInspectorMode,
                  tuningId: chordInspectorTuningId,
                  riffStyle: chordInspectorRiffStyle,
                });
                if (!xml) {
                  setChordInspectorExportError(
                    'Could not generate MusicXML (unmapped chord, empty riff, or parse error).'
                  );
                  return;
                }
                const base =
                  chordInspectorInput
                    .trim()
                    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                    .replace(/\s+/g, '_')
                    .replace(/^\.+|\.+$/g, '') || 'chord';
                const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${base}.xml`;
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Generate + Export MusicXML
            </button>
          </div>
          {chordInspectorParseError && (
            <div
              role="alert"
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 6,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.35)',
                fontSize: '0.85rem',
                color: 'var(--error, #ef4444)',
              }}
            >
              {chordInspectorParseError}
            </div>
          )}
          {chordInspectorExportError && (
            <div
              role="alert"
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 6,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.35)',
                fontSize: '0.85rem',
                color: 'var(--error, #ef4444)',
              }}
            >
              {chordInspectorExportError}
            </div>
          )}
          {chordInspectorResult && !chordInspectorParseError && (
            <div
              style={{
                marginTop: '0.85rem',
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
              }}
            >
              <p style={{ margin: '0 0 0.35rem', color: 'var(--text)' }}>
                <strong>Vault chord type id:</strong> {chordInspectorResult.vaultChordTypeId}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Melodic triad (pitch classes):</strong>{' '}
                {chordInspectorResult.melodicTriad.join(', ')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Primary tension note (PC):</strong> {chordInspectorResult.primaryTensionNote}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Quadratonic pitch classes:</strong>{' '}
                {chordInspectorResult.quadratonicPitchClasses.join(', ')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Guitar grips found:</strong> {chordInspectorResult.guitarGrips.length}
              </p>
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated, rgba(0,0,0,0.04))',
                }}
                role="region"
                aria-label="Reharmonisation"
              >
                <p
                  style={{
                    margin: '0 0 0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Reharm (Tonality Vault)
                </p>
                <button
                  type="button"
                  style={{ marginBottom: '0.65rem' }}
                  onClick={() => {
                    setChordInspectorReharmPanelOpen(true);
                  }}
                >
                  Reharmonise
                </button>
                {chordInspectorReharmPanelOpen ? (
                  <>
                    <div style={{ marginBottom: '0.65rem' }}>
                      <label
                        htmlFor="co-chord-inspector-reharm-drift-slider"
                        style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}
                      >
                        Drift proximity (targets {emotionalDriftOptionLabel(sliderToTargetReharmDrift(chordInspectorReharmDriftSlider))})
                      </label>
                      <input
                        id="co-chord-inspector-reharm-drift-slider"
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={chordInspectorReharmDriftSlider}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const v = Math.min(1, Math.max(0, Math.round(raw * 10) / 10));
                          setChordInspectorReharmDriftSlider(v);
                        }}
                        style={{ width: '100%', maxWidth: 360 }}
                      />
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {chordInspectorReharmDriftSlider.toFixed(1)} · reorder by affinity to selected drift
                      </p>
                    </div>
                    {chordInspectorReharmTopEight.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.82rem' }}>No candidates (empty vault row or parse edge case).</p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem' }}>
                        {chordInspectorReharmTopEight.map((c, i) => {
                          const sym = formatChordInspectorSubstituteSymbol(c.substituteRootPc, c.substituteChordTypeId);
                          const dom = dominantEmotionalDriftForChordType(c.substituteChordTypeId);
                          return (
                            <li
                              key={`reharm-${c.substituteChordTypeId}-${c.strategy}-${i}`}
                              style={{ marginBottom: '0.55rem' }}
                            >
                              <span style={{ color: 'var(--text)' }}>
                                <strong>{sym}</strong>
                              </span>
                              <span style={{ marginLeft: '0.45rem', color: 'var(--text-muted)' }}>
                                drift: {emotionalDriftOptionLabel(dom)}
                              </span>
                              <div style={{ marginTop: '0.35rem' }}>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => setChordInspectorInput(sym)}
                                >
                                  Use this chord
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </details>

      <details
        style={{
          marginBottom: '1rem',
          maxWidth: 560,
          padding: '0.75rem 0.85rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            listStylePosition: 'outside',
          }}
        >
          PDF Lead Sheet Import (Beta)
        </summary>
        <div style={{ marginTop: '0.85rem' }}>
          <input
            ref={pdfFileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="PDF lead sheet file"
            disabled={pdfVaultBusy}
            style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem' }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPdfLeadSheetFile(f);
              setPdfVaultOutput(null);
              setPdfVaultParsedChart(null);
              setPdfVaultError(null);
              setPdfMusicXmlExportError(null);
            }}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '0.65rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                htmlFor="co-pdf-page"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Page
              </label>
              <input
                id="co-pdf-page"
                type="number"
                min={1}
                value={pdfPageNumber}
                onChange={(e) => setPdfPageNumber(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                disabled={pdfVaultBusy}
                style={{
                  width: '4.5rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div role="group" aria-label="PDF vault mode">
              <span
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Mode
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={pdfVaultMode === 'solo' ? undefined : 'secondary'}
                  onClick={() => setPdfVaultMode('solo')}
                  disabled={pdfVaultBusy}
                  aria-pressed={pdfVaultMode === 'solo'}
                >
                  Solo
                </button>
                <button
                  type="button"
                  className={pdfVaultMode === 'melody' ? undefined : 'secondary'}
                  onClick={() => setPdfVaultMode('melody')}
                  disabled={pdfVaultBusy}
                  aria-pressed={pdfVaultMode === 'melody'}
                >
                  Melody
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="co-pdf-tuning"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Tuning
              </label>
              <select
                id="co-pdf-tuning"
                value={pdfVaultTuningId}
                onChange={(e) => setPdfVaultTuningId(e.target.value)}
                disabled={pdfVaultBusy}
              >
                <option value="standard">standard</option>
                <option value="dadgad">dadgad (DADGAD)</option>
                <option value="open_d">open_d (Open D)</option>
                <option value="open_g">open_g (Open G)</option>
                <option value="sy_cgdgcd">sy_cgdgcd (Sonic Youth)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-pdf-riff-style"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Riff style
              </label>
              <select
                id="co-pdf-riff-style"
                value={pdfVaultRiffStyle}
                onChange={(e) =>
                  setPdfVaultRiffStyle(
                    e.target.value as
                      | 'bebop-placement'
                      | 'quadratonic'
                      | 'dyad-seesaw'
                      | 'triad-pair-pendulum'
                      | 'pedal-string'
                  )
                }
                disabled={pdfVaultBusy}
              >
                <option value="bebop-placement">bebop-placement</option>
                <option value="quadratonic">quadratonic</option>
                <option value="dyad-seesaw">dyad-seesaw</option>
                <option value="triad-pair-pendulum">triad-pair-pendulum</option>
                <option value="pedal-string">pedal-string</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="co-pdf-drift"
                style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Emotional drift
              </label>
              <select
                id="co-pdf-drift"
                value={pdfVaultDrift}
                onChange={(e) => setPdfVaultDrift(e.target.value as EmotionalDrift)}
                disabled={pdfVaultBusy}
              >
                {VAULT_EMOTIONAL_DRIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 520 }}>
            {VAULT_GENERATION_OPTIONS_HINT}
          </p>
          <div style={{ marginTop: '0.65rem' }}>
            <button
              type="button"
              disabled={pdfVaultBusy}
              onClick={() => {
                void (async () => {
                  setPdfVaultError(null);
                  setPdfMusicXmlExportError(null);
                  if (!pdfLeadSheetFile) {
                    setPdfVaultError('Choose a PDF file first.');
                    return;
                  }
                  setPdfVaultBusy(true);
                  setPdfVaultOutput(null);
                  setPdfVaultParsedChart(null);
                  try {
                    const ab = await pdfLeadSheetFile.arrayBuffer();
                    const u8 = new Uint8Array(ab);
                    const pdfBase64 = uint8ArrayToBase64(u8);
                    const runSeed = Date.now();
                    const pdfOpts: VaultGenerationOptions = {
                      mode: pdfVaultMode,
                      tuningId: pdfVaultTuningId,
                      riffStyle: pdfVaultRiffStyle,
                      drift: pdfVaultDrift,
                      chorusCount: 1,
                      seed: runSeed,
                      ...(presetId === 'song_mode'
                        ? {
                            duoIntent,
                            songwriterStyleId: songwriterStyle.trim().toLowerCase(),
                          }
                        : {}),
                    };
                    const res = await api.generateFromPdf({
                      pdfBase64,
                      pageNumber: pdfPageNumber,
                      mode: pdfVaultMode,
                      tuningId: pdfVaultTuningId,
                      riffStyle: pdfVaultRiffStyle,
                      drift: pdfVaultDrift,
                      seed: runSeed,
                      ...(presetId === 'song_mode'
                        ? {
                            duoIntent,
                            songwriterStyleId: songwriterStyle.trim().toLowerCase(),
                          }
                        : {}),
                    });
                    if (!res.output) {
                      setPdfVaultError(
                        res.error ??
                          'PDF extraction failed or returned no chart. Check ANTHROPIC_API_KEY on the API server, page number, and lead sheet legibility.'
                      );
                      return;
                    }
                    setPdfVaultLastRunOptions(pdfOpts);
                    setPdfVaultParsedChart(res.parsedChart ?? null);
                    setPdfVaultOutput(res.output);
                    setPdfVaultDual(null);
                  } catch (e) {
                    setPdfVaultError(
                      e instanceof Error ? e.message : 'PDF import failed. Is the Composer OS API running?'
                    );
                  } finally {
                    setPdfVaultBusy(false);
                  }
                })();
              }}
            >
              {pdfVaultBusy ? 'Working…' : 'Extract & Generate'}
            </button>
          </div>
          {pdfVaultError && (
            <div
              role="alert"
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 6,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.35)',
                fontSize: '0.85rem',
                color: 'var(--error, #ef4444)',
              }}
            >
              {pdfVaultError}
            </div>
          )}
          {pdfVaultOutput && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 0.35rem', color: 'var(--text)' }}>
                <strong>{pdfVaultOutput.title.trim() ? pdfVaultOutput.title : '(untitled)'}</strong>
              </p>
              <p style={{ margin: '0.25rem 0' }}>Key: {pdfVaultOutput.key ?? '—'}</p>
              <p style={{ margin: '0.25rem 0' }}>Total bars: {pdfVaultOutput.bars}</p>
              <p style={{ margin: '0.25rem 0' }}>
                Mapped chords: {pdfVaultOutput.chordMappings.length} · Unmapped:{' '}
                {pdfVaultOutput.unmappedChords.length}
              </p>
              <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Vault seed:</strong> {pdfVaultOutput.seed ?? '—'}
              </p>
              {pdfVaultParsedChart?.measures?.length ? (
                <ChorusArcStrip
                  chorusCount={1}
                  barsPerChorus={pdfVaultParsedChart.measures.length}
                  output={pdfVaultOutput}
                  locked={[false]}
                  onToggleLock={() => {}}
                />
              ) : null}
              {pdfVaultDual ? (
                <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong>Compare pair saved:</strong> variants A & B (see below). Next Extract clears this row.
                </p>
              ) : null}
              <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    pdfVaultBusy ||
                    !pdfVaultParsedChart?.measures?.length ||
                    pdfVaultLastRunOptions?.seed == null
                  }
                  onClick={() => {
                    const chart = pdfVaultParsedChart;
                    const output = pdfVaultOutput;
                    const runOpts = pdfVaultLastRunOptions;
                    if (!chart?.measures?.length || !output || runOpts?.seed == null) return;
                    const driftBase = runOpts.drift ?? 'neutral';
                    const duoBase = runOpts.duoIntent ?? 'conversational';
                    setVaultRemixSession({
                      kind: 'pdf',
                      chart,
                      runOptions: { ...runOpts },
                      outputA: output,
                      axis: 'drift',
                      driftB: nextEmotionalDrift(driftBase),
                      duoB: duoBase === 'conversational' ? 'supportive' : 'conversational',
                      outputB: null,
                      patchForB: null,
                    });
                  }}
                >
                  Remix same seed
                </button>
              </div>
              {pdfVaultDual && pdfVaultParsedChart?.measures?.length ? (
                <div
                  style={{
                    marginTop: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  {(['a', 'b'] as const).map((side) => {
                    const o = pdfVaultDual[side];
                    const bpc = pdfVaultParsedChart.measures!.length;
                    return (
                      <div
                        key={`pdf-dual-${side}`}
                        style={{
                          padding: '0.55rem 0.65rem',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-elevated, rgba(0,0,0,0.03))',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Saved variant {side.toUpperCase()}</div>
                        <p style={{ margin: '0.15rem 0', fontSize: '0.78rem' }}>
                          Bars: {o.bars} · Mapped: {o.chordMappings.length}
                        </p>
                        <ChorusArcStrip
                          chorusCount={1}
                          barsPerChorus={bpc}
                          output={o}
                          locked={[false]}
                          onToggleLock={() => {}}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {pdfVaultOutput.unmappedChords.length > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.35)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.35rem',
                      fontWeight: 600,
                      color: '#ca8a04',
                      fontSize: '0.82rem',
                    }}
                  >
                    Unmapped chords
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {pdfVaultOutput.unmappedChords.map((u, i) => (
                      <li key={`pdf-unmapped-${u.barIndex}-${i}-${u.symbol}`}>
                        Bar {u.barIndex + 1}: {u.symbol || '(empty)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '0.65rem' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={pdfVaultBusy || pdfVaultOutput.generatedNotes.length === 0}
                  onClick={() => {
                    setPdfMusicXmlExportError(null);
                    if (!pdfVaultOutput.generatedNotes.length) {
                      setPdfMusicXmlExportError('No generated notes to export (all chords may be unmapped).');
                      return;
                    }
                    const titleRaw = pdfVaultOutput.title.trim() || 'PDF lead sheet';
                    const xml = vaultRiffScoreNotesToMusicXml(
                      pdfVaultOutput.generatedNotes,
                      pdfVaultOutput.bars,
                      titleRaw
                    );
                    const base =
                      titleRaw
                        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                        .replace(/\s+/g, '_')
                        .replace(/^\.+|\.+$/g, '') || 'pdf_lead_sheet';
                    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${base}.xml`;
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download MusicXML
                </button>
              </div>
              {pdfMusicXmlExportError && (
                <div
                  role="alert"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    fontSize: '0.85rem',
                    color: 'var(--error, #ef4444)',
                  }}
                >
                  {pdfMusicXmlExportError}
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      {vaultRemixSession ? (
        <div
          role="dialog"
          aria-label="Vault remix — same seed compare"
          style={{
            marginTop: '1rem',
            marginBottom: '1rem',
            padding: '1rem 1.1rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            maxWidth: 960,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <strong style={{ fontSize: '1rem' }}>Remix (same seed)</strong>
            <button type="button" className="secondary" onClick={() => setVaultRemixSession(null)}>
              Close
            </button>
          </div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Other vault controls match your last Generate for this source (locked). Adjust one axis, then generate variant
            B.
          </p>
          {(() => {
            const s = vaultRemixSession;
            const ro = s.runOptions;
            const chorusCount = ro.chorusCount ?? 1;
            const barsPerChorus = s.chart.measures?.length ?? 1;
            const pill =
              s.axis === 'drift'
                ? `Drift: ${driftLabel(ro.drift ?? 'neutral')} → ${driftLabel(s.driftB)}`
                : `Duo intent: ${ro.duoIntent ?? 'conversational'} → ${s.duoB}`;
            const locksForStrip =
              s.kind === 'ireal'
                ? boolArrayToLength(iRealVaultChorusLocks, chorusCount)
                : s.kind === 'paste'
                  ? boolArrayToLength(chordPasteChorusLocks, chorusCount)
                  : [false];
            const onToggleLock =
              s.kind === 'ireal'
                ? (chorusIndex: number) => {
                    setIRealVaultChorusLocks((prev) => {
                      const next = boolArrayToLength(prev, chorusCount);
                      next[chorusIndex] = !next[chorusIndex];
                      return next;
                    });
                  }
                : s.kind === 'paste'
                  ? (chorusIndex: number) => {
                      setChordPasteChorusLocks((prev) => {
                        const next = boolArrayToLength(prev, chorusCount);
                        next[chorusIndex] = !next[chorusIndex];
                        return next;
                      });
                    }
                  : () => {};
            return (
              <>
                <div
                  style={{
                    marginBottom: '0.65rem',
                    padding: '0.45rem 0.55rem',
                    borderRadius: 6,
                    background: 'var(--bg-elevated, rgba(0,0,0,0.04))',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Locked: mode <strong>{ro.mode ?? 'solo'}</strong> · tuning <strong>{ro.tuningId ?? 'standard'}</strong>{' '}
                  · riff <strong>{ro.riffStyle ?? 'bebop-placement'}</strong> · choruses <strong>{chorusCount}</strong>
                  {s.axis === 'duoIntent' ? (
                    <>
                      {' '}
                      · drift <strong>{driftLabel(ro.drift ?? 'neutral')}</strong>
                    </>
                  ) : presetId === 'song_mode' ? (
                    <>
                      {' '}
                      · duo <strong>{ro.duoIntent ?? 'conversational'}</strong>
                    </>
                  ) : null}
                </div>
                <div style={{ marginBottom: '0.65rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 999,
                      fontSize: '0.78rem',
                      border: '1px solid var(--border)',
                      background: 'rgba(99,102,241,0.12)',
                      color: 'var(--text)',
                    }}
                  >
                    {pill}
                  </span>
                </div>
                <div role="radiogroup" aria-label="Remix axis" style={{ marginBottom: '0.55rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12 }}>
                    <input
                      type="radio"
                      name="co-vault-remix-axis"
                      checked={s.axis === 'drift'}
                      onChange={() =>
                        setVaultRemixSession((prev) =>
                          prev ? { ...prev, axis: 'drift', outputB: null, patchForB: null } : prev
                        )
                      }
                    />
                    Emotional drift (slider)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="radio"
                      name="co-vault-remix-axis"
                      checked={s.axis === 'duoIntent'}
                      onChange={() =>
                        setVaultRemixSession((prev) =>
                          prev ? { ...prev, axis: 'duoIntent', outputB: null, patchForB: null } : prev
                        )
                      }
                      disabled={presetId !== 'song_mode'}
                    />
                    Duo intent
                  </label>
                </div>
                {s.axis === 'drift' ? (
                  <div style={{ marginBottom: '0.65rem', maxWidth: 420 }}>
                    <label
                      htmlFor="co-vault-remix-drift-slider"
                      style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}
                    >
                      Drift for variant B: <strong>{driftLabel(s.driftB)}</strong>
                    </label>
                    <input
                      id="co-vault-remix-drift-slider"
                      type="range"
                      min={0}
                      max={VAULT_EMOTIONAL_DRIFT_OPTIONS.length - 1}
                      step={1}
                      value={driftToSliderIndex(s.driftB)}
                      onChange={(e) => {
                        const nextDrift = sliderIndexToDrift(Number(e.target.value));
                        setVaultRemixSession((prev) =>
                          prev ? { ...prev, driftB: nextDrift, outputB: null, patchForB: null } : prev
                        );
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <div role="radiogroup" aria-label="Duo intent for variant B" style={{ marginBottom: '0.65rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <input
                        type="radio"
                        name="co-vault-remix-duo-b"
                        checked={s.duoB === 'conversational'}
                        onChange={() =>
                          setVaultRemixSession((prev) =>
                            prev ? { ...prev, duoB: 'conversational', outputB: null, patchForB: null } : prev
                          )
                        }
                      />
                      Conversational
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name="co-vault-remix-duo-b"
                        checked={s.duoB === 'supportive'}
                        onChange={() =>
                          setVaultRemixSession((prev) =>
                            prev ? { ...prev, duoB: 'supportive', outputB: null, patchForB: null } : prev
                          )
                        }
                      />
                      Supportive
                    </label>
                  </div>
                )}
                <div style={{ marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setVaultRemixSession((prev) => {
                        if (!prev || prev.runOptions.seed == null) return prev;
                        const patch: Partial<VaultGenerationOptions> =
                          prev.axis === 'drift'
                            ? { drift: prev.driftB }
                            : presetId === 'song_mode'
                              ? { duoIntent: prev.duoB }
                              : { drift: prev.driftB };
                        const next = remixSeed(
                          prev.chart,
                          { seed: prev.runOptions.seed, options: prev.runOptions },
                          patch
                        );
                        return { ...prev, outputB: next, patchForB: patch };
                      });
                    }}
                  >
                    Generate variant B
                  </button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '0.75rem',
                    alignItems: 'start',
                  }}
                >
                  {(['A', 'B'] as const).map((label, idx) => {
                    const out = idx === 0 ? s.outputA : s.outputB;
                    return (
                      <div
                        key={`remix-card-${label}`}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>Variant {label}</span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.4rem',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Seed held constant
                          </span>
                        </div>
                        {!out ? (
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {label === 'B' ? 'Generate variant B to fill this card.' : ''}
                          </p>
                        ) : (
                          <>
                            <p style={{ margin: '0.15rem 0', fontSize: '0.78rem' }}>
                              Bars: {out.bars} · Mapped: {out.chordMappings.length}
                            </p>
                            <ChorusArcStrip
                              chorusCount={chorusCount}
                              barsPerChorus={barsPerChorus}
                              output={out}
                              locked={locksForStrip}
                              onToggleLock={onToggleLock}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button type="button" className="secondary" onClick={() => setVaultRemixSession(null)}>
                    Keep A (discard B)
                  </button>
                  <button
                    type="button"
                    disabled={!vaultRemixSession.outputB}
                    onClick={() => {
                      const sess = vaultRemixSession;
                      if (!sess.outputB || !sess.patchForB) return;
                      const merged: VaultGenerationOptions = { ...sess.runOptions, ...sess.patchForB };
                      if (sess.kind === 'paste') {
                        setChordPasteOutput(sess.outputB);
                        setChordPasteVaultLastRunOptions(merged);
                        if (sess.patchForB.drift !== undefined) setChordPasteDrift(sess.patchForB.drift);
                        if (sess.patchForB.duoIntent !== undefined) setDuoIntent(sess.patchForB.duoIntent);
                      } else if (sess.kind === 'ireal') {
                        setIRealVaultOutput(sess.outputB);
                        setIRealVaultLastRunOptions(merged);
                        if (sess.patchForB.drift !== undefined) setIRealVaultDrift(sess.patchForB.drift);
                        if (sess.patchForB.duoIntent !== undefined) setDuoIntent(sess.patchForB.duoIntent);
                      } else {
                        setPdfVaultOutput(sess.outputB);
                        setPdfVaultLastRunOptions(merged);
                        if (sess.patchForB.drift !== undefined) setPdfVaultDrift(sess.patchForB.drift);
                        if (sess.patchForB.duoIntent !== undefined) setDuoIntent(sess.patchForB.duoIntent);
                      }
                      setVaultRemixSession(null);
                    }}
                  >
                    Keep B
                  </button>
                  <button
                    type="button"
                    disabled={!vaultRemixSession.outputB}
                    onClick={() => {
                      const sess = vaultRemixSession;
                      if (!sess.outputB) return;
                      if (sess.kind === 'paste') setChordPasteVaultDual({ a: sess.outputA, b: sess.outputB });
                      else if (sess.kind === 'ireal') setIRealVaultDual({ a: sess.outputA, b: sess.outputB });
                      else setPdfVaultDual({ a: sess.outputA, b: sess.outputB });
                      setVaultRemixSession(null);
                    }}
                  >
                    Keep both
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {showBigReceipt && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: `3px solid ${
              receiptHardFail ? 'var(--error)' : receiptExportOk ? 'var(--success)' : 'var(--border)'
            }`,
            background: receiptHardFail
              ? 'rgba(239,68,68,0.08)'
              : receiptExportOk
                ? 'rgba(34,197,94,0.08)'
                : 'var(--bg-panel)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Generation receipt</h3>
          {notShareableGenerated && (
            <p
              style={{
                marginTop: '0.35rem',
                marginBottom: 0,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#ca8a04',
              }}
            >
              Generated (not shareable)
            </p>
          )}

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
              {summaryPresetId === 'song_mode' && duoHealthReadout && result?.success && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <p style={{ margin: '0 0 0.45rem', fontWeight: 600, fontSize: '0.92rem' }}>Duo Health</p>
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                    }}
                  >
                    Heuristic only — {duoHealthReadout.sourceLabel}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                    {(() => {
                      const indS = duoHealthBadgeStyle(duoHealthReadout.independence);
                      const spS = duoHealthBadgeStyle(duoHealthReadout.spacing);
                      const indLabel =
                        duoHealthReadout.independence === 'green'
                          ? 'good'
                          : duoHealthReadout.independence === 'amber'
                            ? 'some fusion'
                            : 'crossing / doubling risk';
                      const spLabel =
                        duoHealthReadout.spacing === 'green'
                          ? 'open'
                          : duoHealthReadout.spacing === 'amber'
                            ? 'slightly crowded or sparse'
                            : 'too close or too wide';
                      return (
                        <>
                          <span
                            title="Fusion vs clear separation between duo voices"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6,
                              border: `1px solid ${indS.border}`,
                              background: indS.bg,
                              color: indS.color,
                            }}
                          >
                            Independence · {indLabel}
                          </span>
                          <span
                            title="Register / vertical space between duo voices"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6,
                              border: `1px solid ${spS.border}`,
                              background: spS.bg,
                              color: spS.color,
                            }}
                          >
                            Spacing · {spLabel}
                          </span>
                        </>
                      );
                    })()}
                  </div>
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
                <strong>{receiptExportOk ? 'Passed' : 'Failed'}</strong>
                {receiptExportOk ? ' — your files are ready below.' : ' — see validation details.'}
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
