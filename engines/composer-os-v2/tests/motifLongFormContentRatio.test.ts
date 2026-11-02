/**
 * Long-form motif-content ratio — 64-bar LOCK windows only in denominator.
 * minRatio 0.28 preserved; 8-bar path unchanged; no placement/note generation changes.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/motifLongFormContentRatio.test.ts
 */
import assert from 'node:assert/strict';
import { generateMotif } from '../core/motif/motifGenerator';
import { placeMotifsLongFormDuoByBarCount } from '../core/motif/longFormMotifPlanner';
import { placeMotifsAcrossBars } from '../core/motif/motifTracker';
import { validateMotifIntegrity } from '../core/motif/motifValidation';
import { addEvent, createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';

function guitarScore(barCount: number, notesPerBar: (bar: number) => number) {
  const measures = [];
  for (let bar = 1; bar <= barCount; bar++) {
    const m = createMeasure(bar);
    const n = notesPerBar(bar);
    for (let i = 0; i < n; i++) {
      addEvent(m, createNote(60 + (i % 5), i * (4 / Math.max(1, n)), 4 / Math.max(1, n)));
    }
    measures.push(m);
  }
  return createScore('LongFormMotifRatio', [
    {
      id: 'guitar',
      name: 'G',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures,
    },
  ]);
}

function main(): void {
  const motifs = generateMotif(9, 55, 75, { duoLock: true });
  const placements = placeMotifsLongFormDuoByBarCount(motifs, 9, 64);
  assert.equal(placements.length, 32);
  const lockBars = new Set(placements.map((p) => p.startBar));
  assert.deepEqual(
    [...lockBars].sort((a, b) => a - b).slice(0, 8),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.ok(lockBars.has(17) && lockBars.has(49));
  assert.equal(lockBars.has(9), false);

  /** Dense through-composed notes outside LOCK windows — must not trip motif-content. */
  const score64 = guitarScore(64, (bar) => (lockBars.has(bar) ? 3 : 12));
  const state64 = { baseMotifs: motifs, placements };
  const r64 = validateMotifIntegrity(state64, score64);
  assert.equal(
    r64.errors.some((e) => e.includes('motif content too low')),
    false,
    `64-bar LOCK-window ratio must not fail: ${r64.errors.join('; ')}`
  );
  assert.equal(r64.valid, true);

  /** 8-bar: still counts all guitar notes (dense non-placement bars can still fail). */
  const motifs8 = generateMotif(1, 55, 72, { duoLock: true });
  const pl8 = placeMotifsAcrossBars(motifs8, 42, true);
  const score8 = guitarScore(8, () => 20);
  const r8 = validateMotifIntegrity({ baseMotifs: motifs8, placements: pl8 }, score8);
  assert.ok(
    r8.errors.some((e) => e.includes('motif content too low')),
    '8-bar étude must still enforce full-score motif-content ratio'
  );

  console.log('motifLongFormContentRatio PASS (64-bar LOCK denominator; 8-bar preserved)');
}

main();
