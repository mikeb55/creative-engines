/**
 * In-app title / header use injected stamp (not hardcoded semver literals).
 */
import * as fs from 'fs';
import * as path from 'path';

describe('App version display', () => {
  const appTs = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');

  it('document title uses the release display title', () => {
    expect(appTs).toContain('document.title = m.displayTitle');
    expect(appTs).toContain('desktopDisplayTitle');
    expect(appTs).toContain('git ${embeddedStamp.gitCommit.slice(0, 7)}');
    expect(appTs).not.toContain('Composer OS - v${embeddedStamp.appShellVersion}');
    expect(appTs).not.toMatch(/v1\.0\.[0-9]+/);
  });
});
