import { describe, expect, it } from 'vitest';

import { exportBlendedScoreToMusicXml, exportEngineRhythmSampleMusicXml, exportSongFormToMusicXml } from '@composer-os/core/blend';

describe('blendMusicXmlExporter', () => {
  it('routes Brazilian + Cuban dual export to two parts', () => {
    const xml = exportBlendedScoreToMusicXml({
      engineA: { engine: 'brazilian', presetId: 'bossa-nova-basic' },
      engineB: { engine: 'cuban', presetId: 'son-clave-3-2' },
      conflictStrategy: 'max',
    });
    expect(xml).toContain('<part id="P1">');
    expect(xml).toContain('<part id="P2">');
    expect(xml).toContain('Brazilian layer');
    expect(xml).toContain('Cuban layer');
  });

  it('song-form concatenates distinct engines', () => {
    const xml = exportSongFormToMusicXml({
      title: 'Cross blend',
      sections: [
        {
          bars: { startBar: 1, endBar: 2 },
          rhythm: { engine: 'second_line', presetId: 'second-line-basic' },
        },
        {
          bars: { startBar: 3, endBar: 3 },
          rhythm: { engine: 'rebetiko', presetId: 'zeibekiko_9_8' },
        },
      ],
    });
    expect(xml).toContain('<work-title>Cross blend</work-title>');
    expect(xml.match(/<measure\b/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('Greek export preserves additive metre hook in sample XML', () => {
    const one = exportEngineRhythmSampleMusicXml('rebetiko', 'zeibekiko_9_8', 1);
    expect(one).toMatch(/beats.*9|9.*beats/s);
  });
});
