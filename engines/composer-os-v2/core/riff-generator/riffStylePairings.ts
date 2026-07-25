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
import { getPairingOverride } from './pairingEnablementOverrides';

export type StyleProfileId = string;

/** Composite edge id — e.g. "blues_rock::hendrix" */
export type PairingId = `${RiffPhraseCategory}::${string}`;

/**
 * Pairing manifest entry.
 * Canonical fields: id, label, vrbId, motifCategory, defaultEnabled.
 * categoryId / profileId are aliases kept for existing call sites.
 */
export type StylePairing = {
  id: PairingId;
  /** Human-readable label (checkbox / future settings). */
  label: string;
  /** Profile / VRB id (manifest). */
  vrbId: StyleProfileId;
  /** Phrase motif category (manifest). */
  motifCategory: RiffPhraseCategory;
  /** @deprecated alias of motifCategory */
  categoryId: RiffPhraseCategory;
  /** @deprecated alias of vrbId */
  profileId: StyleProfileId;
  /** Registry default; user override / flags / env may override. Always false until Phase 2. */
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
  COMPOSER_OS_RIFF_SOUTHERNROCK_MOTIF_SEED: 'southern_rock::jimmy_herring',
};

function edge(
  motifCategory: RiffPhraseCategory,
  vrbId: StyleProfileId,
  label: string,
  defaultEnabled = false
): StylePairing {
  return {
    id: makePairingId(motifCategory, vrbId),
    label,
    vrbId,
    motifCategory,
    categoryId: motifCategory,
    profileId: vrbId,
    defaultEnabled,
  };
}

/**
 * Central many-to-many registry (pairing manifest).
 * blues_rock has two profiles (hendrix + led_zeppelin). southern_rock -> jimmy_herring (Allman-lineage southern lead).
 * Phase 2 Batch 1 default-ON: weather_report, bill_evans_sax, morello, nile_rodgers, iommi.
 * Remaining seven stay defaultEnabled false until later batches.
 */
export const STYLE_PAIRINGS: readonly StylePairing[] = [
  edge('sax_inspired', 'weather_report', 'Weather Report / sax-inspired', true),
  edge('jazz_rock', 'mahavishnu', 'Mahavishnu / jazz-rock'),
  edge('diminished_lines', 'fripp', 'Fripp / diminished lines'),
  edge('white_rock_funk', 'iommi', 'Iommi / white rock funk', true),
  edge('black_soul_funk', 'nile_rodgers', 'Nile Rodgers / black soul funk', true),
  edge('bebop_jazz_blues', 'bill_evans_sax', 'Bill Evans sax / bebop jazz blues', true),
  edge('blues_rock', 'hendrix', 'Hendrix / blues-rock'),
  edge('blues_rock', 'led_zeppelin', 'Led Zeppelin / blues-rock'),
  edge('progressive_blues', 'david_gilmour', 'Gilmour / progressive blues'),
  edge('modern_rock', 'morello', 'Morello / modern rock', true),
  edge('virtuoso_technique', 'eddie_van_halen', 'EVH / virtuoso technique'),
  edge('southern_rock', 'jimmy_herring', 'Jimmy Herring / southern rock'),
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
    if (p.categoryId !== p.motifCategory || p.profileId !== p.vrbId) {
      throw new Error('STYLE_PAIRINGS: alias mismatch for ' + p.id);
    }
    if (makePairingId(p.motifCategory, p.vrbId) !== p.id) {
      throw new Error('STYLE_PAIRINGS: PairingId mismatch for ' + p.id);
    }
    if (!p.label || !p.label.trim()) {
      throw new Error('STYLE_PAIRINGS: missing label for ' + p.id);
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
 * Resolve enablement:
 *   PairingFlags (if key present) -> user override (if set) -> env -> registry defaultEnabled.
 * Core user formula when flags/env absent: override ?? manifest.defaultEnabled.
 */
export function isPairingEnabled(pairing: StylePairing, flags?: PairingFlags): boolean;
export function isPairingEnabled(id: PairingId | string, flags?: PairingFlags): boolean;
export function isPairingEnabled(
  pairingOrId: StylePairing | PairingId | string,
  flags?: PairingFlags
): boolean {
  const pairing =
    typeof pairingOrId === 'string' ? pairingById.get(pairingOrId as PairingId) : pairingOrId;
  if (!pairing) return false;

  if (flags && Object.prototype.hasOwnProperty.call(flags, pairing.id)) {
    return flags[pairing.id] === true;
  }
  const override = getPairingOverride(pairing.id);
  if (override !== undefined) return override === true;
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