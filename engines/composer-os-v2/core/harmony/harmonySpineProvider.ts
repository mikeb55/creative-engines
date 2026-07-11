/**
 * Harmony spine — thin facade over {@link getChordForBar} with provenance hints.
 * Symbol string always matches `getChordForBar` (VoiceRuleBundle harmonic rhythm + scene bias included).
 *
 * Provenance classification mirrors the **slice / locked / builtin** order in
 * `harmonyResolution.ts` (`resolveChordSymbolAuthoritativeForBar`) — keep lists aligned on edits.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { CustomLockedRoutingWire } from '../goldenPath/customLockedHarmonyRouting';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { isAllowedSongFormBarCount } from './songFormBarCounts';
import { lockedHarmonyChordSymbolsEquivalent } from './chordProgressionParser';
import { isVerlaineHarmonicPath } from '../composer/voiceRuleBundles';
import { isFrankZappaHarmonicPath } from '../song-mode/frankZappaSlice';
import { isHoldsworthHarmonicPath } from '../song-mode/holdsworthScaleSlice';
import { isFrippHarmonicPath } from '../song-mode/frippSystemsSlice';
import { isBillEvansHarmonicPath } from '../song-mode/billEvansSlice';
import { getChordForBar } from './harmonyResolution';
import { buildSectionAwareHarmonySpine } from './harmonySpineSectionLoop';
import type { ResolvedPitchField } from './pitchFieldSpineTypes';
import {
  getOrBuildPitchFieldSpineCache,
  resolveFieldForBar,
  resolvePitchFieldBundleForContext,
  shouldUsePitchFieldSubstrate,
} from './pitchFieldResolver';
import {
  hasExplicitPerSectionVrbAssignment,
  perSectionVrbResolutionEnabled,
} from '../counterpoint/vrbProfiles/vrbContextResolver';

export type HarmonySpineProvenance = 'builtin' | 'slice' | 'locked' | 'vault';

export type ResolvedHarmonyBar = {
  bar?: number;
  symbol: string;
  provenance: HarmonySpineProvenance;
  sliceId?: string;
  /** Last bar of a section (not final section). */
  isPhraseBoundary?: boolean;
  /** Seam / transition bar between adjacent section VRBs. */
  isBoundaryBar?: boolean;
  resolvedVrbId?: string;
  voicing?: import('../composer/voiceLeadingSolver').VoicingCandidate;
  usedEmergencyFallback?: boolean;
  /** Present when pitch-field substrate is active for this bar/voice. */
  pitchField?: ResolvedPitchField;
};

/** Future adapters (per-slice spine hooks) conform to this surface. */
export type HarmonySpineProvider = {
  resolveBarSymbol(
    context: CompositionContext,
    bar: number,
    voiceId?: string,
  ): ResolvedHarmonyBar;
};

/**
 * Ordered slice/effective-bar pairs — **must** stay aligned with
 * `resolveChordSymbolAuthoritativeForBar` branch order (single source of behavioural truth is there).
 */
const SLICE_AUTHORITY_ROWS: ReadonlyArray<{
  match: (meta: GenerationMetadata | undefined, context: CompositionContext) => boolean;
  effKey: keyof GenerationMetadata;
  sliceId: string;
}> = [
  { match: (m) => m?.songwriterStyleId === 'brian_wilson', effKey: 'brianWilsonEffectiveHarmonyBars', sliceId: 'brian_wilson' },
  { match: (m) => m?.songwriterStyleId === 'stevie_wonder', effKey: 'stevieWonderEffectiveHarmonyBars', sliceId: 'stevie_wonder' },
  { match: (m) => m?.songwriterStyleId === 'radiohead', effKey: 'radioheadEffectiveHarmonyBars', sliceId: 'radiohead' },
  { match: (m) => m?.songwriterStyleId === 'james_brown', effKey: 'jamesBrownEffectiveHarmonyBars', sliceId: 'james_brown' },
  {
    match: (m) => m?.songwriterStyleId === 'joni_mitchell' || m?.styleProfile === 'STYLE_JONI_MITCHELL',
    effKey: 'joniMitchellEffectiveHarmonyBars',
    sliceId: 'joni_mitchell',
  },
  {
    match: (m) => m?.songwriterStyleId === 'sonic_youth' || m?.styleProfile === 'STYLE_SONIC_YOUTH',
    effKey: 'sonicYouthEffectiveHarmonyBars',
    sliceId: 'sonic_youth',
  },
  {
    match: (m) => m?.songwriterStyleId === 'pat_metheny' || m?.styleProfile === 'STYLE_PAT_METHENY',
    effKey: 'patMethenyEffectiveHarmonyBars',
    sliceId: 'pat_metheny',
  },
  { match: (m) => m?.songwriterStyleId === 'wayne_shorter', effKey: 'wayneShorterEffectiveHarmonyBars', sliceId: 'wayne_shorter' },
  /** Verlaine harmonicVoice is intentionally treated as Verlaine for harmony authority resolution. Other styles remain primary-only until explicitly designed similarly. */
  {
    match: (m) => isVerlaineHarmonicPath(m),
    effKey: 'verlaineEffectiveHarmonyBars',
    sliceId: 'verlaine',
  },
  { match: (m) => m?.songwriterStyleId === 'barry_harris', effKey: 'barryHarrisEffectiveHarmonyBars', sliceId: 'barry_harris' },
  { match: (m) => isBillEvansHarmonicPath(m), effKey: 'billEvansEffectiveHarmonyBars', sliceId: 'bill_evans' },
  { match: (m) => m?.songwriterStyleId === 'debussy', effKey: 'debussyEffectiveHarmonyBars', sliceId: 'debussy' },
  { match: (m) => m?.songwriterStyleId === 'bernard_herrmann', effKey: 'bernardHerrmannEffectiveHarmonyBars', sliceId: 'bernard_herrmann' },
  { match: (m) => m?.songwriterStyleId === 'john_williams', effKey: 'johnWilliamsEffectiveHarmonyBars', sliceId: 'john_williams' },
  { match: (m) => m?.songwriterStyleId === 'ennio_morricone', effKey: 'ennioMorriconeEffectiveHarmonyBars', sliceId: 'ennio_morricone' },
  { match: (m) => m?.songwriterStyleId === 'nino_rota', effKey: 'ninoRotaEffectiveHarmonyBars', sliceId: 'nino_rota' },
  { match: (m) => m?.songwriterStyleId === 'jerry_goldsmith', effKey: 'jerryGoldsmithEffectiveHarmonyBars', sliceId: 'jerry_goldsmith' },
  { match: (m) => m?.songwriterStyleId === 'john_barry', effKey: 'johnBarryEffectiveHarmonyBars', sliceId: 'john_barry' },
  { match: (m) => m?.songwriterStyleId === 'philip_glass', effKey: 'philipGlassEffectiveHarmonyBars', sliceId: 'philip_glass' },
  { match: (m) => m?.songwriterStyleId === 'hans_zimmer', effKey: 'hansZimmerEffectiveHarmonyBars', sliceId: 'hans_zimmer' },
  { match: (m) => m?.songwriterStyleId === 'angelo_badalamenti', effKey: 'angeloBadalamentiEffectiveHarmonyBars', sliceId: 'angelo_badalamenti' },
  { match: (m) => m?.songwriterStyleId === 'duke_ellington', effKey: 'dukeEllingtonEffectiveHarmonyBars', sliceId: 'duke_ellington' },
  { match: (m) => m?.songwriterStyleId === 'billy_strayhorn', effKey: 'billyStrayhornEffectiveHarmonyBars', sliceId: 'billy_strayhorn' },
  { match: (m) => m?.songwriterStyleId === 'gil_evans', effKey: 'gilEvansEffectiveHarmonyBars', sliceId: 'gil_evans' },
  { match: (m) => m?.songwriterStyleId === 'thad_jones', effKey: 'thadJonesEffectiveHarmonyBars', sliceId: 'thad_jones' },
  { match: (m) => m?.songwriterStyleId === 'charles_mingus', effKey: 'charlesMingusEffectiveHarmonyBars', sliceId: 'charles_mingus' },
  { match: (m) => m?.songwriterStyleId === 'henry_threadgill', effKey: 'henryThreadgillEffectiveHarmonyBars', sliceId: 'henry_threadgill' },
  { match: (m) => m?.songwriterStyleId === 'count_basie', effKey: 'basieEffectiveHarmonyBars', sliceId: 'count_basie' },
  { match: (m) => m?.songwriterStyleId === 'miles_davis', effKey: 'milesDavisEffectiveHarmonyBars', sliceId: 'miles_davis' },
  { match: (m) => m?.songwriterStyleId === 'bartok', effKey: 'bartokEffectiveHarmonyBars', sliceId: 'bartok' },
  { match: (m) => m?.songwriterStyleId === 'berg', effKey: 'bergEffectiveHarmonyBars', sliceId: 'berg' },
  { match: (m) => m?.songwriterStyleId === 'sammy_nestico', effKey: 'sammyNesticoEffectiveHarmonyBars', sliceId: 'sammy_nestico' },
  { match: (m) => m?.songwriterStyleId === 'bob_brookmeyer', effKey: 'bobBrookmeyerEffectiveHarmonyBars', sliceId: 'bob_brookmeyer' },
  { match: (m) => m?.songwriterStyleId === 'clare_fischer', effKey: 'clareFischerEffectiveHarmonyBars', sliceId: 'clare_fischer' },
  { match: (m) => m?.songwriterStyleId === 'oliver_nelson', effKey: 'oliverNelsonEffectiveHarmonyBars', sliceId: 'oliver_nelson' },
  { match: (m) => m?.songwriterStyleId === 'quincy_jones', effKey: 'quincyJonesEffectiveHarmonyBars', sliceId: 'quincy_jones' },
  { match: (m) => m?.songwriterStyleId === 'don_sebesky', effKey: 'donSebeskyEffectiveHarmonyBars', sliceId: 'don_sebesky' },
  { match: (m) => m?.songwriterStyleId === 'johnny_mandel', effKey: 'johnnyMandelEffectiveHarmonyBars', sliceId: 'johnny_mandel' },
  { match: (m) => m?.songwriterStyleId === 'gershwin', effKey: 'gershwinEffectiveHarmonyBars', sliceId: 'gershwin' },
  { match: (m) => m?.songwriterStyleId === 'arvo_part', effKey: 'arvoPartEffectiveHarmonyBars', sliceId: 'arvo_part' },
  { match: (m) => m?.songwriterStyleId === 'satie', effKey: 'satieEffectiveHarmonyBars', sliceId: 'satie' },
  { match: (m) => m?.songwriterStyleId === 'prince', effKey: 'princeEffectiveHarmonyBars', sliceId: 'prince' },
  { match: (m) => m?.songwriterStyleId === 'beatles', effKey: 'beatlesEffectiveHarmonyBars', sliceId: 'beatles' },
  { match: (m) => m?.songwriterStyleId === 'fela_kuti', effKey: 'felaKutiEffectiveHarmonyBars', sliceId: 'fela_kuti' },
  { match: (m) => m?.songwriterStyleId === 'cole_porter', effKey: 'colePorterEffectiveHarmonyBars', sliceId: 'cole_porter' },
  { match: (m) => m?.songwriterStyleId === 'maria_schneider', effKey: 'mariaSchneiderEffectiveHarmonyBars', sliceId: 'maria_schneider' },
  { match: (m) => m?.songwriterStyleId === 'kenny_wheeler', effKey: 'kennyWheelerEffectiveHarmonyBars', sliceId: 'kenny_wheeler' },
  { match: (m) => m?.songwriterStyleId === 'jan_garbarek', effKey: 'janGarbarekEffectiveHarmonyBars', sliceId: 'jan_garbarek' },
  { match: (m) => m?.songwriterStyleId === 'john_surman', effKey: 'johnSurmanEffectiveHarmonyBars', sliceId: 'john_surman' },
  { match: (m) => m?.songwriterStyleId === 'ralph_towner', effKey: 'ralphTownerEffectiveHarmonyBars', sliceId: 'ralph_towner' },
  {
    match: (m) => isHoldsworthHarmonicPath(m),
    effKey: 'holdsworthEffectiveHarmonyBars',
    sliceId: 'allan_holdsworth',
  },
  { match: (m) => m?.songwriterStyleId === 'jack_white', effKey: 'jackWhiteEffectiveHarmonyBars', sliceId: 'jack_white' },
  { match: (m) => m?.songwriterStyleId === 'beefheart', effKey: 'beefheartEffectiveHarmonyBars', sliceId: 'beefheart' },
  { match: (m) => isFrippHarmonicPath(m), effKey: 'frippEffectiveHarmonyBars', sliceId: 'fripp' },
  { match: (m) => m?.songwriterStyleId === 'marr', effKey: 'marrEffectiveHarmonyBars', sliceId: 'marr' },
  { match: (m) => m?.songwriterStyleId === 'bill_holman', effKey: 'billHolmanEffectiveHarmonyBars', sliceId: 'bill_holman' },
  { match: (m) => m?.songwriterStyleId === 'carla_bley', effKey: 'carlaBleyEffectiveHarmonyBars', sliceId: 'carla_bley' },
  { match: (m) => m?.songwriterStyleId === 'eberhard_weber', effKey: 'eberhardWeberEffectiveHarmonyBars', sliceId: 'eberhard_weber' },
  { match: (m) => m?.songwriterStyleId === 'claus_ogerman', effKey: 'clausOgermanEffectiveHarmonyBars', sliceId: 'claus_ogerman' },
  { match: (m) => m?.songwriterStyleId === 'lalo_schifrin', effKey: 'laloSchifrinEffectiveHarmonyBars', sliceId: 'lalo_schifrin' },
  { match: (m) => m?.songwriterStyleId === 'bacharach', effKey: 'bacharachEffectiveHarmonyBars', sliceId: 'bacharach' },
  { match: (m) => m?.songwriterStyleId === 'donald_fagen', effKey: 'donaldFagenEffectiveHarmonyBars', sliceId: 'donald_fagen' },
  { match: (m) => m?.songwriterStyleId === 'ecm_chamber', effKey: 'ecmChamberEffectiveHarmonyBars', sliceId: 'ecm_chamber' },
  { match: (m) => m?.songwriterStyleId === 'antonio_carlos_jobim', effKey: 'jobimEffectiveHarmonyBars', sliceId: 'antonio_carlos_jobim' },
  { match: (m) => m?.songwriterStyleId === 'herbie_hancock', effKey: 'herbieHancockEffectiveHarmonyBars', sliceId: 'herbie_hancock' },
  { match: (m) => m?.songwriterStyleId === 'stephen_sondheim', effKey: 'sondheimEffectiveHarmonyBars', sliceId: 'stephen_sondheim' },
  { match: (m) => m?.songwriterStyleId === 'kate_bush', effKey: 'kateBushEffectiveHarmonyBars', sliceId: 'kate_bush' },
  { match: (m) => m?.songwriterStyleId === 'thelonious_monk', effKey: 'theloniousMonkEffectiveHarmonyBars', sliceId: 'thelonious_monk' },
  { match: (m) => m?.songwriterStyleId === 'john_coltrane', effKey: 'johnColtraneEffectiveHarmonyBars', sliceId: 'john_coltrane' },
  { match: (m) => m?.songwriterStyleId === 'mccoy_tyner', effKey: 'mccoyTynerEffectiveHarmonyBars', sliceId: 'mccoy_tyner' },
  { match: (m) => m?.songwriterStyleId === 'andrew_hill', effKey: 'andrewHillEffectiveHarmonyBars', sliceId: 'andrew_hill' },
  { match: (m) => m?.songwriterStyleId === 'jim_hall', effKey: 'jimHallEffectiveHarmonyBars', sliceId: 'jim_hall' },
  { match: (m) => m?.songwriterStyleId === 'steve_reich', effKey: 'steveReichEffectiveHarmonyBars', sliceId: 'steve_reich' },
  { match: (m) => m?.songwriterStyleId === 'messiaen', effKey: 'messiaenEffectiveHarmonyBars', sliceId: 'messiaen' },
  { match: (m) => m?.songwriterStyleId === 'charlie_parker', effKey: 'charlieParkerEffectiveHarmonyBars', sliceId: 'charlie_parker' },
  { match: (m) => m?.songwriterStyleId === 'fripp_king_crimson', effKey: 'frippKingCrimsonEffectiveHarmonyBars', sliceId: 'fripp_king_crimson' },
  /** Frank Zappa harmonicVoice is treated as Frank Zappa for harmony authority when eff bars / HarmonyContext exist. */
  {
    match: (m) => isFrankZappaHarmonicPath(m),
    effKey: 'frankZappaEffectiveHarmonyBars',
    sliceId: 'frank_zappa',
  },
];

export function classifyAuthoritativeLayerForBar(
  barIndex: number,
  context: CompositionContext,
): Pick<ResolvedHarmonyBar, 'provenance' | 'sliceId'> {
  const tb = context.form.totalBars;
  const meta = context.generationMetadata;
  const locked = context.lockedHarmonyBarsRaw;
  const parsed = meta?.parsedCustomProgressionBars;
  const barOk = barIndex >= 1 && barIndex <= tb;

  const hc = context.harmonyContext;
  if (hc && hc.bars.length === tb && barOk) {
    return { provenance: 'slice', sliceId: hc.styleId };
  }

  for (const row of SLICE_AUTHORITY_ROWS) {
    if (!row.match(meta, context)) continue;
    const arr = meta?.[row.effKey] as string[] | undefined;
    if (Array.isArray(arr) && arr.length === tb && barOk) {
      return { provenance: 'slice', sliceId: row.sliceId };
    }
  }

  if (locked && locked.length === tb && barOk) {
    return { provenance: 'locked' };
  }
  if (parsed && parsed.length === tb && meta?.harmonySource === 'custom' && barOk) {
    return { provenance: 'locked' };
  }
  if (locked && barIndex >= 1 && barIndex <= locked.length) {
    return { provenance: 'locked' };
  }
  return { provenance: 'builtin' };
}

function spineCacheKey(context: CompositionContext): string {
  const meta = context.generationMetadata;
  return [
    context.form.totalBars,
    meta?.sqLineVrbId ?? '',
    JSON.stringify(context.form.sections ?? []),
    JSON.stringify(meta?.sqToBbVrbContextBySection ?? {}),
  ].join('|');
}

function getOrBuildSpine(context: CompositionContext): ResolvedHarmonyBar[] {
  const meta = context.generationMetadata as { sqToBbHarmonySpineCache?: { key: string; rows: ResolvedHarmonyBar[] } };
  const key = spineCacheKey(context);
  if (meta.sqToBbHarmonySpineCache?.key === key) {
    return meta.sqToBbHarmonySpineCache.rows;
  }
  const rows = buildSectionAwareHarmonySpine(context);
  meta.sqToBbHarmonySpineCache = { key, rows };
  return rows;
}

function attachPitchFieldIfNeeded(
  row: ResolvedHarmonyBar,
  context: CompositionContext,
  bar: number,
  voiceId: string,
): ResolvedHarmonyBar {
  const bundle = resolvePitchFieldBundleForContext(context);
  const sectionLabelMode =
    context.sectionLabelMode ?? context.generationMetadata?.sectionLabelMode;
  if (!bundle || !shouldUsePitchFieldSubstrate(bundle, sectionLabelMode)) {
    return row;
  }

  const vrbId = bundle.sqVrbProfileId ?? bundle.voiceId;
  const spine = getOrBuildPitchFieldSpineCache(context, vrbId);
  const pitchField = resolveFieldForBar(spine, bar, voiceId);
  return { ...row, pitchField };
}

/**
 * Delegates symbol resolution to {@link getChordForBar} (zero behavioural drift vs legacy call sites).
 * When {@link isUsingPitchFieldSubstrate} is true, attaches optional {@link ResolvedPitchField}.
 */
export function resolveBarSymbol(
  context: CompositionContext,
  bar: number,
  voiceId = 'melody',
): ResolvedHarmonyBar {
  if (!perSectionVrbResolutionEnabled() || !hasExplicitPerSectionVrbAssignment(context)) {
    const symbol = getChordForBar(bar, context);
    const layer = classifyAuthoritativeLayerForBar(bar, context);
  const bundle = resolvePitchFieldBundleForContext(context);
  const resolvedVrbId =
    bundle?.sqVrbProfileId ?? bundle?.voiceId ?? context.generationMetadata?.sqLineVrbId;
    return attachPitchFieldIfNeeded(
      {
        bar,
        symbol,
        provenance: layer.provenance,
        sliceId: layer.sliceId,
        resolvedVrbId: resolvedVrbId ? String(resolvedVrbId) : undefined,
      },
      context,
      bar,
      voiceId,
    );
  }
  const rows = getOrBuildSpine(context);
  const hit = rows.find((r) => r.bar === bar);
  if (hit) return attachPitchFieldIfNeeded(hit, context, bar, voiceId);
  const symbol = getChordForBar(bar, context);
  const layer = classifyAuthoritativeLayerForBar(bar, context);
  return attachPitchFieldIfNeeded(
    {
      bar,
      symbol,
      provenance: layer.provenance,
      sliceId: layer.sliceId,
    },
    context,
    bar,
    voiceId,
  );
}

/**
 * Post-build LOCK (same gate as `assertScoreMatchesLockedHarmonyWire`): on `custom` / `custom_locked`
 * long-form paths, each guitar measure `chord` matches {@link resolveBarSymbol} for that bar.
 * No-op when there is no `clean_electric_guitar` part.
 */
export function assertHarmonySpineMatchesScore(
  score: ScoreModel,
  options: CustomLockedRoutingWire | undefined,
  context: CompositionContext | undefined,
  layer = 'assertHarmonySpineMatchesScore'
): void {
  if (!context) return;
  const wire = options?.lockedHarmonyBarsRaw ?? options?.parsedChordBars;
  if (!wire || !isAllowedSongFormBarCount(wire.length)) return;
  if (options?.harmonyMode !== 'custom_locked' && options?.harmonyMode !== 'custom') return;
  const tb = context.form.totalBars;
  if (!Number.isFinite(tb) || tb < 1) return;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return;
  for (let b = 1; b <= tb; b++) {
    const spine = resolveBarSymbol(context, b).symbol;
    const got = g.measures.find((m) => m.index === b)?.chord ?? '';
    if (!lockedHarmonyChordSymbolsEquivalent(got, spine)) {
      throw new Error(
        `HARMONY_SPINE_LOCK [${layer}]: bar ${b} guitar chord "${got}" !== spine "${spine}"`
      );
    }
  }
}
