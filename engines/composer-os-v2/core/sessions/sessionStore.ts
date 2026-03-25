/**
 * Read/write Composer session JSON files (local disk).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ComposerSessionV1 } from './sessionTypes';
import { SESSION_FORMAT_VERSION } from './sessionTypes';
import { validateSessionPayload } from './sessionValidation';

export function saveSessionFile(filepath: string, session: ComposerSessionV1): { ok: boolean; error?: string } {
  try {
    const dir = path.dirname(filepath);
    fs.mkdirSync(dir, { recursive: true });
    const body: ComposerSessionV1 = {
      ...session,
      formatVersion: SESSION_FORMAT_VERSION,
      savedAt: session.savedAt || new Date().toISOString(),
    };
    fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export function loadSessionFile(filepath: string): {
  ok: boolean;
  session?: ComposerSessionV1;
  errors: string[];
} {
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const v = validateSessionPayload(parsed);
    if (!v.ok || !v.session) return { ok: false, errors: v.errors };
    return { ok: true, session: v.session, errors: [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`failed to load session: ${msg}`] };
  }
}
