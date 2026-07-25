/**
 * RiffGen pairing enablement — single-select (radio) override layer.
 *
 * Browser: localStorage mirror (same JSON shape as Electron userData file).
 * Desktop: also writes Electron userData via IPC so generate (main) sees override.
 * Resolution: isPairingEnabled = override ?? manifest.defaultEnabled (via STYLE_PAIRINGS).
 * Enabling one pairing clears any previously force-on pairing.
 */

import {
  RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS,
  getUiPairingsForProfile,
  type RiffPhraseMotifSeedUiPairing,
} from '@composer-os/ui/riffPhraseMotifSeedUi';

export const PAIRING_ENABLEMENT_OVERRIDES_STORAGE_KEY = 'composerOs.pairingEnablementOverrides';

/** Fired after setPairingOverride / reset so generate checkbox can resync. */
export const PAIRING_ENABLEMENT_CHANGED_EVENT = 'composerOs:pairingEnablementChanged';

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

function emitChanged(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(PAIRING_ENABLEMENT_CHANGED_EVENT, { detail: { ids } })
    );
  } catch {
    /* ignore */
  }
}

function syncIpcClear(ids: string[]): void {
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (!bridge?.setPairingOverride) return;
  for (const id of ids) {
    void bridge.setPairingOverride(id, undefined);
  }
}

/** undefined = no override. */
export function getPairingOverride(id: string): boolean | undefined {
  const map = readLocalMap();
  return Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined;
}

/**
 * Set override. true is exclusive (clears other force-on keys).
 * undefined clears back to manifest default.
 */
export function setPairingOverride(id: string, value: boolean | undefined): void {
  const prev = readLocalMap();
  const cleared: string[] = [];
  const map: OverrideMap = { ...prev };

  if (value === true) {
    for (const [k, v] of Object.entries(map)) {
      if (k !== id && v === true) {
        delete map[k];
        cleared.push(k);
      }
    }
    map[id] = true;
  } else if (value === undefined) {
    delete map[id];
  } else {
    map[id] = false;
  }

  writeLocalMap(map);
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (bridge?.setPairingOverride) {
    for (const cid of cleared) {
      void bridge.setPairingOverride(cid, undefined);
    }
    void bridge.setPairingOverride(id, value);
  }
  emitChanged([...cleared, id]);
}

/**
 * Single-select: null = None (clear all). Non-null = only that id force-on.
 */
export function selectExclusiveStylePairing(id: string | null): void {
  const prev = Object.keys(readLocalMap());
  if (id === null || id === '') {
    writeLocalMap({});
    syncIpcClear(prev);
    emitChanged(prev.length > 0 ? prev : RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.map((p) => p.id));
    return;
  }
  writeLocalMap({ [id]: true });
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (bridge?.setPairingOverride) {
    for (const old of prev) {
      if (old !== id) void bridge.setPairingOverride(old, undefined);
    }
    void bridge.setPairingOverride(id, true);
  }
  const touched = Array.from(new Set([...prev, id]));
  emitChanged(touched);
}

/** Force-on pairing id if any. */
export function getExclusiveSelectedPairingId(): string | null {
  const map = readLocalMap();
  for (const [k, v] of Object.entries(map)) {
    if (v === true) return k;
  }
  return null;
}

/** Clear one override → manifest defaultEnabled. */
export function resetPairingOverride(id: string): void {
  setPairingOverride(id, undefined);
}

/** Clear all overrides (= None). */
export function resetAllPairingOverrides(): void {
  selectExclusiveStylePairing(null);
}

/**
 * Manifest defaultEnabled for UI pairings (mirrored from STYLE_PAIRINGS).
 * Kept local so browser bundle does not pull fs-backed engine store.
 */
const UI_DEFAULT_ENABLED: Record<string, boolean> = Object.fromEntries(
  RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.map((p) => [p.id, p.defaultEnabled === true])
);

export function getManifestDefaultEnabled(id: string): boolean {
  return UI_DEFAULT_ENABLED[id] === true;
}

/** Resolver: override ?? manifest.defaultEnabled. */
export function isPairingEnabled(id: string): boolean {
  const override = getPairingOverride(id);
  if (override !== undefined) return override === true;
  return getManifestDefaultEnabled(id);
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

/** Persist checkbox toggle as exclusive select / clear. */
export function writePhraseMotifSeedCheckboxForProfile(
  profileId: string | undefined,
  enabled: boolean
): void {
  const pairing = primaryUiPairingForProfile(profileId);
  if (!pairing) return;
  if (enabled) selectExclusiveStylePairing(pairing.id);
  else if (getExclusiveSelectedPairingId() === pairing.id) selectExclusiveStylePairing(null);
  else setPairingOverride(pairing.id, undefined);
}

/** Snapshot rows for Style Pairings settings panel. */
export function listStylePairingEnablementRows(): Array<{
  id: string;
  label: string;
  vrbId: string;
  motifCategory: string;
  defaultEnabled: boolean;
  override: boolean | undefined;
  enabled: boolean;
}> {
  return RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.map((p) => {
    const override = getPairingOverride(p.id);
    return {
      id: p.id,
      label: p.label,
      vrbId: p.vrbId,
      motifCategory: p.motifCategory,
      defaultEnabled: p.defaultEnabled === true,
      override,
      enabled: override !== undefined ? override === true : p.defaultEnabled === true,
    };
  });
}