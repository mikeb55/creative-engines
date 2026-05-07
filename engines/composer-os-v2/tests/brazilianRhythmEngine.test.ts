/**
 * Brazilian rhythm engine — not in composer smoke allowlist.
 */

import { BRAZILIAN_RHYTHM_PRESETS, getBrazilianRhythmPresetById } from '../core/rhythm/brazilianRhythmPresets';
import { exportBrazilianRhythmToMusicXml } from '../core/rhythm/brazilianRhythmMusicXmlExporter';
import { validateAllBrazilianRhythmPresets } from '../core/rhythm/brazilianRhythmValidate';

describe('brazilianRhythmEngine', () => {
  it('loads all 9 presets', () => {
    expect(BRAZILIAN_RHYTHM_PRESETS.length).toBe(9);
    for (const p of BRAZILIAN_RHYTHM_PRESETS) {
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('lane lengths match gridSteps for all presets', () => {
    for (const p of BRAZILIAN_RHYTHM_PRESETS) {
      const g = p.meter.gridSteps;
      expect(p.lanes.low.length).toBe(g);
      expect(p.lanes.high.length).toBe(g);
      expect(p.lanes.jingle.length).toBe(g);
      expect(p.lanes.ghost.length).toBe(g);
    }
  });

  it('exportBrazilianRhythmToMusicXml(bossa-nova-basic) returns string', () => {
    const preset = getBrazilianRhythmPresetById('bossa-nova-basic');
    expect(preset).toBeDefined();
    const xml = exportBrazilianRhythmToMusicXml(preset!, 2);
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(100);
  });

  it('bossa-nova-basic XML has 2/4 beats and drum kit metadata', () => {
    const preset = getBrazilianRhythmPresetById('bossa-nova-basic')!;
    const xml = exportBrazilianRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>2</beats>');
    expect(xml).toContain('<midi-channel>10</midi-channel>');
    expect(xml).toContain('<instrument-sound>drum.kit</instrument-sound>');
    expect(xml).not.toContain('<chord/>');
  });

  it('baiao-jazz-4-4 XML has 4/4 beats', () => {
    const preset = getBrazilianRhythmPresetById('baiao-jazz-4-4')!;
    const xml = exportBrazilianRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>4</beats>');
  });

  it('validateAllBrazilianRhythmPresets passes all 9', () => {
    const m = validateAllBrazilianRhythmPresets(BRAZILIAN_RHYTHM_PRESETS);
    expect(m.size).toBe(9);
    for (const [, r] of m) {
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
    }
  });
});
