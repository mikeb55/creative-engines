/**
 * Focused Coffee Run octet roster + piano retention.
 * Does not generate the Coffee Run cue itself.
 *
 * Run:
 * node --max-old-space-size=4096 node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json engines/composer-os-v2/tests/pianoChamberCoffeeRunOctet.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { orchestrate } from '../core/orchestrate/orchestrate';
import {
  COFFEE_RUN_OCTET_ORCH_IDS,
  COFFEE_RUN_OCTET_PART_IDS,
  resolveCoffeeRunOctetRoster,
} from '../core/orchestrate/coffeeRunOctet';
import { resolveSymphonicRoster } from '../core/orchestrate/symphonicWriting';
import { resolveTemplate } from '../core/orchestrate/ensembleTemplates';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import type { OrchestrateRequest } from '../core/orchestrate/types';

const lyrical = readFileSync(path.resolve(__dirname, '../../../docs/v3.5-phase1/lyrical/source.musicxml'), 'utf8');

function request(xml: string, ensemble: 'coffee_run_octet' | 'chamber' | 'symphonic' | undefined, seed = 11): OrchestrateRequest {
  return {
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: xml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ...(ensemble && ensemble !== 'chamber' ? { ensemble } : {}),
      },
    },
  };
}

function soundingNotes(xml: string, partId: string): Array<{ bar: number; onset: number; duration: number; midi: number }> {
  const ingested = ingestCanonicalScore(xml, { strictSource: true });
  assert.ok(ingested.score, ingested.parseError ?? 'parse failed');
  return ingested.score!.sourceEvents
    .filter((event) => event.partId === partId && !event.rest && event.soundingMidi !== null)
    .map((event) => ({
      bar: event.bar,
      onset: event.onset.n / event.onset.d,
      duration: event.duration.n / event.duration.d,
      midi: event.soundingMidi as number,
    }))
    .sort((a, b) => a.bar - b.bar || a.onset - b.onset || a.midi - b.midi);
}

function run(): void {
  const roster = resolveCoffeeRunOctetRoster();
  assert.equal(roster.omissions.length, 0, roster.omissions.map((item) => item.detail).join('; '));
  assert.deepEqual(roster.parts.map((part) => part.partId), [...COFFEE_RUN_OCTET_PART_IDS]);
  assert.equal(roster.parts.length, 8);
  assert.ok(roster.parts.some((part) => part.partId === 'pn' && part.instrumentId === 'piano'));
  assert.deepEqual(
    COFFEE_RUN_OCTET_ORCH_IDS,
    ['picc', 'bn1', 'bcl', 'tp1', 'va', 'db', 'hp'],
  );

  const chamber = resolveTemplate('chamber_orchestra');
  assert.equal(chamber.parts.length, 10);
  const symphonic = resolveSymphonicRoster();
  assert.equal(symphonic.parts.length, 31);
  assert.ok(!symphonic.parts.some((part) => part.partId === 'pn'));

  const result = orchestrate(request(lyrical, 'coffee_run_octet'));
  assert.equal(result.ok, true, result.ok ? '' : result.error);
  if (!result.ok || !('musicXml' in result) || !result.score || !result.fidelity) throw new Error('expected octet score');

  const partIds = result.score.parts.map((part) => part.id);
  assert.deepEqual(partIds, [...COFFEE_RUN_OCTET_PART_IDS]);
  assert.equal(result.score.parts.length, 8);
  assert.ok(result.score.parts[0]?.pianoGrandStaff, 'piano grand staff required');
  assert.equal(result.score.tempo, 72);

  const sourcePiano = soundingNotes(lyrical, 'P1');
  const outPiano = soundingNotes(result.musicXml, 'pn');
  assert.equal(outPiano.length, sourcePiano.length, `piano note count ${outPiano.length} vs source ${sourcePiano.length}`);
  for (let i = 0; i < sourcePiano.length; i += 1) {
    const expected = sourcePiano[i]!;
    const actual = outPiano[i]!;
    assert.equal(actual.bar, expected.bar, `bar mismatch at ${i}`);
    assert.ok(Math.abs(actual.onset - expected.onset) < 1e-6, `onset mismatch at ${i}`);
    assert.ok(Math.abs(actual.duration - expected.duration) < 1e-6, `duration mismatch at ${i}`);
    assert.equal(actual.midi, expected.midi, `midi mismatch at ${i}`);
  }

  for (const classification of result.fidelity.classifications) {
    if (classification.disposition === 'omitted') continue;
    assert.equal(classification.partId, 'pn', `source event ${classification.eventId} left piano`);
    assert.equal(classification.octaveShift, 0);
    assert.equal(classification.disposition, 'retained');
  }

  const distribution = Object.fromEntries(
    COFFEE_RUN_OCTET_PART_IDS.map((id) => [id, soundingNotes(result.musicXml, id).length]),
  );
  for (const id of COFFEE_RUN_OCTET_PART_IDS) {
    assert.ok((distribution[id] ?? 0) > 0, `${id} stayed silent (${distribution[id] ?? 0} notes)`);
  }
  // Changing combinations: no companion should sound in every bar.
  for (const id of COFFEE_RUN_OCTET_ORCH_IDS) {
    const bars = new Set(soundingNotes(result.musicXml, id).map((note) => note.bar));
    assert.ok(bars.size < 24, `${id} plays continuous tutti (${bars.size}/24 bars)`);
  }

  const chamberResult = orchestrate(request(lyrical, undefined));
  assert.equal(chamberResult.ok, true, chamberResult.ok ? '' : chamberResult.error);
  if (!chamberResult.ok || !('score' in chamberResult) || !chamberResult.score) throw new Error('expected chamber score');
  assert.equal(chamberResult.score.parts.length, 10);
  assert.ok(!chamberResult.score.parts.some((part) => part.id === 'pn'));

  console.log(JSON.stringify({
    PASS: true,
    octetParts: partIds,
    distribution,
    pianoNotes: outPiano.length,
    chamberParts: chamberResult.score.parts.length,
    symphonicParts: symphonic.parts.length,
  }, null, 2));
}

run();
