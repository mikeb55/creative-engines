/**
 * Song Mode / custom_locked: single routing path for pasted harmony — fail fast if layers drift.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { lockedHarmonyChordSymbolsEquivalent } from '../harmony/chordProgressionParser';
import { isAllowedSongFormBarCount } from '../harmony/songFormBarCounts';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

/** Subset of golden-path options — avoids circular import with runGoldenPath.ts */
export interface CustomLockedRoutingWire {
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  chordProgressionText?: string;
  parsedChordBars?: string[];
  lockedHarmonyBarsRaw?: string[];
}

const DEBUG = () =>
  typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_SONG_MODE_HARMONY === '1';

export function logSongModeHarmonyDebug(payload: Record<string, unknown>): void {
  if (!DEBUG()) return;
  console.log('[SONG_MODE_HARMONY]', JSON.stringify(payload));
}

type EffectiveHarmonyBarsMetadataKey = keyof GenerationMetadata;

function coerceStringBarArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (!value.every((bar): bar is string => typeof bar === 'string')) return undefined;
  return value;
}

interface EffectiveHarmonyTruthRegistryEntry {
  songwriterStyleIds?: readonly string[];
  styleProfiles?: readonly string[];
  metadataKey: EffectiveHarmonyBarsMetadataKey;
}

export const EFFECTIVE_HARMONY_TRUTH_REGISTRY: readonly EffectiveHarmonyTruthRegistryEntry[] = [
  { songwriterStyleIds: ['brian_wilson'], metadataKey: 'brianWilsonEffectiveHarmonyBars' },
  { songwriterStyleIds: ['stevie_wonder'], metadataKey: 'stevieWonderEffectiveHarmonyBars' },
  { songwriterStyleIds: ['radiohead'], metadataKey: 'radioheadEffectiveHarmonyBars' },
  { songwriterStyleIds: ['james_brown'], metadataKey: 'jamesBrownEffectiveHarmonyBars' },
  { songwriterStyleIds: ['joni_mitchell'], styleProfiles: ['STYLE_JONI_MITCHELL'], metadataKey: 'joniMitchellEffectiveHarmonyBars' },
  { songwriterStyleIds: ['sonic_youth'], styleProfiles: ['STYLE_SONIC_YOUTH'], metadataKey: 'sonicYouthEffectiveHarmonyBars' },
  { songwriterStyleIds: ['pat_metheny'], styleProfiles: ['STYLE_PAT_METHENY'], metadataKey: 'patMethenyEffectiveHarmonyBars' },
  { songwriterStyleIds: ['wayne_shorter'], metadataKey: 'wayneShorterEffectiveHarmonyBars' },
  { songwriterStyleIds: ['barry_harris'], metadataKey: 'barryHarrisEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bill_evans'], metadataKey: 'billEvansEffectiveHarmonyBars' },
  { songwriterStyleIds: ['debussy'], metadataKey: 'debussyEffectiveHarmonyBars' },
  { songwriterStyleIds: ['duke_ellington'], metadataKey: 'dukeEllingtonEffectiveHarmonyBars' },
  { songwriterStyleIds: ['billy_strayhorn'], metadataKey: 'billyStrayhornEffectiveHarmonyBars' },
  { songwriterStyleIds: ['miles_davis'], metadataKey: 'milesDavisEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bartok'], metadataKey: 'bartokEffectiveHarmonyBars' },
  { songwriterStyleIds: ['berg'], metadataKey: 'bergEffectiveHarmonyBars' },
  { songwriterStyleIds: ['sammy_nestico'], metadataKey: 'sammyNesticoEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bob_brookmeyer'], metadataKey: 'bobBrookmeyerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['clare_fischer'], metadataKey: 'clareFischerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['oliver_nelson'], metadataKey: 'oliverNelsonEffectiveHarmonyBars' },
  { songwriterStyleIds: ['quincy_jones'], metadataKey: 'quincyJonesEffectiveHarmonyBars' },
  { songwriterStyleIds: ['don_sebesky'], metadataKey: 'donSebeskyEffectiveHarmonyBars' },
  { songwriterStyleIds: ['johnny_mandel'], metadataKey: 'johnnyMandelEffectiveHarmonyBars' },
  { songwriterStyleIds: ['gershwin'], metadataKey: 'gershwinEffectiveHarmonyBars' },
  { songwriterStyleIds: ['arvo_part'], metadataKey: 'arvoPartEffectiveHarmonyBars' },
  { songwriterStyleIds: ['satie'], metadataKey: 'satieEffectiveHarmonyBars' },
  { songwriterStyleIds: ['prince'], metadataKey: 'princeEffectiveHarmonyBars' },
  { songwriterStyleIds: ['beatles'], metadataKey: 'beatlesEffectiveHarmonyBars' },
  { songwriterStyleIds: ['fela_kuti'], metadataKey: 'felaKutiEffectiveHarmonyBars' },
  { songwriterStyleIds: ['cole_porter'], metadataKey: 'colePorterEffectiveHarmonyBars' },
  { songwriterStyleIds: ['gil_evans'], metadataKey: 'gilEvansEffectiveHarmonyBars' },
  { songwriterStyleIds: ['maria_schneider'], metadataKey: 'mariaSchneiderEffectiveHarmonyBars' },
  { songwriterStyleIds: ['kenny_wheeler'], metadataKey: 'kennyWheelerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['jan_garbarek'], metadataKey: 'janGarbarekEffectiveHarmonyBars' },
  { songwriterStyleIds: ['john_surman'], metadataKey: 'johnSurmanEffectiveHarmonyBars' },
  { songwriterStyleIds: ['ralph_towner'], metadataKey: 'ralphTownerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['verlaine'], metadataKey: 'verlaineEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bill_holman'], metadataKey: 'billHolmanEffectiveHarmonyBars' },
  { songwriterStyleIds: ['carla_bley'], metadataKey: 'carlaBleyEffectiveHarmonyBars' },
  { songwriterStyleIds: ['eberhard_weber'], metadataKey: 'eberhardWeberEffectiveHarmonyBars' },
  { songwriterStyleIds: ['claus_ogerman'], metadataKey: 'clausOgermanEffectiveHarmonyBars' },
  { songwriterStyleIds: ['lalo_schifrin'], metadataKey: 'laloSchifrinEffectiveHarmonyBars' },
  { songwriterStyleIds: ['john_barry'], metadataKey: 'johnBarryEffectiveHarmonyBars' },
  { songwriterStyleIds: ['thad_jones'], metadataKey: 'thadJonesEffectiveHarmonyBars' },
  { songwriterStyleIds: ['charles_mingus'], metadataKey: 'charlesMingusEffectiveHarmonyBars' },
  { songwriterStyleIds: ['henry_threadgill'], metadataKey: 'henryThreadgillEffectiveHarmonyBars' },
  { songwriterStyleIds: ['count_basie'], metadataKey: 'basieEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bacharach'], metadataKey: 'bacharachEffectiveHarmonyBars' },
  { songwriterStyleIds: ['donald_fagen'], metadataKey: 'donaldFagenEffectiveHarmonyBars' },
  { songwriterStyleIds: ['ecm_chamber'], metadataKey: 'ecmChamberEffectiveHarmonyBars' },
  { songwriterStyleIds: ['antonio_carlos_jobim'], metadataKey: 'jobimEffectiveHarmonyBars' },
  { songwriterStyleIds: ['herbie_hancock'], metadataKey: 'herbieHancockEffectiveHarmonyBars' },
  { songwriterStyleIds: ['stephen_sondheim'], metadataKey: 'sondheimEffectiveHarmonyBars' },
  { songwriterStyleIds: ['kate_bush'], metadataKey: 'kateBushEffectiveHarmonyBars' },
  { songwriterStyleIds: ['thelonious_monk'], metadataKey: 'theloniousMonkEffectiveHarmonyBars' },
  { songwriterStyleIds: ['john_coltrane'], metadataKey: 'johnColtraneEffectiveHarmonyBars' },
  { songwriterStyleIds: ['mccoy_tyner'], metadataKey: 'mccoyTynerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['andrew_hill'], metadataKey: 'andrewHillEffectiveHarmonyBars' },
  { songwriterStyleIds: ['jim_hall'], metadataKey: 'jimHallEffectiveHarmonyBars' },
  { songwriterStyleIds: ['charlie_parker'], metadataKey: 'charlieParkerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['fripp_king_crimson'], metadataKey: 'frippKingCrimsonEffectiveHarmonyBars' },
  { songwriterStyleIds: ['bernard_herrmann'], metadataKey: 'bernardHerrmannEffectiveHarmonyBars' },
  { songwriterStyleIds: ['john_williams'], metadataKey: 'johnWilliamsEffectiveHarmonyBars' },
  { songwriterStyleIds: ['ennio_morricone'], metadataKey: 'ennioMorriconeEffectiveHarmonyBars' },
  { songwriterStyleIds: ['nino_rota'], metadataKey: 'ninoRotaEffectiveHarmonyBars' },
  { songwriterStyleIds: ['jerry_goldsmith'], metadataKey: 'jerryGoldsmithEffectiveHarmonyBars' },
  { songwriterStyleIds: ['philip_glass'], metadataKey: 'philipGlassEffectiveHarmonyBars' },
  { songwriterStyleIds: ['steve_reich'], metadataKey: 'steveReichEffectiveHarmonyBars' },
  { songwriterStyleIds: ['messiaen'], metadataKey: 'messiaenEffectiveHarmonyBars' },
  { songwriterStyleIds: ['hans_zimmer'], metadataKey: 'hansZimmerEffectiveHarmonyBars' },
  { songwriterStyleIds: ['angelo_badalamenti'], metadataKey: 'angeloBadalamentiEffectiveHarmonyBars' },
  { songwriterStyleIds: ['frank_zappa'], metadataKey: 'frankZappaEffectiveHarmonyBars' },
];

function registryEntryMatches(entry: EffectiveHarmonyTruthRegistryEntry, md: GenerationMetadata): boolean {
  const songwriterStyleId = md.songwriterStyleId;
  const styleProfile = md.styleProfile;
  return (
    (songwriterStyleId != null && (entry.songwriterStyleIds?.includes(songwriterStyleId) ?? false)) ||
    (styleProfile != null && (entry.styleProfiles?.includes(styleProfile) ?? false))
  );
}

export function resolveEffectiveHarmonyTruth(
  md: GenerationMetadata | undefined,
  opts: {
    totalBars: number;
    expectedLength?: number;
    harmonyContext?: CompositionContext['harmonyContext'];
  }
): string[] | undefined {
  if (!md) return undefined;
  const expectedLength = opts.expectedLength;
  const matchesLength = (bars: readonly string[]) =>
    bars.length === opts.totalBars && (expectedLength == null || bars.length === expectedLength);

  if (
    md.songwriterStyleId === 'frank_zappa' &&
    opts.harmonyContext?.styleId === 'frank_zappa' &&
    matchesLength(opts.harmonyContext.bars)
  ) {
    return [...opts.harmonyContext.bars];
  }

  for (const entry of EFFECTIVE_HARMONY_TRUTH_REGISTRY) {
    if (!registryEntryMatches(entry, md)) continue;
    const raw = md[entry.metadataKey];
    const bars = coerceStringBarArray(raw);
    if (bars && matchesLength(bars)) {
      return [...bars];
    }
  }

  return undefined;
}

export function assertCustomLockedRouting(
  layer: string,
  options: CustomLockedRoutingWire | undefined,
  parsedBars: string[] | undefined,
  opts?: { requireFirstBar?: string }
): void {
  const hm = options?.harmonyMode ?? (options?.chordProgressionText?.trim() ? 'custom' : 'builtin');
  const lockedLen = options?.lockedHarmonyBarsRaw?.length;
  const locked = options?.lockedHarmonyBarsRaw;

  if (hm === 'custom_locked') {
    if (!lockedLen || !isAllowedSongFormBarCount(lockedLen)) {
      throw new Error(
        `CUSTOM HARMONY ROUTING FAILURE at ${layer}: custom_locked requires lockedHarmonyBarsRaw length to match allowed song-form bar counts.`
      );
    }
    if (!parsedBars || parsedBars.length !== lockedLen) {
      throw new Error(
        `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected ${lockedLen} parsed bars for custom_locked (got ${parsedBars?.length ?? 0}).`
      );
    }
    if (locked && locked.length === lockedLen) {
      for (let i = 0; i < lockedLen; i++) {
        if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsedBars[i] ?? '')) {
          throw new Error(
            `CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw[${i}] !== parsedChordBars[${i}].`
          );
        }
      }
    }
  } else if (
    typeof lockedLen === 'number' &&
    isAllowedSongFormBarCount(lockedLen) &&
    parsedBars?.length === lockedLen
  ) {
    if (!parsedBars) return;
    if (locked && locked.length === parsedBars.length) {
      for (let i = 0; i < locked.length; i++) {
        if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsedBars[i] ?? '')) {
          throw new Error(`CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw[${i}] !== parsedChordBars[${i}].`);
        }
      }
    }
  } else {
    return;
  }
  if (opts?.requireFirstBar != null && !lockedHarmonyChordSymbolsEquivalent(parsedBars[0] ?? '', opts.requireFirstBar)) {
    throw new Error(
      `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected first bar "${opts.requireFirstBar}", got "${parsedBars[0]}".`
    );
  }
}

/** Immediately before `generateGoldenPathDuoScore` — custom_locked is absolute authority */
/** After score build: every guitar measure chord must match locked wire (custom_locked only). */
export function assertScoreMatchesLockedHarmonyWire(
  score: ScoreModel,
  options: CustomLockedRoutingWire | undefined,
  context?: CompositionContext
): void {
  const wire = options?.lockedHarmonyBarsRaw ?? options?.parsedChordBars;
  if (!wire || !isAllowedSongFormBarCount(wire.length)) return;
  /** Full-bar paste: score chords must match wire (custom_locked Song Mode, or Guitar–Bass Duo long-form custom). */
  if (options?.harmonyMode !== 'custom_locked' && options?.harmonyMode !== 'custom') return;
  const md = context?.generationMetadata as GenerationMetadata | undefined;
  const tb = context?.form.totalBars ?? wire.length;
  const expectedWire =
    resolveEffectiveHarmonyTruth(md, {
      totalBars: tb,
      expectedLength: wire.length,
      harmonyContext: context?.harmonyContext,
    }) ?? wire;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: missing guitar part for chord check.');
  }
  const n = expectedWire.length;
  for (let i = 1; i <= n; i++) {
    const m = g.measures.find((x) => x.index === i);
    const exp = expectedWire[i - 1];
    const got = m?.chord ?? '';
    if (!lockedHarmonyChordSymbolsEquivalent(got, exp ?? '')) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: score bar ${i} chord "${got}" !== locked "${exp}"`
      );
    }
  }
}

export function assertCustomLockedBeforeScoreGeneration(
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  if (options?.harmonyMode !== 'custom_locked') return;
  const locked = context.lockedHarmonyBarsRaw;
  const wire = options.lockedHarmonyBarsRaw ?? options.parsedChordBars;
  const n = wire?.length ?? 0;
  if (!locked || !isAllowedSongFormBarCount(locked.length) || !wire || wire.length !== n || locked.length !== n) {
    throw new Error(
      'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked requires matching allowed song-form bar counts in both context.lockedHarmonyBarsRaw and options.'
    );
  }
  for (let i = 0; i < n; i++) {
    if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', wire[i] ?? '')) {
      throw new Error(`CUSTOM HARMONY NOT REACHING GOLDEN PATH: options vs context locked mismatch at bar ${i + 1}.`);
    }
  }
  if (context.generationMetadata.customHarmonyLocked !== true) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: generationMetadata.customHarmonyLocked must be true.');
  }
  if (context.form.totalBars !== n) {
    throw new Error(
      `CUSTOM HARMONY NOT REACHING GOLDEN PATH: form.totalBars must be ${n} for custom_locked (got ${context.form.totalBars}).`
    );
  }
  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_LOCKED_REGRESSION_FIRST === '1') {
    if (locked[0] !== 'Cmaj9') {
      throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: regression expects first bar Cmaj9.');
    }
  }
}

export function assertContextMatchesLocked32(
  layer: string,
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  const tb = context.form.totalBars;
  if (!isGuitarBassDuoFamily(context.presetId) || !isAllowedSongFormBarCount(tb)) return;
  const locked = context.lockedHarmonyBarsRaw;
  if (!locked || locked.length !== tb) return;
  /** Long-form can also use built-in tiled harmony — only assert pasted/custom locked paths */
  if (context.generationMetadata.harmonySource !== 'custom') return;
  if (context.generationMetadata.customHarmonyLocked !== true) return;
  const parsed = options?.parsedChordBars ?? options?.lockedHarmonyBarsRaw;
  if (parsed && parsed.length === tb) {
    for (let i = 0; i < tb; i++) {
      if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsed[i] ?? '')) {
        throw new Error(
          `CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw diverges from parsedChordBars at bar ${i + 1}.`
        );
      }
    }
  }
}
