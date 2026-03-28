/**
 * Riff Generator — DCR candidate loop, GCE ≥ 9.0 hard gate, export.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { validateExportIntegrity } from '../export/exportHardening';
import { expandNotationSafeDurationsInScore } from '../score-integrity/notationSafeRhythm';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { validateNotationSafeRhythm } from '../score-integrity/notationSafeRhythm';
import { buildRiffScoreModel } from './buildRiffScoreModel';
import { normalizeChordLoop } from './riffChordLoop';
import { finalizeRiffScoreBarMath } from './riffFinalizeBarMath';
import { scoreRiffGce } from './riffGce';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { RiffGeneratorParams, RiffGeneratorResult } from './riffTypes';
import { validateRiffIdentity } from './riffIdentityValidation';
import { validateBassHarmonicIntegrity } from './riffBassHarmonicGate';
import { validateRiffMusicXmlStructure } from './riffMusicXmlSanity';

const CANDIDATES = 7;
const MAX_ROUNDS = 40;
const GCE_THRESHOLD = 9.0;

export function runRiffGenerator(baseSeed: number, params: Omit<RiffGeneratorParams, 'seed' | 'chordSymbols'> & { chordSymbols?: string[]; chordProgressionText?: string }): RiffGeneratorResult {
  const chords = normalizeChordLoop(params.chordProgressionText, params.bars);
  const full: RiffGeneratorParams = {
    ...params,
    seed: baseSeed,
    chordSymbols: chords,
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let best: {
      gce: number;
      xml: string;
      score: import('../score-model/scoreModelTypes').ScoreModel;
      coreMotif: CoreMotif;
    } | null = null;

    for (let c = 0; c < CANDIDATES; c++) {
      const seed = baseSeed + round * 100_003 + c * 7919;
      const p: RiffGeneratorParams = { ...full, seed };
      const built = buildRiffScoreModel(p);
      const { score, perBarRhythm } = built;

      finalizeRiffScoreBarMath(score, p.grid === 'sixteenth' ? 'sixteenth' : 'eighth');
      expandNotationSafeDurationsInScore(score);

      const bm = validateStrictBarMath(score);
      if (!bm.valid) continue;

      const ns = validateNotationSafeRhythm(score);
      if (!ns.valid) continue;

      const id = validateRiffIdentity(score, perBarRhythm);
      if (!id.valid) continue;

      if (p.bassEnabled && p.lineMode === 'guitar_bass') {
        const bh = validateBassHarmonicIntegrity(score, chords);
        if (!bh.valid) continue;
      }

      const gce = scoreRiffGce(score, perBarRhythm, chords);
      if (gce < GCE_THRESHOLD) continue;

      const exp = exportScoreModelToMusicXml(score);
      if (!exp.success || !exp.xml) continue;

      const schema = validateMusicXmlSchema(exp.xml);
      if (!schema.valid) continue;

      const exInt = validateExportIntegrity(exp.xml);
      if (!exInt.valid) continue;

      const sanity = validateRiffMusicXmlStructure(exp.xml);
      if (!sanity.valid) continue;

      if (!best || gce > best.gce) {
        best = { gce, xml: exp.xml, score, coreMotif: built.coreMotif };
      }
    }

    if (best && best.gce >= GCE_THRESHOLD) {
      return {
        success: true,
        score: best.score,
        xml: best.xml,
        gce: best.gce,
        version: 1,
        coreMotif: best.coreMotif,
      };
    }
  }

  return {
    success: false,
    error: `Riff Generator: no candidate reached GCE ${GCE_THRESHOLD} after ${MAX_ROUNDS} rounds`,
  };
}
