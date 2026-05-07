/**
 * Cuban / Afro-Cuban rhythm engine — not in composer smoke allowlist.
 */

import { CUBAN_RHYTHM_PRESETS, getCubanRhythmPresetById } from '../core/rhythm/cubanRhythmPresets';
import { exportCubanRhythmToMusicXml } from '../core/rhythm/cubanRhythmMusicXmlExporter';
import { validateAllCubanRhythmPresets } from '../core/rhythm/cubanRhythmValidate';

describe('cubanRhythmEngine', () => {
  it('loads all 8 presets', () => {
    expect(CUBAN_RHYTHM_PRESETS.length).toBe(8);
    for (const p of CUBAN_RHYTHM_PRESETS) {
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('lane lengths match gridSteps for all presets', () => {
    for (const p of CUBAN_RHYTHM_PRESETS) {
      const g = p.meter.gridSteps;
      expect(p.lanes.low.length).toBe(g);
      expect(p.lanes.high.length).toBe(g);
      expect(p.lanes.jingle.length).toBe(g);
      expect(p.lanes.ghost.length).toBe(g);
    }
  });

  it('afro-6-8 gridSteps === 12', () => {
    expect(getCubanRhythmPresetById('afro-6-8')?.meter.gridSteps).toBe(12);
  });

  it('exportCubanRhythmToMusicXml(son-clave-3-2) returns string', () => {
    const preset = getCubanRhythmPresetById('son-clave-3-2');
    expect(preset).toBeDefined();
    const xml = exportCubanRhythmToMusicXml(preset!, 2);
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(100);
  });

  it('son-clave-3-2 XML has 4/4 and midi channel 10, no chord', () => {
    const preset = getCubanRhythmPresetById('son-clave-3-2')!;
    const xml = exportCubanRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>4</beats>');
    expect(xml).toContain('<midi-channel>10</midi-channel>');
    expect(xml).not.toContain('<chord/>');
  });

  it('afro-6-8 XML has 6/8', () => {
    const preset = getCubanRhythmPresetById('afro-6-8')!;
    const xml = exportCubanRhythmToMusicXml(preset, 2);
    expect(xml).toContain('<beats>6</beats>');
  });

  it('validateAllCubanRhythmPresets passes all 8', () => {
    const m = validateAllCubanRhythmPresets(CUBAN_RHYTHM_PRESETS);
    expect(m.size).toBe(8);
    for (const [, r] of m) {
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
    }
  });

  it('son-clave-3-2 claveDirection === 3-2', () => {
    expect(getCubanRhythmPresetById('son-clave-3-2')?.claveDirection).toBe('3-2');
  });
});
