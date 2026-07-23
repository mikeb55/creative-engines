/**
 * Many-to-many phrase-category <-> riff-profile pairing registry.
 *
 * PairingId = `${categoryId}::${profileId}`
 * Multiple edges may share a category or (rarely) a profile.
 * Each generation resolves exactly ONE edge (selected profile + enabled pairing) —
 * no automatic multi-VRB blend.
 */

import { RIFF_PHRASE_CATEGORIES, type RiffPhraseCategory } from './riffPhraseLibraryTypes';
import { RIFF_GENERATOR_VRB_IDS } from './riffVrbRegistry';

export type StyleProfileId = string;

/** Composite edge id — e.g. "blues_rock::hendrix" */
export type PairingId = `${RiffPhraseCategory}::${string}`;

export type StylePairing = {
  id: PairingId;
  categoryId: RiffPhraseCategory;
  profileId: StyleProfileId;
  /** Registry default; runtime flags / env may override. Always false for shipped edges. */
  defaultEnabled: boolean;
};

/** In-process overrides (tests / future request maps). Env still consulted when key absent. */
export type PairingFlags = Partial<Record<PairingId, boolean>>;

export function makePairingId(categoryId: RiffPhraseCategory, profileId: StyleProfileId): PairingId {
  return `${categoryId}::${profileId}` as PairingId;
}

/** Deterministic env / flag string key — never hand-written per entry. */
export function pairingFlagKey(pairing: StylePairing): string {
  return `style-pairing.${pairing.categoryId}.${pairing.profileId}`;
}

/** process.env key derived from edge ids. */
export function pairingEnvKey(pairing: StylePairing): string {
  return (
    'COMPOSER_OS_RIFF_PAIRING_' +
    pairing.categoryId.toUpperCase() +
    '_' +
    pairing.profileId.toUpperCase()
  );
}

/**
 * Legacy env aliases from the 1:1 era — still accepted so existing tests / docs keep working.
 * Maps env var -> PairingId (not the reverse of derived keys).
 */
export const LEGACY_PAIRING_ENV_ALIASES: Readonly<Record<string, PairingId>> = {
  COMPOSER_OS_RIFF_SAX_MOTIF_SEED: 'sax_inspired::weather_report',
  COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED: 'jazz_rock::mahavishnu',
  COMPOSER_OS_RIFF_DIM_MOTIF_SEED: 'diminished_lines::fripp',
  COMPOSER_OS_RIFF_WHITEROCK_MOTIF_SEED: 'white_rock_funk::iommi',
  COMPOSER_OS_RIFF_BLACKSOUL_MOTIF_SEED: 'black_soul_funk::nile_rodgers',
  COMPOSER_OS_RIFF_BEBOP_MOTIF_SEED: 'bebop_jazz_blues::bill_evans_sax',
  COMPOSER_OS_RIFF_BLUESROCK_MOTIF_SEED: 'blues_rock::hendrix',
  COMPOSER_OS_RIFF_PROGBLUES_MOTIF_SEED: 'progressive_blues::david_gilmour',
  COMPOSER_OS_RIFF_MODERNROCK_MOTIF_SEED: 'modern_rock::morello',
  COMPOSER_OS_RIFF_VIRTUOSO_MOTIF_SEED: 'virtuoso_technique::eddie_van_halen',
};

function edge(
  categoryId: RiffPhraseCategory,
  profileId: StyleProfileId,
  defaultEnabled = false
): StylePairing {
  return {
    id: makePairingId(categoryId, profileId),
    categoryId,
    profileId,
    defaultEnabled,
  };
}

/**
 * Central many-to-many registry.
 * blues_rock has two profiles (hendrix + led_zeppelin). southern_rock unpaired — content gap (no Allman/Betts/Rossington-style VRB).
 */
export const STYLE_PAIRINGS: readonly StylePairing[] = [
  edge('sax_inspired', 'weather_report'),
  edge('jazz_rock', 'mahavishnu'),
  edge('diminished_lines', 'fripp'),
  edge('white_rock_funk', 'iommi'),
  edge('black_soul_funk', 'nile_rodgers'),
  edge('bebop_jazz_blues', 'bill_evans_sax'),
  edge('blues_rock', 'hendrix'),
  edge('blues_rock', 'led_zeppelin'),
  edge('progressive_blues', 'david_gilmour'),
  edge('modern_rock', 'morello'),
  edge('virtuoso_technique', 'eddie_van_halen'),
];

const KNOWN_CATEGORIES = new Set<string>(RIFF_PHRASE_CATEGORIES);
const KNOWN_PROFILES = new Set<string>(RIFF_GENERATOR_VRB_IDS);

function validateStylePairings(pairings: readonly StylePairing[]): void {
  const seenIds = new Set<string>();
  const seenEdges = new Set<string>();
  for (const p of pairings) {
    if (seenIds.has(p.id)) {
      throw new Error('STYLE_PAIRINGS: duplicate PairingId ' + p.id);
    }
    seenIds.add(p.id);
    const edgeKey = p.categoryId + '::' + p.profileId;
    if (edgeKey !== p.id) {
      throw new Error('STYLE_PAIRINGS: id/key collision ' + p.id + ' vs ' + edgeKey);
    }
    if (seenEdges.has(edgeKey)) {
      throw new Error('STYLE_PAIRINGS: duplicate edge ' + edgeKey);
    }
    seenEdges.add(edgeKey);
    if (!KNOWN_CATEGORIES.has(p.categoryId)) {
      throw new Error('STYLE_PAIRINGS: unknown category ' + p.categoryId);
    }
    if (!KNOWN_PROFILES.has(p.profileId)) {
      throw new Error('STYLE_PAIRINGS: unknown profile ' + p.profileId);
    }
    if (makePairingId(p.categoryId, p.profileId) !== p.id) {
      throw new Error('STYLE_PAIRINGS: PairingId mismatch for ' + p.id);
    }
  }
  for (const [env, id] of Object.entries(LEGACY_PAIRING_ENV_ALIASES)) {
    if (!seenIds.has(id)) {
      throw new Error('LEGACY_PAIRING_ENV_ALIASES: ' + env + ' -> missing pairing ' + id);
    }
  }
}

validateStylePairings(STYLE_PAIRINGS);

export const pairingById: ReadonlyMap<PairingId, StylePairing> = new Map(
  STYLE_PAIRINGS.map((p) => [p.id, p])
);

export const pairingsByCategory: ReadonlyMap<RiffPhraseCategory, readonly StylePairing[]> = (() => {
  const m = new Map<RiffPhraseCategory, StylePairing[]>();
  for (const p of STYLE_PAIRINGS) {
    const list = m.get(p.categoryId) ?? [];
    list.push(p);
    m.set(p.categoryId, list);
  }
  return m;
})();

export const pairingsByProfile: ReadonlyMap<StyleProfileId, readonly StylePairing[]> = (() => {
  const m = new Map<StyleProfileId, StylePairing[]>();
  for (const p of STYLE_PAIRINGS) {
    const list = m.get(p.profileId) ?? [];
    list.push(p);
    m.set(p.profileId, list);
  }
  return m;
})();

export function getPairingsForProfile(profileId: StyleProfileId | undefined): readonly StylePairing[] {
  if (!profileId) return [];
  return pairingsByProfile.get(profileId) ?? [];
}

export function getPairingsForCategory(
  categoryId: RiffPhraseCategory | undefined
): readonly StylePairing[] {
  if (!categoryId) return [];
  return pairingsByCategory.get(categoryId) ?? [];
}

export function getPairing(
  categoryId: RiffPhraseCategory,
  profileId: StyleProfileId
): StylePairing | undefined {
  return pairingById.get(makePairingId(categoryId, profileId));
}

function envTruthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

/** True when derived env OR any legacy alias for this edge is on. */
export function isPairingEnvEnabled(pairing: StylePairing): boolean {
  if (envTruthy(process.env[pairingEnvKey(pairing)])) return true;
  for (const [env, id] of Object.entries(LEGACY_PAIRING_ENV_ALIASES)) {
    if (id === pairing.id && envTruthy(process.env[env])) return true;
  }
  return false;
}

/**
 * Resolve enablement: explicit flags map -> env (derived + legacy) -> registry default.
 */
export function isPairingEnabled(pairing: StylePairing, flags?: PairingFlags): boolean {
  if (flags && Object.prototype.hasOwnProperty.call(flags, pairing.id)) {
    return flags[pairing.id] === true;
  }
  if (isPairingEnvEnabled(pairing)) return true;
  return pairing.defaultEnabled === true;
}

export function getEnabledPairings(
  categoryId: RiffPhraseCategory,
  flags?: PairingFlags
): StylePairing[] {
  return getPairingsForCategory(categoryId).filter((p) => isPairingEnabled(p, flags));
}

/**
 * Exactly one edge for a generate call with selected profile.
 * When multiple pairings exist for the profile and more than one is enabled,
 * pick lexicographically smallest PairingId (deterministic; no blend).
 */
export function resolvePairingForProfile(
  profileId: StyleProfileId | undefined,
  opts?: { phraseMotifSeed?: boolean; pairingFlags?: PairingFlags; categoryId?: RiffPhraseCategory }
): StylePairing | undefined {
  const pairings = getPairingsForProfile(profileId);
  if (pairings.length === 0) return undefined;

  const enabled = pairings.filter((p) => {
    if (opts?.phraseMotifSeed === true) return true;
    return isPairingEnabled(p, opts?.pairingFlags);
  });
  if (enabled.length === 0) return undefined;

  if (opts?.categoryId) {
    return enabled.find((p) => p.categoryId === opts.categoryId);
  }

  if (enabled.length === 1) return enabled[0];
  return enabled.slice().sort((a, b) => a.id.localeCompare(b.id))[0];
}