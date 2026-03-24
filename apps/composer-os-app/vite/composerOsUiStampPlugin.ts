/**
 * Writes composer-os-ui-stamp.json to dist (and public/ for dev) and injects stamp into the bundle.
 * App shell semver is read from ../composer-os-desktop/package.json when present (single source of truth).
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type ComposerOsUiStamp = {
  productId: string;
  productName: string;
  appShellVersion: string;
  buildTimestamp: string;
  gitCommit: string;
  supportedPages: string[];
};

const SUPPORTED_PAGES = ['Generate', 'Presets', 'Style Stack', 'Outputs', 'Diagnostics'] as const;

/** Prefer Composer OS Desktop package.json version in the monorepo layout. */
export function resolveAppShellVersion(appRoot: string): string {
  const desktopPkgPath = path.join(appRoot, '..', 'composer-os-desktop', 'package.json');
  if (fs.existsSync(desktopPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8')) as { version: string };
    if (pkg.version?.trim()) return pkg.version.trim();
  }
  const pkgPath = path.join(appRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

function buildStamp(appRoot: string): ComposerOsUiStamp {
  const appShellVersion = resolveAppShellVersion(appRoot);
  let gitCommit = '';
  try {
    const repoRoot = path.resolve(appRoot, '..', '..');
    gitCommit = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  } catch {
    /* not a git checkout or git missing */
  }
  return {
    productId: 'composer-os',
    productName: 'Composer OS',
    appShellVersion,
    buildTimestamp: new Date().toISOString(),
    gitCommit,
    supportedPages: [...SUPPORTED_PAGES],
  };
}

export function composerOsUiStampPlugin(): Plugin {
  let stamp: ComposerOsUiStamp | undefined;
  const appRoot = path.resolve(__dirname, '..');

  return {
    name: 'composer-os-ui-stamp',
    config() {
      stamp = buildStamp(appRoot);
      return {
        define: {
          'import.meta.env.VITE_COMPOSER_OS_UI_STAMP_JSON': JSON.stringify(JSON.stringify(stamp)),
        },
      };
    },
    buildStart() {
      if (!stamp) stamp = buildStamp(appRoot);
      const pubDir = path.join(appRoot, 'public');
      fs.mkdirSync(pubDir, { recursive: true });
      fs.writeFileSync(
        path.join(pubDir, 'composer-os-ui-stamp.json'),
        JSON.stringify(stamp, null, 2),
        'utf-8'
      );
    },
    closeBundle() {
      if (!stamp) stamp = buildStamp(appRoot);
      const outDir = path.join(appRoot, 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, 'composer-os-ui-stamp.json'),
        JSON.stringify(stamp, null, 2),
        'utf-8'
      );
    },
  };
}
