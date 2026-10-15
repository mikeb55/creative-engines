/**
 * Disk store for hexatonic projects.
 * Uses the Composer OS files root. Does not write Pentatonic or BHL projects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ensureOutputDirectoryForPreset } from '../../app-api/composerOsOutputPaths';
import {
  loadHexatonicProjectText,
  saveHexatonicProjectText,
  type HexatonicProjectV1,
  type HexatonicProjectValidation,
} from './hexatonicProjectIo';

export function hexatonicProjectDir(): string {
  return ensureOutputDirectoryForPreset('hexatonic');
}

export function hexatonicProjectPath(id: string): string {
  const safe = id.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'hexatonic-project';
  return path.join(hexatonicProjectDir(), `${safe}.hexatonic.json`);
}

export function resolveHexatonicProjectPath(filePath: string): string | { error: string } {
  if (!filePath || filePath.includes('\0')) return { error: 'unsafe path' };
  const resolved = path.resolve(filePath);
  const dir = path.resolve(hexatonicProjectDir());
  const relative = path.relative(dir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return { error: 'path must stay inside Hexatonic Projects' };
  if (!resolved.endsWith('.hexatonic.json')) return { error: 'path must be a .hexatonic.json project file' };
  if (resolved.endsWith('.pentatonic.json') || resolved.endsWith('.bhl.json')) return { error: 'path must be a .hexatonic.json project file' };
  return resolved;
}

export function saveHexatonicProject(filePath: string, project: HexatonicProjectV1, overwrite = false): { path: string; bytes: number } | { error: string } {
  const resolved = resolveHexatonicProjectPath(filePath);
  if (typeof resolved !== 'string') return resolved;
  const saved = saveHexatonicProjectText(project);
  if ('error' in saved) return saved;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (fs.existsSync(resolved) && !overwrite) return { error: `project already exists: ${resolved}` };
  fs.writeFileSync(resolved, saved.text, { flag: overwrite ? 'w' : 'wx' });
  return { path: resolved, bytes: Buffer.byteLength(saved.text) };
}

export function loadHexatonicProject(filePath: string): HexatonicProjectValidation {
  const resolved = resolveHexatonicProjectPath(filePath);
  if (typeof resolved !== 'string') return { ok: false, errors: [resolved.error] };
  let text: string;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  return loadHexatonicProjectText(text);
}
