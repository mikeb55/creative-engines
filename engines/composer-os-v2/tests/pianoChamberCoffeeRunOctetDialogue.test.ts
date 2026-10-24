/**
 * Focused coffee_run_octet phrase continuity + marker coverage.
 * Does not regenerate Coffee Run.
 *
 * Run:
 * node --max-old-space-size=4096 node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json engines/composer-os-v2/tests/pianoChamberCoffeeRunOctetDialogue.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { orchestrate } from '../core/orchestrate/orchestrate';
import {
  COFFEE_RUN_OCTET_DIALOGUE_IDS,
  COFFEE_RUN_OCTET_MARKER_BARS,
  COFFEE_RUN_OCTET_ORCH_IDS,
  buildCoffeeRunOctetDialoguePhrase,
} from '../core/orchestrate/coffeeRunOctet';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import type { OrchestrateRequest } from '../core/orchestrate/types';

const lyrical = readFileSync(path.resolve(__dirname, '../../../docs/v3.5-phase1/lyrical/source.musicxml'), 'utf8');

function request(xml: string): OrchestrateRequest {
  return {
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: xml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'coffee_run_octet',
      },
    },
  };
}

function events(xml: string) {
  const ingested = ingestCanonicalScore(xml, { strictSource: true });
  assert.ok(ingested.score, ingested.parseError ?? 'parse failed');
  return ingested.score!.sourceEvents
    .filter((event) => !event.rest && event.soundingMidi !== null)
    .map((event) => {
      const onset = event.onset.n / event.onset.d + (event.bar - 1) * 4;
      const duration = event.duration.n / event.duration.d;
      return {
        partId: event.partId,
        bar: event.bar,
        onset,
        duration,
        end: onset + duration,
        midi: event.soundingMidi as number,
      };
    });
}

/** Longest run of notes on one part with consecutive onsets ≤ 1.5q apart. */
function maxPhraseRun(notes: Array<{ onset: number; end: number }>): number {
  if (!notes.length) return 0;
  const sorted = [...notes].sort((a, b) => a.onset - b.onset);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i]!.onset - sorted[i - 1]!.end;
    if (gap <= 1.5) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function run(): void {
  const unit = buildCoffeeRunOctetDialoguePhrase({
    motif: [
      { midi: 67, onset: 0, duration: 1 },
      { midi: 69, onset: 1, duration: 1 },
      { midi: 71, onset: 2, duration: 0.5 },
      { midi: 72, onset: 2.5, duration: 1 },
    ],
    phraseStart: 0,
    phraseEnd: 8,
    range: [48, 84],
    piano: [{ midi: 60, onset: 0, end: 1 }],
    sonorityPcs: [4, 7, 11],
    seed: 2,
    phraseIndex: 0,
    exchange: false,
  });
  assert.ok(unit.length >= 2, `unit phrase too short: ${unit.length}`);
  assert.ok(new Set(unit.map((cell) => cell.duration)).size >= 2, 'need rhythmic variety');

  const result = orchestrate(request(lyrical));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.score) throw new Error('expected score');

  const all = events(result.musicXml);
  const companions = all.filter((note) => note.partId !== 'pn');
  const dialogue = companions.filter((note) =>
    (COFFEE_RUN_OCTET_DIALOGUE_IDS as readonly string[]).includes(note.partId),
  );

  let longest = 0;
  let partsWithPhrase = 0;
  for (const id of COFFEE_RUN_OCTET_DIALOGUE_IDS) {
    const runLen = maxPhraseRun(dialogue.filter((note) => note.partId === id));
    longest = Math.max(longest, runLen);
    if (runLen >= 3) partsWithPhrase += 1;
  }
  assert.ok(longest >= 3, `no sustained phrase (max run ${longest})`);
  assert.ok(partsWithPhrase >= 2, `too few dialogue voices with phrases: ${partsWithPhrase}`);

  // Overlapping exchange: two different dialogue parts sounding together somewhere.
  let overlapPairs = 0;
  for (let i = 0; i < dialogue.length; i += 1) {
    for (let j = i + 1; j < dialogue.length; j += 1) {
      const a = dialogue[i]!;
      const b = dialogue[j]!;
      if (a.partId === b.partId) continue;
      if (a.onset < b.end - 1e-6 && b.onset < a.end - 1e-6) overlapPairs += 1;
    }
  }
  assert.ok(overlapPairs >= 1, 'no overlapping instrumental exchange');

  const markerCoverage: Record<number, number> = {};
  for (const bar of COFFEE_RUN_OCTET_MARKER_BARS) {
    const n = companions.filter((note) => note.bar === bar).length;
    markerCoverage[bar] = n;
    assert.ok(n >= 2, `marker bar ${bar} too thin: ${n}`);
  }

  const counts = Object.fromEntries(
    COFFEE_RUN_OCTET_ORCH_IDS.map((id) => [id, all.filter((note) => note.partId === id).length]),
  );
  const dialogueTotal = dialogue.length;
  const dbShare = (counts.db ?? 0) / Math.max(1, companions.length);
  assert.ok(dbShare <= 0.35, `db still dominates: ${dbShare}`);

  console.log(JSON.stringify({
    PASS: true,
    companionTotal: companions.length,
    dialogueTotal,
    longestPhraseRun: longest,
    partsWithPhrase,
    overlapPairs,
    markerCoverage,
    counts,
    dbShare,
  }, null, 2));
}

run();
