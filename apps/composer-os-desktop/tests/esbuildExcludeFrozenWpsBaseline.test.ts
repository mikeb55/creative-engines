/**
 * Desktop packaging must drop the frozen WPS V1.1 snapshot.
 * Those files keep import paths written for core/wwh/wps/, so esbuild cannot
 * resolve them from baseline/v1.1/. Live modules under core/wwh/wps/ stay.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

const require = createRequire(__filename);
const esbuild = require('esbuild') as typeof import('esbuild');
const {
  pathIsFrozenWpsBaseline,
  shouldStubFromBundle,
  composerOsExcludeTestFilesPlugin,
} = require('../scripts/esbuild-exclude-test-files-plugin') as {
  pathIsFrozenWpsBaseline: (filePath: string) => boolean;
  shouldStubFromBundle: (filePath: string) => boolean;
  composerOsExcludeTestFilesPlugin: import('esbuild').Plugin;
};

describe('frozen WPS baseline packaging boundary', () => {
  it('stubs the V1.1 snapshot and leaves the live WPS tree', () => {
    const live = '/repo/engines/composer-os-v2/core/wwh/wps/wpsAssess.ts';
    const bryant = '/repo/engines/composer-os-v2/core/wwh/wps/wpsBryantGates.ts';
    const frozen = '/repo/engines/composer-os-v2/core/wwh/wps/baseline/v1.1/wpsAssess.ts';
    const frozenCli = '/repo/engines/composer-os-v2/core/wwh/wps/baseline/v1.1/scripts/wpsCli.ts';
    expect(pathIsFrozenWpsBaseline(frozen)).toBe(true);
    expect(pathIsFrozenWpsBaseline(frozenCli)).toBe(true);
    expect(pathIsFrozenWpsBaseline(live)).toBe(false);
    expect(pathIsFrozenWpsBaseline(bryant)).toBe(false);
    expect(shouldStubFromBundle(frozen)).toBe(true);
    expect(shouldStubFromBundle(live)).toBe(false);
    expect(shouldStubFromBundle('/repo/engines/composer-os-v2/core/foo.test.ts')).toBe(true);
    expect(shouldStubFromBundle(live.replace(/\//g, '\\'))).toBe(false);
    expect(shouldStubFromBundle(frozen.replace(/\//g, '\\'))).toBe(true);
  });

  it('bundles live WPS and does not parse broken baseline imports', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wps-bundle-boundary-'));
    const liveDir = path.join(root, 'core', 'wwh', 'wps');
    const frozenDir = path.join(liveDir, 'baseline', 'v1.1');
    fs.mkdirSync(frozenDir, { recursive: true });
    fs.writeFileSync(
      path.join(liveDir, 'wpsAssess.ts'),
      'export const WPS_VERSION = "1.5";\nexport function runWps() { return "live-wps"; }\n'
    );
    fs.writeFileSync(
      path.join(frozenDir, 'wpsAssess.ts'),
      'export const WPS_VERSION = "1.1";\nimport { missing } from "../../does-not-exist";\nexport const FROZEN = "frozen-v1.1";\n'
    );
    const entry = path.join(root, 'entry.js');
    fs.writeFileSync(
      entry,
      [
        'const live = require("./core/wwh/wps/wpsAssess.ts");',
        'const frozen = require("./core/wwh/wps/baseline/v1.1/wpsAssess.ts");',
        'module.exports = { live: live.WPS_VERSION, run: live.runWps(), frozen: frozen.WPS_VERSION, frozenMark: frozen.FROZEN };',
      ].join('\n')
    );
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      platform: 'node',
      format: 'cjs',
      plugins: [composerOsExcludeTestFilesPlugin],
    });
    const text = result.outputFiles[0].text;
    expect(text).toContain('1.5');
    expect(text).toContain('live-wps');
    expect(text).not.toContain('frozen-v1.1');
    expect(text).not.toContain('does-not-exist');
    const loaded = require(writeBundle(root, text)) as {
      live: string;
      run: string;
      frozen: string | undefined;
      frozenMark: string | undefined;
    };
    expect(loaded.live).toBe('1.5');
    expect(loaded.run).toBe('live-wps');
    expect(loaded.frozen).toBeUndefined();
    expect(loaded.frozenMark).toBeUndefined();
  });
});

function writeBundle(root: string, text: string): string {
  const out = path.join(root, 'bundle.cjs');
  fs.writeFileSync(out, text);
  return out;
}
