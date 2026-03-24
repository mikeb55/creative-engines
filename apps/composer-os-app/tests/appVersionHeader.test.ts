/**
 * In-app title / header use injected stamp (not hardcoded semver literals).
 */
import * as fs from 'fs';
import * as path from 'path';

describe('App version display', () => {
  const appTs = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');

  it('document title uses embedded stamp version', () => {
    expect(appTs).toContain('Composer OS - v${embeddedStamp.appShellVersion}');
    expect(appTs).toContain('UI bundle · v');
    expect(appTs).not.toMatch(/v1\.0\.[0-9]+/);
  });
});
