import { importLeadSheetFromMusicXml } from '../lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import {
  extractScoreMusicXmlFromString,
  extractScoreMusicXmlFromUint8Array,
} from '../lead-sheet/musicXmlScoreInput';
import { applyLeadSheetPerformanceRendering } from '../lead-sheet/leadSheetPerformanceRendering';
import type { ImportedHarmonyEvent } from '../lead-sheet/importedHarmonyTimeline';
import {
  enrichHarmonyWithTonalityVault,
  isTonalityVaultLeadSheetHarmonyEnrichmentEnabled,
  type TonalityVaultEnrichmentRunResult,
} from '../tonalityVault/tonalityVaultLeadSheetHarmonyEnrichment';

/** User-facing harmony interpretation for MusicXML lead-sheet adapt (Tonality Vault is env-gated). */
export type HarmonyDisplayMode = 'raw' | 'enriched' | 'compare';

export function normalizeLeadSheetHarmonyDisplayMode(raw: unknown): HarmonyDisplayMode {
  if (raw === 'enriched' || raw === 'compare' || raw === 'raw') return raw;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (t === 'enriched' || t === 'compare' || t === 'raw') return t;
  }
  return 'raw';
}

/**
 * Mode the adapter will use after the Tonality Vault **env** gate (`COMPOSER_OS_TONALITY_VAULT_ENRICH`).
 * Matches `harmonyInterpretationView.effectiveMode` on a successful adapt (vault failure does not change this).
 */
export function effectiveLeadSheetHarmonyDisplayModeAfterEnvGate(rawRequest: unknown): HarmonyDisplayMode {
  const requested = normalizeLeadSheetHarmonyDisplayMode(rawRequest);
  if (!isTonalityVaultLeadSheetHarmonyEnrichmentEnabled() && requested !== 'raw') return 'raw';
  return requested;
}

/** Immutable snapshot of Stage 2 `chordEvents` (bar / beat / symbol) for compare UI. */
export type RawLeadSheetChordSnapshot = ReadonlyArray<{ readonly bar: number; readonly beat: number; readonly symbol: string }>;

export interface LeadSheetHarmonyComparePayload {
  rawChordEvents: RawLeadSheetChordSnapshot;
  tonalityVault: TonalityVaultEnrichmentRunResult;
}

/**
 * Receipt for which harmony view the client should prefer. `lockedChordBars` on the same result
 * always stays **raw-import** derived (source of truth); this object is for display / analysis only.
 */
export interface SongModeLeadSheetHarmonyInterpretationView {
  requestedMode: HarmonyDisplayMode;
  effectiveMode: HarmonyDisplayMode;
  /** Gate coercion, enrichment fallback, or other non-fatal interpretation notes. */
  viewWarnings: string[];
  /** True when the user asked for enriched display but Tonality Vault did not produce `applied` output. */
  enrichedDisplayFellBackToRaw?: boolean;
  /**
   * Present when `effectiveMode === 'compare'` and the Tonality Vault pass executed (including `applied: false`).
   */
  comparePayload?: LeadSheetHarmonyComparePayload;
}

export interface SongModeLeadSheetMelodyAnchor {
  bar: number;
  midi: number;
  /** Mean imported MIDI velocity for voice-1 notes in this bar (after performance shaping). */
  velocityHint?: number;
  /** 0-1 phrase connection hint from imported slur/tie/fermata contour in this bar. */
  connectionHint?: number;
}

export interface SongModeLeadSheetAdaptedInput {
  leadSheet: LeadSheet;
  totalBars: number;
}

export interface SongModeLeadSheetAdaptedResult {
  ok: boolean;
  lockedChordBars?: string[];
  melodyAnchors?: SongModeLeadSheetMelodyAnchor[];
  warnings: string[];
  errors: string[];
}

function normalizeChordEventsByBar(leadSheet: LeadSheet, totalBars: number): string[] {
  const ordered = [...leadSheet.chordEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  const chordByBar = new Map<number, string>();
  for (const ev of ordered) {
    if (ev.bar < 1 || ev.bar > totalBars) continue;
    if (!chordByBar.has(ev.bar)) chordByBar.set(ev.bar, ev.symbol.trim());
  }
  const out: string[] = [];
  let carry = '';
  for (let bar = 1; bar <= totalBars; bar++) {
    const c = chordByBar.get(bar);
    if (c && c.length > 0) {
      carry = c;
      out.push(c);
    } else if (carry.length > 0) {
      out.push(carry);
    } else {
      out.push('Cmaj7');
    }
  }
  return out;
}

function melodyAnchorsByBar(leadSheet: LeadSheet, totalBars: number): SongModeLeadSheetMelodyAnchor[] {
  const ordered = [...leadSheet.melodyEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  const firstMidiByBar = new Map<number, number>();
  const velocitiesByBar = new Map<number, number[]>();
  const connectionByBar = new Map<number, number[]>();
  for (const ev of ordered) {
    if (ev.bar < 1 || ev.bar > totalBars) continue;
    if (!firstMidiByBar.has(ev.bar)) firstMidiByBar.set(ev.bar, ev.midi);
    if (ev.velocityMidi !== undefined) {
      const arr = velocitiesByBar.get(ev.bar) ?? [];
      arr.push(ev.velocityMidi);
      velocitiesByBar.set(ev.bar, arr);
    }
    const cRaw = (ev.tieStart ? 0.5 : 0) + (ev.slurStart ? 0.35 : 0) + (ev.fermata ? 0.25 : 0);
    if (cRaw > 0) {
      const carr = connectionByBar.get(ev.bar) ?? [];
      carr.push(Math.min(1, cRaw));
      connectionByBar.set(ev.bar, carr);
    }
  }
  const out: SongModeLeadSheetMelodyAnchor[] = [];
  for (const [bar, midi] of firstMidiByBar.entries()) {
    const vels = velocitiesByBar.get(bar);
    const conn = connectionByBar.get(bar);
    const velocityHint =
      vels && vels.length > 0 ? Math.round(vels.reduce((a, c) => a + c, 0) / vels.length) : undefined;
    const connectionHint = conn && conn.length > 0 ? Math.min(1, conn.reduce((a, c) => a + c, 0) / conn.length) : undefined;
    out.push({
      bar,
      midi,
      ...(velocityHint !== undefined ? { velocityHint } : {}),
      ...(connectionHint !== undefined ? { connectionHint } : {}),
    });
  }
  out.sort((a, b) => a.bar - b.bar);
  return out;
}

export function adaptLeadSheetForSongMode(input: SongModeLeadSheetAdaptedInput): SongModeLeadSheetAdaptedResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const { leadSheet, totalBars } = input;

  if (totalBars < 1) {
    return { ok: false, warnings, errors: ['Song Mode LeadSheet adapter: totalBars must be >= 1'] };
  }
  if (!leadSheet.chordEvents.length) {
    return { ok: false, warnings, errors: ['Song Mode LeadSheet adapter: no chord events available'] };
  }
  if (!leadSheet.melodyEvents.length) {
    warnings.push('LeadSheet melody empty: harmony will be used, melody anchors omitted.');
  }
  if (leadSheet.totalBars > totalBars) {
    warnings.push('LeadSheet is longer than target Song Mode bars; truncating to requested bar count.');
  } else if (leadSheet.totalBars < totalBars) {
    warnings.push('LeadSheet is shorter than target Song Mode bars; carrying forward final harmony.');
  }

  const lockedChordBars = normalizeChordEventsByBar(leadSheet, totalBars);
  const melodyAnchors = melodyAnchorsByBar(leadSheet, totalBars);
  return { ok: true, lockedChordBars, melodyAnchors, warnings, errors };
}

export interface SongModeLeadSheetXmlAdaptResult extends SongModeLeadSheetAdaptedResult {
  leadSheet?: LeadSheet;
  /**
   * Present when enrichment **ran** (`harmonyDisplayMode` is `enriched` or `compare` and the env gate is on).
   * Companion to raw `leadSheet` harmony; never mutates imported chord symbols.
   * If enrichment throws unexpectedly, `applied` is false and warnings carry the message; import/adapt still succeeds.
   */
  tonalityVaultHarmonyEnrichment?: TonalityVaultEnrichmentRunResult;
  /** User-facing harmony mode + optional compare bundle (successful adapt only). */
  harmonyInterpretationView?: SongModeLeadSheetHarmonyInterpretationView;
}

export type ImportHarmonyLockFallbackReason = 'timeline_missing' | 'timeline_empty' | 'timeline_unusable';

export interface ImportedHarmonyLockBarsResult {
  ok: boolean;
  lockedChordBars?: string[];
  warnings: string[];
  fallbackReason?: ImportHarmonyLockFallbackReason;
}

function stepWithAlter(step: string | undefined, alter: number | undefined): string | undefined {
  if (!step) return undefined;
  if (alter === 1) return `${step}#`;
  if (alter === -1) return `${step}b`;
  return step;
}

function kindToSuffix(kindRaw: string): string {
  const k = kindRaw.trim().toLowerCase();
  if (k === 'major' || k === 'none') return '';
  if (k === 'minor') return 'm';
  if (k === 'dominant') return '7';
  if (k === 'major-seventh') return 'maj7';
  if (k === 'minor-seventh') return 'm7';
  if (k === 'minor-sixth') return 'm6';
  if (k === 'major-sixth') return '6';
  if (k === 'diminished') return 'dim';
  if (k === 'augmented') return 'aug';
  if (k === 'half-diminished') return 'm7b5';
  if (k === 'dominant-ninth') return '9';
  if (k === 'major-ninth') return 'maj9';
  if (k === 'minor-ninth') return 'm9';
  if (k === 'dominant-11th') return '11';
  if (k === 'major-11th') return 'maj11';
  if (k === 'minor-11th') return 'm11';
  if (k === 'dominant-13th') return '13';
  if (k === 'major-13th') return 'maj13';
  if (k === 'minor-13th') return 'm13';
  if (k === 'suspended-second') return 'sus2';
  if (k === 'suspended-fourth') return 'sus4';
  if (k === 'power') return '5';
  return kindRaw.trim();
}

function degreeToSuffixToken(ev: ImportedHarmonyEvent): string[] {
  const out: string[] = [];
  for (const d of ev.degrees ?? []) {
    if (d.value === undefined) continue;
    const alt = d.alter === 1 ? '#' : d.alter === -1 ? 'b' : d.alter === 2 ? '##' : d.alter === -2 ? 'bb' : '';
    const token = `${alt}${d.value}`;
    if (d.type === 'subtract') out.push(`no${d.value}`);
    else out.push(token);
  }
  return out;
}

function importedHarmonyEventToChordSymbol(ev: ImportedHarmonyEvent): string | undefined {
  const rootFromStep = stepWithAlter(ev.root?.step, ev.root?.alter);
  const rootFromNumeral = ev.root?.numeral?.trim();
  const root = rootFromStep ?? (rootFromNumeral && rootFromNumeral.length > 0 ? rootFromNumeral : undefined);
  if (!root) return undefined;
  const suffix = kindToSuffix(ev.kind.value);
  const degreeTokens = degreeToSuffixToken(ev);
  const degreeTail = degreeTokens.length > 0 ? `(${degreeTokens.join(',')})` : '';
  const bass = stepWithAlter(ev.bass?.step, ev.bass?.alter);
  return `${root}${suffix}${degreeTail}${bass ? `/${bass}` : ''}`;
}

export function extractLockedHarmonyBarsFromImportedTimeline(
  leadSheet: LeadSheet,
  totalBars: number
): ImportedHarmonyLockBarsResult {
  const warnings: string[] = [];
  const timeline = leadSheet.importedHarmonyTimeline;
  if (!timeline) return { ok: false, warnings, fallbackReason: 'timeline_missing' };
  if (!timeline.events.length) return { ok: false, warnings, fallbackReason: 'timeline_empty' };
  const firstEventByBar = new Map<number, ImportedHarmonyEvent>();
  for (const ev of timeline.events) {
    if (ev.time.bar < 1 || ev.time.bar > totalBars) continue;
    if (!firstEventByBar.has(ev.time.bar)) firstEventByBar.set(ev.time.bar, ev);
  }
  const bars: string[] = [];
  let carry: string | undefined;
  let usableCount = 0;
  for (let bar = 1; bar <= totalBars; bar++) {
    const ev = firstEventByBar.get(bar);
    if (ev) {
      const symbol = importedHarmonyEventToChordSymbol(ev);
      if (symbol && symbol.length > 0) {
        carry = symbol;
        usableCount++;
      } else {
        warnings.push(`Imported harmony timeline event at bar ${bar} was unusable and was skipped.`);
      }
    }
    if (carry) bars.push(carry);
  }
  if (usableCount < 1 || bars.length < 1) {
    return { ok: false, warnings, fallbackReason: 'timeline_unusable' };
  }
  while (bars.length < totalBars) {
    bars.push(carry!);
  }
  return {
    ok: true,
    lockedChordBars: bars.slice(0, totalBars),
    warnings,
  };
}

export interface LeadSheetPhraseAnchorExtractResult {
  ok: boolean;
  melodyAnchors?: SongModeLeadSheetMelodyAnchor[];
  warnings: string[];
  errors: string[];
}

export function adaptLeadSheetMusicXmlForSongMode(
  xmlOrPacked: string | Uint8Array,
  totalBars: number,
  opts?: {
    leadSheetPerformanceBlend?: number;
    /**
     * Which harmony view to surface alongside raw import. Default `raw` (no Tonality Vault run).
     * `enriched` / `compare` require `COMPOSER_OS_TONALITY_VAULT_ENRICH`; otherwise coerced to `raw` with `viewWarnings`.
     */
    harmonyDisplayMode?: HarmonyDisplayMode;
    /**
     * @internal Unit tests only — when the Tonality Vault env flag is on, forces an exception inside
     * the enrichment try/catch to prove import/adapt still succeeds.
     */
    __testThrowTonalityVaultEnrich?: boolean;
  }
): SongModeLeadSheetXmlAdaptResult {
  const extracted =
    xmlOrPacked instanceof Uint8Array
      ? extractScoreMusicXmlFromUint8Array(xmlOrPacked)
      : extractScoreMusicXmlFromString(xmlOrPacked);
  if (!extracted.ok || !extracted.xml) {
    return {
      ok: false,
      warnings: [],
      errors:
        extracted.errors.length > 0
          ? extracted.errors
          : ['Song Mode LeadSheet: MusicXML could not be unpacked or validated'],
    };
  }
  const parsed = importLeadSheetFromMusicXml(extracted.xml);
  if (!parsed.ok || !parsed.leadSheet) {
    return {
      ok: false,
      warnings: parsed.warnings ?? [],
      errors: parsed.errors ?? ['Song Mode LeadSheet adapter: MusicXML parse failed'],
    };
  }

  const requestedMode = normalizeLeadSheetHarmonyDisplayMode(opts?.harmonyDisplayMode);
  const effectiveMode = effectiveLeadSheetHarmonyDisplayModeAfterEnvGate(opts?.harmonyDisplayMode);
  const envGateOn = isTonalityVaultLeadSheetHarmonyEnrichmentEnabled();
  const viewWarnings: string[] = [];
  if (effectiveMode !== requestedMode) {
    viewWarnings.push(
      'Harmony display mode requested enriched/compare but Tonality Vault is disabled (unset COMPOSER_OS_TONALITY_VAULT_ENRICH); using raw only.'
    );
  }

  const shouldRunEnrichment = envGateOn && (effectiveMode === 'enriched' || effectiveMode === 'compare');

  let tonalityVaultHarmonyEnrichment: TonalityVaultEnrichmentRunResult | undefined;
  if (shouldRunEnrichment) {
    try {
      if (opts?.__testThrowTonalityVaultEnrich === true) {
        throw new Error('__testThrowTonalityVaultEnrich');
      }
      tonalityVaultHarmonyEnrichment = enrichHarmonyWithTonalityVault({
        chordEvents: parsed.leadSheet.chordEvents,
        keySignature: parsed.leadSheet.keySignature,
        totalBars: parsed.leadSheet.totalBars,
        importedHarmonyTimelineEventCount: parsed.leadSheet.importedHarmonyTimeline?.events.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tonalityVaultHarmonyEnrichment = {
        applied: false,
        warnings: [`Tonality Vault enrichment failed (ignored): ${msg}`],
      };
    }
  }

  const rawImportChordSnapshot: RawLeadSheetChordSnapshot = parsed.leadSheet.chordEvents.map((e) => ({
    bar: e.bar,
    beat: e.beat,
    symbol: e.symbol,
  }));

  let enrichedDisplayFellBackToRaw: boolean | undefined;
  if (effectiveMode === 'enriched' && tonalityVaultHarmonyEnrichment && !tonalityVaultHarmonyEnrichment.applied) {
    enrichedDisplayFellBackToRaw = true;
    viewWarnings.push('Enriched harmony unavailable; use raw chord symbols and locked bars.');
  }

  const shaped = applyLeadSheetPerformanceRendering(parsed.leadSheet, {
    blendTowardImported: opts?.leadSheetPerformanceBlend,
  });
  const adapted = adaptLeadSheetForSongMode({ leadSheet: shaped, totalBars });
  const enrichWarnings = tonalityVaultHarmonyEnrichment?.warnings ?? [];

  const harmonyInterpretationView: SongModeLeadSheetHarmonyInterpretationView = {
    requestedMode,
    effectiveMode,
    viewWarnings: [...viewWarnings],
    ...(enrichedDisplayFellBackToRaw ? { enrichedDisplayFellBackToRaw: true } : {}),
    ...(effectiveMode === 'compare' && tonalityVaultHarmonyEnrichment
      ? {
          comparePayload: {
            rawChordEvents: rawImportChordSnapshot,
            tonalityVault: tonalityVaultHarmonyEnrichment,
          },
        }
      : {}),
  };

  return {
    ...adapted,
    leadSheet: shaped,
    warnings: [...(parsed.warnings ?? []), ...adapted.warnings, ...enrichWarnings, ...viewWarnings],
    harmonyInterpretationView,
    ...(tonalityVaultHarmonyEnrichment ? { tonalityVaultHarmonyEnrichment } : {}),
  };
}

/**
 * Import-scoped phrase pilot for non-Song Mode presets:
 * parse + performance-shape MusicXML and extract melody anchors even when no chord events are present.
 */
export function extractLeadSheetMelodyAnchorsFromMusicXml(
  xmlOrPacked: string | Uint8Array,
  totalBars: number,
  opts?: { leadSheetPerformanceBlend?: number }
): LeadSheetPhraseAnchorExtractResult {
  const extracted =
    xmlOrPacked instanceof Uint8Array
      ? extractScoreMusicXmlFromUint8Array(xmlOrPacked)
      : extractScoreMusicXmlFromString(xmlOrPacked);
  if (!extracted.ok || !extracted.xml) {
    return {
      ok: false,
      warnings: [],
      errors:
        extracted.errors.length > 0
          ? extracted.errors
          : ['LeadSheet phrase-anchor import: MusicXML could not be unpacked or validated'],
    };
  }
  const parsed = importLeadSheetFromMusicXml(extracted.xml);
  if (!parsed.ok || !parsed.leadSheet) {
    return {
      ok: false,
      warnings: parsed.warnings ?? [],
      errors: parsed.errors ?? ['LeadSheet phrase-anchor import: MusicXML parse failed'],
    };
  }
  const shaped = applyLeadSheetPerformanceRendering(parsed.leadSheet, {
    blendTowardImported: opts?.leadSheetPerformanceBlend,
  });
  return {
    ok: true,
    melodyAnchors: melodyAnchorsByBar(shaped, totalBars),
    warnings: parsed.warnings ?? [],
    errors: [],
  };
}

