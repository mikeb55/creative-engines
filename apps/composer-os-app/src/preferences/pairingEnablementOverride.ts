/**
 * RiffGen pairing enablement — routes checkbox through resolver + persistent override.
 *
 * Browser: localStorage mirror (same JSON shape as Electron userData file).
 * Desktop: also writes Electron userData via IPC so generate (main) sees override.
 * Resolution: isPairingEnabled = override ?? manifest.defaultEnabled (via STYLE_PAIRINGS).
 */

import {
  getUiPairingsForProfile,
  type RiffPhraseMotifSeedUiPairing,
} from '@composer-os/ui/riffPhraseMotifSeedUi';

export const PAIRING_ENABLEMENT_OVERRIDES_STORAGE_KEY = 'composerOs.pairingEnablementOverrides';

type OverrideMap = Record<string, boolean>;

function readLocalMap(): OverrideMap {
  try {
    const raw = localStorage.getItem(PAIRING_ENABLEMENT_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: OverrideMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocalMap(map: OverrideMap): void {
  try {
    localStorage.setItem(PAIRING_ENABLEMENT_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** undefined = no override. */
export function getPairingOverride(id: string): boolean | undefined {
  const map = readLocalMap();
  return Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined;
}

/** undefined clears back to manifest default. */
export function setPairingOverride(id: string, value: boolean | undefined): void {
  const map = readLocalMap();
  if (value === undefined) delete map[id];
  else map[id] = value;
  writeLocalMap(map);
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (bridge?.setPairingOverride) {
    void bridge.setPairingOverride(id, value);
  }
}

/**
 * Manifest defaultEnabled for UI pairings (all false today).
 * Kept local so browser bundle does not pull fs-backed engine store.
 */
const UI_DEFAULT_ENABLED: Record<string, boolean> = Object.fromEntries(
  (
    [
      'sax_inspired::weather_report',
      'jazz_rock::mahavishnu',
      'diminished_lines::fripp',
      'white_rock_funk::iommi',
      'black_soul_funk::nile_rodgers',
      'bebop_jazz_blues::bill_evans_sax',
      'blues_rock::hendrix',
      'blues_rock::led_zeppelin',
      'progressive_blues::david_gilmour',
      'modern_rock::morello',
      'virtuoso_technique::eddie_van_halen',
      'southern_rock::jimmy_herring',
    ] as const
  ).map((id) => [id, false])
);

/** Resolver: override ?? manifest.defaultEnabled. */
export function isPairingEnabled(id: string): boolean {
  const override = getPairingOverride(id);
  if (override !== undefined) return override === true;
  return UI_DEFAULT_ENABLED[id] === true;
}

/** Primary UI pairing for a VRB (lexicographically first when multiple). */
export function primaryUiPairingForProfile(
  profileId: string | undefined
): RiffPhraseMotifSeedUiPairing | undefined {
  const pairings = getUiPairingsForProfile(profileId);
  if (pairings.length === 0) return undefined;
  if (pairings.length === 1) return pairings[0];
  return pairings.slice().sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** Checkbox checked state from resolver (not raw defaultEnabled). */
export function readPhraseMotifSeedCheckboxForProfile(profileId: string | undefined): boolean {
  const pairing = primaryUiPairingForProfile(profileId);
  if (!pairing) return false;
  return isPairingEnabled(pairing.id);
}

/** Persist checkbox toggle as pairing override (true/false). */
export function writePhraseMotifSeedCheckboxForProfile(
  profileId: string | undefined,
  enabled: boolean
): void {
  const pairing = primaryUiPairingForProfile(profileId);
  if (!pairing) return;
  setPairingOverride(pairing.id, enabled);
}