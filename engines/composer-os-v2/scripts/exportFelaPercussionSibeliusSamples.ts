/**
 * Writes three drum-only MusicXML files (straight / swing / afrobeat) for Sibelius spot-checks.
 * Run from repo root: npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/exportFelaPercussionSibeliusSamples.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { createAfrobeatRhythmEngine } from '../core/percussion/afrobeatRhythmEngine';
import { buildFelaAfrobeatPercussionPart } from '../core/song-mode/felaKutiSlice';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const feels = ['straight', 'swing', 'afrobeat'] as const;

function main(): void {
  const eng = createAfrobeatRhythmEngine();
  const outDir = path.join(__dirname, '..', '..', '..', 'docs', 'fela-percussion-sibelius-samples');
  fs.mkdirSync(outDir, { recursive: true });
  for (const feel of feels) {
    const part = buildFelaAfrobeatPercussionPart(1, eng.selectPattern(feel));
    const score: ScoreModel = {
      title: `Fela percussion sample — ${feel} (fk:${feel === 'afrobeat' ? 'afrobeat' : feel})`,
      tempo: 108,
      timeSignature: { beats: 4, beatType: 4 },
      parts: [part],
    };
    const xr = exportScoreModelToMusicXml(score);
    if (!xr.success || !xr.xml) {
      throw new Error(xr.errors?.join('; ') ?? 'export failed');
    }
    const fp = path.join(outDir, `fela_sample_${feel}.musicxml`);
    fs.writeFileSync(fp, xr.xml, 'utf-8');
    process.stdout.write(`Wrote ${fp}\n`);
  }
}

main();
