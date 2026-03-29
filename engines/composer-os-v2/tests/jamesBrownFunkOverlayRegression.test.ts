/**
 * C3 James Brown overlay regression — C1 rhythm overlay (phrase 0 includes SHORTER) vs same + JAMES_BROWN_FUNK (C3).
 * Same seed, preset, Song Mode path, balanced tier; compares guitar rhythm metrics on bars 1–4.
 */

import assert from 'assert';
import type { NoteEvent, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { runGoldenPathOnce, type GoldenPathResult } from '../core/goldenPath/runGoldenPath';
import { selectOverlaysForPhrase } from '../core/goldenPath/songModeRhythmOverlayC1';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';

const EPS = 0.04;

const BASE_OPTS = {
  songModeHookFirstIdentity: true,
  presetId: 'guitar_bass_duo' as const,
  totalBars: 32,
  longFormEnabled: true,
  creativeControlLevel: 'balanced' as const,
  variationEnabled: false,
};

/**
 * Find seed where phrase 0 C1 overlay list includes SHORTER and both golden-path runs succeed
 * (e.g. Metheny behaviour gate — “Phrases too square” is seed-dependent).
 */
function findSeedPhrase0IncludingShorterBothRunsOk(
  maxScan: number
): { seed: number; rShorter: GoldenPathResult; rJb: GoldenPathResult } | null {
  for (let s = 1; s <= maxScan; s++) {
    const o = selectOverlaysForPhrase(0, s);
    if (!o.some((x) => x.id === 'SHORTER')) continue;
    const rShorter = runGoldenPathOnce(s, {
      ...BASE_OPTS,
      songModeJamesBrownFunkOverlay: false,
    });
    if (!rShorter.success) continue;
    const rJb = runGoldenPathOnce(s, {
      ...BASE_OPTS,
      songModeJamesBrownFunkOverlay: true,
    });
    if (!rJb.success) continue;
    return { seed: s, rShorter, rJb };
  }
  return null;
}

function guitarPart(score: ScoreModel): PartModel {
  const g = score.parts.find((p) => p.id === 'guitar');
  assert.ok(g, 'guitar part');
  return g;
}

export interface GuitarRhythmMetricsBars1to4 {
  noteCount: number;
  attacksOnBeats2And4: number;
  sumVelocityBackbeats: number;
  backbeatAccentCount: number;
  /** Starts on and-of-1 or and-of-3 (anticipation slots). */
  anticipationSlots: number;
  sumVelocityAnticipationSlots: number;
  /** Durations that use an odd count of 16ths (non–half-beat multiples): 0.75, 1.25, … */
  oddSixteenthDurationNotes: number;
}

function collectGuitarRhythmMetrics(score: ScoreModel): GuitarRhythmMetricsBars1to4 {
  const g = guitarPart(score);
  let noteCount = 0;
  let attacksOnBeats2And4 = 0;
  let sumVelocityBackbeats = 0;
  let backbeatAccentCount = 0;
  let anticipationSlots = 0;
  let sumVelocityAnticipationSlots = 0;
  let oddSixteenthDurationNotes = 0;

  for (let bar = 1; bar <= 4; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      noteCount++;
      const sb = n.startBeat;
      const v = n.velocity ?? 90;

      if (Math.abs(sb - 1) < EPS || Math.abs(sb - 3) < EPS) {
        attacksOnBeats2And4++;
        sumVelocityBackbeats += v;
        if (n.articulation === 'accent') backbeatAccentCount++;
      }
      if (Math.abs(sb - 0.5) < EPS || Math.abs(sb - 2.5) < EPS) {
        anticipationSlots++;
        sumVelocityAnticipationSlots += v;
      }

      const sixteenths = Math.round(n.duration / 0.25);
      if (sixteenths >= 2 && sixteenths % 2 !== 0) oddSixteenthDurationNotes++;
    }
  }

  return {
    noteCount,
    attacksOnBeats2And4,
    sumVelocityBackbeats,
    backbeatAccentCount,
    anticipationSlots,
    sumVelocityAnticipationSlots,
    oddSixteenthDurationNotes,
  };
}

export function runC3JamesBrownOverlayRegressionTests(): void {
  const found = findSeedPhrase0IncludingShorterBothRunsOk(20_000);
  assert.ok(
    found,
    'findSeedPhrase0IncludingShorterBothRunsOk: need phrase 0 SHORTER + successful SHORTER + JB runs'
  );
  const { rShorter, rJb } = found;

  const mS = collectGuitarRhythmMetrics(rShorter.score);
  const mJ = collectGuitarRhythmMetrics(rJb.score);

  assert.strictEqual(
    mJ.noteCount,
    mS.noteCount,
    'note count bars 1–4 guitar must match between runs'
  );
  assert.strictEqual(rJb.context.form.totalBars, rShorter.context.form.totalBars);
  assert.strictEqual(validateStrictBarMath(rJb.score).valid, true);
  assert.strictEqual(validateStrictBarMath(rShorter.score).valid, true);

  assert.ok(
    rJb.context.generationMetadata?.songModeJamesBrownFunkReceiptTag,
    'receipt tag when James Brown enabled'
  );
  assert.strictEqual(rJb.context.generationMetadata?.songModeJamesBrownFunkApplied, true);

  const avgBackS = mS.attacksOnBeats2And4 > 0 ? mS.sumVelocityBackbeats / mS.attacksOnBeats2And4 : 0;
  const avgBackJ = mJ.attacksOnBeats2And4 > 0 ? mJ.sumVelocityBackbeats / mJ.attacksOnBeats2And4 : 0;
  assert.ok(
    avgBackJ > avgBackS,
    `James Brown should raise average backbeat velocity: jb=${avgBackJ.toFixed(2)} vs shorter=${avgBackS.toFixed(2)}`
  );
  assert.ok(
    mJ.backbeatAccentCount >= mS.backbeatAccentCount,
    'James Brown should not reduce backbeat accents vs SHORTER-only'
  );

  assert.ok(
    mJ.oddSixteenthDurationNotes >= mS.oddSixteenthDurationNotes,
    `16th-duration activity: jb=${mJ.oddSixteenthDurationNotes} vs shorter=${mS.oddSixteenthDurationNotes}`
  );

  const hasAnticipationOrGroove =
    mJ.anticipationSlots > 0 ||
    mJ.oddSixteenthDurationNotes > mS.oddSixteenthDurationNotes ||
    mJ.sumVelocityAnticipationSlots > mS.sumVelocityAnticipationSlots;
  assert.ok(
    hasAnticipationOrGroove,
    'James Brown run should show anticipation slots or stronger 16th / velocity profile vs SHORTER-only'
  );
}

if (require.main === module) {
  runC3JamesBrownOverlayRegressionTests();
  console.log('C3 James Brown overlay regression: OK');
}
