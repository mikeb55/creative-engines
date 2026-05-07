/**
 * Second line rhythm engine — not in composer smoke allowlist.
 */

import { SECOND_LINE_RHYTHM_PRESETS, getSecondLineRhythmPresetById } from '../core/rhythm/secondLineRhythmPresets';
import { exportSecondLineRhythmToMusicXml } from '../core/rhythm/secondLineRhythmMusicXmlExporter';
import { validateAllSecondLineRhythmPresets } from '../core/rhythm/secondLineRhythmValidate';

describe('secondLineRhythmEngine', () => {
  it('loads all 8 presets', () => {
    expect(SECOND_LINE_RHYTHM_PRESETS.length).toBe(8);
    for (const p of SECOND_LINE_RHYTHM_PRESETS) {
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('lane lengths match gridSteps for all presets', () => {
    for (const p of SECOND_LINE_RHYTHM_PRESETS) {
      const g = p.meter.gridSteps;
      expect(p.lanes.low.length).toBe(g);
      expect(p.lanes.high.length).toBe(g);
      expect(p.lanes.jingle.length).toBe(g);
      expect(p.lanes.ghost.length).toBe(g);
    }
  });

  it('brass-band-6-8 gridSteps === 12', () => {
    const p = getSecondLineRhythmPresetById('brass-band-6-8');
    expect(p?.meter.gridSteps).toBe(12);
  });

  it('exportSecondLineRhythmToMusicXml(second-line-basic) returns string', () => {
    const preset = getSecondLineRhythmPresetById('second-line-basic');
    expect(preset).toBeDefined();
    const xml = exportSecondLineRhythmToMusicXml(preset!, 2);
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(100);
  });

  it('second-line-basic has 4/4 beats in XML', () => {
    const preset = getSecondLineRhythmPresetById('second-line-basic')!;
    const xml = exportSecondLineRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>4</beats>');
    expect(xml).toContain('<midi-channel>10</midi-channel>');
    expect(xml).not.toContain('<chord/>');
  });

  it('brass-band-6-8 has 6/8 beats in XML', () => {
    const preset = getSecondLineRhythmPresetById('brass-band-6-8')!;
    const xml = exportSecondLineRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>6</beats>');
  });

  it('validateAllSecondLineRhythmPresets passes all 8', () => {
    const m = validateAllSecondLineRhythmPresets(SECOND_LINE_RHYTHM_PRESETS);
    expect(m.size).toBe(8);
    for (const [, r] of m) {
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
    }
  });
});
