import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  validateDuoIdentityMomentGate,
  computeDuoIdentityMomentScore,
  validateDuoPolishV33Gate,
  computeDuoGceScore,
} from '../core/score-integrity/duoLockQuality';
import { evaluateDuoLongFormQuality } from '../core/quality/duoLongFormQuality';
import { generateComposition } from '../app-api/generateComposition';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function main(): void {
  for (let s = 0; s < 24; s++) {
    const r = runGoldenPath(s);
    if (!r.success || !r.strictBarMathPassed || !r.exportRoundTripPassed || !r.instrumentMetadataPassed) {
      console.log('multi-seed fail', s, {
        success: r.success,
        strictBarMathPassed: r.strictBarMathPassed,
        exportRoundTripPassed: r.exportRoundTripPassed,
        instrumentMetadataPassed: r.instrumentMetadataPassed,
        errors: r.errors,
      });
      break;
    }
  }

  for (let s = 0; s < 24; s++) {
    const r = runGoldenPath(s);
    const v = validateDuoIdentityMomentGate(r.score);
    const id = computeDuoIdentityMomentScore(r.score);
    const p = validateDuoPolishV33Gate(r.score);
    const gce = computeDuoGceScore(r.score);
    if (!v.valid || id < 8.5) console.log('identity fail', s, 'id', id, v.errors);
    if (!p.valid) console.log('polish fail', s, p.errors);
    if (gce < 9) console.log('gce fail', s, gce);
  }

  const text = 'D/F# | G/B | Cmaj7/E | A7alt | D/F# | G/B | Cmaj7/E | A7alt';
  const r61 = runGoldenPath(61, { chordProgressionText: text });
  console.log('slash runGoldenPath 61', r61.success, r61.errors);

  const r101 = runGoldenPath(101, { totalBars: 32 });
  const q = evaluateDuoLongFormQuality(r101.score, r101.context);
  console.log('longform 101', r101.success, 'q.total', q.total, 'errors', r101.errors);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-diag-slash-'));
  try {
    const r = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 77,
        harmonyMode: 'custom',
        chordProgressionText: 'D/F# | G/B | Cmaj7/E | A7/C# | D/F# | G/B | Cmaj7/E | A7/C#',
      },
      dir
    );
    console.log('generateComposition slash', r.success, r.error, r.filepath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main();
