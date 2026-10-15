/**
 * Disk store for pentatonic projects.
 * Uses the Composer OS files root. Does not write into the BHL export directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ensureOutputDirectoryForPreset } from '../../app-api/composerOsOutputPaths';
import {
  loadPentatonicProjectText,
  savePentatonicProjectText,
  type PentatonicProjectV1,
  type PentatonicProjectValidation,
} from './pentatonicProjectIo';

export function pentatonicProjectDir(): string {
  return ensureOutputDirectoryForPreset('pentatonic');
}

export function pentatonicProjectPath(id: string): string {
  const safe = id.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'pentatonic-project';
  return path.join(pentatonicProjectDir(), `${safe}.pentatonic.json`);
}

export function resolvePentatonicProjectPath(filePath: string): string | { error: string } {
  const resolved = path.resolve(filePath);
  const dir = path.resolve(pentatonicProjectDir());
  const relative = path.relative(dir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return { error: 'path must stay inside Pentatonic Projects' };
  if (!resolved.endsWith('.pentatonic.json')) return { error: 'path must be a .pentatonic.json project file' };
  return resolved;
}

export function savePentatonicProject(filePath: string, project: PentatonicProjectV1, overwrite = false): { path: string; bytes: number } | { error: string } {
  const resolved = resolvePentatonicProjectPath(filePath);
  if (typeof resolved !== 'string') return resolved;
  const saved = savePentatonicProjectText(project);
  if ('error' in saved) return saved;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (fs.existsSync(resolved) && !overwrite) return { error: `project already exists: ${resolved}` };
  fs.writeFileSync(resolved, saved.text, { flag: overwrite ? 'w' : 'wx' });
  return { path: resolved, bytes: Buffer.byteLength(saved.text) };
}

export function loadPentatonicProject(filePath: string): PentatonicProjectValidation {
  const resolved = resolvePentatonicProjectPath(filePath);
  if (typeof resolved !== 'string') return { ok: false, errors: [resolved.error] };
  let text: string;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  return loadPentatonicProjectText(text);
}
