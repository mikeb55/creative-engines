/**
 * Wiring: npm script points at rebuildAndSmoke entry (no full packaging run).
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('desktop:rebuild-and-smoke wiring', () => {
  const desktopRoot = path.resolve(__dirname, '..');

  it('package.json defines desktop:rebuild-and-smoke', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    const s = pkg.scripts?.['desktop:rebuild-and-smoke'];
    expect(s).toBeDefined();
    expect(s).toContain('rebuildAndSmoke');
  });

  it('entry file exists', () => {
    expect(fs.existsSync(path.join(desktopRoot, 'install', 'rebuildAndSmoke.ts'))).toBe(true);
  });
});
