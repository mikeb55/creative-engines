/**
 * HTTP/API save and reopen for pentatonic projects.
 * Reuses the Composer OS files root. Does not call BHL project save.
 */

import path from 'node:path';
import { loadPentatonicProject, pentatonicProjectPath, resolvePentatonicProjectPath, savePentatonicProject } from '../core/pentatonic/pentatonicProjectFile';
import type { PentatonicProjectV1 } from '../core/pentatonic/pentatonicProject';

export interface PentatonicProjectApiFailure {
  ok: false;
  error: string;
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export function apiPentatonicSaveProject(body: unknown): { ok: true; path: string; bytes: number } | PentatonicProjectApiFailure {
  const row = asRecord(body);
  const project = row.project;
  if (!project || typeof project !== 'object') return { ok: false, error: 'project is required' };
  const stored = project as PentatonicProjectV1;
  const id = typeof stored.id === 'string' ? stored.id.trim() : '';
  if (!id) return { ok: false, error: 'project.id is required' };
  const requested = typeof row.path === 'string' && row.path.trim() ? row.path.trim() : pentatonicProjectPath(id);
  const filePath = resolvePentatonicProjectPath(requested);
  if (typeof filePath !== 'string') return { ok: false, error: filePath.error };
  const saved = savePentatonicProject(filePath, { ...stored, savedAt: stored.savedAt || new Date().toISOString() }, row.overwrite === true);
  if ('error' in saved) return { ok: false, error: saved.error };
  return { ok: true, path: saved.path, bytes: saved.bytes };
}

export function apiPentatonicOpenProject(body: unknown): { ok: true; path: string; project: PentatonicProjectV1 } | PentatonicProjectApiFailure {
  const row = asRecord(body);
  const requested = typeof row.path === 'string' ? row.path.trim() : '';
  if (!requested) return { ok: false, error: 'path is required' };
  const filePath = resolvePentatonicProjectPath(requested);
  if (typeof filePath !== 'string') return { ok: false, error: filePath.error };
  const loaded = loadPentatonicProject(filePath);
  if (!loaded.ok || !loaded.project) return { ok: false, error: loaded.errors.join('; ') || 'invalid project' };
  return { ok: true, path: path.resolve(filePath), project: loaded.project };
}
