/**
 * Open output folder: path must stay under composer library root (sync checks only).
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { isPathUnderComposerRoot } from '../app-api/composerOsOutputPaths';

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

export function runOpenOutputFolderGateTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, fn: () => boolean) => results.push({ name, ok: fn() });

  t('Open folder gate: preset subfolder under root', testInsideSubfolderIsAllowed);
  t('Open folder gate: path outside library rejected', testOutsideTreeRejected);
  t('Open folder gate: composer root equals target', testRootEqualsComposerRoot);

  return results;
}
