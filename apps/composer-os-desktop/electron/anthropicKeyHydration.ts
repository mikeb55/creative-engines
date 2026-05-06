/**
 * Production PDF/vision path reads `process.env.ANTHROPIC_API_KEY` (see `pdfChordReader.ts`).
 * Explorer-launched Windows GUIs often lack User env inheritance; registry hydration fixes users who
 * set HKCU persistent vars. This module adds Electron safeStorage (DPAPI-backed on Windows) +
 * on-disk ciphertext under userData so secrets survive restarts without relying on shell env.
 *
 * Precedence: existing env → registry/PowerShell hydration → safeStorage file (`anthropic-api-key.bin`).
 * Optional next tier (not implemented): keytar / Credential Manager, backend proxy tokens.
 */
import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  anthropicSecretKeyPathForUserData,
} from './anthropicKeyPaths';
import { hydrateAnthropicKeyFromWindowsStores } from './winAnthropicEnv';

export { anthropicSecretKeyPathForUserData } from './anthropicKeyPaths';
export { ANTHROPIC_SECRET_FILENAME, ANTHROPIC_SECRET_RELATIVE_DIR } from './anthropicKeyPaths';

export function getAnthropicSecretKeyPath(): string {
  return anthropicSecretKeyPathForUserData(app.getPath('userData'));
}

function envKeyPresent(): boolean {
  const cur = process.env.ANTHROPIC_API_KEY;
  return typeof cur === 'string' && cur.trim() !== '';
}

/** Try encrypted blob written by {@link saveAnthropicApiKeyToSecretStore}. */
function hydrateFromSafeStorageFile(): void {
  if (!safeStorage.isEncryptionAvailable()) return;
  try {
    const fp = getAnthropicSecretKeyPath();
    if (!existsSync(fp)) return;
    const buf = readFileSync(fp);
    const plain = safeStorage.decryptString(buf);
    if (typeof plain === 'string' && plain.trim() !== '') {
      process.env.ANTHROPIC_API_KEY = plain.trim();
    }
  } catch {
    /* corrupt file or DPAPI failure — leave env unset */
  }
}

/**
 * Fill `process.env.ANTHROPIC_API_KEY` when missing: registry stores, then DPAPI file.
 * Idempotent; safe to call before PDF IPC and at startup.
 */
export function hydrateAnthropicKeyFromAllSources(): void {
  if (envKeyPresent()) return;
  hydrateAnthropicKeyFromWindowsStores();
  if (envKeyPresent()) return;
  hydrateFromSafeStorageFile();
}

export type SaveAnthropicKeyResult = { ok: true } | { ok: false; error: string };

/** Encrypt with OS-backed safeStorage and persist; also sets process.env for current session. */
export function saveAnthropicApiKeyToSecretStore(plainKey: string): SaveAnthropicKeyResult {
  const t = typeof plainKey === 'string' ? plainKey.trim() : '';
  if (!t) return { ok: false, error: 'empty' };
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, error: 'safeStorage encryption not available on this system' };
  }
  try {
    const fp = getAnthropicSecretKeyPath();
    mkdirSync(path.dirname(fp), { recursive: true });
    const enc = safeStorage.encryptString(t);
    writeFileSync(fp, enc);
    process.env.ANTHROPIC_API_KEY = t;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
