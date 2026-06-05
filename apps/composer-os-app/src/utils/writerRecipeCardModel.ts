import type { SongwriterRuleId } from '@composer-os/core/song-mode/songwritingResearchTypes';
import { MELODY_PROFILES } from '@composer-os/core/song-mode/melodyBehaviourPlanner';
import { SONGWRITER_RULE_REGISTRY } from '@composer-os/core/song-mode/songwriterRuleRegistry';
import {
  normalizeSongwriterStyleKey,
  SONGWRITER_STYLE_PROFILES,
} from '@composer-os/core/song-mode/songwriterStyleProfiles';

export type WriterRecipeCardModel = {
  id: SongwriterRuleId;
  displayName: string;
  eraLabel: string;
  devices: readonly string[];
  oneLine: string;
};

function snakeCaseToTitleCase(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

const CLASSICAL = new Set<string>([
  'bach',
  'bartok',
  'beethoven',
  'beethoven_late',
  'crumb',
  'crumb_black_angels',
  'debussy',
  'dutilleux',
  'lachenmann',
  'ligeti',
  'mahler',
  'messiaen',
  'prokofiev',
  'arvo_part',
  'satie',
  'ravel',
  'reich_glass',
  'schubert',
  'shostakovich',
  'stravinsky',
  'turtle_island',
]);

const JAZZ = new Set<string>([
  'andrew_hill',
  'barry_harris',
  'bill_evans',
  'billy_strayhorn',
  'charlie_parker',
  'dave_brubeck',
  'duke_ellington',
  'ecm_chamber',
  'gil_evans',
  'henry_threadgill',
  'charles_mingus',
  'count_basie',
  'herbie_hancock',
  'john_coltrane',
  'maria_schneider',
  'pat_metheny',
  'john_surman',
  'ralph_towner',
  'thelonious_monk',
  'gershwin',
  'wayne_shorter',
  'ornette_coleman',
]);

const LATIN_JAZZ = new Set<string>(['antonio_carlos_jobim']);

const JAZZ_ROCK = new Set<string>(['donald_fagen']);

const ROCK_FUSION = new Set<string>(['frank_zappa', 'verlaine']);

const THEATRE = new Set<string>(['bacharach', 'stephen_sondheim', 'kurt_weill', 'cole_porter']);

const POP = new Set<string>([
  'beatles',
  'carole_king',
  'max_martin',
  'holland_dozier_holland',
  'jeff_lynne',
  'paul_mccartney',
  'paul_simon',
  'randy_newman',
  'smokey_robinson',
  'norman_whitfield',
  'brian_wilson',
]);

const RB = new Set<string>(['james_brown', 'stevie_wonder', 'prince']);

const HIP_HOP = new Set<string>(['kendrick_lamar']);

const INDIE_ALT = new Set<string>([
  'radiohead',
  'jeff_tweedy',
  'sonic_youth',
  'blur',
  'arcade_fire',
  'pavement',
  'xtc',
]);

const SINGER_SONGWRITER = new Set<string>(['joni_mitchell', 'bob_dylan', 'kate_bush', 'richard_thompson']);

const FILM_SCORING = new Set<string>([
  'angelo_badalamenti',
  'bernard_herrmann',
  'ennio_morricone',
  'hans_zimmer',
  'jerry_goldsmith',
  'lalo_schifrin',
  'john_barry',
  'john_williams',
  'nino_rota',
  'philip_glass',
  'quincy_jones_film',
]);

const BIG_BAND_CHARTS = new Set<string>([
  'gil_evans',
  'thad_jones',
  'sammy_nestico',
  'quincy_jones',
  'bob_brookmeyer',
  'clare_fischer',
  'manny_albam',
  'oliver_nelson',
  'gerald_wilson',
  'neal_hefti',
  'don_sebesky',
  'johnny_mandel',
]);

/**
 * When `songwriterEraTag` is absent on the style profile, bucket by composer id for recipe-card chips.
 */
function deriveSongwriterEraTag(id: SongwriterRuleId): string {
  const s = id;
  if (FILM_SCORING.has(s)) return 'film scoring';
  if (CLASSICAL.has(s)) return 'classical';
  if (THEATRE.has(s)) return 'theatre / standards';
  if (LATIN_JAZZ.has(s)) return 'bossa / latin jazz';
  if (JAZZ.has(s)) return 'jazz';
  if (JAZZ_ROCK.has(s)) return 'jazz-rock';
  if (ROCK_FUSION.has(s)) return 'rock / fusion';
  if (POP.has(s)) return 'pop';
  if (RB.has(s)) return 'r&b';
  if (HIP_HOP.has(s)) return 'hip-hop';
  if (INDIE_ALT.has(s)) return 'indie / alt';
  if (SINGER_SONGWRITER.has(s)) return 'singer-songwriter';
  if (BIG_BAND_CHARTS.has(s)) return 'big band / charts';
  return 'songwriter library';
}

function resolveSongwriterRuleId(raw: string): SongwriterRuleId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const viaAlias = normalizeSongwriterStyleKey(trimmed);
  if (viaAlias) return viaAlias;
  const k = trimmed.toLowerCase();
  if (k in SONGWRITER_STYLE_PROFILES) return k as SongwriterRuleId;
  return null;
}

export function buildWriterRecipeCardModel(rawId: string): WriterRecipeCardModel | null {
  const id = resolveSongwriterRuleId(rawId);
  if (!id) return null;
  const profile = SONGWRITER_STYLE_PROFILES[id];
  const displayName = profile.displayName?.trim() || snakeCaseToTitleCase(id);
  const eraLabel =
    profile.songwriterEraTag?.trim() || deriveSongwriterEraTag(id);
  const devices = MELODY_PROFILES[id]?.devices ?? [];
  const profileDesc = profile.description?.trim();
  const firstRule = SONGWRITER_RULE_REGISTRY.songwriterRules[id]?.[0]?.description?.trim();
  const oneLine = profileDesc || firstRule || 'Planning weights only — slice detail lives in engine receipts.';
  return {
    id,
    displayName,
    eraLabel,
    devices,
    oneLine,
  };
}

export function formatDevicePillLabel(device: string): string {
  return device.replace(/_/g, ' ');
}
