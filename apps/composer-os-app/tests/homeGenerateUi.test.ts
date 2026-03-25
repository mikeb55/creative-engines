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

  it('shows a line listing loaded style module names (Barry Harris, Metheny, Triad Pairs, Bacharach from API)', () => {
    expect(src).toContain('Style modules:');
    expect(src).toMatch(/modules\.map\(\(m\)\s*=>\s*m\.name\)/);
  });

  it('does not expose numeric weight inputs (BPM/bars number fields are allowed)', () => {
    expect(src).not.toMatch(/Weights \(primary/);
  });

  it('has Try Another control', () => {
    expect(src).toMatch(/>[\s\n]*Try Another[\s\n]*</);
  });

  it('Try Another rolls variation and calls generate with override (same pipeline as Generate)', () => {
    expect(src).toContain('setVariationId(next)');
    expect(src).toContain('void generate({ variationOverride: next })');
    expect(src).toMatch(/async \(opts\?: \{ seedOverride\?: number; variationOverride\?: string \}\)/);
    expect(src).toContain('opts?.variationOverride ?? variationId');
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
