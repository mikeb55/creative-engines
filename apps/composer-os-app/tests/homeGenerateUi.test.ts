/**
 * Generate page uses Style Blend (no numeric weights) and Try Another.
 */
import * as fs from 'fs';
import * as path from 'path';

describe('HomeGenerate musical UI', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf-8');

  it('shows Style Blend section', () => {
    expect(src).toContain('StyleBlendControls');
    expect(src).toMatch(/styleBlend/);
  });

  it('does not expose numeric weight inputs', () => {
    expect(src).not.toMatch(/Weights \(primary/);
    expect(src).not.toMatch(/type="number"/);
  });

  it('has Try Another control', () => {
    expect(src).toMatch(/>[\s\n]*Try Another[\s\n]*</);
  });

  it('does not show a Seed label in the UI', () => {
    expect(src).not.toMatch(/>\s*Seed\s*</i);
  });
});
