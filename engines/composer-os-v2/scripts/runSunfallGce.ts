/**
 * GCE auto-scorers on Sunfall MusicXML (BB parse → ScoreModel, resolveMelodicPartId).
 * Usage: npx ts-node --project tsconfig.json scripts/runSunfallGce.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseComposerOsBigBandMusicXml } from '../core/gce/gceStructuralMemory';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { evaluateGce, defaultGceWeights, GCE_CATEGORY_ORDER } from '../core/evaluation/gceEvaluator';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_XML = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'V2.0-Sunfall.musicxml');
const XML_PATH = process.argv[2] ?? DEFAULT_XML;

function main(): void {
  const xml = fs.readFileSync(XML_PATH, 'utf8');
  const score = parseComposerOsBigBandMusicXml(xml);
  if (!score) {
    console.error('parseComposerOsBigBandMusicXml returned null');
    process.exit(1);
  }
  const melodicPartId = resolveMelodicPartId(score);
  const result = evaluateGce({
    output: score,
    features: {},
    weights: defaultGceWeights,
    metadata: {},
  });

  const breakdown: Record<string, number> = {};
  for (const cat of GCE_CATEGORY_ORDER) {
    breakdown[cat] = result.categories[cat].score;
  }

  console.log(
    JSON.stringify(
      {
        xmlPath: XML_PATH,
        melodicPartId,
        finalScore: result.finalScore,
        pass: result.pass,
        weakestCategory: result.weakestCategory,
        strongestCategory: result.strongestCategory,
        breakdown,
      },
      null,
      2
    )
  );
}

main();
