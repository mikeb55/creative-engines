/**
 * Focused coffee_run_octet counterpoint independence + balance.
 * Does not regenerate Coffee Run.
 *
 * Run:
 * node --max-old-space-size=4096 node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json engines/composer-os-v2/tests/pianoChamberCoffeeRunOctetCounterpoint.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { orchestrate } from '../core/orchestrate/orchestrate';
import {
  COFFEE_RUN_OCTET_BN1_MAX_NOTES,
  COFFEE_RUN_OCTET_ORCH_IDS,
  COFFEE_RUN_OCTET_PART_IDS,
  coffeeRunOctetConflictsPiano,
  shapeCoffeeRunOctetCompanion,
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

function run(): void {
  // Unit: shaper refuses piano unison / close m2.
  const shaped = shapeCoffeeRunOctetCompanion({
    donorMidi: 60,
    donorOnset: 0,
    donorDuration: 1,
    phraseStart: 0,
    phraseEnd: 4,
    partId: 'va',
    range: [48, 84],
    piano: [{ midi: 60, onset: 0.5, end: 1.5 }],
    sonorityPcs: [0, 4, 7],
    seed: 3,
    phraseIndex: 1,
    lane: 'answer',
  });
  assert.ok(shaped, 'expected a shaped companion');
  assert.notEqual(shaped!.midi % 12, 0, 'should not sit on donor C if avoidable');
  assert.equal(
    coffeeRunOctetConflictsPiano(shaped!.midi, shaped!.onset, shaped!.duration, [{ midi: 60, onset: 0.5, end: 1.5 }]),
    false,
  );

  const result = orchestrate(request(lyrical));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.score) throw new Error('expected score');

  const all = events(result.musicXml);
  const piano = all.filter((note) => note.partId === 'pn');
  const companions = all.filter((note) => note.partId !== 'pn');
  assert.equal(piano.length, 138, 'piano source must stay intact on lyrical fixture');

  const counts = Object.fromEntries(
    COFFEE_RUN_OCTET_PART_IDS.map((id) => [id, all.filter((note) => note.partId === id).length]),
  );
  for (const id of COFFEE_RUN_OCTET_ORCH_IDS) {
    assert.ok((counts[id] ?? 0) > 0, `${id} silent`);
  }
  assert.ok((counts.bn1 ?? 0) <= COFFEE_RUN_OCTET_BN1_MAX_NOTES, `bn1 too dominant: ${counts.bn1}`);

  let unison = 0;
  let closeM2 = 0;
  let independent = 0;
  for (const note of companions) {
    const hits = piano.filter((p) => note.onset < p.end - 1e-6 && p.onset < note.end - 1e-6);
    if (!hits.length) {
      independent += 1;
      continue;
    }
    const samePc = hits.some((p) => ((p.midi % 12) + 12) % 12 === ((note.midi % 12) + 12) % 12);
    if (!samePc) independent += 1;
    for (const p of hits) {
      const delta = Math.abs(note.midi - p.midi);
      if (delta === 0) unison += 1;
      if (delta <= 15 && (delta % 12 === 1 || delta % 12 === 11)) closeM2 += 1;
    }
  }

  const independenceRatio = companions.length ? independent / companions.length : 0;
  assert.ok(independenceRatio >= 0.55, `independence too low: ${independenceRatio}`);
  assert.ok(unison <= 8, `too many unisons: ${unison}`);
  assert.ok(closeM2 <= 2, `too many close m2: ${closeM2}`);

  // Balance: no companion exceeds 40% of all companion notes.
  const companionTotal = companions.length;
  for (const id of COFFEE_RUN_OCTET_ORCH_IDS) {
    const share = (counts[id] ?? 0) / companionTotal;
    assert.ok(share <= 0.4, `${id} share ${share}`);
  }

  console.log(JSON.stringify({
    PASS: true,
    counts,
    companionTotal,
    independenceRatio,
    unison,
    closeM2,
    bn1Max: COFFEE_RUN_OCTET_BN1_MAX_NOTES,
  }, null, 2));
}

run();
