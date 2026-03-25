/**
 * Open output folder: path must stay under composer library root (sync checks only).
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { isPathUnderComposerRoot, resolveOpenFolderTarget } from '../app-api/composerOsOutputPaths';

function testInsideSubfolderIsAllowed(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  const inside = path.join(root, 'Guitar-Bass Duos');
  fs.mkdirSync(inside, { recursive: true });
  return isPathUnderComposerRoot(root, inside);
}

function testOutsideTreeRejected(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'other-'));
  return !isPathUnderComposerRoot(root, outside);
}

function testRootEqualsComposerRoot(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  return isPathUnderComposerRoot(root, root);
}

function testOpenFolderTargetUnwrapsMeta(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  const duos = path.join(root, 'Guitar-Bass Duos');
  const meta = path.join(duos, '_meta');
  fs.mkdirSync(meta, { recursive: true });
  const r = resolveOpenFolderTarget(root, { path: meta });
  if (!r.ok) return false;
  return path.resolve(r.target) === path.resolve(duos);
}

function testWin32MixedCasePathUnderRoot(): boolean {
  if (process.platform !== 'win32') return true;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  const inside = path.join(root, 'Guitar-Bass Duos');
  fs.mkdirSync(inside, { recursive: true });
  const mixed = path.join(root, 'guitar-bass duos');
  return isPathUnderComposerRoot(root, mixed);
}

function testResolveOpenFolderAcceptsForwardSlashes(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
  const duos = path.join(root, 'Guitar-Bass Duos');
  fs.mkdirSync(duos, { recursive: true });
  const forward = duos.replace(/\\/g, '/');
  const r = resolveOpenFolderTarget(root, { path: forward });
  return r.ok && path.resolve(r.target) === path.resolve(duos);
}

export function runOpenOutputFolderGateTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, fn: () => boolean) => results.push({ name, ok: fn() });

  t('Open folder gate: preset subfolder under root', testInsideSubfolderIsAllowed);
  t('Open folder gate: path outside library rejected', testOutsideTreeRejected);
  t('Open folder gate: composer root equals target', testRootEqualsComposerRoot);
  t('Open folder gate: _meta unwraps to preset folder', testOpenFolderTargetUnwrapsMeta);
  t('Open folder gate: Windows paths compare case-insensitively under root', testWin32MixedCasePathUnderRoot);
  t('Open folder gate: forward slashes resolve under library root', testResolveOpenFolderAcceptsForwardSlashes);

  return results;
}
