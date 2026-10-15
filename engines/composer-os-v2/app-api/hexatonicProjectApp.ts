/**
 * HTTP/API save and reopen for hexatonic projects.
 * Reopening returns the stored phrase. It does not regenerate it.
 */

import path from 'node:path';
import { loadHexatonicProject, hexatonicProjectPath, resolveHexatonicProjectPath, saveHexatonicProject } from '../core/hexatonic/hexatonicProjectFile';
import type { HexatonicProjectV1 } from '../core/hexatonic/hexatonicProject';

export interface HexatonicProjectApiFailure {
  ok: false;
  error: string;
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export function apiHexatonicSaveProject(body: unknown): { ok: true; path: string; bytes: number } | HexatonicProjectApiFailure {
  const row = asRecord(body);
  const project = row.project;
  if (!project || typeof project !== 'object') return { ok: false, error: 'project is required' };
  const stored = project as HexatonicProjectV1;
  const id = typeof stored.id === 'string' ? stored.id.trim() : '';
  if (!id) return { ok: false, error: 'project.id is required' };
  const requested = typeof row.path === 'string' && row.path.trim() ? row.path.trim() : hexatonicProjectPath(id);
  const filePath = resolveHexatonicProjectPath(requested);
  if (typeof filePath !== 'string') return { ok: false, error: filePath.error };
  const saved = saveHexatonicProject(filePath, { ...stored, savedAt: stored.savedAt || new Date().toISOString() }, row.overwrite === true);
  if ('error' in saved) return { ok: false, error: saved.error };
  return { ok: true, path: saved.path, bytes: saved.bytes };
}

export function apiHexatonicOpenProject(body: unknown): { ok: true; path: string; project: HexatonicProjectV1 } | HexatonicProjectApiFailure {
  const row = asRecord(body);
  const requested = typeof row.path === 'string' ? row.path.trim() : '';
  if (!requested) return { ok: false, error: 'path is required' };
  const filePath = resolveHexatonicProjectPath(requested);
  if (typeof filePath !== 'string') return { ok: false, error: filePath.error };
  const loaded = loadHexatonicProject(filePath);
  if (!loaded.ok || !loaded.project) return { ok: false, error: loaded.errors.join('; ') || 'invalid project' };
  return { ok: true, path: path.resolve(filePath), project: loaded.project };
}
