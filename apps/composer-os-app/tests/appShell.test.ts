/**
 * App shell exposes only implemented Composer OS tabs (no legacy Hybrid/Projects/Score routes).
 */
import * as fs from 'fs';
import * as path from 'path';

describe('Composer OS app shell', () => {
  const appTs = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');
  const outputsTs = fs.readFileSync(path.join(__dirname, '../src/pages/Outputs.tsx'), 'utf-8');

  it('nav is only Generate, Presets, Style Stack, Outputs', () => {
    expect(appTs).toMatch(/Generate/);
    expect(appTs).toMatch(/Presets/);
    expect(appTs).toMatch(/Style Stack/);
    expect(appTs).toMatch(/Outputs/);
    expect(appTs).not.toMatch(/\bHybrid\b/i);
    expect(appTs).not.toMatch(/\bProjects\b/);
    expect(appTs).not.toMatch(/\bScore\b/);
  });

  it('title branding is Composer OS', () => {
    expect(appTs).toContain('Composer OS');
    expect(appTs).not.toMatch(/Composer Studio/i);
  });

  it('signals outputs refresh after generation so Outputs list can reload', () => {
    expect(appTs).toContain('composer-os:outputs-changed');
    expect(outputsTs).toContain('composer-os:outputs-changed');
    expect(outputsTs).toContain('addEventListener');
  });
});
