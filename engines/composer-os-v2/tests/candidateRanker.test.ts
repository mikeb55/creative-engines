/**
 * Candidate ranking / A–B compare (easy wins pack).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { generateCompositionCandidates } from '../core/candidates/candidateGenerator';
import { scoreGenerateResult } from '../core/candidates/candidateRanker';
import type { GenerateResult } from '../app-api/generateComposition';
import type { CandidateEntry } from '../core/candidates/candidateTypes';

export function runCandidateRankerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-cand-'));
  const req: GenerateRequest = {
    presetId: 'guitar_bass_duo',
    seed: 1000,
    styleStack: { primary: 'barry_harris' },
  };

  const rank = generateCompositionCandidates(req, tmp, generateComposition, { count: 3, seedStep: 5000 });
  out.push({
    ok:
      rank.ranked.length === 3 &&
      rank.best != null &&
      rank.secondBest != null &&
      rank.best.seed !== rank.secondBest.seed,
    name: 'generateCompositionCandidates returns three ranked entries with best and runner-up',
  });

  const fakeFail: CandidateEntry = {
    index: 0,
    seed: 1,
    score: -1,
    success: false,
    result: {
      success: false,
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: ['fail'],
      },
    } as GenerateResult,
  };
  const fakeOk: CandidateEntry = {
    index: 1,
    seed: 2,
    score: 2,
    success: true,
    result: {
      success: true,
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        exportIntegrityPassed: true,
        instrumentMetadataPassed: true,
        sibeliusSafe: true,
        readiness: { shareable: true, release: 0.9, mx: 0.9 },
        errors: [],
      },
    } as GenerateResult,
  };
  out.push({
    ok: scoreGenerateResult(fakeFail.result) < scoreGenerateResult(fakeOk.result),
    name: 'scoreGenerateResult prefers successful run',
  });

  return out;
}
