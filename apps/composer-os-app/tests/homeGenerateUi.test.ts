/**
 * Generate page — mode-driven UI (no Style Stack / blend controls on main form).
 */
import * as fs from 'fs';
import * as path from 'path';

describe('HomeGenerate mode-driven UI', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf-8');

  it('does not import Style Blend or style module dropdowns (retired from Generate)', () => {
    expect(src).not.toContain('StyleBlendControls');
    expect(src).not.toContain('useStyleModules');
    expect(src).not.toContain('Style stack');
    expect(src).not.toContain('Style modules:');
  });

  it('uses fixed default score style stack constants for duo/ECM (not user-facing)', () => {
    expect(src).toContain('DEFAULT_SCORE_STYLE_STACK');
    expect(src).toContain('barry_harris');
  });

  it('does not expose numeric weight inputs (BPM/bars number fields are allowed)', () => {
    expect(src).not.toMatch(/Weights \(primary/);
  });

  it('has Try Another control', () => {
    expect(src).toMatch(/>[\s\n]*Try Another[\s\n]*</);
  });

  it('Try Another rolls variation and calls generate with override', () => {
    expect(src).toContain('setVariationId(next)');
    expect(src).toContain('void generate({ variationOverride: next })');
    expect(src).toMatch(/async \(opts\?: \{ seedOverride\?: number; variationOverride\?: string \}\)/);
    expect(src).toContain('opts?.variationOverride ?? variationId');
  });

  it('has optional title field', () => {
    expect(src).toContain('Title (optional)');
    expect(src).toMatch(/title:\s*scoreTitle\.trim/);
  });

  it('exposes chord progression field for Guitar–Bass Duo (custom harmony when non-empty)', () => {
    expect(src).toContain('Chord progression (optional)');
    expect(src).toContain('chordProgressionText');
    expect(src).toContain("harmonyMode: 'custom'");
    expect(src).not.toMatch(/guitar_bass_duo[^\n]*harmonyMode:\s*'builtin'/);
  });

  it('does not show a Seed label in the UI', () => {
    expect(src).not.toMatch(/>\s*Seed\s*</i);
  });

  it('receipt does not surface manifest JSON paths', () => {
    expect(src).not.toMatch(/Manifest:/);
  });

  it('shows mode description card and result summary', () => {
    expect(src).toContain('About this mode');
    expect(src).toContain('Result summary');
    expect(src).toContain('Output type:');
    expect(src).toContain('getModeUx');
  });

  it('merges API presets into Generate mode list (same source as Presets tab)', () => {
    expect(src).toContain('mergePresetsWithRegistry');
    expect(src).toContain('APP_PRESET_REGISTRY');
    expect(src).toContain('../constants/composerOsPresetUi');
  });

  it('preflights custom duo harmony with shared engine parser', () => {
    expect(src).toContain('parseChordProgressionInput');
    expect(src).toContain('../utils/chordProgressionClient');
  });

  it('disables unsupported modes in the Mode dropdown like Presets (coming soon)', () => {
    expect(src).toContain('disabled={!m.supported}');
    expect(src).toMatch(/coming soon/);
  });

  it('uses creative control terminology', () => {
    expect(src).toContain('Creative control');
    expect(src).toContain('name="creativeLevel"');
    expect(src).not.toMatch(/>\s*Stability\s*</);
  });

  it('renders visible Variation toggle (label + Off/On) after nudge copy and passes variationEnabled to generate', () => {
    const nudge = 'How much the engine nudges the variation — not the form of the piece.';
    expect(src.indexOf(nudge)).toBeGreaterThan(-1);
    expect(src.indexOf("marginTop: '16px'")).toBeGreaterThan(src.indexOf(nudge));
    expect(src.indexOf("marginTop: '16px'")).toBeGreaterThan(src.indexOf("Surprise"));
    expect(src).toMatch(/<label[^>]*>\s*Variation\s*<\/label>/);
    expect(src).toContain("<option value=\"off\">Off</option>");
    expect(src).toContain("<option value=\"on\">On</option>");
    expect(src).toContain('variationEnabled: variationEnabled');
    expect(src).toContain('setVariationEnabled');
  });

  it('labels number of bars and ensemble size for Big Band', () => {
    expect(src).toContain('Number of bars');
    expect(src).toContain('Ensemble size');
  });

  it('shows experimental help when pairing flag is set', () => {
    expect(src).toContain('EXPERIMENTAL_HELP');
  });

  it('renders mode-specific blocks for ECM, Song, Big Band, String Quartet, Riff', () => {
    expect(src).toContain('ECM chamber mode');
    expect(src).toContain("presetId === 'song_mode'");
    expect(src).toContain("presetId === 'big_band'");
    expect(src).toContain("presetId === 'string_quartet'");
    expect(src).toContain("presetId === 'riff_generator'");
    expect(src).toContain('Riff options');
  });

  it('maps Big Band pairing with default songwriter constant', () => {
    expect(src).toContain('BIG_BAND_DEFAULT_SONGWRITER_STYLE');
  });
});
