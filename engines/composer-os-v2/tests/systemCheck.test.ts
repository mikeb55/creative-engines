/**
 * System check — repo root resolution (no subprocess in default suite).
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveComposerOsRepoRoot } from '../app-api/systemCheck';

export function runSystemCheckTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const root = resolveComposerOsRepoRoot();
  const enginePkg = path.join(root, 'engines', 'composer-os-v2', 'package.json');
  out.push({
    ok: fs.existsSync(enginePkg),
    name: 'resolveComposerOsRepoRoot finds composer-os-v2 package.json',
  });
  return out;
}
