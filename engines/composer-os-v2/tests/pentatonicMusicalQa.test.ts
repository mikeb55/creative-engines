/**
 * Pentatonic Engine Dev 1 — musical QA.
 * Asserts disposition, broad behaviour, and prohibited outcomes.
 * Does not lock arbitrary score decimals.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicMusicalQa.test.ts
 */
import assert from 'node:assert/strict';
import { lyricalAnswerExampleRegion, recommendPentatonicsFromRegion } from '../core/pentatonic/recommend';
import type { PentatonicRegionInput } from '../core/pentatonic/types';

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('HOME-compatible lyrical answer recommends A minor pentatonic', () => {
    const result = recommendPentatonicsFromRegion(lyricalAnswerExampleRegion());
    assert.equal(result.disposition, 'RECOMMEND');
    assert.equal(result.recommendations[0]?.homeRelationshipLabel, 'HOME');
    assert.match(result.recommendations[0]?.transposedName ?? '', /A Minor Pentatonic/);
    assert.match(result.recommendations[0]?.explanation ?? '', /Melody/);
    assert.ok((result.recommendations[0]?.explanation ?? '').length > 0);
    assert.notEqual(result.disposition, 'NO_PENTATONIC_INTERVENTION');
  });

  check('suspended colour can outrank HOME when the melody sits there', () => {
    const input: PentatonicRegionInput = {
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      harmonyBars: ['Asus4'],
      melodyNotes: ['E', 'G', 'A', 'B', 'D'],
      bassNotes: ['A'],
      purpose: 'colour',
      colourTension: 'suspended',
      depth: 'near',
    };
    const result = recommendPentatonicsFromRegion(input);
    assert.equal(result.disposition, 'RECOMMEND');
    assert.equal(result.recommendations[0]?.homeRelationshipId, 'suspended');
    assert.match(result.recommendations[0]?.explanation ?? '', /SUSPENDED/);
    assert.doesNotMatch(result.explanation, /path|resolution|voice-leading/i);
  });

  check('ambiguous harmony is not turned into a path recommendation', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      harmonyBars: ['Am', 'D7'],
    });
    assert.equal(result.disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(result.recommendations.length, 0);
    assert.match(result.limitations.join(' '), /not merged/i);
  });

  check('contrasting major colour stays available beside HOME', () => {
    const result = recommendPentatonicsFromRegion(lyricalAnswerExampleRegion());
    const labels = result.recommendations.map((item) => item.homeRelationshipId);
    assert.ok(labels.includes('home'));
    assert.ok(labels.includes('major') || labels.includes('suspended'));
    assert.ok(result.recommendations.length <= 3);
  });

  check('QA 3 current registry collection stays when the alternative gain equals the margin', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      current: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      melodyNotes: ['E', 'G', 'A', 'B', 'D'],
      depth: 'home_wheel',
      scoring: { retentionMargin: 0.2, weights: { continuity: 0 } },
    });
    assert.equal(result.disposition, 'RETAIN_CURRENT');
    assert.equal(result.retained?.collectionKind, 'registry');
    assert.equal(result.retained?.archetypeId, 'minor_pentatonic');
    assert.ok((result.retention?.currentScore ?? 0) >= 0.62);
    assert.equal(result.retention?.currentScore, 0.8);
    assert.equal(result.retention?.bestAlternativeScore, 1);
    assert.equal(result.retention?.actualImprovement, 0.2);
    assert.equal(result.retention?.requiredImprovementMargin, 0.2);
    assert.equal(result.recommendations.length, 0);
  });

  check('QA 3b current below minimum suitability is not retained', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'C', mode: 'major' },
      current: { archetypeId: 'minor_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'C#', 'D', 'D#', 'E'],
      depth: 'near',
    });
    assert.equal(result.diagnostics?.currentCollectionKind, 'registry');
    assert.ok((result.retention?.currentScore ?? 1) < 0.62 || result.retention === null);
    assert.equal(result.disposition, 'NO_PENTATONIC_INTERVENTION');
    assert.equal(result.retained, null);
    assert.equal(result.recommendations.length, 0);
  });

  check('enough evidence but no collection is useful enough', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'C', mode: 'major' },
      melodyNotes: ['C', 'C#', 'D', 'D#', 'E'],
      depth: 'near',
    });
    assert.equal(result.disposition, 'NO_PENTATONIC_INTERVENTION');
    assert.equal(result.recommendations.length, 0);
    assert.notEqual(result.disposition, 'NO_FEASIBLE_CANDIDATE');
  });

  check('protected note blocks collections that do not contain it', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'C', mode: 'major' },
      melodyNotes: ['C', 'E', 'G'],
      harmonyBars: ['C'],
      protectedNotes: ['F#'],
      depth: 'near',
    });
    assert.equal(result.disposition, 'NO_FEASIBLE_CANDIDATE');
    assert.ok(result.constraintFailures.every((failure) => failure.reasons.some((reason) => /Protected/.test(reason))));
    assert.equal(result.recommendations.length, 0);
  });

  check('chromatic melody without strict membership can still recommend', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'C', mode: 'major' },
      melodyNotes: ['C', 'D', 'E', 'F#'],
      harmonyBars: ['C'],
      strictMelodyMembership: false,
      depth: 'near',
    });
    assert.equal(result.disposition, 'RECOMMEND');
    assert.notEqual(result.disposition, 'NO_FEASIBLE_CANDIDATE');
    assert.match(result.recommendations[0]?.explanation ?? '', /Melody/);
  });

  check('A minor pentatonic and C major pentatonic are one recommendation', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'C', mode: 'major' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      melodyNotes: ['C', 'D', 'E', 'G', 'A'],
      harmonyBars: ['C6'],
      depth: 'near',
    });
    assert.equal(result.disposition, 'RECOMMEND');
    const ids = result.recommendations.map((item) => item.canonicalId);
    assert.equal(ids.length, new Set(ids).size);
    const card = result.recommendations.find((item) => item.canonicalId === '0,2,4,7,9');
    assert.ok(card);
    const blob = `${card!.transposedName} ${card!.alternativeInterpretations.map((item) => item.transposedName).join(' ')}`;
    assert.match(blob, /Minor/);
    assert.match(blob, /Major/);
  });

  check('tonal centre plus HOME is not a passage', () => {
    const result = recommendPentatonicsFromRegion({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
    });
    assert.equal(result.disposition, 'INSUFFICIENT_CONTEXT');
    assert.notEqual(result.disposition, 'NO_PENTATONIC_INTERVENTION');
    assert.equal(result.recommendations.length, 0);
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
