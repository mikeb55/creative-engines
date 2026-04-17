/**
 * Validates unified Wyble ON/OFF export helper: real quartet + BB MusicXML, temp disk writes.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exportWybleOnOffExamples } from '../scripts/exportWybleOnOffExamples';

describe('exportWybleOnOffExamples', () => {
  it('writes four MusicXML files for family=all with quartet and big-band markers', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wyble-export-'));
    const r = exportWybleOnOffExamples({ seed: 12345, family: 'all', outDir: dir });

    expect(r.errors).toEqual([]);
    expect(r.written).toHaveLength(4);

    for (const p of r.written) {
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(500);
      const base = path.basename(p);
      const xml = fs.readFileSync(p, 'utf8');
      if (base.startsWith('quartet_wyble_')) {
        expect(xml).toContain('Violin I');
        expect(xml).toContain('Violin II');
        expect(xml).toContain('Viola');
      }
      if (base.startsWith('bigband_wyble_')) {
        expect(xml).toContain('Alto Saxophone');
        expect(xml).toContain('Tenor Saxophone');
      }
    }
  });
});
