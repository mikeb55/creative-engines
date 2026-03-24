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

  it('Try Another rolls seed and calls generate with override (same pipeline as Generate)', () => {
    expect(src).toContain('setVariationSeed(next)');
    expect(src).toContain('void generate(next)');
    expect(src).toMatch(/async \(seedOverride\?: number\)/);
    expect(src).toMatch(/seedOverride \?\? variationSeed/);
  });

  it('has optional score title field', () => {
    expect(src).toContain('Score title (optional)');
    expect(src).toMatch(/title:\s*scoreTitle\.trim/);
  });

  it('does not show a Seed label in the UI', () => {
    expect(src).not.toMatch(/>\s*Seed\s*</i);
  });

  it('receipt does not surface manifest JSON paths', () => {
    expect(src).not.toMatch(/Manifest:/);
  });
});
