/**
 * Persistent per-pairing enablement overrides (user preference layer).
 *
 * value boolean = force on/off; undefined / missing key = no override -> manifest defaultEnabled.
 * Default store: in-memory. Electron main configures JSON under app.getPath('userData').
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
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
 * true / false force enablement.
 */
export function setPairingOverride(id: PairingId | string, value: boolean | undefined): void {
  const m = load();
  if (value === undefined) {
    delete m[id];
  } else {
    m[id] = value;
  }
  persist();
}

/** Snapshot of explicit overrides only (no unset keys). */
export function getAllPairingOverrides(): Readonly<Record<string, boolean>> {
  return { ...load() };
}

/** Tests: clear memory (+ wipe file when path configured). */
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