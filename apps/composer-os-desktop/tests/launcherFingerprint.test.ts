/**
 * Working-tree fingerprint: stable for unchanged trees, no git pull.
 */
import * as fs from 'fs';
import * as path from 'path';

const { computeLauncherFingerprint } = require('../scripts/launcherFingerprint.js') as {
  computeLauncherFingerprint: (repoRoot: string) => string;
};

const repoRoot = path.resolve(__dirname, '../../..');

describe('launcherFingerprint', () => {
  it('is a stable sha256 for the same working tree', () => {
    const a = computeLauncherFingerprint(repoRoot);
    const b = computeLauncherFingerprint(repoRoot);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).toBe(b);
  });

  it('does not invoke git pull or other history-changing commands', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'launcherFingerprint.js'), 'utf-8');
    expect(src).toContain("rev-parse', 'HEAD'");
    expect(src).toContain("status', '--porcelain'");
    expect(src).not.toMatch(/\['pull'/);
    expect(src).not.toMatch(/\['fetch'/);
    expect(src).not.toMatch(/\['reset'/);
    expect(src).not.toMatch(/\['checkout'/);
  });
});
