/**
 * Packaged CommonJS must read Bryant resources from the resources directory.
 * The process cwd is outside the repository. Source-tree lookup is not available.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(__filename);
const esbuild = require('esbuild') as typeof import('esbuild');
const { copyWpsBryantResources } = require('../scripts/copy-wps-bryant-resources') as {
  copyWpsBryantResources: (destDir: string) => string;
};

const repoRoot = path.resolve(__dirname, '../../..');
const gates = path.join(repoRoot, 'engines', 'composer-os-v2', 'core', 'wwh', 'wps', 'wpsBryantGates.ts');
const disposables: string[] = [];

function disposable(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wps-bryant-cjs-'));
  disposables.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of disposables.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('WPS Bryant packaged resource load', () => {
  it('loads both resources and ranks candidates from a CommonJS bundle outside the repo', async () => {
    const resources = path.join(disposable(), 'Resources');
    const work = disposable();
    const cwd = disposable();
    copyWpsBryantResources(path.join(resources, 'wps-bryant'));
    const entry = path.join(work, 'entry.cjs');
    writeFileSync(
      entry,
      [
        "const gates = require(" + JSON.stringify(gates) + ");",
        "const spec = gates.loadBryantSignature();",
        "const prefs = gates.readBryantPreferencesLog();",
        "if (!prefs.includes('Black Aura')) throw new Error('preferences missing');",
        "if (spec.candidateRule.autoSelect !== false) throw new Error('signature missing');",
        "const devices = ['LIQUID','TRITONE_FIELDS','FOREIGN_BASS_GRIP','HOOK_EROSION'];",
        "const ranked = gates.rankBryantCandidates(devices.map((leadDevice, index) => ({",
        "  id: 'c' + index, role: 'SOLO_1', chorus: 1, seed: 100 + index, leadDevice,",
        "  signatureDevices: [leadDevice], antiClichePass: true, soloContrast: 10 - index,",
        "})));",
        "if (ranked.length !== 1 || ranked[0].selected !== null || ranked[0].presentToMike.length !== 2) {",
        "  throw new Error('gate failed');",
        "}",
        "console.log('WPS_BRYANT_CJS_OK');",
      ].join('\n')
    );
    const outfile = path.join(resources, 'desktop-ipc.bundle.cjs');
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile,
      target: 'node18',
      banner: {
        js: 'if (process.env.WPS_RESOURCES_PATH) process.resourcesPath = process.env.WPS_RESOURCES_PATH;',
      },
    });
    const ok = runBundle(outfile, resources, cwd);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('WPS_BRYANT_CJS_OK');

    rmSync(path.join(resources, 'wps-bryant'), { recursive: true, force: true });
    const missing = runBundle(outfile, resources, cwd);
    expect(missing.status).not.toBe(0);
  });
});

function runBundle(bundle: string, resources: string, cwd: string): { status: number | null; stdout: string; stderr: string } {
  mkdirSync(cwd, { recursive: true });
  const env = { ...process.env };
  delete env.COMPOSER_OS_REPO_ROOT;
  delete env.COMPOSER_OS_WPS_BRYANT_DIR;
  env.WPS_RESOURCES_PATH = resources;
  const result = spawnSync(process.execPath, [bundle], {
    cwd,
    env,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
