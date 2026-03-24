/**
 * CLI: bump apps/composer-os-desktop/package.json patch version before electron-builder.
 * Set COMPOSER_OS_SKIP_VERSION_BUMP=1 to skip (e.g. rare repro builds).
 */
import * as fs from 'fs';
import * as path from 'path';
import { bumpPatchSemver } from './bumpDesktopVersion';

function main(): void {
  if (process.env.COMPOSER_OS_SKIP_VERSION_BUMP === '1') {
    console.log('[bump] skipped (COMPOSER_OS_SKIP_VERSION_BUMP=1)');
    return;
  }
  const root = path.resolve(__dirname, '..');
  const pkgPath = path.join(root, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: string };
  if (typeof pkg.version !== 'string') {
    throw new Error(`package.json missing version: ${pkgPath}`);
  }
  const prev = pkg.version;
  pkg.version = bumpPatchSemver(pkg.version);
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
  console.log(`[bump] Composer OS Desktop ${prev} → ${pkg.version}`);
}

main();
