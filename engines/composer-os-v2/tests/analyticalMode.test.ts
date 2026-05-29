/**
 * V91 analytical mode + V92 PDF / Guitar Pro export tests.
 */

import { normalizeChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runAnalyticalMode } from '../core/analytical/analyticalMode';
import { apiAnalyse } from '../app-api/composerOsApiCore';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 1, stdout: '', stderr: '' })),
}));

import { exportMusicXmlToPdf } from '../core/export/pdfExporter';
import { exportMusicXmlToGuitarPro } from '../core/export/guitarProExporter';

describe('runAnalyticalMode (V91)', () => {
  it('1: returns correct bar count', () => {
    const chords = ['Cmaj7', 'Dm7', 'G7', 'Cmaj7'];
    const r = runAnalyticalMode(chords, 'C');
    expect(r.bars).toHaveLength(4);
  });

  it('2: normalised symbols use normalizeChordSymbol', () => {
    const r = runAnalyticalMode(['C^7', 'F-7'], 'C');
    for (const bar of r.bars) {
      expect(bar.normalised).toBe(normalizeChordSymbol(bar.symbol));
    }
  });

  it("3: tension is 'high' for G7 in C major", () => {
    const r = runAnalyticalMode(['G7'], 'C');
    expect(r.bars[0]?.tension).toBe('high');
  });

  it("4: tension is 'low' for Cmaj7 in C major", () => {
    const r = runAnalyticalMode(['Cmaj7'], 'C');
    expect(r.bars[0]?.tension).toBe('low');
  });

  it('5: modulationSuggestions non-empty when chords leave key', () => {
    const r = runAnalyticalMode(['Dbmaj7', 'Ebmaj7', 'Abmaj7', 'Dbmaj7'], 'C');
    expect(r.modulationSuggestions.length).toBeGreaterThan(0);
  });

  it('6: warnings non-empty for unrecognised symbol', () => {
    const r = runAnalyticalMode(['???'], 'C');
    expect(r.warnings.some((w) => /unrecognised/i.test(w))).toBe(true);
  });
});

describe('apiAnalyse (V91)', () => {
  it('7: returns success: true for valid input', () => {
    const r = apiAnalyse({ chords: ['Cmaj7', 'G7'], key: 'C' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.result.bars.length).toBe(2);
    }
  });

  it('8: returns success: false for empty chords', () => {
    const r = apiAnalyse({ chords: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toMatch(/non-empty/i);
    }
  });
});

describe('MusicXML side export (V92)', () => {
  it('9: exportMusicXmlToPdf returns success: false when MuseScore absent', async () => {
    const r = await exportMusicXmlToPdf('/tmp/fake.musicxml', '/tmp/fake.pdf');
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/MuseScore not available/i);
  });

  it('10: exportMusicXmlToGuitarPro returns success: false when absent', async () => {
    const r = await exportMusicXmlToGuitarPro('/tmp/fake.musicxml', '/tmp/fake.gp');
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/MuseScore not available/i);
  });

  it('11: neither exporter throws on bad input', async () => {
    await expect(exportMusicXmlToPdf('', '')).resolves.toEqual(
      expect.objectContaining({ success: false })
    );
    await expect(exportMusicXmlToGuitarPro('', '')).resolves.toEqual(
      expect.objectContaining({ success: false })
    );
    expect(() => runAnalyticalMode(['???'], 'C')).not.toThrow();
  });
});
