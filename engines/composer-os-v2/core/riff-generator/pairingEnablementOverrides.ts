/**
 * Persistent per-pairing enablement overrides (user preference layer).
 *
 * value boolean = force on/off; undefined / missing key = no override -> manifest defaultEnabled.
 * Single-select: setting true clears any previously force-on pairing (at most one active).
 * Default store: in-memory. Electron main configures JSON under app.getPath("userData").
 */
import * as fs from 'fs';
import * as path from 'path';
import type { PairingId } from './riffStylePairings';

/** Relative filename under Electron userData. */
export const PAIRING_ENABLEMENT_OVERRIDES_FILENAME = 'pairing-enablement-overrides.json';

let storePath: string | null = null;
/** Loaded map; absent key = no override. */
let memory: Record<string, boolean> = {};
let loaded = false;

/** Point store at a JSON file (Electron userData / tests). null = memory only. */
export function configurePairingOverrideStorePath(filePath: string | null): void {
  storePath = filePath;
  memory = {};
  loaded = false;
}

export function getPairingOverrideStorePath(): string | null {
  return storePath;
}

function load(): Record<string, boolean> {
  if (loaded) return memory;
  loaded = true;
  if (!storePath) return memory;
  try {
    if (!fs.existsSync(storePath)) return memory;
    const raw = JSON.parse(fs.readFileSync(storePath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return memory;
    const next: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'boolean') next[k] = v;
    }
    memory = next;
  } catch {
    memory = {};
  }
  return memory;
}

function persist(): void {
  if (!storePath) return;
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(memory, null, 2) + '\n', 'utf8');
  } catch {
    /* ignore disk errors — memory still authoritative for process */
  }
}

/** undefined = no override (fall back to manifest defaultEnabled). */
export function getPairingOverride(id: PairingId | string): boolean | undefined {
  const m = load();
  return Object.prototype.hasOwnProperty.call(m, id) ? m[id] : undefined;
}

/**
 * Set override. undefined clears key -> back to manifest default.
 * true = force on (exclusive: clears any other force-on keys first).
 * false = force off.
 */
export function setPairingOverride(id: PairingId | string, value: boolean | undefined): void {
  const m = load();
  if (value === true) {
    for (const k of Object.keys(m)) {
      if (k !== id && m[k] === true) delete m[k];
    }
    m[id] = true;
  } else if (value === undefined) {
    delete m[id];
  } else {
    m[id] = false;
  }
  persist();
}

/**
 * Single-select: null = None (clear all overrides).
 * Non-null = only that id force-on; wipe other overrides.
 */
export function selectExclusiveStylePairing(id: PairingId | string | null): void {
  load();
  if (id === null || id === '') {
    memory = {};
  } else {
    memory = { [id]: true };
  }
  persist();
}

/** Currently force-on pairing id, if any (single-select). */
export function getExclusiveSelectedPairingId(): string | null {
  const m = load();
  for (const [k, v] of Object.entries(m)) {
    if (v === true) return k;
  }
  return null;
}

/** Snapshot of explicit overrides only (no unset keys). */
export function getAllPairingOverrides(): Readonly<Record<string, boolean>> {
  return { ...load() };
}

/** Tests: clear memory + wipe file when path configured. */
export function resetPairingOverridesForTests(): void {
  memory = {};
  loaded = true;
  if (storePath) {
    try {
      if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
    } catch {
      /* ignore */
    }
  }
}