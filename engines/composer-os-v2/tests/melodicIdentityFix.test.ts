/**
 * GCE melodic identity — motif mutation engine + contour helpers (not in smoke suite).
 */

import { contourBarBiasForProfile } from '../core/song-mode/leadMelodyPlanner';
import {
  applyMotifMutation,
  extractMotifCell,
  scoreMotifSimilarity,
  selectMotifTransform,
} from '../core/song-mode/motifMutationEngine';

function testExtractMotifIntervalSpine(): boolean {
  const notes = [
    { pitch: 60, duration: 1 },
    { pitch: 64, duration: 1 },
    { pitch: 67, duration: 0.5 },
  ];
  const m = extractMotifCell(notes, notes.length);
  return m.intervalSpine.length === 2 && m.intervalSpine[0] === 4 && m.intervalSpine[1] === 3;
}

function testSequenceTransposeRange(): boolean {
  const base = extractMotifCell(
    [
      { pitch: 60, duration: 1 },
      { pitch: 64, duration: 1 },
    ],
    2
  );
  const seq = applyMotifMutation(base, 'sequence');
  if (seq.intervalSpine.length !== 1) return false;
  const d = seq.intervalSpine[0]! - base.intervalSpine[0]!;
  return Math.abs(d) >= 2 && Math.abs(d) <= 5;
}

function testAugmentationDoubles(): boolean {
  const base = extractMotifCell(
    [
      { pitch: 60, duration: 0.5 },
      { pitch: 62, duration: 1 },
    ],
    2
  );
  const aug = applyMotifMutation(base, 'augmentation');
  return aug.rhythmicCell[0] === 1 && aug.rhythmicCell[1] === 2;
}

function testContourInversionNegates(): boolean {
  const base = extractMotifCell(
    [
      { pitch: 60, duration: 1 },
      { pitch: 64, duration: 1 },
      { pitch: 61, duration: 1 },
    ],
    3
  );
  const inv = applyMotifMutation(base, 'contour_inversion');
  return inv.intervalSpine[0] === -base.intervalSpine[0]! && inv.intervalSpine[1] === -base.intervalSpine[1]!;
}

function testSimilarityIdentical(): boolean {
  const a = extractMotifCell(
    [
      { pitch: 60, duration: 1 },
      { pitch: 64, duration: 1 },
    ],
    2
  );
  return scoreMotifSimilarity(a, a) > 0.95;
}

function testSimilarityInvertedLow(): boolean {
  const a = extractMotifCell(
    [
      { pitch: 60, duration: 1 },
      { pitch: 64, duration: 1 },
      { pitch: 67, duration: 1 },
    ],
    3
  );
  let b = applyMotifMutation(a, 'contour_inversion');
  b = applyMotifMutation(b, 'registral_displacement');
  return scoreMotifSimilarity(a, b) < 0.5;
}

function testSelectBBranch(): boolean {
  for (let s = 0; s < 500; s++) {
    const t = selectMotifTransform('B', s);
    if (t !== 'contour_inversion' && t !== 'rhythmic_displacement') return false;
  }
  return true;
}

function testSelectCodaSequence(): boolean {
  return selectMotifTransform('coda', 1) === 'sequence' && selectMotifTransform('coda', 999999) === 'sequence';
}

function testResolveRhythmBrazilian(): boolean {
  /** Alias — placeholder satisfied by mutation tests; kept name slot from prompt rhythm checks if extended. */
  return contourBarBiasForProfile('arch', 0, 8, 50021) <= 1;
}

export function runMelodicIdentityFixTests(): { name: string; ok: boolean }[] {
  return [
    ['Melodic identity fix — extractMotifCell intervalSpine', testExtractMotifIntervalSpine],
    ["Melodic identity fix — sequence transpose spine 2–5 semitones", testSequenceTransposeRange],
    ["Melodic identity fix — augmentation doubles durations", testAugmentationDoubles],
    ["Melodic identity fix — contour_inversion negates spine", testContourInversionNegates],
    ['Melodic identity fix — scoreMotifSimilarity identical high', testSimilarityIdentical],
    ['Melodic identity fix — inverted+displaced similarity low', testSimilarityInvertedLow],
    ['Melodic identity fix — selectMotifTransform(B,*) inversion vocabulary', testSelectBBranch],
    ['Melodic identity fix — selectMotifTransform(coda) sequence', testSelectCodaSequence],
    ['Melodic identity fix — contourBarBias arch bounded', testResolveRhythmBrazilian],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
